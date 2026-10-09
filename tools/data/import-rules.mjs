#!/usr/bin/env node
// Builds the small rule datasets (fertilizers, machines, professions, seasons, quality) from
// the Stardew Valley Wiki. Each value below is paired with the wiki sentence or table cell
// that states it; the import fails if that evidence is missing from the current page, so a
// wiki change can never silently leave a stale number in the data.
//
//   node tools/data/import-rules.mjs [--cached]
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchPage, sleep } from './wiki.mjs';
import { slug } from './parse-crops.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = join(ROOT, 'tools', 'data', '.cache');
const GAME_VERSION = '1.6.15';
const useCache = process.argv.includes('--cached');
const failures = [];

async function page(title) {
  const file = join(CACHE, `${slug(title)}.json`);
  if (useCache && existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  const p = await fetchPage(title);
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(file, JSON.stringify(p));
  await sleep(400);
  return p;
}

/** Returns a source reference after checking every evidence pattern is on the page. */
function cite(p, ...evidence) {
  for (const e of evidence) {
    if (!e.test(p.wikitext)) failures.push(`${p.title}: evidence not found ${e}`);
  }
  return { title: p.title, url: p.url, revid: p.revid };
}

/** Rows of the first sortable table on a page, as arrays of cell strings. */
function tableRows(wikitext) {
  const start = wikitext.indexOf('{|');
  const table = wikitext.slice(start, wikitext.indexOf('\n|}', start));
  return table
    .split(/\n\|-\n/)
    .slice(1)
    .map((row) => row.split('\n').filter((l) => l.startsWith('|')).map((l) => l.slice(1)));
}

const price = (cell) => {
  const m = (cell || '').match(/\{\{Price\|([\d,]+)\}\}/);
  return m ? Number(m[1].replace(/,/g, '')) : null;
};

// Files are only written once every evidence check has passed.
const pending = [];
function write(name, data) {
  pending.push([join(ROOT, 'data', name), JSON.stringify(data, null, 2) + '\n']);
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const header = (schema, source) => ({ schema, game_version: GAME_VERSION, generated: today, last_verified: today, source });
  const wikiLicense = 'Stardew Valley Wiki (CC BY-NC-SA 3.0)';

  /* ---------- Fertilizers ---------- */
  const fert = await page('Fertilizer');
  const speedGro = await page('Speed-Gro');
  const deluxeSpeed = await page('Deluxe Speed-Gro');
  const hyperSpeed = await page('Hyper Speed-Gro');
  const farming = await page('Farming');
  const rows = new Map(tableRows(fert.wikitext).map((r) => [(r[1].match(/\[\[([^\]|]+)/) || [])[1], r]));
  const shop = (name) => {
    const r = rows.get(name);
    if (!r) {
      failures.push(`Fertilizer: row ${name} not found`);
      return {};
    }
    const out = {};
    if (price(r[4]) != null) out.pierre = price(r[4]);
    if (price(r[5]) != null) out.oasis = price(r[5]);
    return out;
  };
  const fertSrc = cite(fert, /affect only the first crop produced/);
  const formulaSrc = cite(
    farming,
    /0\.2 \* \(farming level \/ 10\) \+ 0\.2 \* \(fertilizer level\) \* \(\(farming level \+ 2\) \/ 12\) \+ 0\.01/,
    /0 for normal soil, 1 for \[\[Basic Fertilizer\]\], 2 for \[\[Quality Fertilizer\]\], and 3 for \[\[Deluxe Fertilizer\]\]/,
    /2 \* chance for gold quality<\/code> \(capped at 75%\)/,
    /chance for gold quality \/ 2/,
    /silver is the guaranteed minimum quality, and iridium is made possible/,
  );
  write('fertilizers.json', {
    ...header('stardew-tools/fertilizers@1', wikiLicense),
    fertilizers: [
      { id: 'basic-fertilizer', name: 'Basic Fertilizer', kind: 'quality', quality_level: 1, prices: shop('Basic Fertilizer'), sources: [fertSrc, formulaSrc] },
      { id: 'quality-fertilizer', name: 'Quality Fertilizer', kind: 'quality', quality_level: 2, prices: shop('Quality Fertilizer'), sources: [fertSrc, formulaSrc] },
      { id: 'deluxe-fertilizer', name: 'Deluxe Fertilizer', kind: 'quality', quality_level: 3, prices: shop('Deluxe Fertilizer'), sources: [fertSrc, formulaSrc] },
      { id: 'speed-gro', name: 'Speed-Gro', kind: 'speed', speed: 0.1, prices: shop('Speed-Gro'), sources: [fertSrc, cite(speedGro, /speeds crop growth by 10%/)] },
      { id: 'deluxe-speed-gro', name: 'Deluxe Speed-Gro', kind: 'speed', speed: 0.25, prices: shop('Deluxe Speed-Gro'), sources: [fertSrc, cite(deluxeSpeed, /growth by 25%/)] },
      { id: 'hyper-speed-gro', name: 'Hyper Speed-Gro', kind: 'speed', speed: 0.33, prices: shop('Hyper Speed-Gro'), sources: [fertSrc, cite(hyperSpeed, /growth by (?:at least )?33%/)] },
    ],
    rules: {
      speed_affects_regrowth: false,
      quality_fertilizer_affects_extra_harvest: false,
      extra_items_quality: 'regular',
      notes: [
        'Speed-Gro fertilizers do not reduce the time between harvests of multi-harvest crops.',
        'Basic, Quality and Deluxe fertilizer only affect the first item of a multi-item harvest; the extra items are regular quality.',
      ],
      sources: [
        cite(fert, /Does not reduce time between harvests for multi-harvest crops/),
        fertSrc,
        cite(await page('Blueberry'), /only affect the first berry from every harvest, which means 2 out of 3 berries harvested from each bush are going to be regular quality/),
      ],
    },
  });

  /* ---------- Quality fixture (expected probabilities) ---------- */
  const tables = {};
  for (const [key, heading] of [['0', 'Normal soil'], ['1', 'Soil with Basic Fertilizer'], ['2', 'Soil with Quality Fertilizer'], ['3', 'Soil with Deluxe Fertilizer']]) {
    const at = fert.wikitext.indexOf(`===${heading}===`);
    if (at < 0) {
      failures.push(`Fertilizer: table "${heading}" not found`);
      continue;
    }
    const body = fert.wikitext.slice(at, fert.wikitext.indexOf('|}', at));
    tables[key] = [...body.matchAll(/^\|\s*(\d+)\s*\|\|\s*(\d+)%\s*\|\|\s*(\d+)%\s*\|\|\s*(\d+)%\s*\|\|\s*([\d.]+)/gm)].map((m) => ({
      level: Number(m[1]),
      pct: [Number(m[2]), Number(m[3]), Number(m[4])],
      avg_multiplier: Number(m[5]),
    }));
  }
  pending.push([
    join(ROOT, 'tests', 'fixtures', 'quality-tables.json'),
    JSON.stringify({ source: fertSrc, columns: { '0-2': ['regular', 'silver', 'gold'], '3': ['silver', 'gold', 'iridium'] }, tables }, null, 1) + '\n',
  ]);

  /* ---------- Professions ---------- */
  const skill = await page('Farming/Skill');
  const artisan = await page('Artisan Goods');
  write('professions.json', {
    ...header('stardew-tools/professions@1', wikiLicense),
    professions: [
      {
        id: 'tiller',
        name: 'Tiller',
        level: 5,
        effect: { sell_multiplier: 1.1, applies_to: ['vegetable', 'flower', 'fruit'] },
        notes: ['Foraged fruit does not get the bonus.'],
        sources: [cite(skill, /'''Tiller'''\n\[\[Crops\]\] worth 10% more/, /Bonus applies to all \[\[Vegetables\]\] and \[\[Flowers\]\], plus any \[\[Fruits\|Fruit\]\] that has not been \[\[Foraging\|foraged\]\]/)],
      },
      {
        id: 'artisan',
        name: 'Artisan',
        level: 10,
        requires: 'tiller',
        effect: { sell_multiplier: 1.4, applies_to: ['artisan'], excludes: ['coffee', 'oil'] },
        sources: [
          cite(skill, /'''Artisan'''\n\[\[Artisan Goods\|Artisan goods\]\] \(wine, cheese, oil, etc\.\) worth 40% more/),
          cite(artisan, /worth 40% more \(with the exception of \[\[Oil\]\] and \[\[Coffee\]\]\)/, /star quality of the ingredients used is ignored/),
        ],
      },
      {
        id: 'agriculturist',
        name: 'Agriculturist',
        level: 10,
        requires: 'tiller',
        effect: { growth_speed: 0.1 },
        sources: [cite(skill, /'''Agriculturist'''\nAll \[\[Crops\|crops\]\] grow 10% faster/)],
      },
    ],
  });

  /* ---------- Machines ---------- */
  const keg = await page('Keg');
  const jar = await page('Preserves Jar');
  const kegSrc = cite(keg, /Note that processing times are approximate/, /One full day is 1600 minutes/);
  const jarSrc = cite(jar, /Duration\|4000m \(2-3 days\)/);
  write('machines.json', {
    ...header('stardew-tools/machines@1', wikiLicense),
    minutes_per_day: 1600,
    machines: [
      {
        id: 'keg',
        name: 'Keg',
        sources: [kegSrc],
        products: [
          { id: 'wine', name: 'Wine', input: { category: 'fruit', count: 1 }, minutes: 10000, price: { multiplier: 3, add: 0 }, artisan: true, sources: [cite(keg, /Duration\|10000 mins/, /3 &times; \[\[Fruits\|Fruit\]\] Base Price/)] },
          { id: 'juice', name: 'Juice', input: { category: 'vegetable', count: 1 }, minutes: 6000, price: { multiplier: 2.25, add: 0 }, artisan: true, sources: [cite(keg, /Duration\|6000 mins/, /2\.25 &times; Ingredient Base Price/)] },
          { id: 'beer', name: 'Beer', input: { item: 'wheat', count: 1 }, minutes: 1750, price: { fixed: 200 }, artisan: true, sources: [cite(keg, /\{\{Name\|Wheat\|1\}\}\n\|data-sort-value="01750"\|\{\{Duration\|1750 mins/, /\[\[Beer\]\][\s\S]{0,200}\{\{Price\|200\}\}/)] },
          { id: 'pale-ale', name: 'Pale Ale', input: { item: 'hops', count: 1 }, minutes: 2250, price: { fixed: 300 }, artisan: true, sources: [cite(keg, /\{\{Name\|Hops\|1\}\}\n\|data-sort-value="02250"\|\{\{Duration\|2250 mins/, /\[\[Pale Ale\]\][\s\S]{0,200}\{\{Price\|300\}\}/)] },
          { id: 'coffee', name: 'Coffee', input: { item: 'coffee-bean', count: 5 }, minutes: 120, price: { fixed: 150 }, artisan: false, sources: [cite(keg, /\{\{Name\|Coffee Bean\|5\}\}[\s\S]{0,80}120 mins[\s\S]{0,40}\{\{Price\|150\}\}/)] },
        ],
        notes: ['Wheat makes Beer and Hops make Pale Ale instead of Juice.', 'Coffee does not get the Artisan bonus.'],
      },
      {
        id: 'preserves-jar',
        name: 'Preserves Jar',
        sources: [jarSrc],
        products: [
          { id: 'jelly', name: 'Jelly', input: { category: 'fruit', count: 1 }, minutes: 4000, price: { multiplier: 2, add: 50 }, artisan: true, sources: [jarSrc, cite(keg, /\(2 × Base Crop Value \+ 50\)/)] },
          { id: 'pickles', name: 'Pickles', input: { category: 'vegetable', count: 1 }, minutes: 4000, price: { multiplier: 2, add: 50 }, artisan: true, sources: [jarSrc, cite(keg, /\(2 × Base Crop Value \+ 50\)/)] },
        ],
      },
    ],
    quality_rules: { input_quality_ignored: true, sources: [cite(artisan, /star quality of the ingredients used is ignored/)] },
  });

  /* ---------- Seasons ---------- */
  const seasons = await page('Seasons');
  write('seasons.json', {
    ...header('stardew-tools/seasons@1', wikiLicense),
    days_per_season: 28,
    seasons: ['spring', 'summer', 'fall', 'winter'],
    sources: [cite(seasons, /Each Season lasts 28 \[\[Day Cycle\|days\]\]/, /crops wither and die unless they can also grow during the coming season/)],
  });

  /* ---------- Greenhouse and sprinklers ---------- */
  const gh = await page('Greenhouse');
  const qs = await page('Quality Sprinkler');
  const is = await page('Iridium Sprinkler');
  // Sprinkler positions are our own layouts (field x 0-11, y 0-9; -1 or 12/10 = wooden border).
  // tests/engine/greenhouse.test.js proves each one waters every soil tile and uses exactly the
  // number of soil tiles the wiki states.
  write('greenhouse.json', {
    ...header('stardew-tools/greenhouse@1', wikiLicense),
    width: 12,
    height: 10,
    notes: ['Sprinklers can also stand on the wooden border around the soil.', 'Fruit trees around the edge are not modelled yet.'],
    sources: [cite(gh, /12-by-10 shape of the farmable area/, /possible to place sprinklers on this border/)],
    sprinklers: [
      { id: 'none', name: 'No sprinklers (watering can)', radius: 0, soil_used: 0, positions: [], sources: [cite(gh, /12-by-10 shape/)] },
      {
        id: 'quality',
        name: 'Quality Sprinklers',
        radius: 1,
        soil_used: 12,
        positions: [1, 4, 7, 10].flatMap((x) => [1, 4, 7, 10].map((y) => [x, y])),
        sources: [cite(qs, /waters the 8 adjacent tiles every morning \(a 3x3 area\)/), cite(gh, /with \[\[Quality Sprinkler\|quality sprinklers\]\], 12 crop spaces \(10%\) are occupied/)],
      },
      {
        id: 'iridium',
        name: 'Iridium Sprinklers',
        radius: 2,
        soil_used: 4,
        positions: [[2, 2], [7, 2], [12, 2], [2, 7], [7, 7], [12, 7]],
        sources: [cite(is, /waters the 24 adjacent tiles every morning \(a 5x5 area\)/), cite(gh, /only 4 crop spaces \(≈3\.3%\) must be taken/)],
      },
    ],
  });

  if (failures.length) {
    console.error('Evidence check failed:\n  ' + failures.join('\n  '));
    process.exit(1);
  }
  for (const [file, body] of pending) writeFileSync(file, body);
  console.log('fertilizers, professions, machines, seasons written; quality fixture written');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

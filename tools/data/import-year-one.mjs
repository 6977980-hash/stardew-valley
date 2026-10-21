#!/usr/bin/env node
// Builds data/year-one.json: the few start-of-game facts the Year 1 money guide needs that no other
// data file holds (starting gold, the free Parsnip Seeds, the Egg Festival day and its Strawberry
// Seeds, which Pierre seeds only go on sale in Year 2, and that Oasis seeds wait for the bus to the
// desert). Each value is paired with the wiki sentence or table cell that states it, and the import
// fails if that evidence is gone. The Egg Festival seed price must also match data/crops.json.
//
//   node tools/data/import-year-one.mjs [--cached]
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchRendered, fetchArticle, sleep } from './wiki.mjs';
import { slug } from './parse-crops.mjs';
import { text } from './import-buildings.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = join(ROOT, 'tools', 'data', '.cache');
const GAME_VERSION = '1.6.15';
const useCache = process.argv.includes('--cached');
const failures = [];

async function cached(key, fn) {
  const file = join(CACHE, `${key}.json`);
  if (useCache && existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  let v;
  for (let attempt = 1; ; attempt++) {
    try {
      v = await fn();
      break;
    } catch (e) {
      if (attempt >= 5) throw e;
      await sleep(2000 * attempt);
    }
  }
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(file, JSON.stringify(v));
  await sleep(1500);
  return v;
}
const rendered = (title) =>
  cached(`${slug(title)}-html`, async () => {
    try {
      return await fetchRendered(title);
    } catch {
      return fetchArticle(title);
    }
  });
const ref = (p) => ({ title: p.title, url: p.url, revid: p.revid });

/** The first match of re on the page's text, or a failure. */
function find(p, re) {
  const m = text(p.html).match(re);
  if (!m) failures.push(`${p.title}: evidence not found ${re}`);
  return m;
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const goldPage = await rendered('Gold');
  const parsnip = await rendered('Parsnip Seeds');
  const egg = await rendered('Egg Festival');

  const start = find(goldPage, /All players start with ([\d,]+)g \./);
  const seeds = find(parsnip, /Fifteen Seeds are provided by Mayor Lewis at the start of the game on every map other than the Meadowlands Farm \./);
  const day = find(egg, /taking place on the (\d+)th of every Spring/);
  const shop = find(egg, /Strawberry Seeds Plant these in spring\. Takes 8 days to mature, and keeps producing strawberries after that\. ([\d,]+)g/);

  const crops = JSON.parse(readFileSync(join(ROOT, 'data', 'crops.json'), 'utf8'));
  const desertPage = await rendered('Calico Desert');
  const desert = find(desertPage, /The desert is inaccessible until the Bus at the Bus Stop has been repaired by completing the Vault Bundles at the Community Center or by purchasing "Bus Repair" for ([\d,]+)g from the Joja Community Development Form \./);
  const oasis = find(desertPage, /The Oasis is a store located in the southwest section of the area\. It is run by Sandy and sells a number of seeds not available in Pelican Town/);

  // Every seed Pierre sells: its own page says whether it is on sale from Year 1 or only from Year 2.
  const year2 = [];
  const seedSources = [];
  for (const c of crops.crops.filter((x) => x.seed_prices.pierre > 0 && x.verification_status === 'cross-checked')) {
    const p = await rendered(c.seed);
    const t = text(p.html);
    const m = t.match(/[^.:]*Pierre's General Store (?:for [\d,]+g )?starting in [Yy]ear 2[^.]*\./) || t.match(/[^.]*not sold at Pierre's until [Yy]ear 2[^.]*\./);
    if (m) {
      year2.push({ crop: c.id, seed: c.seed, evidence: m[0].trim(), sources: [ref(p)] });
      seedSources.push(ref(p));
    }
  }
  if (!year2.length) failures.push('no Year 2 seeds found: check the seed pages');
  const strawberry = crops.crops.find((c) => c.id === 'strawberry');
  if (shop && strawberry.seed_prices.egg_festival !== Number(shop[1])) failures.push(`Egg Festival: Strawberry Seeds ${shop[1]}g vs crops.json ${strawberry.seed_prices.egg_festival}g`);

  if (failures.length) {
    console.error('Year one import failed:\n  ' + failures.join('\n  '));
    process.exit(1);
  }
  const out = {
    schema: 'stardew-tools/yearone@1',
    game_version: GAME_VERSION,
    generated: today,
    last_verified: today,
    source: 'Stardew Valley Wiki (CC BY-NC-SA 3.0)',
    start_gold: { value: Number(start[1].replace(/,/g, '')), evidence: start[0], sources: [ref(goldPage)] },
    start_seeds: { crop: 'parsnip', seed: 'Parsnip Seeds', qty: 15, not_on: ['Meadowlands Farm'], evidence: seeds[0], sources: [ref(parsnip)] },
    desert: { bus_repair_joja: Number(desert[1].replace(/,/g, '')), oasis_seeds: true, evidence: [desert[0], oasis[0]], sources: [ref(desertPage)] },
    pierre_year2_seeds: year2,
    egg_festival: { season: 'spring', day: Number(day[1]), sells: 'strawberry', seed_price: Number(shop[1]), evidence: [day[0], shop[0]], sources: [ref(egg)] },
  };
  writeFileSync(join(ROOT, 'data', 'year-one.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`year-one.json: Year 2 seeds ${year2.map((y) => y.crop).join(', ')}; start ${out.start_gold.value}g, ${out.start_seeds.qty} ${out.start_seeds.seed}, Egg Festival Spring ${out.egg_festival.day}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
// Builds data/fish.json for the Fish Finder: where, when and in what weather each fish bites.
//
// Every fish is read from two pages and the values must agree:
//   - "Fish": the Fishing Pole, Night Market, Legendary and Crab Pot tables (location, time,
//     season, weather, price, difficulty, base XP, bundles).
//   - The fish's own page: its infobox (time, season, weather, price, difficulty).
// Locations are worded differently on the two pages ("Town River" vs "River"), so they are taken
// from the Fish table and only checked to share a place name with the infobox. Seasonal extras
// (Rain Totem, Secret Woods pond, Ginger Island) are kept as notes next to the main seasons.
// The file is only written once every check passed.
//
//   node tools/data/import-fish.mjs [--cached]
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchPage, sleep } from './wiki.mjs';
import { slug } from './parse-crops.mjs';
import { infobox, tableRows, unlink, num } from './import-skills.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = join(ROOT, 'tools', 'data', '.cache');
const GAME_VERSION = '1.6.15';
const useCache = process.argv.includes('--cached');
const failures = [];
const SEASONS = ['spring', 'summer', 'fall', 'winter'];

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
  await sleep(800);
  return v;
}
const page = (title) => cached(`${slug(title)}-wikitext`, () => fetchPage(title));
const ref = (p, anchor) => ({ title: p.title, url: anchor ? `${p.url}#${encodeURIComponent(anchor.replace(/ /g, '_'))}` : p.url, revid: p.revid });

/** Wiki markup of one cell -> plain text lines (one per <br />). */
export function lines(s) {
  return String(s)
    .replace(/<section[^>]*\/>/g, '')
    .replace(/^\s*class="[^"]*"\s*\|/, '')
    .split(/<br\s*\/?>/)
    .map((l) =>
      unlink(
        l
          .replace(/\{\{Season\|([^}|]+)[^}]*\}\}/g, '$1')
          .replace(/\{\{Weather inline\|([^}|]+)[^}]*\}\}/g, '$1')
          .replace(/<\/?span[^>]*>/g, '')
          .replace(/'''?/g, ''),
      )
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .replace(/,\s*$/, '')
        .trim(),
    )
    .filter(Boolean);
}

/** "6am – 7pm", "6am - 11am 7pm - 2am", "Anytime" -> [[from, to]] in game hours (2am = 26). */
export function parseTime(s) {
  const t = String(s).replace(/<!--[\s\S]*?-->/g, '');
  if (/^\s*(any|anytime|any ?time)\s*$/i.test(t)) return [[6, 26]];
  const hour = (h, ap) => {
    let n = Number(h) % 12;
    if (ap.toLowerCase() === 'pm') n += 12;
    if (n < 6) n += 24; // 12am .. 2am belong to the same game day
    return n;
  };
  const out = [...t.matchAll(/(\d{1,2})\s*(am|pm)\s*[–-]\s*(\d{1,2})\s*(am|pm)/gi)].map((m) => [hour(m[1], m[2]), hour(m[3], m[4])]);
  return out.length ? out : null;
}

/** Season cell -> { seasons (main), rain_totem (seasons), notes (other lines) }. */
export function parseSeasons(cell) {
  const out = { seasons: [], rain_totem: [], notes: [] };
  // A note in brackets can run over several lines: "(Spring &<br />Summer in Secret Woods Pond)".
  const joined = [];
  for (const l of lines(cell)) {
    const last = joined[joined.length - 1];
    if (last && (last.match(/\(/g) || []).length > (last.match(/\)/g) || []).length) joined[joined.length - 1] = `${last} ${l}`;
    else joined.push(l);
  }
  for (const l of joined) {
    const words = l.match(/\b(Spring|Summer|Fall|Winter|All Seasons|All)\b/g) || [];
    const list = words.flatMap((w) => (/^All/.test(w) ? SEASONS : [w.toLowerCase()]));
    if (/with Rain Totem/i.test(l)) out.rain_totem.push(...list);
    else if (/[()]|\bin\b|\bon\b/.test(l)) out.notes.push(l.replace(/^\(|\)$/g, ''));
    else out.seasons.push(...list);
  }
  out.seasons = SEASONS.filter((s) => out.seasons.includes(s));
  return out;
}

/** Weather cell -> 'sun' | 'rain' | 'any'. Wind days count as sunny. */
export function parseWeather(s) {
  const t = lines(s).join(' ').toLowerCase();
  if (/rain/.test(t) && !/sun/.test(t)) return 'rain';
  if (/sun/.test(t) && !/rain/.test(t)) return 'sun';
  if (/^any$/.test(t)) return 'any';
  return null;
}

/** "{{Qualityprice|Pufferfish|200}}" -> 200. */
const basePrice = (s) => {
  const m = String(s).match(/\{\{(?:Qualityprice\|[^|}]+|Price)\|([\d,]+)/);
  return m ? num(m[1]) : null;
};

/** Rows of one "===Section===" of the Fish page, keyed by the table's header names. */
function section(wikitext, heading, next) {
  const a = wikitext.indexOf(`===${heading}===`);
  const b = wikitext.indexOf(`===${next}===`, a + 1);
  if (a < 0) {
    failures.push(`Fish: no section ${heading}`);
    return { text: '', rows: [] };
  }
  const text = wikitext.slice(a, b < 0 ? undefined : b);
  const headers = [...text.matchAll(/^!(.*)$/gm)]
    .map((m) => m[1].replace(/^[^|]*\|(?!\])/, '').replace(/\[\[File:[^\]]*\]\]/g, '').trim())
    .filter((h) => !/^(Non-Mariner|Mariner)$/.test(h));
  const rows = tableRows(text)
    .map((r) => r.map((c) => c.replace(/<section[^>]*\/>/g, '').trim()))
    .filter((r) => r.length >= 6 && /^\[\[[^\]]+\]\]$/.test(r[1]))
    .map((r) => {
      const o = {};
      headers.forEach((h, i) => (o[h] = r[i]));
      // Crab Pot table: two Trap Chance columns under one header.
      if (headers.includes('Trap Chance')) {
        const i = headers.indexOf('Trap Chance');
        o['Trap Chance'] = r[i];
        o['Trap Chance Mariner'] = r[i + 1];
        headers.slice(i + 1).forEach((h, k) => (o[h] = r[i + 2 + k]));
      }
      o.name = unlink(r[1]);
      return o;
    });
  return { text, rows };
}

/**
 * Infobox season: the main seasons. Parts that only apply "with Rain Totem" or "during Night
 * Market" are left out; parts tied to one place ("in Secret Woods", "(Ginger Island)") count only
 * when no part is general.
 */
export function infoboxSeasons(s) {
  const t = unlink(String(s || '').replace(/<\/?span[^>]*>|<nowiki\s*\/>/g, '').replace(/:'*\s*(?:<br\s*\/?>\s*)?\n/g, ': ').replace(/\{\{Season\|([^}|]+)[^}]*\}\}/g, '$1'));
  const of = (x) => {
    const w = x.match(/\b(Spring|Summer|Fall|Winter|All|Any)\b/gi) || [];
    return w.flatMap((v) => (/^(all|any)$/i.test(v) ? SEASONS : [v.toLowerCase()]));
  };
  const general = [];
  const place = [];
  for (const line of t.split(/<br\s*\/?>|\n/)) {
    const kept = line.replace(/^\*/, '').split('•').filter((seg) => !/\bwith\b|\bduring\b/i.test(seg)).join(' ');
    if (!kept.trim()) continue;
    (/\bin\b|\(|:/.test(kept) ? place : general).push(...of(kept));
  }
  const list = general.length ? general : place;
  return SEASONS.filter((x) => list.includes(x));
}
const placeWords = (s) =>
  new Set(
    (String(s).replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$1 $2').replace(/[[\]]/g, '').toLowerCase().match(/[a-z']{4,}/g) || []).filter((w) => !['only', 'with', 'from', 'near', 'requires', 'level', 'fishing', 'the'].includes(w)),
  );
/** Infobox time without the Night Market line some ocean fish add. */
const infoboxTime = (s) => parseTime(String(s || '').replace(/<li>[^<]*Night Market[^<]*<\/li>/g, '').replace(/<[^>]+>/g, ' '));

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const fishPage = await page('Fish');
  const wt = fishPage.wikitext;
  const pole = section(wt, 'Fishing Pole Fish', 'Night Market Fish');
  const night = section(wt, 'Night Market Fish', 'Legendary Fish');
  const legend = section(wt, 'Legendary Fish', 'Legendary Fish II');
  const crab = section(wt, 'Crab Pot Fish', 'Other Catchables');
  const nightRule = night.text.match(/during \{\{Season\|Winter\}\} (\d+)-(\d+), while the market is open \((\d+(?:am|pm)) – (\d+(?:am|pm))\)/);
  if (!nightRule) failures.push('Fish: Night Market days and hours sentence not found');
  const magic = wt.match(/All fish can be caught regardless of weather, time, or season using \[\[Magic Bait\]\]\./);
  if (!magic) failures.push('Fish: Magic Bait sentence not found');

  const bundleData = JSON.parse(readFileSync(join(ROOT, 'data', 'bundles.json'), 'utf8'));
  const fish = [];
  const add = async (row, kind) => {
    const p = await page(row.name);
    const ib = infobox(p.wikitext);
    const id = slug(row.name);
    const price = basePrice(row.Price);
    const problems = [];
    const check = (what, a, b) => {
      if (JSON.stringify(a) !== JSON.stringify(b)) problems.push(`${what}: Fish page ${JSON.stringify(a)} vs ${row.name} page ${JSON.stringify(b)}`);
    };
    check('price', price, num(String(ib.price || '').match(/[\d,]+/)?.[0] ?? NaN));
    const rec = { id, name: row.name, kind, base_price: price };

    if (kind === 'crab-pot') {
      const water = /fresh/i.test(row.Location) ? 'freshwater' : 'ocean';
      rec.locations = [water === 'ocean' ? 'Crab Pot in the ocean' : 'Crab Pot in fresh water'];
      rec.water = water;
      rec.trap_chance = { normal: num(String(row['Trap Chance']).replace('%', '')) / 100, mariner: num(String(row['Trap Chance Mariner']).replace('%', '')) / 100 };
      rec.time = [[6, 26]];
      rec.seasons = SEASONS.slice();
      rec.weather = 'any';
      const ibSource = String(ib.source || '');
      const ibWater = /Freshwater/i.test(ibSource) ? 'freshwater' : /Saltwater/i.test(ibSource) ? 'ocean' : null;
      check('crab pot water', water, ibWater);
      check('seasons', rec.seasons, infoboxSeasons(ib.season));
    } else {
      const diff = String(row['Difficulty & Behavior'] || row['Difficulty &amp; Behavior'] || '').match(/(\d+)\s+(\w+)/);
      rec.difficulty = diff ? +diff[1] : null;
      rec.behavior = diff ? diff[2].toLowerCase() : null;
      rec.base_xp = num(row['Base XP']);
      check('difficulty', rec.difficulty, num(ib.difficulty));
      if (kind === 'night-market') {
        rec.locations = ['Night Market submarine'];
        rec.time = nightRule ? parseTime(`${nightRule[3]} – ${nightRule[4]}`) : null;
        rec.seasons = ['winter'];
        rec.days = nightRule ? { from: +nightRule[1], to: +nightRule[2] } : null;
        rec.weather = 'any';
        check('time', rec.time, parseTime(String(ib.time).match(/\(([^)]+)\)/)?.[1] ?? ''));
      } else {
        const level = String(row.Location).match(/Requires (?:level (\d+) fishing|fishing level (\d+))/i);
        if (level) rec.min_fishing_level = +(level[1] || level[2]);
        rec.locations = lines(row.Location).map((l) => l.replace(/\.?\s*Requires (?:level \d+ fishing|fishing level \d+)\.?/i, '').trim()).filter(Boolean);
        rec.time = parseTime(lines(row.Time).join(' '));
        const s = parseSeasons(row.Season);
        rec.seasons = s.seasons;
        if (s.rain_totem.length) rec.rain_totem = s.rain_totem;
        if (s.notes.length) rec.season_notes = s.notes;
        // "(All Seasons on Ginger Island)": bites in every season in its island waters.
        if (s.notes.some((n) => /All Seasons on Ginger Island/i.test(n))) rec.island_all_year = true;
        rec.weather = parseWeather(row.Weather);
        check('time', rec.time, infoboxTime(ib.time));
        check('weather', rec.weather, parseWeather(ib.weather));
        if (kind === 'legendary') {
          check('fishing level', rec.min_fishing_level, ib.fl ? num(ib.fl) : rec.min_fishing_level);
          rec.once_per_save = true;
        }
      }
      check('seasons', rec.seasons, infoboxSeasons(ib.season));
      // Locations are worded differently; they must at least name a common place.
      const a = placeWords(row.Location || rec.locations.join(' '));
      const b = placeWords(ib.location || '');
      if (kind === 'pole' && b.size && ![...a].some((w) => b.has(w))) problems.push(`location: "${rec.locations.join('; ')}" vs "${unlink(ib.location)}"`);
      if (!rec.time) problems.push(`time not read: ${row.Time}`);
      if (!rec.weather) problems.push(`weather not read: ${row.Weather}`);
      if (!rec.seasons.length) problems.push(`no season read: ${row.Season}`);
    }
    // Community Center bundles that take this fish, from bundles.json (standard and remixed sets).
    const b = bundleData.bundles.filter((x) => (x.items || []).some((i) => i.id === id)).map((x) => ({ name: x.name, set: x.set, room: x.room }));
    if (b.length) rec.bundles = b;
    if (!price) problems.push('no price');
    rec.game_version = GAME_VERSION;
    rec.sources = [ref(fishPage, kind === 'crab-pot' ? 'Crab Pot Fish' : kind === 'legendary' ? 'Legendary Fish' : kind === 'night-market' ? 'Night Market Fish' : 'Fishing Pole Fish'), ref(p)];
    rec.last_verified = today;
    rec.verification_status = problems.length ? 'needs-verification' : 'cross-checked';
    if (problems.length) rec.problems = problems;
    fish.push(rec);
  };
  for (const r of pole.rows) await add(r, 'pole');
  for (const r of night.rows) await add(r, 'night-market');
  for (const r of legend.rows) await add(r, 'legendary');
  for (const r of crab.rows) await add(r, 'crab-pot');

  if (legend.rows.length !== 5) failures.push(`Fish: ${legend.rows.length} legendary fish, expected 5`);
  if (pole.rows.length < 45) failures.push(`Fish: only ${pole.rows.length} fishing pole fish read`);
  if (crab.rows.length < 10) failures.push(`Fish: only ${crab.rows.length} crab pot fish read`);
  const ids = new Set();
  for (const f of fish) {
    if (ids.has(f.id)) failures.push(`duplicate fish ${f.id}`);
    ids.add(f.id);
  }
  // Prices must agree with fishponds.json, which checked them against three pages.
  const ponds = JSON.parse(readFileSync(join(ROOT, 'data', 'fishponds.json'), 'utf8'));
  for (const pf of ponds.fish) {
    const f = fish.find((x) => x.id === pf.id);
    if (f && f.base_price !== pf.base_price) failures.push(`${f.name}: price ${f.base_price} vs fishponds.json ${pf.base_price}`);
  }
  const bad = fish.filter((f) => f.verification_status !== 'cross-checked');
  if (bad.length > 6) failures.push(`${bad.length} fish need verification:\n    ` + bad.map((f) => `${f.name}: ${f.problems.join('; ')}`).join('\n    '));
  if (failures.length) {
    console.error('Fish import failed:\n  ' + failures.join('\n  '));
    process.exit(1);
  }
  const out = {
    schema: 'stardew-tools/fish@1',
    game_version: GAME_VERSION,
    generated: today,
    last_verified: today,
    source: 'Stardew Valley Wiki (CC BY-NC-SA 3.0), the Fish page tables cross-checked with each fish page infobox',
    sources: [ref(fishPage)],
    rules: {
      magic_bait: { value: true, evidence: magic[0].replace(/\[\[([^\]]+)\]\]/g, '$1') },
      night_market: { days: { from: +nightRule[1], to: +nightRule[2] }, evidence: unlink(nightRule[0]).replace(/\{\{Season\|Winter\}\}/, 'Winter') },
      hours: 'Game hours: 6 = 6am, 24 = midnight, 26 = 2am (the day ends at 2am).',
    },
    fish,
  };
  writeFileSync(join(ROOT, 'data', 'fish.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`fish.json: ${fish.length} fish (${pole.rows.length} pole, ${night.rows.length} night market, ${legend.rows.length} legendary, ${crab.rows.length} crab pot); ${bad.length} need verification${bad.length ? ': ' + bad.map((f) => `${f.name} (${f.problems.join('; ')})`).join(', ') : ''}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

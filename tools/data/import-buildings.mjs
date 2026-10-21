#!/usr/bin/env node
// Builds data/buildings.json from the Stardew Valley Wiki: the Coop and Barn at each upgrade level
// (Coop, Big Coop, Deluxe Coop; Barn, Big Barn, Deluxe Barn), what Robin charges in gold, wood and
// stone, how many animals each holds, and which animals each level adds.
//
// Nothing is typed in by hand. Every value must be read from two wiki pages that agree:
//   - "Coop" and "Barn": the infobox (cost, materials, capacity, animals per level) and the
//     sentence giving the total cost of the Deluxe building from scratch, in gold and materials and
//     with wood and stone bought from Robin in year 1 and year 2+.
//   - "Carpenter's Shop": the Farm Buildings table (cost, materials, "Houses N ... animals",
//     animals unlocked) and the Year 1 / Year 2+ prices of Wood and Stone.
//   - data/animals.json: every animal's building level must be the level that first houses it.
// The totals the Coop and Barn pages state must equal the sum of the three levels, and the year 1
// and year 2+ totals must equal that sum with the Carpenter's Shop wood and stone prices. A value
// without two agreeing sources fails the import; the file is only written once every check passed.
//
//   node tools/data/import-buildings.mjs [--cached]
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchRendered, fetchArticle, sleep } from './wiki.mjs';
import { slug } from './parse-crops.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = join(ROOT, 'tools', 'data', '.cache');
const GAME_VERSION = '1.6.15';
const useCache = process.argv.includes('--cached');
const failures = [];
const FAMILIES = [
  ['coop', 'Coop', ['Coop', 'Big Coop', 'Deluxe Coop']],
  ['barn', 'Barn', ['Barn', 'Big Barn', 'Deluxe Barn']],
];

async function cached(key, fn) {
  const file = join(CACHE, `${key}.json`);
  if (useCache && existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  let v;
  for (let attempt = 1; ; attempt++) {
    try {
      v = await fn();
      break;
    } catch (e) {
      if (attempt >= 3) throw e;
      await sleep(1000 * attempt);
    }
  }
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(file, JSON.stringify(v));
  await sleep(400);
  return v;
}
// The API first; the article URL serves the same rendered HTML when the API is unavailable.
const rendered = (title) =>
  cached(`${slug(title)}-html`, async () => {
    try {
      return await fetchRendered(title);
    } catch {
      return fetchArticle(title);
    }
  });
const ref = (p, anchor) => ({ title: p.title, url: anchor ? `${p.url}#${encodeURIComponent(anchor.replace(/ /g, '_'))}` : p.url, revid: p.revid });

/* ------------------------------------------------------------------ parse helpers */

const decode = (s) => s.replace(/&#160;|&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&#39;/g, "'");
/** Cell HTML -> plain text (hidden sort keys and tags removed). */
export const text = (html) =>
  decode(String(html).replace(/<span style="display: ?none;?">[\s\S]*?<\/span>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
const num = (s) => Number(String(s).replace(/,/g, ''));

/** Table rows of an HTML fragment as arrays of cell HTML. */
export function rows(html) {
  return [...String(html).matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => c[1]));
}

/** Link titles in a cell, in order: <a href="/Chicken" title="Chicken"> -> Chicken. */
export const links = (html) => [...String(html).matchAll(/<a [^>]*title="([^"]+)"/g)].map((m) => decode(m[1])).filter((t) => !/^File:/.test(t));

/** "4,000g" -> 4000; "Wood (300) Stone (100)" -> {wood: 300, stone: 100}. */
export const gold = (s) => {
  const m = text(s).match(/([\d,]+)g/);
  return m ? num(m[1]) : null;
};
export function materials(s) {
  const out = {};
  for (const m of text(s).matchAll(/(Wood|Stone|Hardwood)\s*\((\d+)\)/g)) out[m[1].toLowerCase()] = num(m[2]);
  return out;
}

/** Infobox of a Coop/Barn page: label -> [cell for level 1, 2, 3]. */
export function infoboxColumns(html) {
  const out = {};
  for (const r of rows(html)) {
    if (r.length !== 4) continue;
    const label = text(r[0]);
    if (label && !(label in out)) out[label] = r.slice(1);
  }
  return out;
}

/** "The total cost of a Deluxe Coop, built from scratch, is 34,000g, Wood (1200) and Stone (450) (Or, ... year 1, 55,000g, and 139,000g if bought in Year 2+.)" */
export function totals(html) {
  const t = text(html);
  const m = t.match(/total cost of a (Deluxe \w+), built from scratch, is ([\d,]+)g\s*,?\s*Wood \((\d+)\)\s*,?\s*(?:and )?Stone \((\d+)\)[^.]*?year 1, ([\d,]+)g\s*,?\s*and ([\d,]+)g if bought in year 2\+/i);
  if (!m) return null;
  return { building: m[1], gold: num(m[2]), wood: num(m[3]), stone: num(m[4]), gold_year1: num(m[5]), gold_year2: num(m[6]), wording: m[0] };
}

/** Rows of the Carpenter's Shop Farm Buildings table: name -> {gold, materials, capacity, unlocks}. */
export function carpenterBuildings(html) {
  const out = {};
  for (const r of rows(html)) {
    if (r.length !== 7) continue;
    const name = text(r[1]);
    const cap = text(r[2]).match(/Houses (\d+) (coop|barn)-dwelling animals/);
    if (!cap) continue;
    out[name] = { gold: gold(r[4]), materials: materials(r[4]), capacity: num(cap[1]), unlocks: links(r[3]), wording: text(r[2]) };
  }
  return out;
}

/** "Wood ... Year 1: 10g Year 2+: 50g" in the Carpenter's Shop stock table. */
export function materialPrice(html, name) {
  for (const r of rows(html)) {
    if (r.length < 4 || text(r[1]) !== name) continue;
    const m = text(r[r.length - 1]).match(/Year 1: ([\d,]+)g Year 2\+: ([\d,]+)g/);
    if (m) return { year1: num(m[1]), year2: num(m[2]) };
  }
  return null;
}

/* ------------------------------------------------------------------ main */

async function main() {
  const shop = await rendered("Carpenter's Shop");
  const carp = carpenterBuildings(shop.html);
  const prices = { wood: materialPrice(shop.html, 'Wood'), stone: materialPrice(shop.html, 'Stone') };
  for (const [k, v] of Object.entries(prices)) if (!v) failures.push(`Carpenter's Shop: ${k} price not found`);
  const animalsFile = JSON.parse(readFileSync(join(ROOT, 'data', 'animals.json'), 'utf8'));
  const today = new Date().toISOString().slice(0, 10);
  const buildings = [];
  const families = [];

  for (const [family, pageTitle, names] of FAMILIES) {
    const p = await rendered(pageTitle);
    const box = infoboxColumns(p.html);
    const need = ['Upgrades From', 'Building Cost', 'Building Materials', 'Capacity', 'Animals'];
    for (const k of need) if (!box[k]) failures.push(`${pageTitle}: infobox row "${k}" not found`);
    if (failures.length) continue;
    let housed = [];
    let sum = { gold: 0, wood: 0, stone: 0 };
    names.forEach((name, i) => {
      const level = i + 1;
      const c = carp[name];
      if (!c) return failures.push(`Carpenter's Shop: no row for ${name}`);
      const cost = gold(box['Building Cost'][i]);
      const mats = materials(box['Building Materials'][i]);
      const capacity = num(text(box.Capacity[i]));
      const upgradesFrom = text(box['Upgrades From'][i]);
      // Each check compares the two pages; any mismatch stops the import.
      if (cost !== c.gold) failures.push(`${name}: gold ${cost} (${pageTitle}) vs ${c.gold} (Carpenter's Shop)`);
      if (mats.wood !== c.materials.wood || mats.stone !== c.materials.stone) failures.push(`${name}: materials ${JSON.stringify(mats)} vs ${JSON.stringify(c.materials)}`);
      if (capacity !== c.capacity) failures.push(`${name}: capacity ${capacity} vs ${c.capacity}`);
      if ((level === 1 ? 'N/A' : names[i - 1]) !== upgradesFrom) failures.push(`${name}: upgrades from "${upgradesFrom}"`);
      const all = links(box.Animals[i]);
      const added = all.filter((a) => !housed.includes(a));
      if (housed.some((a) => !all.includes(a))) failures.push(`${name}: houses fewer animals than the level below`);
      // Carpenter's Shop names the animals Robin's menu says it unlocks (Void and Golden Chickens hatch, so they are not named there).
      for (const u of c.unlocks) if (!added.includes(u)) failures.push(`${name}: Carpenter's Shop says it unlocks ${u}, the ${pageTitle} infobox does not`);
      housed = all;
      sum = { gold: sum.gold + cost, wood: sum.wood + mats.wood, stone: sum.stone + mats.stone };
      buildings.push({
        id: slug(name),
        name,
        family,
        level,
        upgrades_from: level === 1 ? null : slug(names[i - 1]),
        gold: cost,
        materials: { wood: mats.wood, stone: mats.stone },
        capacity,
        adds_animals: added.map(slug),
        houses: all.map(slug),
        // Everything from an empty plot to this level (each upgrade keeps the building and its animals).
        total: { ...sum, gold_year1: sum.gold + sum.wood * prices.wood.year1 + sum.stone * prices.stone.year1, gold_year2: sum.gold + sum.wood * prices.wood.year2 + sum.stone * prices.stone.year2 },
        game_version: GAME_VERSION,
        sources: [ref(p), ref(shop, 'Farm Buildings')],
        verified: { gold: [`${pageTitle} (infobox)`, "Carpenter's Shop"], materials: [`${pageTitle} (infobox)`, "Carpenter's Shop"], capacity: [`${pageTitle} (infobox)`, "Carpenter's Shop"] },
        last_verified: today,
        verification_status: 'cross-checked',
        problems: [],
      });
    });

    const t = totals(p.html);
    const top = buildings[buildings.length - 1];
    if (!t) failures.push(`${pageTitle}: total cost sentence not found`);
    else if (top && top.family === family) {
      if (t.building !== names[2]) failures.push(`${pageTitle}: total is for ${t.building}`);
      for (const k of ['gold', 'wood', 'stone', 'gold_year1', 'gold_year2']) if (t[k] !== top.total[k]) failures.push(`${pageTitle}: stated total ${k} ${t[k]} vs computed ${top.total[k]}`);
    }
    families.push({ id: family, name: pageTitle, total_wording: t ? t.wording : null, sources: [ref(p, 'Construction')] });

    // Every animal's building in data/animals.json must be the first level that houses it.
    for (const a of animalsFile.animals.filter((x) => x.building === family)) {
      const b = buildings.find((x) => x.family === family && x.level === a.building_level);
      if (!b || b.name !== a.building_name) failures.push(`${a.name}: animals.json says ${a.building_name} level ${a.building_level}`);
      else if (!b.adds_animals.includes(a.id)) failures.push(`${a.name}: ${b.name} does not add it on the ${pageTitle} page`);
    }
  }

  if (buildings.length !== 6) failures.push(`expected 6 buildings, parsed ${buildings.length}`);
  if (failures.length) {
    console.error('Buildings import failed:\n  ' + failures.join('\n  '));
    process.exit(1);
  }
  const out = {
    schema: 'stardew-tools/buildings@1',
    game_version: GAME_VERSION,
    generated: today,
    last_verified: today,
    source: "Stardew Valley Wiki (CC BY-NC-SA 3.0), cross-checked between the Coop and Barn pages and Carpenter's Shop",
    materials: {
      wood: prices.wood,
      stone: prices.stone,
      note: "Robin's prices for Wood and Stone; they rise from Year 2. Gathering them yourself costs nothing.",
      sources: [ref(shop, 'Shop Inventory')],
    },
    families,
    buildings,
  };
  writeFileSync(join(ROOT, 'data', 'buildings.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`data/buildings.json written: ${buildings.map((b) => `${b.name} ${b.gold}g`).join(', ')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

#!/usr/bin/env node
// Builds data/fishponds.json from the Stardew Valley Wiki: the Fish Pond building and its
// rules, every fish that can live in a pond with its produce table, and the Roe / Aged Roe /
// Caviar price rules.
//
// Each fish is read from two places that must agree:
//   1. the "Fish Pond" page (quest table, produce table summarised over all populations), and
//   2. the fish's own page ("Fish Pond" section: quests, produce per population band).
// Base sell prices come from the fish's own page and the "Fish" page tables (or the
// "Foraging" page for Coral and Sea Urchin). The wiki's own rendered infobox (Sell Prices,
// Artisan Sell Prices) is the oracle for the Roe, Aged Roe, Caviar, Fisher and Angler rules;
// those numbers are also written to tests/fixtures/fishpond-prices.json.
//
// Rule values are paired with the wiki sentence that states them; the import fails if that
// evidence is missing, or if any fish has a problem. Files are written only after every
// check has passed.
//
//   node tools/data/import-fishponds.mjs [--cached]
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchPage, fetchRendered, sleep } from './wiki.mjs';
import { slug } from './parse-crops.mjs';

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
      if (attempt >= 3) throw e;
      await sleep(1000 * attempt);
    }
  }
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(file, JSON.stringify(v));
  await sleep(400);
  return v;
}
const page = (title) => cached(slug(title), () => fetchPage(title));
const rendered = (title) => cached(`${slug(title)}-html`, () => fetchRendered(title));

/** Returns a source reference after checking every evidence pattern is on the page. */
function cite(p, ...evidence) {
  for (const e of evidence) {
    if (!e.test(p.wikitext)) failures.push(`${p.title}: evidence not found ${e}`);
  }
  return { title: p.title, url: p.url, revid: p.revid };
}

/** The exact wiki text matched by a pattern (stored verbatim as evidence). */
function quote(p, re) {
  const m = p.wikitext.match(re);
  if (!m) {
    failures.push(`${p.title}: evidence not found ${re}`);
    return null;
  }
  return m[0];
}

/* ------------------------------------------------------------------ parse helpers */

const ATTR = /^\s*(?:[a-z-]+\s*=\s*"[^"]*"\s*)+\|/i;
/** Strips leading cell attributes (rowspan="2" data-sort-value="x"|) and whitespace. */
export const cell = (s) => s.replace(ATTR, '').trim();
/** [[Target|Label]] -> Label, [[Target]] -> Target. */
export const unlink = (s) => s.replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1');
const linkNames = (s) => [...s.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1].trim());

/** "1-3" -> {min:1,max:3}; "5" -> {min:5,max:5}. */
export function range(s) {
  const m = String(s).match(/^\s*(\d+)\s*(?:[-–]\s*(\d+))?\s*$/);
  return m ? { min: Number(m[1]), max: Number(m[2] ?? m[1]) } : null;
}
/** "23-67%" -> {min:.23,max:.67}; "1.7-1.9%" ; "77-5%" (descending, kept in page order). */
export function pct(s) {
  const m = String(s).match(/^\s*([\d.]+)\s*%?\s*(?:[-–]\s*([\d.]+))?\s*%\s*$/);
  if (!m) return null;
  const a = Number(m[1]) / 100;
  const b = Number(m[2] ?? m[1]) / 100;
  return { from: round(a), to: round(b) };
}
const round = (n) => Math.round(n * 1e6) / 1e6;

/** Lines of a wikitable (from `{|` at or after `start` to the matching `|}`) split into rows. */
export function tableRowsAt(wikitext, start) {
  const open = wikitext.indexOf('{|', start);
  if (open < 0) return [];
  const close = wikitext.indexOf('\n|}', open);
  return wikitext
    .slice(open, close < 0 ? undefined : close)
    .split(/\n\|-\s*\n/)
    .slice(1)
    .map((row) => row.split('\n').filter((l) => l.startsWith('|') && !l.startsWith('|}')).map((l) => l.slice(1)));
}

/** Fish names in a first-column cell: "[[Dorado]]<br />[[Lingcod]]". */
const fishNames = (c) => linkNames(c);

/**
 * Fish Pond page, "Quests" table: per fish the populations at which a quest occurs, the
 * requested items, and the normal spawn frequency in days.
 */
export function parsePondQuests(wikitext) {
  const at = wikitext.indexOf('==Quests==');
  const out = new Map();
  let current = null;
  for (const row of tableRowsAt(wikitext, at)) {
    if (!row.length) continue;
    const cells = row.map(cell);
    if (/^\[\[/.test(cells[0])) {
      const [names, pop, items, freq] = cells;
      const f = freq.match(/^(\d+) days?$/);
      current = { spawn_days: f ? Number(f[1]) : null, quests: [] };
      if (pop !== 'N/A') current.quests.push({ population: Number(pop), options: questOptions(items) });
      for (const n of fishNames(names)) out.set(n, current);
    } else if (current && /^\d+$/.test(cells[0])) {
      current.quests.push({ population: Number(cells[0]), options: questOptions(cells[1]) });
    }
  }
  return out;
}

/** "3 [[Ginger]] or 1 [[Pineapple]]" -> [{item:'Ginger',min:3,max:3}, ...]. */
export function questOptions(text) {
  return [...text.matchAll(/(\d+)(?:\s*[-–]\s*(\d+))?\s+\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g)].map((m) => ({
    item: m[3].trim(),
    min: Number(m[1]),
    max: Number(m[2] ?? m[1]),
  }));
}

/**
 * Fish Pond page, "Produce" table: per fish the produced items with quantity, required
 * population, "% of Items" range and "Overall Daily Chance" range. Rows marked
 * "(Only if above roll fails)" are conditional on the row above failing (Legendary fish).
 */
export function parsePondProduce(wikitext) {
  const at = wikitext.indexOf('==Produce==');
  const out = new Map();
  let current = null;
  for (const row of tableRowsAt(wikitext, at)) {
    if (!row.length) continue;
    let cells = row.map(cell);
    if (cells.length === 5) {
      current = [];
      for (const n of fishNames(cells[0])) out.set(n, current);
      cells = cells.slice(1);
    }
    if (cells.length !== 4 || !current) continue;
    const [item, pop, share, daily] = cells;
    const m = item.match(/^(\d+(?:\s*[-–]\s*\d+)?)\s+\[\[(?:[^\]|]+\|)?([^\]]+)\]\](.*)$/);
    if (!m) continue;
    current.push({
      item: m[2].trim(),
      quantity: range(m[1]),
      min_population: Number(pop),
      share: pct(share),
      daily: pct(daily),
      only_if_above_fails: /Only if above roll fails/i.test(m[3]),
    });
  }
  return out;
}

/** The "==Fish Pond==" section of a fish page. */
export function fishPondSection(wikitext) {
  const m = wikitext.match(/^==\s*Fish Pond\s*==\s*$/m);
  if (!m) return null;
  const rest = wikitext.slice(m.index + m[0].length);
  const end = rest.search(/^==[^=]/m);
  return end < 0 ? rest : rest.slice(0, end);
}

/** {{Name|Orange Roe|1-2|link=Roe}} -> {item:'Roe', display:'Orange Roe', quantity:{1,2}}. */
export function nameTemplate(s) {
  const m = s.match(/\{\{Name\|([^|}]+)\|([^|}]+)((?:\|[^}]*)?)\}\}/);
  if (!m) return null;
  const link = (m[3].match(/\|link=([^|}]+)/) || [])[1];
  const display = m[1].trim();
  return { item: link && link.trim() === 'Roe' ? 'Roe' : display, display, quantity: range(m[2]) };
}

/**
 * A fish page's Fish Pond section: text facts (spawn days, capacities), the quest table
 * (capacity before/after, items) and the produce table, one row per item and population band.
 */
export function parseFishPond(section) {
  const text = section.slice(0, section.indexOf("'''") < 0 ? section.length : section.indexOf("'''"));
  const out = { spawn_days: null, reproduces: true, initial_capacity: null, max_capacity: null, quests: [], produce: [], nothing: [] };
  const every = text.match(/reproduce every (\d+) days|reproduce every (day)/);
  if (every) out.spawn_days = every[2] ? 1 : Number(every[1]);
  if (/(?:do|does|will) not reproduce/i.test(text)) out.reproduces = false;
  const init = text.match(/initial pond capacity is (\d+)/);
  const fixed = text.match(/pond capacity is (\d+) fish and this cannot be increased/);
  if (init) out.initial_capacity = Number(init[1]);
  if (fixed) out.initial_capacity = out.max_capacity = Number(fixed[1]);
  const inc = text.match(/can be increased to (\d+)/);
  if (inc) out.max_capacity = Number(inc[1]);
  else if (init && /no quests are necessary/.test(text)) out.max_capacity = out.initial_capacity;

  const qAt = section.indexOf('[[Fish Pond#Quests|Quests]]');
  if (qAt >= 0) {
    for (const row of tableRowsAt(section, qAt)) {
      const m = row.join('||').match(/^\s*(\d+)\s*\|\|\s*(\d+)\s*\|\|\s*(.+?)\s*\|\|\s*(\d+)\s*$/);
      if (m) out.quests.push({ population: Number(m[1]), capacity_after: Number(m[2]), options: questOptions(m[3]), xp: Number(m[4]) });
    }
  }
  const pAt = section.indexOf('[[Fish Pond#Produce|Produce]]');
  if (pAt >= 0) {
    let item = null;
    for (const row of tableRowsAt(section, pAt)) {
      for (const line of row) {
        const c = cell(line);
        const name = nameTemplate(c);
        if (name) item = name;
        else if (/''Nothing''/.test(c)) item = 'nothing';
        const band = line.match(/^\s*(\d+(?:\s*-\s*\d+)?)\s*\|\|\s*([\d.]+)\s*%\s*\|\|\s*(.+?)\s*$/);
        if (!band || !item) continue;
        const population = range(band[1]);
        const share = round(Number(band[2]) / 100);
        if (item === 'nothing') out.nothing.push({ population, share, daily: pct(band[3]) });
        else out.produce.push({ item: item.item, display: item.display, quantity: item.quantity, population, share, daily: pct(band[3]) });
      }
    }
  }
  return out;
}

/** Infobox "|price = 100" / "|sellprice = 80". */
export function infoboxPrice(wikitext) {
  const m = wikitext.match(/^\|\s*(?:price|sellprice)\s*=\s*([\d,]+)\s*$/m);
  return m ? Number(m[1].replace(/,/g, '')) : null;
}

/** Base prices from {{Qualityprice|Name|200}} cells (no profession multiplier) in a block of wikitext. */
export function qualityPrices(wikitext) {
  const out = new Map();
  for (const m of wikitext.matchAll(/\{\{Qualityprice\|([^|}]+)\|([\d,]+)([^}]*)\}\}/g)) {
    if (/pm=/.test(m[3])) continue;
    if (!out.has(m[1].trim())) out.set(m[1].trim(), Number(m[2].replace(/,/g, '')));
  }
  return out;
}

/** Fish page sections: names in each "===...===" table. */
export function fishPageSections(wikitext) {
  const out = [];
  const re = /^===\s*([^=]+?)\s*===\s*$/gm;
  const heads = [...wikitext.matchAll(re)];
  heads.forEach((h, i) => {
    const body = wikitext.slice(h.index, i + 1 < heads.length ? heads[i + 1].index : wikitext.indexOf('\n==', h.index + h[0].length));
    out.push({ heading: h[1], body, prices: qualityPrices(body), plainPrices: plainPrices(body) });
  });
  return out;
}
/** "|[[Sea Jelly]]\n|{{Description|..}}\n|{{Price|200}}" rows in a table. */
function plainPrices(body) {
  const out = new Map();
  for (const m of body.matchAll(/\n\|\s*\[\[([^\]|]+)\]\]\s*\n\|\s*\{\{Description[^}]*\}\}\s*\n\|\s*\{\{Price\|([\d,]+)\}\}/g)) out.set(m[1].trim(), Number(m[2].replace(/,/g, '')));
  return out;
}

/** Text tokens of the rendered infobox: Sell Prices (base/fisher/angler x 4 qualities) and Artisan Sell Prices. */
export function renderedPrices(html) {
  const t = html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]*>/g, '\n')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const g = (s) => (/^[\d,]+g$/.test(s) ? Number(s.slice(0, -1).replace(/,/g, '')) : null);
  const out = { sell: null, artisan: null };
  const i = t.indexOf('Sell Prices');
  if (i >= 0 && t.slice(i + 1, i + 6).join(' ') === 'Base Fisher (+25%) Angler (+50%)') {
    const nums = [];
    for (let k = i + 6; k < t.length && g(t[k]) != null; k++) nums.push(g(t[k]));
    if (nums.length === 12) out.sell = { base: nums.slice(0, 4), fisher: nums.slice(4, 8), angler: nums.slice(8, 12) };
    else if (nums.length === 3) out.sell = { base: [nums[0]], fisher: [nums[1]], angler: [nums[2]] };
  }
  const a = t.indexOf('Artisan Sell Prices');
  if (a >= 0) {
    const labels = [];
    let k = a + 1;
    for (; k < t.length && g(t[k]) == null; k++) {
      if (t[k] === '(+40%)') labels[labels.length - 1] += ' (+40%)';
      else labels.push(t[k]);
    }
    const nums = [];
    for (; k < t.length && g(t[k]) != null; k++) nums.push(g(t[k]));
    if (labels.length === nums.length) out.artisan = Object.fromEntries(labels.map((l, j) => [l, nums[j]]));
  }
  return out;
}

/* ------------------------------------------------------------------ cross-checks */

/** Per-population share of an item from fish-page band rows (rows of the same item summed). */
function sharesByPopulation(rows, item, maxPop) {
  const out = [];
  for (let p = 1; p <= maxPop; p++) {
    const hit = rows.filter((r) => r.item === item && r.population.min <= p && p <= r.population.max);
    out.push(hit.length ? round(hit.reduce((s, r) => s + r.share, 0)) : null);
  }
  return out;
}

/**
 * Compares the fish page's produce bands with the Fish Pond page's summary rows. Returns a
 * list of problems (empty when both pages agree).
 */
export function compareProduce(fishRows, pondRows, maxPop, legendary) {
  const problems = [];
  const items = [...new Set(fishRows.map((r) => r.item))];
  const pondItems = [...new Set(pondRows.map((r) => r.item))];
  for (const it of pondItems) if (!items.includes(it)) problems.push(`produce: ${it} on Fish Pond page but not on fish page`);
  for (const it of items) if (!pondItems.includes(it)) problems.push(`produce: ${it} on fish page but not on Fish Pond page`);
  if (legendary) {
    // Fish Pond page: second row is conditional ("only if above roll fails"); fish page gives
    // the unconditional share, i.e. (1 - first) x second.
    const [a, b] = pondRows;
    const [x, y] = fishRows;
    if (!a || !b || !x || !y || !b.only_if_above_fails) problems.push('produce: legendary two-roll rows not found');
    else {
      if (Math.abs(a.share.from - x.share) > 0.005) problems.push(`produce: first roll ${a.share.from} vs fish page ${x.share}`);
      if (Math.abs(round((1 - a.share.from) * b.share.from) - y.share) > 0.005) problems.push(`produce: fallback roll (1-${a.share.from})x${b.share.from} vs fish page ${y.share}`);
      for (const [p, f] of [[a, x], [b, y]]) {
        if (p.quantity.min !== f.quantity.min || p.quantity.max !== f.quantity.max) problems.push(`produce: quantity ${p.quantity.min}-${p.quantity.max} vs fish page ${f.quantity.min}-${f.quantity.max}`);
      }
    }
    return problems;
  }
  for (const p of pondRows) {
    const rows = fishRows.filter((r) => r.item === p.item);
    if (!rows.length) continue;
    const minPop = Math.min(...rows.map((r) => r.population.min));
    if (minPop !== p.min_population) problems.push(`produce ${p.item}: required population ${p.min_population} vs fish page ${minPop}`);
    const qmin = Math.min(...rows.map((r) => r.quantity.min));
    const qmax = Math.max(...rows.map((r) => r.quantity.max));
    if (qmin !== p.quantity.min || qmax !== p.quantity.max) problems.push(`produce ${p.item}: quantity ${p.quantity.min}-${p.quantity.max} vs fish page ${qmin}-${qmax}`);
    const shares = sharesByPopulation(fishRows, p.item, maxPop).filter((s) => s != null);
    const lo = Math.min(...shares);
    const hi = Math.max(...shares);
    const plo = Math.min(p.share.from, p.share.to);
    const phi = Math.max(p.share.from, p.share.to);
    if (Math.abs(lo - plo) > 0.0051 || Math.abs(hi - phi) > 0.0051) problems.push(`produce ${p.item}: % of items ${plo}-${phi} vs fish page ${lo}-${hi}`);
  }
  return problems;
}

/** base_chance for a population, as the Fish Pond page states it. */
export const baseChance = (population, legendary = false) => (population <= 0 ? 0 : legendary ? 0.5 : round(population * 0.08 + 0.15));

/** Checks each fish-page band's "Overall Daily Chance" against base_chance x share. */
export function checkDailyChance(rows, legendary) {
  const problems = [];
  for (const r of rows) {
    const want = [baseChance(r.population.min, legendary) * r.share, baseChance(r.population.max, legendary) * r.share];
    const got = [r.daily.from, r.daily.to];
    // The wiki rounds to whole percent (or one decimal below 2%); allow that rounding.
    const tol = (v) => (v < 0.02 ? 0.0006 : 0.0051);
    if (got.some((g, i) => Math.abs(g - want[i]) > tol(want[i]))) {
      problems.push(`daily chance ${r.item} pop ${r.population.min}-${r.population.max}: wiki ${got.map((g) => +(g * 100).toFixed(2)).join('-')}%, base_chance x share ${want.map((w) => +(w * 100).toFixed(2)).join('-')}%`);
    }
  }
  return problems;
}

/** Roe sell price per the Roe page: 30 + (base fish price / 2), rounded down. */
export const roePrice = (basePrice) => Math.floor(30 + basePrice / 2);

/* ------------------------------------------------------------------ main */

const LEGENDARY_SECTIONS = ['Legendary Fish', 'Legendary Fish II'];
const FISH_SECTIONS = ['Fishing Pole Fish', 'Night Market Fish', 'Legendary Fish', 'Legendary Fish II', 'Crab Pot Fish'];

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const pond = await page('Fish Pond');
  const fishPage = await page('Fish');
  const roe = await page('Roe');
  const agedRoe = await page('Aged Roe');
  const caviar = await page('Caviar');
  const foraging = await page('Foraging');
  const fishingSkill = await page('Fishing/Skill');
  const artisan = await page('Artisan Goods');
  const carpenter = await page("Carpenter's Shop");
  const pondSrc = { title: pond.title, url: pond.url, revid: pond.revid };

  /* ---------- Building ---------- */
  const build = {
    cost: 5000,
    materials: [
      { item: 'Stone', count: 200 },
      { item: 'Seaweed', count: 5 },
      { item: 'Green Algae', count: 5 },
    ],
    build_days: 2,
    size: { width: 5, height: 5 },
    sources: [
      cite(pond, /\|cost\s*=\s*\{\{Price\|5000\}\}/, /\|materials = \{\{Name\|Stone\|200\}\}\{\{Name\|Seaweed\|5\}\}\{\{Name\|Green Algae\|5\}\}/, /purchasable from \[\[Robin\]\]/, /It takes two days to build and occupies a 5x5 tile space/),
      cite(carpenter, /\[\[Fish Pond\]\][\s\S]{0,600}\{\{Price\|5,?000\}\}/, /\[\[Fish Pond\]\][\s\S]{0,800}\{\{Name\|Stone\|200\}\}[\s\S]{0,80}\{\{Name\|Seaweed\|5\}\}[\s\S]{0,80}\{\{Name\|Green Algae\|5\}\}/),
    ],
  };

  /* ---------- Pond rules ---------- */
  const rules = {
    population: {
      default_initial_capacity: 3,
      max_capacity: 10,
      legendary_max_capacity: 1,
      spawn_days: { min: 1, max: 5 },
      evidence: [
        quote(pond, /Ponds can hold up to a maximum of 10 fish of the same type, except for [^\n]*? where it can only hold up to 1\. The standard initial capacity of a pond is three fish\./),
        quote(pond, /The fish spawn frequency is species dependent, and ranges from 1 to 5 days \(except for \[\[Tiger Trout\]\], which does not reproduce\)\./),
        quote(pond, /A new fish quest is initiated when population growth is prevented by the pond capacity\./),
        quote(pond, /The fish population does not immediately increase when a quest is complete\. Instead, the fish spawning clock resets to zero days, and the next population increase happens <samp>Spawn_Frequency<\/samp> days later\./),
      ],
      sources: [pondSrc],
    },
    produce: {
      base_chance: { per_fish: 0.08, add: 0.15, min: 0.23, max: 0.95, legendary: 0.5 },
      formula: quote(pond, /base_chance = \(population of pond &times; 0\.08\) \+ 0\.15/),
      selection: 'first-matching-entry',
      extra_roe: { chance: 0.2, repeats: true, average_extra: 0.25, before_golden_cracker: true },
      golden_animal_cracker_multiplier: 2,
      evidence: [
        quote(pond, /For all ponds besides Legendary Fish and Legendary Fish II ponds, the base chance that an item is possible ranges from 23% to 95% \(<code>base_chance = \(population of pond &times; 0\.08\) \+ 0\.15<\/code>\)\. Empty ponds never produce items\./),
        quote(pond, /The item-selection can produce no item \(especially at low populations\), meaning that the overall daily item chance may be much lower than the base 23-95% value\. For Legendary Fish and Legendary Fish II ponds, the base chance that an item is possible is 50%\./),
        quote(pond, /The first entry that is valid for the current population and passes its random chance check is the produced item\. If no entries pass, no item is produced\./),
        quote(pond, /The column "Overall Daily Chance" is the chance of the item appearing on a given day, obtained by multiplying the base chance \(23-95%\) by the "% of Items"\./),
        quote(pond, /If a Fish Pond produces any amount of \[\[Roe\]\], the game generates a random number between 0 and 1\. If it is less than 0\.2, the quantity of the Roe produced increases by 1\.[^\n]*?This, on average, will give 0\.25 extra Roe\. This increase is taken into account before the doubling from the \[\[Golden Animal Cracker\]\]\./),
        quote(pond, /\[\[Golden Animal Cracker\]\], once per Fish Pond to double the fish pond's output of its normal product/),
      ],
      sources: [pondSrc],
    },
    harvested_fish_quality: 'regular',
    harvested_fish_evidence: quote(pond, /Harvested fish are always of regular quality/),
  };

  /* ---------- Roe, Aged Roe, Caviar, professions ---------- */
  const products = {
    roe: {
      price: { add: 30, base_price_divisor: 2, rounding: 'floor' },
      professions_apply: false,
      evidence: [
        quote(roe, /The equation is <samp>30 \+ \(base fish sell price \/ 2\)<\/samp>, rounded down to the next nearest integer\./),
        quote(roe, /Roe does not belong to any category and therefore it does not benefit from any Profession\./),
      ],
      sources: [cite(roe, /\|sellprice = 30 \+ \(Base \[\[Fish\]\] Price \/ 2\)/)],
    },
    aged_roe: {
      machine: 'preserves-jar',
      minutes: 4000,
      price: { roe_multiplier: 2 },
      input: 'roe of any fish except sturgeon',
      artisan: true,
      evidence: [
        quote(agedRoe, /The sell price is twice the unprocessed \[\[Roe\]\] sell price\./),
        quote(agedRoe, /'''Aged Roe''' is an \[\[Artisan Goods\|Artisan Good\]\] made from the \[\[Preserves Jar\]\] using any type of \[\[Roe\]\] except \[\[Sturgeon\]\] Roe\./),
      ],
      sources: [
        cite(agedRoe, /\|crafttime\s*=\s*4000m/, /\|sellprice\s*=\s*2 × \[\[Roe\]\] Price/),
        cite(roe, /\{\{Name\|Roe\|1\}\} \(from any fish other than \[\[Sturgeon\]\]\)\n\|[^\n]*Preserves Jar\n\|\{\{Duration\|4000m[^\n]*\n\|2 × Roe price/),
        cite(artisan, /Artisan Goods will be worth 40% more \(with the exception of \[\[Oil\]\] and \[\[Coffee\]\]\)/),
      ],
    },
    caviar: {
      machine: 'preserves-jar',
      minutes: 6000,
      price: { fixed: 500 },
      input: 'sturgeon roe',
      artisan: true,
      evidence: [quote(caviar, /'''Caviar''' is an \[\[Artisan Goods\|Artisan Good\]\] made from \[\[Sturgeon\]\] \[\[Roe\]\] using the \[\[Preserves Jar\]\]\./)],
      sources: [
        cite(caviar, /\|sellprice\s*=\s*500/, /\|crafttime\s*=\s*6000m/),
        cite(roe, /\{\{Name\|Sturgeon Roe\|1\}\}\n\|[^\n]*Preserves Jar\n\|\{\{Duration\|6000m[^\n]*\n\|\{\{Price\|500\}\}/),
        cite(artisan, /Artisan Goods will be worth 40% more \(with the exception of \[\[Oil\]\] and \[\[Coffee\]\]\)/),
      ],
    },
  };
  const professions = [
    {
      id: 'fisher',
      name: 'Fisher',
      level: 5,
      effect: { sell_multiplier: 1.25, applies_to: ['fish'] },
      evidence: quote(fishingSkill, /'''Fisher'''\n: \[\[Fish\]\] worth 25% more\./),
      sources: [cite(fishingSkill, /'''Fisher'''\n: \[\[Fish\]\] worth 25% more\./), cite(fishPage, /Fisher Profession \(\+25%\)/, /\{\{Qualityprice\|[^|}]+\|\d+\|pm=1\.25\}\}/)],
    },
    {
      id: 'angler',
      name: 'Angler',
      level: 10,
      requires: 'fisher',
      // The Fish page's Angler column is base x 1.5 (pm=1.5), not 1.25 x 1.5: the bonus replaces Fisher's.
      effect: { sell_multiplier: 1.5, applies_to: ['fish'], replaces: 'fisher' },
      evidence: quote(fishingSkill, /'''Angler'''\n: \[\[Fish\]\] worth 50% more\./),
      sources: [cite(fishingSkill, /'''Angler'''\n: \[\[Fish\]\] worth 50% more\./), cite(fishPage, /Angler Profession \(\+50%\)/, /\{\{Qualityprice\|[^|}]+\|\d+\|pm=1\.5\}\}/)],
    },
  ];

  /* ---------- Fish list ---------- */
  const pondQuests = parsePondQuests(pond.wikitext);
  const pondProduce = parsePondProduce(pond.wikitext);
  const sections = fishPageSections(fishPage.wikitext);
  const fishPrices = new Map();
  const legendary = new Set();
  for (const s of sections) {
    if (!FISH_SECTIONS.includes(s.heading)) continue;
    for (const [n, v] of s.prices) {
      fishPrices.set(n, v);
      if (LEGENDARY_SECTIONS.includes(s.heading)) legendary.add(n);
    }
  }
  const other = sections.find((s) => s.heading === 'Other Catchables');
  const otherSrc = cite(fishPage, /cannot be put in a \[\[Bait Maker\]\], \[\[Fish Smoker\]\], or \[\[Fish Pond\]\]/);
  const skipped = [];
  for (const n of [...(other ? [...other.prices.keys(), ...other.plainPrices.keys()] : [])]) {
    skipped.push({ name: n, reason: 'Not a fish: cannot be put in a Fish Pond (Fish page, Other Catchables; Fish Pond page).', sources: [otherSrc, cite(pond, /The following cannot be placed in a Fish Pond:\n\* \[\[Green Algae\]\], \[\[Seaweed\]\], \[\[White Algae\]\], \[\[Sea Jelly\]\], \[\[River Jelly\]\], and \[\[Cave Jelly\]\]/)] });
  }
  if (skipped.length !== 6) failures.push(`Fish page: expected 6 Other Catchables, found ${skipped.length} (${skipped.map((s) => s.name).join(', ')})`);
  const forageNames = ['Coral', 'Sea Urchin'];
  cite(pond, /\[\[Coral\]\] and \[\[Sea Urchin\]\] \(for simplicity, these are included when referencing fish in a Fish Pond/);
  cite(pond, /All fish caught with a \[\[Tools#Fishing Poles\|Fishing Rod\]\] or a \[\[Crab Pot\]\], including \[\[Fish#Legendary Fish\|Legendary Fish\]\] and \[\[Fish#Legendary Fish II\|Legendary Fish II\]\]/);
  const foragePrices = qualityPrices(foraging.wikitext);

  // Every fish on the Fish page can live in a pond; Coral and Sea Urchin are the only non-fish.
  for (const n of fishPrices.keys()) if (!pondProduce.has(n)) failures.push(`${n}: on the Fish page but not in the Fish Pond produce table`);
  for (const n of pondProduce.keys()) if (!fishPrices.has(n) && !forageNames.includes(n)) failures.push(`${n}: in the Fish Pond produce table but not on the Fish page`);

  const initialOne = linkNames(quote(pond, /Several rare fish have an initial capacity of just one fish, namely [^\n]*?\./) || '');
  const initialTen = linkNames(quote(pond, /Conversely, [^\n]*? have an initial capacity of ten\./) || '');

  const records = [];
  const fixture = {};
  for (const name of [...pondProduce.keys()].sort((a, b) => a.localeCompare(b))) {
    const problems = [];
    const notes = [];
    const fp = await page(name);
    const html = await rendered(name);
    const isLegend = legendary.has(name);
    const isForage = forageNames.includes(name);

    // Base price: own page vs Fish page (Foraging page for Coral / Sea Urchin).
    const own = infoboxPrice(fp.wikitext);
    const listed = isForage ? foragePrices.get(name) : fishPrices.get(name);
    const listSrc = isForage ? foraging : fishPage;
    if (own == null) problems.push('own page: price not found');
    if (listed == null) problems.push(`${listSrc.title} page: price not found`);
    if (own != null && listed != null && own !== listed) problems.push(`base price differs: own page ${own}, ${listSrc.title} page ${listed}`);
    const r = renderedPrices(html.html);
    if (!r.sell) problems.push('rendered infobox: sell prices not found');
    else if (r.sell.base[0] !== own) problems.push(`rendered infobox base price ${r.sell.base[0]} != ${own}`);

    // Pond facts from the fish page.
    const section = fishPondSection(fp.wikitext);
    if (!section) {
      problems.push('own page: no Fish Pond section');
      records.push({ id: slug(name), name, problems });
      continue;
    }
    const f = parseFishPond(section);
    const pq = pondQuests.get(name);
    const pr = pondProduce.get(name);

    // Capacities.
    const expectInitial = isLegend ? 1 : initialOne.includes(name) ? 1 : initialTen.includes(name) ? 10 : 3;
    if (f.initial_capacity !== expectInitial) problems.push(`initial capacity: fish page ${f.initial_capacity}, Fish Pond page ${expectInitial}`);
    const expectMax = isLegend ? 1 : 10;
    if (f.max_capacity !== expectMax) problems.push(`max population: fish page ${f.max_capacity}, Fish Pond page ${expectMax}`);

    // Spawn frequency and quests.
    let spawnDays = f.reproduces ? f.spawn_days : null;
    if (f.reproduces && spawnDays == null && !isLegend) problems.push('fish page: spawn frequency not found');
    if (pq) {
      if (pq.spawn_days !== spawnDays) problems.push(`spawn days: Fish Pond page ${pq.spawn_days}, fish page ${spawnDays}`);
      const a = pq.quests.map((q) => q.population).join(',');
      const b = f.quests.map((q) => q.population).join(',');
      if (a !== b) problems.push(`quest populations: Fish Pond page ${a}, fish page ${b}`);
      pq.quests.forEach((q, i) => {
        const o = f.quests[i];
        const key = (opts) => opts.map((x) => `${x.min}-${x.max} ${x.item}`).sort().join('; ');
        if (o && key(q.options) !== key(o.options)) notes.push(`Quest at ${q.population}: Fish Pond page lists ${key(q.options)}; fish page lists ${key(o.options)}. Fish page used.`);
      });
    } else if (name === 'Tiger Trout') {
      if (f.reproduces) problems.push('Tiger Trout: expected "does not reproduce"');
      notes.push('Does not reproduce (Fish Pond page); starts at capacity 10 so it needs no quests.');
    } else if (isLegend) {
      notes.push('Legendary: pond holds 1 fish, so it never reproduces or asks for quests. Spawn frequency not given.');
    } else if (!isForage) problems.push('not in the Fish Pond quest table');
    else notes.push('No quests (initial capacity 10); spawn frequency read from the own page and the Fish Pond quest table.');
    // Capacity chain: initial -> quests -> max.
    let cap = f.initial_capacity;
    for (const q of f.quests) {
      if (q.population !== cap) problems.push(`quest at ${q.population} does not start from capacity ${cap}`);
      cap = q.capacity_after;
    }
    if (cap !== f.max_capacity) problems.push(`quests end at capacity ${cap}, max ${f.max_capacity}`);

    // Produce: fish page bands vs Fish Pond page summary.
    if (!f.produce.length) problems.push('fish page: produce table not found');
    problems.push(...compareProduce(f.produce, pr, f.max_capacity, isLegend));
    problems.push(...checkDailyChance(f.produce, isLegend));
    // Shares per population must add up to 100% with the "Nothing" row.
    for (let p = 1; p <= f.max_capacity; p++) {
      const items = f.produce.filter((x) => x.population.min <= p && p <= x.population.max).reduce((s, x) => s + x.share, 0);
      const none = f.nothing.filter((x) => x.population.min <= p && p <= x.population.max).reduce((s, x) => s + x.share, 0);
      if (Math.abs(items + none - 1) > 0.011) problems.push(`population ${p}: item shares ${round(items)} + nothing ${round(none)} != 1`);
    }

    // Roe.
    const makesRoe = f.produce.some((x) => x.item === 'Roe');
    let roeRec = null;
    if (makesRoe) {
      const price = roePrice(own);
      const processed = name === 'Sturgeon' ? { id: 'caviar', name: 'Caviar', price: 500 } : { id: 'aged-roe', name: 'Aged Roe', price: 2 * price };
      roeRec = { name: f.produce.find((x) => x.item === 'Roe').display, price, processed };
      const a = r.artisan || {};
      fixture[slug(name)] = { name, base: r.sell && r.sell.base, fisher: r.sell && r.sell.fisher, angler: r.sell && r.sell.angler, artisan: r.artisan };
      if (a.Roe == null) notes.push('Rendered infobox shows no roe price; formula not cross-checked for this fish.');
      else {
        if (a.Roe !== price) problems.push(`roe price: rendered infobox ${a.Roe}, formula ${price}`);
        if (a[processed.name] !== processed.price) problems.push(`${processed.name} price: rendered infobox ${a[processed.name]}, rule ${processed.price}`);
        if (a[`${processed.name} (+40%)`] !== Math.floor(processed.price * 1.4)) problems.push(`${processed.name} with Artisan: rendered infobox ${a[`${processed.name} (+40%)`]}, rule ${Math.floor(processed.price * 1.4)}`);
      }
    } else if (!['Squid', 'Midnight Squid', 'Coral'].includes(name)) problems.push('produces no roe');
    if (r.sell && !isForage) {
      const want = (m) => r.sell.base.map((b) => Math.floor(b * m));
      if (r.sell.fisher.join() !== want(1.25).join()) problems.push(`Fisher prices ${r.sell.fisher} != floor(base x 1.25) ${want(1.25)}`);
      if (r.sell.angler.join() !== want(1.5).join()) problems.push(`Angler prices ${r.sell.angler} != floor(base x 1.5) ${want(1.5)}`);
    }

    records.push({
      id: slug(name),
      name,
      kind: isForage ? 'forage' : isLegend ? 'legendary' : 'fish',
      base_price: own,
      roe: roeRec,
      initial_capacity: f.initial_capacity,
      max_population: f.max_capacity,
      spawn_days: spawnDays,
      quests: f.quests.map((q) => ({ population: q.population, capacity_after: q.capacity_after, options: q.options })),
      // One row per item and population band, as the fish page gives it. share = "% of Items"
      // (fraction of the days an item is possible); daily = "Overall Daily Chance" at the band's
      // lowest and highest population.
      produce: f.produce.map((x) => ({
        item: x.item,
        ...(x.display !== x.item ? { display: x.display } : {}),
        quantity: x.quantity,
        population: x.population,
        share: x.share,
        daily: { min_population: x.daily.from, max_population: x.daily.to },
      })),
      nothing: f.nothing.map((x) => ({ population: x.population, share: x.share })),
      game_version: GAME_VERSION,
      sources: [
        { title: fp.title, url: `${fp.url}#Fish_Pond`, revid: fp.revid },
        { title: pond.title, url: `${pond.url}#Produce`, revid: pond.revid },
        { title: listSrc.title, url: listSrc.url, revid: listSrc.revid },
        { title: html.title, url: html.url, revid: html.revid },
      ],
      last_verified: today,
      verification_status: problems.length ? 'needs-verification' : 'cross-checked',
      problems,
      notes,
    });
  }

  const bad = records.filter((x) => x.problems.length);
  for (const x of bad) failures.push(`${x.name}: ${x.problems.join('; ')}`);
  const roeChecked = Object.values(fixture).filter((x) => x.artisan && x.artisan.Roe != null).length;
  if (roeChecked < 5) failures.push(`roe price rule verified against only ${roeChecked} fish (need 5)`);

  const out = {
    schema: 'stardew-tools/fishponds@1',
    game_version: GAME_VERSION,
    generated: today,
    last_verified: today,
    source: 'Stardew Valley Wiki (CC BY-NC-SA 3.0), cross-checked between the Fish Pond page and each fish page',
    building: build,
    rules,
    products,
    professions,
    skipped,
    fish: records,
  };
  if (failures.length) {
    console.error('Fish pond import failed:\n  ' + failures.join('\n  '));
    process.exit(1);
  }
  writeFileSync(join(ROOT, 'data', 'fishponds.json'), JSON.stringify(out, null, 2) + '\n');
  writeFileSync(
    join(ROOT, 'tests', 'fixtures', 'fishpond-prices.json'),
    JSON.stringify({ note: 'Prices rendered by the wiki in each fish page infobox (base/fisher/angler by quality: regular, silver, gold, iridium).', fish: fixture }, null, 1) + '\n',
  );
  console.log(`${records.length} pond fish written (${roeChecked} roe prices checked against the wiki), ${skipped.length} skipped`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

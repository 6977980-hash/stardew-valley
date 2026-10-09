#!/usr/bin/env node
// Builds data/fishponds.json from the Stardew Valley Wiki: the Fish Pond building and its
// rules, every fish that can live in a pond with its produce table, and the Roe / Aged Roe /
// Caviar price rules. Also writes tests/fixtures/fishpond-prices.json (the wiki's own rendered
// infobox prices), the oracle for the roe and profession tests.
//
// Sources and how they are checked:
//   - Building cost: Fish Pond infobox, confirmed by the Carpenter's Shop table.
//   - Base sell price (price-critical, 3 sources must agree): the fish's own infobox, the
//     "Fish" page tables ("Foraging" for Coral / Sea Urchin) and the wiki-rendered infobox.
//   - Produce: the fish's own "Fish Pond" section (one row per item and population band) is
//     stored; the "Fish Pond" page summary table must list the same items with the same
//     quantity ranges and required populations. "% of Items" ranges that disagree between the
//     two pages are kept as produce_conflicts (not price data), with the fish page used.
//   - Spawn frequency: two of three must agree (Fish Pond quest table, fish page sentence,
//     and the quest XP via the wiki's "XP = 20 + 5 x Spawn_Frequency").
//   - Roe / Aged Roe / Caviar / Fisher / Angler rules: the wiki sentence that states each rule,
//     then checked against the rendered infobox of every fish (at least 5 must show roe).
// Every value is paired with wiki evidence; the import fails if evidence is missing or any
// fish has a problem. Files are written only after every check has passed.
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
const ref = (p, anchor = '') => ({ title: p.title, url: p.url + anchor, revid: p.revid });

/** Returns a source reference after checking every evidence pattern is on the page. */
function cite(p, ...evidence) {
  for (const e of evidence) {
    if (!e.test(p.wikitext)) failures.push(`${p.title}: evidence not found ${e}`);
  }
  return ref(p);
}

/** The exact wiki text matched by a pattern (stored verbatim as evidence); null + failure if absent. */
function quote(p, re) {
  const m = p.wikitext.match(re);
  if (!m) {
    failures.push(`${p.title}: evidence not found ${re}`);
    return null;
  }
  return m;
}
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ------------------------------------------------------------------ parse helpers */

const round = (n) => Math.round(n * 1e6) / 1e6;
const ATTR = /^\s*(?:[a-z-]+\s*=\s*"[^"]*"\s*)+\|/i;
/** Strips leading cell attributes (rowspan="2" data-sort-value="x"|) and whitespace. */
export const cell = (s) => s.replace(ATTR, '').trim();
const linkNames = (s) => [...s.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1].trim());
/** Comparison key for item names: "Warp Totem: Beach" == "Warp Totem Beach". */
export const itemKey = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** "1-3" -> {min:1,max:3}; "5" -> {min:5,max:5}. */
export function range(s) {
  const m = String(s).match(/^\s*(\d+)\s*(?:[-–]\s*(\d+))?\s*$/);
  return m ? { min: Number(m[1]), max: Number(m[2] ?? m[1]) } : null;
}
/** "23-67%" -> {from:.23,to:.67}; "77-5%" stays in page order. */
export function pct(s) {
  const m = String(s).match(/^\s*([\d.]+)\s*%?\s*(?:[-–]\s*([\d.]+))?\s*%\s*$/);
  if (!m) return null;
  return { from: round(Number(m[1]) / 100), to: round(Number(m[2] ?? m[1]) / 100) };
}

/** Rows of the wikitable starting at or after `start`, each an array of raw lines (without the leading "|"). */
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

/** "3 [[Ginger]] or 1 [[Pineapple]]" -> [{item:'Ginger',min:3,max:3}, ...]. */
export function questOptions(text) {
  return [...text.matchAll(/(\d+)(?:\s*[-–]\s*(\d+))?\s+\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g)].map((m) => ({
    item: m[3].trim(),
    min: Number(m[1]),
    max: Number(m[2] ?? m[1]),
  }));
}

/** Fish Pond page "Quests" table: fish name -> { spawn_days, quests:[{population, options}] }. */
export function parsePondQuests(wikitext) {
  const out = new Map();
  let current = null;
  for (const row of tableRowsAt(wikitext, wikitext.indexOf('==Quests=='))) {
    const cells = row.map(cell);
    if (!cells.length) continue;
    if (/^\[\[/.test(cells[0])) {
      const [names, pop, items, freq] = cells;
      const f = (freq || '').match(/^(\d+) days?$/);
      current = { spawn_days: f ? Number(f[1]) : null, quests: [] };
      if (/^\d+$/.test(pop)) current.quests.push({ population: Number(pop), options: questOptions(items) });
      for (const n of linkNames(names)) out.set(n, current);
    } else if (current && /^\d+$/.test(cells[0])) {
      current.quests.push({ population: Number(cells[0]), options: questOptions(cells[1]) });
    }
  }
  return out;
}

/**
 * Fish Pond page "Produce" table: fish name -> rows {item (link label), link (page), quantity,
 * min_population, share, daily, only_if_above_fails}. Several fish can share one row group.
 */
export function parsePondProduce(wikitext) {
  const out = new Map();
  let current = null;
  for (const row of tableRowsAt(wikitext, wikitext.indexOf('==Produce=='))) {
    let cells = row.map(cell);
    if (cells.length === 5) {
      current = [];
      for (const n of linkNames(cells[0])) out.set(n, current);
      cells = cells.slice(1);
    }
    if (cells.length !== 4 || !current) continue;
    const [item, pop, share, daily] = cells;
    const m = item.match(/^(\d+(?:\s*[-–]\s*\d+)?)\s+\[\[([^\]|]+)(?:\|([^\]]+))?\]\](.*)$/);
    if (!m) continue;
    current.push({
      item: (m[3] || m[2]).trim(),
      link: m[2].trim(),
      quantity: range(m[1]),
      min_population: Number(pop),
      share: pct(share),
      daily: pct(daily),
      only_if_above_fails: /Only if above roll fails/i.test(m[4]),
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

/** {{Name|Orange Roe|1-2|link=Roe}} -> {name:'Orange Roe', link:'Roe', quantity:{1,2}}; handles {{!}} in link. */
export function nameTemplate(s) {
  const m = s.replace(/\{\{!\}\}/g, '¦').match(/\{\{Name\|([^|}]+)\|([^|}]+)((?:\|[^}]*)?)\}\}/);
  if (!m) return null;
  const link = (m[3].match(/\|link=([^|}¦]+)/) || [])[1];
  return { name: m[1].trim(), link: (link || m[1]).trim(), quantity: range(m[2]) };
}

/** A fish page's Fish Pond section: text facts, quest table and produce bands. */
export function parseFishPond(section) {
  const stop = section.indexOf("'''[[Fish Pond#");
  const text = stop < 0 ? section : section.slice(0, stop);
  const out = { spawn_days: null, reproduces: true, initial_capacity: null, max_capacity: null, quests: [], produce: [], nothing: [] };
  const every = text.match(/reproduce every (\d+) days|reproduce every (day)/);
  if (every) out.spawn_days = every[2] ? 1 : Number(every[1]);
  if (/(?:do|does|will|cannot|can ?not) (?:not )?reproduce/i.test(text) && !every) out.reproduces = false;
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
    let xp = null;
    for (const row of tableRowsAt(section, pAt)) {
      let pendingXp = false;
      for (const line of row) {
        const c = cell(line);
        const name = nameTemplate(c);
        if (name) {
          item = name;
          pendingXp = true;
          continue;
        }
        if (/''Nothing''/.test(c)) {
          item = 'nothing';
          pendingXp = true;
          continue;
        }
        if (pendingXp && /^\d*$/.test(c)) {
          xp = c ? Number(c) : null;
          pendingXp = false;
          continue;
        }
        const band = c.match(/^(\d+(?:\s*-\s*\d+)?)\s*\|\|\s*([\d.]+)\s*%\s*\|\|\s*(.+?)\s*$/);
        if (!band || !item) continue;
        const population = range(band[1]);
        const share = round(Number(band[2]) / 100);
        if (item === 'nothing') out.nothing.push({ population, share, daily: pct(band[3]) });
        else out.produce.push({ name: item.name, link: item.link, quantity: item.quantity, fishing_xp: xp, population, share, daily: pct(band[3]) });
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

/**
 * Sell price of a produced item from its page infobox: a plain number, {{Price|n}}, or (for
 * pages covering several variants, e.g. Slime Egg) the "[[File:<label>.png]] n g" line. Null
 * when the wiki states no single number ("N/A", blank).
 */
export function itemSellPrice(wikitext, label) {
  const m = wikitext.match(/^\|\s*(?:sell)?price\s*=([\s\S]*?)(?=^\||^\}\})/m);
  if (!m) return null;
  const v = m[1].trim();
  const plain = v.match(/^(?:\{\{Price\|)?([\d,]+)(?:\}\})?$/);
  if (plain) return Number(plain[1].replace(/,/g, ''));
  const variant = v.match(new RegExp(`File:${esc(label)}\\.png[^\\]]*\\]\\]\\s*([\\d,]+)g`));
  return variant ? Number(variant[1].replace(/,/g, '')) : null;
}

/** Base prices from {{Qualityprice|Name|200}} cells (no profession multiplier). */
export function qualityPrices(wikitext) {
  const out = new Map();
  for (const m of wikitext.matchAll(/\{\{Qualityprice\|([^|}]+)\|([\d,]+)([^}]*)\}\}/g)) {
    if (/pm=/.test(m[3])) continue;
    if (!out.has(m[1].trim())) out.set(m[1].trim(), Number(m[2].replace(/,/g, '')));
  }
  return out;
}

/** "===Heading===" subsections of the Fish page with their prices. */
export function fishPageSections(wikitext) {
  const heads = [...wikitext.matchAll(/^===\s*([^=]+?)\s*===\s*$/gm)];
  return heads.map((h, i) => {
    const end = i + 1 < heads.length ? heads[i + 1].index : wikitext.indexOf('\n==', h.index + h[0].length);
    const body = wikitext.slice(h.index, end);
    const plain = new Map();
    for (const m of body.matchAll(/\n\|\s*\[\[([^\]|]+)\]\]\s*\n\|\s*\{\{Description[^}]*\}\}\s*\n\|\s*\{\{Price\|([\d,]+)\}\}/g)) plain.set(m[1].trim(), Number(m[2].replace(/,/g, '')));
    return { heading: h[1], body, prices: qualityPrices(body), plainPrices: plain };
  });
}

/**
 * Rendered infobox (the wiki's own price module): Sell Prices as base/fisher/angler lists
 * (one value per quality shown) and Artisan Sell Prices as { label: price }.
 */
export function renderedPrices(html) {
  const t = html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]*>/g, '\n')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const g = (s) => (/^[\d,]+g$/.test(s) ? Number(s.slice(0, -1).replace(/,/g, '')) : null);
  const nums = (k) => {
    const out = [];
    for (; k < t.length && g(t[k]) != null; k++) out.push(g(t[k]));
    return out;
  };
  const out = { sell: null, artisan: null };
  const i = t.indexOf('Sell Prices');
  if (i >= 0 && t.slice(i + 1, i + 6).join(' ') === 'Base Fisher (+25%) Angler (+50%)') {
    const n = nums(i + 6);
    if (n.length && n.length % 3 === 0) {
      const q = n.length / 3;
      out.sell = { base: n.slice(0, q), fisher: n.slice(q, 2 * q), angler: n.slice(2 * q) };
    }
  } else {
    const j = t.indexOf('Sell Price');
    if (j >= 0) {
      const n = nums(j + 1);
      if (n.length) out.sell = { base: n, fisher: null, angler: null };
    }
  }
  const a = t.indexOf('Artisan Sell Prices');
  if (a >= 0) {
    const labels = [];
    let k = a + 1;
    for (; k < t.length && g(t[k]) == null; k++) {
      if (/^\(\+\d+%\)$/.test(t[k])) labels[labels.length - 1] += ` ${t[k]}`;
      else labels.push(t[k]);
    }
    const n = nums(k);
    if (labels.length === n.length) out.artisan = Object.fromEntries(labels.map((l, j) => [l, n[j]]));
  }
  return out;
}

/* ------------------------------------------------------------------ rules (pure) */

/** Roe sell price per the Roe page: 30 + (base fish price / 2), rounded down. */
export const roePrice = (basePrice) => Math.floor(30 + basePrice / 2);
/** Profession multiplier the way assets/js/engine/price.js applies it (matches the wiki's rendered values). */
export const withMultiplier = (price, mult) => Math.floor(Math.floor(mult * 10 * price) / 10);
/** Spawn frequency from quest XP, per the Fish Pond page: XP = 20 + 5 x Spawn_Frequency. */
export const spawnFromXp = (xp) => ((xp - 20) % 5 === 0 ? (xp - 20) / 5 : null);

/** Two of three spawn-frequency sources must agree; returns { value, note, problem }. */
export function voteSpawn(pondTable, fishText, fromXp) {
  const votes = [pondTable, fishText, fromXp].filter((v) => v != null);
  const counts = new Map();
  for (const v of votes) counts.set(v, (counts.get(v) || 0) + 1);
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!best) return { value: null, note: null, problem: 'spawn frequency not found' };
  if (votes.length === 1) return { value: best[0], note: null, problem: null };
  if (best[1] < 2) return { value: null, note: null, problem: `spawn frequency sources disagree (Fish Pond page ${pondTable}, fish page ${fishText}, quest XP ${fromXp})` };
  const note =
    counts.size > 1
      ? `Spawn frequency: Fish Pond page quest table says ${pondTable} days, fish page says ${fishText}, quest XP implies ${fromXp}; ${best[0]} used (2 of 3 agree).`
      : null;
  return { value: best[0], note, problem: null };
}

/** Per-population share of a produce item on the fish page (rows of the same item summed). */
function sharesByPopulation(rows, key, maxPop) {
  const out = [];
  for (let p = 1; p <= maxPop; p++) {
    const hit = rows.filter((r) => itemKey(r.name) === key || itemKey(r.link) === key).filter((r) => r.population.min <= p && p <= r.population.max);
    if (hit.length) out.push(round(hit.reduce((s, r) => s + r.share, 0)));
  }
  return out;
}

const keysOf = (r) => new Set([itemKey(r.item ?? r.name), itemKey(r.link)]);
const sameItem = (a, b) => [...keysOf(a)].some((k) => keysOf(b).has(k));

/**
 * Compares a fish page's produce rows with the Fish Pond page summary. Item set, quantity
 * ranges and required populations must agree (problems); "% of Items" ranges that differ
 * beyond rounding are returned as conflicts.
 */
export function compareProduce(fishRows, pondRows, maxPop, legendary) {
  const problems = [];
  const conflicts = [];
  for (const p of pondRows) if (!fishRows.some((f) => sameItem(p, f))) problems.push(`produce: ${p.item} on Fish Pond page but not on fish page`);
  for (const f of fishRows) if (!pondRows.some((p) => sameItem(p, f))) problems.push(`produce: ${f.name} on fish page but not on Fish Pond page`);
  if (legendary) {
    const [a, b] = pondRows;
    const [x, y] = fishRows;
    if (!a || !b || !x || !y || !b.only_if_above_fails || pondRows.length !== 2 || fishRows.length !== 2) {
      problems.push('produce: legendary two-roll rows not found');
      return { problems, conflicts };
    }
    // Fish Pond page gives the second roll conditionally; the fish page gives (1 - first) x second.
    if (Math.abs(a.share.from - x.share) > 0.005) problems.push(`produce: first roll ${a.share.from} vs fish page ${x.share}`);
    if (Math.abs(round((1 - a.share.from) * b.share.from) - y.share) > 0.005) problems.push(`produce: fallback roll (1-${a.share.from})x${b.share.from} vs fish page ${y.share}`);
    for (const [p, f] of [[a, x], [b, y]]) {
      if (p.quantity.min !== f.quantity.min || p.quantity.max !== f.quantity.max) problems.push(`produce: quantity ${p.quantity.min}-${p.quantity.max} vs fish page ${f.quantity.min}-${f.quantity.max}`);
    }
    return { problems, conflicts };
  }
  for (const p of pondRows) {
    const rows = fishRows.filter((f) => sameItem(p, f));
    if (!rows.length) continue;
    const minPop = Math.min(...rows.map((r) => r.population.min));
    if (minPop !== p.min_population) problems.push(`produce ${p.item}: required population ${p.min_population} vs fish page ${minPop}`);
    const qmin = Math.min(...rows.map((r) => r.quantity.min));
    const qmax = Math.max(...rows.map((r) => r.quantity.max));
    if (qmin !== p.quantity.min || qmax !== p.quantity.max) problems.push(`produce ${p.item}: quantity ${p.quantity.min}-${p.quantity.max} vs fish page ${qmin}-${qmax}`);
    const shares = sharesByPopulation(rows, itemKey(rows[0].name), maxPop);
    const lo = Math.min(...shares);
    const hi = Math.max(...shares);
    const plo = Math.min(p.share.from, p.share.to);
    const phi = Math.max(p.share.from, p.share.to);
    if (Math.abs(lo - plo) > 0.0051 || Math.abs(hi - phi) > 0.0051) {
      conflicts.push(`${p.item}: "% of Items" ${+(plo * 100).toFixed(2)}-${+(phi * 100).toFixed(2)}% on the Fish Pond page, ${+(lo * 100).toFixed(2)}-${+(hi * 100).toFixed(2)}% on the fish page (fish page used)`);
    }
  }
  return { problems, conflicts };
}

/** Daily chance an item is possible, per the Fish Pond page sentence. */
export const baseChance = (population, legendary = false, rule = { per_fish: 0.08, add: 0.15, legendary: 0.5 }) =>
  population <= 0 ? 0 : legendary ? rule.legendary : round(population * rule.per_fish + rule.add);

/** Fish-page "Overall Daily Chance" values that are more than 1 point off base_chance x share (reported as notes). */
export function dailyChanceGaps(rows, legendary) {
  const out = [];
  for (const r of rows) {
    if (!r.daily) continue;
    const want = [baseChance(r.population.min, legendary) * r.share, baseChance(r.population.max, legendary) * r.share];
    const got = [r.daily.from, r.daily.to];
    if (got.some((g, i) => Math.abs(g - want[i]) > 0.0101)) {
      out.push(`${r.name} pop ${r.population.min}-${r.population.max}: fish page "Overall Daily Chance" ${got.map((g) => +(g * 100).toFixed(2)).join('-')}%, base_chance x share gives ${want.map((w) => +(w * 100).toFixed(2)).join('-')}%`);
    }
  }
  return out;
}

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
  const pondSrc = ref(pond);

  /* ---------- Building: infobox, confirmed by the Carpenter's Shop table ---------- */
  const costM = quote(pond, /^\|cost\s*=\s*\{\{Price\|([\d,]+)\}\}\s*$/m);
  const matM = quote(pond, /^\|materials\s*=\s*((?:\{\{Name\|[^}]+\}\})+)\s*$/m);
  const cost = costM ? Number(costM[1].replace(/,/g, '')) : null;
  const materials = matM ? [...matM[1].matchAll(/\{\{Name\|([^|}]+)\|(\d+)\}\}/g)].map((m) => ({ item: m[1], count: Number(m[2]) })) : [];
  const daysM = quote(pond, /It takes (two|\d+) days to build and occupies a (\d+)x(\d+) tile space/);
  const building = {
    builder: 'Robin',
    cost,
    materials,
    build_days: daysM ? (daysM[1] === 'two' ? 2 : Number(daysM[1])) : null,
    size: daysM ? { width: Number(daysM[2]), height: Number(daysM[3]) } : null,
    sources: [
      cite(pond, /purchasable from \[\[Robin\]\] at the \[\[Carpenter's Shop\]\]/),
      cite(
        carpenter,
        new RegExp(`\\[\\[Fish Pond\\]\\][\\s\\S]{0,200}\\{\\{Price\\|${cost}\\}\\}${materials.map((m) => `\\{\\{Name\\|${esc(m.item)}\\|${m.count}\\}\\}`).join('')}[\\s\\S]{0,200}\\|2 days`),
      ),
    ],
  };

  /* ---------- Pond rules ---------- */
  const capS = quote(pond, /Ponds can hold up to a maximum of (\d+) fish of the same type, except for [^\n]*? where it can only hold up to (\d+)\. The standard initial capacity of a pond is (three|\d+) fish\./);
  const spawnS = quote(pond, /The fish spawn frequency is species dependent, and ranges from (\d+) to (\d+) days \(except for \[\[Tiger Trout\]\], which does not reproduce\)\./);
  const questS = quote(pond, /A new fish quest is initiated when population growth is prevented by the pond capacity\./);
  const resetS = quote(pond, /The fish population does not immediately increase when a quest is complete\. Instead, the fish spawning clock resets to zero days, and the next population increase happens <samp>Spawn_Frequency<\/samp> days later\./);
  const xpS = quote(pond, /<code>XP = 20 \+ 5 &times; Spawn_Frequency<\/code>/);
  const oneS = quote(pond, /Fish will reproduce even if only one fish is present in the pond\./);
  const baseS = quote(
    pond,
    /For all ponds besides Legendary Fish and Legendary Fish II ponds, the base chance that an item is possible ranges from (\d+)% to (\d+)% \(<code>base_chance = \(population of pond &times; ([\d.]+)\) \+ ([\d.]+)<\/code>\)\. Empty ponds never produce items\./,
  );
  const legS = quote(pond, /For Legendary Fish and Legendary Fish II ponds, the base chance that an item is possible is (\d+)%\./);
  const pickS = quote(pond, /The first entry that is valid for the current population and passes its random chance check is the produced item\. If no entries pass, no item is produced\./);
  const overallS = quote(pond, /The column "Overall Daily Chance" is the chance of the item appearing on a given day, obtained by multiplying the base chance \(23-95%\) by the "% of Items"\./);
  const noneS = quote(pond, /The item-selection can produce no item \(especially at low populations\)[^.]*\./);
  const roeExtraS = quote(pond, /If a Fish Pond produces any amount of \[\[Roe\]\], the game generates a random number between 0 and 1\. If it is less than ([\d.]+), the quantity of the Roe produced increases by 1\.[^\n]*?This, on average, will give ([\d.]+) extra Roe\. This increase is taken into account before the doubling from the \[\[Golden Animal Cracker\]\]\./);
  const crackerS = quote(pond, /A \[\[Golden Animal Cracker\]\] can be thrown into the fish pond to double its output\./);
  const qualityS = quote(pond, /Harvested fish are always of regular quality/);
  const persistS = quote(pond, /Uncollected items only persist to the next day if new items are not produced; otherwise the new items replace the uncollected items\./);
  const words = { three: 3 };
  const num = (s) => (words[s] ?? Number(s));
  const produceRule = {
    per_fish: baseS ? Number(baseS[3]) : null,
    add: baseS ? Number(baseS[4]) : null,
    legendary: legS ? Number(legS[1]) / 100 : null,
  };
  if (baseS && (round(produceRule.per_fish + produceRule.add) !== Number(baseS[1]) / 100 || round(10 * produceRule.per_fish + produceRule.add) !== Number(baseS[2]) / 100)) {
    failures.push(`Fish Pond: base_chance formula does not reproduce the stated ${baseS[1]}%-${baseS[2]}% range`);
  }
  const rules = {
    population: {
      max_capacity: capS ? Number(capS[1]) : null,
      legendary_max_capacity: capS ? Number(capS[2]) : null,
      default_initial_capacity: capS ? num(capS[3]) : null,
      spawn_days_range: spawnS ? { min: Number(spawnS[1]), max: Number(spawnS[2]) } : null,
      growth: 'One fish is added every spawn_days days until the current capacity is reached (one fish is enough to reproduce). At capacity a quest starts; completing it raises the capacity and resets the spawn clock, so the next fish arrives spawn_days later.',
      quest_xp: { add: 20, per_spawn_day: 5 },
      evidence: [capS, spawnS, oneS, questS, resetS, xpS].map((m) => m && m[0]),
      sources: [pondSrc],
    },
    produce: {
      base_chance: { per_fish: produceRule.per_fish, add: produceRule.add, legendary: produceRule.legendary, empty_pond: 0 },
      daily_chance: 'base_chance(population) x share, where share is the item\'s "% of Items" at that population (fish page). Items are tried in table order; the first that is valid for the population and passes its roll is produced; otherwise nothing.',
      legendary_second_roll: 'Legendary ponds list a second Roe roll that only happens if the first fails; the fish page shares already include that (fallback share = (1 - first) x 50%).',
      extra_roe: roeExtraS ? { chance: Number(roeExtraS[1]), repeats: true, average_extra: Number(roeExtraS[2]), before_golden_cracker: true } : null,
      golden_animal_cracker_multiplier: 2,
      uncollected: 'replaced by the next produced item',
      evidence: [baseS, legS, noneS, pickS, overallS, roeExtraS, crackerS, persistS].map((m) => m && m[0]),
      sources: [pondSrc],
    },
    harvested_fish_quality: 'regular',
    harvested_fish_evidence: qualityS && qualityS[0],
  };

  /* ---------- Roe, Aged Roe, Caviar, professions ---------- */
  const roeEq = quote(roe, /The equation is <samp>30 \+ \(base fish sell price \/ 2\)<\/samp>, rounded down to the next nearest integer\./);
  const roeProf = quote(roe, /Roe does not belong to any category and therefore it does not benefit from any Profession\./);
  const aged1 = quote(agedRoe, /The sell price is twice the unprocessed \[\[Roe\]\] sell price\./);
  const aged2 = quote(agedRoe, /'''Aged Roe''' is an \[\[Artisan Goods\|Artisan Good\]\] made from the \[\[Preserves Jar\]\] using any type of \[\[Roe\]\] except \[\[Sturgeon\]\] Roe\./);
  const agedMin = quote(agedRoe, /^\|crafttime\s*=\s*(\d+)m\b/m);
  const cav1 = quote(caviar, /'''Caviar''' is an \[\[Artisan Goods\|Artisan Good\]\] made from \[\[Sturgeon\]\] \[\[Roe\]\] using the \[\[Preserves Jar\]\]\./);
  const cavPrice = quote(caviar, /^\|sellprice\s*=\s*(\d+)\s*$/m);
  const cavMin = quote(caviar, /^\|crafttime\s*=\s*(\d+)m\b/m);
  const artisanS = quote(artisan, /worth 40% more \(with the exception of \[\[Oil\]\] and \[\[Coffee\]\]\)/);
  const roeTable = cite(
    roe,
    new RegExp(`\\{\\{Name\\|Roe\\|1\\}\\} \\(from any fish other than \\[\\[Sturgeon\\]\\]\\)\\n\\|[^\\n]*Preserves Jar\\]\\]\\n\\|\\{\\{Duration\\|${agedMin && agedMin[1]}m[^\\n]*\\n\\|2 × Roe price`),
    new RegExp(`\\{\\{Name\\|Sturgeon Roe\\|1\\}\\}\\n\\|[^\\n]*Preserves Jar\\]\\]\\n\\|\\{\\{Duration\\|${cavMin && cavMin[1]}m[^\\n]*\\n\\|\\{\\{Price\\|${cavPrice && cavPrice[1]}\\}\\}`),
  );
  const products = {
    roe: {
      price: { add: 30, base_price_divisor: 2, rounding: 'floor' },
      professions_apply: false,
      evidence: [roeEq && roeEq[0], roeProf && roeProf[0]],
      sources: [cite(roe, /\|sellprice = 30 \+ \(Base \[\[Fish\]\] Price \/ 2\)/)],
    },
    aged_roe: {
      machine: 'preserves-jar',
      minutes: agedMin ? Number(agedMin[1]) : null,
      price: { roe_multiplier: 2 },
      input: 'roe of any pond fish except Sturgeon',
      artisan: true,
      evidence: [aged1 && aged1[0], aged2 && aged2[0], artisanS && artisanS[0]],
      notes: ['The Aged Roe infobox also writes the price as "(60 + Base Fish Price)"; that is only exact for even base prices. The rendered fish pages (e.g. Tilapia 75g: Roe 67g, Aged Roe 134g) follow 2 x Roe price, which is what is stored.'],
      sources: [ref(agedRoe), roeTable, ref(artisan)],
    },
    caviar: {
      machine: 'preserves-jar',
      minutes: cavMin ? Number(cavMin[1]) : null,
      price: { fixed: cavPrice ? Number(cavPrice[1]) : null },
      input: 'Sturgeon roe',
      artisan: true,
      evidence: [cav1 && cav1[0], artisanS && artisanS[0]],
      sources: [ref(caviar), roeTable, ref(artisan)],
    },
  };
  const fisherS = quote(fishingSkill, /'''Fisher'''\n: \[\[Fish\]\] worth (\d+)% more\./);
  const anglerS = quote(fishingSkill, /'''Angler'''\n: \[\[Fish\]\] worth (\d+)% more\./);
  const professions = [
    {
      id: 'fisher',
      name: 'Fisher',
      level: 5,
      effect: { sell_multiplier: fisherS ? 1 + Number(fisherS[1]) / 100 : null, applies_to: ['fish'], roe: false },
      evidence: [fisherS && fisherS[0], roeProf && roeProf[0]],
      sources: [ref(fishingSkill), cite(fishPage, /Fisher Profession \(\+25%\)/), ref(roe)],
    },
    {
      id: 'angler',
      name: 'Angler',
      level: 10,
      requires: 'fisher',
      // The rendered Angler column is base x 1.5 (not 1.25 x 1.5): the bonus replaces Fisher's.
      effect: { sell_multiplier: anglerS ? 1 + Number(anglerS[1]) / 100 : null, applies_to: ['fish'], replaces: 'fisher', roe: false },
      evidence: [anglerS && anglerS[0], roeProf && roeProf[0]],
      sources: [ref(fishingSkill), cite(fishPage, /Angler Profession \(\+50%\)/), ref(roe)],
    },
  ];
  const nonFishS = quote(fishPage, /do not benefit from fish price bonuses, cannot be used in place of "Any Fish"[^\n]*?cannot be put in a \[\[Bait Maker\]\], \[\[Fish Smoker\]\], or \[\[Fish Pond\]\]/);

  /* ---------- Fish list ---------- */
  const pondQuests = parsePondQuests(pond.wikitext);
  const pondProduce = parsePondProduce(pond.wikitext);
  const sections = fishPageSections(fishPage.wikitext);
  const fishPrices = new Map();
  const legendary = new Set();
  const crabPot = new Set();
  for (const s of sections) {
    if (!FISH_SECTIONS.includes(s.heading)) continue;
    for (const [n, v] of s.prices) {
      fishPrices.set(n, v);
      if (LEGENDARY_SECTIONS.includes(s.heading)) legendary.add(n);
      if (s.heading === 'Crab Pot Fish') crabPot.add(n);
    }
  }
  const other = sections.find((s) => s.heading === 'Other Catchables');
  const cannotS = cite(pond, /The following cannot be placed in a Fish Pond:\n\* \[\[Green Algae\]\], \[\[Seaweed\]\], \[\[White Algae\]\], \[\[Sea Jelly\]\], \[\[River Jelly\]\], and \[\[Cave Jelly\]\]/);
  const skipped = [];
  for (const n of other ? [...other.prices.keys(), ...other.plainPrices.keys()] : []) {
    if (!new RegExp(`\\[\\[${esc(n)}\\]\\]`).test(pond.wikitext.slice(pond.wikitext.indexOf('The following cannot be placed'), pond.wikitext.indexOf('Fish in a Fish Pond have')))) {
      failures.push(`${n}: in Fish page "Other Catchables" but not in the Fish Pond "cannot be placed" list`);
    }
    skipped.push({ name: n, reason: 'Not a fish: cannot be put in a Fish Pond.', evidence: nonFishS && nonFishS[0], sources: [ref(fishPage, '#Other_Catchables'), cannotS] });
  }
  if (skipped.length !== 6) failures.push(`Fish page: expected 6 Other Catchables, found ${skipped.length} (${skipped.map((s) => s.name).join(', ')})`);
  const forageNames = linkNames((quote(pond, /^\* (\[\[Coral\]\] and \[\[Sea Urchin\]\]) \(for simplicity, these are included when referencing fish in a Fish Pond/m) || [, ''])[1]);
  cite(pond, /All fish caught with a \[\[Tools#Fishing Poles\|Fishing Rod\]\] or a \[\[Crab Pot\]\], including \[\[Fish#Legendary Fish\|Legendary Fish\]\] and \[\[Fish#Legendary Fish II\|Legendary Fish II\]\]/);
  const foragePrices = qualityPrices(foraging.wikitext);

  // Every fish on the Fish page can live in a pond; Coral and Sea Urchin are the only non-fish.
  for (const n of fishPrices.keys()) if (!pondProduce.has(n)) failures.push(`${n}: on the Fish page but not in the Fish Pond produce table`);
  for (const n of pondProduce.keys()) if (!fishPrices.has(n) && !forageNames.includes(n)) failures.push(`${n}: in the Fish Pond produce table but not on the Fish page`);

  const initialOne = linkNames((quote(pond, /Several rare fish have an initial capacity of just one fish, namely [^\n]*?\./) || [''])[0]);
  const initialTen = linkNames((quote(pond, /Conversely, [^\n]*? have an initial capacity of ten\./) || [''])[0]);

  const records = [];
  const fixture = {};
  const itemPages = new Map(); // item label -> { link }
  for (const name of [...pondProduce.keys()].sort((a, b) => a.localeCompare(b))) {
    const problems = [];
    const notes = [];
    const fp = await page(name);
    const html = await rendered(name);
    const isLegend = legendary.has(name);
    const isForage = forageNames.includes(name);
    const fRef = ref(fp, '#Fish_Pond');

    // Base price (price-critical): own infobox, Fish/Foraging page, rendered infobox must all agree.
    const own = infoboxPrice(fp.wikitext);
    const listSrc = isForage ? foraging : fishPage;
    const listed = isForage ? foragePrices.get(name) : fishPrices.get(name);
    const r = renderedPrices(html.html);
    if (own == null) problems.push('own page: price not found');
    if (listed == null) problems.push(`${listSrc.title} page: price not found`);
    if (own != null && listed != null && own !== listed) problems.push(`base price differs: own page ${own}, ${listSrc.title} page ${listed}`);
    if (!r.sell) problems.push('rendered infobox: sell prices not found');
    else if (r.sell.base[0] !== own) problems.push(`rendered infobox base price ${r.sell.base[0]} != own page ${own}`);

    const section = fishPondSection(fp.wikitext);
    if (!section) {
      problems.push('own page: no Fish Pond section');
      records.push({ id: slug(name), name, problems });
      continue;
    }
    const f = parseFishPond(section);
    const pq = pondQuests.get(name);
    const pr = pondProduce.get(name);

    // Capacities: fish page sentence vs Fish Pond page lists.
    const expectInitial = isLegend ? capS && Number(capS[2]) : initialOne.includes(name) ? 1 : initialTen.includes(name) ? 10 : capS && num(capS[3]);
    if (f.initial_capacity !== expectInitial) problems.push(`initial capacity: fish page ${f.initial_capacity}, Fish Pond page ${expectInitial}`);
    const expectMax = isLegend ? capS && Number(capS[2]) : capS && Number(capS[1]);
    if (f.max_capacity !== expectMax) problems.push(`max population: fish page ${f.max_capacity}, Fish Pond page ${expectMax}`);

    // Spawn frequency (2 of 3) and quests.
    let spawnDays = null;
    const xps = [...new Set(f.quests.map((q) => q.xp))];
    if (xps.length > 1) problems.push(`quest XP differs between quests: ${xps.join(', ')}`);
    if (name === 'Tiger Trout') {
      if (f.reproduces) problems.push('Tiger Trout: fish page does not say it cannot reproduce');
      cite(pond, /except \[\[Tiger Trout\]\], which do not reproduce/);
      notes.push('Does not reproduce; starts at capacity 10 so it needs no quests (fish page and Fish Pond page).');
    } else if (isLegend) {
      if (f.spawn_days != null || pq) problems.push('legendary fish unexpectedly has a spawn frequency or quests');
      notes.push('Legendary: the pond holds 1 fish, so it never reproduces or asks for quests.');
    } else {
      const v = voteSpawn(pq ? pq.spawn_days : null, f.spawn_days, xps.length === 1 ? spawnFromXp(xps[0]) : null);
      if (v.problem) problems.push(v.problem);
      if (v.note) notes.push(v.note);
      spawnDays = v.value;
      if (!pq && !isForage) problems.push('not in the Fish Pond quest table');
      if (isForage && f.quests.length) problems.push('forage item unexpectedly has quests');
    }
    if (pq) {
      const a = pq.quests.map((q) => q.population).join(',');
      const b = f.quests.map((q) => q.population).join(',');
      if (a !== b) problems.push(`quest populations: Fish Pond page ${a}, fish page ${b}`);
      const key = (opts) => opts.map((x) => `${x.min === x.max ? x.min : `${x.min}-${x.max}`} ${x.item.replace(/s$/, '')}`).sort().join('; ');
      pq.quests.forEach((q, i) => {
        const o = f.quests[i];
        if (o && key(q.options) !== key(o.options)) notes.push(`Quest at ${q.population}: Fish Pond page lists ${key(q.options)}; fish page lists ${key(o.options)} (fish page used).`);
      });
    }
    let cap = f.initial_capacity;
    for (const q of f.quests) {
      if (q.population !== cap) problems.push(`quest at ${q.population} does not start from capacity ${cap}`);
      cap = q.capacity_after;
    }
    if (cap !== f.max_capacity) problems.push(`quests end at capacity ${cap}, max ${f.max_capacity}`);

    // Produce: fish page rows vs Fish Pond page summary.
    if (!f.produce.length) problems.push('fish page: produce table not found');
    const cmp = compareProduce(f.produce, pr, f.max_capacity, isLegend);
    problems.push(...cmp.problems);
    const gaps = dailyChanceGaps(f.produce, isLegend);
    for (let p = 1; p <= f.max_capacity; p++) {
      const items = f.produce.filter((x) => x.population.min <= p && p <= x.population.max).reduce((s, x) => s + x.share, 0);
      const none = f.nothing.filter((x) => x.population.min <= p && p <= x.population.max).reduce((s, x) => s + x.share, 0);
      if (Math.abs(items + none - 1) > 0.011) problems.push(`population ${p}: item shares ${round(items)} + nothing ${round(none)} != 1`);
    }

    // Roe and processed roe (price-critical): rule vs rendered infobox.
    const roeRow = f.produce.find((x) => x.link === 'Roe');
    let roeRec = null;
    const a = r.artisan || {};
    if (roeRow && own != null) {
      const price = roePrice(own);
      const proc = name === 'Sturgeon' ? { id: 'caviar', name: 'Caviar', price: products.caviar.price.fixed } : { id: 'aged-roe', name: 'Aged Roe', price: 2 * price };
      roeRec = { name: roeRow.name, price, processed: { ...proc, price_artisan: withMultiplier(proc.price, 1.4) } };
      if (a.Roe == null) problems.push('rendered infobox shows no roe price');
      else {
        if (a.Roe !== price) problems.push(`roe price: rendered infobox ${a.Roe}, rule ${price}`);
        if (a[proc.name] !== proc.price) problems.push(`${proc.name} price: rendered infobox ${a[proc.name]}, rule ${proc.price}`);
        if (a[`${proc.name} (+40%)`] !== roeRec.processed.price_artisan) problems.push(`${proc.name} with Artisan: rendered infobox ${a[`${proc.name} (+40%)`]}, rule ${roeRec.processed.price_artisan}`);
      }
    } else if (!roeRow) {
      const roeTypes = quote(roe, /All fish in Fish Ponds produce roe except for the two varieties of Squid \(which produce \[\[Squid Ink\]\] instead\)\. Of the two non-fish that can be put in Fish Ponds, \[\[Sea Urchin\]\]s produce roe, but \[\[Coral\]\] doesn't\./);
      if (!['Squid', 'Midnight Squid', 'Coral'].includes(name) || !roeTypes) problems.push('produces no roe');
    }
    if (r.sell) {
      fixture[slug(name)] = { name, base: r.sell.base, fisher: r.sell.fisher, angler: r.sell.angler, artisan: r.artisan };
      if (!isForage) {
        const want = (m) => r.sell.base.map((b) => withMultiplier(b, m));
        if (!r.sell.fisher || r.sell.fisher.join() !== want(professions[0].effect.sell_multiplier).join()) problems.push(`Fisher prices ${r.sell.fisher} != rule ${want(1.25)}`);
        if (!r.sell.angler || r.sell.angler.join() !== want(professions[1].effect.sell_multiplier).join()) problems.push(`Angler prices ${r.sell.angler} != rule ${want(1.5)}`);
      } else if (r.sell.fisher) problems.push('forage item unexpectedly shows Fisher prices');
    }

    // Item labels come from the Fish Pond page (e.g. "Warp Totem: Beach", "Trash").
    const label = (row) => (pr.find((p) => sameItem(p, row)) || {}).item || row.name;
    const legendRows = isLegend ? pr : null;
    const produce = f.produce.map((x, i) => {
      const item = x.link === 'Roe' ? 'Roe' : label(x);
      if (x.link !== 'Roe') itemPages.set(item, (pr.find((p) => sameItem(p, x)) || {}).link || x.link);
      return {
        item,
        item_id: slug(item),
        ...(x.name !== item ? { wiki_name: x.name } : {}),
        quantity: x.quantity,
        population: x.population,
        share: x.share,
        daily: x.daily ? { at_min_population: x.daily.from, at_max_population: x.daily.to } : null,
        fishing_xp: x.fishing_xp,
        ...(legendRows && legendRows[i] && legendRows[i].only_if_above_fails ? { only_if_above_fails: true } : {}),
      };
    });
    if (gaps.length) notes.push(...gaps.map((g) => `Daily chance as printed differs from the formula by more than 1 point: ${g}.`));

    records.push({
      id: slug(name),
      name,
      kind: isForage ? 'forage' : isLegend ? 'legendary' : crabPot.has(name) ? 'crab-pot' : 'fish',
      base_price: own,
      fish_professions_apply: !isForage,
      roe: roeRec,
      initial_capacity: f.initial_capacity,
      max_population: f.max_capacity,
      reproduces: name !== 'Tiger Trout' && !isLegend,
      spawn_days: spawnDays,
      quests: f.quests.map((q) => ({ population: q.population, capacity_after: q.capacity_after, options: q.options, fishing_xp: q.xp })),
      // One row per item and population band, as the fish page gives it. share = "% of Items";
      // daily = the wiki's "Overall Daily Chance" at the band's lowest and highest population.
      produce,
      nothing: f.nothing.map((x) => ({ population: x.population, share: x.share })),
      // The Fish Pond page summary row for each item (quantity over all bands, required population).
      summary: pr.map((p) => ({ item: p.item, quantity: p.quantity, min_population: p.min_population, share: p.share, daily: p.daily, ...(p.only_if_above_fails ? { only_if_above_fails: true } : {}) })),
      produce_conflicts: cmp.conflicts,
      game_version: GAME_VERSION,
      sources: [fRef, ref(pond, '#Produce'), ref(listSrc), { title: html.title, url: html.url, revid: html.revid }],
      last_verified: today,
      verification_status: problems.length ? 'needs-verification' : 'cross-checked',
      problems,
      notes,
    });
  }

  /* ---------- Produced items' sell prices (from each item's own page) ---------- */
  const items = [];
  for (const [label, link] of [...itemPages.entries()].sort((x, y) => x[0].localeCompare(y[0]))) {
    const ip = await page(link);
    const price = itemSellPrice(ip.wikitext, label);
    items.push({ id: slug(label), name: label, sell_price: price, ...(price == null ? { note: 'The item page states no single sell price.' } : {}), sources: [ref(ip)] });
  }
  const priceOf = new Map(items.map((i) => [i.id, i.sell_price]));
  for (const rec of records) for (const row of rec.produce || []) row.item_price = row.item === 'Roe' ? rec.roe && rec.roe.price : priceOf.get(row.item_id) ?? null;

  const bad = records.filter((x) => x.problems.length);
  for (const x of bad) failures.push(`${x.name}: ${x.problems.join('; ')}`);
  const roeChecked = Object.values(fixture).filter((x) => x.artisan && x.artisan.Roe != null).length;
  if (roeChecked < 5) failures.push(`roe price rule verified against only ${roeChecked} fish (need 5)`);
  for (const [k, v] of Object.entries({ cost, build_days: building.build_days, per_fish: produceRule.per_fish, add: produceRule.add, legendary: produceRule.legendary })) if (v == null || Number.isNaN(v)) failures.push(`missing ${k}`);

  const out = {
    schema: 'stardew-tools/fishponds@1',
    game_version: GAME_VERSION,
    generated: today,
    last_verified: today,
    source: 'Stardew Valley Wiki (CC BY-NC-SA 3.0)',
    building,
    rules,
    products,
    professions,
    items,
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
    JSON.stringify({ note: 'Prices rendered by the wiki in each pond fish page infobox (base/fisher/angler per quality shown: regular, silver, gold, iridium; crab pot fish show fewer). Artisan = Roe / Aged Roe / Caviar.', fish: fixture }, null, 1) + '\n',
  );
  const conflicts = records.filter((x) => x.produce_conflicts.length).map((x) => x.name);
  console.log(`${records.length} pond fish written (${roeChecked} roe prices checked against the wiki), ${skipped.length} skipped, ${items.length} produced items; produce % conflicts kept as notes: ${conflicts.join(', ') || 'none'}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

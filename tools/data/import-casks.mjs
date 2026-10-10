#!/usr/bin/env node
// Builds data/casks.json from the Stardew Valley Wiki: how long each Cask-aged item takes to reach
// silver, gold and iridium quality, the quality price multipliers, which items can be aged, the
// cellar's cask counts, how the Cask is obtained and crafted, and which professions change the price
// of aged goods.
//
// Nothing is typed in by hand. Every value is read from at least two wiki pages (the Cask page and
// the item's own page, the Farmhouse and Carpenter's Shop pages, the Skills page's rendering, ...)
// that must agree. A source that disagrees, or a value only one page states, is written to the
// record's `problems` and the record is marked "needs-verification". A value no page states, or a
// missing evidence sentence, fails the import and nothing is written.
//
// Sources: "Cask", "Cask Productivity", "Farmhouse" (the "Cellar" page redirects here), "Carpenter's
// Shop", "Crafting", "Artisan Goods", "Skills" (rendered), "Farming", "Cheese Press", "Version History",
// and the pages of Wine, Cheese, Goat Cheese, Beer, Pale Ale and Mead.
//
//   node tools/data/import-casks.mjs [--cached]
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
const ref = (p, anchor) => ({ title: p.title, url: anchor ? `${p.url}#${encodeURIComponent(anchor.replace(/ /g, '_'))}` : p.url, revid: p.revid });

/* ------------------------------------------------------------------ parse helpers */

/** [[Target|Label]] -> Label, [[Target]] -> Target. */
export const unlink = (s) => s.replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1');

/** Wiki markup -> plain sentence. */
export function plain(s) {
  return unlink(
    s
      .replace(/\[\[File:[^\]]*\]\]/g, '')
      .replace(/\{\{Price\|([\d,]+)\}\}/g, '$1g')
      .replace(/\{\{Name\|([^|}]+)[^}]*\}\}/g, '$1')
      .replace(/\{\{Qualityprice\|[^|}]+\|([^|}]*)[^}]*\}\}/g, '[$1]')
      .replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/g, '')
      .replace(/<br\s*\/?>/g, ' ')
      .replace(/<\/?(?:code|span|samp|b|i|p)[^>]*>/g, '')
      .replace(/&times;/g, '×')
      .replace(/data-sort-value="[^"]*"\|?|style="[^"]*"\|?|class="[^"]*"\|?/g, ''),
  )
    .replace(/'''?/g, '')
    .replace(/(^|\s)\|+\s*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export const num = (s) => Number(String(s).replace(/,/g, ''));

/** Visible text of a rendered page, so a sentence the wiki builds from templates can be matched. */
export const htmlText = (html) =>
  html
    .replace(/<(?:script|style)[\s\S]*?<\/(?:script|style)>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

/** Template parameters of the page's first {{Infobox ...}}. */
export function infobox(wikitext) {
  const start = wikitext.search(/\{\{Infobox/);
  if (start < 0) return {};
  let depth = 0;
  let end = wikitext.length;
  for (let i = start; i < wikitext.length - 1; i++) {
    if (wikitext.startsWith('{{', i)) {
      depth++;
      i++;
    } else if (wikitext.startsWith('}}', i)) {
      depth--;
      i++;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  const out = {};
  let key = null;
  for (const line of wikitext.slice(start, end).split('\n')) {
    const m = line.match(/^\|\s*([a-z0-9_]+)\s*=\s*(.*)$/);
    if (m) {
      key = m[1];
      out[key] = m[2].trim();
    } else if (key && !/^\}\}/.test(line)) out[key] += '\n' + line;
  }
  return out;
}

/** First integer of an infobox price such as "{{Price|20}}" or "230". */
export function firstInt(s) {
  const m = String(s ?? '').match(/(\d[\d,]*)/);
  return m ? num(m[1]) : undefined;
}

/**
 * Ingredients as [{item, qty}] from "{{Name|Wood|20}}{{Name|Hardwood|1}}", "{{Name|Milk|1|class=inline}} or
 * {{Name|Large Milk|1}}" or "Any [[Fruits|fruit]] (1)".
 */
export function parseIngredients(s) {
  const text = String(s ?? '');
  const out = [...text.matchAll(/\{\{Name\|([^|}]+)\|(\d+)/g)].map((m) => ({ item: m[1].trim(), qty: +m[2] }));
  const any = text.match(/Any \[\[Fruits\|fruit\]\] \((\d+)\)/i);
  if (any) out.push({ item: 'Any Fruit', qty: +any[1] });
  return out;
}

/**
 * A Qualityprice price argument: "200" -> {fixed: 200}; "3 x Base<br />Fruit Price" or
 * "3 × [[Fruits|Fruit]] Base Sell Price" -> {fruit_multiple: 3}.
 */
export function parsePriceArg(s) {
  const t = String(s ?? '').trim();
  if (/^\d[\d,]*$/.test(t)) return { fixed: num(t) };
  const m = t.match(/^(\d+)\s*[x×]\s*(?:Base|\[\[Fruits)/i);
  return m ? { fruit_multiple: +m[1] } : undefined;
}

/**
 * One aged-values row (a Cask table row, or the single row of an item page's table): the normal
 * price argument and, for silver/gold/iridium, the "Aged: N Days" (days since the previous stage) and
 * "Total: N Days" (days since the cask was filled; absent for silver, where it equals Aged).
 */
export function parseAgedCells(text) {
  const out = {};
  const parts = text.split(/\{\{Qualityprice\|/).slice(1);
  for (const part of parts) {
    const q = part.match(/quality=(normal|silver|gold|iridium)/);
    if (!q) continue;
    const priceArg = part.slice(part.indexOf('|') + 1, part.indexOf('|quality='));
    const aged = part.match(/Aged:\s*(\d+)\s*Days?/);
    const total = part.match(/Total:\s*(\d+)\s*Days?/);
    const cell = {};
    if (q[1] === 'normal') cell.price = parsePriceArg(priceArg);
    if (aged) cell.aged = +aged[1];
    if (total) cell.total = +total[1];
    else if (aged && q[1] === 'silver') cell.total = +aged[1];
    out[q[1]] = cell;
  }
  return out;
}

/** The Cask page's "Aged Values" table: {name: {ingredient, normal, silver, gold, iridium, raw}}. */
export function parseCaskTable(wikitext) {
  const start = wikitext.indexOf('<section begin="caskagedvalues" />');
  const end = wikitext.indexOf('<section end="caskagedvalues" />');
  if (start < 0 || end < 0) return {};
  const out = {};
  for (const row of wikitext.slice(start, end).split(/^\|-\s*$/m).slice(1)) {
    const name = row.match(/^\|\[\[(?!File:)([^\]|#]+)\]\]\s*$/m);
    if (!name) continue;
    const ing = row.match(/^\|((?:Any|\{\{Name)[^\n]*)$/m);
    out[name[1]] = { ingredient: ing ? ing[1] : undefined, ...parseAgedCells(row), raw: row.trim() };
  }
  return out;
}

/** The first Qualityprice table row on an item page's "Aged Values" section. */
export function parseItemAged(wikitext) {
  const i = wikitext.indexOf('==Aged Values==');
  if (i < 0) return {};
  const section = wikitext.slice(i, wikitext.indexOf('\n==', i + 5) < 0 ? undefined : wikitext.indexOf('\n==', i + 5));
  const t = section.indexOf('{|');
  return t < 0 ? {} : { ...parseAgedCells(section.slice(t)), raw: section.slice(t).trim() };
}

/** Linked item names in a sentence, in order: "takes [[Beer]], [[Cheese]] and [[Wine]]" -> [Beer, Cheese, Wine]. */
export function linkNames(s) {
  return [...String(s).matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)].map((m) => m[1].trim());
}

/**
 * The Cask Productivity table: [{product, days, increase, increase_artisan}]. Wine rows (any fruit)
 * are reported under "Wine".
 */
export function parseCaskProductivity(wikitext) {
  const out = [];
  for (const row of wikitext.split(/^\|-\s*$/m)) {
    const lines = row.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('|') && !l.startsWith('|}') && !l.startsWith('{|'));
    if (lines.length !== 6) continue;
    const days = lines[1].match(/^\|\s*(\d+) Days$/);
    const inc = lines[2].match(/^\|\s*(\d+)g$/);
    const incA = lines[4].match(/^\|\s*(\d+)g$/);
    if (!days || !inc) continue;
    const name = lines[0].match(/\{\{Name\|([^|}]+)/);
    const product = /\[\[Wine\]\]/.test(lines[0]) ? 'Wine' : name?.[1].trim();
    if (product) out.push({ product, days: +days[1], increase: +inc[1], increase_artisan: incA ? +incA[1] : undefined });
  }
  return out;
}

/**
 * Settles one value from several sources. `sources` is [{source, page, value}]; the first stated
 * value is taken. A source that disagrees, or fewer than two distinct wiki pages stating the value,
 * goes to `problems`. A value no source states fails the import.
 */
export function settle(where, field, sources, problems, verified, fail = failures) {
  const stated = sources.filter((s) => s.value !== undefined && s.value !== null);
  if (!stated.length) {
    fail.push(`${where}: ${field} stated by no source (${sources.map((s) => s.source).join(', ')})`);
    return null;
  }
  const value = stated[0].value;
  const same = (s) => JSON.stringify(s.value) === JSON.stringify(value);
  for (const s of stated) if (!same(s)) problems.push(`${field}: ${stated[0].source} says ${JSON.stringify(value)}, ${s.source} says ${JSON.stringify(s.value)}`);
  const agree = stated.filter(same);
  const pages = new Set(agree.map((s) => s.page ?? s.source));
  if (pages.size < 2) problems.push(`${field}: only one wiki page (${[...pages][0]}) states this value; no second page to confirm it`);
  verified[field] = agree.map((s) => s.source);
  return value;
}

export const status = (problems) => (problems.length ? 'needs-verification' : 'cross-checked');

/* ------------------------------------------------------------------ import */

const ITEMS = ['Wine', 'Pale Ale', 'Beer', 'Mead', 'Cheese', 'Goat Cheese'];
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5 };

/**
 * One fact. Each statement is {p, re, bool?, anchor?, ev?}: `p` a page ({title, url, revid, wikitext}),
 * `re` a pattern whose group 1 is the number (or, with `bool`, whose match means "true"). The record
 * carries the evidence text, sources, and verified/problems/verification_status.
 */
function fact(id, label, statements, extra = {}) {
  const problems = [];
  const verified = {};
  const values = statements.map((s) => {
    const m = s.p.wikitext.match(s.re);
    if (!m) return { source: s.p.title, page: s.p.title, value: undefined };
    if (s.bool) return { source: s.p.title, page: s.p.title, value: true };
    const w = WORDS[m[1].toLowerCase()];
    return { source: s.p.title, page: s.p.title, value: w ?? (s.map ? s.map(m[1]) : num(m[1])) };
  });
  const value = settle(id, 'value', values, problems, verified);
  const evidence = statements
    .map((s) => {
      const m = s.p.wikitext.match(s.ev || s.re);
      if (!m && values.find((v) => v.source === s.p.title)?.value !== undefined) failures.push(`${s.p.title}: evidence not found ${s.ev || s.re}`);
      return m ? `${s.p.title}: "${plain(m[0]).replace(/^[*\s]+/, '')}"` : null;
    })
    .filter(Boolean);
  const used = statements.filter((s) => values.find((v) => v.source === s.p.title)?.value !== undefined);
  const seen = new Set();
  const srcs = used.filter((s) => (seen.has(s.p.title) ? false : seen.add(s.p.title))).map((s) => ref(s.p, s.anchor));
  return { id, label, value, ...extra, evidence, sources: srcs, verified: verified.value ?? [], problems, verification_status: status(problems) };
}

async function main() {
  const today = '2026-10-10';
  const cask = await page('Cask');
  const farmhouse = await page('Farmhouse');
  const carpenter = await page("Carpenter's Shop");
  const crafting = await page('Crafting');
  const artisanGoods = await page('Artisan Goods');
  const productivity = await page('Cask Productivity');
  const farming = await page('Farming');
  const cheesePress = await page('Cheese Press');
  const version = await page('Version History');
  const skillsHtml = await rendered('Skills');
  const skills = { title: skillsHtml.title, url: skillsHtml.url, revid: skillsHtml.revid, wikitext: htmlText(skillsHtml.html) };
  const itemPages = {};
  for (const n of ITEMS) itemPages[n] = await page(n);
  const skipped = [];

  /* ---------- game version ---------- */
  const latest = version.wikitext.match(/^==(\d+\.\d+\.\d+)==\s*\n[^\n]*?released\]? on ([^\n.]+)/m);
  if (!latest || latest[1] !== GAME_VERSION) failures.push(`Version History: newest version is ${latest?.[1]}, importer is written for ${GAME_VERSION}`);

  /* ---------- parsed tables ---------- */
  const caskRows = parseCaskTable(cask.wikitext);
  const prod = parseCaskProductivity(productivity.wikitext);
  if (Object.keys(caskRows).length !== 6) failures.push(`Cask: ${Object.keys(caskRows).length} rows in the aged values table, expected 6`);

  /* ---------- quality multipliers ---------- */
  const mp = [];
  const mv = {};
  const caskHead = (q) => cask.wikitext.match(new RegExp(`!${q} Star<br />\\(x ([\\d.]+)\\)`));
  const itemHead = (n, q) => itemPages[n].wikitext.match(new RegExp(`!${q} Quality<br />\\(x ([\\d.]+)\\)`));
  const farmingSentence = farming.wikitext.match(/Since iridium products are worth ([\d.]+)× base price, gold products are worth ([\d.]+)× base price, and silver products are worth ([\d.]+)× base price/);
  const mult = {};
  for (const [q, idx] of [['Silver', 3], ['Gold', 2], ['Iridium', 1]]) {
    mult[q.toLowerCase()] = settle('quality multipliers', q.toLowerCase(), [
      { source: `${cask.title} (table header)`, page: cask.title, value: caskHead(q) ? +caskHead(q)[1] : undefined },
      ...ITEMS.map((n) => ({ source: `${n} (table header)`, page: n, value: itemHead(n, q) ? +itemHead(n, q)[1] : undefined })),
      { source: `${farming.title} (profit example)`, page: farming.title, value: farmingSentence ? +farmingSentence[idx] : undefined },
    ], mp, mv);
  }
  const qualityMultipliers = {
    ...mult,
    note: 'Applied to the item\'s normal-quality base price; Artisan and the other professions multiply the result (see professions).',
    evidence: [
      `${cask.title}: "${plain(cask.wikitext.match(/(Iridium star is the highest level of quality, which doubles the value of an item\.)/)?.[1] ?? '')}"`,
      `${farming.title}: "${plain(farming.wikitext.match(/(Since iridium products are worth 2× base price, gold products are worth 1\.5× base price, and silver products are worth 1\.25× base price)/)?.[1] ?? '')}"`,
      `${itemPages.Wine.title}: "${plain(itemPages.Wine.wikitext.match(/(Iridium quality doubles the base sell price of Wine\.)/)?.[1] ?? '')}"`,
    ],
    sources: [ref(cask, 'Aged Values'), ...ITEMS.map((n) => ref(itemPages[n], 'Aged Values')), ref(farming)],
    verified: mv,
    problems: mp,
    verification_status: status(mp),
  };
  for (const e of qualityMultipliers.evidence) if (/: ""$/.test(e)) failures.push(`quality multipliers: evidence not found (${e})`);
  if (mult.silver !== 1.25 || mult.gold !== 1.5 || mult.iridium !== 2) mp.push(`unexpected multipliers ${JSON.stringify(mult)}`);
  qualityMultipliers.verification_status = status(mp);

  /* ---------- per-item aging ---------- */
  const caskIntro = cask.wikitext.match(/It takes ([^\n]*?), and ages them to increase their quality and value\./);
  const items = [];
  for (const name of ITEMS) {
    const ip = itemPages[name];
    const c = caskRows[name];
    const it = parseItemAged(ip.wikitext);
    const box = infobox(ip.wikitext);
    const problems = [];
    const verified = {};
    const where = `cask item ${name}`;
    const from = (get) => [
      { source: `${cask.title} (Aged Values table)`, page: cask.title, value: c ? get(c) : undefined },
      { source: `${ip.title} (Aged Values)`, page: ip.title, value: get(it) },
    ];
    const price = settle(where, 'normal_price', [
      ...from((r) => r.normal?.price),
      { source: `${ip.title} (infobox sell price)`, page: ip.title, value: parsePriceArg(box.sellprice) ?? (firstInt(box.sellprice) !== undefined && /^\{\{Price\|\d+\}\}$|^\d+$/.test(box.sellprice.trim()) ? { fixed: firstInt(box.sellprice) } : undefined) },
    ], problems, verified);
    const ingredients = settle(where, 'ingredients', [
      { source: `${cask.title} (Aged Values table)`, page: cask.title, value: c?.ingredient ? parseIngredients(c.ingredient) : undefined },
      { source: `${ip.title} (infobox)`, page: ip.title, value: parseIngredients(box.ingredients) },
    ], problems, verified);
    const stages = {
      silver: settle(where, 'silver_aged_days', from((r) => r.silver?.aged), problems, verified),
      gold: settle(where, 'gold_aged_days', from((r) => r.gold?.aged), problems, verified),
      iridium: settle(where, 'iridium_aged_days', from((r) => r.iridium?.aged), problems, verified),
    };
    const totalGold = settle(where, 'gold_total_days', from((r) => r.gold?.total), problems, verified);
    const prodDays = new Set(prod.filter((r) => r.product === name).map((r) => r.days));
    const totalIridium = settle(where, 'iridium_total_days', [
      ...from((r) => r.iridium?.total),
      { source: `${productivity.title} (Processing Time)`, page: productivity.title, value: prodDays.size ? (prodDays.size === 1 ? [...prodDays][0] : 'inconsistent') : undefined },
    ], problems, verified);
    if (stages.silver + stages.gold !== totalGold) problems.push(`gold_total_days: ${stages.silver} + ${stages.gold} aged days != ${totalGold} total`);
    if (totalGold + stages.iridium !== totalIridium) problems.push(`iridium_total_days: ${totalGold} + ${stages.iridium} aged days != ${totalIridium} total`);
    // Value increase to iridium, with and without Artisan, from Cask Productivity (fixed-price items only).
    const pr = prod.find((r) => r.product === name);
    if (price?.fixed != null && pr) {
      const inc = price.fixed * (mult.iridium - 1);
      if (pr.increase !== inc) problems.push(`${productivity.title}: iridium value increase ${pr.increase}g != ${price.fixed} × (${mult.iridium} - 1) = ${inc}g`);
      if (pr.increase_artisan !== Math.round(inc * 1.4)) problems.push(`${productivity.title}: iridium value increase with Artisan ${pr.increase_artisan}g != ${inc} × 1.4`);
    }
    const evid = (title, raw) => `${title}: "${plain(raw ?? '')}"`;
    if (!c?.raw || !it.raw) failures.push(`${where}: aged values row missing on ${!c?.raw ? cask.title : ip.title}`);
    items.push({
      id: slug(name),
      name,
      ingredients,
      base_price: price?.fixed ?? null,
      price_formula: price?.fruit_multiple ? { fruit_multiple: price.fruit_multiple, note: 'sells for this multiple of the ingredient fruit\'s base sell price' } : null,
      aged_days: { silver: stages.silver, gold: stages.gold, iridium: stages.iridium },
      total_days: { silver: stages.silver, gold: totalGold, iridium: totalIridium },
      evidence: [evid(`${cask.title} (Aged Values table, ${name} row)`, c?.raw), evid(`${ip.title} (Aged Values)`, it.raw)],
      sources: [ref(cask, 'Aged Values'), ref(ip, 'Aged Values'), ref(productivity)],
      verified,
      problems,
      verification_status: status(problems),
    });
  }
  const wineItem = items.find((i) => i.id === 'wine');
  const aging = {
    stage_semantics: 'aged_days = days spent at that step since the previous quality step (the wiki\'s "Aged: N Days"); total_days = days since the item went into the cask (the wiki\'s "Total: N Days"). Items go normal -> silver -> gold -> iridium.',
    items,
  };

  /* ---------- aged item list ---------- */
  const listP = [];
  const listV = {};
  const tableNames = Object.keys(caskRows);
  const upg3 = carpenter.wikitext.match(/House Upgrade 3[\s\S]*?age specific products \(([^)]*)\)/);
  const normalizeNames = (names) => [...names].sort();
  const agedList = settle('aged items', 'names', [
    { source: `${cask.title} (intro sentence)`, page: cask.title, value: caskIntro ? normalizeNames(linkNames(caskIntro[1])) : undefined },
    { source: `${cask.title} (Aged Values table)`, page: cask.title, value: normalizeNames(tableNames) },
    { source: `${carpenter.title} (House Upgrade 3)`, page: carpenter.title, value: upg3 ? normalizeNames(linkNames(upg3[1])) : undefined },
    { source: `${productivity.title} (intro)`, page: productivity.title, value: normalizeNames(linkNames(productivity.wikitext.match(/productivity of processing ([^\n]*?) in a \[\[Cask\]\]/)?.[1] ?? '')) },
  ], listP, listV);
  const agedItems = {
    items: agedList.map((n) => ({ id: slug(n), name: n })),
    evidence: [
      `${cask.title}: "${plain(caskIntro?.[0] ?? '')}"`,
      `${carpenter.title}: "${plain(upg3?.[0]?.match(/The cellar allows[\s\S]*/)?.[0] ?? '')}"`,
      `${productivity.title}: "${plain(productivity.wikitext.match(/This page lists the productivity of processing[^\n]*/)?.[0] ?? '')}"`,
    ],
    sources: [ref(cask), ref(carpenter, 'House Upgrades'), ref(productivity)],
    verified: listV,
    problems: listP,
    verification_status: status(listP),
  };
  if (!caskIntro || !upg3) failures.push('aged items: evidence sentence not found');
  if (JSON.stringify(agedList) !== JSON.stringify(normalizeNames(ITEMS))) failures.push(`aged items: ${agedList.join(', ')} differs from the item pages fetched (${ITEMS.join(', ')})`);

  /* ---------- general aging statements ---------- */
  const general = [
    fact('wine-seasons', 'Wine takes the longest of any cask item: this many seasons of aging from basic to iridium wine', [
      { p: cask, re: /\[\[Wine\]\] takes the longest, at (\d+) seasons of aging/, anchor: undefined },
      { p: itemPages.Wine, re: /It takes (\d+) seasons of aging to go from basic wine to iridium quality wine\./, anchor: 'Aged Values' },
      { p: artisanGoods, re: /Wine takes the longest: (\d+) seasons of aging to go from basic wine to iridium quality wine\./, anchor: 'Cask' },
    ], { unit: 'seasons', note: 'A season is 28 days, so 2 seasons = 56 days, the wine row\'s total.' }),
    fact('premature-removal', 'Normal, silver and gold quality items can be removed early by striking the cask with an Axe, Hoe or Pickaxe', [
      { p: cask, re: /Normal, silver, and gold quality items can be prematurely removed from a cask at any time by striking the cask with an \[\[Axes\|Axe\]\], \[\[Hoes\|Hoe\]\], or \[\[Pickaxes\|Pickaxe\]\]\./, bool: true },
      ...ITEMS.map((n) => ({ p: itemPages[n], re: /quality [A-Za-z ]+ can be prematurely removed from a cask at any time by striking the cask with an \[\[Axes\|Axe\]\], \[\[Hoes\|Hoe\]\], or \[\[Pickaxes\|Pickaxe\]\]\./, bool: true })),
    ]),
    fact('large-milk-gold-cheese', 'Large Milk / Large Goat Milk make gold quality Cheese / Goat Cheese directly, so such cheese only needs the final aging step', [
      { p: cheesePress, re: /\[\[Large Milk\]\] and \[\[Large Goat Milk\]\] produce gold quality cheeses\./, bool: true },
      { p: itemPages.Cheese, re: /while \[\[Large Milk\]\] will produce gold quality Cheese/, bool: true },
      { p: itemPages['Goat Cheese'], re: /while \[\[Large Goat Milk\]\] will produce gold quality Goat Cheese/, bool: true },
      { p: artisanGoods, re: /Using a \[\[Large Milk\]\] or \[\[Large Goat Milk\]\] will always give gold star quality \[\[Cheese\]\] or \[\[Goat Cheese\]\], respectively\./, bool: true },
    ], { note: plain(productivity.wikitext.match(/Note that although the large milks make gold quality cheeses directly, the final aging step is both 50% of the total value increase and 50% of the required time, so the g\/day remains the same\./)?.[0] ?? '') + ' (Cask Productivity; single page, so this note is not a verified value)' }),
    fact('iridium-not-accepted', 'Iridium quality items can no longer be put into casks (since 1.4)', [
      { p: cask, re: /\{\{History\|1\.4\|Iridium quality items can no longer be put into casks\./, bool: true },
    ]),
    fact('only-in-cellar', 'Casks can be placed anywhere but only accept goods to refine inside the cellar', [
      { p: cask, re: /Casks can be placed anywhere; however, they will only accept goods to refine if they are actually in the \[\[Farmhouse#Upgrades\|cellar\]\]\./, bool: true },
      { p: carpenter, re: /The cellar allows the player to craft and house \[\[Cask\]\]s/, bool: true },
    ], { note: 'The second page says the cellar houses casks; only the Cask page states that casks elsewhere do not work.' }),
    fact('input-quality-ignored', 'The star quality of the ingredient is ignored for most Artisan Goods (aged goods start at normal quality; Large Milk is the exception that makes gold Cheese)', [
      { p: artisanGoods, re: /For most Artisan Goods, the star quality of the ingredients used is ignored\./, bool: true },
    ]),
  ];

  /* ---------- cellar ---------- */
  const caskCount = (id, label, st, extra) => fact(id, label, st, extra);
  const hardwoodForAll = cask.wikitext.match(/This requires (\d+) casks, made of (\d+) \[\[Hardwood\]\] and (\d+) \[\[Wood\]\]/);
  const cellar = [
    caskCount('starting-casks', 'Casks the cellar comes with', [
      { p: cask, re: /The cellar comes with (\d+) casks\./ },
      { p: farmhouse, re: /The cellar comes with (\d+) casks, though/, anchor: 'Upgrades' },
    ]),
    caskCount('max-casks', 'Most casks the cellar can hold (completely filled)', [
      { p: cask, re: /This requires (\d+) casks, made of/ },
      { p: cask, re: /Cellar filled with the maximum (\d+) casks/, anchor: 'Gallery' },
      { p: farmhouse, re: /though it may house as many as (\d+) casks/, anchor: 'Upgrades' },
    ]),
    caskCount('max-casks-reachable-pc', 'Casks that fit while leaving a path to every one (mouse/keyboard, PC)', [
      { p: cask, re: /fill the cellar with (\d+) casks \(on PC\) and still leave paths/ },
      { p: cask, re: /Optimal layout for mouse\/keyboard: (\d+) accessible casks/, anchor: 'Gallery' },
    ]),
    caskCount('max-casks-reachable-mobile', 'Most reachable casks on mobile (corner casks cannot be reached)', [
      { p: cask, re: /so (\d+) is the maximum reachable number of casks/ },
      { p: cask, re: /Optimal layout for mobile: (\d+) accessible casks/, anchor: 'Gallery' },
    ]),
    caskCount('full-cellar-hardwood', 'Hardwood needed to craft the casks for a completely full cellar (189 casks, 33 supplied)', [
      { p: cask, re: /This requires \d+ casks, made of (\d+) \[\[Hardwood\]\] and \d+ \[\[Wood\]\]/, ev: /This requires \d+ casks, made of \d+ \[\[Hardwood\]\] and \d+ \[\[Wood\]\]/ },
    ], { note: hardwoodForAll ? `Consistency (not a second page): ${hardwoodForAll[1]} Hardwood = (189 - 33) casks x 1; ${hardwoodForAll[3]} Wood = (189 - 33) x 20.` : '' }),
    caskCount('full-cellar-wood', 'Wood needed to craft the casks for a completely full cellar', [
      { p: cask, re: /This requires \d+ casks, made of \d+ \[\[Hardwood\]\] and (\d+) \[\[Wood\]\]/, ev: /This requires \d+ casks, made of \d+ \[\[Hardwood\]\] and \d+ \[\[Wood\]\]/ },
    ]),
  ];
  skipped.push({ what: 'Cellar tile count / dimensions', why: 'no wiki page states the cellar\'s size in tiles; only cask counts are given' });

  /* ---------- obtaining the cask ---------- */
  const caskBox = infobox(cask.wikitext);
  const craftRow = crafting.wikitext.match(/\|\[\[Cask\]\]\n\|\{\{Description\|Cask\}\}\n\|([^\n]*)\n\|([^\n]*)/);
  const cp = [];
  const cv = {};
  const recipe = settle('cask recipe', 'ingredients', [
    { source: `${cask.title} (infobox)`, page: cask.title, value: parseIngredients(caskBox.ingredients) },
    { source: `${crafting.title} (Artisan Equipment table)`, page: crafting.title, value: craftRow ? parseIngredients(craftRow[1]) : undefined },
  ], cp, cv);
  const recipeSource = settle('cask recipe', 'recipe_source', [
    { source: `${cask.title} (infobox)`, page: cask.title, value: /final \[\[Farmhouse\]\] upgrade/i.test(caskBox.recipe ?? '') ? 'farmhouse-cellar-upgrade' : undefined },
    { source: `${crafting.title} (Artisan Equipment table)`, page: crafting.title, value: craftRow && /\[\[Farmhouse\]\] cellar upgrade/i.test(craftRow[2]) ? 'farmhouse-cellar-upgrade' : undefined },
    { source: `${carpenter.title} (House Upgrade 3)`, page: carpenter.title, value: upg3 ? 'farmhouse-cellar-upgrade' : undefined },
  ], cp, cv);
  const upgradeCost = fact('cellar-upgrade-cost', 'Gold cost of the third Farmhouse upgrade (adds the cellar)', [
    { p: farmhouse, re: /\|\s*3\s*\n\|\[\[File:House \(tier 3\)\.png\]\]\n\|\[\[File:Cellar Inside\.png\|240px\]\]\n\|data-sort-value="\d+"\|\{\{Price\|(\d+)\}\}/, anchor: 'Upgrades' },
    { p: carpenter, re: /House Upgrade 3[\s\S]*?\n\|\{\{Price\|(\d+)\}\}/, anchor: 'House Upgrades' },
  ], { unit: 'gold', note: 'No materials are listed for this upgrade on either page.' });
  const obtain = {
    recipe_source: recipeSource,
    recipe_ingredients: recipe,
    craft_yield: 1,
    sellable: false,
    cellar_upgrade: upgradeCost,
    upgrade_days: fact('farmhouse-upgrade-days', 'Days Robin needs to finish a Farmhouse upgrade', [
      { p: farmhouse, re: /\[\[Robin\]\] requires (\w+) days to complete each farmhouse upgrade\./, anchor: 'Upgrades' },
      { p: carpenter, re: /Farmhouse upgrades require (\w+) days to complete\./, anchor: 'House Upgrades' },
    ]),
    cellar_description: plain(farmhouse.wikitext.match(/Adds a cellar under the house[^\n|]*/)?.[0] ?? ''),
    evidence: [
      `${cask.title}: "Recipe: ${plain(caskBox.recipe ?? '')}; ingredients: ${plain(caskBox.ingredients ?? '')}; sell price: ${plain(caskBox.sellprice ?? '')}"`,
      `${crafting.title}: "Cask: ${plain(craftRow?.[1] ?? '')} - ${plain(craftRow?.[2] ?? '')}"`,
      `${carpenter.title}: "House Upgrade 3: Adds a cellar under the house, allowing access via the kitchen."`,
    ],
    sources: [ref(cask), ref(crafting, 'Artisan Equipment'), ref(carpenter, 'House Upgrades'), ref(farmhouse, 'Upgrades')],
    verified: cv,
    problems: cp,
    verification_status: status(cp),
  };
  if (!craftRow) failures.push('Crafting: Cask row not found');
  if (!/Cannot be sold/i.test(caskBox.sellprice ?? '')) failures.push('Cask: infobox no longer says the Cask cannot be sold');
  obtain.verification_status = status(cp);

  /* ---------- professions ---------- */
  const professions = [
    fact('artisan-bonus-percent', 'Artisan profession: Artisan Goods (including cask-aged goods) sell for this percent more', [
      { p: skills, re: /Artisan Artisan goods \(wine, cheese, oil, etc\.\) worth (\d+)% more/ },
      { p: artisanGoods, re: /Artisan Goods will be worth (\d+)% more/ },
      { p: farming, re: /Artisan now increases the value of \[\[Artisan Goods\]\] by (\d+)%/, anchor: 'History' },
    ], { unit: 'percent', multiplier: 1.4 }),
    fact('artisan-applies-to-aged', 'Artisan raises the price of all cask-aged products', [
      { p: productivity, re: /Choosing \[\[Skills#Farming\|Artisan\]\] raises the base prices of all cask-aged products by the same percentage/, bool: true },
      { p: itemPages.Mead, re: /only \[\[Cask\|aging\]\] or the \[\[Skills#Farming\|Artisan Profession\]\] can increase it/, bool: true },
      { p: itemPages.Wine, re: /selling price of \{\{Price\|400\}\} \(or \{\{Price\|560\}\} with the \[\[Farming#Farming Skill\|Artisan Profession\]\]\)/, bool: true },
    ]),
    fact('rancher-bonus-percent', 'Rancher profession: animal products sell for this percent more', [
      { p: skills, re: /Rancher Animal products worth (\d+)% more/ },
      { p: farming, re: /Adjusted Rancher bonus to (\d+)%, up from 10%/, anchor: 'History' },
    ], { unit: 'percent', multiplier: 1.2 }),
    fact('rancher-applies-to-aged-cheese', 'Rancher raises the price of cheeses (only), so it raises aged Cheese and Goat Cheese', [
      { p: productivity, re: /Choosing \[\[Skills#Farming\|Rancher\]\], however, will only increase the price of the cheeses/, bool: true },
    ], { note: 'Whether Rancher applies to cheese comes from a single page (Cask Productivity); the Rancher bonus itself is verified separately above.' }),
    fact('wine-without-fruit-price', 'Wine with no base fruit (Traveling Cart, Statue Of Endless Fortune, gifts) sells for this many gold', [
      { p: itemPages.Wine, re: /has a selling price of \{\{Price\|(\d+)\}\} \(or/ },
    ], { unit: 'gold', with_artisan: firstInt(itemPages.Wine.wikitext.match(/\(or \{\{Price\|(\d+)\}\} with the/)?.[0]) ?? null }),
  ];
  skipped.push({ what: 'Tiller profession and cask products', why: 'no cask-related page says Tiller affects Wine or other aged goods; not included' });
  skipped.push({ what: 'Wine sell price per fruit', why: 'wine is 3 × the fruit\'s base sell price (stated by Cask and Wine); per-fruit prices belong to data/crops.json and the Fruits page, not this file' });

  /* ---------- write ---------- */
  const all = [qualityMultipliers, agedItems, ...items, ...general, ...cellar, obtain, upgradeCost, ...professions];
  for (const r of all) if (!r.sources?.length || r.sources.some((s) => !Number.isInteger(s.revid) || !s.url.startsWith('https://stardewvalleywiki.com/'))) failures.push(`bad sources on ${r.id || 'block'}`);
  for (const r of [...items, ...general, ...cellar, ...professions, upgradeCost]) if (!r.evidence?.length || r.evidence.some((e) => /: ""$/.test(e))) failures.push(`missing evidence on ${r.id}`);
  if (failures.length) {
    console.error('Casks import failed:\n  ' + failures.join('\n  '));
    process.exit(1);
  }
  const out = {
    schema: 'stardew-tools/casks@1',
    game_version: GAME_VERSION,
    generated: today,
    last_verified: today,
    source: 'Stardew Valley Wiki (CC BY-NC-SA 3.0), cross-checked between Cask, the item pages (Wine, Pale Ale, Beer, Mead, Cheese, Goat Cheese), Cask Productivity, Farmhouse, Carpenter\'s Shop, Crafting, Artisan Goods, Skills and Farming',
    sources: [cask, productivity, farmhouse, carpenter, crafting, artisanGoods, skills, farming, cheesePress, version, ...ITEMS.map((n) => itemPages[n])].map((p) => ref(p)),
    quality_multipliers: qualityMultipliers,
    aged_items: agedItems,
    aging,
    rules: general,
    cellar: { casks: cellar },
    obtain,
    professions,
    skipped,
  };
  writeFileSync(join(ROOT, 'data', 'casks.json'), JSON.stringify(out, null, 2) + '\n');
  const bad = all.filter((r) => r.problems?.length);
  console.log(`casks.json: ${items.length} aged items, ${general.length} rules, ${cellar.length} cellar facts, ${professions.length} profession facts; ${bad.length} need verification`);
  for (const r of bad) console.log(`  ${r.id || 'block'}: ${r.problems.join('; ')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

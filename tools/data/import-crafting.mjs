#!/usr/bin/env node
// Builds data/crafting.json from the Stardew Valley Wiki: every crafting recipe on the "Crafting"
// page, the Furnace smelting / Recycling Machine conversions that make the bars and Refined Quartz
// those recipes use, and the shop prices of ingredients that a shop sells.
//
// Nothing is typed in by hand. Every recipe's ingredients and yield are read from the Crafting page
// AND from a second page that must agree (the item's own infobox, or the crafting table of the
// item's page or of an ingredient's page). Smelting inputs and times are read from the Furnace
// table AND from each product's infobox. Shop prices are read from the shop page AND from a line on
// the item's own page naming that shop and price. A disagreement goes into the record's
// `problems` (verification_status "needs-verification"); a value with no second source, or a missing
// evidence sentence, fails the import. Files are written only once every check has passed.
//
//   node tools/data/import-crafting.mjs [--cached]
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

// Shops whose permanent stock is scanned for ingredient prices: [page, section(s), shop id, names
// the item pages use for the shop or its keeper]. Rotating/random stock (Traveling Cart, Krobus's
// daily item) and barter shops are left out because their price is not a fixed gold amount.
const SHOPS = [
  ['Blacksmith', ['Stock'], 'blacksmith', ['Blacksmith', 'Clint']],
  ["Carpenter's Shop", ['Permanent Stock'], 'carpenter', ["Carpenter's Shop", 'Robin']],
  ["Pierre's General Store", ['Year-Round Stock'], 'pierre', ["Pierre's General Store", 'Pierre']],
  ['Krobus', ['Fixed Stock'], 'krobus', ['Krobus', 'Sewers']],
  ["Marnie's Ranch", ['Shop Inventory'], 'marnie', ["Marnie's Ranch", 'Marnie']],
  ['Fish Shop', ['Stock'], 'fish-shop', ['Fish Shop', 'Willy']],
  ["Adventurer's Guild", ['Shop'], 'adventurers-guild', ["Adventurer's Guild", 'Marlon']],
  ['JojaMart', ['Permanent Stock'], 'jojamart', ['JojaMart', 'Joja']],
  ['Oasis', ['Fixed Stock'], 'oasis', ['Oasis', 'Sandy']],
  ['Dwarf', ['Shop'], 'dwarf', ['Dwarf']],
];
// Products of the Furnace / Recycling Machine that crafting recipes use. Each one's page must have
// an infobox with the same inputs and time as the Furnace table.
const SMELTED = ['Copper Bar', 'Iron Bar', 'Gold Bar', 'Iridium Bar', 'Radioactive Bar', 'Refined Quartz'];
const RECYCLED = ['Broken CD', 'Broken Glasses'];
// Ingredients that stand for "any item of a group" rather than one item.
const ANY_OF = {
  'wild-seeds-any': { name: 'Wild Seeds (Any)', items: ['spring-seeds', 'summer-seeds', 'fall-seeds', 'winter-seeds'] },
  'any-fish': { name: 'Any Fish', items: null },
};

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
const ref = (p, anchor) => ({ title: p.title, url: anchor ? `${p.url}#${encodeURIComponent(anchor.replace(/ /g, '_'))}` : p.url, revid: p.revid });

/** The wiki text matched by a pattern (group 1 if present), cleaned to plain text. */
function quote(p, re) {
  const m = p.wikitext.match(re);
  if (!m) {
    failures.push(`${p.title}: evidence not found ${re}`);
    return null;
  }
  return plain(m[1] ?? m[0]);
}

/* ------------------------------------------------------------------ parse helpers */

/** [[Target|Label]] -> Label, [[Target]] -> Target. */
export const unlink = (s) => s.replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1');

/** Wiki markup -> plain text (files, prices, Name/NPC templates, refs and tags removed). */
export function plain(s) {
  return unlink(
    String(s)
      .replace(/\[\[File:[^\]]*\]\]/g, '')
      .replace(/\{\{Price\|([\d,]+)\|([A-Za-z]+)\}\}/g, '$1 $2')
      .replace(/\{\{Price\|([\d,]+)\}\}/g, '$1g')
      .replace(/\{\{[Dd]uration\|([^|}]+)[^}]*\}\}/g, '$1')
      .replace(/\{\{NPC\|([^|}]+)\|([^}]*)\}\}/g, '$1 $2')
      .replace(/\{\{Name\|[^}]*\}\}/g, (t) => {
        const n = nameTemplate(t);
        return n.qty != null && !/Skill Icon/.test(n.name) ? `${n.qty} ${n.name}` : n.name.replace(/ Skill Icon$/, '') + (n.extra ? ` ${n.extra}` : '');
      })
      .replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/g, '')
      .replace(/<br\s*\/?>/g, ' ')
      .replace(/<\/?(?:code|span|samp|b|i|small)[^>]*>/g, '')
      .replace(/^\s*class="[^"]*"\s*\|/, ''),
  )
    .replace(/'''?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const num = (s) => Number(String(s).replace(/,/g, ''));

/**
 * One {{Name|...}} template: { name, qty, link, extra }. Named params (size=, class=, link=) are
 * skipped; the first positional is the item, a numeric second positional is the quantity, and a
 * non-numeric one ("Level 8") is kept as `extra`.
 */
export function nameTemplate(t) {
  const parts = t.replace(/^\{\{Name\|/, '').replace(/\}\}$/, '').split('|');
  const pos = parts.filter((x) => !/^\s*[a-z]+\s*=/.test(x)).map((x) => x.trim());
  const link = (parts.find((x) => /^\s*link\s*=/.test(x)) || '').replace(/^\s*link\s*=/, '').trim() || null;
  const second = pos[1];
  const qty = second != null && /^\d[\d,]*$/.test(second) ? num(second) : null;
  return { name: pos[0], qty, link, extra: qty == null ? second ?? null : null };
}

/**
 * An ingredients cell -> [{ name, qty }]. Group ingredients become { name, qty, any: id }:
 * "Wild Seeds (Any) (2)" and "Any [[Fish]] (1)". An alternative recipe introduced by "With ...:"
 * (the Trapper Crab Pot) is returned separately as { condition, ingredients }.
 */
export function parseIngredients(cell) {
  let text = cell || '';
  let alt = null;
  const altM = text.match(/<span[^>]*>\s*With ([\s\S]*?):\s*<\/span>([\s\S]*)$/) || text.match(/\n\s*With ([^:]+):([\s\S]*)$/);
  if (altM) {
    alt = { condition: plain(altM[1]), ingredients: parseIngredients(altM[2]).ingredients };
    text = text.slice(0, altM.index);
  }
  const out = [];
  const re = /\{\{Name\|[^}]*\}\}|Wild Seeds\]?\]?\s*\(Any\)\s*\((\d+)\)|Any \[\[Fish\]\]\s*\((\d+)\)/g;
  for (const m of text.matchAll(re)) {
    if (m[0].startsWith('{{Name')) {
      const n = nameTemplate(m[0]);
      out.push({ name: n.name, qty: n.qty });
    } else if (m[1]) out.push({ name: ANY_OF['wild-seeds-any'].name, qty: num(m[1]), any: 'wild-seeds-any' });
    else out.push({ name: ANY_OF['any-fish'].name, qty: num(m[2]), any: 'any-fish' });
  }
  return { ingredients: out, alt };
}

/** Text of a "==Heading==" (any level) section up to the next heading of the same or higher level. */
export function section(wikitext, heading) {
  const re = new RegExp(`^(=+)\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\1\\s*$`, 'm');
  const m = wikitext.match(re);
  if (!m) return null;
  const level = m[1].length;
  const rest = wikitext.slice(m.index + m[0].length);
  const next = rest.search(new RegExp(`^={1,${level}}[^=]`, 'm'));
  return next < 0 ? rest : rest.slice(0, next);
}

const ATTR = /^\s*(?:[a-z-]+\s*=\s*"[^"]*"\s*)+\|(?!\|)/i;
const stripAttr = (s) => s.replace(ATTR, '').trim();

/**
 * Every wikitable in a text as { headers, rows }. headers: the first header row with colspan
 * expanded (so they line up with data cells); rows: arrays of raw cell wikitext. A "||" at the start
 * of a line (an empty first separator) and "||" between cells on one line are both handled.
 */
export function wikiTables(text) {
  const tables = [];
  let i = 0;
  while ((i = text.indexOf('{|', i)) >= 0) {
    const end = text.indexOf('\n|}', i);
    const body = text.slice(i, end < 0 ? undefined : end);
    i = end < 0 ? text.length : end + 3;
    const headers = [];
    const rows = [];
    let row = null;
    let headerDone = false;
    for (const line of body.split('\n').slice(1)) {
      if (/^\|-/.test(line)) {
        if (headers.length) headerDone = true;
        row = null;
      } else if (line.startsWith('!')) {
        if (headerDone) continue;
        for (const h of line.slice(1).split('!!')) {
          const span = h.match(/colspan\s*=\s*"?(\d+)/);
          for (let k = 0; k < (span ? +span[1] : 1); k++) headers.push(plain(stripAttr(h)));
        }
      } else if (line.startsWith('|') && !line.startsWith('|}')) {
        if (!row) {
          row = [];
          rows.push(row);
        }
        for (const c of line.replace(/^\|\|?/, '').split('||')) row.push(stripAttr(c));
      } else if (row && row.length) {
        row[row.length - 1] += '\n' + line;
      }
    }
    tables.push({ headers, rows: rows.filter((r) => r.length) });
  }
  return tables;
}

/** Name cell of a recipe row -> { name, page, recipe_name, yield }. */
export function parseNameCell(cell, imageCell = '') {
  const c = plain(cell) ? cell : '';
  const link = c.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
  const count = c.match(/\]\]\s*\((\d+)\)\s*$/);
  const before = c.replace(/<br\s*\/?>[\s\S]*$/, '');
  if (link && /^\s*\[\[/.test(before)) {
    // "[[Item]] (5)" or "[[Bait (item)|Bait]] (5)"; "[[Iron Bar|Transmute (Fe)]]" on item pages.
    const label = (link[2] || link[1]).trim();
    const transmute = /^Transmute/.test(label);
    return { name: transmute ? label : label, page: link[1].trim(), recipe_name: label, yield: count ? num(count[1]) : null, output_page: link[1].trim() };
  }
  // "Wild Seeds (Sp)<br />([[Spring Seeds]])" or "Transmute (Fe)" with the item in the image cell.
  const label = plain(before);
  if (link) return { name: link[1].trim(), page: link[1].trim(), recipe_name: label, yield: null, output_page: link[1].trim() };
  const img = imageCell.match(/\[\[File:([^\]|]+)\.png/);
  return { name: label, page: img ? img[1].trim() : null, recipe_name: label, yield: null, output_page: img ? img[1].trim() : null };
}

/** "(Note: ... The recipe produces 10 seeds per craft.)" in a description cell -> 10. */
export const noteYield = (cell) => {
  const m = (cell || '').match(/produces (\d+) [a-z ]+ per craft/i);
  return m ? num(m[1]) : null;
};

/** All recipe rows of the Crafting page (cooking is on another page). */
export function parseCraftingPage(wikitext) {
  const out = [];
  const stop = wikitext.search(/^==\s*Achievements\s*==/m);
  const body = stop < 0 ? wikitext : wikitext.slice(0, stop);
  const heads = [...body.matchAll(/^==([^=].*?)==\s*$/gm)];
  heads.forEach((h, k) => {
    const category = h[1].trim();
    const text = body.slice(h.index, k + 1 < heads.length ? heads[k + 1].index : undefined);
    for (const t of wikiTables(text)) {
      const col = (re) => t.headers.findIndex((x) => re.test(x));
      const ni = col(/^Name$/);
      const ii = col(/^Ingredients$/);
      const si = col(/^Recipe Source$/);
      const di = col(/^Description$/);
      if (ni < 0 || ii < 0 || si < 0) continue;
      for (const r of t.rows) {
        if (r.length !== t.headers.length) {
          failures.push(`Crafting#${category}: row has ${r.length} cells, header has ${t.headers.length}: ${r[ni] || r[0]}`);
          continue;
        }
        const n = parseNameCell(r[ni], r[0]);
        const ing = parseIngredients(r[ii]);
        out.push({
          category,
          ...n,
          yield: n.yield ?? noteYield(di >= 0 ? r[di] : '') ?? null,
          ingredients: ing.ingredients,
          alt: ing.alt,
          obtained: plain(r[si]),
        });
      }
    }
  });
  return out;
}

/** Template parameters of the page's first infobox. */
export function infobox(wikitext) {
  // "{{Infobox ...", or "{{{{{1|Infobox cooking}}}" (a template-parameter wrapper used by food pages).
  const m = wikitext.match(/\{\{(?:\{\{\{1\|)?Infobox/);
  if (!m) return {};
  const start = m.index;
  let depth = 0;
  let end = start;
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
  for (const m of wikitext.slice(start, end).matchAll(/^\|\s*([a-z0-9_]+)\s*=\s*(.*)$/gm)) out[m[1]] = m[2].trim();
  return out;
}

/**
 * Infobox "produces" as a per-craft count: "10 Iron Fences per craft" -> 10, "One Mini-Obelisk per
 * craft" -> 1, "{{Name|Tea Sapling|1}}" (the item itself) -> 1. A machine's daily output
 * ("{{Name|Deluxe Bait|4-5 daily}}", "[[Targeted Bait]] (5-10)") is not a craft yield -> null.
 */
export function producesCount(s, itemName) {
  if (!s) return null;
  let m = s.match(/^\s*(\d+|One)\s[^{}]*per craft\s*$/i);
  if (m) return /^one$/i.test(m[1]) ? 1 : num(m[1]);
  m = s.match(/^\s*\{\{Name\|([^|}]+)\|(\d+)\}\}\s*$/);
  if (m && m[1].trim() === itemName) return num(m[2]);
  return null;
}

/** Furnace "Time to smelt" / infobox crafttime -> minutes: "90m (1h 30m)", "1.5h", "30m", "2h". */
export function minutes(s) {
  const t = plain(s || '').replace(/[≤~]/g, '');
  let m = t.match(/^(\d+(?:\.\d+)?)\s*m\b/);
  if (m) return Math.round(+m[1]);
  m = t.match(/^(\d+(?:\.\d+)?)\s*h\b(?:\s*(\d+)\s*m)?/);
  if (m) return Math.round(+m[1] * 60 + (m[2] ? +m[2] : 0));
  return null;
}

/** Furnace smelting table -> [{ inputs:[{name,qty}], output:{name,qty}, minutes }]. Coal is added by the caller. */
export function parseFurnace(wikitext) {
  const t = wikiTables(section(wikitext, 'Smelting') || '').find((x) => x.headers.includes('Input'));
  if (!t) return [];
  const ii = t.headers.indexOf('Input');
  const oi = t.headers.indexOf('Output');
  const ti = t.headers.findIndex((h) => /^Time/.test(h));
  return t.rows.map((r) => ({ inputs: parseIngredients(r[ii]).ingredients, output: parseIngredients(r[oi]).ingredients[0], minutes: minutes(r[ti]) }));
}

/** Smelting infobox "ingredients" may hold alternatives: "{{Name|Quartz|1}}{{Name|Coal|1}}or{{Name|Fire Quartz|1}}..." */
export const ingredientAlternatives = (s) => (s || '').split(/\bor\b/).map((x) => parseIngredients(x).ingredients);

/** Recycling Machine table -> [{ input, output:{name,qty} }] for rows with a single fixed output. */
export function parseRecycling(wikitext) {
  const out = [];
  for (const t of wikiTables(section(wikitext, 'Recycling') || '')) {
    const ni = t.headers.indexOf('Name');
    const pi = t.headers.findIndex((h) => /^Produced/.test(h));
    for (const r of t.rows) {
      if (r.length !== t.headers.length) continue; // rowspan continuation rows (random outputs)
      const o = parseIngredients(r[pi]).ingredients;
      if (o.length === 1 && !/%/.test(r[pi])) out.push({ input: plain(r[ni]), output: o[0] });
    }
  }
  return out;
}

/**
 * Shop stock rows -> [{ name, price, price_year2 }]. The name comes from the Name column (recipe
 * rows "(Recipe)" are skipped); the price from the "Price"/"Unit Price"/"Buy Price"/"Year 1 Price"
 * column, gold only. "Year 1: {{Price|10}}<br />Year 2+: {{Price|50}}" and a separate "Year 2+"
 * column both give price_year2.
 */
export function parseShop(text) {
  const out = [];
  for (const t of wikiTables(text || '')) {
    const ni = t.headers.indexOf('Name');
    const pi = t.headers.findIndex((h) => /^(?:Unit |Buy )?Price\b|^Year 1/.test(h));
    const yi = t.headers.findIndex((h) => /^Year 2/.test(h));
    if (ni < 0 || pi < 0) continue;
    for (const r of t.rows) {
      if (r.length !== t.headers.length || /\(Recipe\)/.test(r[ni])) continue;
      const link = r[ni].match(/\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/);
      const name = link ? (link[2] && /\(/.test(link[1]) ? link[2] : link[1]) : (r[ni].match(/\{\{Name\|([^|}]+)/) || [])[1];
      const pageTitle = link ? link[1] : name;
      const gold = [...r[pi].matchAll(/\{\{Price\|([\d,]+)\}\}/g)].map((m) => num(m[1]));
      if (!name || !gold.length) continue;
      const y2 = yi >= 0 ? (r[yi].match(/\{\{Price\|([\d,]+)\}\}/) || [])[1] : /Year 2/.test(r[pi]) ? gold[1] : null;
      out.push({ name: name.trim(), page: pageTitle.trim(), price: gold[0], price_year2: y2 != null ? num(y2) : null });
    }
  }
  return out;
}

/**
 * A line on an item's own page that names the shop (or its keeper) and the price: "Can be bought at
 * the [[Blacksmith]] for {{Price|75}} each". Returns the line in plain text or null.
 */
export function shopLine(wikitext, aliases, price) {
  const p = new RegExp(`\\{\\{Price\\|0*${price}\\}\\}|\\b${price}g\\b`);
  for (const line of wikitext.split('\n')) {
    if (/^\{\{History/.test(line) || /^\|/.test(line)) continue;
    if (p.test(line) && aliases.some((a) => line.includes(a))) return plain(line).replace(/^\*\s*/, '');
  }
  return null;
}

const sameIngredients = (a, b) => {
  const key = (l) => l.map((x) => `${slug(x.name)}x${x.qty}`).sort().join(',');
  return key(a) === key(b);
};
const fmt = (l) => l.map((x) => `${x.name} x${x.qty}`).join(', ');

/* ------------------------------------------------------------------ main */

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const crafting = await page('Crafting');
  const furnacePage = await page('Furnace');
  const recyclingPage = await page('Recycling Machine');

  const rows = parseCraftingPage(crafting.wikitext);
  if (rows.length < 100) failures.push(`Crafting: only ${rows.length} recipe rows parsed`);

  /* ---------- Recipes ---------- */
  const pageCache = new Map();
  const get = async (t) => {
    if (!pageCache.has(t)) pageCache.set(t, await page(t));
    return pageCache.get(t);
  };
  const recipes = [];
  for (const r of rows) {
    const problems = [];
    if (!r.page) {
      failures.push(`Crafting: no item page for "${r.recipe_name}"`);
      continue;
    }
    for (const i of r.ingredients) if (i.qty == null) failures.push(`Crafting: ${r.name}: no quantity for ${i.name}`);
    if (!r.ingredients.length) failures.push(`Crafting: ${r.name}: no ingredients`);
    const item = await get(r.page);
    const box = infobox(item.wikitext);
    // Second source for the ingredients: the item's infobox, else a crafting table row with the
    // same recipe name on the item's page or on an ingredient's page.
    let second = null;
    if (box.ingredients && !/Transmute/.test(r.recipe_name)) {
      second = { page: item, ingredients: parseIngredients(box.ingredients).ingredients, yield: producesCount(box.produces, r.name), alt: box.tingredients ? parseIngredients(box.tingredients).ingredients : null, how: 'infobox' };
    } else {
      for (const t of [r.page, ...r.ingredients.map((i) => i.name)]) {
        const p = await get(t);
        for (const tab of wikiTables(p.wikitext)) {
          const ni = tab.headers.indexOf('Name');
          const ii = tab.headers.indexOf('Ingredients');
          if (ni < 0 || ii < 0) continue;
          const row = tab.rows.find((x) => x.length === tab.headers.length && parseNameCell(x[ni], x[0]).recipe_name === r.recipe_name);
          if (row) {
            second = { page: p, ingredients: parseIngredients(row[ii]).ingredients, yield: parseNameCell(row[ni]).yield, how: 'crafting table' };
            break;
          }
        }
        if (second) break;
      }
    }
    if (!second) {
      failures.push(`${r.name}: no second source for the ingredients`);
      continue;
    }
    const verified = {};
    if (sameIngredients(r.ingredients, second.ingredients)) verified.ingredients = [crafting.title, second.page.title];
    else problems.push(`ingredients: Crafting says ${fmt(r.ingredients)}; ${second.page.title} ${second.how} says ${fmt(second.ingredients)}`);
    // Yield: an explicit count on either page must match the other page; no count anywhere = 1.
    const y1 = r.yield ?? 1;
    const y2 = second.yield ?? 1;
    if (y1 === y2) verified.yield = [crafting.title, second.page.title];
    else problems.push(`yield: Crafting says ${y1}; ${second.page.title} says ${y2}`);
    let alt = null;
    if (r.alt || second.alt) {
      if (r.alt && second.alt && sameIngredients(r.alt.ingredients, second.alt)) verified.alt_ingredients = [crafting.title, second.page.title];
      else problems.push(`alternative recipe: Crafting says ${r.alt ? fmt(r.alt.ingredients) : 'none'}; ${second.page.title} says ${second.alt ? fmt(second.alt) : 'none'}`);
      alt = r.alt ? { condition: r.alt.condition, ingredients: r.alt.ingredients } : null;
    }
    const outputName = /^Transmute/.test(r.recipe_name) ? r.output_page : r.name;
    const evidence = box.ingredients && second.how === 'infobox'
      ? `${second.page.title} infobox: ${fmt(second.ingredients)}${second.yield != null ? `; produces ${plain(box.produces)}` : ''}`
      : `${second.page.title} crafting table: ${r.recipe_name} = ${fmt(second.ingredients)}`;
    recipes.push({
      id: slug(r.recipe_name === r.name ? r.name : /^Transmute/.test(r.recipe_name) ? r.recipe_name : r.name),
      name: r.name,
      recipe_name: r.recipe_name !== r.name ? r.recipe_name : undefined,
      output: slug(outputName),
      category: r.category,
      yield: y1,
      ingredients: r.ingredients.map((i) => ({ id: i.any || slug(i.name), name: i.name, qty: i.qty })),
      alt_ingredients: alt ? { condition: alt.condition, ingredients: alt.ingredients.map((i) => ({ id: slug(i.name), name: i.name, qty: i.qty })) } : undefined,
      obtained: r.obtained,
      evidence,
      sources: [ref(crafting, r.category), ref(second.page)],
      verified,
      problems,
      verification_status: problems.length ? 'needs-verification' : 'cross-checked',
    });
  }
  const dup = recipes.map((r) => r.id).filter((id, k, a) => a.indexOf(id) !== k);
  if (dup.length) failures.push(`duplicate recipe ids: ${dup.join(', ')}`);

  /* ---------- Smelting (Furnace) and recycling ---------- */
  const furnace = parseFurnace(furnacePage.wikitext);
  const coalRule = quote(furnacePage, /(One unit of Coal is required for each smelting operation, regardless of the material or duration\.)/);
  const conversions = [];
  for (const name of SMELTED) {
    const p = await get(name);
    const box = infobox(p.wikitext);
    const alts = ingredientAlternatives(box.ingredients);
    const rowsFor = furnace.filter((f) => f.output && f.output.name === name);
    if (!rowsFor.length) failures.push(`Furnace: no smelting row for ${name}`);
    for (const f of rowsFor) {
      const problems = [];
      const verified = {};
      const inputs = [...f.inputs, { name: 'Coal', qty: 1 }];
      const match = alts.find((a) => a.length && a[0].name === f.inputs[0].name);
      if (!match) failures.push(`${name}: infobox has no recipe from ${f.inputs[0].name}`);
      else if (sameIngredients(inputs, match)) verified.inputs = [furnacePage.title, p.title];
      else problems.push(`inputs: Furnace says ${fmt(inputs)}; ${p.title} infobox says ${fmt(match)}`);
      const boxMin = minutes(box.crafttime);
      if (f.minutes == null || boxMin == null) failures.push(`${name}: smelting time missing (Furnace ${f.minutes}, infobox ${boxMin})`);
      else if (f.minutes === boxMin) verified.minutes = [furnacePage.title, p.title];
      else problems.push(`minutes: Furnace says ${f.minutes}; ${p.title} infobox says ${boxMin}`);
      // Output count: the Furnace table and a sentence on the product page.
      const n = f.output.qty;
      const sentence = n === 1
        ? quote(p, new RegExp(`(\\b(?:is (?:created|crafted)(?: primarily)?|Can be created) by smelting \\d+ (?:\\[\\[${f.inputs[0].name}\\]\\]|\\{\\{Name\\|${f.inputs[0].name}[^}]*\\}\\})[^.]*\\.)`, 'i'))
        : quote(p, new RegExp(`(1 \\[\\[${f.inputs[0].name}\\]\\][^.]*produces? ${n} ${name}[^.]*\\.)`, 'i'));
      if (sentence && n !== 1 && !sentence.includes(`${n} ${name}`)) problems.push(`yield: Furnace says ${n}; ${p.title} says otherwise`);
      if (sentence) verified.yield = [furnacePage.title, p.title];
      const said = sentence && sentence.match(/smelting (\d+) /);
      if (said && +said[1] !== f.inputs[0].qty) problems.push(`input count: Furnace says ${f.inputs[0].qty}; ${p.title} text says ${said[1]}`);
      const primary = f.inputs[0].name === name.replace(' Bar', ' Ore') || (name === 'Refined Quartz' && f.inputs[0].name === 'Quartz');
      conversions.push({
        id: `smelt-${slug(f.inputs[0].name)}`,
        output: slug(name),
        name,
        machine: 'furnace',
        default: primary,
        inputs: inputs.map((i) => ({ id: slug(i.name), name: i.name, qty: i.qty })),
        yield: n,
        minutes: f.minutes,
        evidence: sentence,
        sources: [ref(furnacePage, 'Smelting'), ref(p)],
        verified,
        problems,
        verification_status: problems.length ? 'needs-verification' : 'cross-checked',
      });
    }
  }
  const recycling = parseRecycling(recyclingPage.wikitext);
  const recycleMinutes = minutes((recyclingPage.wikitext.match(/takes \{\{duration\|([^|}]+)/) || [])[1]);
  for (const name of RECYCLED) {
    const p = await get(name);
    const row = recycling.find((x) => x.input === name);
    if (!row) {
      failures.push(`Recycling Machine: no row for ${name}`);
      continue;
    }
    const problems = [];
    const verified = {};
    const sentence = quote(p, /([^.\n]*\[\[Recycling Machine(?:\|[^\]]*)?\]\][^.\n]*\.)/);
    const qm = sentence && sentence.match(new RegExp(`(\\d+|one) ${row.output.name}|${row.output.name}`, 'i'));
    if (qm) verified.output = [recyclingPage.title, p.title];
    else problems.push(`output: Recycling Machine says ${row.output.qty} ${row.output.name}; ${p.title} does not mention it`);
    if (recycleMinutes == null) failures.push('Recycling Machine: processing time not found');
    conversions.push({
      id: `recycle-${slug(name)}`,
      output: slug(row.output.name),
      name: row.output.name,
      machine: 'recycling-machine',
      default: false,
      inputs: [{ id: slug(name), name, qty: 1 }],
      yield: row.output.qty,
      minutes: recycleMinutes,
      evidence: sentence,
      sources: [ref(recyclingPage, 'Recycling'), ref(p)],
      verified,
      problems,
      verification_status: problems.length ? 'needs-verification' : 'cross-checked',
    });
  }
  for (const c of conversions) if (!c.evidence) failures.push(`${c.id}: no evidence sentence`);
  for (const r of recipes) if (!r.evidence) failures.push(`${r.id}: no evidence`);

  /* ---------- Raw vs. made ---------- */
  // An ingredient is "made" (raw: false) when this file has a way to make it: the default Furnace
  // conversion, or a crafting recipe for it. `via` names the recipe/conversion the engine expands.
  const makers = new Map();
  for (const c of conversions) if (c.default) makers.set(c.output, c.id);
  for (const r of recipes) if (!makers.has(r.output) && !/^transmute/.test(r.id)) makers.set(r.output, r.id);
  const mark = (i) => {
    if (ANY_OF[i.id]) return { ...i, raw: true, any_of: ANY_OF[i.id].items ?? undefined };
    const via = makers.get(i.id);
    return via ? { ...i, raw: false, via } : { ...i, raw: true };
  };
  for (const r of recipes) {
    r.ingredients = r.ingredients.map(mark);
    if (r.alt_ingredients) r.alt_ingredients.ingredients = r.alt_ingredients.ingredients.map(mark);
  }
  for (const c of conversions) c.inputs = c.inputs.map(mark);

  /* ---------- Shop prices ---------- */
  const wanted = new Map();
  for (const r of [...recipes.flatMap((x) => [...x.ingredients, ...(x.alt_ingredients ? x.alt_ingredients.ingredients : [])]), ...conversions.flatMap((c) => c.inputs)]) {
    if (!r.any_of && !ANY_OF[r.id]) wanted.set(r.id, r.name);
  }
  const shopPrices = [];
  const shopsOut = [];
  for (const [title, sections, id, aliases] of SHOPS) {
    const p = await get(title);
    const stock = sections.flatMap((s) => {
      const t = section(p.wikitext, s);
      if (!t) failures.push(`${title}: section "${s}" not found`);
      return parseShop(t);
    });
    if (!stock.length) failures.push(`${title}: no stock rows parsed`);
    shopsOut.push({ id, name: title, sources: [ref(p, sections[0])] });
    for (const s of stock) {
      const iid = slug(s.name);
      if (!wanted.has(iid)) continue;
      const item = await get(s.page);
      const problems = [];
      const verified = {};
      const line = shopLine(item.wikitext, aliases, s.price);
      if (line) verified.price = [p.title, item.title];
      else problems.push(`price: ${title} lists ${s.price}g; ${item.title} has no line naming ${aliases[0]} at that price`);
      let line2 = null;
      if (s.price_year2 != null) {
        line2 = shopLine(item.wikitext, aliases, s.price_year2);
        if (line2) verified.price_year2 = [p.title, item.title];
        else problems.push(`price_year2: ${title} lists ${s.price_year2}g; ${item.title} has no line naming ${aliases[0]} at that price`);
      }
      shopPrices.push({
        id: iid,
        name: wanted.get(iid),
        shop: id,
        price: s.price,
        price_year2: s.price_year2 ?? undefined,
        evidence: line || null,
        sources: [ref(p, sections[0]), ref(item)],
        verified,
        problems,
        verification_status: problems.length ? 'needs-verification' : 'cross-checked',
      });
    }
  }

  /* ---------- Write ---------- */
  const allSources = new Map();
  for (const r of [...recipes, ...conversions, ...shopPrices]) for (const s of r.sources) allSources.set(s.title, { title: s.title, url: s.url.replace(/#.*$/, ''), revid: s.revid });
  for (const s of [...allSources.values()]) {
    if (!/^https:\/\/stardewvalleywiki\.com\//.test(s.url) || !Number.isInteger(s.revid)) failures.push(`bad source ${JSON.stringify(s)}`);
  }
  const out = {
    schema: 'stardew-tools/crafting@1',
    game_version: GAME_VERSION,
    generated: today,
    last_verified: today,
    source: 'Stardew Valley Wiki (CC BY-NC-SA 3.0): Crafting page cross-checked with each item page; Furnace and Recycling Machine tables cross-checked with each product page; shop stock tables cross-checked with each item page',
    sources: [...allSources.values()].sort((a, b) => a.title.localeCompare(b.title)),
    notes: {
      coal: coalRule,
      raw: 'raw: false means the ingredient can be made from other items; `via` is the recipe or conversion id to expand it with. Coal, ores, wood, stone, hardwood, Battery Pack, Pine Tar etc. are raw (gathered or produced by a non-recipe machine).',
      any_of: 'Ingredients with any_of accept any one of the listed items (Wild Seeds) or any fish; they are not expanded.',
      yield: 'yield is the number of items one craft produces; when neither the Crafting page nor the item page states a count, it is 1.',
    },
    any_of: Object.fromEntries(Object.entries(ANY_OF).map(([k, v]) => [k, { name: v.name, items: v.items }])),
    shops: shopsOut,
    recipes,
    conversions,
    shop_prices: shopPrices.sort((a, b) => a.id.localeCompare(b.id) || a.shop.localeCompare(b.shop)),
  };
  if (failures.length) {
    console.error('Crafting import failed:\n  ' + failures.join('\n  '));
    process.exit(1);
  }
  writeFileSync(join(ROOT, 'data', 'crafting.json'), JSON.stringify(out, null, 2) + '\n');
  const bad = [...recipes, ...conversions, ...shopPrices].filter((r) => r.problems.length);
  console.log(`${recipes.length} recipes, ${conversions.length} conversions, ${shopPrices.length} shop prices written; ${bad.length} need verification`);
  for (const r of bad) console.log(`  ${r.id}${r.shop ? ` @${r.shop}` : ''}: ${r.problems.join('; ')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

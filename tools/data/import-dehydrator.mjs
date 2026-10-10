#!/usr/bin/env node
// Builds data/dehydrator.json from the Stardew Valley Wiki: the two 1.6 artisan machines that the
// Keg / Preserves Jar data does not cover.
//
//   Dehydrator   5 mushrooms -> Dried Mushrooms, 5 fruit -> Dried Fruit, 5 Grapes -> Raisins
//   Fish Smoker  1 fish + 1 Coal -> Smoked Fish
//
// Nothing is typed in by hand. Every value is read from the wiki and must be stated by at least
// TWO sources that agree: the machine page, the product's own page, a page that lists the same
// thing (Crafting, Artisan Goods, shop pages, Fruits, Prize Ticket ...), or a formula the wiki gives
// applied to a number another page gives (e.g. Dehydrator price x the Artisan +40% rule). A value
// that fewer than two sources state, or that sources disagree about, is still written but the record
// is marked "needs-verification" with the reason in `problems`. A wiki sentence that cannot be found
// at all (the page changed shape) fails the import; files are written only when every parse passed.
//
// Sources: Dehydrator, Fish Smoker, Dried Mushrooms, Dried Fruit, Raisins, Smoked Fish, Crafting,
// Artisan Goods, Pierre's General Store, Fish Shop, Coal, The Cave, Farm Maps, Prize Ticket,
// Farming (+ Farming/Skill), Fruits (wikitext and rendered table), Grape.
//
//   node tools/data/import-dehydrator.mjs [--cached]
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchPage, fetchRendered, sleep } from './wiki.mjs';
import { slug } from './parse-crops.mjs';
import { plain, infobox, tableRows, num } from './import-skills.mjs';

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

const round3 = (x) => Math.round(x * 1000) / 1000;
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
export const wordNum = (s) => WORDS[String(s).toLowerCase()] ?? num(s);

/** Wiki markup -> plain text for single table cells (also &times; and {{Price|n}} as a bare number). */
export const cell = (s) => plain(String(s ?? '').replace(/\{\{Price\|([\d,]+)\}\}/gi, '$1').replace(/&#8776;/g, '≈').replace(/&times;/g, '×')).replace(/^\|\s*/, '').replace(/^data-sort-value="[^"]*"\|/, '').trim();

/** "{{Name|Wood|30}}{{Name|Clay|2}}" -> [{name:'Wood', id:'wood', qty:30}, ...]. qty defaults to 1. */
export function parseNames(s) {
  return [...String(s).matchAll(/\{\{Name\|([^|}]+)(?:\|(\d+))?[^}]*\}\}/g)].map((m) => ({ id: slug(m[1].trim()), name: m[1].trim(), qty: m[2] ? +m[2] : 1 }));
}

const SHOP_NAMES = { "Pierre's": "Pierre's General Store", Pierre: "Pierre's General Store" };
/**
 * Where a recipe is sold, from the Crafting-style cell: "[[Pierre's]] for {{Price|10000}}",
 * "{{Price|10000}} at the [[Fish Shop]]" or "[[Fish Shop]] for {{Price|10000}}" -> {shop, price}.
 */
export function parseRecipeSource(s) {
  const price = String(s).match(/\{\{Price\|([\d,]+)\}\}/);
  const shop = String(s).match(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/);
  if (!price || !shop) return undefined;
  const name = shop[1].trim();
  return { shop: SHOP_NAMES[name] || name, price: num(price[1]) };
}

/** The row of a Crafting / Artisan Goods style table: `|[[Name]]`, `|{{Description|Name}}`, ingredients, source. */
export function craftRow(wikitext, name) {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = wikitext.match(new RegExp(`\\|\\[\\[${esc}\\]\\]\\n\\|\\{\\{Description\\|${esc}\\}\\}\\n\\|([^\\n]*)\\n\\|([^\\n]*)`));
  return m ? { ingredients: parseNames(m[1]), source: parseRecipeSource(m[2]) } : undefined;
}

/** Price shown on a shop page for "[[Name]] (Recipe)": the first {{Price|n}} after the row label. */
export function shopRecipePrice(wikitext, name) {
  const i = wikitext.indexOf(`[[${name}]] (Recipe)`);
  if (i < 0) return undefined;
  const m = wikitext.slice(i, i + 400).match(/\{\{Price\|([\d,]+)\}\}/);
  return m ? num(m[1]) : undefined;
}

/** Which Prize Machine ticket count a Prize Ticket page row lists an item at. */
export function prizeNumber(wikitext, item) {
  let current;
  for (const line of wikitext.split('\n')) {
    const n = line.match(/^\|(?:rowspan="\d+"\|)?(\d+)\s*$/);
    if (n) current = +n[1];
    if (new RegExp(`^\\|\\{\\{Name\\|${item}\\|`).test(line)) return current;
  }
  return undefined;
}

/** Cells of the products table between two <section> markers: [{name, ingredients, time, price, energy, cells}]. */
export function parseProductsTable(wikitext, section) {
  const start = wikitext.indexOf(`<section begin="${section}"`);
  const end = wikitext.indexOf(`<section end="${section}"`);
  if (start < 0 || end < 0) return [];
  const out = [];
  for (const row of tableRows(wikitext.slice(start, end))) {
    const raw = row.map((c) => c.replace(/^\|\s*/, '').replace(/^data-sort-value="[^"]*"\|/, '').trim());
    const name = raw[1]?.match(/^\[\[([^\]|]+)\]\]$/);
    if (!name || raw.length < 6) continue;
    out.push({ name: name[1], ingredients: raw[3], time: raw[4], price: raw[5], energy: raw[6] || '' });
  }
  return out;
}

/** "{{Duration|1 day|class=inline}} (ready the next morning)" / "{{duration|50 mins}}" -> {minutes?, days?, next_morning}. */
export function parseDuration(s) {
  const t = String(s);
  const mins = t.match(/\{\{[Dd]uration\|(\d+) mins?/);
  const days = t.match(/\{\{[Dd]uration\|(\d+) days?/);
  return { minutes: mins ? +mins[1] : undefined, days: days ? +days[1] : undefined, next_morning: /ready the next morning/i.test(t) };
}

/** Infobox crafttime "1750m (&#8776;1d)" / "50m" -> minutes. */
export const parseCraftTime = (s) => {
  const m = String(s ?? '').match(/^\s*(\d+)\s*m\b/);
  return m ? +m[1] : undefined;
};

/**
 * A price rule: "7.5 x Fruit Base Price + {{Price|25}} (...)" -> {multiplier:7.5, add:25};
 * "(7.5 × mushroom Base Price) + 25" likewise; "{{Price|600}}" or "600" -> {fixed:600};
 * "2 × Fish Price" -> {multiplier:2, add:0}.
 */
export function parsePriceRule(s) {
  const t = cell(s).replace(/\(\s*\d+(?:\.\d+)?\s*[×x][^)]*per [^)]*\)\s*$/i, '').trim();
  let m = t.match(/^\(?(\d+(?:\.\d+)?)\s*[×x]\s*[^+]*?\)?\s*\+\s*(\d+)g?\b/);
  if (m) return { multiplier: +m[1], add: +m[2] };
  m = t.match(/^(\d+(?:\.\d+)?)\s*[×x]\s*[^+]*$/);
  if (m) return { multiplier: +m[1], add: 0 };
  m = t.match(/^([\d,]+)g?$/);
  if (m) return { fixed: num(m[1]) };
  return undefined;
}

/**
 * A "(a x Base Price + b) per item used" rule scaled to a whole batch of `count` items.
 * Matches "(1.5 x Fruit Base Price + 5) per fruit used" and "((1.5x mushroom Base Price) + 5) per mushroom used".
 */
export function perItemRule(text, count) {
  const m = plain(text).match(/\(+(\d+(?:\.\d+)?)\s*x\s*[^+()]*?\)?\s*\+\s*(\d+)\)+ per \w+ used/);
  return m ? { multiplier: round3(+m[1] * count), add: +m[2] * count } : undefined;
}

/** "the sell price changes to ((10.5 x mushroom Base Price) + 35) total" -> {multiplier, add}. */
export function totalArtisanRule(text) {
  const m = plain(text).match(/the sell price changes to \(+(\d+(?:\.\d+)?) ?x [^+()]*?\)? ?\+ ?(\d+)\)+ total/);
  return m ? { multiplier: +m[1], add: +m[2] } : undefined;
}

/** The Artisan bonus as a multiplier from "worth 40% more" / "by 40%" / "(+40%)". */
export function artisanBonus(text, re) {
  const m = String(text).match(re);
  return m ? round3(1 + +m[1] / 100) : undefined;
}

/** Applies a price rule to a base price (the game truncates). */
export function applyPrice(rule, base) {
  return rule.fixed != null ? rule.fixed : Math.trunc(round3(rule.multiplier * base + rule.add));
}

/** Artisan version of a rule: the whole sell price x multiplier (fixed prices too). */
export function artisanRule(rule, bonus) {
  return rule.fixed != null ? { fixed: Math.trunc(round3(rule.fixed * bonus)) } : { multiplier: round3(rule.multiplier * bonus), add: round3(rule.add * bonus) };
}

/**
 * Rows of the rendered Fruits table: [{name, base, dried, artisan_dried}]. Every fruit row carries 20 prices
 * (Base 4, Tiller 4, Wine/Jelly/Dried 6, Artisan Wine/Jelly/Dried 6); the Dried Fruit (Raisins for Grape)
 * prices are the 14th and 20th.
 */
export function parseFruitRows(html) {
  const clean = html.replace(/<style[\s\S]*?<\/style>/g, '');
  const names = [...clean.matchAll(/<\/a><\/div><\/div>\s*<\/td>\s*<td><a href="\/[^"]+" title="([^"]+)">\1<\/a>\s*<\/td>/g)];
  const rows = [];
  names.forEach((m, i) => {
    const seg = clean.slice(m.index + m[0].length, names[i + 1]?.index ?? clean.length);
    const text = seg.replace(/<[^>]+>/g, ' ').replace(/&#160;/g, ' ');
    const prices = [...text.matchAll(/(?<![\w,])(\d[\d,]*)g\b/g)].map((x) => num(x[1]));
    if (prices.length === 20) rows.push({ name: m[1], base: prices[0], dried: prices[13], artisan_dried: prices[19] });
  });
  return rows;
}

/**
 * Settles one value from several sources: the first defined value is taken; fewer than two stating
 * sources, or a source that disagrees, goes to problems (the record is then needs-verification).
 */
export function settle(field, sources, problems, verified) {
  const stated = sources.filter((s) => s.value !== undefined && s.value !== null);
  if (!stated.length) {
    problems.push(`${field}: no source states it`);
    return null;
  }
  const value = stated[0].value;
  const agree = stated.filter((s) => JSON.stringify(s.value) === JSON.stringify(value));
  for (const s of stated) if (JSON.stringify(s.value) !== JSON.stringify(value)) problems.push(`${field}: ${stated[0].source} says ${JSON.stringify(value)}, ${s.source} says ${JSON.stringify(s.value)}`);
  if (agree.length < 2) problems.push(`${field}: only ${agree.length} source (${agree.map((s) => s.source).join(', ')}) states ${JSON.stringify(value)}, need 2`);
  verified[field] = agree.map((s) => s.source);
  return value;
}

export const status = (problems) => (problems.length ? 'needs-verification' : 'cross-checked');

/* ------------------------------------------------------------------ import helpers */

/** Wiki sentence matched by `re` (group 1 if present) as "Page: "text"". A missing sentence fails the import. */
function ev(p, re) {
  const m = p.wikitext.match(re);
  if (!m) {
    failures.push(`${p.title}: evidence not found ${re}`);
    return null;
  }
  return `${p.title}: "${plain(m[1] ?? m[0]).replace(/^[*\s]+/, '')}"`;
}

/** A statement read from a page: value from `f(match)` (default true), evidence is the matched text. */
const stmt = (p, re, f = () => true) => {
  const m = p.wikitext.match(re);
  return { source: p.title, value: m ? f(m) : undefined, evidence: m ? `${p.title}: "${plain(m[0]).replace(/^[*\s]+/, '')}"` : undefined, p };
};
/** A statement computed from other pages' values. */
const calc = (source, value) => ({ source, value, evidence: undefined });

/** Settles a field from statements and collects their evidence. */
function field(rec, name, stmts) {
  const v = settle(name, stmts, rec.problems, rec.verified);
  for (const s of stmts) if (s.evidence && s.value !== undefined && !rec.evidence.includes(s.evidence)) rec.evidence.push(s.evidence);
  for (const s of stmts) if (s.p && !rec.sources.some((x) => x.title === s.p.title)) rec.sources.push(ref(s.p));
  return v;
}
const newRec = (extra) => ({ ...extra, evidence: [], sources: [], verified: {}, problems: [] });
const finish = (rec) => Object.assign(rec, { verification_status: status(rec.problems) });

/* ------------------------------------------------------------------ import */

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const deh = await page('Dehydrator');
  const smoker = await page('Fish Smoker');
  const dm = await page('Dried Mushrooms');
  const df = await page('Dried Fruit');
  const raisins = await page('Raisins');
  const sf = await page('Smoked Fish');
  const crafting = await page('Crafting');
  const goods = await page('Artisan Goods');
  const pierre = await page("Pierre's General Store");
  const fishShop = await page('Fish Shop');
  const cave = await page('The Cave');
  const farmMaps = await page('Farm Maps');
  const prize = await page('Prize Ticket');
  const farming = await page('Farming');
  const farmingSkill = await page('Farming/Skill');
  const fruits = await page('Fruits');
  const fruitsHtml = await rendered('Fruits');
  const coal = await page('Coal');
  const skipped = [];

  /* ---------- Artisan profession ---------- */
  const artisan = newRec({ id: 'artisan-profession', note: 'Artisan makes Artisan Goods sell for this multiple of the normal price. Dehydrator and Fish Smoker products are Artisan Goods.' });
  artisan.multiplier = field(artisan, 'multiplier', [
    stmt(farmingSkill, /\[\[Artisan Goods\|Artisan goods\]\] \(wine, cheese, oil, etc\.\) worth (\d+)% more/, (m) => round3(1 + +m[1] / 100)),
    stmt(farming, /Artisan now increases the value of \[\[Artisan Goods\]\] by (\d+)%/, (m) => round3(1 + +m[1] / 100)),
    stmt(fruits, /\[\[Skills#Farming\|Artisan\]\] \(\+(\d+)%\)/, (m) => round3(1 + +m[1] / 100)),
  ]);
  finish(artisan);
  const BONUS = artisan.multiplier;

  /* ---------- Dehydrator ---------- */
  const dehRows = parseProductsTable(deh.wikitext, 'dehydratorproducts');
  const dehRow = (n) => dehRows.find((r) => r.name === n);
  for (const n of ['Dried Mushrooms', 'Dried Fruit', 'Raisins']) if (!dehRow(n)) failures.push(`Dehydrator: product row ${n} not found`);
  const dehBox = infobox(deh.wikitext);
  const dehDuration = parseDuration(dehRow('Dried Mushrooms')?.time);

  // Recipe and unlock
  const dehRecipe = newRec({ id: 'dehydrator-recipe' });
  const dehCraft = craftRow(crafting.wikitext, 'Dehydrator');
  const dehGoods = craftRow(goods.wikitext, 'Dehydrator');
  const dehIngr = field(dehRecipe, 'ingredients', [
    { source: `${deh.title} (infobox)`, value: parseNames(dehBox.ingredients), evidence: ev(deh, /\|ingredients = ([^\n]*)/), p: deh },
    { source: `${crafting.title} (Artisan Equipment)`, value: dehCraft?.ingredients, evidence: ev(crafting, /\|\[\[Dehydrator\]\]\n\|\{\{Description\|Dehydrator\}\}\n\|[^\n]*/), p: crafting },
    { source: `${goods.title} (Dehydrator)`, value: dehGoods?.ingredients, evidence: ev(goods, /\|\[\[Dehydrator\]\]\n\|\{\{Description\|Dehydrator\}\}\n\|[^\n]*/), p: goods },
  ]);
  const dehUnlock = field(dehRecipe, 'unlock', [
    { source: `${deh.title} (infobox)`, value: parseRecipeSource(dehBox.recipe), evidence: ev(deh, /\|recipe += [^\n]*/), p: deh },
    { source: `${crafting.title} (Artisan Equipment)`, value: dehCraft?.source, p: crafting },
    { source: `${pierre.title} (stock)`, value: shopRecipePrice(pierre.wikitext, 'Dehydrator') != null ? { shop: pierre.title, price: shopRecipePrice(pierre.wikitext, 'Dehydrator') } : undefined, evidence: ev(pierre, /\[\[Dehydrator\]\] \(Recipe\)[\s\S]{0,160}?\{\{Price\|10000\}\}/), p: pierre },
  ]);
  const dehPrize = field(dehRecipe, 'prize_machine_ticket', [
    stmt(deh, /as the (\d+)th prize from the \[\[Mayor's Manor#Prize Machine\|Prize Machine\]\]/, (m) => +m[1]),
    { source: prize.title, value: prizeNumber(prize.wikitext, 'Dehydrator'), evidence: ev(prize, /\|rowspan="2"\|12\n\|\{\{Name\|Fish Smoker\|1\}\}[\s\S]*?\n\|\{\{Name\|Dehydrator\|1\}\}/), p: prize },
  ]);
  const dehCave = field(dehRecipe, 'free_with_mushroom_cave', [
    stmt(deh, /One is included in the \[\[The Cave\|Farm Cave\]\] if the player chooses the mushroom option/),
    stmt(cave, /The mushroom cave comes with a free \[\[Dehydrator\]\]/),
  ]);
  Object.assign(dehRecipe, { ingredients: dehIngr, unlock: dehUnlock, other_sources: [{ kind: 'prize-machine', ticket_prize: dehPrize, note: 'Prize Ticket page: "Reward chosen at random" between Fish Smoker and Dehydrator; Dehydrator page: 50% chance.' }, { kind: 'farm-cave-mushroom-option', free: dehCave }] });
  finish(dehRecipe);

  // Machine-level rules
  const dehRules = [];
  const rule = (list, id, text, value, stmts) => {
    const r = newRec({ id, text });
    r.value = field(r, 'value', stmts) ?? value;
    list.push(finish(r));
    return r;
  };
  rule(dehRules, 'input-count', 'Every Dehydrator batch takes five items.', 5, [
    stmt(deh, /Dehydrator requires (five) \[\[:Category:Mushrooms\|Mushrooms\]\]/, (m) => wordNum(m[1])),
    stmt(dm, /(\d+) mushrooms of the same quality are required to produce 1 bag/, (m) => +m[1]),
    stmt(df, /Since the Dehydrator requires (\d+) fruit per use/, (m) => +m[1]),
    stmt(fruits, /Note that '''(five)''' matching Fruits are required/, (m) => wordNum(m[1])),
  ]);
  rule(dehRules, 'same-type-and-quality', 'The five items must be of the same type and the same quality.', true, [
    stmt(deh, /of the same '''type''' and '''quality'''/),
    stmt(dm, /5 mushrooms of the same quality are required/),
    stmt(fruits, /'''five''' matching Fruits are required/),
  ]);
  rule(dehRules, 'output-quality-normal', 'Dehydrator products are always normal quality, whatever the input quality.', 'normal', [
    stmt(deh, /The quality of the dried product is always normal and '''not''' affected by the quality of items used\./, () => 'normal'),
    stmt(df, /Dried Fruit is always normal quality\./, () => 'normal'),
    stmt(raisins, /Raisins are always normal quality\./, () => 'normal'),
  ]);
  rule(dehRules, 'excluded-mushroom', 'Red Mushroom cannot be dehydrated.', 'red-mushroom', [
    stmt(deh, /\(except \[\[Red Mushroom\]\]\)/, () => 'red-mushroom'),
    stmt(dm, /\(except for \[\[Red Mushroom\]\]\)/, () => 'red-mushroom'),
  ]);
  rule(dehRules, 'excluded-truffle', 'Truffles are not classified as mushrooms and cannot be dehydrated.', 'truffle', [
    stmt(deh, /\[\[Truffle\]\]s are not classified as \[\[:Category:Mushrooms\|mushrooms\]\] and therefore cannot be placed into the Dehydrator\./, () => 'truffle'),
    stmt(dm, /\[\[Truffle\]\]s are not classified as \[\[:Category:Mushrooms\|mushrooms\]\] and therefore cannot be placed into the Dehydrator\./, () => 'truffle'),
  ]);
  rule(dehRules, 'grapes-make-raisins', 'Grapes are not valid for Dried Fruit; five Grapes make Raisins.', 'grape', [
    stmt(deh, /5 of Any \[\[Fruits\|Fruit\]\] \(except \[\[Grape\]\]s\)/, () => 'grape'),
    stmt(df, /Any \[\[Fruits\|Fruit\]\] except \[\[Grape\]\]s \(5\)/, () => 'grape'),
    stmt(fruits, /five Grapes to make Raisins/, () => 'grape'),
  ]);

  // Products
  const makeFruitLike = async (def) => {
    const row = dehRow(def.rowName);
    const box = infobox(def.p.wikitext);
    const rec = newRec({ id: def.id, name: def.name });
    rec.sources.push(ref(deh), ref(def.p));
    // input
    const count = field(rec, 'input_count', [
      { source: `${deh.title} (table)`, value: row ? +row.ingredients.match(/^\s*(?:\[\[[^\]]*\]\]\s*)?(\d+)/)?.[1] || undefined : undefined, evidence: row ? `${deh.title}: "${cell(row.ingredients)}"` : undefined, p: deh },
      def.count,
    ]);
    rec.input = def.input(count);
    // minutes
    const times = [
      { source: `${dm.title} (infobox)`, value: parseCraftTime(infobox(dm.wikitext).crafttime), evidence: ev(dm, /\|crafttime += [^\n]*/), p: dm },
      { source: `${df.title} (infobox)`, value: parseCraftTime(infobox(df.wikitext).crafttime), evidence: ev(df, /\|crafttime += [^\n]*/), p: df },
      { source: `${raisins.title} (infobox)`, value: parseCraftTime(infobox(raisins.wikitext).crafttime), evidence: ev(raisins, /\|crafttime += [^\n]*/), p: raisins },
    ];
    rec.minutes = field(rec, 'minutes', times);
    rec.ready_next_morning = field(rec, 'ready_next_morning', [
      { source: `${deh.title} (table)`, value: dehDuration.next_morning ? true : undefined, evidence: row ? `${deh.title}: "${cell(row.time)}"` : undefined, p: deh },
      stmt(def.p, /taking one in-game day/),
    ]);
    // The Dehydrator page states 1 day / ready next morning; the product pages give 1750 minutes. The wiki does not reconcile them.
    if (rec.minutes != null && dehDuration.days === 1 && dehDuration.next_morning) {
      rec.problems.push(`minutes: ${deh.title} says "1 day (ready the next morning)" while the product pages say ${rec.minutes} minutes (≈1d on Dried Mushrooms/Dried Fruit, ≈29h on Raisins); the wiki does not say how a run started at a given time maps to "ready the next morning"`);
    }
    return { rec, row, box };
  };

  const inputObj = (extra) => (count) => ({ count, ...extra });

  // Dried Mushrooms
  const dmProd = await makeFruitLike({
    name: 'Dried Mushrooms', id: 'dried-mushrooms', p: dm, rowName: 'Dried Mushrooms',
    count: stmt(dm, /(\d+) mushrooms of the same quality are required to produce 1 bag/, (m) => +m[1]),
    input: inputObj({ category: 'mushroom', excludes: ['red-mushroom', 'truffle'], same_quality: true }),
  });
  {
    const { rec, row } = dmProd;
    const base = field(rec, 'price', [
      { source: `${deh.title} (table)`, value: parsePriceRule(row.price), evidence: `${deh.title}: "${cell(row.price)}"`, p: deh },
      { source: `${dm.title} (infobox)`, value: parsePriceRule(infobox(dm.wikitext).sellprice), evidence: ev(dm, /\|sellprice += [^\n]*/), p: dm },
      { source: `${dm.title} (per mushroom ×5)`, value: perItemRule(dm.wikitext, rec.input.count), evidence: ev(dm, /\(\(7\.5 x mushroom Base Price\) \+ 25\) total, or \(\(1\.5x mushroom Base Price\) \+ 5\) per mushroom used/), p: dm },
    ]);
    rec.price = base;
    rec.artisan_price = field(rec, 'artisan_price', [
      { source: `${dm.title} (Artisan profession text)`, value: totalArtisanRule(dm.wikitext), evidence: ev(dm, /When the player has the \[\[Farming#Farming Skill\|Artisan profession\]\], the sell price changes to [^\n]*? per mushroom used\./), p: dm },
      calc(`${deh.title} price × ${farmingSkill.title} Artisan ${BONUS}`, base && BONUS ? artisanRule(base, BONUS) : undefined),
    ]);
    rec.artisan = true;
    rec.energy_health_multiplier = field(rec, 'energy_health_multiplier', [
      { source: `${deh.title} (table)`, value: +cell(row.energy).match(/^(\d+) ×/)?.[1] || undefined, evidence: `${deh.title}: "${cell(row.energy)}"`, p: deh },
      stmt(dm, /Dried Mushrooms is (\d+) times the base mushroom Energy\/Health restoration/, (m) => +m[1]),
    ]);
    rec.examples = [];
    rec.examples_note = 'The wiki gives no worked Dried Mushrooms price; only the formula (7.5 × base + 25) and the gold-quality remark are stated.';
  }

  // Dried Fruit
  const dfProd = await makeFruitLike({
    name: 'Dried Fruit', id: 'dried-fruit', p: df, rowName: 'Dried Fruit',
    count: stmt(df, /Since the Dehydrator requires (\d+) fruit per use/, (m) => +m[1]),
    input: inputObj({ category: 'fruit', excludes: ['grape'], same_quality: true }),
  });
  {
    const { rec, row } = dfProd;
    const base = field(rec, 'price', [
      { source: `${deh.title} (table)`, value: parsePriceRule(row.price), evidence: `${deh.title}: "${cell(row.price)}"`, p: deh },
      { source: `${df.title} (infobox)`, value: parsePriceRule(infobox(df.wikitext).sellprice), evidence: ev(df, /\|sellprice += [^\n]*/), p: df },
      { source: `${df.title} (per fruit ×5)`, value: perItemRule(df.wikitext.replace(/\(2\.1 x[^)]*\)[^.]*\./, ''), rec.input.count), evidence: ev(df, /the sell price of Dried Fruit is \(1\.5 x Fruit Base Price \+ 5\) per fruit used/), p: df },
    ]);
    rec.price = base;
    const artisanPerItem = df.wikitext.match(/With the \[\[Farming#Farming Skill\|Artisan Profession\]\], the sell price is \((\d+(?:\.\d+)?) x Fruit Base Price \+ (\d+)\) per fruit used/);
    rec.artisan_price = field(rec, 'artisan_price', [
      { source: `${df.title} (Artisan text, per fruit ×5)`, value: artisanPerItem ? { multiplier: round3(+artisanPerItem[1] * rec.input.count), add: +artisanPerItem[2] * rec.input.count } : undefined, evidence: ev(df, /With the \[\[Farming#Farming Skill\|Artisan Profession\]\], the sell price is \(2\.1 x Fruit Base Price \+ 7\) per fruit used\./), p: df },
      calc(`${deh.title} price × ${farmingSkill.title} Artisan ${BONUS}`, base && BONUS ? artisanRule(base, BONUS) : undefined),
    ]);
    rec.artisan = true;
    rec.energy_health_multiplier = field(rec, 'energy_health_multiplier', [
      { source: `${deh.title} (table)`, value: +cell(row.energy).match(/^(\d+) ×/)?.[1] || undefined, evidence: `${deh.title}: "${cell(row.energy)}"`, p: deh },
      stmt(df, /Health\]\] restored from Dried Fruit is (\d+) times the base/, (m) => +m[1]),
    ]);
  }

  // Raisins
  const rsProd = await makeFruitLike({
    name: 'Raisins', id: 'raisins', p: raisins, rowName: 'Raisins',
    count: stmt(raisins, /made from placing (five) \[\[Grape\]\]s inside a \[\[Dehydrator\]\]/, (m) => wordNum(m[1])),
    input: inputObj({ item: 'grape', same_quality: true }),
  });
  {
    const { rec, row } = rsProd;
    const raisinsBox = infobox(raisins.wikitext);
    const grapeIngredient = parseNames(raisinsBox.ingredients)[0];
    rec.price = field(rec, 'price', [
      { source: `${deh.title} (table)`, value: parsePriceRule(row.price), evidence: `${deh.title}: "${cell(row.price)}"`, p: deh },
      { source: `${raisins.title} (infobox)`, value: parsePriceRule(raisinsBox.sellprice), evidence: ev(raisins, /\|sellprice += [^\n]*/), p: raisins },
    ]);
    const grapeRow = parseFruitRows(fruitsHtml.html).find((r) => r.name === 'Grape');
    rec.artisan_price = field(rec, 'artisan_price', [
      { source: `${fruits.title} (rendered Grape row, Artisan column)`, value: grapeRow ? { fixed: grapeRow.artisan_dried } : undefined, evidence: grapeRow ? `${fruits.title}: Grape / Raisins sells ${grapeRow.dried}g, ${grapeRow.artisan_dried}g with Artisan` : undefined, p: fruits },
      calc(`${raisins.title} price × ${farmingSkill.title} Artisan ${BONUS}`, rec.price && BONUS ? artisanRule(rec.price, BONUS) : undefined),
    ]);
    rec.artisan = true;
    rec.input_check = field(rec, 'input_item', [
      { source: `${raisins.title} (infobox)`, value: grapeIngredient ? { id: grapeIngredient.id, qty: grapeIngredient.qty } : undefined, evidence: ev(raisins, /\|ingredients += [^\n]*/), p: raisins },
      { source: `${deh.title} (table)`, value: /5 \[\[Grape\]\]s/.test(row.ingredients) ? { id: 'grape', qty: 5 } : undefined, evidence: `${deh.title}: "${cell(row.ingredients)}"`, p: deh },
    ]);
    skipped.push({ what: 'Raisins energy 125 / health 56', why: 'stated only in the Dehydrator products table (the Raisins page gives edibility 50 only); left out of the verified fields' });
    rec.examples = [];
  }

  // Fruit price check against every row of the rendered Fruits table
  const fruitRows = parseFruitRows(fruitsHtml.html);
  const fruitCheck = newRec({ id: 'fruit-table-check' });
  fruitCheck.sources.push(ref(fruits), ref(deh));
  const fruitExamples = [];
  fruitCheck.rounding_differences = [];
  fruitCheck.rounding = 'Artisan price = truncate(truncate(normal price) × 1.4); the closed form 10.5 × base + 35 can be 1g higher (see rounding_differences).';
  for (const r of fruitRows) {
    const grape = r.name === 'Grape';
    const expected = grape ? rsProd.rec.price : dfProd.rec.price;
    const expectedArtisan = grape ? rsProd.rec.artisan_price : dfProd.rec.artisan_price;
    if (applyPrice(expected, r.base) !== r.dried) fruitCheck.problems.push(`${r.name}: Fruits table says ${r.dried}g, formula gives ${applyPrice(expected, r.base)}g`);
    // The game truncates the dried price first, then applies the Artisan multiplier and truncates again.
    const viaDried = Math.trunc(round3(applyPrice(expected, r.base) * BONUS));
    if (viaDried !== r.artisan_dried) fruitCheck.problems.push(`${r.name}: Fruits table Artisan ${r.artisan_dried}g, truncate(truncate(dried) × ${BONUS}) gives ${viaDried}g`);
    if (applyPrice(expectedArtisan, r.base) !== r.artisan_dried) fruitCheck.rounding_differences.push({ fruit: r.name, table: r.artisan_dried, exact_formula: applyPrice(expectedArtisan, r.base) });
    fruitExamples.push({ fruit: r.name, product: grape ? 'raisins' : 'dried-fruit', base_price: r.base, price: r.dried, artisan_price: r.artisan_dried });
  }
  if (fruitRows.length < 20) failures.push(`Fruits: only ${fruitRows.length} fruit rows parsed from the rendered table`);
  fruitCheck.rows = fruitRows.length;
  fruitCheck.evidence.push(ev(fruits, /Below is a list of '''Fruits''' from the game[^\n]*/), `${fruits.title}: rendered table, ${fruitRows.length} fruits, dried/Raisins price at normal quality without and with the Artisan profession`);
  finish(fruitCheck);
  const pick = (n) => fruitExamples.find((x) => x.fruit === n);
  dfProd.rec.examples = ['Apple', 'Rhubarb', 'Ancient Fruit', 'Coconut'].map((n) => ({ ...pick(n), source: ref(fruits) })).filter((x) => x.fruit);
  rsProd.rec.examples = [{ ...pick('Grape'), source: ref(fruits) }];
  skipped.push({ what: 'Dried Mushrooms worked prices', why: 'the wiki gives no mushroom price table or example; formula only (the Category:Mushrooms page is empty)' });
  skipped.push({ what: 'Dehydrator: prize-machine 50% chance', why: 'stated on the Dehydrator and Fish Smoker pages only; Prize Ticket just says "Reward chosen at random" between the two' });

  const dehydrator = finish(newRec({
    id: 'dehydrator',
    name: 'Dehydrator',
    category: 'Artisan Equipment',
    recipe: finish(dehRecipe),
    rules: dehRules,
    products: [dmProd, dfProd, rsProd].map((x) => finish(x.rec)),
  }));
  dehydrator.sources = [ref(deh), ref(dm), ref(df), ref(raisins), ref(crafting, 'Artisan Equipment'), ref(goods, 'Dehydrator'), ref(pierre)];
  delete dehydrator.evidence;
  delete dehydrator.verified;

  /* ---------- Fish Smoker ---------- */
  const smRows = parseProductsTable(smoker.wikitext, 'fishsmokerproducts');
  const smRow = smRows.find((r) => r.name === 'Smoked Fish');
  if (!smRow) failures.push('Fish Smoker: Smoked Fish row not found');
  const smBox = infobox(smoker.wikitext);
  const sfBox = infobox(sf.wikitext);

  const smRecipe = newRec({ id: 'fish-smoker-recipe' });
  const smCraft = craftRow(crafting.wikitext, 'Fish Smoker');
  const smGoods = craftRow(goods.wikitext, 'Fish Smoker');
  smRecipe.ingredients = field(smRecipe, 'ingredients', [
    { source: `${smoker.title} (infobox)`, value: parseNames(smBox.ingredients), evidence: ev(smoker, /\|ingredients = [^\n]*/), p: smoker },
    { source: `${crafting.title} (Artisan Equipment)`, value: smCraft?.ingredients, evidence: ev(crafting, /\|\[\[Fish Smoker\]\]\n\|\{\{Description\|Fish Smoker\}\}\n\|[^\n]*/), p: crafting },
    { source: `${goods.title} (Fish Smoker)`, value: smGoods?.ingredients, evidence: ev(goods, /\|\[\[Fish Smoker\]\]\n\|\{\{Description\|Fish Smoker\}\}\n\|[^\n]*/), p: goods },
  ]);
  const fsPrice = shopRecipePrice(fishShop.wikitext, 'Fish Smoker');
  smRecipe.unlock = field(smRecipe, 'unlock', [
    { source: `${smoker.title} (infobox)`, value: parseRecipeSource(smBox.recipe), evidence: ev(smoker, /\|recipe += [^\n]*/), p: smoker },
    { source: `${crafting.title} (Artisan Equipment)`, value: smCraft?.source, p: crafting },
    { source: `${goods.title} (Fish Smoker)`, value: parseRecipeSource(goods.wikitext.match(/\[\[Fish Smoker\]\]\n\|\{\{Description\|Fish Smoker\}\}\n\|[^\n]*\n\|([^\n]*)/)?.[1]), p: goods },
    { source: `${fishShop.title} (stock)`, value: fsPrice != null ? { shop: fishShop.title, price: fsPrice } : undefined, evidence: ev(fishShop, /\[\[Fish Smoker\]\] \(Recipe\)[\s\S]{0,160}?\{\{Price\|10000\}\}/), p: fishShop },
  ]);
  smRecipe.other_sources = [
    { kind: 'prize-machine', ticket_prize: field(smRecipe, 'prize_machine_ticket', [stmt(smoker, /as the (\d+)th prize from the \[\[Mayor's Manor#Prize Machine\|Prize Machine\]\]/, (m) => +m[1]), { source: prize.title, value: prizeNumber(prize.wikitext, 'Fish Smoker'), evidence: ev(prize, /\|rowspan="2"\|12\n\|\{\{Name\|Fish Smoker\|1\}\}/), p: prize }]) },
    { kind: 'riverland-farm-start', free: field(smRecipe, 'free_on_riverland_farm', [stmt(smoker, /Players on the \[\[Farm Maps#Riverland\|Riverland Farm\]\] start with one Fish Smoker/), stmt(farmMaps, /\* Players start with a \[\[Fish Smoker\]\]/)]) },
  ];
  finish(smRecipe);

  const smRules = [];
  rule(smRules, 'input-any-fish', 'Any fish is accepted, including Legendary Fish and Crab Pot fish.', true, [
    stmt(smoker, /The smoker accepts \[\[Fish#Legendary Fish\|Legendary Fish\]\] as well as \[\[Crab Pot\]\] specific fish/),
    stmt(sf, /The smoker accepts \[\[Fish#Legendary Fish\|Legendary Fish\]\] as well as \[\[Crab Pot\]\] specific fish/),
  ]);
  rule(smRules, 'output-quality-retained', 'Smoked Fish keeps the quality of the fish used (unlike most Artisan Goods).', 'same-as-input', [
    stmt(smoker, /while retaining quality/, () => 'same-as-input'),
    stmt(sf, /while retaining quality/, () => 'same-as-input'),
    stmt(goods, /produce a Smoked Fish of the same quality as the original fish/, () => 'same-as-input'),
  ]);
  rule(smRules, 'crab-pot-fish-edible', 'Smoked Crab Pot fish that is normally inedible becomes edible (edibility = sell price × 0.3).', 0.3, [
    stmt(smoker, /calculated as <samp>Sell Price × 0\.3<\/samp>/, () => 0.3),
    stmt(sf, /calculated as <samp>Sell Price × 0\.3<\/samp>/, () => 0.3),
  ]);

  const smProd = newRec({ id: 'smoked-fish', name: 'Smoked Fish' });
  smProd.sources.push(ref(smoker), ref(sf));
  const coalQty = field(smProd, 'coal', [
    stmt(smoker, /using any \[\[fish\]\] and (\d+) \[\[coal\]\]/, (m) => +m[1]),
    stmt(sf, /using any \[\[fish\]\] and (\d+) \[\[coal\]\]/, (m) => +m[1]),
    { source: `${smoker.title} (table)`, value: parseNames(smRow?.ingredients).find((n) => n.id === 'coal')?.qty, evidence: smRow ? `${smoker.title}: "${cell(smRow.ingredients)}"` : undefined, p: smoker },
    { source: `${sf.title} (infobox)`, value: parseNames(sfBox.ingredients).find((n) => n.id === 'coal')?.qty, evidence: ev(sf, /\|ingredients += [^\n]*/), p: sf },
    stmt(coal, /smoking fish in a \[\[Fish Smoker\]\]/, () => 1),
  ]);
  const fishQty = field(smProd, 'fish_count', [
    { source: `${smoker.title} (table)`, value: smRow?.ingredients.match(/Any \[\[Fish\]\] \((\d+)\)/)?.[1] ? +smRow.ingredients.match(/Any \[\[Fish\]\] \((\d+)\)/)[1] : undefined, evidence: smRow ? `${smoker.title}: "${cell(smRow.ingredients)}"` : undefined, p: smoker },
    { source: `${sf.title} (infobox)`, value: sfBox.ingredients?.match(/Any \[\[Fish\]\] \((\d+)\)/)?.[1] ? +sfBox.ingredients.match(/Any \[\[Fish\]\] \((\d+)\)/)[1] : undefined, p: sf },
    stmt(smoker, /create \[\[Smoked Fish\|smoked fish\]\] using any \[\[fish\]\] and 1/, () => 1),
  ]);
  smProd.input = { category: 'fish', count: fishQty, extra: [{ id: 'coal', qty: coalQty }], includes: ['legendary-fish', 'crab-pot-fish'] };
  smProd.minutes = field(smProd, 'minutes', [
    { source: `${smoker.title} (table)`, value: parseDuration(smRow?.time).minutes, evidence: smRow ? `${smoker.title}: "${cell(smRow.time)}"` : undefined, p: smoker },
    { source: `${sf.title} (infobox)`, value: parseCraftTime(sfBox.crafttime), evidence: ev(sf, /\|crafttime += [^\n]*/), p: sf },
    stmt(sf, /taking (\d+) minutes/, (m) => +m[1]),
  ]);
  smProd.price = field(smProd, 'price', [
    { source: `${smoker.title} (table)`, value: parsePriceRule(smRow?.price), evidence: smRow ? `${smoker.title}: "${cell(smRow.price)}"` : undefined, p: smoker },
    { source: `${sf.title} (infobox)`, value: parsePriceRule(sfBox.sellprice), evidence: ev(sf, /\|sellprice += [^\n]*/), p: sf },
    stmt(smoker, /It doubles the sell price of a fish/, () => ({ multiplier: 2, add: 0 })),
    stmt(sf, /the Smoked Fish will always sell for (\d+) times as much as the original fish/, (m) => ({ multiplier: +m[1], add: 0 })),
  ]);
  smProd.artisan_price = field(smProd, 'artisan_price', [
    stmt(sf, /If the player has the Artisan profession, the Smoked Fish will always sell for (\d+(?:\.\d+)?) times as much as the original fish/, (m) => ({ multiplier: +m[1], add: 0 })),
    calc(`${smoker.title} price × ${farmingSkill.title} Artisan ${BONUS}`, smProd.price && BONUS ? artisanRule(smProd.price, BONUS) : undefined),
  ]);
  smProd.artisan = true;
  smProd.energy_health_multiplier = field(smProd, 'energy_health_multiplier', [
    { source: `${smoker.title} (table)`, value: +cell(smRow?.energy).match(/(\d+(?:\.\d+)?) × Fish Energy/)?.[1] || undefined, evidence: smRow ? `${smoker.title}: "${cell(smRow.energy)}"` : undefined, p: smoker },
    stmt(smoker, /multiplying the \[\[energy\]\] and \[\[health\]\] restoration by (\d+(?:\.\d+)?)/, (m) => +m[1]),
    stmt(sf, /multiplying the \[\[energy\]\] and \[\[health\]\] restoration by (\d+(?:\.\d+)?)/, (m) => +m[1]),
  ]);
  smProd.price_note = 'Price multiplier applies to the fish price the wiki calls "Fish Sell Price (includes Quality & Artisan prices)"; the Smoked Fish page says the Artisan total is 2.8× the original fish price.';
  smProd.examples = [
    { case: 'no Artisan profession', multiplier: 2, evidence: ev(sf, /Thus, if the player does not have the Artisan profession, the Smoked Fish will always sell for 2 times as much as the original fish\./) },
    { case: 'Artisan profession', multiplier: 2.8, evidence: ev(sf, /If the player has the Artisan profession, the Smoked Fish will always sell for 2\.8 times as much as the original fish\./) },
  ];
  skipped.push({ what: 'Smoked Fish and the Fisher/Angler professions', why: 'the Smoked Fish page says smoked fish benefit from Fisher and Angler; no second page states it, and the exact stacking order with Artisan is not given' });
  finish(smProd);

  const fishSmoker = finish(newRec({
    id: 'fish-smoker',
    name: 'Fish Smoker',
    category: 'Artisan Equipment',
    recipe: smRecipe,
    rules: smRules,
    products: [smProd],
  }));
  fishSmoker.sources = [ref(smoker), ref(sf), ref(crafting, 'Artisan Equipment'), ref(goods, 'Fish Smoker'), ref(fishShop), ref(coal)];
  delete fishSmoker.evidence;
  delete fishSmoker.verified;

  /* ---------- Write ---------- */
  const flat = [artisan, dehRecipe, ...dehRules, ...dehydrator.products, fruitCheck, smRecipe, ...smRules, smProd];
  for (const r of flat) if (!r.sources?.length || r.sources.some((s) => !Number.isInteger(s.revid) || !s.url.startsWith('https://stardewvalleywiki.com/'))) failures.push(`bad sources on ${r.id}`);
  for (const r of [...dehydrator.products, smProd]) {
    for (const k of ['minutes', 'price', 'artisan_price']) if (r[k] == null) failures.push(`${r.id}: ${k} missing`);
    if (!r.evidence.length) failures.push(`${r.id}: no evidence`);
  }
  if (failures.length) {
    console.error('Dehydrator import failed:\n  ' + failures.join('\n  '));
    process.exit(1);
  }
  const out = {
    schema: 'stardew-tools/dehydrator@1',
    game_version: GAME_VERSION,
    generated: today,
    last_verified: today,
    source: 'Stardew Valley Wiki (CC BY-NC-SA 3.0), cross-checked between the machine pages, the product pages, Crafting, Artisan Goods, the shop pages, Fruits and Prize Ticket',
    sources: [deh, smoker, dm, df, raisins, sf, crafting, goods, pierre, fishShop, fruits, farmingSkill, prize, cave, farmMaps, coal].map((p) => ref(p)),
    artisan,
    machines: [dehydrator, fishSmoker],
    fruit_examples: { ...fruitCheck, table: fruitExamples },
    skipped,
  };
  writeFileSync(join(ROOT, 'data', 'dehydrator.json'), JSON.stringify(out, null, 2) + '\n');
  const bad = flat.filter((r) => r.problems?.length);
  console.log(`dehydrator.json: ${out.machines.length} machines, ${dehydrator.products.length + 1} products, ${fruitExamples.length} fruit rows; ${bad.length} need verification`);
  for (const r of bad) console.log(`  ${r.id}: ${r.problems.join('; ')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

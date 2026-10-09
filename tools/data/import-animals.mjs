#!/usr/bin/env node
// Builds data/animals.json from the Stardew Valley Wiki: the coop and barn animals, what they
// produce, the artisan machines that process those products, hay, and the wiki's own formulas
// for product quality and Large/Deluxe products.
//
// Nothing is typed in by hand. Every number is parsed from wiki pages and every price-critical
// number (purchase price, product sell prices, production frequency, building level, artisan
// prices and processing times, Rancher/Artisan eligibility) must be read from at least two wiki
// pages that agree. A source that disagrees is written to the record's `problems`; a value without
// two agreeing sources, or a missing evidence sentence, fails the import. Files are written only
// once every check has passed.
//
// Sources: each animal's page, "Animals", "Marnie's Ranch", "Coop", "Barn", each product page
// (wikitext and the wiki's own rendered infobox), "Animal Products Profitability", the machine
// pages, "Artisan Goods", "Farming", "Farming/Skill" and "Hay".
//
//   node tools/data/import-animals.mjs [--cached]
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

// The pages to read: the animals that live in a Coop or Barn. Every animal Marnie sells and every
// animal the Coop and Barn pages list must be in here, or the import fails.
const ANIMAL_PAGES = ['Chicken', 'Duck', 'Rabbit', 'Void Chicken', 'Golden Chicken', 'Dinosaur', 'Ostrich', 'Cow', 'Goat', 'Sheep', 'Pig'];
const MACHINE_PAGES = [
  ['Mayonnaise Machine', 'mmproducts'],
  ['Cheese Press', 'cheesepressproducts'],
  ['Loom', 'loomproducts'],
  ['Oil Maker', 'oilmakerproducts'],
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
const page = (title) => cached(slug(title), () => fetchPage(title));
const rendered = (title) => cached(`${slug(title)}-html`, () => fetchRendered(title));
const ref = (p, anchor) => ({ title: p.title, url: anchor ? `${p.url}#${encodeURIComponent(anchor.replace(/ /g, '_'))}` : p.url, revid: p.revid });

/** Returns a source reference after checking every evidence pattern is on the page. */
function cite(p, ...evidence) {
  for (const e of evidence) {
    if (!e.test(p.wikitext)) failures.push(`${p.title}: evidence not found ${e}`);
  }
  return ref(p);
}

/** The wiki text matched by a pattern (group 1 if present), cleaned to plain text. */
function quote(p, re) {
  const m = p.wikitext.match(re);
  if (!m) {
    failures.push(`${p.title}: evidence not found ${re}`);
    return null;
  }
  return plain(m[1] ?? m[0]);
}

function need(p, value, what) {
  if (value == null || (typeof value === 'number' && Number.isNaN(value))) failures.push(`${p.title}: ${what} not found`);
  return value;
}

/* ------------------------------------------------------------------ parse helpers */

/** [[Target|Label]] -> Label, [[Target]] -> Target. */
export const unlink = (s) => s.replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1');

/** Wiki markup -> plain sentence (links, prices, durations, bold, code and spans removed). */
export function plain(s) {
  return unlink(
    s
      .replace(/\[\[File:[^\]]*\]\]/g, '')
      .replace(/\{\{Price\|([\d,]+)\}\}/g, '$1g')
      .replace(/\{\{[Dd]uration\|([^|}]+)[^}]*\}\}/g, '$1')
      .replace(/\{\{Name\|([^|}]+)[^}]*\}\}/g, '$1')
      .replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/g, '')
      .replace(/<\/?(?:code|span|samp|b|i)[^>]*>/g, ''),
  )
    .replace(/'''?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const num = (s) => Number(String(s).replace(/,/g, ''));
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };

/** First {{Price|N}} or {{Qualityprice|Name|N}} in a cell. */
export function priceIn(cell) {
  const m = (cell || '').match(/\{\{(?:Price\|([\d,]+)|Qualityprice\|[^|}]+\|(?:[a-z]+=[^|}]*\|)*([\d,]+))/);
  return m ? num(m[1] ?? m[2]) : null;
}

/** Template parameters of the page's first infobox ({{Infobox ...}} or {{Infobox animal ...}}). */
export function infobox(wikitext) {
  const start = wikitext.search(/\{\{Infobox/);
  if (start < 0) return {};
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

/** Names of {{Name|X}} templates in order ({{Name|X|link=Y}} -> Y). */
export function nameTemplates(s) {
  return [...(s || '').matchAll(/\{\{Name\|([^|}]+)((?:\|[^}]*)?)\}\}/g)].map((m) => {
    const link = m[2].match(/\|link=([^|}]+)/);
    return (link ? link[1] : m[1]).trim();
  });
}

/** Link targets in order ([[Target|Label]] -> Target), files and section links excluded. */
export function linkTargets(s) {
  return [...(s || '').matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)]
    .filter((m) => !/^(File|Category|:Category):/i.test(m[1]) && !m[0].includes('#'))
    .map((m) => m[1].trim());
}

const ATTR = /^\s*(?:[a-z-]+\s*=\s*"[^"]*"\s*)+\|/i;
const stripAttr = (s) => s.replace(ATTR, '').trim();

/** A wikitable as { headers, rows } (cells as raw wikitext; attributes stripped). */
export function wikiTable(text) {
  const start = text.indexOf('{|');
  if (start < 0) return { headers: [], rows: [] };
  const end = text.indexOf('\n|}', start);
  const lines = text.slice(start, end < 0 ? undefined : end).split('\n').slice(1);
  const headers = [];
  const rows = [];
  let row = null;
  for (const line of lines) {
    if (/^\|-/.test(line)) {
      row = [];
      rows.push(row);
    } else if (line.startsWith('!')) {
      for (const h of line.slice(1).split('!!')) headers.push(stripAttr(h.replace(/<noinclude>[\s\S]*?<\/noinclude>/g, '')));
    } else if (line.startsWith('|') && !line.startsWith('|}')) {
      if (!row) {
        row = [];
        rows.push(row);
      }
      for (const c of line.slice(1).split('||')) row.push(stripAttr(c));
    } else if (row && row.length) {
      row[row.length - 1] += '\n' + line;
    }
  }
  return { headers, rows: rows.filter((r) => r.length) };
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

/**
 * Production interval in days from a wiki sentence: "every day", "every morning", "daily" -> 1,
 * "every other day" -> 2, "every 4 days", "every 3rd day", "per two days" -> n. Null when absent.
 */
export function frequencyDays(text) {
  const t = plain(text || '');
  const m = t.match(/\b(?:every|per)\s+(?:(other)\s+day|(?:single\s+)?(day|morning)|(\d+|one|two|three|four|five|six|seven)(?:st|nd|rd|th)?\s+days?)\b|\b(daily)\b/i);
  if (!m) return null;
  if (m[1]) return 2;
  if (m[2] || m[4]) return 1;
  return WORDS[m[3].toLowerCase()] || Number(m[3]);
}

/** Processing time in game minutes: "200m (≈3h)", "200min", "3 Hours", "3h" -> minutes. */
export function durationMinutes(text) {
  const t = (text || '').replace(/&#8776;/g, '≈');
  const m = t.match(/(\d[\d,]*)\s*m(?:in(?:utes?)?)?\b/i);
  if (m) return num(m[1]);
  const h = t.match(/(\d+(?:\.\d+)?)\s*(?:h|hours?)\b/i);
  return h ? Math.round(Number(h[1]) * 60) : null;
}

/** Facts from an animal's own page. */
export function parseAnimalPage(wikitext) {
  const box = infobox(wikitext);
  const produce = section(wikitext, 'Produce') || '';
  const mature = produce.match(/who eat every day mature after (\d+) nights have passed/);
  const bornMature = /\bare born mature\b/.test(produce);
  const fromMature = produce.slice(Math.max(0, produce.search(/\bA mature\b/)));
  const deluxeSentence = (produce.match(/Once sufficient[^.]*\./) || [''])[0];
  const tablePrices = {};
  for (const m of produce.matchAll(/\{\{Qualityprice\|([^|}]+)\|([\d,]+)/g)) tablePrices[m[1].trim()] = num(m[2]);
  return {
    buyprice: box.buyprice ? num(box.buyprice) : null,
    building: nameTemplates(box.building)[0] || null,
    produce: nameTemplates(box.produce),
    days_to_mature: mature ? Number(mature[1]) : bornMature ? 0 : null,
    born_mature: bornMature,
    frequency: produce.search(/\bA mature\b/) >= 0 ? frequencyDays(fromMature) : null,
    deluxe: linkTargets(deluxeSentence).filter((t) => t !== 'Animals'),
    deluxe_sentence: deluxeSentence ? plain(deluxeSentence) : null,
    table_prices: tablePrices,
  };
}

/** Rows of the per-animal tables on the Animals page, keyed by animal page title (first row wins). */
export function parseAnimalsPage(wikitext) {
  const out = {};
  for (const group of ['Coop Animals', 'Barn Animals']) {
    const g = section(wikitext, group) || '';
    const parts = g.split(/^===\s*([^=]+?)\s*===\s*$/m);
    for (let i = 1; i < parts.length; i += 2) {
      const heading = parts[i];
      const body = parts[i + 1];
      const prose = body
        .split('\n')
        .filter((l) => !/^\s*[|!{]/.test(l) && !/^\{\{Main article/.test(l))
        .join('\n');
      const t = wikiTable(body);
      const col = (name) => t.headers.findIndex((h) => h.toLowerCase() === name);
      for (const r of t.rows) {
        const name = linkTargets(r[col('name')] || '')[0];
        if (!name || out[name]) continue;
        const produces = r[col('produces')] || '';
        const products = [...produces.matchAll(/(?:\[\[([^\]|]+)(?:\|[^\]]*)?\]\]|\{\{Name\|([^|}]+)[^}]*\}\})\s*-\s*\{\{Price\|([\d,]+)\}\}/g)].map((m) => ({
          name: (m[1] || m[2]).trim(),
          price: num(m[3]),
        }));
        const cost = r[col('cost')] || '';
        out[name] = {
          section: heading,
          group,
          cost: priceIn(cost),
          cost_na: /N\/A/.test(cost),
          requirement: col('requirements') >= 0 ? plain(r[col('requirements')]) : null,
          products,
          frequency: frequencyDays(prose),
          prose: plain(prose),
        };
      }
    }
  }
  return out;
}

/** Marnie's Ranch: shop items and livestock as { name: { price, building, note } }. */
export function parseMarnie(wikitext) {
  const read = (heading) => {
    const t = wikiTable(section(wikitext, heading) || '');
    const col = (name) => t.headers.findIndex((h) => h.toLowerCase() === name);
    const out = {};
    for (const r of t.rows) {
      const name = linkTargets(r[col('name')] || '')[0];
      if (!name) continue;
      const bcell = col('building required') >= 0 ? r[col('building required')] : '';
      out[name] = {
        price: priceIn(r[col('price')]),
        building: bcell ? plain(bcell) : null,
        note: ((r[col('description')] || '').match(/''([^']+)''/) || [])[1] || null,
      };
    }
    return out;
  };
  return { shop: read('Shop Inventory'), livestock: read('Livestock') };
}

/** Coop/Barn infobox: building level names and the first level that can house each animal. */
export function parseBuildingPage(wikitext) {
  const levels = [...wikitext.matchAll(/^\|style="text-align: ?center;"\|'''([^']+)'''\s*$/gm)].map((m) => m[1]);
  const lines = wikitext.split('\n');
  const at = lines.findIndex((l) => /\|Animals\s*$/.test(l));
  const minLevel = {};
  if (at >= 0) {
    lines.slice(at + 1, at + 1 + levels.length).forEach((l, i) => {
      for (const n of nameTemplates(l)) if (!(n in minLevel)) minLevel[n] = i + 1;
    });
  }
  return { levels, minLevel };
}

/** Sell-price columns of a rendered infobox: { Base: [normal, silver, gold, iridium], 'Rancher (+20%)': [...] }. */
export function renderedSellPrices(html) {
  const t = html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]*>/g, '\n')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const g = (s) => (/^[\d,]+g$/.test(s) ? num(s.slice(0, -1)) : null);
  const i = t.findIndex((s) => s === 'Sell Prices' || s === 'Sell Price');
  if (i < 0) return null;
  const labels = [];
  let k = i + 1;
  for (; k < t.length && g(t[k]) == null; k++) {
    if (/^\(\+\d+%\)$/.test(t[k]) && labels.length) labels[labels.length - 1] += ` ${t[k]}`;
    else labels.push(t[k]);
  }
  if (!labels.length) labels.push('Base');
  const nums = [];
  for (; k < t.length && g(t[k]) != null; k++) nums.push(g(t[k]));
  if (!nums.length || nums.length % labels.length) return null;
  const per = nums.length / labels.length;
  return Object.fromEntries(labels.map((l, j) => [l, nums.slice(j * per, (j + 1) * per)]));
}

const QUALITIES = ['normal', 'silver', 'gold', 'iridium'];
const byQuality = (arr) => (arr && arr.length === 4 ? Object.fromEntries(QUALITIES.map((q, i) => [q, arr[i]])) : arr ? { normal: arr[0] } : null);

/** Rows of the "Profit" table on Animal Products Profitability. */
export function parseProfitability(wikitext) {
  const body = section(wikitext, 'Profit') || '';
  const rows = [];
  for (const raw of body.split(/\n\|-\s*\n/)) {
    const line = raw.split('\n').find((l) => l.startsWith('|') && l.includes('||'));
    if (!line) continue;
    const c = line.slice(1).split('||').map(stripAttr);
    if (c.length < 7 || /\bwith\b/.test(c[0])) continue;
    const item = nameTemplates(c[0])[0] || linkTargets(c[0]).pop();
    const out = c[4].match(/\{\{Name\|([^|}]+)(?:\|(\d+))?/);
    const q = (s) => (plain(s).match(/Regular|Silver|Gold|Iridium/) || [''])[0].toLowerCase().replace('regular', 'normal');
    const prof = (plain(c[2]).match(/Rancher|Artisan/) || [null])[0];
    rows.push({
      item,
      quality: q(c[1]),
      profession: prof ? prof.toLowerCase() : null,
      price: num(plain(c[3])),
      output: out ? out[1].trim() : null,
      count: out && out[2] ? Number(out[2]) : 1,
      output_quality: q(c[5]),
      output_price: num(plain(c[6])),
    });
  }
  return rows;
}

/** Product rows of a machine's products section: { name, inputs, minutes, price }. */
export function parseMachineTable(text) {
  const t = wikiTable(text);
  const col = (re) => t.headers.findIndex((h) => re.test(h));
  const [cName, cIng, cTime, cPrice] = [col(/^Name$/i), col(/^Ingredients?$/i), col(/^Processing Time/i), col(/^Sell Price$/i)];
  const out = [];
  for (const r of t.rows) {
    const name = linkTargets(r[cName] || '')[0];
    if (!name || r.length < t.headers.length) continue; // rowspan continuation rows
    out.push({ name, inputs: nameTemplates(r[cIng]), minutes: durationMinutes(r[cTime]), price: priceIn(r[cPrice]) });
  }
  return out;
}

/* ------------------------------------------------------------------ wiki formulas */
// These implement formulas the wiki states in words (Animals page, Farming page); the importer
// checks them against the wiki's own worked examples and tables before anything is written.

/** Quality score: (Friendship / 1000) - (1 - (Mood / 225)), plus 0.333 with Coopmaster/Shepherd. */
export const qualityScore = (friendship, mood, professionBonus = 0) => friendship / 1000 - (1 - mood / 225) + professionBonus;

/** Chance of each quality from a score (iridium only above 0.95; then gold at score/2; then silver at score). */
export function qualityChances(score, iridiumMin = 0.95) {
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const iridium = score > iridiumMin ? clamp(score / 2) : 0;
  const gold = (1 - iridium) * clamp(score / 2);
  const silver = (1 - iridium - gold) * clamp(score);
  return { normal: 1 - iridium - gold - silver, silver, gold, iridium };
}

/** "Mood Modifier" for Large/Deluxe products: x1.5 above 200 mood; mood - 100 at 100 or less; else 0. */
export const moodModifier = (mood) => (mood > 200 ? 1.5 : mood <= 100 ? mood - 100 : 0);

/** Large/Deluxe score: (Friendship + Mood x Mood Modifier) / divisor (+ Daily Luck for ducks and rabbits). */
export const deluxeScore = (friendship, mood, divisor, dailyLuck = 0) => (friendship + mood * moodModifier(mood)) / divisor + dailyLuck;

/* ------------------------------------------------------------------ cross-checking */

/**
 * Two-of-N agreement. votes: [{ source, value }] (value undefined = page says nothing). Returns the
 * value at least two sources agree on, the sources that agree, and the ones that disagree.
 */
export function agree(votes) {
  const said = votes.filter((v) => v.value !== undefined);
  const counts = new Map();
  for (const v of said) {
    const k = JSON.stringify(v.value);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!best || best[1] < 2) return { ok: false, value: undefined, agreeing: [], disagreeing: said };
  const value = JSON.parse(best[0]);
  return {
    ok: true,
    value,
    agreeing: said.filter((v) => JSON.stringify(v.value) === best[0]).map((v) => v.source),
    disagreeing: said.filter((v) => JSON.stringify(v.value) !== best[0]),
  };
}

/** Runs agree() for one field; records disagreements as problems and a missing majority as a failure. */
function settle(where, field, votes, problems, verified) {
  const r = agree(votes);
  if (!r.ok) {
    failures.push(`${where}: ${field} lacks two agreeing wiki sources (${votes.map((v) => `${v.source}=${JSON.stringify(v.value)}`).join(', ')})`);
    return undefined;
  }
  for (const d of r.disagreeing) problems.push(`${field}: ${d.source} says ${JSON.stringify(d.value)}, ${r.agreeing.join(' and ')} say ${JSON.stringify(r.value)}`);
  verified[field] = r.agreeing;
  return r.value;
}

const floor = Math.floor;

/* ------------------------------------------------------------------ main */

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const animalsPage = await page('Animals');
  const marniePage = await page("Marnie's Ranch");
  const coopPage = await page('Coop');
  const barnPage = await page('Barn');
  const app = await page('Animal Products Profitability');
  const farming = await page('Farming');
  const skill = await page('Farming/Skill');
  const artisanPage = await page('Artisan Goods');
  const hayPage = await page('Hay');

  const A = parseAnimalsPage(animalsPage.wikitext);
  const marnie = parseMarnie(marniePage.wikitext);
  const coop = parseBuildingPage(coopPage.wikitext);
  const barn = parseBuildingPage(barnPage.wikitext);
  const profit = parseProfitability(app.wikitext);
  if (coop.levels.length !== 3 || barn.levels.length !== 3) failures.push(`Coop/Barn: building levels not found (${coop.levels}, ${barn.levels})`);
  if (!profit.length) failures.push('Animal Products Profitability: profit table not found');

  // Every animal sold by Marnie or housed by a Coop/Barn must be covered.
  for (const name of [...Object.keys(marnie.livestock), ...Object.keys(coop.minLevel), ...Object.keys(barn.minLevel)]) {
    const n = name.replace(/^White /, '');
    if (!ANIMAL_PAGES.includes(n)) failures.push(`animal "${name}" is listed on the wiki but not imported`);
  }

  const levelOf = (buildingName) => {
    for (const [type, b] of [['coop', coop], ['barn', barn]]) {
      const i = b.levels.indexOf(buildingName);
      if (i >= 0) return { building: type, level: i + 1 };
    }
    return undefined;
  };

  /* ---------- Products (raw animal products) ---------- */
  const productPages = new Map(); // resolved title -> { page, html, names:Set, animals:Set }
  const animalInfo = [];
  for (const title of ANIMAL_PAGES) {
    const p = await page(title);
    const own = parseAnimalPage(p.wikitext);
    for (const what of ['building', 'days_to_mature']) need(p, own[what], what);
    if (!own.produce.length) failures.push(`${title}: produce list not found`);
    const products = [];
    for (const name of own.produce) {
      const pp = await page(name);
      if (!productPages.has(pp.title)) productPages.set(pp.title, { page: pp, html: await rendered(pp.title), names: new Set(), animals: new Set() });
      const e = productPages.get(pp.title);
      e.names.add(name);
      e.animals.add(title);
      if (!products.includes(pp.title)) products.push(pp.title);
    }
    const deluxe = [];
    for (const t of own.deluxe) {
      const resolved = (await page(t)).title;
      if (products.includes(resolved) && !deluxe.includes(resolved)) deluxe.push(resolved);
    }
    animalInfo.push({ title, p, own, products, deluxe });
  }

  const productRecords = [];
  const productById = new Map();
  for (const [title, e] of productPages) {
    const problems = [];
    const verified = {};
    const box = infobox(e.page.wikitext);
    const r = renderedSellPrices(e.html.html);
    if (!r) failures.push(`${title}: rendered sell prices not found`);
    const where = `product ${title}`;
    const votes = [
      { source: `${e.page.title} (infobox)`, value: box.sellprice ? num(box.sellprice) : undefined },
      { source: `${e.page.title} (rendered)`, value: r ? r.Base?.[0] : undefined },
    ];
    for (const at of animalInfo.filter((a) => a.products.includes(title))) {
      const tp = at.own.table_prices[title] ?? [...e.names].map((n) => at.own.table_prices[n]).find((v) => v != null);
      votes.push({ source: at.p.title, value: tp });
      const row = A[at.title];
      const ap = row && row.products.find((x) => x.name === title || e.names.has(x.name));
      votes.push({ source: `${animalsPage.title} (${at.title})`, value: ap ? ap.price : undefined });
    }
    const appRow = profit.find((x) => x.item === title && x.quality === 'normal' && !x.profession);
    votes.push({ source: app.title, value: appRow ? appRow.price : undefined });
    const base = settle(where, 'base_price', votes, problems, verified);

    // Rancher: the rendered infobox shows a "Rancher (+20%)" column; the profitability table's
    // Rancher row shows the raised price; the product page says whether it is an animal product.
    const rancherCol = r && Object.keys(r).find((k) => /^Rancher/.test(k));
    const appRancher = profit.find((x) => x.item === title && x.quality === 'normal' && x.profession === 'rancher');
    const intro = e.page.wikitext.slice(0, e.page.wikitext.search(/^==/m) >>> 0);
    const notAnimal = /not considered to be animal products/.test(intro);
    const isAnimal = /\bis an? \[\[[^\]]*\|animal product\]\]|\bare \[\[[^\]]*\|animal products\]\]|\banimal product\]\]/.test(intro);
    const rancherVotes = [
      { source: `${e.page.title} (rendered infobox columns)`, value: r ? Boolean(rancherCol) : undefined },
      { source: `${app.title} (Rancher row)`, value: appRancher && base != null ? (appRancher.price === floor(base * 1.2) ? true : appRancher.price === base ? false : null) : undefined },
      { source: `${e.page.title} (text)`, value: notAnimal ? false : isAnimal ? true : undefined },
    ];
    for (const at of animalInfo.filter((a) => a.products.includes(title))) {
      if (/do not benefit from the \[\[[^\]]*\|Rancher\]\] profession/.test(at.p.wikitext) && /Truffles? do not benefit/.test(at.p.wikitext)) {
        rancherVotes.push({ source: `${at.p.title} (Professions)`, value: false });
      }
    }
    const rancher = settle(where, 'rancher', rancherVotes, problems, verified);
    if (rancher && r && rancherCol && base != null && r[rancherCol][0] !== floor(base * 1.2)) problems.push(`rendered Rancher price ${r[rancherCol][0]} != floor(${base} x 1.2)`);

    const extraCols = r ? Object.keys(r).filter((k) => k !== 'Base' && !/^Rancher/.test(k)) : [];
    const rec = {
      id: slug(title),
      name: title,
      variants: [...e.names].sort(),
      animals: [...e.animals].map(slug),
      base_price: base,
      price_by_quality: byQuality(r?.Base),
      rancher,
      notes: extraCols.map((k) => `The wiki's infobox also lists prices for "${k}": ${r[k].join('/')}g.`),
      sources: [ref(e.page), ...[...e.animals].map((t) => ref(animalInfo.find((a) => a.title === t).p, 'Produce')), ref(animalsPage), ref(app)],
      verified,
      problems,
    };
    productRecords.push(rec);
    productById.set(title, rec);
  }

  /* ---------- Animals ---------- */
  const animalRecords = [];
  for (const { title, p, own, products, deluxe } of animalInfo) {
    const problems = [];
    const verified = {};
    const row = A[title];
    if (!row) failures.push(`${animalsPage.title}: no table row for ${title}`);
    const where = `animal ${title}`;

    // Purchase price at Marnie's (null when she does not sell it).
    const sold = marnie.livestock[title];
    const price = settle(
      where,
      'purchase_price',
      [
        { source: `${p.title} (infobox)`, value: own.buyprice },
        { source: animalsPage.title, value: row ? (row.cost_na ? null : row.cost ?? undefined) : undefined },
        { source: marniePage.title, value: sold ? sold.price : null },
      ],
      problems,
      verified,
    );

    // Building and its minimum level.
    const housing = coop.minLevel[title] || coop.minLevel[`White ${title}`] ? ['coop', coop.minLevel[title] || coop.minLevel[`White ${title}`]] : barn.minLevel[title] || barn.minLevel[`White ${title}`] ? ['barn', barn.minLevel[title] || barn.minLevel[`White ${title}`]] : null;
    const bVotes = [
      { source: `${p.title} (infobox)`, value: own.building ? levelOf(own.building) : undefined },
      { source: housing ? (housing[0] === 'coop' ? coopPage.title : barnPage.title) : 'Coop/Barn', value: housing ? { building: housing[0], level: housing[1] } : undefined },
      { source: marniePage.title, value: sold && sold.building ? levelOf(sold.building) : undefined },
      { source: animalsPage.title, value: row && row.requirement ? levelOf(row.requirement) : undefined },
    ];
    const housed = settle(where, 'building', bVotes, problems, verified);
    const buildingPage = housed?.building === 'coop' ? coop : barn;

    // Production interval.
    const regular = products.filter((t) => !deluxe.includes(t));
    const regularPage = regular.length ? productPages.get(regular[0]).page : null;
    const regularIntro = regularPage ? regularPage.wikitext.slice(0, regularPage.wikitext.search(/^==/m) >>> 0) : '';
    const isPig = /A pig will produce a truffle only if all of the following are true/.test(p.wikitext);
    let produce;
    if (isPig) {
      // Pigs dig truffles up outdoors; the wiki gives conditions, not an interval.
      const pre = section(p.wikitext, 'Prerequisites for Truffle Generation') || '';
      const conditions = [...pre.matchAll(/^\*\s*(.+)$/gm)].map((m) => plain(m[1]));
      if (!conditions.length) failures.push(`${p.title}: truffle prerequisites not found`);
      const winter = [cite(p, /\* it is not winter/), cite(animalsPage, /During Winter, pigs will not produce Truffles since they don't leave the barn\./)];
      const rain = [cite(p, /\* it is not raining\/storming/), cite(animalsPage, /They will not go out in \[\[winter\]\], or when it is rainy, stormy, or snowy\./)];
      verified.produce_conditions = [...winter, ...rain].map((s) => s.title).filter((t, i, a) => a.indexOf(t) === i);
      produce = {
        mode: 'outdoor-forage',
        frequency_days: null,
        conditions,
        first_truffle: quote(p, /(This means that there is around a 99\.99% chance that a pig will generate a truffle each day[^.]*\.)/),
        extra_truffle_formula: quote(p, /The chance to find an extra truffle is <code>([^<]+)<\/code>/),
        extra_truffle_note: quote(p, /(This means that at max friendship \(1000\), there is a 66% chance of creating an extra truffle\.)/),
        average_note: quote(p, /(The average number of truffles a pig at max happiness produces in a day is ≈3)/),
        notes: [
          quote(p, /(Truffles that are not gathered will stay on the ground until the next day\.)/),
          quote(p, /(truffles that are not gathered on the 28th day of a season disappear on the following morning \(the 1st day of the new season\)\.)/),
          quote(p, /(Pigs have a 0\.2% chance to dig up a \[\[Truffle Crab\]\] instead of a Truffle\.)/),
          quote(animalsPage, /(A \[\[Golden Animal Cracker\]\] can be given to any farm animal \(except pigs\) to permanently double its produce\.)/),
        ],
      };
    } else {
      const frequency = settle(
        where,
        'frequency_days',
        [
          { source: `${p.title} (Produce)`, value: own.frequency ?? undefined },
          { source: `${animalsPage.title} (${row?.section})`, value: row?.frequency ?? undefined },
          { source: `${regularPage?.title} (intro)`, value: frequencyDays(regularIntro) ?? undefined },
        ],
        problems,
        verified,
      );
      produce = { mode: 'building', frequency_days: frequency, frequency_reductions: [], notes: [] };
      if (row && row.section === 'Chickens' && title !== 'Chicken') {
        produce.notes.push(`The Animals page gives the interval once for its whole "Chickens" section ("${(row.prose.match(/Adult chickens will produce eggs every morning if fed\./) || ['?'])[0]}"), which also lists the ${title}.`);
      }
      // Sheep: friendship and Shepherd each take a day off the interval.
      const sheep = p.wikitext.match(/Having at least 4\.5 Hearts \((\d+) points\) of Friendship reduces the time by one day\. The \[\[[^\]]*\|Shepherd Profession\]\] also reduces the time by one day\./);
      if (sheep) {
        const animalsSheep = animalsPage.wikitext.match(/If the player has (\d+) or more Friendship with the sheep and has pet it at least one time, it will reduce it to every other day\./);
        const shepherdToo = /If the player also has the \[\[[^\]]*\|Shepherd profession\]\], it will reduce the time required to regrow by an extra day/.test(animalsPage.wikitext);
        const f = settle(where, 'friendship_reduction_min', [{ source: p.title, value: Number(sheep[1]) }, { source: animalsPage.title, value: animalsSheep ? Number(animalsSheep[1]) : undefined }], problems, verified);
        if (!shepherdToo) failures.push(`${animalsPage.title}: Shepherd wool reduction sentence not found`);
        produce.frequency_reductions = [
          { min_friendship: f, days: 1 },
          { profession: 'shepherd', days: 1 },
        ];
        produce.notes.push(quote(p, /(A mature sheep grows in its coat every 3 days, if it is fed and has at least 70 happiness\.)/));
        produce.notes.push(quote(animalsPage, /(If the player has \d+ or more Friendship with the sheep and has pet it at least one time, it will reduce it to every other day\.)/));
      }
      if (deluxe.length) {
        produce.notes.push(quote(animalsPage, /(Animals who can produce a Deluxe\/Large product will sometimes produce more frequently, however)/) + ' — ' + quote(animalsPage, /(In this case, animals that normally would take multiple days to produce, will produce again immediately the next day\.)/));
      }
    }

    // Large/Deluxe product and the wiki's wording of when it appears.
    let large = null;
    if (deluxe.length) {
      const d = deluxe[0];
      const rule = /^Large /.test(d) ? 'large' : slug(d);
      large = { product: slug(d), rule, wiki_wording: own.deluxe_sentence };
    }

    const days = own.days_to_mature;
    const notes = [];
    if (own.born_mature) notes.push(quote(p, /(Dinosaurs are born mature\.)/));
    if (title === 'Chicken') {
      notes.push(quote(p, /(After seeing \[\[Shane\]\]'s 8-heart event, each chicken you purchase from \[\[Marnie\]\] has a 25% chance of being blue\.)/));
      notes.push(quote(p, /(Aside from appearance, blue chickens are identical to regular white and brown chickens\.)/));
      notes.push(quote(p, /(White and blue chickens produce white eggs, and brown chickens produce brown eggs[^.]*\.)/));
    }
    if (title === 'Duck') notes.push(quote(p, /(Ducks are unique in that if they swim on water[^.]*, they do not need to eat \[\[hay\]\] or \[\[grass\]\] to be fed overnight\.)/));
    if (title === 'Dinosaur') notes.push(quote(p, /(If you have used the \[\[File:Treasure Appraisal Guide\.png\|24px\]\] \[\[Treasure Appraisal Guide\]\] the egg instead sells for \{\{Price\|1050\}\}\.)/));

    // How to get one when Marnie does not sell it.
    let acquisition = null;
    if (price === null) {
      acquisition = { wiki_wording: quote(p, new RegExp(`(${title.replace(/ /g, '\\s')}(?:e?s)? can be hatched by placing an? [^.]*\\.)`)) };
      if (title === 'Void Chicken') {
        acquisition.wiki_wording += ' ' + quote(p, /(There is no other way to obtain a Void Chicken\.)/);
        const krobus = settle(where, 'void_egg_price_krobus', [
          { source: animalsPage.title, value: num((animalsPage.wikitext.match(/a Void Egg can be purchased from \[\[Krobus\]\] for \{\{Price\|([\d,]+)\}\}/) || [])[1] ?? NaN) || undefined },
          { source: 'Void Egg', value: num(((await page('Void Egg')).wikitext.match(/A Void Egg can also be purchased from \[\[Krobus\]\] for \{\{Price\|([\d,]+)\}\}/) || [])[1] ?? NaN) || undefined },
        ], problems, verified);
        acquisition.egg = { item: 'void-egg', shop: 'krobus', price: krobus };
      }
      if (title === 'Golden Chicken') {
        const ge = await page('Golden Egg');
        const mg = marnie.shop['Golden Egg'];
        const gp = settle(where, 'golden_egg_price_marnie', [
          { source: marniePage.title, value: mg ? mg.price : undefined },
          { source: animalsPage.title, value: num((animalsPage.wikitext.match(/a \[\[Golden Egg\]\] can be purchased from \[\[Marnie's Ranch\]\] for \{\{Price\|([\d,]+)\}\}/) || [])[1] ?? NaN) || undefined },
          { source: ge.title, value: num((ge.wikitext.match(/\[\[Marnie's Ranch\]\] for \{\{Price\|([\d,]+)\}\}/) || [])[1] ?? NaN) || undefined },
        ], problems, verified);
        acquisition.egg = { item: 'golden-egg', shop: 'marnie', price: gp, requirement: quote(animalsPage, /(To obtain Golden Eggs and Golden Chickens, \[\[Perfection\]\] must be reached\.)/) };
      }
      if (title === 'Ostrich') acquisition.wiki_wording += ' ' + quote(p, /(An Ostrich Egg can be initially found by solving [^.]*\.)/);
    }

    const productIds = { regular: regular.length ? slug(regular[0]) : null, large: large ? large.product : null };
    const childProblems = products.flatMap((t) => (productById.get(t)?.problems || []).map((x) => `${t}: ${x}`));
    const allProblems = [...problems, ...childProblems];
    animalRecords.push({
      id: slug(title),
      name: title,
      building: housed?.building ?? null,
      building_level: housed?.level ?? null,
      building_name: housed ? buildingPage.levels[housed.level - 1] : null,
      purchase_price: price ?? null,
      purchase_shop: price != null ? 'marnie' : null,
      acquisition,
      days_to_mature: days,
      produce,
      products: productIds,
      large_product: large,
      notes: notes.filter(Boolean),
      game_version: GAME_VERSION,
      sources: [ref(p), ref(animalsPage), ...(sold ? [ref(marniePage, 'Livestock')] : []), ref(housed?.building === 'coop' ? coopPage : barnPage)],
      verified,
      single_source: ['days_to_mature'],
      last_verified: today,
      verification_status: allProblems.length ? 'needs-verification' : 'cross-checked',
      problems: allProblems,
    });
  }

  /* ---------- Large / Deluxe product rules (Animals page) ---------- */
  const deluxeRules = {
    mood_modifier: {
      above_200: Number(quote(animalsPage, /If Mood is more than 200, it will be multiplied by ([\d.]+)/)),
      at_or_below_100: 'mood - 100',
      otherwise: 0,
      wiki_wording: [
        quote(animalsPage, /(If Mood is more than 200, it will be multiplied by 1\.5)/),
        quote(animalsPage, /(If Mood is 100 or less, then "Mood Modifier" will be the animal's mood minus 100[^\n]*)/),
        quote(animalsPage, /(Otherwise "Mood Modifier" is Zero[^\n]*)/),
      ],
    },
    rules: {
      large: {
        applies_to: productRecords.filter((r) => /^Large /.test(r.name)).map((r) => r.id),
        formula: quote(animalsPage, /Each animal will have an overall score created with the following formula: <code>([\s\S]*?\/ 1200)<\/code>/),
        divisor: Number(quote(animalsPage, /Mood Modifier'''<\/span>\)\) \/ (1200)<\/code>/)),
        min_friendship: Number(quote(animalsPage, /Only animals with (\d+) or higher friendship can produce Large products\./)),
        daily_luck: false,
      },
      'duck-feather': {
        formula: quote(animalsPage, /For each duck, an overall score is created using the following formula: <code>([\s\S]*?)<\/code>/),
        divisor: Number(quote(animalsPage, /For each duck, [^\n]*\/ (\d+)\) \+/)),
        daily_luck: true,
      },
      'rabbits-foot': {
        formula: quote(animalsPage, /For each rabbit, an overall score is created using the following formula: <code>([\s\S]*?)<\/code>/),
        divisor: Number(quote(animalsPage, /For each rabbit, [^\n]*\/ (\d+)\) \+/)),
        daily_luck: true,
      },
    },
    ability: quote(animalsPage, /(If an animal is below 150 Mood, it still has a chance to have the ability to produce Quality and Large or Deluxe products\.[^\n]*)/),
    roll: quote(animalsPage, /(Each time a product is rolled, a number between 0-1 is chosen randomly\. If the overall score is higher than the random number, a Large product will be created\.)/),
    stated_maximum: quote(animalsPage, /'''(At max Friendship, Mood, and Luck, there is a 40% chance of getting a \[\[Rabbit's Foot\]\] and a 42% chance of getting a \[\[Duck Feather\]\]\.)'''/),
    sources: [ref(animalsPage, 'Deluxe and Large Products')],
  };
  // Check the formulas against the wiki's own worked examples before trusting them.
  const ex1 = animalsPage.wikitext.match(/= \(<span[^>]*>(\d+)<\/span> \+ \(<span[^>]*>(\d+) × ([\d.]+)<\/span>\)\) \/ 1200[\s\S]*?= '''([\d.]+)'''/);
  const ex2 = animalsPage.wikitext.match(/= \(\(<span[^>]*>(\d+)<\/span> \+ \(<span[^>]*>(\d+) × 0<\/span>\)\) \/ 5000\) \+ <span[^>]*>([\d.]+)<\/span>[\s\S]*?= '''([\d.]+)'''/);
  const examples = { large: null, rabbit: null };
  if (!ex1) failures.push('Animals: Large product worked example not found');
  else {
    examples.large = { friendship: +ex1[1], mood: +ex1[2], expected: +ex1[4] };
    if (Math.abs(deluxeScore(+ex1[1], +ex1[2], deluxeRules.rules.large.divisor) - +ex1[4]) > 1e-9) failures.push(`Animals: Large formula does not reproduce the wiki example (${ex1[4]})`);
  }
  if (!ex2) failures.push('Animals: rabbit worked example not found');
  else {
    examples.rabbit = { friendship: +ex2[1], mood: +ex2[2], daily_luck: +ex2[3], expected: +ex2[4] };
    if (Math.abs(deluxeScore(+ex2[1], +ex2[2], deluxeRules.rules['rabbits-foot'].divisor, +ex2[3]) - +ex2[4]) > 1e-9) failures.push(`Animals: rabbit formula does not reproduce the wiki example (${ex2[4]})`);
  }

  /* ---------- Product quality (Animals page + Farming page) ---------- */
  const bonusA = quote(animalsPage, /If the player has the \[\[[^\]]*\|Shepherd\]\] or \[\[[^\]]*\|Coopmaster\]\] Profession, ([\d.]+) will be added to the '''score'''/);
  const bonusF = quote(farming, /They each add ([\d.]+) to the score used to calculate product quality/);
  const qProblems = [];
  const qVerified = {};
  const quality = {
    score_formula: quote(animalsPage, /Each animal will have an overall '''score''' created with the following formula: <code>([\s\S]*?)<\/code>/),
    friendship_divisor: Number(quote(animalsPage, /<code>\(<span[^>]*>'''Friendship'''<\/span> \/ (\d+)\) - \(1 - \(<span/)),
    mood_divisor: Number(quote(animalsPage, /Mood'''<\/span> \/ (\d+)\)\)<\/code>/)),
    profession_bonus: settle('quality', 'profession_bonus', [{ source: animalsPage.title, value: Number(bonusA) }, { source: farming.title, value: Number(bonusF) }], qProblems, qVerified),
    profession_bonus_applies: /0\.333 will be added to the '''score''' for any barn animals or coop animals respectively/.test(animalsPage.wikitext) ? { coop: 'coopmaster', barn: 'shepherd' } : need(animalsPage, null, 'profession bonus scope'),
    iridium_min_score: Number(quote(animalsPage, /first seeing if the '''score''' value is above ([\d.]+)\./)),
    order: [
      quote(animalsPage, /(If it is, the '''score''' divided by 2 will be compared against a random number between 0-1\. If the '''score''' divided by 2 is greater than the random number, the item will be Iridium quality\.)/),
      quote(animalsPage, /(If an Iridium quality item is not produced, the '''score''' divided by 2 will be compared against a random number between 0-1\.[^\n]*)/),
      quote(animalsPage, /(If a Gold quality item is not produced, the '''score''' will be compared against a random number between 0-1\.[^\n]*)/),
    ],
    requires: quote(animalsPage, /(If the animal has the ability to produce a Quality item \(150 mood or higher\), it will roll for quality from normal to iridium\.)/),
    truffle_note: quote(animalsPage, /(Collection will be affected by \[\[Foraging\]\] skill, allowing the player to gather iridium quality Truffles with a chance of double harvest\.)/),
    sources: [ref(animalsPage, 'Quality'), ref(farming, 'Effect of Coopmaster and Shepherd on Animal Product Quality Frequency')],
    verified: qVerified,
    problems: qProblems,
  };
  // The formula must reproduce the Farming page's table (max friendship 1000, max mood 255).
  const qTable = [...farming.wikitext.matchAll(/^\|\s*(No \(or other\) Profession|Coopmaster or Shepherd)\s*\|\|\s*([\d.]+)%\s*\|\|\s*([\d.]+)%\s*\|\|\s*([\d.]+)%/gm)].map((m) => ({
    profession: /Coopmaster/.test(m[1]),
    iridium: +(+m[2] / 100).toFixed(7),
    gold: +(+m[3] / 100).toFixed(7),
    silver: +(+m[4] / 100).toFixed(7),
  }));
  const qMax = farming.wikitext.match(/for an animal with max friendship \(5 hearts, (\d+) friendship points\) and max mood \((\d+)\)/);
  if (qTable.length !== 2 || !qMax) failures.push('Farming: quality frequency table not found');
  for (const row of qTable) {
    const c = qualityChances(qualityScore(+qMax[1], +qMax[2], row.profession ? quality.profession_bonus : 0), quality.iridium_min_score);
    for (const q of ['iridium', 'gold', 'silver']) {
      // The wiki rounds 255/225 to 1.1333 before adding 0.333, so allow 0.01 percentage points.
      if (Math.abs(c[q] - row[q]) > 1e-4) failures.push(`Farming: quality formula gives ${q} ${c[q]} but the table says ${row[q]}`);
    }
  }
  const qEx = animalsPage.wikitext.match(/an animal with <span[^>]*>(\d+) Friendship<\/span> \(3 Hearts\) and <span[^>]*>(\d+) Mood<\/span> would be calculated thus:[\s\S]*?= '''([\d.]+)\.\.\.'''/);
  if (!qEx) failures.push('Animals: quality worked example not found');
  const qualityExample = qEx ? { friendship: +qEx[1], mood: +qEx[2], score: +qEx[3], gold_pct: Number(quote(animalsPage, /the item would have a (\d+)% chance to become Gold quality/)), silver_pct_if_not_gold: Number(quote(animalsPage, /it would have a ([\d.]+)% chance to be Silver quality/)) } : null;
  if (qualityExample && Math.abs(qualityScore(qualityExample.friendship, qualityExample.mood) - qualityExample.score) > 1e-3) failures.push('Animals: quality score does not reproduce the wiki example');

  /* ---------- Artisan machines and goods ---------- */
  const artisanRule = cite(artisanPage, /Artisan Goods will be worth 40% more \(with the exception of \[\[Oil\]\] and \[\[Coffee\]\]\)/);
  const machines = [];
  const goods = [];
  const rawId = (name) => {
    const rec = productRecords.find((r) => r.name === name || r.variants.includes(name));
    return rec ? rec.id : null;
  };
  for (const [title, label] of MACHINE_PAGES) {
    const mp = await page(title);
    const sec = mp.wikitext.match(new RegExp(`<section begin="?${label}"?\\s*/>([\\s\\S]*?)<section end="?${label}"?\\s*/>`));
    if (!sec) {
      failures.push(`${title}: products section "${label}" not found`);
      continue;
    }
    const rows = parseMachineTable(sec[1]).filter((r) => r.inputs.some((i) => rawId(i)));
    if (!rows.length) failures.push(`${title}: no animal-product rows found`);
    const recipes = [];
    for (const row of rows) {
      const gp = await page(row.name);
      const html = await rendered(row.name);
      const r = renderedSellPrices(html.html);
      const box = infobox(gp.wikitext);
      const problems = [];
      const verified = {};
      const where = `artisan ${row.name}`;
      const appRows = profit.filter((x) => x.output === gp.title);
      const appPlain = appRows.find((x) => !x.profession && x.output_quality === 'normal' && x.count === 1) || appRows.find((x) => !x.profession && x.output_quality === 'normal');
      const basePrice = settle(where, 'base_price', [
        { source: `${title} (products table)`, value: row.price ?? undefined },
        { source: `${gp.title} (infobox)`, value: box.sellprice ? num(box.sellprice) : undefined },
        { source: `${gp.title} (rendered)`, value: r?.Base?.[0] },
        { source: app.title, value: appPlain ? appPlain.output_price / appPlain.count : undefined },
      ], problems, verified);
      const minutes = settle(where, 'minutes', [
        { source: `${title} (products table)`, value: row.minutes ?? undefined },
        { source: `${gp.title} (infobox)`, value: durationMinutes(box.crafttime) ?? undefined },
      ], problems, verified);
      // Gold price: the rendered infobox against the animal page's "sells for X or Y depending on quality".
      let byQ = byQuality(r?.Base);
      if (byQ && byQ.gold != null) {
        const animalSays = animalInfo
          .map((a) => a.p.wikitext.match(new RegExp(`\\[\\[${row.name}\\]\\], which sells for \\{\\{Price\\|([\\d,]+)\\}\\} or \\{\\{Price\\|([\\d,]+)\\}\\} depending on quality`)))
          .find(Boolean);
        const appGold = appRows.find((x) => !x.profession && x.output_quality === 'gold');
        settle(where, 'gold_price', [
          { source: `${gp.title} (rendered)`, value: byQ.gold },
          { source: 'animal page', value: animalSays ? num(animalSays[2]) : undefined },
          { source: app.title, value: appGold ? appGold.output_price / appGold.count : undefined },
        ], problems, verified);
      }
      const artisanCol = r && Object.keys(r).find((k) => /^Artisan/.test(k));
      const rancherCol = r && Object.keys(r).find((k) => /^Rancher/.test(k));
      const appArt = appRows.find((x) => x.profession === 'artisan' && x.output_quality === 'normal');
      const appRan = appRows.find((x) => x.profession === 'rancher' && x.output_quality === 'normal');
      const unit = (x) => x.output_price / x.count;
      const artisan = settle(where, 'artisan', [
        { source: `${gp.title} (rendered infobox columns)`, value: r ? Boolean(artisanCol) : undefined },
        { source: `${app.title} (Artisan row)`, value: appArt ? (unit(appArt) === floor(basePrice * 1.4) ? true : unit(appArt) === basePrice ? false : null) : undefined },
        { source: `${artisanPage.title} (exceptions: Oil, Coffee)`, value: /Artisan Good/.test(gp.wikitext) ? !['Oil', 'Coffee'].includes(gp.title) : undefined },
      ], problems, verified);
      const rancher = settle(where, 'rancher', [
        { source: `${gp.title} (rendered infobox columns)`, value: r ? Boolean(rancherCol) : undefined },
        { source: `${app.title} (Rancher row)`, value: appRan ? (unit(appRan) === floor(basePrice * 1.2) ? true : unit(appRan) === basePrice ? false : null) : undefined },
      ], problems, verified);
      if (artisan && artisanCol && r[artisanCol][0] !== floor(basePrice * 1.4)) problems.push(`rendered Artisan price ${r[artisanCol][0]} != floor(${basePrice} x 1.4)`);
      if (rancher && rancherCol && r[rancherCol][0] !== floor(basePrice * 1.2)) problems.push(`rendered Rancher price ${r[rancherCol][0]} != floor(${basePrice} x 1.2)`);
      const notes = [];
      if (rancher && artisan) notes.push("The wiki shows Rancher (+20%) and Artisan (+40%) as separate price columns; it does not say whether the two combine for a player who has both professions.");
      if (gp.title === 'Truffle Oil') {
        notes.push(quote(gp, /(Without the \[\[Farming#Farming Skill\|Artisan Profession\]\], iridium quality \[\[Truffle\|truffles\]\] are worth more to sell outright rather than turn into oil\.)/));
        notes.push(`Farming/Skill adds "${quote(skill, /\((Note that \[\[Oil\|oil\]\] does not actually benefit from the Artisan Profession)\)/)}"; that link is the Oil item (from corn and sunflowers), not Truffle Oil.`);
      }
      if (/Cheese/.test(gp.title)) notes.push(quote(gp, /(can be placed inside a \[\[Cask\]\] to age from normal quality to silver, gold, and eventually iridium quality\.)/));
      goods.push({
        id: slug(gp.title),
        name: gp.title,
        machine: slug(title),
        base_price: basePrice,
        minutes,
        price_by_quality: byQ && byQ.silver != null ? byQ : null,
        artisan,
        rancher,
        notes: notes.filter(Boolean),
        sources: [ref(gp), ref(mp, 'Products'), ref(app), artisanRule],
        verified,
        problems,
      });
      // One recipe per input: output count and quality come from the profitability table rows
      // (one per input quality) and must agree with the machine page's own sentences.
      for (const input of row.inputs) {
        const id = rawId(input);
        if (!id) continue;
        const inName = productRecords.find((x) => x.id === id).name;
        const rowsIn = appRows.filter((x) => x.item === inName && !x.profession);
        if (!rowsIn.length) {
          failures.push(`${app.title}: no rows for ${inName} -> ${gp.title}`);
          continue;
        }
        // The table also lists cask-aged cheese, so the machine's own output is the lowest output
        // quality shown for each input quality.
        const qs = [...new Set(rowsIn.map((x) => x.quality))];
        const lowest = Object.fromEntries(qs.map((q) => [q, QUALITIES.find((oq) => rowsIn.some((x) => x.quality === q && x.output_quality === oq))]));
        const sameAsInput = qs.length > 1 && qs.every((q) => lowest[q] === q);
        const outQ = sameAsInput ? 'input' : [...new Set(Object.values(lowest))];
        const count = Math.min(...rowsIn.map((x) => x.count));
        recipes.push({ input: id, output: slug(gp.title), count, quality: Array.isArray(outQ) ? (outQ.length === 1 ? outQ[0] : outQ) : outQ });
      }
    }
    machines.push({ id: slug(title), name: title, sources: [ref(mp, 'Products'), ref(app), ref(artisanPage, title)], recipes });
  }

  // The machine pages' own sentences must say what the profitability table says.
  const recipe = (input, output) => machines.flatMap((m) => m.recipes).find((r) => r.input === input && r.output === output) || {};
  const mm = await page('Mayonnaise Machine');
  const cp = await page('Cheese Press');
  const loom = await page('Loom');
  const sentenceChecks = [
    [recipe('egg', 'mayonnaise').quality === 'normal' && recipe('large-egg', 'mayonnaise').quality === 'gold', cite(mm, /Regular white or brown chicken \[\[egg\]\]s produce normal quality Mayonnaise, and \[\[Large Egg\|Large white or brown chicken eggs\]\] produce gold-quality mayonnaise\./), cite(artisanPage, /Using a normal chicken \[\[Egg\]\] will produce normal quality \[\[Mayonnaise\]\], while using a \[\[Large Egg\|large chicken egg\]\] will produce a gold star quality \[\[Mayonnaise\]\]/)],
    [recipe('ostrich-egg', 'mayonnaise').count === 10 && recipe('ostrich-egg', 'mayonnaise').quality === 'input', cite(mm, /A single \[\[Ostrich Egg\]\] will produce 10 jars of Mayonnaise, with the quality of the Mayonnaise equal to the quality of the Ostrich Egg used\./), cite(artisanPage, /An \[\[Ostrich Egg\]\] produces ten \(10\) jars of \[\[Mayonnaise\]\] at once with the same star quality as the egg used\./)],
    [recipe('golden-egg', 'mayonnaise').count === 3 && recipe('golden-egg', 'mayonnaise').quality === 'gold', cite(mm, /A \[\[Golden Egg\]\] will produce three gold-quality Mayonnaise\./), cite(await page('Golden Chicken'), /produce 3 gold quality \[\[Mayonnaise\]\]/)],
    [recipe('milk', 'cheese').quality === 'normal' && recipe('large-milk', 'cheese').quality === 'gold' && recipe('goat-milk', 'goat-cheese').quality === 'normal' && recipe('large-goat-milk', 'goat-cheese').quality === 'gold', cite(cp, /Regular quality \[\[Milk\]\] produces regular quality \[\[Cheese\]\], and regular quality \[\[Goat Milk\]\] produces regular quality \[\[Goat Cheese\]\]\. \[\[Large Milk\]\] and \[\[Large Goat Milk\]\] produce gold quality cheeses\./), cite(artisanPage, /Using a \[\[Large Milk\]\] or \[\[Large Goat Milk\]\] will always give gold star quality/)],
    [['duck-egg', 'void-egg', 'dinosaur-egg'].every((e) => machines[0].recipes.find((r) => r.input === e)?.quality === 'normal'), cite(app, /\[\[Duck Mayonnaise\]\], \[\[Void Mayonnaise\]\], and \[\[Dinosaur Mayonnaise\]\] are always normal quality\./)],
  ];
  for (const [ok, ...src] of sentenceChecks) if (!ok) failures.push(`machine recipe disagrees with ${src.map((s) => s.title).join(' / ')}`);
  // Loom: chance of a second Cloth by Wool quality (two pages).
  const lm = loom.wikitext.match(/Silver gives a (\d+)% chance, gold gives a (\d+)% chance, and iridium gives a (\d+)% chance\./);
  const la = app.wikitext.match(/Silver quality wool = (\d+)% chance[\s\S]*?Gold quality wool = (\d+)% chance[\s\S]*?Iridium quality wool = (\d+)% chance/);
  const loomRecipe = recipe('wool', 'cloth');
  const lp = [];
  const lv = {};
  const extra = settle('Loom', 'extra_cloth_chance', [
    { source: loom.title, value: lm ? { silver: +lm[1] / 100, gold: +lm[2] / 100, iridium: +lm[3] / 100 } : undefined },
    { source: app.title, value: la ? { silver: +la[1] / 100, gold: +la[2] / 100, iridium: +la[3] / 100 } : undefined },
  ], lp, lv);
  loomRecipe.second_output_chance_by_input_quality = extra;
  if (lp.length) failures.push(...lp.map((x) => `Loom: ${x}`));

  /* ---------- Professions affecting these prices ---------- */
  const professions = {
    rancher: {
      sell_multiplier: Number(quote(skill, /\[\[Animals\|Animal\]\] products worth (\d+)% more\./)) / 100 + 1,
      wiki_wording: quote(skill, /(\[\[Animals\|Animal\]\] products worth \d+% more\.)/),
      applies_to: 'products with rancher: true',
      sources: [ref(skill)],
    },
    artisan: {
      sell_multiplier: Number(quote(artisanPage, /Artisan Goods will be worth (\d+)% more/)) / 100 + 1,
      wiki_wording: quote(artisanPage, /(Artisan Goods will be worth 40% more \(with the exception of \[\[Oil\]\] and \[\[Coffee\]\]\)\.)/),
      applies_to: 'artisan goods with artisan: true',
      sources: [artisanRule, cite(skill, /\[\[Artisan Goods\|Artisan goods\]\] \(wine, cheese, oil, etc\.\) worth 40% more\./)],
    },
    rounding_note: 'Rancher and Artisan prices in the wiki infoboxes equal floor(base x multiplier); the importer checks this for every normal-quality price above.',
  };

  /* ---------- Feeding ---------- */
  const hayMarnie = marnie.shop.Hay ? marnie.shop.Hay.price : undefined;
  const hayText = hayPage.wikitext.match(/from \[\[Marnie's Ranch\]\] for \{\{Price\|([\d,]+)\}\}/);
  const fProblems = [];
  const fVerified = {};
  const hayPrice = settle('feeding', 'hay_price', [{ source: marniePage.title, value: hayMarnie }, { source: hayPage.title, value: hayText ? num(hayText[1]) : undefined }], fProblems, fVerified);
  const perDay = settle('feeding', 'hay_per_animal_per_day', [
    { source: hayPage.title, value: (hayPage.wikitext.match(/Animals eat (\d+) Hay per day as \[\[Animals#Food\|food\]\] whenever there is no fresh \[\[Grass\]\] available/) || [])[1] ? 1 * hayPage.wikitext.match(/Animals eat (\d+) Hay per day/)[1] : undefined },
    { source: animalsPage.title, value: /need to eat every day, one "portion" per animal/.test(animalsPage.wikitext) ? 1 : undefined },
  ], fProblems, fVerified);
  const feeding = {
    hay: { price: hayPrice, shop: 'marnie', per_animal_per_day: perDay },
    eats_hay_when: quote(hayPage, /(All \[\[Coop\]\]-dwelling and \[\[Barn\]\]-dwelling Animals eat 1 Hay per day as \[\[Animals#Food\|food\]\] whenever there is no fresh \[\[Grass\]\] available\.)/),
    stays_inside: quote(animalsPage, /(They will not go out in \[\[winter\]\], or when it is rainy, stormy, or snowy\.)/),
    grass_portion: quote(animalsPage, /(If eating fresh grass, coop animals need to eat 2 tufts of grass \(1 tuft of Blue Grass\), and barn animals need to eat 4 \(2 tufts of Blue Grass\)\.)/),
    unfed: quote(animalsPage, /(They do not die if not fed, but become \[\[#Mood\|upset\]\] and cease production of animal products until feeding resumes\.)/),
    babies: quote(animalsPage, /(If they don't have food, they do not grow on that day\.)/),
    autofeed: quote(coopPage, /(The Deluxe Coop features an Autofeed System; \[\[hay\]\] from your \[\[silo\]\]s will be automatically distributed\.)/),
    production_rules: [
      quote(animalsPage, /(If the animal was not fed, it will not produce\.)/),
      quote(animalsPage, /(If the animal has less than 70 Mood, there is a chance it will not produce\.[^\n]*)/),
    ],
    sources: [ref(marniePage, 'Shop Inventory'), ref(hayPage), ref(animalsPage, 'Food')],
    verified: fVerified,
    problems: fProblems,
  };

  /* ---------- Write ---------- */
  const fixture = {
    sources: [ref(animalsPage), ref(farming)],
    quality_table: { friendship: qMax ? +qMax[1] : null, mood: qMax ? +qMax[2] : null, rows: qTable },
    quality_example: qualityExample,
    deluxe_examples: examples,
  };
  const out = {
    schema: 'stardew-tools/animals@1',
    game_version: GAME_VERSION,
    generated: today,
    last_verified: today,
    source: 'Stardew Valley Wiki (CC BY-NC-SA 3.0), cross-checked between each animal page, Animals, Marnie\'s Ranch, Coop/Barn, product pages and Animal Products Profitability',
    professions,
    feeding,
    quality,
    deluxe_rules: deluxeRules,
    animals: animalRecords,
    products: productRecords.sort((a, b) => a.name.localeCompare(b.name)),
    artisan: { minutes_note: quote(artisanPage, /(One hour = 60 minutes from 6am to 2am, but 1 hour = 100 minutes from 2am to 6am\.)/), machines, goods },
  };
  if (failures.length) {
    console.error('Animal import failed:\n  ' + failures.join('\n  '));
    process.exit(1);
  }
  writeFileSync(join(ROOT, 'data', 'animals.json'), JSON.stringify(out, null, 2) + '\n');
  writeFileSync(join(ROOT, 'tests', 'fixtures', 'animal-formulas.json'), JSON.stringify(fixture, null, 1) + '\n');
  const bad = animalRecords.filter((r) => r.problems.length);
  console.log(`${animalRecords.length} animals, ${productRecords.length} products, ${goods.length} artisan goods written; ${bad.length} animals need verification`);
  for (const r of bad) console.log(`  ${r.name}: ${r.problems.join('; ')}`);
  for (const g of goods.filter((x) => x.problems.length)) console.log(`  ${g.name}: ${g.problems.join('; ')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

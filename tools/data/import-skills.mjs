#!/usr/bin/env node
// Builds data/skills.json from the Stardew Valley Wiki: the XP needed for each skill level, the
// Mastery point thresholds, Farming XP per crop harvest, Fishing XP per fish (difficulty and the
// wiki's XP formula), and the main per-action XP values for Foraging, Mining and Combat.
//
// Nothing is typed in by hand. Every number is parsed from wiki pages and must be read from at
// least two wiki pages (or a page plus the wiki's own rendering of it) that agree. A source that
// disagrees is written to the record's `problems` and the record is marked "needs-verification";
// a value with fewer than two sources, or a missing evidence sentence, fails the import. Values the
// wiki states on only one page are left out (see `skipped`). Files are written only once every
// check has passed.
//
// Sources: "Skills" (wikitext and rendered), "Farming", "Fishing", "Fish", "Foraging", "Mining",
// "Combat", "Mastery Cave", "Books", each crop page, each fish page, each monster page, and the
// pages of the individual XP sources ("Crab Pot", "Trash", "Trees", "Large Stump", ...).
//
//   node tools/data/import-skills.mjs [--cached]
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

/** The wiki text matched by a pattern (group 1 if present), cleaned to plain text. Missing = failure. */
function quote(p, re) {
  const m = p.wikitext.match(re);
  if (!m) {
    failures.push(`${p.title}: evidence not found ${re}`);
    return null;
  }
  return plain(m[1] ?? m[0]);
}

/** A number read from a page by a pattern (group 1), or undefined when the page does not say it. */
function read(p, re) {
  const m = p.wikitext.match(re);
  if (!m) return undefined;
  const w = WORDS[m[1].toLowerCase()];
  return w ?? num(m[1]);
}
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5 };

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
      .replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/g, '')
      .replace(/<\/?(?:code|span|samp|b|i|p)[^>]*>/g, '')
      .replace(/&times;/g, '×'),
  )
    .replace(/'''?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const num = (s) => Number(String(s).replace(/,/g, ''));

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

/**
 * Rows of every wikitable in a piece of wikitext, as arrays of raw cell strings. Handles both
 * one-cell-per-line and `| a || b` rows; header cells (!) are skipped.
 */
export function tableRows(wikitext) {
  const rows = [];
  let row = null;
  for (const line of wikitext.split('\n')) {
    if (/^\{\|/.test(line)) row = null;
    else if (/^\|-/.test(line) || /^\|\}/.test(line)) {
      if (row && row.length) rows.push(row);
      row = /^\|-/.test(line) ? [] : null;
    } else if (row && /^\|/.test(line)) {
      for (const cell of line.slice(1).split('||')) row.push(cell.replace(/^\s*(?:class|style|rowspan|colspan)="[^"]*"\s*\|/, '').trim());
    } else if (row && row.length && !/^!/.test(line) && line.trim()) row[row.length - 1] += '\n' + line;
  }
  return rows;
}

/** The Skills page's two-column XP table: [{level, xp, total}]. */
export function parseLevelTable(wikitext) {
  const out = [];
  for (const m of wikitext.matchAll(/^!\s*(\d+)\s*\n\|\s*\+?([\d,]+)\s*\n\|\s*([\d,]+)\s*$/gm)) out.push({ level: +m[1], xp: num(m[2]), total: num(m[3]) });
  return out;
}

/** A "! Lvl | total" table whose first numeric data column is the total (Farming parsnips table, Fishing table). */
export function parseTotalsTable(wikitext, totalCol) {
  const out = {};
  for (const m of wikitext.matchAll(/^!\s*(\d+)\s*\n((?:\|[^\n]*\n?)+)/gm)) {
    const cells = m[2].split('\n').filter((l) => l.startsWith('|')).map((l) => l.slice(1).trim());
    const v = cells[totalCol];
    if (v != null && /^[\d,]+\*?$/.test(v)) out[+m[1]] = num(v.replace('*', ''));
  }
  return out;
}

/** Farming page seasonal crop tables: {crop name: xp}. Duplicates (multi-season crops) must agree. */
export function parseCropXpTables(wikitext) {
  const out = {};
  const conflicts = [];
  for (const m of wikitext.matchAll(/^\|\{\{Name\|([^|}]+)\}\}\s*\n\|\s*(\d+)/gm)) {
    const name = m[1].trim();
    const xp = +m[2];
    if (name in out && out[name] !== xp) conflicts.push(`${name}: ${out[name]} vs ${xp}`);
    out[name] = xp;
  }
  return { xp: out, conflicts };
}

/** Farming XP stated on a crop page ("8 [[Farming#Experience Points|Farming XP]]", "Cactus Seeds: 14 [[Farming]] XP"). */
export function cropPageXp(wikitext) {
  // Pages of crops that also grow from a seasonal Wild Seeds pack (Grape) list that harvest first
  // ("[[Fall Seeds]]: 3 Farming XP"); the crop's own seed is the other entry.
  const all = [...wikitext.matchAll(/(?:\[\[([^\]|]+)\]\]|([A-Z][\w ]+)):?\s*(\d+) \[\[Farming(?:#Experience Points)?(?:\|Farming XP)?\]\]/g)];
  const own = all.filter((m) => !/^(Spring|Summer|Fall|Winter) Seeds$/.test((m[1] || m[2] || '').trim()));
  const m = own[0] || (all.length ? null : wikitext.match(/(\d+) \[\[Farming(?:#Experience Points)?(?:\|Farming XP)?\]\]/));
  return m ? +(m[3] ?? m[1]) : undefined;
}

/** First integer of an infobox price such as "{{Price|20}} (harvested)" or "75". */
export function firstInt(s) {
  const m = String(s ?? '').match(/(\d[\d,]*)/);
  return m ? num(m[1]) : undefined;
}

/** The wiki's crop XP formula: XP = ||16 × ln(0.018 × PRICE + 1)|| (|| || = rounded). */
export const cropXp = (price) => Math.round(16 * Math.log(0.018 * price + 1));

/** Fish page rows: [{name, difficulty, behavior, base_xp}] from every table with a Difficulty column. */
export function parseFishTable(wikitext) {
  const out = [];
  for (const row of tableRows(wikitext)) {
    const cells = row.map((c) => c.replace(/<section[^>]*\/>/g, '').trim());
    const di = cells.findIndex((c) => /^\d+ (?:mixed|dart|smooth|sinker|floater)$/i.test(c));
    if (di < 0) continue;
    const name = cells.map((c) => c.match(/^\[\[([^\]|#]+)\]\]$/)).find(Boolean);
    if (!name) continue;
    const [d, behavior] = cells[di].split(' ');
    out.push({ name: name[1], difficulty: +d, behavior: behavior.toLowerCase(), base_xp: /^\d+$/.test(cells[di + 1]) ? +cells[di + 1] : undefined });
  }
  return out;
}

/**
 * The wiki's fishing XP formula ("Fishing" page): base = (quality + 1) × 3 + difficulty / 3, then
 * × 2.2 with a treasure chest, × 2.4 for a perfect catch, × 5 for a legendary fish, truncating
 * after every step. quality is the original quality index (0 normal, 1 silver, 2 gold, 4 iridium
 * in the game, but a perfect catch uses the quality before the upgrade).
 */
export function fishXp({ difficulty, quality = 0, treasure = false, perfect = false, legendary = false }) {
  let xp = Math.trunc((quality + 1) * 3 + difficulty / 3);
  if (treasure) xp = Math.trunc(xp * 2.2);
  if (perfect) xp = Math.trunc(xp * 2.4);
  if (legendary) xp = Math.trunc(xp * 5);
  return xp;
}

/** Combat page monster table: [{label, link, xp}]. */
export function parseMonsterTable(wikitext) {
  const out = [];
  for (const row of tableRows(wikitext)) {
    if (row.length !== 2 || !/^\d+$/.test(row[1])) continue;
    const m = row[0].match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
    if (!m) continue;
    out.push({ label: (m[2] || m[1]).trim(), link: m[1].trim(), xp: +row[1] });
  }
  return out;
}

/**
 * XP for one monster from its page's infobox `exp`: a plain number when the page is that monster,
 * or "[[File:Frost Bat.png|..]] 07" style lists on shared pages. undefined when not stated.
 */
export function monsterPageXp(exp, label, pageTitle) {
  if (!exp) return undefined;
  const e = exp.trim();
  if (/^\d+$/.test(e)) return pageTitle === label ? +e : undefined;
  const parts = e.split(/,\s*/);
  for (const part of parts) {
    const files = [...part.matchAll(/\[\[File:([^\].|]+)(?: Dangerous)?\.png/g)].map((m) => m[1].replace(/ Dangerous$/, ''));
    const n = part.match(/(\d+)\s*$/);
    if (n && files.includes(label)) return +n[1];
  }
  return undefined;
}

/**
 * Settles one value from several sources: the first defined value is taken, at least two sources
 * must state it, and any source that disagrees goes to problems.
 */
export function settle(where, field, sources, problems, verified) {
  const stated = sources.filter((s) => s.value !== undefined && s.value !== null);
  if (stated.length < 2) {
    failures.push(`${where}: ${field} stated by ${stated.length} source(s) (${stated.map((s) => s.source).join(', ') || 'none'}), need 2`);
    return stated[0]?.value ?? null;
  }
  const value = stated[0].value;
  const agree = stated.filter((s) => JSON.stringify(s.value) === JSON.stringify(value));
  for (const s of stated) if (JSON.stringify(s.value) !== JSON.stringify(value)) problems.push(`${field}: ${stated[0].source} says ${JSON.stringify(value)}, ${s.source} says ${JSON.stringify(s.value)}`);
  verified[field] = agree.map((s) => s.source);
  return value;
}

/** {total_1: S, total_2: S, ...} -> {total: S} when every level was checked against the same sources. */
export function compact(verified, prefix) {
  const keys = Object.keys(verified).filter((k) => k.startsWith(prefix + '_'));
  const same = keys.length && keys.every((k) => JSON.stringify(verified[k]) === JSON.stringify(verified[keys[0]]));
  if (!same) return verified;
  const out = { [`${prefix}_each_level`]: verified[keys[0]] };
  for (const [k, v] of Object.entries(verified)) if (!keys.includes(k)) out[k] = v;
  return out;
}

export const status = (problems) => (problems.length ? 'needs-verification' : 'cross-checked');

/* ------------------------------------------------------------------ import */

/** One per-action XP record, the value settled from at least two page statements. */
function action(id, skill, label, statements, extra = {}) {
  const problems = [];
  const verified = {};
  const xp = settle(`${skill} ${id}`, 'xp', statements.map((s) => ({ source: s.p.title, value: read(s.p, s.re) })), problems, verified);
  const evidence = statements.map((s) => {
    const m = s.p.wikitext.match(s.ev || s.re);
    if (!m) failures.push(`${s.p.title}: evidence not found ${s.ev || s.re}`);
    return `${s.p.title}: "${m ? plain(s.ev ? m[1] ?? m[0] : m[0]).replace(/^[*\s]+/, '') : ''}"`;
  });
  return { id, action: label, xp, ...extra, evidence, sources: statements.map((s) => ref(s.p, s.anchor)), verified, problems, verification_status: status(problems) };
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const skills = await page('Skills');
  const skillsHtml = await rendered('Skills');
  const farming = await page('Farming');
  const fishing = await page('Fishing');
  const fishPage = await page('Fish');
  const foraging = await page('Foraging');
  const mining = await page('Mining');
  const combat = await page('Combat');
  const mastery = await page('Mastery Cave');
  const books = await page('Books');
  const skipped = [];

  /* ---------- Levels ---------- */
  const table = parseLevelTable(skills.wikitext);
  const farmTotals = parseTotalsTable(farming.wikitext.slice(farming.wikitext.indexOf('Total Lifetime Parsnips')), 1);
  const fishTotals = parseTotalsTable(fishing.wikitext.slice(fishing.wikitext.indexOf('The XP required for leveling up')), 0);
  const lp = [];
  const lv = {};
  if (table.length !== 10) failures.push(`Skills: level table has ${table.length} rows, need 10`);
  let running = 0;
  const levels = table.map((row) => {
    running += row.xp;
    const total = settle(`level ${row.level}`, `total_${row.level}`, [
      { source: `${skills.title} (Total Experience)`, value: row.total },
      { source: `${skills.title} (sum of increments)`, value: running },
      { source: `${farming.title} (parsnip table)`, value: farmTotals[row.level] },
      { source: `${fishing.title} (level table)`, value: fishTotals[row.level] },
    ], lp, lv);
    return { level: row.level, xp_from_previous: row.xp, total };
  });
  const levelBlock = {
    applies_to: ['farming', 'fishing', 'foraging', 'mining', 'combat'],
    evidence: [
      `${skills.title}: "${quote(skills, /(All skills need the following experience points to increase skill level:)/)}"`,
      `${fishing.title}: "${quote(fishing, /(The XP required for leveling up is the same as for all skills:)/)}"`,
    ],
    thresholds: levels,
    sources: [ref(skills), ref(farming, 'Experience Points'), ref(fishing, 'Experience Points')],
    verified: compact(lv, 'total'),
    problems: lp,
    verification_status: status(lp),
  };

  /* ---------- Mastery ---------- */
  const mRows = [...mastery.wikitext.matchAll(/^!\s*(\d)\s*\n\|\s*([\d,]+)\s*\n\|\s*([\d,]+)\s*$/gm)].map((m) => ({ level: +m[1], points: num(m[2]), total: num(m[3]) }));
  const htmlRows = [...skillsHtml.html.matchAll(/<th>\s*(\d)\s*<\/th>\s*<td>\s*([\d,]+)\s*<\/td>\s*<td>\s*([\d,]+)\s*<\/td>/g)].map((m) => ({ level: +m[1], points: num(m[2]), total: num(m[3]) })).filter((r) => r.total >= 10000);
  const mp = [];
  const mv = {};
  let mRun = 0;
  const masteryLevels = mRows.map((r) => {
    mRun += r.points;
    const h = htmlRows.find((x) => x.level === r.level);
    const total = settle(`mastery ${r.level}`, `total_${r.level}`, [
      { source: `${mastery.title} (Total Mastery Points)`, value: r.total },
      { source: `${mastery.title} (sum of per-level points)`, value: mRun },
      { source: `${skillsHtml.title} (rendered transclusion)`, value: h?.total },
    ], mp, mv);
    return { level: r.level, points: r.points, total };
  });
  if (masteryLevels.length !== 5) failures.push(`Mastery Cave: ${masteryLevels.length} mastery levels, need 5`);
  const allFive = read(mastery, /they can earn ([\d,]+) Mastery points before claiming any mastery and then claim all five at once/);
  if (allFive !== masteryLevels.at(-1)?.total) mp.push(`total: table says ${masteryLevels.at(-1)?.total}, sentence says ${allFive}`);
  // Rates: Mastery Cave and Skills both say farming counts 50%; Books' numbers must agree (Almanac 250 XP = 125 points).
  const rateRe = /Farming experience points only contribute to mastery points at a (\d+)% rate, while experience points for the rest of the skills contribute to mastery points at a (\d+)% rate/;
  const farmRate = settle('mastery', 'farming_rate', [
    { source: mastery.title, value: read(mastery, rateRe) },
    { source: skills.title, value: read(skills, rateRe) },
    { source: `${books.title} (Almanac 250 XP = 125 points)`, value: read(books, /Reading the \[\[Stardew Valley Almanac\]\] gives 250 XP in Farming, or (\d+) Mastery points/) / 250 * 100 },
  ], mp, mv) / 100;
  const otherM = mastery.wikitext.match(rateRe);
  const bookStars = read(books, /they will instead earn ([\d,]+) \[\[Skills#Mastery\|Mastery\]\] points/);
  const otherRate = otherM ? +otherM[2] / 100 : null;
  if (bookStars !== 250 * farmRate + 4 * 250 * otherRate) mp.push(`Book Of Stars: ${bookStars} mastery points != 250 × ${farmRate} + 4 × 250 × ${otherRate}`);
  const masteryBlock = {
    note: 'Mastery points are earned only after every skill is level 10; they are a separate pool, not skill levels.',
    xp_rate: { farming: farmRate, other_skills: otherRate },
    levels: masteryLevels,
    evidence: [
      `${mastery.title}: "${quote(mastery, /(Each mastery claimed costs progressively more mastery points than the previous one, defining five levels of costs\.)/)}"`,
      `${mastery.title}: "${quote(mastery, /(Farming experience points only contribute to mastery points at a 50% rate, while experience points for the rest of the skills contribute to mastery points at a 100% rate\.)/)}"`,
      `${books.title}: "${quote(books, /(Reading the \[\[Stardew Valley Almanac\]\] gives 250 XP in Farming, or 125 Mastery points\.)/)}"`,
    ],
    sources: [ref(mastery, 'Mastery Points'), ref(skills, 'Mastery'), ref(books)],
    verified: compact(mv, 'total'),
    problems: mp,
    verification_status: status(mp),
  };

  /* ---------- Farming: crops ---------- */
  const crops = JSON.parse(readFileSync(join(ROOT, 'data', 'crops.json'), 'utf8')).crops;
  const tableXp = parseCropXpTables(farming.wikitext);
  if (tableXp.conflicts.length) failures.push(`Farming: crop XP tables disagree with themselves: ${tableXp.conflicts.join('; ')}`);
  const formulaText = quote(farming, /(The experience points awarded are calculated using the formula <code>XP=\|\|16 &times; ln\(0\.018 &times; PRICE \+ 1\)\|\|<\/code> where PRICE is the base sell price of the crop[^.]*\.)/);
  const sunflowerNote = quote(farming, /<ref name="sunflower">([\s\S]*?)<\/ref>/);
  const sunflowerSeeds = await page('Sunflower Seeds');
  const cropRecords = [];
  for (const c of crops) {
    const p = await page(c.name);
    const box = infobox(p.wikitext);
    const problems = [];
    const verified = {};
    const notes = [];
    // The price the formula uses: the crop's own sell price, except Sunflower (the wiki: Sunflower Seeds are substituted).
    let priceItem = p.title;
    let price = firstInt(box.sellprice);
    if (c.id === 'sunflower') {
      priceItem = sunflowerSeeds.title;
      price = firstInt(infobox(sunflowerSeeds.wikitext).sellprice);
      notes.push(sunflowerNote);
    }
    if (price == null) failures.push(`${priceItem}: sell price not found`);
    else if (c.id !== 'sunflower' && price !== c.base_price) problems.push(`price: ${p.title} infobox ${price} != data/crops.json ${c.base_price}`);
    const xp = settle(`crop ${c.id}`, 'xp', [
      { source: `${farming.title} (crop XP table)`, value: tableXp.xp[c.name] ?? tableXp.xp[p.title] },
      { source: `${p.title} (page)`, value: cropPageXp(p.wikitext) },
      { source: `${farming.title} formula (price ${price} from ${priceItem})`, value: price != null ? cropXp(price) : undefined },
    ], problems, verified);
    if (c.yield && (c.yield.max > 1 || c.yield.extra_chance > 0)) notes.push('XP is given once per harvest, not per item (Farming: multi-yield crops "only reward experience for the first product").');
    cropRecords.push({
      id: c.id,
      name: c.name,
      xp,
      formula_price: price,
      formula_price_item: priceItem,
      regrows: c.regrow_days != null,
      notes,
      sources: [ref(farming, 'Experience Points'), ref(p), ...(c.id === 'sunflower' ? [ref(sunflowerSeeds)] : [])],
      verified,
      problems,
      verification_status: status(problems),
    });
  }
  const extraTable = Object.keys(tableXp.xp).filter((n) => !crops.some((c) => c.name === n));
  if (extraTable.length) skipped.push({ what: `Farming XP table crops not in data/crops.json: ${extraTable.join(', ')}`, why: 'no crop id to key them by' });

  const farmingOther = [
    action('animal-care', 'farming', 'Petting, milking, shearing a farm animal, or picking up an animal product inside a coop/barn (each)', [
      { p: farming, re: /picking up an animal product inside a \[\[coop\]\] gives (\d+) experience points each/, anchor: 'Experience Points' },
      { p: skills, re: /picking up an animal product inside a barn or coop each give (\d+) experience points/, anchor: 'Farming' },
    ], { note: plain('(Picking up [[Truffle]]s gives [[Foraging]] experience rather than Farming experience.)') }),
    action('wild-seeds-harvest', 'farming', 'Harvesting a forage plant grown from Wild Seeds (also gives 2 Foraging XP)', [
      { p: farming, re: /Wild Seeds\]\] grants (\d+) Farming experience points/, anchor: 'Experience Points' },
      { p: foraging, re: /items grown from \[\[Crafting#Seeds\|Wild Seeds\]\] \(also (\d+) \[\[Farming\]\] XP\)/, anchor: 'Experience Points' },
    ]),
    action('skill-book', 'farming', 'Reading Stardew Valley Almanac or Book Of Stars', [
      { p: farming, re: /(\d+) Farming XP is gained for reading/ },
      { p: books, re: /Reading the \[\[Stardew Valley Almanac\]\] gives (\d+) XP in Farming/ },
      { p: await page('Stardew Valley Almanac'), re: /players will earn (\d+) \[\[Farming\]\]/ },
    ]),
  ];
  const farmingRules = [
    quote(farming, /(Crops with multiple harvests give experience for every harvest\.)/),
    quote(farming, /(Crops that yield multiple produce per harvest, such as [^.]*? only reward experience for the first product and do not offer any extra experience for the multiples\.)/),
    quote(farming, /(High quality crops grant the same amount of XP as normal-quality crops\.)/),
  ];
  const fiber = await page('Fiber Seeds');
  if (cropPageXp(fiber.wikitext) === undefined) skipped.push({ what: 'Fiber (from Fiber Seeds)', why: 'neither Fiber Seeds nor Farming states a harvest XP' });

  /* ---------- Fishing ---------- */
  const fishRows = parseFishTable(fishPage.wikitext);
  const legendSection = fishPage.wikitext.slice(fishPage.wikitext.indexOf('===Legendary Fish==='), fishPage.wikitext.indexOf('===Legendary Fish II==='));
  const legendary = new Set(parseFishTable(legendSection).map((f) => f.name));
  if (legendary.size !== 5) failures.push(`Fish: ${legendary.size} legendary fish found, wiki says five`);
  const pondIds = new Set(JSON.parse(readFileSync(join(ROOT, 'data', 'fishponds.json'), 'utf8')).fish.map((f) => f.id));
  const fishRecords = [];
  for (const row of fishRows) {
    const p = await page(row.name);
    const box = infobox(p.wikitext);
    const problems = [];
    const verified = {};
    const isLegend = legendary.has(row.name);
    const difficulty = settle(`fish ${row.name}`, 'difficulty', [
      { source: `${fishPage.title} (table)`, value: row.difficulty },
      { source: `${p.title} (infobox)`, value: firstInt(box.difficulty) },
    ], problems, verified);
    const behavior = settle(`fish ${row.name}`, 'behavior', [
      { source: `${fishPage.title} (table)`, value: row.behavior },
      { source: `${p.title} (infobox)`, value: box.behavior ? box.behavior.trim().toLowerCase() : undefined },
    ], problems, verified);
    const baseXp = settle(`fish ${row.name}`, 'base_xp', [
      { source: `${fishPage.title} (Base XP column)`, value: row.base_xp },
      { source: `${fishing.title} formula`, value: fishXp({ difficulty, legendary: isLegend }) },
    ], problems, verified);
    const id = slug(p.title);
    fishRecords.push({
      id,
      name: p.title,
      difficulty,
      behavior,
      legendary: isLegend,
      base_xp: baseXp,
      in_fishponds: pondIds.has(id),
      sources: [ref(fishPage), ref(p)],
      verified,
      problems,
      verification_status: status(problems),
    });
  }
  const fishFormula = {
    expression: 'base = trunc((quality + 1) × 3 + difficulty / 3); then trunc(× 2.2) if treasure; trunc(× 2.4) if perfect; trunc(× 5) if legendary',
    quality_values: { normal: 0, silver: 1, gold: 2 },
    text: [
      quote(fishing, /<code>(XP = \(\(Fish Quality \+ 1\) \* 3\) \+ \(Fish Difficulty \/ 3\))<\/code>/),
      quote(fishing, /(XP is multiplied by 2\.2 if the player also catches a treasure chest, by 2\.4 if the catch was "perfect" and by 5 if the catch was a Legendary fish\.[^\n]*)/),
      quote(fishing, /(A perfect catch will increase a silver quality fish to gold quality, and a gold quality fish to iridium quality, but it is the original quality that is used in the XP equation\.)/),
      quote(fishPage, /(unlike the original legendary fish, it is possible to catch these fish more than once, and they do not share the same experience multiplicative factor of 5\.)/),
    ],
    examples: [
      { case: 'normal Sardine', inputs: { difficulty: 30 }, xp: read(fishing, /a regular quality sardine \(difficulty 30\) would net the player [^=]*= (\d+) XP/) },
      { case: 'perfect Sardine with treasure', inputs: { difficulty: 30, treasure: true, perfect: true }, xp: read(fishing, /28 \* 2\.4 = 67\.2 \(truncated to (\d+)\) XP/) },
      { case: 'perfect gold Sardine (becomes iridium)', inputs: { difficulty: 30, quality: 2, perfect: true }, xp: read(fishing, /\(\(2 \+ 1\) \* 3\) \+ \(30 \/ 3\) \* 2\.4 = (\d+) XP/) },
      { case: 'perfect gold Crimsonfish with treasure', inputs: { difficulty: 95, quality: 1, treasure: true, perfect: true, legendary: true }, xp: read(fishing, /194 \* 5 = (\d+) XP/) },
    ],
    sources: [ref(fishing, 'Experience Points'), ref(fishPage, 'Legendary Fish II')],
    problems: [],
  };
  // The wiki's own examples disagree on gold: the Sardine example uses (2 + 1) for gold, the
  // Crimsonfish example uses (1 + 1). Both examples are kept with the wiki's own inputs and the
  // disagreement is recorded.
  if (/perfect gold quality Crimsonfish \(difficulty 95\)[^(]*\(\(1 \+ 1\) \* 3\)/.test(fishing.wikitext) && /original gold quality multiplier, so the player would earn \(\(2 \+ 1\) \* 3\)/.test(fishing.wikitext)) {
    fishFormula.problems.push('Fishing page examples disagree on the gold quality value: the Sardine example uses (2 + 1) × 3, the Crimsonfish example uses (1 + 1) × 3 (970 XP; with gold = 2 it would be 1055).');
  }
  fishFormula.verification_status = status(fishFormula.problems);
  const ffp = [];
  for (const ex of fishFormula.examples) {
    if (ex.xp == null) failures.push(`Fishing: example "${ex.case}" not found`);
    else if (fishXp(ex.inputs) !== ex.xp) ffp.push(`example ${ex.case}: formula gives ${fishXp(ex.inputs)}, wiki says ${ex.xp}`);
  }
  if (ffp.length) failures.push(...ffp.map((x) => `Fishing formula: ${x}`));

  const crabPot = await page('Crab Pot');
  const cpSection = fishPage.wikitext.slice(fishPage.wikitext.indexOf('===Crab Pot Fish==='), fishPage.wikitext.indexOf('===Other Catchables==='));
  const crabPotFish = tableRows(cpSection).map((r) => r.map((c) => c.match(/^\[\[([^\]|#]+)\]\]$/)).find(Boolean)).filter(Boolean).map((m) => slug(m[1]));
  if (crabPotFish.length < 10) failures.push(`Fish: only ${crabPotFish.length} crab pot fish found`);
  const trash = await page('Trash');
  const seaweed = await page('Seaweed');
  const fishingOther = [
    action('crab-pot', 'fishing', 'Collecting from a crab pot (anything, including trash)', [
      { p: fishing, re: /crab pots earn the player (\d+) XP each time the player collects from them/, anchor: 'Experience Points' },
      { p: crabPot, re: /Harvesting a crab pot gives (\d+) \[\[Fishing\]\] experience points/ },
      { p: fishPage, re: /Fish caught in crab pots are usually normal quality and are worth (\d+) fishing XP/, anchor: 'Crab Pot Fish' },
      { p: trash, re: /Harvesting Trash from a \[\[Crab Pot\]\] grants (\d+) Fishing XP/ },
    ], { applies_to: crabPotFish }),
    // (crab pot catches are listed below under applies_to)
    action('non-fish-catch', 'fishing', 'Catching trash, seaweed or algae with a fishing rod', [
      { p: fishing, re: /All non-fish items caught with the fishing pole earn (\d+) XP each/, anchor: 'Experience Points' },
      { p: fishPage, re: /Each gives (\d+) \[\[fishing\]\] XP when caught/, anchor: 'Other Catchables' },
      { p: trash, re: /fishing pole\]\] grants (\d+) \[\[Fishing\]\] XP/ },
      { p: seaweed, re: /Catching Seaweed with a Fishing Pole always gives (\d+) \[\[Fishing\]\] XP/ },
    ]),
    action('skill-book', 'fishing', 'Reading Bait And Bobber or Book Of Stars', [
      { p: fishing, re: /(\d+) Fishing XP is gained for reading/ },
      { p: books, re: /Reading each of the other 4 skill books gives (\d+) XP in that skill/ },
    ]),
  ];
  skipped.push({ what: 'Fish Pond XP (quests, produce)', why: 'formula-driven per pond; data/fishponds.json already carries fishing_xp per quest' });

  /* ---------- Foraging ---------- */
  const fx = (re) => ({ p: foraging, re, anchor: 'Experience Points' });
  const trees = await page('Trees');
  const foragingActions = [
    action('tree', 'foraging', 'Chopping down a mature tree', [
      fx(/\* '''(\d+) XP''' for chopping down a \[\[Trees\|tree\]\]/),
      { p: trees, re: /\* (\d+) \[\[Foraging\]\] experience points\./, ev: /(\* \d+ \[\[Foraging\]\] experience points\.)/ },
    ]),
    action('tree-stump', 'foraging', 'Removing the stump of a chopped tree', [
      fx(/\* '''(\d+) XP''' for removing the tree stump/),
      { p: trees, re: /Removing the stump with an \[\[Axes\|Axe\]\] yields:[\s\S]*?\* (\d+) \[\[Foraging\]\] experience point\./, ev: /(\* \d+ \[\[Foraging\]\] experience point\.)/ },
    ]),
    action('large-stump-or-log', 'foraging', 'Removing a Large Stump or Large Log', [
      fx(/\* '''(\d+) XP''' for removing \[\[Large Stump\]\]s and \[\[Large Log\]\]s/),
      { p: await page('Large Stump'), re: /and (\d+) \[\[Foraging\]\] Experience points/ },
      { p: await page('Large Log'), re: /and (\d+) \[\[Foraging\]\] Experience points/ },
    ]),
    action('forage-item', 'foraging', 'Picking up a forage item from the ground', [
      fx(/\* '''(\d+) XP''' for each foraged item picked up from the ground/),
      { p: await page('Blackberry'), re: /\*Foraged from the ground: (\d+) \[\[Foraging#Experience Points\|Foraging XP\]\]/ },
      { p: seaweed, re: /picking up from the beach gives (\d+) \[\[Foraging\]\] XP/ },
    ]),
    action('berry-bush', 'foraging', 'Shaking a Salmonberry/Blackberry bush (per berry)', [
      fx(/\* '''(\d+) XP''' per berry for shaking/),
      { p: await page('Salmonberry'), re: /Salmonberries harvested from bushes grant (\d+) Foraging XP per berry/ },
      { p: await page('Blackberry'), re: /\* (\d+) Foraging XP is granted for each Blackberry collected this way/ },
    ]),
    action('moss', 'foraging', 'Collecting Moss from a tree (per moss)', [
      fx(/\* '''(\d+) XP''' for each piece of \[\[Moss\]\]/),
      { p: await page('Moss'), re: /Each Moss collected gives the player (\d+) \[\[Foraging\]\] XP/ },
    ]),
    action('ginger', 'foraging', 'Harvesting Ginger', [
      fx(/\* '''(\d+) XP''' for each \[\[Ginger\]\] harvested/),
      { p: await page('Ginger'), re: /Harvesting Ginger now grants (\d+) \[\[Foraging\]\] XP/ },
    ]),
    action('spring-onion', 'foraging', 'Harvesting a Spring Onion', [
      fx(/\* '''(\d+) XP''' for each \[\[Spring Onion\]\] harvested/),
      { p: await page('Spring Onion'), re: /Harvesting a Spring Onion grants the player (\d+) Foraging XP/ },
    ]),
    action('wild-seeds-harvest', 'foraging', 'Harvesting a plant grown from Wild Seeds (also gives 3 Farming XP)', [
      fx(/\* '''(\d+) XP''' for items grown from \[\[Crafting#Seeds\|Wild Seeds\]\]/),
      { p: farming, re: /grants 3 Farming experience points and (\d+) \[\[Foraging\]\] experience points per plant/, anchor: 'Experience Points' },
    ]),
    action('mushroom-log', 'foraging', 'Collecting a mushroom from a Mushroom Log or the Farm Cave', [
      fx(/\* '''(\d+) XP''' for each mushroom collected/),
      { p: await page('Mushroom Log'), re: /Mushroom Logs grant (\d+) \[\[foraging\]\] XP on harvest/ },
    ]),
    action('skill-book', 'foraging', "Reading Woodcutter's Weekly or Book Of Stars", [
      fx(/\* '''(\d+) XP''' for reading a copy of the \[\[Woodcutter's Weekly\]\]/),
      { p: books, re: /Reading each of the other 4 skill books gives (\d+) XP in that skill/ },
    ]),
  ];
  skipped.push({ what: 'Foraging: twigs (1), panning items (7), Farm Cave fruit (7), Seed/Artifact Spots (15), Green Rain weeds (15)', why: 'stated only on the Foraging page' });

  /* ---------- Mining ---------- */
  const pans = await page('Pans');
  const miningActions = [
    action('panning-ore', 'mining', 'Each piece of ore obtained from panning', [
      { p: mining, re: /(One) XP is given for each piece of ore gained from \[\[Pans\|panning\]\]/, anchor: 'Experience Points' },
      { p: pans, re: /Each ore obtained from panning gives (\d+) point of \[\[mining\]\] experience/ },
    ]),
    action('skill-book', 'mining', 'Reading Mining Monthly or Book Of Stars', [
      { p: mining, re: /(\d+) Mining XP is gained for reading/, anchor: 'Experience Points' },
      { p: books, re: /Reading each of the other 4 skill books gives (\d+) XP in that skill/ },
    ]),
  ];
  skipped.push({ what: 'Mining: rock and node XP table (copper 5, iron 12, gold 18, iridium 50, gems ...)', why: 'stated only on the Mining page; no node or ore page repeats the values' });

  /* ---------- Combat ---------- */
  const monsterRows = parseMonsterTable(combat.wikitext);
  const monsters = [];
  const noSecond = [];
  for (const row of monsterRows) {
    const p = await page(row.link);
    const pageXp = monsterPageXp(infobox(p.wikitext).exp, row.label, p.title);
    if (pageXp === undefined) {
      noSecond.push(row.label);
      continue;
    }
    const problems = [];
    const verified = {};
    const xp = settle(`monster ${row.label}`, 'xp', [
      { source: `${combat.title} (table)`, value: row.xp },
      { source: `${p.title} (infobox)`, value: pageXp },
    ], problems, verified);
    monsters.push({ id: slug(row.label), name: row.label, xp, sources: [ref(combat, 'Experience Points'), ref(p)], verified, problems, verification_status: status(problems) });
  }
  if (monsters.length < 10) failures.push(`Combat: only ${monsters.length} monsters cross-checked`);
  if (noSecond.length) skipped.push({ what: `Combat monsters: ${noSecond.join(', ')}`, why: 'monster page infobox does not give a single XP for that monster' });
  const combatOther = [
    action('skill-book', 'combat', 'Reading Combat Quarterly or Book Of Stars', [
      { p: combat, re: /(\d+) Combat XP is gained for reading/, anchor: 'Experience Points' },
      { p: books, re: /Reading each of the other 4 skill books gives (\d+) XP in that skill/ },
    ]),
  ];
  const farmRule = quote(combat, /(Note that killing monsters on \[\[the Farm\]\] grants only 1\/3 of the standard amount of experience\.)/);

  /* ---------- Write ---------- */
  const all = [levelBlock, masteryBlock, ...cropRecords, ...farmingOther, ...fishRecords, ...fishingOther, ...foragingActions, ...miningActions, ...monsters, ...combatOther];
  for (const r of all) if (!r.sources?.length || r.sources.some((s) => !Number.isInteger(s.revid) || !s.url.startsWith('https://stardewvalleywiki.com/'))) failures.push(`bad sources on ${r.id || 'block'}`);
  if (failures.length) {
    console.error('Skills import failed:\n  ' + failures.join('\n  '));
    process.exit(1);
  }
  const fileSources = [skills, farming, fishing, fishPage, foraging, mining, combat, mastery, books].map((p) => ref(p));
  const out = {
    schema: 'stardew-tools/skills@1',
    game_version: GAME_VERSION,
    generated: today,
    last_verified: today,
    source: 'Stardew Valley Wiki (CC BY-NC-SA 3.0), cross-checked between Skills, the skill pages, Mastery Cave, Books, crop pages, fish pages and monster pages',
    sources: fileSources,
    levels: levelBlock,
    mastery: masteryBlock,
    farming: {
      crop_formula: { expression: 'xp = round(16 × ln(0.018 × price + 1))', text: formulaText, rules: farmingRules, sources: [ref(farming, 'Experience Points')] },
      crops: cropRecords,
      other: farmingOther,
    },
    fishing: { formula: fishFormula, fish: fishRecords, other: fishingOther },
    foraging: { actions: foragingActions },
    mining: { actions: miningActions },
    combat: { farm_rule: farmRule, monsters, other: combatOther },
    skipped,
  };
  writeFileSync(join(ROOT, 'data', 'skills.json'), JSON.stringify(out, null, 2) + '\n');
  const bad = all.filter((r) => r.problems?.length);
  console.log(`skills.json: ${levels.length} levels, ${masteryLevels.length} mastery levels, ${cropRecords.length} crops, ${fishRecords.length} fish, ${foragingActions.length} foraging, ${miningActions.length} mining, ${monsters.length} monsters; ${bad.length} need verification`);
  for (const r of bad) console.log(`  ${r.id || r.name || 'block'}: ${r.problems.join('; ')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

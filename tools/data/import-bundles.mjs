#!/usr/bin/env node
// Builds data/bundles.json from the Stardew Valley Wiki: the Community Center rooms, every
// standard bundle and every Remixed Bundles variant (with which ones the game picks at random),
// the items each bundle asks for (quantity, minimum quality, how many slots must be filled), the
// rewards, and a short "how to get it" note plus the seasons for every item.
//
// Nothing is typed in by hand. Sources and cross-checks:
//   - "Bundles" (wikitext): standard bundles, room rewards, item notes.
//   - "Modding:Bundles" (raw game data Data/Bundles): item count, quantity, minimum quality and
//     slots of every standard bundle, reward quantity and Vault gold. Item names are mapped to the
//     raw numeric ids by position, and an id must mean the same item in every bundle.
//   - "Remixed Bundles" (wikitext) and its rendered HTML: remixed bundles; slots, quantities and
//     qualities must agree between the two. Room rewards must agree with "Bundles".
//   - Every item page: must mention the bundle in its "Bundles" section (via {{Bundle}} or a link);
//     its infobox season is compared with the season words in the bundle notes (and data/crops.json).
//   - Every reward item page must mention the bundle it is the reward for.
//   - "Template:Bundle" resolves the {{Bundle|...}} aliases item pages use.
// A disagreement goes into the record's `problems` (verification_status "needs-verification");
// a value without a second source or a missing evidence sentence fails the import. Files are only
// written once every check has passed.
//
//   node tools/data/import-bundles.mjs [--cached]
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

export const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];
export const QUALITY_BY_NUMBER = ['normal', 'silver', 'gold', 'iridium'];

/** [[Target|Label]] -> Label, [[Target]] -> Target. */
export const unlink = (s) => s.replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1');

/** Wiki markup -> plain sentence. */
export function plain(s) {
  return unlink(
    String(s)
      .replace(/\[\[File:[^\]]*\]\]/g, '')
      .replace(/\{\{Price\|([\d,]+)\}\}/g, '$1g')
      .replace(/\{\{Name\|([^|}]+)[^}]*\}\}/g, '$1')
      .replace(/\{\{Season\|([^|}]+)[^}]*\}\}/g, '$1')
      .replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<br\s*\/?>/g, '; ')
      .replace(/<\/?(?:code|span|samp|b|i|small|p|table|tr|td)[^>]*>/g, ' '),
  )
    .replace(/'''?/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#8776;/g, '~')
    .replace(/&#9825;/g, '♡')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;)])/g, '$1')
    .replace(/;\s*;/g, ';')
    .trim();
}

/** Short "how to get it" text: plain text, cut at a clause boundary after ~150 characters. */
export function shortNote(s) {
  const t = plain(s).replace(/^[;,\s]+|[;,\s]+$/g, '');
  if (t.length <= 160) return t;
  const cut = t.slice(0, 150);
  const at = Math.max(cut.lastIndexOf(', '), cut.lastIndexOf('; '));
  return (at > 60 ? cut.slice(0, at) : cut).trim() + ' …';
}

/** Season names mentioned in a text. "All Seasons" = all four, "all seasons except X" drops X,
 * and "Winter with a Rain Totem" style exceptions are ignored. */
export function seasonsIn(s) {
  const t = plain(s || '')
    .replace(/\([^)]*Totem[^)]*\)/gi, '')
    .replace(/\b(?:Spring|Summer|Fall|Winter)\s+(?:w\/|with)\s+(?:a\s+)?Rain Totem/gi, '');
  const except = t.match(/\ball seasons except (Spring|Summer|Fall|Winter)\b/i);
  if (except) return SEASONS.filter((x) => x.toLowerCase() !== except[1].toLowerCase());
  if (/\ball seasons\b/i.test(t)) return [...SEASONS];
  return SEASONS.filter((x) => new RegExp(`\\b${x}\\b`, 'i').test(t));
}

/** Seasons from an item infobox `season` value; "X with Rain Totem" parts are ignored. */
export function infoboxSeasons(v) {
  if (v == null || !String(v).trim()) return null;
  const parts = String(v)
    .split(/•|<br\s*\/?>|,|\n/)
    .filter((x) => !/\bwith\b|Totem|Greenhouse|Ginger Island/i.test(x));
  if (parts.some((x) => /^\s*(All|All Seasons|Any)\b/i.test(plain(x)))) return [...SEASONS];
  const out = SEASONS.filter((s) => parts.some((x) => new RegExp(`\\b${s}\\b`, 'i').test(plain(x))));
  return out.length ? out : null;
}

/** Season row of a rendered infobox (HTML) -> seasons. */
export function renderedSeasons(html) {
  const m = html.match(/id="infoboxsection">\s*Season:?\s*<\/td>\s*<td id="infoboxdetail">([\s\S]*?)<\/td>/);
  if (!m) return null;
  return infoboxSeasons(m[1].replace(/<br\s*\/?>/g, ' • ').replace(/<img[^>]*alt="All Seasons Icon\.png"[^>]*>/g, '').replace(/<[^>]+>/g, ' ').replace(/&#160;/g, ' '));
}

/** Template parameters of the page's first {{Infobox ...}}. */
export function infobox(wikitext) {
  const start = wikitext.search(/\{\{Infobox/);
  if (start < 0) return {};
  const end = matchBraces(wikitext, start);
  const out = {};
  // A parameter runs until the next line that starts a new "|name =" parameter.
  for (const m of wikitext.slice(start, end - 2).matchAll(/^\|\s*([a-z0-9_]+)\s*=([\s\S]*?)(?=\n\|\s*[a-z0-9_]+\s*=|$(?![\s\S]))/gm)) out[m[1]] = m[2].trim();
  return out;
}

function matchBraces(s, start) {
  let depth = 0;
  for (let i = start; i < s.length - 1; i++) {
    if (s.startsWith('{{', i)) {
      depth++;
      i++;
    } else if (s.startsWith('}}', i)) {
      depth--;
      i++;
      if (depth === 0) return i + 1;
    }
  }
  return s.length;
}

/** Top-level template arguments: "Name|X|5|link=Y" -> { pos: ['X','5'], named: { link: 'Y' } }. */
function templateArgs(inner) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < inner.length; i++) {
    if (inner.startsWith('{{', i) || inner.startsWith('[[', i)) {
      depth++;
      cur += inner.slice(i, i + 2);
      i++;
    } else if (inner.startsWith('}}', i) || inner.startsWith(']]', i)) {
      depth--;
      cur += inner.slice(i, i + 2);
      i++;
    } else if (inner[i] === '|' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else cur += inner[i];
  }
  parts.push(cur);
  const pos = [];
  const named = {};
  for (const p of parts.slice(1)) {
    const m = p.match(/^\s*([a-z]+)\s*=([\s\S]*)$/);
    if (m) named[m[1]] = m[2].trim();
    else pos.push(p.trim());
  }
  return { name: parts[0].trim(), pos, named };
}

/** Every {{Name|...}} and {{Quality|...}} item reference in a piece of wikitext, in order. */
export function itemRefs(s) {
  const out = [];
  const re = /\{\{(Name|Quality)\|/g;
  let m;
  while ((m = re.exec(s))) {
    const end = matchBraces(s, m.index);
    const t = templateArgs(s.slice(m.index + 2, end - 2));
    re.lastIndex = end;
    const name = t.pos[0];
    if (t.name === 'Name') {
      const link = t.named.link ? t.named.link.replace(/\{\{!\}\}.*$/, '').trim() : name;
      const qty = /^\d[\d,]*$/.test(t.pos[1] || '') ? Number(t.pos[1].replace(/,/g, '')) : null;
      out.push({ name, page: link, qty, quality: null, at: m.index, end });
    } else {
      out.push({ name, page: name, qty: null, quality: (t.pos[1] || 'normal').toLowerCase(), at: m.index, end });
    }
  }
  return out;
}

/** Splits a wiki table body into rows ("|-" at depth 0) and each row into cells. */
export function tableRows(table) {
  const lines = table.split('\n');
  const rows = [[]];
  let depth = 0;
  let cell = null;
  for (const line of lines) {
    const t = line.trim();
    if (depth === 0 && /^\|-/.test(t)) {
      if (cell != null) rows[rows.length - 1].push(cell);
      cell = null;
      rows.push([]);
      continue;
    }
    if (depth === 0 && /^\|\}/.test(t)) break;
    if (/^\{\|/.test(t)) depth++;
    if (depth > 0 && /^\|\}/.test(t)) {
      depth--;
      cell = (cell ?? '') + '\n' + line;
      continue;
    }
    if (depth === 0 && /^[|!]/.test(t)) {
      if (cell != null) rows[rows.length - 1].push(cell);
      // "| attr | content" -> content; inline "||" separators split cells.
      for (const [i, part] of t.slice(1).split('||').entries()) {
        const c = part.replace(/^\s*(?:(?:rowspan|colspan|style|class|id)="[^"]*"\s*)+\|/, '');
        if (i > 0) rows[rows.length - 1].push(cell);
        cell = c;
      }
      continue;
    }
    cell = (cell ?? '') + '\n' + line;
  }
  if (cell != null) rows[rows.length - 1].push(cell);
  return rows.filter((r) => r.length);
}

/** Every bundle table in a stretch of wikitext: [{anchor, name, start, end, text}]. */
export function bundleTables(s) {
  const out = [];
  const re = /\{\|\s*class="wikitable"[^\n]*\n\|-\n!\s*id="([^"]+)"[^|\n]*\|([^\n]*)/g;
  const re2 = /\{\|\s*class="wikitable"[^\n]*\n!\s*id="([^"]+)"[^|\n]*\|([^\n]*)/g;
  for (const r of [re, re2]) {
    let m;
    while ((m = r.exec(s))) {
      // Find the matching "|}" (nested "{|" tables count).
      let depth = 0;
      let end = s.length;
      const lineRe = /^.*$/gm;
      lineRe.lastIndex = m.index;
      let l;
      while ((l = lineRe.exec(s))) {
        const t = l[0].trim();
        if (/^\{\|/.test(t)) depth++;
        else if (/^\|\}/.test(t)) {
          depth--;
          if (depth === 0) {
            end = l.index + l[0].length;
            break;
          }
        }
        if (lineRe.lastIndex === l.index) lineRe.lastIndex++;
      }
      out.push({ anchor: m[1], header: plain(m[2]), start: m.index, end, text: s.slice(m.index, end) });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Parses one bundle table (wikitext) into name, slots, items, reward and gold. */
export function parseBundleTable(text, anchor) {
  const headerLine = text.match(/!\s*id="[^"]+"[^|\n]*\|([^\n]*)/)[1];
  const header = plain(headerLine);
  const rnd = header.match(/\((\d+) items chosen at random\)/);
  const name = header.replace(/\s*\(\d+ items chosen at random\)/, '').trim();
  const slots = (text.match(/\[\[File:Bundle Slot\.png/g) || []).length;
  const goldM = text.match(/Bundle Purchase\.png[^\n]*\{\{Price\|([\d,]+)\}\}/);
  const rows = tableRows(text.slice(text.indexOf('\n', text.indexOf('id="')) + 1));
  const items = [];
  let reward = null;
  let rewardRow = false;
  let sharedNote = null;
  let sharedLeft = 0;
  let group = 0;
  for (const cells of rows) {
    const rIdx = cells.findIndex((c) => /Reward:/.test(c));
    if (rIdx >= 0 || rewardRow) {
      const after = rIdx >= 0 ? cells.slice(rIdx + 1) : cells;
      if (!after.length) {
        rewardRow = true;
        continue;
      }
      const c = after.join(' ');
      const refs = itemRefs(c);
      if (refs.length) reward = { name: refs[0].name, page: refs[0].page, qty: refs[0].qty ?? 1 };
      else {
        const lm = c.match(/\[\[(?!File:)([^\]|]+)(?:\|([^\]]+))?\]\]\s*\((\d+)\)/);
        reward = lm ? { name: lm[2] || lm[1], page: lm[1], qty: Number(lm[3]) } : { text: plain(c) };
      }
      rewardRow = false;
      continue;
    }
    const itemCellIdx = cells.findIndex((c) => /\{\{(Name|Quality)\|/.test(c));
    if (itemCellIdx < 0) continue;
    const cell = cells[itemCellIdx];
    let noteCell = cells[itemCellIdx + 1];
    if (noteCell != null) {
      const span = (text.match(new RegExp(`\\|\\s*rowspan="(\\d+)"\\s*\\|\\s*${escapeRe(noteCell.trim().slice(0, 30))}`)) || [])[1];
      sharedNote = noteCell;
      sharedLeft = span ? Number(span) - 1 : 0;
    } else if (sharedLeft > 0) {
      noteCell = sharedNote;
      sharedLeft--;
    }
    // A nested <table> or {| table with several items = one of them is chosen at random.
    const trs = cell.includes('<tr>') ? cell.split(/<tr>/).slice(1) : [cell];
    const noteTrs = noteCell && noteCell.includes('<tr>') ? noteCell.split(/<tr>/).slice(1) : null;
    const rowItems = [];
    trs.forEach((tr, i) => {
      const refs = itemRefs(tr);
      if (!refs.length) return;
      const r = refs[0];
      const after = plain(tr.slice(r.end));
      const q = after.match(/\((\d+)\)/);
      const text = plain(tr);
      const quality = r.quality ?? (/\bGold\b.*quality/i.test(text) ? 'gold' : /\bSilver\b.*quality/i.test(text) ? 'silver' : 'normal');
      const pageLink = r.quality ? (tr.match(/\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]/) || [])[1] : null;
      rowItems.push({
        name: r.name,
        page: pageLink || r.page,
        qty: r.qty ?? (q ? Number(q[1]) : 1),
        quality,
        any: /\(any\)|"any"/i.test(text) || undefined,
        note: noteTrs ? noteTrs[i] : noteCell,
      });
    });
    if (rowItems.length > 1) {
      group++;
      for (const it of rowItems) it.group = group;
    }
    items.push(...rowItems);
  }
  return {
    anchor,
    name,
    random_items: rnd ? Number(rnd[1]) : null,
    slots: goldM ? null : slots,
    gold: goldM ? Number(goldM[1].replace(/,/g, '')) : null,
    items,
    reward,
  };
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Level-2/3 sections: [{level, title, body}]. */
export function sections(wikitext) {
  const out = [];
  const re = /^(={2,3})\s*([^=]+?)\s*\1\s*$/gm;
  const heads = [...wikitext.matchAll(re)];
  heads.forEach((h, i) => {
    const end = i + 1 < heads.length ? heads[i + 1].index : wikitext.length;
    out.push({ level: h[1].length, title: h[2], body: wikitext.slice(h.index + h[0].length, end) });
  });
  return out;
}

/** Room reward cell from a room section ("Bridge Repair", "Greenhouse", ...). */
export function roomReward(body) {
  const m = body.match(/\|style="padding-left: 8px; min-width: 200px;"\|([^\n]+)/);
  return m ? plain(m[1]) : null;
}

/** Modding:Bundles raw data -> [{room, key, name, reward:{type,id,qty}, items:[{id,qty,quality}], slots, gold}]. */
export function parseRawBundles(wikitext) {
  const m = wikitext.match(/<syntaxhighlight lang="json">\s*([\s\S]*?)<\/syntaxhighlight>/);
  if (!m) return null;
  const raw = JSON.parse(m[1]);
  return Object.entries(raw).map(([key, v]) => {
    const [room] = key.split('/');
    const f = v.split('/');
    const [rt, rid, rq] = (f[1] || '').split(' ');
    const req = f[2].split(' ').map(Number);
    const items = [];
    let gold = null;
    for (let i = 0; i + 2 < req.length + 0.5; i += 3) {
      if (req[i] === -1) gold = req[i + 1];
      else items.push({ id: req[i], qty: req[i + 1], quality: QUALITY_BY_NUMBER[req[i + 2]] });
    }
    return {
      room,
      key,
      name: f[0],
      reward: f[1] ? { type: rt, id: Number(rid), qty: Number(rq) } : null,
      items,
      slots: gold != null ? null : f[4] ? Number(f[4]) : items.length,
      gold,
    };
  });
}

/** Normalised bundle name for matching ("Blacksmith's Bundle", "Blacksmiths", "2,500g" ...). */
export const bundleKey = (s) =>
  String(s)
    .toLowerCase()
    .replace(/^remixed\s+/, '')
    .replace(/['’]/g, '')
    .replace(/(\d),(\d)/g, '$1$2')
    .replace(/(\d)g\b/, '$1')
    .replace(/\bbundle\b/g, '')
    .replace(/\bfishing\b/, 'fish')
    .replace(/^the\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Template:Bundle switch -> { alias: bundleKey } (lowercase aliases as the template matches them). */
export function parseBundleTemplate(wikitext) {
  const out = {};
  let pending = [];
  for (const line of wikitext.split('\n')) {
    const m = line.match(/^\|\s*([^=|]+?)\s*(=\s*(.*))?$/);
    if (!m) continue;
    pending.push(m[1].trim().toLowerCase());
    if (m[2]) {
      const link = (m[3].match(/\[\[(?:Remixed )?Bundles#[^|\]]*\|([^\]]+)\]\]/) || [])[1];
      if (link) for (const a of pending) out[a] = bundleKey(link);
      pending = [];
    }
  }
  return out;
}

/** Bundle names an item page mentions (via {{Bundle|alias}}, [[Bundles#X]] links or "X Bundle" text). */
export function mentionedBundles(wikitext, aliases) {
  const out = new Set();
  for (const m of wikitext.matchAll(/\{\{Bundle\|([^|}]*)/gi)) {
    const a = m[1].trim().toLowerCase();
    if (aliases[a]) out.add(aliases[a]);
  }
  for (const m of wikitext.matchAll(/\[\[(?:Remixed )?Bundles#([^|\]]+)/g)) out.add(bundleKey(m[1].replace(/_/g, ' ')));
  for (const m of plain(wikitext).matchAll(/((?:[A-Z][\w']*[ ,]+){1,3})Bundle/g)) out.add(bundleKey(m[1]));
  return out;
}

/** The value two or more sources agree on (undefined = source says nothing). */
export function agree(values) {
  const known = values.filter((v) => v.value !== undefined);
  const groups = new Map();
  for (const v of known) {
    const k = JSON.stringify(v.value);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(v);
  }
  const best = [...groups.values()].sort((a, b) => b.length - a.length)[0] || [];
  return {
    ok: best.length >= 2,
    value: best[0]?.value,
    agreeing: best.map((v) => v.source),
    disagreeing: known.filter((v) => !best.includes(v)).map((v) => ({ source: v.source, value: v.value })),
  };
}

/** Rendered (HTML) bundle section: slots, "Name (qty)" pairs and quality icon counts. */
export function renderedBundle(html, anchor) {
  const id = anchor.replace(/ /g, '_');
  let i = html.indexOf(`id="${id}"`);
  // Legacy MediaWiki id encoding: "'" -> ".27".
  if (i < 0) i = html.indexOf(`id="${id.replace(/'/g, '.27')}"`);
  if (i < 0) return null;
  const rest = html.slice(i + 1);
  const stop = rest.search(/<th id="|<h2|<h3|<p><i><b>or/);
  const sec = stop < 0 ? rest : rest.slice(0, stop);
  const before = sec.split(/Reward:/)[0];
  const text = before
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#039;|&#39;/g, "'")
    .replace(/\s+/g, ' ');
  return {
    slots: (sec.match(/alt="Bundle Slot\.png"/g) || []).length,
    text,
    gold: (before.match(/alt="Gold Quality Icon\.png"/g) || []).length,
    silver: (before.match(/alt="Silver Quality Icon\.png"/g) || []).length,
    gold_price: (() => {
      const m = before.replace(/<[^>]+>/g, ' ').match(/([\d,]+)g/);
      return m ? Number(m[1].replace(/,/g, '')) : null;
    })(),
  };
}

/** Quantity of an item in a rendered bundle section, as the wiki displays it ("Wood (99)"). */
export function renderedQty(text, ...names) {
  for (const name of names.filter(Boolean)) {
    const re = new RegExp(`${escapeRe(name)}\\s*\\((\\d[\\d,]*)\\)`, 'g');
    const all = [...text.matchAll(re)].map((m) => Number(m[1].replace(/,/g, '')));
    if (all.length) return all;
    if (new RegExp(escapeRe(name)).test(text)) return [1];
  }
  return [];
}

/* ------------------------------------------------------------------ import */

const ROOM_ORDER = ['Crafts Room', 'Pantry', 'Fish Tank', 'Boiler Room', 'Bulletin Board', 'Vault', 'Abandoned JojaMart'];

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const bundlesPage = await page('Bundles');
  const remixPage = await page('Remixed Bundles');
  const remixHtml = await rendered('Remixed Bundles');
  const rawPage = await page('Modding:Bundles');
  const tplPage = await page('Template:Bundle');
  const aliases = parseBundleTemplate(tplPage.wikitext);
  const raw = parseRawBundles(rawPage.wikitext);
  if (!raw) failures.push('Modding:Bundles: raw data block not found');
  const rawVersion = quote(rawPage, /Here's the raw data as of \{\{version\|([\d.]+)\}\}/);

  // Existing ids in the other data files (an item that already exists keeps its id).
  const known = new Map();
  const crops = JSON.parse(readFileSync(join(ROOT, 'data', 'crops.json'), 'utf8'));
  const animals = JSON.parse(readFileSync(join(ROOT, 'data', 'animals.json'), 'utf8'));
  const fishponds = JSON.parse(readFileSync(join(ROOT, 'data', 'fishponds.json'), 'utf8'));
  for (const r of [...crops.crops, ...animals.products, ...animals.artisan.goods, ...fishponds.fish, ...(fishponds.items || [])]) known.set(r.name.toLowerCase(), r.id);
  const idFor = (name) => known.get(name.toLowerCase()) || slug(name);
  const cropSeasons = new Map(crops.crops.map((c) => [c.id, c.seasons]));

  /* ---------- Standard bundles (Bundles page) ---------- */
  const stdSections = sections(bundlesPage.wikitext);
  const rooms = [];
  const bundles = [];
  const notes = new Map(); // item id -> [{note, source}]
  const addNote = (id, note, p) => {
    if (!note) return;
    if (!notes.has(id)) notes.set(id, []);
    notes.get(id).push({ note, page: p });
  };
  const std = stdSections.find((s) => s.level === 2 && s.title === 'Standard Bundles');
  if (!std) failures.push('Bundles: "Standard Bundles" section not found');
  const stdStart = bundlesPage.wikitext.indexOf('==Standard Bundles==');
  const roomSecs = stdSections.filter((s) => s.level === 3 && ROOM_ORDER.includes(s.title) && bundlesPage.wikitext.indexOf(s.body) > stdStart);
  for (const roomName of ROOM_ORDER) {
    const sec = roomSecs.find((s) => s.title === roomName);
    if (!sec) {
      failures.push(`Bundles: room section ${roomName} not found`);
      continue;
    }
    const roomId = slug(roomName);
    const unlock = (plain(sec.body).match(/(The [\w ]+ (?:contains the first group of bundles available|appears after completing [\w ]+ bundles?|becomes available after completing [\w ]+ bundles?)\.|After completing the Community Center, the first night before a rainy or stormy day[^.]*\.)/) || [])[1];
    const effect = (plain(sec.body).match(/(Completing all [\w ]+ bundles (?:costs [\dg,]+, and )?[^.]*\.)/) || [])[1];
    rooms.push({ id: roomId, name: roomName, reward: roomReward(sec.body), unlock: unlock || null, effect: effect || null, _body: sec.body });
    for (const t of bundleTables(sec.body)) {
      const b = parseBundleTable(t.text, t.anchor);
      bundles.push({ set: 'standard', room: roomId, ...b });
      for (const it of b.items) addNote(idFor(it.name), it.note, bundlesPage);
    }
  }

  /* ---------- Remixed bundles ---------- */
  const rxSections = sections(remixPage.wikitext);
  const rxRoomRewards = {};
  for (const roomName of ROOM_ORDER.filter((r) => r !== 'Abandoned JojaMart')) {
    const i = rxSections.findIndex((s) => s.level === 2 && s.title === roomName);
    if (i < 0) {
      failures.push(`Remixed Bundles: room ${roomName} not found`);
      continue;
    }
    const roomId = slug(roomName);
    const subs = [];
    for (let j = i + 1; j < rxSections.length && rxSections[j].level === 3; j++) subs.push(rxSections[j]);
    const all = rxSections[i].body + subs.map((s) => `\n===${s.title}===\n${s.body}`).join('');
    rxRoomRewards[roomId] = roomReward(all);
    const groups = subs.length ? subs : [{ title: 'Bundles', body: rxSections[i].body }];
    for (const g of groups) {
      const tables = bundleTables(g.body);
      const pickM = plain(g.body).match(/\((\d+) chosen at random\)/);
      const slotM = g.title.match(/^Bundle (\d+)$/);
      for (const t of tables) {
        const b = parseBundleTable(t.text, t.anchor);
        let remix = null;
        if (slotM && tables.length > 1) remix = { group: `${roomId}-${slotM[1]}`, pick: 1, of: tables.length };
        else if (pickM) remix = { group: roomId, pick: Number(pickM[1]), of: tables.length };
        bundles.push({ set: 'remixed', room: roomId, ...b, remix });
        for (const it of b.items) addNote(idFor(it.name), it.note, remixPage);
      }
    }
  }

  /* ---------- Rooms: Bundles page vs Remixed Bundles page ---------- */
  const roomRecords = [];
  for (const r of rooms) {
    const problems = [];
    const sources = [ref(bundlesPage, r.name)];
    let second;
    if (r.id === 'abandoned-jojamart') {
      const mt = await page('Movie Theater');
      second = /Missing Bundle/.test(mt.wikitext) && /Movie Theater/.test(r.reward) ? r.reward : undefined;
      if (second) sources.push(ref(mt));
    } else {
      second = rxRoomRewards[r.id];
      sources.push(ref(remixPage, r.name));
    }
    const a = agree([{ source: bundlesPage.title, value: r.reward ?? undefined }, { source: 'second', value: second ?? undefined }]);
    if (!a.ok) {
      if (r.reward && second) problems.push(`Room reward: Bundles says "${r.reward}", second source says "${second}"`);
      else failures.push(`${r.name}: room reward needs two sources (${r.reward} / ${second})`);
    }
    if (!r.unlock) failures.push(`${r.name}: unlock sentence not found`);
    if (!r.effect && r.id !== 'abandoned-jojamart') failures.push(`${r.name}: "Completing all ..." sentence not found`);
    roomRecords.push({
      id: r.id,
      name: r.name,
      reward: r.reward,
      unlock: r.unlock,
      effect: r.effect,
      sources,
      verification_status: problems.length ? 'needs-verification' : 'verified',
      problems,
    });
  }

  /* ---------- Standard bundles vs Modding:Bundles raw data ---------- */
  const rawByKey = new Map((raw || []).map((r) => [bundleKey(r.name), r]));
  const idNames = new Map(); // raw numeric id -> Set(names)
  for (const b of bundles.filter((x) => x.set === 'standard')) {
    const r = rawByKey.get(bundleKey(b.name));
    b._raw = r;
    if (!r) continue;
    if (r.items.length === b.items.length) r.items.forEach((ri, i) => {
      if (!idNames.has(ri.id)) idNames.set(ri.id, new Set());
      idNames.get(ri.id).add(idFor(b.items[i].name));
    });
  }

  for (const r of raw || []) if (!bundles.some((b) => b.set === 'standard' && bundleKey(b.name) === bundleKey(r.name))) failures.push(`Modding:Bundles raw bundle ${r.key} (${r.name}) not on the Bundles page`);

  /* ---------- Item pages ---------- */
  const itemPages = new Map();
  const allItems = new Map();
  for (const b of bundles) for (const it of b.items) if (!allItems.has(idFor(it.name))) allItems.set(idFor(it.name), it);
  for (const [id, it] of allItems) itemPages.set(id, await page(it.page));
  const rewardPages = new Map();
  for (const b of bundles) if (b.reward?.page && !rewardPages.has(b.reward.page)) rewardPages.set(b.reward.page, await page(b.reward.page));

  /* ---------- Bundle records ---------- */
  const bundleRecords = [];
  const usedIds = new Map();
  for (const b of bundles) {
    const problems = [];
    const sources = [ref(b.set === 'standard' ? bundlesPage : remixPage, b.anchor)];
    const key = bundleKey(b.name);
    let id = (b.set === 'remixed' ? 'remixed-' : '') + (b.gold ? `vault-${b.gold}` : slug(b.name.replace(/\s*Bundle$/, '').replace(/^The /, '')));
    usedIds.set(id, (usedIds.get(id) || 0) + 1);
    if (usedIds.get(id) > 1) failures.push(`duplicate bundle id ${id}`);
    const items = b.items.map((it) => ({ id: idFor(it.name), name: it.name, qty: it.qty, quality: it.quality, ...(it.group ? { group: it.group } : {}), ...(it.any ? { any: true } : {}) }));
    let slots = b.slots;
    let gold = b.gold;
    let rewardQty = b.reward?.qty;

    if (b.set === 'standard') {
      const r = b._raw;
      if (!r) failures.push(`${b.name}: not in Modding:Bundles raw data`);
      else {
        sources.push(ref(rawPage, 'Raw data'));
        if (gold != null) {
          const a = agree([{ source: 'Bundles', value: gold }, { source: 'Modding:Bundles', value: r.gold ?? undefined }]);
          if (!a.ok) problems.push(`Gold: Bundles ${gold}, Modding:Bundles ${r.gold}`);
        } else {
          const a = agree([{ source: 'Bundles', value: slots }, { source: 'Modding:Bundles', value: r.slots }]);
          if (!a.ok) problems.push(`Slots: Bundles shows ${slots}, Modding:Bundles raw data says ${r.slots}`);
          if (r.items.length !== items.length) problems.push(`Items: Bundles lists ${items.length}, Modding:Bundles raw data (v${rawVersion}) lists ${r.items.length}`);
          items.forEach((it, i) => {
            const ri = r.items[i];
            if (!ri) return;
            if (ri.qty !== it.qty) problems.push(`${it.name} quantity: Bundles ${it.qty}, Modding:Bundles ${ri.qty}`);
            if (ri.quality !== it.quality) problems.push(`${it.name} quality: Bundles ${it.quality}, Modding:Bundles ${ri.quality}`);
            const names = idNames.get(ri.id);
            if (names && names.size > 1) problems.push(`Raw item id ${ri.id} is listed as ${[...names].join(' / ')} in different bundles`);
          });
        }
        if (b.reward && r.reward && rewardQty !== r.reward.qty && !(r.reward.type === 'BO' || r.reward.type === 'R')) problems.push(`Reward quantity: Bundles ${rewardQty}, Modding:Bundles ${r.reward.qty}`);
        if (b.reward && r.reward && (r.reward.type === 'BO' || r.reward.type === 'R') && rewardQty !== 1) problems.push(`Reward quantity: Bundles ${rewardQty}, Modding:Bundles gives one big craftable/ring`);
      }
    } else {
      const h = renderedBundle(remixHtml.html, b.anchor);
      if (!h) failures.push(`Remixed Bundles (rendered): ${b.anchor} not found`);
      else {
        sources.push({ ...ref(remixHtml, b.anchor), rendered: true });
        if (gold != null) {
          if (h.gold_price !== gold) problems.push(`Gold: wikitext ${gold}, rendered ${h.gold_price}`);
        } else if (h.slots !== slots) problems.push(`Slots: wikitext ${slots}, rendered page ${h.slots}`);
        for (const [i, it] of items.entries()) {
          const q = renderedQty(h.text, it.name, b.items[i].page);
          if (!q.includes(it.qty)) problems.push(`${it.name} quantity: wikitext ${it.qty}, rendered ${q.join('/') || 'missing'}`);
        }
        for (const ql of ['gold', 'silver']) {
          const n = items.filter((x) => x.quality === ql).length;
          if (n !== h[ql]) problems.push(`${ql} quality items: wikitext ${n}, rendered icons ${h[ql]}`);
        }
      }
      // A remixed bundle that is also a standard bundle with the same items must match it.
      const s = bundleRecords.find((x) => x.set === 'standard' && bundleKey(x.name) === key);
      if (s && JSON.stringify(s.items) === JSON.stringify(items) && s.slots !== slots) problems.push(`Slots differ from the standard ${s.name} with the same items (${s.slots} vs ${slots})`);
    }

    // Each item page must mention this bundle.
    const checked = [];
    for (const it of items) {
      const p = itemPages.get(it.id);
      const m = mentionedBundles(p.wikitext, aliases);
      if (m.has(key)) checked.push(it.id);
      else problems.push(`${p.title} page does not mention the ${b.name}`);
    }
    // Reward page must mention the bundle.
    let reward = null;
    if (b.reward?.page) {
      const rp = rewardPages.get(b.reward.page);
      const m = mentionedBundles(rp.wikitext, aliases);
      if (!m.has(key)) problems.push(`Reward page ${rp.title} does not mention the ${b.name}`);
      reward = { id: idFor(b.reward.name), name: b.reward.name, qty: rewardQty };
    } else if (b.reward?.text) reward = { text: b.reward.text };
    // The Missing Bundle has no reward of its own: its reward is the room reward (Movie Theater).
    const ownRoom = roomRecords.find((r) => r.id === b.room);
    if (!reward && bundles.filter((x) => x.set === b.set && x.room === b.room).length === 1 && ownRoom?.reward) reward = { room_reward: ownRoom.reward };
    if (!reward) failures.push(`${b.name} (${b.set}): reward not found`);
    if (gold == null && !(slots > 0)) failures.push(`${b.name} (${b.set}): slots not found`);
    if (gold == null) {
      // Slots can never exceed the number of items the bundle ends up asking for.
      const choices = b.random_items ?? items.filter((x) => !x.group).length + new Set(items.filter((x) => x.group).map((x) => x.group)).size;
      if (slots > choices) problems.push(`Slots (${slots}) exceed the items the bundle asks for (${choices})`);
    }
    for (const it of items) if (!(it.qty > 0)) failures.push(`${b.name}: quantity missing for ${it.name}`);

    bundleRecords.push({
      id,
      name: b.name,
      set: b.set,
      room: b.room,
      ...(gold != null ? { gold } : { slots, items }),
      ...(b.random_items ? { random_items: b.random_items } : {}),
      ...(b.set === 'remixed' ? { remix: b.remix } : {}),
      reward,
      sources,
      verification_status: problems.length ? 'needs-verification' : 'verified',
      problems,
    });
  }

  /* ---------- Item records ---------- */
  const itemRecords = [];
  const renderedUsed = new Set();
  for (const [id, it] of allItems) {
    const p = itemPages.get(id);
    const problems = [];
    const ns = notes.get(id) || [];
    const fromStd = ns.find((n) => n.page === bundlesPage) || ns[0];
    const obtain = fromStd ? shortNote(fromStd.note) : null;
    if (!obtain) failures.push(`${it.name}: no "how to get it" note`);
    const box = infobox(p.wikitext);
    const ibSeasons = infoboxSeasons(box.season);
    const noteSeasons = [...new Set(ns.flatMap((n) => seasonsIn(n.note)))];
    const cropS = cropSeasons.get(id);
    const candidates = [{ source: `${p.title} infobox`, value: ibSeasons ?? undefined }];
    if (cropS) candidates.push({ source: 'data/crops.json', value: SEASONS.filter((s) => cropS.includes(s)) });
    if (noteSeasons.length) candidates.push({ source: 'bundle notes', value: SEASONS.filter((s) => noteSeasons.includes(s)) });
    if (candidates.filter((c) => c.value !== undefined).length === 1) {
      const h = await rendered(p.title);
      const rs = renderedSeasons(h.html);
      if (rs) {
        candidates.push({ source: `${p.title} (rendered infobox)`, value: rs });
        renderedUsed.add(id);
      }
    }
    let seasons = null;
    const a = agree(candidates);
    if (a.ok) {
      seasons = a.value;
      for (const d of a.disagreeing) problems.push(`Seasons: ${a.agreeing.join(' + ')} say ${a.value.join('/')}, ${d.source} says ${d.value.join('/')}`);
    } else if (candidates.filter((c) => c.value !== undefined).length >= 2) {
      seasons = ibSeasons ?? cropS ?? null;
      problems.push(`Seasons disagree: ${candidates.filter((c) => c.value).map((c) => `${c.source} ${c.value.join('/')}`).join('; ')}`);
    } else if (ibSeasons || noteSeasons.length) {
      seasons = ibSeasons ?? SEASONS.filter((s) => noteSeasons.includes(s));
      problems.push(`Seasons ${seasons.join('/')} only from ${ibSeasons ? `the ${p.title} infobox` : 'the bundle notes'}`);
    }
    const sources = [ref(p, 'Bundles'), ...[...new Set(ns.map((n) => n.page))].map((pg) => ref(pg))];
    if (renderedUsed.has(id)) sources.push({ ...ref(p), rendered: true });
    itemRecords.push({
      id,
      name: it.name,
      seasons,
      obtain,
      sources,
      verification_status: problems.length ? 'needs-verification' : 'verified',
      problems,
    });
  }

  // Every bundle item id must resolve to an item record; ids already used elsewhere keep their id.
  for (const b of bundleRecords) for (const it of b.items || []) if (!itemRecords.find((x) => x.id === it.id)) failures.push(`${b.name}: item ${it.id} has no item record`);
  const vaultStd = bundleRecords.filter((b) => b.set === 'standard' && b.room === 'vault');
  const vaultTotal = Number((bundlesPage.wikitext.match(/Completing all Vault bundles costs \{\{Price\|(\d+)\}\}/) || [])[1]);
  if (vaultStd.reduce((s, b) => s + b.gold, 0) !== vaultTotal) failures.push(`Vault gold does not add up to ${vaultTotal}`);
  const totalStated = quote(bundlesPage, /(There is a total of \d+ rooms and \d+ bundles to complete in the Community Center\.)/);
  const stdCount = bundleRecords.filter((b) => b.set === 'standard').length;
  const stdRooms = new Set(bundleRecords.filter((b) => b.set === 'standard').map((b) => b.room)).size;
  if (totalStated && !totalStated.includes(`${stdRooms - 1} rooms and ${stdCount - 1} bundles`))
    failures.push(`Bundles page says "${totalStated}" but ${stdRooms} rooms / ${stdCount} bundles were parsed (incl. the Missing Bundle)`);

  const out = {
    schema: 'stardew-tools/bundles@1',
    game_version: GAME_VERSION,
    generated: today,
    last_verified: today,
    source: 'Stardew Valley Wiki (CC BY-NC-SA 3.0): Bundles and Remixed Bundles, cross-checked against Modding:Bundles raw data, the rendered Remixed Bundles page and every item page',
    sources: [ref(bundlesPage), ref(remixPage), ref(rawPage), ref(tplPage)],
    notes: [
      quote(bundlesPage, /(Bundles that do not specify quality will accept items of any quality\.)/),
      quote(bundlesPage, /(For bundles that do specify a quality, a better quality is also acceptable\.)/),
      quote(bundlesPage, /(A few bundles display more items than there are slots to fill[\s\S]*?only enough to fill the slots\.)/),
      quote(remixPage, /(A room can have a mix of permanent and random bundles\.)/),
      `Modding:Bundles raw data is from game version ${rawVersion}; ${quote(bundlesPage, /\{\{History\|1\.6\|(The Community Center fish tank[^}]*?instead of \[\[Small Glow Ring\]\]\.)/)}`,
    ],
    fields: {
      slots: 'how many of the listed items must be put in (e.g. 4 of 6)',
      group: 'items with the same group number in one bundle are alternatives: the game picks one of them when the save is created',
      random_items: 'remixed: this many of the listed items are picked when the save is created',
      remix: 'remixed: the game picks `pick` of the `of` bundles that share `group`; null = always present',
      quality: 'minimum quality; better quality is accepted',
      seasons: 'seasons the item can be found or grown (null = not seasonal)',
    },
    rooms: roomRecords,
    bundles: bundleRecords,
    items: itemRecords.sort((a, b) => a.name.localeCompare(b.name)),
  };
  if (failures.length) {
    console.error('Bundle import failed:\n  ' + failures.join('\n  '));
    process.exit(1);
  }
  writeFileSync(join(ROOT, 'data', 'bundles.json'), JSON.stringify(out, null, 1) + '\n');
  const nb = bundleRecords.filter((b) => b.problems.length);
  const ni = itemRecords.filter((b) => b.problems.length);
  console.log(`${roomRecords.length} rooms, ${bundleRecords.length} bundles (${stdCount} standard), ${itemRecords.length} items; ${nb.length} bundles and ${ni.length} items need verification`);
  for (const r of [...roomRecords, ...nb, ...ni].filter((x) => x.problems.length)) console.log(`  ${r.set ? r.set + ' ' : ''}${r.name}: ${r.problems.join('; ')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

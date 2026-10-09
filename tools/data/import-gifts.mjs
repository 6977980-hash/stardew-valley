#!/usr/bin/env node
// Builds data/gifts.json from the Stardew Valley Wiki: every giftable villager (birthday, marriage
// candidate, gift tastes), the universal gift tastes and their per-villager exceptions, the
// friendship points per gift taste, and the birthday / Winter Star / quality / Friendship 101
// multipliers.
//
// Nothing is typed in by hand. Every value is parsed from wiki pages and cross-checked:
//   - the villager list: "Villagers" gallery and the "List of All Gifts" table rows;
//   - birthdays: each villager's infobox and the "List of All Gifts" table;
//   - marriage candidates: each villager's infobox and the "Villagers" Bachelors/Bachelorettes galleries;
//   - gift tastes: each villager's "Gifts" section and their "List of All Gifts" row, with the
//     infobox favourites and the "Friendship" page's universal-exception lists as tie breakers;
//   - universal loves/likes/neutrals: "Friendship" and the "List of All Gifts" Universals row;
//   - universal dislikes/hates: "Friendship", checked against each item's own page (GiftsByItem);
//   - points and multipliers: the "Friendship" table and prose, "List of All Gifts" column headers,
//     "Template:GiftHeader", "Feast of the Winter Star", "Friendship 101", "Stardrop Tea" and the
//     wiki's rendered "Friendship" quality table.
// A source that disagrees is written to the record's `problems` (verification_status
// "needs-verification"); a value with no source at all or a missing evidence sentence fails the
// import. Files are written only once every check has passed.
//
// Category entries ("All Fruit (except ...)", "All Eggs") are kept as category markers with the
// wiki's own text and their exceptions; they are not expanded into items.
//
//   node tools/data/import-gifts.mjs [--cached]
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchPage, fetchRendered, sleep } from './wiki.mjs';
import { slug as baseSlug } from './parse-crops.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = join(ROOT, 'tools', 'data', '.cache');
const GAME_VERSION = '1.6.15';
const useCache = process.argv.includes('--cached');
const failures = [];

export const TASTES = ['love', 'like', 'neutral', 'dislike', 'hate'];

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
const page = (title) => cached(baseSlug(title), () => fetchPage(title));
const rendered = (title) => cached(`${baseSlug(title)}-html`, () => fetchRendered(title));
const ref = (p, anchor) => ({ title: p.title, url: anchor ? `${p.url}#${encodeURIComponent(anchor.replace(/ /g, '_'))}` : p.url, revid: p.revid });

/** The wiki text matched by a pattern (group 1 if present), cleaned to plain text. */
function quote(p, re, text = p.wikitext) {
  const m = text.match(re);
  if (!m) {
    failures.push(`${p.title}: evidence not found ${re}`);
    return null;
  }
  return plain(m[1] ?? m[0]);
}

/* ------------------------------------------------------------------ parse helpers */

/** Item id: lowercase-hyphen slug, accents folded ("Piña Colada" -> "pina-colada"). */
export const slug = (name) => baseSlug(name.normalize('NFD').replace(/[̀-ͯ]/g, ''));

/** [[Target|Label]] -> Label, [[Target]] -> Target. */
export const unlink = (s) => s.replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1');

/** Wiki markup -> plain text. */
export function plain(s) {
  return unlink(
    s
      .replace(/\[\[File:[^\]]*\]\]/g, '')
      .replace(/\{\{Name\|([^|}]+)[^}]*\}\}/g, '$1')
      .replace(/\{\{Season\|([^|}]+)\|(\d+)\}\}/g, '$1 $2')
      .replace(/\{\{Season\|([^|}]+)\}\}/g, '$1')
      .replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/g, '')
      .replace(/<br\s*\/?>/g, ' ')
      .replace(/<\/?(?:code|span|samp|b|i|strong|em|ul|li)[^>]*>/g, ' '),
  )
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/'''?/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;)])/g, '$1')
    .replace(/\(\s+/g, '(')
    .trim();
}

/** All [[links]] in a string: { target, label }. File/category/interwiki links are skipped. */
export function links(s) {
  const out = [];
  for (const m of s.matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)) {
    const target = m[1].trim();
    if (/^(File|Category|[a-z]{2}):/.test(target)) continue;
    out.push({ target, label: (m[2] ?? m[1]).trim() });
  }
  return out;
}

/** Pages that stand for a group of items when linked inside a taste entry. */
const CATEGORY_PAGES = new Set(['Fruits', 'Fruit Trees', 'Vegetables', 'Fish', 'Books', 'Artisan Goods', 'Flowers', 'Artifacts', 'Trinkets', 'Cooking', 'Minerals']);

/** Category id for a link (or bare words) naming a group: "all-fruits", "all-gems", "all-eggs". */
export function categoryId(target, label) {
  const [page, anchor] = target.split('#');
  let key = page === 'Minerals' && anchor ? anchor : page;
  if (!CATEGORY_PAGES.has(page)) key = label;
  key = key.replace(/&amp;/g, '&').replace(/^All\s+/i, '').replace(/^Other\s+/i, '').replace(/\*$/, '');
  if (/^Fish Types$/i.test(key)) key = 'Fish';
  if (/^Cooked Dishes$/i.test(key)) key = 'Cooking';
  return `all-${slug(key)}`;
}

/** Item id for a link used as an item (or an exception): label when it names a different item than the page. */
export function itemRef({ target, label }) {
  const page = target.split('#')[0];
  if (page === 'Version History' || page.startsWith('Friendship')) return null;
  if (CATEGORY_PAGES.has(page)) return categoryId(target, label);
  // [[Red Mushroom|Red]] -> red-mushroom; [[Jellies and Pickles|Jelly]] -> jelly; [[Snail]]s -> snail
  // [[Jellies and Pickles|Pickles]] names one item of a multi-item page.
  if (label !== page && (/\band\b/.test(page) || !page.toLowerCase().includes(label.toLowerCase()))) return slug(label);
  return slug(page);
}

/** The ids named in an "(except ...)" / "(other than ...)" clause. */
export function exceptIds(text) {
  const m = text.match(/(?:except(?: for)?|other than|excluding)\b:?([\s\S]*)$/i);
  if (!m) return [];
  return [...new Set(links(m[1]).map(itemRef).filter(Boolean))].sort();
}

/**
 * One taste entry that names a group ("All [[Fruits|Fruit]] ''(except [[Salmonberry]])''",
 * "'''[[Vegetables|All Vegetables]]''' (except ...)", "All Eggs*", "All Milk").
 * Returns { id, text, except } or null when the entry is not a group.
 */
export function parseCategory(entry) {
  const s = entry.replace(/<\/?(?:strong|em)>/g, "'''").trim();
  const head = s.split(/''\(|\(|''except/)[0];
  const text = plain(s).replace(/\*/g, '').replace(/\s+/g, ' ').trim();
  if (!/\bAll\b/.test(plain(head))) return null;
  const l = links(head);
  let id;
  if (l.length) id = categoryId(l[0].target, l[0].label);
  else id = categoryId('', plain(head).replace(/\*/g, '').trim());
  return { id, text, except: exceptIds(s.slice(head.length)) };
}

/** Top-level <li> entries of a <ul>…</ul> cell (nested lists stay inside their parent entry). */
export function topLevelItems(cell) {
  const out = [];
  let depth = 0;
  let cur = null;
  const re = /<(\/?)(ul|li)>/g;
  let last = 0;
  for (let m; (m = re.exec(cell)); ) {
    if (cur !== null) cur += cell.slice(last, m.index);
    last = re.lastIndex;
    const close = m[1] === '/';
    if (m[2] === 'ul') {
      depth += close ? -1 : 1;
      if (cur !== null && depth >= 2) cur += m[0];
      if (close && depth === 0 && cur !== null) {
        out.push(cur);
        cur = null;
      }
    } else if (depth === 1) {
      if (!close) {
        if (cur !== null) out.push(cur);
        cur = '';
      } else if (cur !== null) {
        out.push(cur);
        cur = null;
      }
    } else if (cur !== null) cur += m[0];
  }
  if (cur !== null) out.push(cur + cell.slice(last));
  return out.map((x) => x.trim()).filter(Boolean);
}

const TASTE_OF = { love: 'love', loves: 'love', like: 'like', likes: 'like', neutral: 'neutral', neutrals: 'neutral', dislike: 'dislike', dislikes: 'dislike', hate: 'hate', hates: 'hate' };

const emptyTaste = () => ({ items: [], categories: [], universal: false, universal_except: [], universal_text: null });

/**
 * A villager page's "Gifts" section -> { love: { items, categories, universal, universal_except }, … }.
 * Items are the table rows; categories and "All Universal X (except …)" are the bullets in the
 * table's first (colspan) row.
 */
export function parseVillagerGifts(wikitext) {
  const start = wikitext.indexOf('==Gifts==');
  if (start < 0) return null;
  const rest = wikitext.slice(start + 9);
  const end = rest.search(/\n==[^=]/);
  const section = end < 0 ? rest : rest.slice(0, end);
  const out = {};
  const parts = section.split(/^===\s*(Love|Like|Neutral|Dislike|Hate)\s*===\s*$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const taste = TASTE_OF[parts[i].toLowerCase()];
    const body = parts[i + 1];
    const t = emptyTaste();
    const table = body.match(/\{\|[\s\S]*?\n\|\}/);
    if (table) {
      for (const row of table[0].split(/\n\|-[^\n]*/).slice(1)) {
        const colspan = row.match(/colspan="?\d"?\s*\|([\s\S]*)/);
        if (colspan) {
          for (const li of topLevelItems(colspan[1])) {
            if (/Universal (Loves|Likes|Neutrals|Dislikes|Hates)/.test(li)) {
              t.universal = true;
              const exc = li.split(/Universal (?:Loves|Likes|Neutrals|Dislikes|Hates)\]\]/)[1] || '';
              t.universal_except = exceptIds(exc);
              t.universal_text = plain(li) || null;
              continue;
            }
            const c = parseCategory(li);
            if (c) t.categories.push(c);
            else failures.push(`villager gifts: unrecognised entry "${plain(li)}"`);
          }
          continue;
        }
        const cells = row.split('\n').filter((l) => /^\|(?!\})/.test(l));
        if (cells.length < 2) continue;
        const name = links(cells[1])[0];
        if (!name) continue;
        const id = itemRef(name);
        if (id && !t.items.includes(id)) t.items.push(id);
      }
    }
    out[taste] = t;
  }
  return out;
}

/** A "List of All Gifts" cell (bullets of {{Name|X}} and "All …" entries) -> { items, categories }. */
export function parseGiftCell(cell) {
  const t = { items: [], categories: [] };
  for (const line of cell.split('\n')) {
    const m = line.match(/^\*\s*(.*)$/);
    if (!m) continue;
    const body = m[1].trim();
    const name = body.match(/^\{\{Name\|([^|}]+)/);
    if (name) {
      const id = slug(name[1]);
      if (!t.items.includes(id)) t.items.push(id);
      continue;
    }
    const c = parseCategory(body);
    if (c) t.categories.push(c);
    else {
      const l = links(body)[0];
      if (l) t.items.push(itemRef(l));
    }
  }
  return t;
}

/** "List of All Gifts" -> { groups, rows: [{ name, birthday, tastes }], universals, points }. */
export function parseListOfAllGifts(wikitext) {
  const groups = {};
  for (const m of wikitext.matchAll(/^\*'''([^']+)''' = (.+)$/gm)) {
    const members = [...m[2].matchAll(/\{\{Name\|([^|}]+)/g)].map((x) => slug(x[1]));
    groups[categoryId('', m[1])] = { text: m[1].trim(), members };
  }
  const header = wikitext.match(/!class="unsortable"[^\n]*Loves[^\n]*\(([+-]\d+)\)[\s\S]*?Likes[^\n]*\(([+-]\d+)\)[\s\S]*?Neutral[^\n]*\(([+-]\d+)\)[\s\S]*?Dislikes[^\n]*\(([+-]\d+)\)[\s\S]*?Hates[^\n]*\(([+-]\d+)\)/);
  const points = header ? Object.fromEntries(TASTES.map((t, i) => [t, Number(header[i + 1])])) : null;
  const rows = [];
  let universals = null;
  const table = wikitext.slice(wikitext.indexOf('{|class="wikitable sortable'));
  for (const row of table.split(/\n\|-\n/).slice(1)) {
    const parts = row.split(/\n\|<!--\s*(\w+)\s*-->/);
    const cells = {};
    for (let i = 1; i < parts.length; i += 2) cells[parts[i].toLowerCase()] = parts[i + 2 - 1];
    const tastes = {};
    for (const [k, v] of Object.entries(cells)) if (TASTE_OF[k]) tastes[TASTE_OF[k]] = parseGiftCell(v);
    // "All Cooking except …; and the fish dishes he likes: [[Baked Fish]], …" also names items of another taste.
    for (const [k, v] of Object.entries(cells)) {
      if (!TASTE_OF[k]) continue;
      for (const m of v.replace(/&amp;/g, '&').matchAll(/\b(?:he|she|they) (loves|likes|is neutral towards?|dislikes|hates):([^;\n]*)/g)) {
        const t = VERB_TASTE[m[1].replace(/ towards?$/, ' toward')];
        if (!tastes[t]) continue;
        for (const l of links(m[2])) {
          const id = itemRef(l);
          if (id && !tastes[t].items.includes(id)) tastes[t].items.push(id);
        }
      }
    }
    if (/'''Universals'''/.test(parts[0])) {
      universals = tastes;
      continue;
    }
    const name = parts[0].match(/<br\s*\/>\s*\[\[([^\]|]+)\]\]/);
    if (!name) continue;
    const bd = (cells.birthday || '').match(/\[\[(Spring|Summer|Fall|Winter)\]\]\s*0?(\d+)/);
    rows.push({ name: name[1], birthday: bd ? { season: bd[1].toLowerCase(), day: Number(bd[2]) } : undefined, tastes });
  }
  return { groups, rows, universals, points };
}

/** Infobox birthday: "{{Season|Fall|13}}" or "{{Season|Summer}} 13". */
export function parseInfoboxBirthday(wikitext) {
  const m = wikitext.match(/\|\s*birthday\s*=\s*\{\{Season\|(\w+)(?:\|(\d+))?\}\}\s*(\d+)?/);
  if (!m) return undefined;
  return { season: m[1].toLowerCase(), day: Number(m[2] ?? m[3]) };
}

/** Infobox "marriage = Yes" -> true, "No…" -> false. */
export function parseInfoboxMarriage(wikitext) {
  const m = wikitext.match(/\|\s*marriage\s*=\s*([^\n]*)/);
  if (!m) return undefined;
  return /^\s*yes\b/i.test(m[1]);
}

/** Infobox favourites: the {{Name|X}} list (loved gifts). */
export function parseInfoboxFavorites(wikitext) {
  const m = wikitext.match(/\|\s*favorites\s*=\s*([^\n]*)/);
  return m ? [...m[1].matchAll(/\{\{Name\|([^|}]+)/g)].map((x) => slug(x[1])) : [];
}

/** "Villagers" page -> { giftable: [names], candidates: [names] }. */
export function parseVillagersPage(wikitext) {
  const galleryNames = (s) => [...s.matchAll(/\|link=([^\n|]+)/g)].map((m) => m[1].trim());
  const nonGift = wikitext.indexOf('==Non-giftable');
  const giftable = galleryNames(nonGift < 0 ? wikitext : wikitext.slice(0, nonGift));
  const mc = wikitext.match(/==\[\[Marriage\|Marriage\]\] Candidates==([\s\S]*?)\n==[^=]/);
  return { giftable, candidates: mc ? galleryNames(mc[1]) : [] };
}

/**
 * The "Friendship" page's universal section for one taste -> { items, categories }: bold "All …"
 * bullets are categories (members after "--" are kept), {{Name|X}} bullets are items.
 */
export function parseUniversalSection(text) {
  const t = { items: [], categories: [] };
  for (const line of text.split('\n')) {
    const m = line.match(/^\*\s*(.*)$/);
    if (!m) continue;
    const body = m[1].trim();
    const name = body.match(/^\{\{Name\|([^|}]+)/);
    if (name) {
      t.items.push(slug(name[1]));
      continue;
    }
    const bold = body.match(/^'''(.+?)'''(.*)$/);
    if (!bold) continue;
    const label = bold[1];
    const l = links(label)[0];
    const words = plain(label);
    const id = l ? categoryId(l.target, l.label) : categoryId('', words);
    const restText = bold[2];
    const members = /^\s*--/.test(restText) ? links(restText).map(itemRef).filter(Boolean) : null;
    // "(including X, but excluding Y …)": only the excluded ones are exceptions.
    const exc = restText.replace(/including[\s\S]*?(?=excluding|$)/i, '');
    const c = { id, text: plain(body), except: members ? [] : exceptIds(exc) };
    if (members) c.members = members;
    t.categories.push(c);
  }
  return t;
}

/** Friendship section text between a heading and the next heading of the same or higher level. */
export function section(wikitext, heading) {
  const re = new RegExp(`^(=+)\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\1\\s*$`, 'm');
  const m = wikitext.match(re);
  if (!m) return null;
  const rest = wikitext.slice(m.index + m[0].length);
  const end = rest.search(new RegExp(`^={2,${m[1].length}}[^=]`, 'm'));
  return end < 0 ? rest : rest.slice(0, end);
}

const VERB = /\b(loves|likes|is neutral toward|dislikes|hates)\b/g;
const VERB_TASTE = { loves: 'love', likes: 'like', 'is neutral toward': 'neutral', dislikes: 'dislike', hates: 'hate' };

/**
 * "Universal X exceptions" bullets: "[[Haley]] hates [[Prismatic Shard]]." ->
 * [{ villager, taste, item }|{ villager, taste, category, except }].
 */
export function parseExceptionBullets(text) {
  const out = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^\*\s*(?:\[\[File:[^\]]*\]\]\s*)?\[\[([^\]|]+)\]\]\s*(.*)$/);
    if (!m) continue;
    const villager = m[1];
    const parts = m[2].split(VERB);
    for (let i = 1; i < parts.length; i += 2) {
      const taste = VERB_TASTE[parts[i]];
      const seg = parts[i + 1];
      // Bold entries are groups; links inside "(except …)" are not separate items.
      const withoutParens = seg.replace(/\([^)]*\)/g, '');
      for (const b of withoutParens.matchAll(/'''(.+?)'''/g)) {
        const l = links(b[1])[0];
        out.push({ villager, taste, category: l ? categoryId(l.target, l.label) : categoryId('', plain(b[1])), text: plain(b[1]) });
      }
      for (const l of links(withoutParens.replace(/'''.+?'''/g, ''))) {
        const id = itemRef(l);
        if (id) out.push({ villager, taste, item: id });
      }
    }
  }
  return out;
}

/** "Universal Likes exceptions" table -> same shape as parseExceptionBullets. */
export function parseExceptionTable(text) {
  const out = [];
  const table = text.match(/\{\|[\s\S]*?\n\|\}/);
  if (!table) return out;
  for (const row of table[0].split(/\n\|-[^\n]*/).slice(1)) {
    const npc = row.match(/\{\{NPC\|([^}|]+)/);
    if (!npc) continue;
    const parts = row.split(/\n\|<!--\s*(\w+)\s*-->/);
    for (let i = 1; i < parts.length; i += 2) {
      const taste = TASTE_OF[parts[i].toLowerCase()];
      for (const seg of parts[i + 1].split(/<br\s*\/?>/)) {
        const s = seg.trim();
        if (!s) continue;
        if (/^'''\[\[/.test(s)) {
          const l = links(s)[0];
          out.push({ villager: npc[1], taste, category: categoryId(l.target, l.label), text: plain(s) });
          continue;
        }
        const body = s.replace(/^'''[^']*:'''/, '').split(/\bexcept\b/)[0];
        for (const l of links(body)) {
          const id = itemRef(l);
          if (id) out.push({ villager: npc[1], taste, item: id });
        }
      }
    }
  }
  return out;
}

/** GiftsByItem template on an item page -> { villagerName: taste }. */
export function parseGiftsByItem(wikitext) {
  const m = wikitext.match(/\{\{GiftsByItem([\s\S]*?)\}\}/);
  if (!m) return null;
  const out = {};
  for (const p of m[1].matchAll(/\|\s*(love|like|neutral|dislike|hate)\s*=\s*([^|}]*)/g)) {
    for (const n of p[2].split(',').map((x) => x.trim()).filter(Boolean)) out[n] = p[1];
  }
  return out;
}

/** Group expansion used only for comparing two pages: All Eggs / All Mushrooms -> their members. */
export function normalizeTaste(t, groups) {
  const items = new Set(t.items);
  const cats = new Map();
  for (const c of t.categories) {
    const g = groups[c.id];
    if (g) {
      for (const id of g.members) if (!c.except.includes(id)) items.add(id);
    } else cats.set(c.id, c.except);
  }
  return { items, cats };
}

/** Two-of-N agreement (same contract as import-animals.mjs). */
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

/** Friendship point table: "| Love\n| +80\n| +88 …" -> { love: [80, 88, 400, 440, 640, 704], … }. */
export function parsePointTable(text) {
  const out = {};
  for (const m of text.matchAll(/^\|\s*(Love|Like|Neutral|Dislike|Hate)\s*\n((?:\|\s*[+-]?\d+\s*\n?)+)/gm)) {
    out[m[1].toLowerCase()] = [...m[2].matchAll(/([+-]?\d+)/g)].map((x) => Number(x[1]));
  }
  return out;
}

/**
 * Rendered {{Name|X}} templates: the wiki shows some names under another article's name
 * ({{Name|Green Frog Egg}} renders as "Frog Egg"). Returns Map(slug(template name) -> slug(shown name))
 * for the names that differ.
 */
export function parseNameTemplateHtml(html) {
  const out = new Map();
  for (const m of html.matchAll(/<span class="nametemplate"><img alt="([^"]+?)\.png"[^>]*>\s*<a [^>]*>([^<]+)<\/a>/g)) {
    const from = slug(m[1].replace(/&#39;/g, "'").replace(/&amp;/g, '&'));
    const to = slug(m[2].replace(/&#39;/g, "'").replace(/&amp;/g, '&'));
    if (from !== to) out.set(from, to);
  }
  return out;
}

/** Quality multiplier table (wikitext): { normal: 1, silver: 1.1, gold: 1.25, iridium: 1.5 }. */
export function parseQualityTable(text) {
  const out = {};
  for (const m of text.matchAll(/^\|\s*(Normal|Silver|Gold|Iridium)\s*\n\|\s*×([\d.]+)/gm)) out[m[1].toLowerCase()] = Number(m[2]);
  return out;
}

/** Quality multiplier table (rendered HTML). */
export function parseQualityHtml(html) {
  const out = {};
  for (const m of html.matchAll(/<td>\s*(Normal|Silver|Gold|Iridium)\s*<\/td>\s*<td>\s*×([\d.]+)/g)) out[m[1].toLowerCase()] = Number(m[2]);
  return out;
}

/* ------------------------------------------------------------------ main */

// Representative member pages used to confirm universal dislike/hate groups on a second page.
// These are pointers to wiki pages, not data: the taste is read from that page's GiftsByItem.
const GROUP_PROBES = {
  'all-artifacts': 'Chipped Amphora',
  'all-bombs': 'Cherry Bomb',
  'all-crafted-floors-paths': 'Wood Floor',
  'all-fences': 'Wood Fence',
  'all-fertilizer': 'Basic Fertilizer',
  'all-fish': 'Sardine',
  'all-geode-minerals': 'Jasper',
  'all-geodes': 'Geode',
  'all-seeds': 'Parsnip Seeds',
  'all-sprinklers': 'Sprinkler',
  'all-tackle': 'Spinner',
  'all-trinkets': 'Magic Quiver',
  'all-bait': 'Deluxe Bait',
  'all-fossils': 'Fossilized Skull',
  'all-monster-loot': 'Bug Meat',
  'all-trash': 'Broken CD',
};

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const villagersPage = await page('Villagers');
  const loagPage = await page('List of All Gifts');
  const friendPage = await page('Friendship');
  const friendHtml = await rendered('Friendship');
  const headerPage = await page('Template:GiftHeader');
  const winterPage = await page('Feast of the Winter Star');
  const f101Page = await page('Friendship 101');
  const teaPage = await page('Stardrop Tea');

  const V = parseVillagersPage(villagersPage.wikitext);
  const L = parseListOfAllGifts(loagPage.wikitext);
  const loagHtml = await rendered('List of All Gifts');
  // Items the wiki's Name template shows under another name are stored under the shown name.
  const shownAs = parseNameTemplateHtml(loagHtml.html);
  const aliases = new Map();
  for (const tastes of [L.universals, ...L.rows.map((r) => r.tastes)]) {
    for (const t of Object.values(tastes || {})) {
      t.items = t.items.map((id) => {
        if (!shownAs.has(id)) return id;
        aliases.set(id, shownAs.get(id));
        return shownAs.get(id);
      });
    }
  }
  const F = friendPage.wikitext;
  if (V.giftable.length < 30) failures.push(`Villagers: giftable gallery not found (${V.giftable.length})`);
  const loagNames = L.rows.map((r) => r.name);
  for (const n of V.giftable) if (!loagNames.includes(n)) failures.push(`List of All Gifts: no row for ${n}`);
  for (const n of loagNames) if (!V.giftable.includes(n)) failures.push(`Villagers: ${n} has a gift row but is not in the giftable galleries`);
  if (!L.universals) failures.push('List of All Gifts: Universals row not found');

  /* ---------- Points and multipliers ---------- */
  const pointTable = parsePointTable(section(F, 'Gifts') || '');
  const qualityWiki = parseQualityTable(section(F, 'Gifts') || '');
  const qualityHtml = parseQualityHtml(friendHtml.html);
  const scoring = { problems: [] };
  const points = {};
  for (const t of TASTES) {
    const r = agree([
      { source: 'Friendship', value: pointTable[t]?.[0] },
      { source: 'List of All Gifts', value: L.points?.[t] },
    ]);
    if (!r.ok) failures.push(`${t} points lack two agreeing sources (Friendship=${pointTable[t]?.[0]}, List of All Gifts=${L.points?.[t]})`);
    points[t] = r.value;
  }
  const evid = {
    love: quote(friendPage, /(These items are guaranteed to give the most points \(80\) towards your relationship[^.]*\.)/),
    like: quote(friendPage, /(a liked gift increases friendship by 45 points[^.]*\.)/),
    neutral: quote(friendPage, /(This is a list of items that will elicit a neutral response from the villagers, and give 20 points toward '''friendship'''\.)/),
    dislike: quote(friendPage, /(This is a list of items that will decrease '''friendship''' by 20 points when given as gifts\.)/),
    hate: quote(friendPage, /(This is a list of items that will decrease '''friendship''' by 40 points when given as gifts\.)/),
  };
  const fromEvidence = { love: 80, like: 45, neutral: 20, dislike: -20, hate: -40 };
  for (const t of TASTES) {
    const n = evid[t] && Number(evid[t].match(/(\d+) points/)?.[1] ?? evid[t].match(/\((\d+)\)/)?.[1]);
    if (n == null || Math.abs(points[t]) !== n) failures.push(`Friendship: ${t} evidence sentence does not state ${points[t]} (${evid[t]})`);
    void fromEvidence;
  }

  // Multipliers: the Friendship table columns are Normal, x1.1, Winter Star, x1.1, Birthday, x1.1.
  const multSentence = quote(friendPage, /(The friendship points are multiplied on their birthday \(×8\) and \[\[Feast of the Winter Star\|Feast of the Winter Star secret gifting event\]\] \(×5\), as well as after reading \[\[Friendship 101\]\] \(x1\.1\):?)/);
  const fromTable = (col) => (pointTable.love ? pointTable.love[col] / pointTable.love[0] : undefined);
  const headerSentence = quote(headerPage, /(Gifts on [\s\S]*?will have 8× effect and show a unique dialogue\.)/);
  const birthday = agree([
    { source: 'Friendship (table)', value: fromTable(4) },
    { source: 'Friendship (sentence)', value: Number(multSentence?.match(/birthday \(×(\d+)\)/)?.[1]) || undefined },
    { source: 'Template:GiftHeader', value: Number(headerSentence?.match(/(\d+)× effect/)?.[1]) || undefined },
  ]);
  const winterSentence = quote(winterPage, /(The gift the player selects for their villager will be worth 5x the normal amount of \[\[friendship\]\] points\.)/);
  const winter = agree([
    { source: 'Friendship (table)', value: fromTable(2) },
    { source: 'Feast of the Winter Star', value: Number(winterSentence?.match(/worth (\d+)x/)?.[1]) || undefined },
  ]);
  const f101Sentence = quote(f101Page, /(The first reading grants the player a power that increases any \[\[friendship\]\] gained by 10%\. Friendship decreases are unaffected\.)/);
  const f101 = agree([
    { source: 'Friendship (sentence)', value: Number(multSentence?.match(/\(x([\d.]+)\)/)?.[1]) || undefined },
    { source: 'Friendship 101', value: f101Sentence ? 1 + Number(f101Sentence.match(/(\d+)%/)[1]) / 100 : undefined },
  ]);
  for (const [name, r] of [['birthday', birthday], ['winter star', winter], ['Friendship 101', f101]]) {
    if (!r.ok) failures.push(`${name} multiplier lacks two agreeing sources (${JSON.stringify(r.disagreeing)})`);
    for (const d of r.disagreeing) scoring.problems.push(`${name} multiplier: ${d.source} says ${d.value}, ${r.agreeing.join(' and ')} say ${r.value}`);
  }
  const quality = {};
  for (const q of ['normal', 'silver', 'gold', 'iridium']) {
    const r = agree([
      { source: 'Friendship (wikitext)', value: qualityWiki[q] },
      { source: 'Friendship (rendered)', value: qualityHtml[q] },
    ]);
    if (!r.ok) failures.push(`quality multiplier ${q} lacks two agreeing sources (${qualityWiki[q]}, ${qualityHtml[q]})`);
    quality[q] = r.value;
  }
  const equation = quote(friendPage, /(For liked or loved gifts, the equation is <code>Event Multiplier × Preference × Quality Multiplier<\/code>[^.]*\.)/);
  const eqSentence = quote(friendPage, /(<samp>Quality Multiplier<\/samp> is 1, 1\.1, 1\.25, or 1\.5\.)/);
  const eqNums = (eqSentence?.match(/\d+(?:\.\d+)?/g) || []).map(Number);
  if (JSON.stringify(eqNums) !== JSON.stringify([quality.normal, quality.silver, quality.gold, quality.iridium])) failures.push(`Friendship: quality equation sentence ${eqNums} disagrees with the table`);
  const appliesTo = quote(friendPage, /(If a gift is liked or loved, the points gained will be further affected by the quality of the item:?)/);
  const maxExample = quote(friendPage, /(The highest friendship points possible from a single gift would be to gift someone an iridium-quality loved gift on their birthday, which would yield (\d+) points[^.]*\.)/);
  const maxPoints = Number(maxExample?.match(/yield (\d+) points/)?.[1]);
  if (points.love * birthday.value * quality.iridium !== maxPoints) failures.push(`Friendship: ${points.love} x ${birthday.value} x ${quality.iridium} does not reproduce the wiki's ${maxPoints}`);
  // Stardrop Tea is a universal love worth 250 points (750 on a birthday / at the Winter Star).
  const teaF = quote(friendPage, /(\[\[Stardrop Tea\]\] grants 250 friendship points[^.]*\.)/);
  const teaT = quote(teaPage, /(Stardrop Tea can be \[\[Friendship#Gifts\|gifted\]\] for 250 friendship points[^.]*\.)/);
  const tea = agree([
    { source: 'Friendship', value: Number(teaF?.match(/(\d+) friendship points/)?.[1]) || undefined },
    { source: 'Stardrop Tea', value: Number(teaT?.match(/(\d+) friendship points/)?.[1]) || undefined },
  ]);
  const teaEvent = agree([
    { source: 'Friendship', value: Number(F.match(/If given on a villager's birthday or at the \[\[Feast of the Winter Star\]\], it gives (\d+) points/)?.[1]) || undefined },
    { source: 'Stardrop Tea', value: Number(teaPage.wikitext.match(/If given as a birthday gift or during the \[\[Feast of the Winter Star\]\], it is worth (\d+) friendship points/)?.[1]) || undefined },
  ]);
  if (!tea.ok || !teaEvent.ok) failures.push('Stardrop Tea points lack two agreeing sources');

  const friendship = {
    points,
    multipliers: { birthday: birthday.value, winter_star: winter.value, friendship_101: f101.value },
    quality_multipliers: quality,
    quality_applies_to: ['love', 'like'],
    special: [{ item: 'stardrop-tea', points: tea.value, birthday_or_winter_star_points: teaEvent.value }],
    max_single_gift: maxPoints,
    evidence: {
      points: evid,
      multipliers: multSentence,
      birthday: headerSentence,
      winter_star: winterSentence,
      friendship_101: f101Sentence,
      quality: appliesTo,
      equation: plain(`${equation} ${eqSentence}`),
      max_single_gift: maxExample,
      stardrop_tea: teaT,
    },
    sources: [ref(friendPage, 'Gifts'), ref(loagPage), ref(headerPage), ref(winterPage, 'Gift-giving'), ref(f101Page), ref(teaPage), { ...ref(friendHtml, 'Gifts') }],
    verification_status: scoring.problems.length ? 'needs-verification' : 'verified',
    problems: scoring.problems,
  };

  /* ---------- Universal tastes ---------- */
  const uniProblems = [];
  const uniF = {
    love: parseUniversalSection(section(F, 'Universal Loves') || ''),
    like: parseUniversalSection(section(F, 'Universal Likes') || ''),
    neutral: parseUniversalSection(section(F, 'Universal Neutrals') || ''),
    dislike: parseUniversalSection(section(F, 'Universal Dislikes') || ''),
    hate: parseUniversalSection(section(F, 'Universal Hates') || ''),
  };
  for (const t of TASTES) if (!uniF[t].items.length) failures.push(`Friendship: Universal ${t} list not found`);
  const itemPages = new Map();
  const itemPage = async (title) => {
    if (!itemPages.has(title)) {
      try {
        itemPages.set(title, await page(title));
      } catch (e) {
        itemPages.set(title, null);
      }
    }
    return itemPages.get(title);
  };
  const nameOf = new Map(); // id -> display name, from {{Name|X}} / links
  const remember = (text) => {
    for (const m of text.matchAll(/\{\{Name\|([^|}]+)(?:\|link=([^|}]+(?:\{\{![^|}]*)?))?/g)) nameOf.set(slug(m[1]), { name: m[1].trim(), page: (m[2] || m[1]).replace(/\{\{!.*$/, '').trim() });
    for (const l of links(text)) {
      const id = itemRef(l);
      if (id && !id.startsWith('all-') && !nameOf.has(id)) nameOf.set(id, { name: id === slug(l.target) ? l.target : l.label, page: l.target });
    }
  };
  remember(loagPage.wikitext);
  remember(F);

  const universal = {};
  for (const t of TASTES) {
    const f = uniF[t];
    const lo = L.universals?.[t];
    const u = { items: f.items.slice().sort(), categories: f.categories, verified: {} };
    if (lo && (lo.items.length || lo.categories.length)) {
      // Loves, likes, neutrals: both pages list them.
      const fi = new Set(f.items);
      const li = new Set(lo.items);
      for (const id of fi) if (!li.has(id)) uniProblems.push(`${t}: Friendship lists ${id}, List of All Gifts does not`);
      for (const id of li) if (!fi.has(id)) uniProblems.push(`${t}: List of All Gifts lists ${id}, Friendship does not`);
      const lc = new Map(lo.categories.map((c) => [c.id, c]));
      for (const c of f.categories) {
        const o = lc.get(c.id);
        if (!o) failures.push(`universal ${t}: ${c.id} on Friendship but not on List of All Gifts`);
        else if (JSON.stringify(o.except) !== JSON.stringify(c.except)) uniProblems.push(`${t} ${c.id}: Friendship excepts [${c.except}], List of All Gifts excepts [${o.except}]`);
        c.list_of_all_gifts_text = o?.text;
      }
      for (const c of lo.categories) if (!f.categories.some((x) => x.id === c.id)) failures.push(`universal ${t}: ${c.id} on List of All Gifts but not on Friendship`);
      u.verified = { items: ['Friendship', 'List of All Gifts'], categories: ['Friendship', 'List of All Gifts'] };
    } else {
      // Dislikes, hates: List of All Gifts only links to Friendship, so read each item's own page.
      const probes = [...f.items.map((id) => ({ id, title: nameOf.get(id)?.page || id })), ...f.categories.map((c) => ({ id: c.id, title: c.members?.[0] ? nameOf.get(c.members[0])?.page || c.members[0] : GROUP_PROBES[c.id] }))];
      const itemSources = [];
      for (const pr of probes) {
        if (!pr.title) {
          failures.push(`universal ${t}: no item page to confirm ${pr.id}`);
          continue;
        }
        const p = await itemPage(pr.title);
        const g = p && parseGiftsByItem(p.wikitext);
        if (!g) {
          // Some item pages state it in prose instead ("both items are universally hated").
          const word = { dislike: 'disliked', hate: 'hated' }[t];
          if (p && new RegExp(`universally ${word}`, 'i').test(p.wikitext)) {
            itemSources.push(ref(p));
            continue;
          }
          uniProblems.push(`${t} ${pr.id}: item page "${pr.title}" has no GiftsByItem table`);
          continue;
        }
        const n = V.giftable.filter((v) => g[v] === t).length;
        if (n * 2 < V.giftable.length) uniProblems.push(`${t} ${pr.id}: only ${n} of ${V.giftable.length} villagers ${t} it on "${p.title}"`);
        itemSources.push(ref(p, 'Gifting'));
      }
      u.verified = { items: ['Friendship', 'item pages (GiftsByItem)'], categories: ['Friendship', 'item pages (GiftsByItem)'] };
      u.item_sources = itemSources;
    }
    universal[t] = u;
  }

  // Per-villager exceptions to the universal tastes, as listed on the Friendship page.
  const exceptions = [
    ...parseExceptionBullets(section(F, 'Universal Loves exceptions') || '').map((e) => ({ ...e, universal: 'love' })),
    ...parseExceptionTable(section(F, 'Universal Likes exceptions') || '').map((e) => ({ ...e, universal: 'like' })),
    ...parseExceptionBullets(section(F, 'Universal Neutrals exceptions') || '').map((e) => ({ ...e, universal: 'neutral' })),
    ...parseExceptionBullets(section(F, 'Universal Dislikes exceptions') || '').map((e) => ({ ...e, universal: 'dislike' })),
    ...parseExceptionBullets(section(F, 'Universal Hates exceptions') || '').map((e) => ({ ...e, universal: 'hate' })),
  ];
  if (exceptions.length < 50) failures.push(`Friendship: universal exception lists not found (${exceptions.length})`);
  for (const e of exceptions) if (!V.giftable.includes(e.villager)) failures.push(`Friendship: exception for unknown villager ${e.villager}`);

  /* ---------- Villagers ---------- */
  const villagers = [];
  for (const name of V.giftable) {
    const p = await page(name);
    const row = L.rows.find((r) => r.name === name);
    const problems = [];
    const verified = {};
    const w = p.wikitext;

    const bd = agree([
      { source: `${name} (infobox)`, value: parseInfoboxBirthday(w) },
      { source: 'List of All Gifts', value: row?.birthday },
    ]);
    if (!bd.ok) failures.push(`${name}: birthday lacks two agreeing sources`);
    verified.birthday = bd.agreeing;

    const mc = agree([
      { source: `${name} (infobox)`, value: parseInfoboxMarriage(w) },
      { source: 'Villagers', value: V.candidates.includes(name) },
    ]);
    if (!mc.ok) failures.push(`${name}: marriage candidate lacks two agreeing sources`);
    verified.marriage_candidate = mc.agreeing;

    const own = parseVillagerGifts(w);
    if (!own) {
      failures.push(`${name}: Gifts section not found`);
      continue;
    }
    for (const t of TASTES) if (!own[t]) failures.push(`${name}: Gifts section has no ${t} table`);
    remember(w.slice(w.indexOf('==Gifts==')));

    // Taste of each item as each source sees it (groups expanded for the comparison only).
    const pageNorm = Object.fromEntries(TASTES.map((t) => [t, normalizeTaste(own[t] || emptyTaste(), L.groups)]));
    const loagNorm = Object.fromEntries(TASTES.map((t) => [t, normalizeTaste(row?.tastes[t] || emptyTaste(), L.groups)]));
    const tasteIn = (norm, id) => TASTES.find((t) => norm[t].items.has(id));
    // Two spellings of one item ("Frog Egg" / "Green Frog Egg"): an id only one page uses is
    // matched to an id only the other page uses when the wiki resolves both to the same article.
    {
      const onlyPage = [];
      const onlyLoag = [];
      for (const t of TASTES) {
        for (const id of pageNorm[t].items) if (!tasteIn(loagNorm, id)) onlyPage.push(id);
        for (const id of loagNorm[t].items) if (!tasteIn(pageNorm, id)) onlyLoag.push(id);
      }
      if (onlyPage.length && onlyLoag.length) {
        const canon = async (id) => {
          const pg = await itemPage(nameOf.get(id)?.page || nameOf.get(id)?.name || id);
          return pg ? slug(pg.title) : id;
        };
        for (const b of onlyLoag) {
          const cb = await canon(b);
          for (const a of onlyPage) {
            if ((await canon(a)) !== cb) continue;
            const keep = cb === b ? b : a;
            const drop = keep === a ? b : a;
            for (const norm of [pageNorm, loagNorm]) for (const t of TASTES) if (norm[t].items.delete(drop)) norm[t].items.add(keep);
            aliases.set(drop, keep);
          }
        }
      }
    }
    const favorites = parseInfoboxFavorites(w).map((id) => shownAs.get(id) ?? id);
    const myExc = exceptions.filter((e) => e.villager === name && e.item);
    const allIds = new Set([...TASTES.flatMap((t) => [...pageNorm[t].items, ...loagNorm[t].items])]);
    const resolved = Object.fromEntries(TASTES.map((t) => [t, new Set()]));
    for (const id of allIds) {
      const a = tasteIn(pageNorm, id);
      const b = tasteIn(loagNorm, id);
      if (a === b) {
        resolved[a].add(id);
        continue;
      }
      const votes = [
        { source: `${name} (Gifts section)`, value: a },
        { source: 'List of All Gifts', value: b },
        { source: 'Friendship (universal exceptions)', value: myExc.find((e) => e.item === id)?.taste },
        { source: `${name} (infobox favorites)`, value: favorites.includes(id) ? 'love' : undefined },
      ];
      const r = agree(votes);
      const value = r.ok ? r.value : a ?? b;
      resolved[value].add(id);
      const said = votes.filter((v) => v.value !== undefined).map((v) => `${v.source}: ${v.value}`).join('; ');
      const silent = votes.slice(0, 2).filter((v) => v.value === undefined).map((v) => v.source);
      problems.push(`${id}: ${said}${silent.length ? `; not listed on ${silent.join(', ')}` : ''} -> ${value}${r.ok ? '' : ' (no two sources agree)'}`);
    }
    // Infobox favourites must all be loved.
    for (const id of favorites) if (!resolved.love.has(id)) problems.push(`${id}: infobox favorite but not loved on the Gifts section / List of All Gifts`);
    // Friendship's universal-exception statements must match.
    for (const e of myExc) {
      const t = TASTES.find((x) => resolved[x].has(e.item));
      if (t && t !== e.taste) problems.push(`${e.item}: Friendship universal ${e.universal} exceptions say ${e.taste}, resolved ${t}`);
    }

    const tastes = {};
    for (const t of TASTES) {
      const mine = own[t] || emptyTaste();
      const theirs = row?.tastes[t] || emptyTaste();
      const cats = [];
      const seen = new Set();
      for (const c of [...mine.categories, ...theirs.categories]) {
        if (seen.has(c.id) || L.groups[c.id]?.members && false) continue;
        seen.add(c.id);
        const m = mine.categories.find((x) => x.id === c.id);
        const o = theirs.categories.find((x) => x.id === c.id);
        const expandable = Boolean(L.groups[c.id]);
        if (!expandable) {
          if (!m) problems.push(`${t} ${c.id}: on List of All Gifts ("${o.text}") but not on the ${name} page`);
          else if (!o) problems.push(`${t} ${c.id}: on the ${name} page ("${m.text}") but not on List of All Gifts`);
          else if (JSON.stringify(m.except) !== JSON.stringify(o.except)) problems.push(`${t} ${c.id}: ${name} page excepts [${m.except}], List of All Gifts excepts [${o.except}]`);
        }
        cats.push({ id: c.id, text: (m || o).text, except: (m || o).except });
      }
      // Items covered by a kept group marker are not repeated as items.
      const groupMembers = new Set();
      for (const c of cats) if (L.groups[c.id]) for (const id of L.groups[c.id].members) if (!c.except.includes(id)) groupMembers.add(id);
      tastes[t] = {
        items: [...resolved[t]].filter((id) => !groupMembers.has(id)).sort(),
        categories: cats,
        universal: mine.universal,
        universal_except: mine.universal_except,
      };
    }
    // A group kept as a marker must not hide a member that resolved to another taste.
    for (const t of TASTES) {
      for (const c of tastes[t].categories) {
        const g = L.groups[c.id];
        if (!g) continue;
        for (const id of g.members) {
          if (c.except.includes(id)) continue;
          const other = TASTES.find((x) => x !== t && resolved[x].has(id));
          if (other) c.except = [...new Set([...c.except, id])].sort();
        }
      }
    }
    for (const t of TASTES) if (!own[t]?.universal) problems.push(`${t}: the ${name} page does not say whether the universal ${t}s apply`);

    villagers.push({
      id: slug(name),
      name,
      birthday: bd.value,
      marriage_candidate: mc.value,
      tastes,
      evidence: {
        birthday: plain(w.match(/\|\s*birthday\s*=\s*([^\n]*)/)?.[1] || ''),
        marriage: plain(w.match(/\|\s*marriage\s*=\s*([^\n]*)/)?.[1] || ''),
      },
      sources: [ref(p, 'Gifts'), ref(loagPage), ref(villagersPage), ref(friendPage, 'Universal Gifts')],
      verified: { ...verified, tastes: [`${name} (Gifts section)`, 'List of All Gifts'] },
      verification_status: problems.length ? 'needs-verification' : 'verified',
      problems,
    });
  }

  /* ---------- Categories and items ---------- */
  const catIds = new Set();
  for (const v of villagers) for (const t of TASTES) for (const c of v.tastes[t].categories) catIds.add(c.id);
  for (const t of TASTES) for (const c of universal[t].categories) catIds.add(c.id);
  const categories = [...catIds].sort().map((id) => {
    const g = L.groups[id];
    const uni = TASTES.flatMap((t) => universal[t].categories).find((c) => c.id === id);
    const members = g?.members ?? uni?.members ?? null;
    return { id, members, source: g ? ref(loagPage) : uni?.members ? ref(friendPage, 'Universal Gifts') : null };
  });
  for (const c of categories) for (const m of c.members || []) catIds.add(m);
  const usedIds = new Set();
  for (const v of villagers) for (const t of TASTES) for (const id of v.tastes[t].items) usedIds.add(id);
  for (const t of TASTES) for (const id of universal[t].items) usedIds.add(id);
  for (const c of categories) for (const id of c.members || []) usedIds.add(id);
  const items = [...usedIds].sort().map((id) => {
    const also = [...aliases].filter(([, k]) => k === id).map(([d]) => nameOf.get(d)?.name ?? d);
    return { id, name: nameOf.get(id)?.name ?? null, ...(also.length ? { also_called: also } : {}) };
  });
  for (const it of items) if (!it.name) failures.push(`item ${it.id}: no display name found on the wiki pages read`);

  // Ids that also exist in the other data files must be spelled the same way.
  const known = new Map();
  for (const f of ['crops.json', 'animals.json', 'fishponds.json']) {
    const walk = (o) => {
      if (Array.isArray(o)) o.forEach(walk);
      else if (o && typeof o === 'object') {
        if (typeof o.id === 'string' && typeof o.name === 'string') known.set(o.name.toLowerCase(), o.id);
        Object.values(o).forEach(walk);
      }
    };
    walk(JSON.parse(readFileSync(join(ROOT, 'data', f), 'utf8')));
  }
  for (const it of items) {
    const k = it.name && known.get(it.name.toLowerCase());
    if (k && k !== it.id) failures.push(`item ${it.name}: id ${it.id} differs from existing id ${k}`);
  }

  const universalOut = {
    ...Object.fromEntries(TASTES.map((t) => [t, { items: universal[t].items, categories: universal[t].categories.map(({ members, list_of_all_gifts_text, ...c }) => c), verified: universal[t].verified }])),
    exceptions: exceptions.map(({ villager, universal: u, taste, item, category, text }) => ({ villager: slug(villager), universal: u, taste, ...(item ? { item } : { category, text }) })),
    sources: [ref(friendPage, 'Universal Gifts'), ref(loagPage), ...TASTES.flatMap((t) => universal[t].item_sources || [])],
    verification_status: uniProblems.length ? 'needs-verification' : 'verified',
    problems: uniProblems,
  };

  /* ---------- Fixture sanity: the test's spot checks come from other pages ---------- */
  const out = {
    schema: 'stardew-tools/gifts@1',
    game_version: GAME_VERSION,
    generated: today,
    last_verified: today,
    source: 'Stardew Valley Wiki (CC BY-NC-SA 3.0), cross-checked between each villager page, List of All Gifts, Friendship, Villagers and item pages',
    sources: [ref(villagersPage), ref(loagPage), ref(friendPage), ref(headerPage), ref(winterPage), ref(f101Page), ref(teaPage)],
    friendship,
    universal: universalOut,
    categories,
    villagers,
    items,
  };
  if (failures.length) {
    console.error('Gift import failed:\n  ' + [...new Set(failures)].join('\n  '));
    process.exit(1);
  }
  writeFileSync(join(ROOT, 'data', 'gifts.json'), JSON.stringify(out, null, 2) + '\n');
  const bad = villagers.filter((r) => r.problems.length);
  console.log(`${villagers.length} villagers, ${items.length} items, ${categories.length} categories written; ${bad.length} villagers need verification`);
  for (const r of bad) console.log(`  ${r.name}: ${r.problems.join(' | ')}`);
  if (uniProblems.length) console.log(`  universal: ${uniProblems.join(' | ')}`);
  if (scoring.problems.length) console.log(`  friendship: ${scoring.problems.join(' | ')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

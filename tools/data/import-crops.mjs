#!/usr/bin/env node
// Builds data/crops.json from the Stardew Valley Wiki.
//
// Every crop is read from two places: the "Crops" overview page and the crop's own page.
// Growth stages, total days, sell price and seasons must agree between the two; a crop
// where anything disagrees is written with verification_status "needs-verification",
// which the calculators refuse to use as authoritative input.
//
//   node tools/data/import-crops.mjs            # fetch live, write data/crops.json
//   node tools/data/import-crops.mjs --cached   # reuse tools/data/.cache (offline re-run)
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchPage, sleep } from './wiki.mjs';
import { parseCalendars } from './parse-calendars.mjs';
import { splitCropsPage, parseCropSection, parseCropPage, parsePageStages, slug } from './parse-crops.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = join(ROOT, 'tools', 'data', '.cache');
const GAME_VERSION = '1.6.15';
const useCache = process.argv.includes('--cached');

// Entries on the Crops page that are not single plantable crops with a fixed product.
const SKIP = {
  'Fiber': 'Grows from Fiber Seeds and yields 4-7 Fiber; no sell-price row on the Crops page.',
  'Mixed Seeds': 'Random crop; not a crop of its own.',
  'Mixed Flower Seeds': 'Random flower; not a crop of its own.',
  'Tea Leaves': 'Grows on a Tea Bush (harvest days 22-28 only), modelled separately.',
};

const SOURCE_KEYS = {
  "Pierre's": 'pierre',
  'JojaMart': 'jojamart',
  'Oasis': 'oasis',
  'Traveling Cart': 'traveling_cart',
  'Egg Festival': 'egg_festival',
  'Crafting Recipe': 'crafting',
};

// Harvests the wiki describes in words the sentence parser cannot read. Each entry quotes its source.
const YIELD_OVERRIDES = {
  // "50/50 chance of giving either one or two Unmilled Rice at farming level 0, or one or three
  // ... at farming level 10 or higher, plus an additional 10% chance of one or more extra rice
  // (1.61 rice on average, or 2.11 at farming level 10+)" (Unmilled Rice page).
  'Unmilled Rice': { min: 1, max: 2, max_per_level: 0.1, extra_chance: 0.1, stated: true },
};

const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5 };

async function page(title) {
  const file = join(CACHE, `${slug(title)}.json`);
  if (useCache && existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  const p = await fetchPage(title);
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(file, JSON.stringify(p));
  await sleep(400); // be polite to the wiki
  return p;
}

/** Harvest size from the wiki's own sentences ("yields 3 ...", "2% chance for more"). */
export function parseYield(text) {
  const t = text.replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1');
  const n = t.match(/\b(?:yields?|produces?|gives?)\s+(?:at least\s+)?(\d+|one|two|three|four|five)\b(?![-–])/i);
  const min = n ? WORDS[n[1].toLowerCase()] || Number(n[1]) : 1;
  let extra = 0;
  const pct = t.match(/(\d+(?:\.\d+)?)%\s+chance\s+(?:of|for|to)\s+(?:yielding\s+|produce\s+|get\s+)?(?:more|an? extra|extra)/i);
  if (pct) extra = Number(pct[1]) / 100;
  const avg = t.match(/on average,?\s+(\d+(?:\.\d+)?)\s+extra/i);
  if (avg) extra = Math.round((Number(avg[1]) / (1 + Number(avg[1]))) * 1e6) / 1e6;
  return { min, max: min, max_per_level: 0, extra_chance: extra, stated: Boolean(n || pct || avg) };
}

const sameList = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

async function main() {
  const crops = await page('Crops');
  // Category lists: a crop is a fruit/vegetable/flower when it appears in that page's tables.
  const lists = {};
  for (const [cat, title] of [['fruit', 'Fruits'], ['vegetable', 'Vegetables'], ['flower', 'Flowers']]) {
    const p = await page(title);
    lists[cat] = { page: p, tables: p.wikitext.slice(p.wikitext.indexOf('{|')) };
  }
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const listCategory = (name) =>
    Object.keys(lists).filter((cat) => new RegExp(`\\[\\[${esc(name)}(?:\\|[^\\]]*)?\\]\\]|File:${esc(name)}\\.png`).test(lists[cat].tables));
  const calPage = await page('Crop Growth Calendars');
  const calendars = new Map(parseCalendars(calPage.wikitext).map((c) => [c.name, c]));
  const fixtures = {};
  const today = new Date().toISOString().slice(0, 10);
  const records = [];
  const skipped = [];

  for (const section of splitCropsPage(crops.wikitext)) {
    if (SKIP[section.name]) {
      skipped.push({ name: section.name, reason: SKIP[section.name] });
      continue;
    }
    const a = parseCropSection(section);
    const cp = await page(a.name);
    const b = parseCropPage(cp.wikitext, a.seed);
    const st = parsePageStages(cp.wikitext);

    const problems = [];
    if (!a.phases.length || a.total == null) problems.push('Crops page: growth stages not found');
    if (a.phases.reduce((s, d) => s + d, 0) !== a.total) problems.push(`Crops page: stages sum ${a.phases.join('+')} != total ${a.total}`);
    if (b.growth !== a.total) problems.push(`growth days differ: Crops page ${a.total}, crop page ${b.growth}`);
    // Stage lengths have three sources: Crops page, crop page and the growth calendar.
    // Two agreeing sources are enough; the odd one out is recorded as a note.
    const cal = calendars.get(a.name);
    const calBase = cal && cal.tables.find((t) => /^Base( Unirrigated)?$/.test(t.label));
    const stageVotes = [st.phases.length ? sameList(st.phases, a.phases) : null, calBase ? sameList(calBase.phases, a.phases) : null];
    const agree = stageVotes.filter((v) => v === true).length;
    const disagree = stageVotes.filter((v) => v === false).length;
    if (!agree) problems.push(`stages not confirmed by a second source (Crops page ${a.phases.join('/')}, crop page ${st.phases.join('/') || 'n/a'}, calendar ${calBase ? calBase.phases.join('/') : 'n/a'})`);
    const stageNote = disagree
      ? `Stage lengths: ${stageVotes[0] === false ? `the crop page shows ${st.phases.join('/')}` : `the growth calendar shows ${calBase.phases.join('/')}`}, but the other two sources agree on ${a.phases.join('/')}.`
      : null;
    if (calBase && calBase.days != null && calBase.days !== a.total) problems.push(`growth calendar shows ${calBase.days} days, Crops page ${a.total}`);
    if (cal) {
      // Keep the first table for each label: later ones show a second season of a multi-season
      // crop (or the irrigated variant) and do not start from planting day.
      const seen = new Set();
      const tables = [];
      for (const t of cal.tables) {
        if (/Season|Subsequent/.test(t.label)) break;
        if (/Irrigated$/.test(t.label) || seen.has(t.label) || !t.phases.length) continue;
        seen.add(t.label);
        tables.push(t);
      }
      fixtures[slug(a.name)] = { name: a.name, tables };
    }
    if (b.sellprice !== a.basePrice) problems.push(`sell price differs: Crops page ${a.basePrice}, crop page ${b.sellprice}`);
    if (!b.seasons.length) problems.push('crop page: season not found');
    const listed = listCategory(a.name);
    let category = b.category;
    if (listed.length > 1) problems.push(`category: listed on several category pages (${listed.join(', ')})`);
    else if (b.category === 'other' && listed.length === 1) category = listed[0];
    else if (b.category !== 'other' && listed[0] !== b.category) problems.push(`category: crop page says ${b.category}, category pages say ${listed[0] || 'none'}`);
    const catSource = listed.length ? lists[listed[0]].page : null;

    const groupSeason = a.group.replace(/ Crops$/, '');
    if (['Spring', 'Summer', 'Fall', 'Winter'].includes(groupSeason) && !b.seasons.includes(groupSeason)) {
      problems.push(`season: listed under ${groupSeason} Crops but crop page says ${b.seasons.join(', ')}`);
    }

    const seed_prices = {};
    for (const [k, v] of Object.entries(a.sources)) seed_prices[SOURCE_KEYS[k] || slug(k)] = v;

    const y = YIELD_OVERRIDES[a.name] || parseYield(`${a.description} ${b.intro}`);
    const text = `${a.description} ${cp.wikitext.slice(0, 4000)}`;
    const notes = stageNote ? [stageNote] : [];
    if (a.name === 'Unmilled Rice') notes.push('Grows faster when irrigated (next to water); unirrigated time used.');
    if (a.name === 'Taro Root') notes.push('Grows faster when irrigated (next to water); unirrigated time used.');

    records.push({
      id: slug(a.name),
      name: a.name,
      seed: a.seed,
      category,
      seasons: b.seasons,
      phase_days: a.phases,
      growth_days: a.total,
      regrow_days: a.regrow,
      base_price: a.basePrice,
      // yield.stated is false when the wiki gives no harvest size; 1 per harvest is then assumed.
      yield: { min: y.min, max: y.max, max_per_level: y.max_per_level, extra_chance: y.extra_chance, stated: y.stated },
      seed_prices,
      trellis: /\btrellis\b/i.test(text),
      giant: /can become a giant crop/i.test(text),
      indoor_only: /can only be grown in the Greenhouse/i.test(a.description),
      game_version: GAME_VERSION,
      sources: [
        { title: crops.title, url: `${crops.url}#${encodeURIComponent(a.name.replace(/ /g, '_'))}`, revid: crops.revid },
        { title: cp.title, url: cp.url, revid: cp.revid },
        ...(cal ? [{ title: calPage.title, url: `${calPage.url}#${encodeURIComponent(a.name.replace(/ /g, '_'))}`, revid: calPage.revid }] : []),
        ...(catSource ? [{ title: catSource.title, url: catSource.url, revid: catSource.revid }] : []),
      ],
      last_verified: today,
      verification_status: problems.length ? 'needs-verification' : 'cross-checked',
      problems,
      notes,
    });
  }

  records.sort((x, y) => x.name.localeCompare(y.name));
  const out = {
    schema: 'stardew-tools/crops@1',
    game_version: GAME_VERSION,
    generated: today,
    source: 'Stardew Valley Wiki (CC BY-NC-SA 3.0), cross-checked between the Crops page and each crop page',
    skipped,
    crops: records,
  };
  writeFileSync(join(ROOT, 'data', 'crops.json'), JSON.stringify(out, null, 2) + '\n');
  writeFileSync(
    join(ROOT, 'tests', 'fixtures', 'growth-calendars.json'),
    JSON.stringify({ source: { title: calPage.title, url: calPage.url, revid: calPage.revid }, crops: fixtures }, null, 1) + '\n',
  );
  const bad = records.filter((r) => r.problems.length);
  console.log(`${records.length} crops written, ${records.length - bad.length} cross-checked, ${bad.length} need verification`);
  for (const r of bad) console.log(`  ${r.name}: ${r.problems.join('; ')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

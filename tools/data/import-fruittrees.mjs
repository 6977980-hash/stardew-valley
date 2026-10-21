#!/usr/bin/env node
// Builds data/fruittrees.json from the Stardew Valley Wiki: the eight fruit trees, what their
// saplings cost (Pierre, Traveling Cart, Island Trader), their season, and what their fruit sells
// for at each quality, plus the fruit tree rules (28 days to mature, one fruit a day in season,
// a star of quality per year, every day in the Greenhouse and on Ginger Island).
//
// Nothing is typed in by hand. Every tree is read from three pages and each value must agree on
// at least two of them:
//   - "Fruit Trees": the stage table (total days, season) and the sapling/fruit table (sapling
//     price, cart range or Island Trader trade, fruit, sell price at each quality).
//   - The sapling's own page ("Apricot Sapling"): growth time, season, shop prices.
//   - "Fruits": the fruit's season and sell prices with and without Tiller, and the wiki's rendered
//     Wine / Jelly / Dried Fruit prices with and without Artisan (stored as a test oracle).
// Each rule is paired with the sentence that states it; the import fails if the sentence is gone.
// The file is only written once every check passed.
//
//   node tools/data/import-fruittrees.mjs [--cached]
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchRendered, fetchArticle, sleep } from './wiki.mjs';
import { slug } from './parse-crops.mjs';
import { text } from './import-buildings.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = join(ROOT, 'tools', 'data', '.cache');
const GAME_VERSION = '1.6.15';
const useCache = process.argv.includes('--cached');
const failures = [];
const TREES = ['Apricot', 'Cherry', 'Banana', 'Mango', 'Orange', 'Peach', 'Apple', 'Pomegranate'];
const QUALITIES = ['regular', 'silver', 'gold', 'iridium'];
const SEASONS = ['spring', 'summer', 'fall', 'winter'];

async function cached(key, fn) {
  const file = join(CACHE, `${key}.json`);
  if (useCache && existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  let v;
  for (let attempt = 1; ; attempt++) {
    try {
      v = await fn();
      break;
    } catch (e) {
      if (attempt >= 5) throw e;
      await sleep(2000 * attempt);
    }
  }
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(file, JSON.stringify(v));
  await sleep(1500);
  return v;
}
// The API first; the article URL serves the same rendered HTML when the API is unavailable.
const rendered = (title) =>
  cached(`${slug(title)}-html`, async () => {
    try {
      return await fetchRendered(title);
    } catch {
      return fetchArticle(title);
    }
  });
const ref = (p, anchor) => ({ title: p.title, url: anchor ? `${p.url}#${encodeURIComponent(anchor.replace(/ /g, '_'))}` : p.url, revid: p.revid });
const num = (s) => Number(String(s).replace(/,/g, ''));
const gold = (s) => [...String(s).matchAll(/([\d,]+)g\b/g)].map((m) => num(m[1]));

/** Checks a sentence is on the page and returns it as evidence. */
function quote(p, re) {
  const t = text(p.html);
  const m = t.match(re);
  if (!m) failures.push(`${p.title}: evidence not found ${re}`);
  return m ? m[0] : null;
}

/** Plain text of one tree's section on the Fruit Trees page. */
function section(p, name) {
  const start = p.html.indexOf(`id="${name}_Tree"`);
  if (start < 0) return null;
  const rest = p.html.slice(start + 10);
  const end = rest.search(/<h[23][ >]/);
  return text(end < 0 ? rest : rest.slice(0, end));
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const ft = await rendered('Fruit Trees');
  const fruits = await rendered('Fruits');
  const fruitsText = text(fruits.html);
  const trees = [];

  for (const name of TREES) {
    const sec = section(ft, name);
    if (!sec) {
      failures.push(`Fruit Trees: no section for ${name} Tree`);
      continue;
    }
    // "... Total: 28 Days Spring Sapling ... Apricot Sapling 2,000g 1,500–2,500g Apricot 50g 62g 75g 100g ..."
    const total = sec.match(/Total: (\d+) Days\s+(Spring|Summer|Fall|Winter)\b/);
    const row = sec.slice(sec.lastIndexOf(`${name} Sapling`));
    const fruit = row.match(new RegExp(`${name} Sapling (.*?) ${name} ((?:[\\d,]+g ){3}[\\d,]+g)`));
    if (!total || !fruit) {
      failures.push(`Fruit Trees: could not read the ${name} Tree tables`);
      continue;
    }
    const shop = fruit[1];
    const pierre = shop.match(/^([\d,]+)g\b/);
    const cart = shop.match(/([\d,]+)–([\d,]+)g/);
    const trade = shop.match(/^([A-Z][A-Za-z ]+?)\s+\((\d+)\)$/);
    const listPrices = gold(fruit[2]);
    const season = total[2].toLowerCase();

    const sap = await rendered(`${name} Sapling`);
    const st = text(sap.html);
    const sapDays = (st.match(/Growth Time: (\d+) days/) || [])[1];
    const sapSeason = st.match(/Season: (?:All on Ginger Island )?(Spring|Summer|Fall|Winter)\b/);
    const sapPierre = (st.match(/General Store : ([\d,]+)g/) || [])[1];
    const sapCart = st.match(/Traveling Cart : ([\d,]+)–([\d,]+)g/);
    const sapTrade = st.match(/Island Trader : ([A-Z][A-Za-z ]+?)\s+\((\d+)\)/);
    const island = /all year round when planted on Ginger Island/.test(st);

    // "Apricot Apricot Tree Farm Cave (fruit bat option) Spring 38 17 ... 50g 62g 75g 100g 55g ... 560g"
    const fr = fruitsText.match(new RegExp(`${name} ${name} Tree (.*?) ((?:[\\d,]+g ){19}[\\d,]+g)`));
    const fruitSeason = fr && (fr[1].match(/(Spring|Summer|Fall|Winter)(?: elsewhere)?\s[\d ]+$/) || [])[1];
    const all = fr ? gold(fr[2]) : [];
    const sellAll = all.slice(0, 8);
    const artAll = all.slice(8);
    if (!fr) failures.push(`Fruits: no row for ${name}`);

    // Two agreeing sources for every value.
    const id = slug(name);
    const check = (what, a, b, c) => {
      const vals = [a, b, c].filter((v) => v !== undefined && v !== null).map(String);
      if (vals.length < 2 || new Set(vals).size !== 1) failures.push(`${name}: ${what} disagrees or is missing (${[a, b, c].join(' / ')})`);
    };
    check('days to mature', total[1], sapDays);
    check('season', season, sapSeason && sapSeason[1].toLowerCase(), fruitSeason && fruitSeason.toLowerCase());
    check('base price', listPrices[0], sellAll[0]);
    QUALITIES.forEach((q, i) => check(`${q} price`, listPrices[i], sellAll[i]));
    if (pierre || sapPierre) check('Pierre price', pierre && num(pierre[1]), sapPierre && num(sapPierre));
    if (cart || sapCart) check('Traveling Cart range', cart && `${num(cart[1])}-${num(cart[2])}`, sapCart && `${num(sapCart[1])}-${num(sapCart[2])}`);
    if (trade || sapTrade) check('Island Trader trade', trade && `${trade[1]} ${trade[2]}`, sapTrade && `${sapTrade[1]} ${sapTrade[2]}`);
    if (!pierre && !trade) failures.push(`${name}: no way to buy the sapling found`);

    trees.push({
      id,
      name,
      tree: `${name} Tree`,
      sapling: `${name} Sapling`,
      season,
      island_year_round: island,
      category: 'fruit',
      days_to_mature: num(total[1]),
      base_price: listPrices[0],
      price_by_quality: Object.fromEntries(QUALITIES.map((q, i) => [q, listPrices[i]])),
      sapling_prices: {
        ...(pierre ? { pierre: num(pierre[1]) } : {}),
        ...(cart ? { traveling_cart: { min: num(cart[1]), max: num(cart[2]) } } : {}),
        ...(trade ? { island_trader: { item: trade[1], qty: num(trade[2]) } } : {}),
      },
      // As rendered by the wiki's own price module, for the engine tests (not used by the tools).
      wiki_prices: {
        tiller: Object.fromEntries(QUALITIES.map((q, i) => [q, sellAll[4 + i]])),
        wine: Object.fromEntries(QUALITIES.map((q, i) => [q, artAll[i]])),
        jelly: artAll[4],
        dried_fruit: artAll[5],
        wine_artisan: Object.fromEntries(QUALITIES.map((q, i) => [q, artAll[6 + i]])),
        jelly_artisan: artAll[10],
        dried_fruit_artisan: artAll[11],
      },
      game_version: GAME_VERSION,
      sources: [ref(ft, `${name} Tree`), ref(sap), ref(fruits)],
      last_verified: today,
      verification_status: 'cross-checked',
    });
  }

  /* ---------- Rules, each with the sentence that states it ---------- */
  const rule = (value, evidence) => ({ value, evidence });
  const rules = {
    days_to_mature: rule(28, quote(ft, /Fruit Trees require 28 days to mature, after which they produce one fruit per day when in season\./)),
    fruit_per_day: rule(1, quote(ft, /produce one fruit per day when in season/)),
    max_on_tree: rule(3, quote(ft, /Fruit can accumulate up to three days before harvesting\./)),
    no_water_no_winter_death: rule(true, quote(ft, /Fruit trees do not need to be watered, and will not die in the winter\./)),
    grows_any_season: rule(true, quote(ft, /Fruit saplings will grow during any season, allowing players to plant and prepare for upcoming seasons to bear fruit\./)),
    clear_area: rule(3, quote(ft, /Each Fruit tree must be planted in the center of a clear 3x3 ground area/)),
    greenhouse_and_island_every_day: rule(true, quote(ft, /Fruit trees planted in the greenhouse or on Ginger Island bear fruit every day after maturity/)),
    greenhouse_border: rule(true, quote(ft, /Fruit trees can grow in the Greenhouse , in the center soil or around the border\./)),
    quality_per_year: rule({ silver: 1, gold: 2, iridium: 3 }, quote(ft, /Fruit trees will produce silver star fruit after one year, gold after two years, and iridium after three\./)),
    sapling_quality_speed: rule({ silver: 2, gold: 3, iridium: 5 }, quote(ft, /a silver sapling grows 2 times faster, a gold sapling grows 3 times faster, and an iridium sapling grows 5 times faster/)),
    chop_for_sapling: rule(true, quote(ft, /Fruit trees can be chopped down, yielding normal wood and a matching sapling of the same quality as the fruit\./)),
    tiller_and_artisan: rule(true, quote(ft, /Fruit Tree fruit receives the Tiller Profession price bonus when sold, and jelly , wine , or dried fruits made from fruit tree fruit receives the Artisan Profession price bonus when sold\./)),
    lightning_days: rule(4, quote(ft, /causing them to become burnt for 4 days/)),
    weather_proof: rule(true, quote(ft, /Fruit trees will not be affected by weather/)),
    all_saplings_pierre: rule(null, quote(ft, /A complete set of all six fruit tree saplings costs a total of ([\d,]+)g if purchased from Pierre's General Store/)),
  };
  // The stated total must equal the sum of Pierre's sapling prices.
  const statedTotal = rules.all_saplings_pierre.evidence && num(rules.all_saplings_pierre.evidence.match(/([\d,]+)g/)[1]);
  const summed = trees.reduce((s, t) => s + (t.sapling_prices.pierre || 0), 0);
  if (statedTotal !== summed) failures.push(`Fruit Trees: stated total for six saplings ${statedTotal} vs sum ${summed}`);
  rules.all_saplings_pierre.value = statedTotal;

  // Every tree's fruit must have a Keg (Wine) and Preserves Jar (Jelly) recipe through the fruit
  // category, and its prices on the fruit page must match the multipliers in machines.json.
  const machines = JSON.parse(readFileSync(join(ROOT, 'data', 'machines.json'), 'utf8'));
  const wine = machines.machines.flatMap((m) => m.products).find((p) => p.id === 'wine');
  const jelly = machines.machines.flatMap((m) => m.products).find((p) => p.id === 'jelly');
  for (const t of trees) {
    if (t.wiki_prices.wine.regular !== Math.floor(t.base_price * wine.price.multiplier + wine.price.add)) failures.push(`${t.name}: wiki Wine price ${t.wiki_prices.wine.regular} does not match machines.json`);
    if (t.wiki_prices.jelly !== Math.floor(t.base_price * jelly.price.multiplier + jelly.price.add)) failures.push(`${t.name}: wiki Jelly price ${t.wiki_prices.jelly} does not match machines.json`);
  }

  if (trees.length !== TREES.length) failures.push(`expected ${TREES.length} trees, parsed ${trees.length}`);
  if (failures.length) {
    console.error('Fruit tree import failed:\n  ' + failures.join('\n  '));
    process.exit(1);
  }
  const out = {
    schema: 'stardew-tools/fruittrees@1',
    game_version: GAME_VERSION,
    generated: today,
    last_verified: today,
    source: 'Stardew Valley Wiki (CC BY-NC-SA 3.0), cross-checked between Fruit Trees, each sapling page and Fruits',
    sources: [ref(ft)],
    seasons: SEASONS,
    rules,
    trees,
  };
  writeFileSync(join(ROOT, 'data', 'fruittrees.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`fruittrees.json: ${trees.length} trees, ${Object.keys(rules).length} rules`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

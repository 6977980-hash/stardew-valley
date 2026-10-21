// Fruit trees (data/fruittrees.json): what one tree earns each year as its fruit climbs from
// regular to iridium quality, how long a sapling takes to pay for itself, and how much fruit the
// first year gives for a planting day. Wine and Jelly prices come from the same Keg and Preserves
// Jar rules as crops (processing.js), Dried Fruit from the Dehydrator rule (dehydrator.js).

import { cropSellPrice } from './price.js';
import { productsFor } from './processing.js';
import { driedPrice } from './dehydrator.js';

export const QUALITIES = ['regular', 'silver', 'gold', 'iridium'];
export const SELL_AS = ['raw', 'jelly', 'wine', 'dried-fruit'];

/** Fruit quality in the n-th year after the tree matured (1 = the first year). */
export function qualityInYear(fruittrees, year) {
  const q = fruittrees.rules.quality_per_year.value;
  const age = Math.max(0, year - 1);
  return age >= q.iridium ? 'iridium' : age >= q.gold ? 'gold' : age >= q.silver ? 'silver' : 'regular';
}

/** Fruit one mature tree gives in a year: its season on the farm, every day in the Greenhouse or on Ginger Island. */
export function fruitPerYear(tree, data, location = 'farm') {
  const days = data.seasons.days_per_season;
  const perDay = data.fruittrees.rules.fruit_per_day.value;
  return perDay * days * (location === 'farm' ? 1 : data.seasons.seasons.length);
}

/** Gold for one fruit sold as sellAs. Keg, Jar and Dehydrator ignore fruit quality. */
export function fruitValue(tree, data, { quality = 'regular', sellAs = 'raw', tiller = false, artisan = false } = {}) {
  if (sellAs === 'raw') return cropSellPrice(tree, quality, { tiller });
  if (sellAs === 'dried-fruit') {
    const p = data.dehydrator.machines.flatMap((m) => m.products).find((x) => x.id === 'dried-fruit');
    return driedPrice(data.dehydrator, 'dried-fruit', tree.base_price, { artisan }) / p.input.count;
  }
  const p = productsFor(tree, data.machines, { artisan }).find((x) => x.product === sellAs);
  if (!p) throw new Error(`${tree.id} cannot be made into ${sellAs}`);
  return p.price / p.inputCount;
}

/**
 * Year-by-year income of one tree after it matures, and when it has paid back its sapling.
 * @returns { years: [{ year, quality, fruit, gold, cumulative }], paybackYear, paybackFruit }
 */
export function treePlan(tree, data, { location = 'farm', years = 4, sellAs = 'raw', tiller = false, artisan = false, saplingPrice = null } = {}) {
  const price = saplingPrice ?? tree.sapling_prices.pierre ?? null;
  const fruit = fruitPerYear(tree, data, location);
  const rows = [];
  let cumulative = 0;
  let paybackYear = null;
  let paybackFruit = null;
  for (let year = 1; year <= years; year++) {
    const quality = qualityInYear(data.fruittrees, year);
    const each = fruitValue(tree, data, { quality, sellAs, tiller, artisan });
    const gold = each * fruit;
    if (price != null && paybackYear === null && cumulative + gold >= price) {
      const need = Math.ceil((price - cumulative) / each);
      paybackFruit = (year - 1) * fruit + need;
      paybackYear = year;
    }
    cumulative += gold;
    rows.push({ year, quality, fruit, each, gold, cumulative });
  }
  return { location, sellAs, sapling: price, years: rows, paybackYear, paybackFruit };
}

/**
 * Planting a sapling outdoors on (plantSeason, plantDay): the day it matures and how much fruit it
 * gives in the rest of that year (counting only its own season, from the day it matures).
 */
export function firstYear(tree, data, { plantSeason, plantDay = 1 }) {
  const seasons = data.seasons.seasons;
  const len = data.seasons.days_per_season;
  const start = seasons.indexOf(plantSeason) * len + plantDay;
  const mature = start + data.fruittrees.rules.days_to_mature.value;
  const from = seasons.indexOf(tree.season) * len + 1;
  const to = from + len - 1;
  // A tree planted after its season starts first fruits next year.
  const fruit = mature <= to && start <= to ? Math.max(0, to - Math.max(mature, from) + 1) * data.fruittrees.rules.fruit_per_day.value : 0;
  const yearLen = len * seasons.length;
  const m = mature - 1;
  return { matures: { season: seasons[Math.floor(m / len) % seasons.length], day: (m % len) + 1, nextYear: m >= yearLen }, fruit };
}

/** Last day to plant a sapling outdoors so it bears fruit from the first day of its season. */
export function plantBy(tree, data) {
  const seasons = data.seasons.seasons;
  const len = data.seasons.days_per_season;
  const yearLen = len * seasons.length;
  const start = ((seasons.indexOf(tree.season) * len - data.fruittrees.rules.days_to_mature.value) % yearLen + yearLen) % yearLen;
  return { season: seasons[Math.floor(start / len)], day: (start % len) + 1 };
}

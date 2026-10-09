// Profit for one tile of a crop over its growing window, with every step spelled out so the
// page can show how the number was reached.

import { harvestSchedule } from './growth.js';
import { qualityChances } from './quality.js';
import { cropSellPrice, expectedCropPrice } from './price.js';
import { productsFor } from './processing.js';
import { expectedItems } from './harvest.js';

const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

/** Cheapest listed gold price for the crop's seed, or the requested source. */
export function seedPrice(crop, source = null) {
  const prices = crop.seed_prices || {};
  if (source && prices[source] != null) return { source, price: prices[source] };
  const entries = Object.entries(prices).filter(([, p]) => p > 0);
  if (!entries.length) return { source: null, price: null };
  entries.sort((a, b) => a[1] - b[1]);
  return { source: entries[0][0], price: entries[0][1] };
}

/**
 * @param crop     record from data/crops.json
 * @param data     { fertilizers, machines, seasons } from data/*.json
 * @param o        options: plantSeason, plantDay, farmingLevel, tiller, artisan, agriculturist,
 *                 fertilizer (id), greenhouse, horizonDays, established, seedSource,
 *                 sellAs ('raw' | product id | 'best')
 */
export function cropProfit(crop, data, o = {}) {
  const steps = [];
  const fert = o.fertilizer ? data.fertilizers.fertilizers.find((x) => x.id === o.fertilizer) : null;
  if (o.fertilizer && !fert) throw new Error(`unknown fertilizer ${o.fertilizer}`);
  const plantSeason = o.plantSeason || crop.seasons[0].toLowerCase();
  const farmingLevel = o.farmingLevel ?? 0;

  const sched = harvestSchedule(crop, {
    plantDay: o.plantDay ?? 1,
    plantSeason,
    seasons: data.seasons.seasons,
    daysPerSeason: data.seasons.days_per_season,
    greenhouse: !!o.greenhouse,
    horizonDays: o.horizonDays ?? null,
    replant: true,
    established: !!o.established,
    fertilizerSpeed: fert && fert.kind === 'speed' ? fert.speed : 0,
    agriculturist: !!o.agriculturist,
  });
  steps.push({ key: 'growth', label: 'Days to first harvest', value: sched.growth });
  if (crop.regrow_days) steps.push({ key: 'regrow', label: 'Days between harvests', value: crop.regrow_days });
  steps.push({ key: 'harvests', label: 'Harvests before the crop dies', value: sched.harvests.length, detail: sched.harvests.length ? `on day ${sched.harvests.join(', ')}` : 'none: not enough days left' });

  const items = expectedItems(crop, farmingLevel);
  steps.push({ key: 'items', label: 'Items per harvest (average)', value: round(items, 3) });

  const qualityLevel = fert && fert.kind === 'quality' ? fert.quality_level : 0;
  const chances = qualityChances(farmingLevel, qualityLevel);
  let perHarvest;
  let unitLabel;
  let sellAs = o.sellAs || 'raw';
  if (sellAs === 'best') {
    // Highest value per harvest among raw and every machine product the crop can go into.
    const options = productsFor(crop, data.machines, { artisan: !!o.artisan });
    const raw = expectedCropPrice(crop, chances, { tiller: !!o.tiller }) + (items - 1) * cropSellPrice(crop, 'regular', { tiller: !!o.tiller });
    sellAs = 'raw';
    let best = raw;
    for (const p of options) {
      const v = (items / p.inputCount) * p.price;
      if (v > best) {
        best = v;
        sellAs = p.product;
      }
    }
  }
  if (sellAs === 'raw') {
    // Fertilizer quality only applies to the first item; extra items are regular quality.
    const first = expectedCropPrice(crop, chances, { tiller: !!o.tiller });
    const rest = cropSellPrice(crop, 'regular', { tiller: !!o.tiller });
    perHarvest = first + (items - 1) * rest;
    unitLabel = crop.name;
    steps.push({ key: 'price', label: 'Average price of the first item', value: round(first), detail: `quality chances: ${fmtChances(chances)}` });
    if (items > 1) steps.push({ key: 'price-rest', label: 'Price of each extra item (regular quality)', value: rest });
  } else {
    const product = productsFor(crop, data.machines, { artisan: !!o.artisan }).find((p) => p.product === sellAs);
    if (!product) throw new Error(`${crop.name} cannot be made into ${sellAs}`);
    perHarvest = (items / product.inputCount) * product.price;
    unitLabel = product.productName;
    steps.push({ key: 'product', label: `${product.productName} price (${product.machineName})`, value: product.price, detail: `${product.inputCount} ${crop.name} each, ${round(product.days, 2)} days in the machine; input quality is ignored` });
  }
  steps.push({ key: 'per-harvest', label: 'Value per harvest', value: round(perHarvest) });

  const revenue = perHarvest * sched.harvests.length;
  const seed = seedPrice(crop, o.seedSource);
  const plantings = crop.regrow_days ? (sched.harvests.length && !o.established ? 1 : 0) : sched.harvests.length;
  const seedCost = plantings === 0 ? 0 : seed.price != null ? seed.price * plantings : null;
  const fertCost = fert && sched.harvests.length ? cheapest(fert.prices) : 0;
  const cost = (seedCost ?? 0) + (fertCost ?? 0);
  steps.push({ key: 'revenue', label: 'Revenue', value: round(revenue) });
  steps.push({ key: 'seeds', label: 'Seed cost', value: seedCost, detail: plantings === 0 ? 'no new seeds needed' : seed.price != null ? `${plantings} × ${seed.price}g (${seed.source})` : 'seed has no gold price; cost not counted' });
  if (fert) steps.push({ key: 'fertilizer', label: `${fert.name} cost`, value: fertCost, detail: fertCost == null ? 'not sold for gold; cost not counted' : 'one application per tile' });

  const profit = revenue - cost;
  const days = sched.harvests.length ? sched.harvests[sched.harvests.length - 1] - (o.plantDay ?? 1) : 0;
  steps.push({ key: 'profit', label: 'Profit', value: round(profit) });
  return {
    crop: crop.id,
    sellAs,
    unit: unitLabel,
    growth: sched.growth,
    harvestDays: sched.harvests,
    itemsPerHarvest: items,
    perHarvest,
    revenue,
    seedCost,
    fertilizerCost: fertCost,
    profit,
    profitPerDay: days > 0 ? profit / days : 0,
    verified: crop.verification_status === 'cross-checked',
    steps,
  };
}

function cheapest(prices = {}) {
  const v = Object.values(prices).filter((p) => p > 0);
  return v.length ? Math.min(...v) : null;
}

function fmtChances(c) {
  return Object.entries(c)
    .filter(([, p]) => p > 0)
    .map(([q, p]) => `${q} ${round(p * 100, 1)}%`)
    .join(', ');
}

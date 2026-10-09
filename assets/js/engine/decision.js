// Decision engine: "what is best for me?" Ranks every crop for one player's situation (day,
// tiles, gold, machines, skills) and explains, in plain sentences, why the winner beats the
// runner-up. Every number comes from cropProfit() and allocate(); nothing here is a new rule.

import { cropProfit, seedPrice } from './profit.js';
import { allocate } from './machines.js';

const SHOPS = ['pierre', 'jojamart', 'oasis'];

/**
 * @param crops     crop records
 * @param data      { fertilizers, machines, seasons }
 * @param s         situation: season ('spring'…'winter' | 'greenhouse'), today (1-28), tiles,
 *                  budget (gold for seeds and fertilizer now; null = no limit), farmingLevel,
 *                  fertilizer, tiller, artisan, agriculturist, kegs, jars, shopOnly (default true)
 * @returns ranked options, best first
 */
export function rankCrops(crops, data, s) {
  const greenhouse = s.season === 'greenhouse';
  const today = greenhouse ? 1 : clamp(s.today ?? 1, 1, data.seasons.days_per_season);
  const horizon = greenhouse ? data.seasons.days_per_season * data.seasons.seasons.length : null;
  const lastDay = greenhouse ? horizon : data.seasons.days_per_season;
  const fert = s.fertilizer ? data.fertilizers.fertilizers.find((f) => f.id === s.fertilizer) : null;
  const fertPrice = fert ? cheapest(fert.prices) : 0;
  const shopOnly = s.shopOnly !== false;
  const tilesWanted = Math.max(1, Math.floor(s.tiles || 1));
  const counts = { keg: Math.max(0, s.kegs || 0), 'preserves-jar': Math.max(0, s.jars || 0) };
  const hasMachines = counts.keg + counts['preserves-jar'] > 0;

  const out = [];
  for (const crop of crops) {
    const seasons = crop.seasons.map((x) => x.toLowerCase());
    if (!greenhouse && (!seasons.includes(s.season) || crop.indoor_only)) continue;
    const shop = SHOPS.filter((k) => crop.seed_prices[k] > 0).sort((a, b) => crop.seed_prices[a] - crop.seed_prices[b])[0] || null;
    if (shopOnly && !shop) continue;
    const seed = shop ? { source: shop, price: crop.seed_prices[shop] } : seedPrice(crop);

    const r = cropProfit(crop, data, {
      plantSeason: greenhouse ? 'spring' : s.season,
      plantDay: today,
      greenhouse,
      horizonDays: horizon,
      farmingLevel: s.farmingLevel ?? 0,
      fertilizer: s.fertilizer || null,
      tiller: !!s.tiller,
      artisan: !!s.artisan,
      agriculturist: !!s.agriculturist,
      seedSource: seed.source,
      sellAs: 'raw',
    });
    if (!r.harvestDays.length) continue;

    // Gold needed today: one seed (and fertilizer) per tile; replanting is paid from sales.
    const startCost = (seed.price ?? 0) + (fertPrice ?? 0);
    const affordable = s.budget == null || startCost === 0 ? tilesWanted : Math.floor(s.budget / startCost);
    const tiles = Math.min(tilesWanted, affordable);
    if (tiles < 1) {
      out.push({ crop, r, tiles: 0, seed, startCost, total: 0, unaffordable: true });
      continue;
    }

    const items = r.itemsPerHarvest * r.harvestDays.length * tiles;
    const rawPerItem = r.perHarvest / r.itemsPerHarvest;
    let revenue = r.revenue * tiles;
    let processing = null;
    if (hasMachines) {
      // Machines work from the first harvest until the end of the season (or the last harvest,
      // for crops that carry on into the next season).
      const end = Math.max(lastDay, r.harvestDays[r.harvestDays.length - 1]);
      const days = Math.max(1, end - r.harvestDays[0] + 1);
      const a = allocate(crop, data.machines, { items, counts, days, artisan: !!s.artisan, tiller: !!s.tiller });
      const machinePlan = a.plan.filter((p) => p.machine);
      if (machinePlan.length) {
        const processedItems = machinePlan.reduce((n, p) => n + p.items, 0);
        const processedValue = machinePlan.reduce((n, p) => n + p.value, 0);
        const withMachines = processedValue + (items - processedItems) * rawPerItem;
        if (withMachines > revenue) {
          revenue = withMachines;
          processing = { plan: machinePlan, processedItems, rawItems: items - processedItems, days };
        }
      }
    }
    const costs = ((r.seedCost ?? 0) + (r.fertilizerCost ?? 0)) * tiles;
    const total = revenue - costs;
    const plantings = crop.regrow_days ? 1 : r.harvestDays.length;
    out.push({
      crop,
      r,
      tiles,
      limitedByBudget: tiles < tilesWanted,
      seed,
      startCost,
      spendNow: startCost * tiles,
      seedsLater: crop.regrow_days ? 0 : (plantings - 1) * tiles,
      fertilizer: fert ? { name: fert.name, count: tiles, price: fertPrice } : null,
      items,
      processing,
      revenue,
      costs,
      total,
      perTile: total / tiles,
      lastHarvest: r.harvestDays[r.harvestDays.length - 1],
      // Crops that also grow in the next season keep going after this one ends.
      nextSeasons: !greenhouse && r.harvestDays[r.harvestDays.length - 1] > data.seasons.days_per_season ? crop.seasons.slice(crop.seasons.findIndex((x) => x.toLowerCase() === s.season) + 1) : [],
    });
  }
  return out.sort((a, b) => b.total - a.total);
}

/** Up to three plain-English reasons the best option beats the runner-up. */
export function reasons(best, next, gold = (n) => `${Math.round(n).toLocaleString('en-US')}g`) {
  if (!best) return [];
  const why = [];
  const b = best.r;
  if (!next) {
    why.push(`It is the only crop that can still be harvested in time.`);
    return why;
  }
  const n = next.r;
  if (best.nextSeasons.length && !next.nextSeasons.length) {
    why.push(`${best.crop.name} also grows in ${best.nextSeasons.join(' and ')}, so you can keep harvesting it after this season ends: ${b.harvestDays.length} harvests against ${n.harvestDays.length} for ${next.crop.name}.`);
  } else if (b.harvestDays.length > n.harvestDays.length) {
    why.push(best.crop.regrow_days
      ? `${best.crop.name} keeps producing every ${best.crop.regrow_days} days, so you get ${b.harvestDays.length} harvests against ${n.harvestDays.length} for ${next.crop.name}.`
      : `${best.crop.name} grows faster, so you get ${b.harvestDays.length} harvests against ${n.harvestDays.length} for ${next.crop.name}.`);
  }
  if (next.limitedByBudget && best.tiles > next.tiles) {
    why.push(`Your gold buys seeds for ${best.tiles} tiles of ${best.crop.name} but only ${next.tiles} of ${next.crop.name}.`);
  }
  if (best.processing && !next.processing) {
    const p = best.processing.plan[0];
    why.push(`Your machines turn it into ${p.productName}, which ${next.crop.name} cannot use as well.`);
  }
  if (b.perHarvest > n.perHarvest * 1.05 && why.length < 3) {
    why.push(`Each ${best.crop.name} harvest is worth ${gold(b.perHarvest)} per tile against ${gold(n.perHarvest)} for ${next.crop.name}.`);
  }
  const bSeed = (b.seedCost ?? 0);
  const nSeed = (n.seedCost ?? 0);
  if (bSeed < nSeed * 0.8 && why.length < 3) {
    why.push(`${best.crop.name} seeds cost less over the season: ${gold(bSeed)} per tile against ${gold(nSeed)}.`);
  }
  if (!why.length) why.push(`${best.crop.name} earns ${gold(best.total - next.total)} more in total with your settings.`);
  return why.slice(0, 3);
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number(v) || lo));

function cheapest(prices = {}) {
  const v = Object.values(prices).filter((p) => p > 0);
  return v.length ? Math.min(...v) : null;
}

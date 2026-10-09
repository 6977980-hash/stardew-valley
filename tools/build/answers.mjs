#!/usr/bin/env node
// Precomputes the short answers printed at the top of each tool page (so search engines and
// people without JavaScript get real numbers), using the same engine and data as the tools.
//   node tools/build/answers.mjs          # write data/answers.json
//   node tools/build/answers.mjs --check  # exit 1 if data/answers.json is stale
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cropProfit } from '../../assets/js/engine/profit.js';
import { allocate } from '../../assets/js/engine/machines.js';
import { rankCrops, reasons } from '../../assets/js/engine/decision.js';
import { rankPonds } from '../../assets/js/engine/fishpond.js';
import { rankAnimals } from '../../assets/js/engine/animals.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
// Shops that sell seeds every day the crop is in season (not festivals or the Traveling Cart).
const SHOPS = ['pierre', 'jojamart', 'oasis'];
const load = (f) => JSON.parse(readFileSync(join(ROOT, 'data', f), 'utf8'));

export function buildAnswers(data) {
  const crops = data.crops.crops.filter((c) => c.verification_status === 'cross-checked');
  const r0 = (n) => Math.round(n);
  const byId = (id) => crops.find((c) => c.id === id);

  // Crop profit: best per tile on day 1 of each season, default settings, gold-priced seeds.
  const seasons = {};
  for (const season of data.seasons.seasons) {
    const rows = crops
      .filter((c) => c.seasons.map((s) => s.toLowerCase()).includes(season) && !c.indoor_only)
      .map((c) => ({ c, r: cropProfit(c, data, { plantSeason: season }) }))
      .filter(({ c, r }) => r.harvestDays.length && SHOPS.some((k) => c.seed_prices[k] > 0))
      .sort((a, b) => b.r.profit - a.r.profit)
      .slice(0, 3)
      .map(({ c, r }) => ({ id: c.id, name: c.name, profit: r0(r.profit), harvests: r.harvestDays.length }));
    seasons[season] = rows;
  }

  // Keg vs jar.
  const kegVsJar = { keg_per_item: [], jar_per_item: [], tie: [], jar_per_machine_day: [] };
  for (const c of crops) {
    const a = allocate(c, data.machines, { items: 0, counts: {}, days: 28 });
    const keg = a.options.find((o) => o.machine === 'keg');
    const jar = a.options.find((o) => o.machine === 'preserves-jar');
    if (!keg || !jar) continue;
    const d = keg.gainPerItem - jar.gainPerItem;
    (d > 0 ? kegVsJar.keg_per_item : d < 0 ? kegVsJar.jar_per_item : kegVsJar.tie).push(c.name);
    if (jar.gainPerMachineDay > keg.gainPerMachineDay) kegVsJar.jar_per_machine_day.push(c.name);
  }
  const sf = allocate(byId('starfruit'), data.machines, { items: 0, counts: {}, days: 28 }).options;
  kegVsJar.starfruit = Object.fromEntries(sf.map((o) => [o.product, { price: o.price, gain_per_machine_day: r0(o.gainPerMachineDay) }]));

  // Ancient Fruit vs Starfruit (per tile, wine with Artisan).
  const scen = (id, o) => r0(cropProfit(byId(id), data, { sellAs: 'wine', artisan: true, ...o }).profit);
  const afVsSf = {
    greenhouse_year1: { ancient: scen('ancient-fruit', { greenhouse: true, horizonDays: 112 }), starfruit: scen('starfruit', { greenhouse: true, horizonDays: 112 }) },
    greenhouse_established: { ancient: scen('ancient-fruit', { greenhouse: true, horizonDays: 112, established: true }), starfruit: scen('starfruit', { greenhouse: true, horizonDays: 112 }) },
    summer: { ancient: scen('ancient-fruit', { plantSeason: 'summer' }), starfruit: scen('starfruit', { plantSeason: 'summer' }) },
  };

  // Greenhouse: best single crop for a year on the iridium layout, already grown (year 2+),
  // sold raw and sold the best way, with the machines that would keep up with it.
  const tiles = 120 - data.greenhouse.sprinklers.find((s) => s.id === 'iridium').soil_used;
  const ghRank = (sellAs) =>
    crops
      .map((c) => ({ c, r: cropProfit(c, data, { greenhouse: true, horizonDays: 112, established: true, sellAs, artisan: true }) }))
      .filter(({ r }) => r.harvestDays.length)
      .sort((a, b) => b.r.profit - a.r.profit)
      .slice(0, 3)
      .map(({ c, r }) => ({ id: c.id, name: c.name, per_tile: r0(r.profit), sell_as: r.sellAs, total: r0(r.profit * tiles), machines: Math.ceil(machinesNeeded(c, r, tiles)) }));
  const machinesNeeded = (c, r, n) => {
    if (r.sellAs === 'raw') return 0;
    const p = data.machines.machines.flatMap((m) => m.products).find((x) => x.id === r.sellAs);
    const runs = (r.harvestDays.length * r.itemsPerHarvest * n) / p.input.count;
    return (runs * p.minutes) / data.machines.minutes_per_day / 112;
  };
  const gh = { raw: ghRank('raw'), processed: ghRank('best') };

  // Best crops by season: every shop-bought crop planted on day 1, sold raw, no professions,
  // farming level 0 and no fertilizer (the "base" column), plus the same with Tiller at level 10.
  const bestCrops = {};
  for (const season of ['spring', 'summer', 'fall', 'greenhouse']) {
    const at = (o) => rankCrops(crops, data, { season, today: 1, tiles: 1, budget: null, ...o });
    const pro = new Map(at({ farmingLevel: 10, tiller: true }).map((x) => [x.crop.id, x]));
    bestCrops[season] = at({ farmingLevel: 0 }).map((x) => ({
      id: x.crop.id,
      name: x.crop.name,
      profit: r0(x.total),
      per_day: Math.round((x.total / (x.lastHarvest - 1)) * 10) / 10,
      harvests: x.r.harvestDays.length,
      regrows: !!x.crop.regrow_days,
      seed_price: x.seed.price,
      seed_source: x.seed.source,
      continues: x.nextSeasons,
      profit_pro: r0(pro.get(x.crop.id).total),
    }));
  }

  // Decision engine examples for the Crop Decision page.
  const example = (s) => {
    const ranked = rankCrops(crops, data, s).filter((x) => !x.unaffordable);
    return { situation: s, best: { id: ranked[0].crop.id, name: ranked[0].crop.name, tiles: ranked[0].tiles, total: r0(ranked[0].total) }, runner_up: { name: ranked[1].crop.name, total: r0(ranked[1].total) }, reasons: reasons(ranked[0], ranked[1]) };
  };
  const decision = {
    new_farm: example({ season: 'spring', today: 1, tiles: 15, budget: 500, farmingLevel: 0 }),
    summer_15: example({ season: 'summer', today: 15, tiles: 40, budget: 2000, farmingLevel: 4 }),
  };

  // Fish ponds: best full pond per day, roe sold raw and as Aged Roe/Caviar with Artisan.
  const pondTop = (o) =>
    rankPonds(data.fishponds, o)
      .filter((x) => x.fish.kind !== 'legendary')
      .slice(0, 5)
      .map((x) => ({ id: x.fish.id, name: x.fish.name, gold_per_day: r0(x.out.goldPerDay), jars: Math.ceil(x.out.jarsNeeded) }));
  const fishpond = { raw: pondTop({ roeAs: 'raw' }), processed: pondTop({ roeAs: 'processed', artisan: true }) };

  // Animals: gold per day per animal at max hearts and mood, bought from Marnie only.
  const animalTop = (o) =>
    rankAnimals(data.animals, o)
      .filter((x) => x.animal.purchase_price)
      .map((x) => ({ id: x.animal.id, name: x.animal.name, gold_per_day: r0(x.out.goldPerDay), price: x.animal.purchase_price }));
  const animals = { raw: animalTop({}), processed: animalTop({ process: true, artisan: true }) };

  return { game_version: data.crops.game_version, crop_profit: seasons, keg_vs_jar: kegVsJar, af_vs_starfruit: afVsSf, greenhouse: { tiles, ...gh }, best_crops: bestCrops, decision, fishpond, animals };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data = Object.fromEntries(['crops', 'fertilizers', 'machines', 'seasons', 'greenhouse', 'fishponds', 'animals'].map((s) => [s, load(`${s}.json`)]));
  const body = JSON.stringify(buildAnswers(data), null, 2) + '\n';
  const file = join(ROOT, 'data', 'answers.json');
  if (process.argv.includes('--check')) {
    let current = '';
    try {
      current = readFileSync(file, 'utf8');
    } catch {}
    if (current !== body) {
      console.error('data/answers.json is stale: run `node tools/build/answers.mjs`');
      process.exit(1);
    }
    console.log('data/answers.json is up to date');
  } else {
    writeFileSync(file, body);
    console.log('data/answers.json written');
  }
}

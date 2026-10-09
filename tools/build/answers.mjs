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

  return { game_version: data.crops.game_version, crop_profit: seasons, keg_vs_jar: kegVsJar, af_vs_starfruit: afVsSf, greenhouse: { tiles, ...gh } };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data = Object.fromEntries(['crops', 'fertilizers', 'machines', 'seasons', 'greenhouse'].map((s) => [s, load(`${s}.json`)]));
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

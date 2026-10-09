// Numbers printed in the guides, computed from the same engine and data as the tools so a
// guide can never disagree with the calculator it links to. Called by tools/build/answers.mjs
// and stored in data/answers.json under `guides`.
import { cropProfit } from '../../assets/js/engine/profit.js';
import { allocate } from '../../assets/js/engine/machines.js';
import { productsFor } from '../../assets/js/engine/processing.js';
import { expectedItems } from '../../assets/js/engine/harvest.js';
import { growthDays } from '../../assets/js/engine/growth.js';
import { rankPonds } from '../../assets/js/engine/fishpond.js';
import { animalOutput } from '../../assets/js/engine/animals.js';

const r0 = (n) => Math.round(n);
const r2 = (n) => Math.round(n * 100) / 100;

export function buildGuides(data, crops) {
  const byId = (id) => crops.find((c) => c.id === id);
  const minutesPerDay = data.machines.minutes_per_day;

  /* How many kegs do I need? Machines one plant keeps busy, once it is producing steadily. */
  const steady = (crop) => expectedItems(crop, 0) / (crop.regrow_days || growthDays(crop));
  const machinesPerPlant = (crop, machine) => {
    const p = productsFor(crop, data.machines).filter((x) => x.machine === machine).sort((a, b) => b.price / b.inputCount - a.price / a.inputCount)[0];
    return p ? { product: p.productName, days: r2(p.minutes / minutesPerDay), per_plant: (steady(crop) * p.minutes) / minutesPerDay / p.inputCount } : null;
  };
  const kegs = ['hops', 'ancient-fruit', 'starfruit', 'pineapple', 'melon', 'pumpkin', 'wheat', 'cranberries', 'blueberry'].map((id) => {
    const c = byId(id);
    const keg = machinesPerPlant(c, 'keg');
    const jar = machinesPerPlant(c, 'preserves-jar');
    return {
      id,
      name: c.name,
      items_per_day: r2(steady(c)),
      items_per_harvest: r2(expectedItems(c, 0)),
      keg_product: keg.product,
      keg_days: keg.days,
      kegs_per_plant: r2(keg.per_plant),
      kegs_per_100: Math.ceil(keg.per_plant * 100),
      jars_per_plant: jar ? r2(jar.per_plant) : null,
    };
  });

  /* Greenhouse: the best crop for a full year when kegs are the limit, not tiles. */
  const tiles = 120 - data.greenhouse.sprinklers.find((s) => s.id === 'iridium').soil_used;
  const ghCrops = crops.filter((c) => cropProfit(c, data, { greenhouse: true, horizonDays: 112, established: true }).harvestDays.length);
  const withKegs = (count) =>
    ghCrops
      .map((c) => {
        const r = cropProfit(c, data, { greenhouse: true, horizonDays: 112, established: true, sellAs: 'raw' });
        const items = r.harvestDays.length * r.itemsPerHarvest * tiles;
        const a = allocate(c, data.machines, { items, counts: { keg: count }, days: 112, artisan: true });
        return { id: c.id, name: c.name, total: r0(r.profit * tiles + a.extra) };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  const greenhouse = { tiles, by_kegs: [0, 20, 50, 100, 170].map((k) => ({ kegs: k, top: withKegs(k) })) };
  const perKegDay = (id, product) => {
    const o = allocate(byId(id), data.machines, { items: 0, counts: {}, days: 28, artisan: true }).options.find((x) => x.product === product);
    return { name: byId(id).name, product: o.productName, gain: r0(o.gainPerMachineDay) };
  };
  greenhouse.per_keg_day = [perKegDay('starfruit', 'wine'), perKegDay('hops', 'pale-ale'), perKegDay('ancient-fruit', 'wine'), perKegDay('pineapple', 'wine')].sort((a, b) => b.gain - a.gain);

  /* Speed-Gro vs Deluxe Fertilizer: profit per tile planted on day 1, farming level 6. */
  const ferts = ['basic-fertilizer', 'quality-fertilizer', 'speed-gro', 'deluxe-speed-gro'];
  const fertRow = (season, id, level) => {
    const c = byId(id);
    const at = (f) => cropProfit(c, data, { plantSeason: season, farmingLevel: level, fertilizer: f });
    const none = at(null);
    const opts = Object.fromEntries(ferts.map((f) => [f, at(f)]).map(([f, r]) => [f, { profit: r0(r.profit), harvests: r.harvestDays.length }]));
    const best = [['none', r0(none.profit)], ...ferts.map((f) => [f, opts[f].profit])].sort((a, b) => b[1] - a[1])[0][0];
    return { id, name: c.name, season, regrows: !!c.regrow_days, none: { profit: r0(none.profit), harvests: none.harvestDays.length }, ...opts, best, deluxe: r0(at('deluxe-fertilizer').profit) };
  };
  const fertCrops = [['spring', 'potato'], ['spring', 'cauliflower'], ['spring', 'kale'], ['summer', 'blueberry'], ['summer', 'melon'], ['summer', 'starfruit'], ['summer', 'red-cabbage'], ['fall', 'cranberries'], ['fall', 'pumpkin'], ['fall', 'amaranth'], ['fall', 'bok-choy']];
  const fertilizer = {
    level: 6,
    rows: fertCrops.map(([s, id]) => fertRow(s, id, 6)),
    level0: [['spring', 'potato'], ['summer', 'starfruit']].map(([s, id]) => fertRow(s, id, 0)),
    prices: Object.fromEntries(data.fertilizers.fertilizers.map((f) => [f.id, { name: f.name, prices: f.prices }])),
  };

  /* Best fish for fish ponds. */
  const pond = (o) =>
    rankPonds(data.fishponds, o).map((x) => ({ id: x.fish.id, name: x.fish.name, kind: x.fish.kind, gold_per_day: r0(x.out.goldPerDay), jars: Math.ceil(x.out.jarsNeeded), max_population: x.fish.max_population }));
  const raw = pond({ roeAs: 'raw' });
  const processed = pond({ roeAs: 'processed', artisan: true });
  const fishponds = {
    raw: raw.filter((x) => x.kind !== 'legendary').slice(0, 8),
    processed: processed.filter((x) => x.kind !== 'legendary').slice(0, 8),
    legendary: raw.filter((x) => x.kind === 'legendary').slice(0, 3),
    sturgeon_caviar: processed.find((x) => x.id === 'sturgeon'),
    count: data.fishponds.fish.length,
  };

  /* Are pigs worth it? Truffles raw or as Truffle Oil. */
  const a = data.animals;
  const pig = a.animals.find((x) => x.id === 'pig');
  const truffle = a.products.find((p) => p.id === 'truffle');
  const oil = a.artisan.goods.find((g) => g.id === 'truffle-oil');
  const out = (o) => animalOutput(pig, a, { friendship: 1000, mood: 255, ...o });
  const pigs = {
    price: pig.purchase_price,
    building: pig.building_name,
    truffles_per_day_max: r2(out({}).perDay),
    truffles_per_day_half_hearts: r2(out({ friendship: 500 }).perDay),
    truffle: truffle.price_by_quality,
    oil: { price: oil.base_price, artisan: Math.floor(oil.base_price * a.professions.artisan.sell_multiplier), minutes: oil.minutes, per_machine_day: r2(minutesPerDay / oil.minutes) },
    raw_per_day: r0(out({}).goldPerDay),
    oil_per_day: r0(out({ process: true }).goldPerDay),
    oil_artisan_per_day: r0(out({ process: true, artisan: true }).goldPerDay),
    oil_makers_per_pig: r2((out({}).perDay * oil.minutes) / minutesPerDay),
    cow_per_day: r0(animalOutput(a.animals.find((x) => x.id === 'cow'), a, { friendship: 1000, mood: 255 }).goldPerDay),
  };
  pigs.payback_raw = r2(pigs.price / pigs.raw_per_day);
  pigs.payback_oil_artisan = r2(pigs.price / pigs.oil_artisan_per_day);

  return { kegs, greenhouse, fertilizer, fishponds, pigs };
}

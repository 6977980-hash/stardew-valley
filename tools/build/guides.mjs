// Numbers printed in the guides, computed from the same engine and data as the tools so a
// guide can never disagree with the calculator it links to. Called by tools/build/answers.mjs
// and stored in data/answers.json under `guides`.
import { cropProfit } from '../../assets/js/engine/profit.js';
import { allocate } from '../../assets/js/engine/machines.js';
import { productsFor } from '../../assets/js/engine/processing.js';
import { expectedItems } from '../../assets/js/engine/harvest.js';
import { growthDays } from '../../assets/js/engine/growth.js';
import { rankPonds, pondOutput } from '../../assets/js/engine/fishpond.js';
import { animalOutput } from '../../assets/js/engine/animals.js';
import { shoppingList } from '../../assets/js/engine/crafting.js';

const r0 = (n) => Math.round(n);
const r2 = (n) => Math.round(n * 100) / 100;

export function buildGuides(data, crops, crafting, ghRank) {
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
  greenhouse.unlimited = ghRank.processed.slice(0, 4);
  greenhouse.raw_top = ghRank.raw.slice(0, 4);
  const ghYear = (id, established) => cropProfit(byId(id), data, { greenhouse: true, horizonDays: 112, established, sellAs: 'raw' });
  greenhouse.layouts = data.greenhouse.sprinklers.map((sp) => {
    const t = 120 - sp.soil_used;
    return { id: sp.id, name: sp.name, sprinklers: sp.positions.length, tiles: t, ancient_fruit_raw: r0(ghYear('ancient-fruit', true).profit * t), starfruit_raw: r0(ghYear('starfruit', true).profit * t) };
  });
  greenhouse.first_year = ['ancient-fruit', 'starfruit', 'hops', 'pineapple'].map((id) => {
    const first = ghYear(id, false);
    const est = ghYear(id, true);
    return { id, name: byId(id).name, first_profit: r0(first.profit), first_harvests: first.harvestDays.length, established_profit: r0(est.profit), established_harvests: est.harvestDays.length, growth: growthDays(byId(id)) };
  });
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

  const ramp = processed
    .filter((x) => x.kind !== 'legendary')
    .slice(0, 6)
    .map((x) => {
      const f = data.fishponds.fish.find((y) => y.id === x.id);
      const at = (pop) => r0(pondOutput(f, data.fishponds, { population: pop, roeAs: 'processed', artisan: true }).goldPerDay);
      return {
        id: f.id,
        name: f.name,
        initial_capacity: f.initial_capacity,
        spawn_days: f.spawn_days,
        reproduces: f.reproduces,
        days_to_fill: f.reproduces ? 9 * f.spawn_days : null,
        gold: { 1: at(1), 3: at(3), 5: at(5), 10: at(10) },
        quests: f.quests.map((q) => ({ population: q.population, to: q.capacity_after, options: q.options.map((o) => (o.min > 1 ? `${o.min} ${o.item}` : o.item)) })),
      };
    });
  fishponds.ramp = ramp;

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
  pigs.by_friendship = [0, 200, 400, 600, 800, 1000].map((fr) => ({ hearts: fr / 200, friendship: fr, truffles: r2(out({ friendship: fr }).perDay), raw: r0(out({ friendship: fr }).goldPerDay), oil_artisan: r0(out({ friendship: fr, process: true, artisan: true }).goldPerDay) }));
  pigs.conditions = pig.produce.conditions;
  pigs.compare = a.animals
    .filter((x) => x.purchase_price)
    .map((x) => {
      const raw = r0(animalOutput(x, a, { friendship: 1000, mood: 255 }).goldPerDay);
      const proc = r0(animalOutput(x, a, { friendship: 1000, mood: 255, process: true, artisan: true }).goldPerDay);
      return { id: x.id, name: x.name, building: x.building_name, price: x.purchase_price, raw, processed: proc, payback: r2(x.purchase_price / Math.max(raw, proc)) };
    })
    .sort((x, y) => y.processed - x.processed);
  pigs.payback_raw = r2(pigs.price / pigs.raw_per_day);
  pigs.payback_oil_artisan = r2(pigs.price / pigs.oil_artisan_per_day);

  /* Harvest days for a day-1 planting, and what a later planting day does to the choice. */
  const harvestDays = (season, id, f) => cropProfit(byId(id), data, { plantSeason: season, farmingLevel: 6, fertilizer: f }).harvestDays;
  fertilizer.schedule = [['spring', 'cauliflower'], ['spring', 'potato'], ['summer', 'melon'], ['summer', 'starfruit'], ['summer', 'blueberry'], ['fall', 'pumpkin'], ['fall', 'cranberries']].map(([season, id]) => ({
    id,
    name: byId(id).name,
    season,
    growth: growthDays(byId(id)),
    none: harvestDays(season, id, null),
    speed: harvestDays(season, id, 'speed-gro'),
    deluxe: harvestDays(season, id, 'deluxe-speed-gro'),
  }));
  fertilizer.late = [8, 15].map((day) => ({
    day,
    rows: [['spring', 'cauliflower'], ['spring', 'potato'], ['summer', 'melon'], ['summer', 'starfruit'], ['fall', 'pumpkin']].map(([season, id]) => {
      const at = (f) => cropProfit(byId(id), data, { plantSeason: season, plantDay: day, farmingLevel: 6, fertilizer: f });
      const list = [['none', at(null)], ['speed-gro', at('speed-gro')], ['deluxe-speed-gro', at('deluxe-speed-gro')]].map(([k, r]) => ({ k, profit: r0(r.profit), harvests: r.harvestDays.length }));
      return { id, name: byId(id).name, season, options: list, best: [...list].sort((a, b) => b.profit - a.profit)[0].k };
    }),
  }));

  /* What the machines and fertilizers cost in materials, from the crafting data. */
  const make = (id, qty = 1) => {
    const l = shoppingList([{ id, qty }], crafting, { year2: true });
    return { id, name: crafting.recipes.find((r) => r.id === id).name, qty, makes: l.outputs[0].makes, materials: l.materials.map((m) => ({ name: m.name, qty: m.qty })), obtained: crafting.recipes.find((r) => r.id === id).obtained };
  };
  const costs = Object.fromEntries(['keg', 'preserves-jar', 'oil-maker', 'iridium-sprinkler', 'quality-sprinkler', 'sprinkler', 'speed-gro', 'deluxe-speed-gro', 'cask'].map((id) => [id, make(id)]));
  costs.kegs_50 = make('keg', 50);
  costs.jars_50 = make('preserves-jar', 50);
  costs.iridium_6 = make('iridium-sprinkler', 6);
  costs.quality_16 = make('quality-sprinkler', 16);

  return { kegs, greenhouse, fertilizer, fishponds, pigs, costs };
}

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
import { agingPlan, agedPrice, cellarCost } from '../../assets/js/engine/casks.js';
import { driedPrice, smokedPrice } from '../../assets/js/engine/dehydrator.js';

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

  /* Casks: what aging adds, per item and per cask slot per day. */
  const ck = data.casks;
  const caskItem = (id) => ck.aging.items.find((i) => i.id === id);
  const plan = (id, o) => {
    const pl = agingPlan(ck, caskItem(id), o);
    return { id, name: pl.name, normal: pl.prices.normal, silver: pl.prices.silver, gold: pl.prices.gold, iridium: pl.prices.iridium, days: pl.days, per_day: r2(pl.gainPerCaskDay), per_day_gold: r2(pl.gainPerCaskDayToGold) };
  };
  const wineFruit = ['ancient-fruit', 'starfruit', 'pineapple', 'melon', 'rhubarb', 'grape', 'blueberry', 'cranberries', 'strawberry'].map((id) => {
    const c = byId(id);
    const pl = plan('wine', { fruitBase: c.base_price });
    const keg = allocate(c, data.machines, { items: 0, counts: {}, days: 28, artisan: true }).options.find((o) => o.product === 'wine');
    return { id, name: c.name, base: c.base_price, wine: pl.normal, silver: pl.silver, gold: pl.gold, iridium: pl.iridium, extra_cask: pl.iridium - pl.normal, per_cask_day: pl.per_day, keg_per_day: keg ? r0(keg.gainPerMachineDay) : null, cellar: (pl.iridium - pl.normal) * cellarCost(ck).max };
  });
  const cellar = cellarCost(ck);
  const caskObtain = ck.obtain;
  const casksData = {
    items: ['pale-ale', 'beer', 'mead', 'cheese', 'goat-cheese'].map((id) => ({ ...plan(id, { artisan: false }), artisan: plan(id, { artisan: true }) })),
    wine: wineFruit,
    cellar: { ...cellar, upgrade_gold: caskObtain.cellar_upgrade.value, upgrade_days: caskObtain.upgrade_days.value, wine_days: caskItem('wine').total_days },
    recipe: caskObtain.recipe_ingredients,
    cask_cost: costs.cask,
    artisan_percent: ck.professions.find((f) => f.id === 'artisan-bonus-percent').value,
  };

  /* Dehydrator: gold per machine-day versus gold per fruit, against Kegs. */
  const dh = data.dehydrator;
  const dehFruit = ['ancient-fruit', 'starfruit', 'pineapple', 'melon', 'rhubarb', 'blueberry', 'cranberries', 'strawberry', 'hot-pepper'].map((id) => {
    const c = byId(id);
    const dried = driedPrice(dh, 'dried-fruit', c.base_price);
    const wine = agedPrice(ck, caskItem('wine'), 'normal', { fruitBase: c.base_price });
    return { id, name: c.name, base: c.base_price, raw5: c.base_price * 5, wine, wine5: wine * 5, dried, dried_plain: driedPrice(dh, 'dried-fruit', c.base_price, { artisan: false }), per_dehydrator_day: dried, per_keg_day: r0(wine / (allocate(c, data.machines, { items: 0, counts: {}, days: 28, artisan: true }).options.find((o) => o.product === 'wine')?.days ?? 6.25)), keg_days_for_5: r2(5 * 6.25) };
  });
  const grape = byId('grape');
  const smoker = dh.machines.find((m) => m.id === 'fish-smoker');
  const deh = dh.machines.find((m) => m.id === 'dehydrator');
  const dehydrator = {
    fruit: dehFruit,
    raisins: { grape: grape.base_price, raisins: driedPrice(dh, 'raisins', grape.base_price), raisins_plain: driedPrice(dh, 'raisins', grape.base_price, { artisan: false }), wine5: 5 * agedPrice(ck, caskItem('wine'), 'normal', { fruitBase: grape.base_price }), raw5: 5 * grape.base_price },
    smoker: [50, 100, 500].map((p) => ({ fish: p, plain: smokedPrice(dh, p, { artisan: false }), artisan: smokedPrice(dh, p) })),
    recipe: { dehydrator: deh.recipe.ingredients, dehydrator_shop: deh.recipe.unlock, smoker: smoker.recipe.ingredients, smoker_shop: smoker.recipe.unlock },
    minutes: dh.machines.flatMap((m) => m.products).find((p) => p.id === 'dried-fruit').minutes,
    smoker_minutes: dh.machines.flatMap((m) => m.products).find((p) => p.id === 'smoked-fish').minutes,
  };

  /* Coop or barn first? Animals you can buy, grouped by building. */
  const at = (x, fr, o = {}) => animalOutput(x, a, { friendship: fr, mood: 255, ...o });
  const buildings = ['coop', 'barn'].map((b) => ({
    building: b,
    animals: a.animals
      .filter((x) => x.building === b && x.purchase_price)
      .map((x) => ({
        id: x.id,
        name: x.name,
        price: x.purchase_price,
        building_name: x.building_name,
        mature: x.days_to_mature,
        hearts0: r0(at(x, 0).goldPerDay),
        hearts3: r0(at(x, 600).goldPerDay),
        hearts5: r0(at(x, 1000).goldPerDay),
        processed5: r0(at(x, 1000, { process: true, artisan: true }).goldPerDay),
        payback: r2(x.purchase_price / Math.max(at(x, 1000).goldPerDay, at(x, 1000, { process: true, artisan: true }).goldPerDay)),
        machines: at(x, 1000, { process: true, artisan: true }).machines.map((m) => ({ name: m.name, per_animal: r2(m.perAnimal) })),
      })),
  }));

  const eggAnimals = a.animals
    .filter((x) => !x.purchase_price)
    .map((x) => ({ id: x.id, name: x.name, building_name: x.building_name, hearts5: r0(at(x, 1000).goldPerDay), processed5: r0(at(x, 1000, { process: true, artisan: true }).goldPerDay), how: x.acquisition ? x.acquisition.wiki_wording : null }));

  /* A worked harvest: 100 Starfruit and a 6.25-day window, one full Keg cycle. */
  const sf = dehFruit.find((x) => x.id === 'starfruit');
  const window_days = 6.25;
  const batches_per_dehydrator = Math.floor(window_days);
  const scenario = { fruit: 'Starfruit', harvest: 100, window_days, raw_each: sf.base };
  scenario.setups = [
    { kegs: 0, dehydrators: 0 },
    { kegs: 20, dehydrators: 0 },
    { kegs: 0, dehydrators: 4 },
    { kegs: 20, dehydrators: 2 },
    { kegs: 20, dehydrators: 4 },
  ].map((m) => {
    const wine = Math.min(m.kegs, scenario.harvest);
    const left = scenario.harvest - wine;
    const batches = Math.min(m.dehydrators * batches_per_dehydrator, Math.floor(left / 5));
    const raw = left - batches * 5;
    return { ...m, wine, batches, raw, total: wine * sf.wine + batches * sf.dried + raw * sf.base };
  });
  dehydrator.scenario = scenario;

  return { kegs, greenhouse, fertilizer, fishponds, pigs, costs, casks: casksData, dehydrator, buildings, egg_animals: eggAnimals };
}

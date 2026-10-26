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
import { treePlan, fruitValue, plantBy, firstYear, fruitPerYear } from '../../assets/js/engine/fruittrees.js';
import { cropSellPrice } from '../../assets/js/engine/price.js';
import { rankCrops } from '../../assets/js/engine/decision.js';

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
        // Artisan comes after Tiller, so raw sales use the Tiller price. Processed items are taken
        // out at the same average raw price they were counted at (quality mix included).
        const r = cropProfit(c, data, { greenhouse: true, horizonDays: 112, established: true, sellAs: 'raw', tiller: true });
        const items = r.harvestDays.length * r.itemsPerHarvest * tiles;
        const a = allocate(c, data.machines, { items, counts: { keg: count }, days: 112, artisan: true, tiller: true });
        const rawPerItem = r.perHarvest / r.itemsPerHarvest;
        const extra = a.plan.filter((p) => p.machine).reduce((sum, p) => sum + p.value - p.items * rawPerItem, 0);
        return { id: c.id, name: c.name, total: r0(r.profit * tiles + extra) };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  const greenhouse = { tiles, by_kegs: [0, 20, 50, 100, 170].map((k) => ({ kegs: k, top: withKegs(k) })) };
  const perKegDay = (id, product) => {
    const o = allocate(byId(id), data.machines, { items: 0, counts: {}, days: 28, artisan: true, tiller: true }).options.find((x) => x.product === product);
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
    // Raw gold per day for every fish, so a table never has to print a placeholder.
    raw_by_id: Object.fromEntries(raw.map((x) => [x.id, x.gold_per_day])),
    // How many non-legendary pond fish start with room for 1 fish, and how many for 3.
    start_capacity: data.fishponds.fish
      .filter((f) => f.kind !== 'legendary')
      .reduce((n, f) => ({ ...n, [f.initial_capacity]: (n[f.initial_capacity] || 0) + 1 }), {}),
  };

  const ramp = processed
    .filter((x) => x.kind !== 'legendary')
    .slice(0, 6)
    .map((x) => {
      const f = data.fishponds.fish.find((y) => y.id === x.id);
      const at = (pop) => r0(pondOutput(f, data.fishponds, { population: pop, roeAs: 'processed', artisan: true }).goldPerDay);
      // From one fish to ten: nine spawns, plus one more spawn cycle per quest, because finishing a
      // quest resets the spawn clock, plus about a day per quest before it appears. This matches the
      // wiki's Fish Pond example (Ice Pip, 5-day spawns: 69 days, not 45).
      const quests = f.quests.filter((q) => q.population < data.fishponds.rules.population.max_capacity).length;
      return {
        id: f.id,
        name: f.name,
        initial_capacity: f.initial_capacity,
        spawn_days: f.spawn_days,
        reproduces: f.reproduces,
        quests_to_fill: quests,
        days_to_fill: f.reproduces ? (9 + quests) * f.spawn_days + quests : null,
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
  const pigBuilding = ((data.buildings || {}).buildings || []).find((l) => l.family === pig.building && l.level === pig.building_level);
  if (pigBuilding) {
    pigs.building_total = pigBuilding.total.gold;
    pigs.building_wood = pigBuilding.total.wood;
    pigs.building_stone = pigBuilding.total.stone;
    pigs.building_capacity = pigBuilding.capacity;
    pigs.building_path = ((data.buildings || {}).buildings || []).filter((l) => l.family === pig.building && l.level <= pig.building_level).map((l) => ({ name: l.name, gold: l.gold }));
    pigs.payback_with_building = r2((pigs.price + pigBuilding.total.gold) / pigs.raw_per_day);
    pigs.payback_building_share = r2((pigs.price + pigBuilding.total.gold / pigBuilding.capacity) / pigs.raw_per_day);
  }
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
  // Robin's Coop and Barn levels (data/buildings.json); empty when the file isn't loaded.
  const levels = (data.buildings || {}).buildings || [];
  const levelOf = (x) => levels.find((l) => l.family === x.building && l.level === x.building_level);
  const withBuilding = (x) => {
    const l = levelOf(x);
    const raw = at(x, 1000).goldPerDay;
    if (!l || !(raw > 0)) return {};
    return {
      building_total: l.total.gold,
      capacity: l.capacity,
      // Raw payback with the whole building on the first animal, and with a full building's share.
      payback_with_building: r2((x.purchase_price + l.total.gold) / raw),
      payback_building_share: r2((x.purchase_price + l.total.gold / l.capacity) / raw),
    };
  };
  const buildings = ['coop', 'barn'].map((b) => ({
    building: b,
    levels: levels.filter((l) => l.family === b).map((l) => ({ id: l.id, name: l.name, gold: l.gold, wood: l.materials.wood, stone: l.materials.stone, capacity: l.capacity, total: l.total.gold, total_wood: l.total.wood, total_stone: l.total.stone })),
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
        ...withBuilding(x),
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

  const fruitTrees = data.fruittrees ? buildFruitTrees(data, ck) : null;
  const yearOne = data.yearone ? buildYearOne(data, crops, costs, buildings, fruitTrees) : null;

  return { kegs, greenhouse, fertilizer, fishponds, pigs, costs, casks: casksData, dehydrator, buildings, egg_animals: eggAnimals, fruit_trees: fruitTrees, year_one: yearOne };
}

/* Fruit trees: every tree's sapling, season, fruit prices, and what it earns over four years. */
function buildFruitTrees(data, ck) {
  const ft = data.fruittrees;
  const rule = (k) => ft.rules[k].value;
  const wineItem = ck.aging.items.find((i) => i.id === 'wine');
  const bundles = data.bundles ? data.bundles.bundles.filter((b) => b.set === 'standard' && b.items && b.items.some((i) => ft.trees.some((t) => t.id === i.id))) : [];
  const trees = ft.trees.map((t) => {
    const plan = (o) => treePlan(t, data, { years: 4, ...o });
    const raw = plan({});
    const rawT = plan({ tiller: true });
    const wine = plan({ sellAs: 'wine' });
    const wineA = plan({ sellAs: 'wine', artisan: true });
    const jelly = plan({ sellAs: 'jelly' });
    const gh = plan({ location: 'greenhouse' });
    const ghWine = plan({ location: 'greenhouse', sellAs: 'wine', artisan: true });
    const each = (sellAs, o = {}) => r2(fruitValue(t, data, { sellAs, ...o }));
    const fourYear = (p) => r0(p.years[3].cumulative - (t.sapling_prices.pierre || 0));
    return {
      id: t.id,
      name: t.name,
      tree: t.tree,
      sapling: t.sapling,
      season: t.season,
      island: t.island_year_round,
      pierre: t.sapling_prices.pierre || null,
      cart: t.sapling_prices.traveling_cart || null,
      trade: t.sapling_prices.island_trader || null,
      base: t.base_price,
      prices: t.price_by_quality,
      tiller: t.wiki_prices.tiller,
      plant_by: plantBy(t, data),
      first_year_spring1: firstYear(t, data, { plantSeason: 'spring', plantDay: 1 }).fruit,
      raw: raw.years.map((y) => r0(y.gold)),
      raw_tiller_y4: r0(rawT.years[3].gold),
      each: { jelly: each('jelly'), wine: each('wine'), dried: each('dried-fruit'), wine_artisan: each('wine', { artisan: true }), jelly_artisan: each('jelly', { artisan: true }), dried_artisan: each('dried-fruit', { artisan: true }) },
      wine_year: r0(wine.years[0].gold),
      wine_artisan_year: r0(wineA.years[0].gold),
      jelly_year: r0(jelly.years[0].gold),
      aged_wine_iridium: agedPrice(ck, wineItem, 'iridium', { fruitBase: t.base_price }),
      payback: { raw_fruit: raw.paybackFruit, raw_year: raw.paybackYear, wine_fruit: wine.paybackFruit, jelly_fruit: jelly.paybackFruit, greenhouse_raw_days: gh.paybackFruit },
      four_year: { raw: raw.sapling ? fourYear(raw) : null, wine: wine.sapling ? fourYear(wine) : null, wine_artisan: wineA.sapling ? fourYear(wineA) : null },
      greenhouse: { raw_y1: r0(gh.years[0].gold), raw_y4: r0(gh.years[3].gold), wine_artisan: r0(ghWine.years[0].gold) },
    };
  });
  const bought = trees.filter((t) => t.pierre);
  return {
    count: trees.length,
    days_to_mature: rule('days_to_mature'),
    fruit_per_season: fruitPerYear(ft.trees[0], data, 'farm'),
    fruit_per_year_greenhouse: fruitPerYear(ft.trees[0], data, 'greenhouse'),
    max_on_tree: rule('max_on_tree'),
    quality_years: rule('quality_per_year'),
    sapling_speed: rule('sapling_quality_speed'),
    lightning_days: rule('lightning_days'),
    all_six: rule('all_saplings_pierre'),
    // A tree gives one fruit a day: machines that keep up with it are the machine's days per item.
    machines_per_tree: Object.fromEntries(['jelly', 'wine'].map((id) => {
      const p = data.machines.machines.flatMap((m) => m.products).find((x) => x.id === id);
      return [id === 'jelly' ? 'jar' : 'keg', r2((p.minutes / data.machines.minutes_per_day) * rule('fruit_per_day'))];
    })),
    trees,
    by_four_year_raw: [...bought].sort((a, b) => b.four_year.raw - a.four_year.raw).map((t) => t.id),
    by_payback: [...bought].sort((a, b) => a.payback.raw_fruit - b.payback.raw_fruit || a.pierre - b.pierre).map((t) => t.id),
    bundles: bundles.map((b) => ({ name: b.name, room: b.room, slots: b.slots, items: b.items.length, fruit: b.items.filter((i) => ft.trees.some((t) => t.id === i.id)).map((i) => i.name) })),
    rules_evidence: Object.fromEntries(Object.entries(ft.rules).map(([k, v]) => [k, v.evidence])),
  };
}

/* Year 1 money: the crops you can buy in Year 1, what a gold of seed earns back, and when the
   machines, coop and greenhouse come in. */
function buildYearOne(data, crops, costs, buildings, fruitTrees) {
  const y = data.yearone;
  const byId = (id) => crops.find((c) => c.id === id);
  const year2 = y.pierre_year2_seeds.map((s) => s.crop);
  const shops = ['pierre', 'jojamart'];
  const xp = data.skills ? Object.fromEntries(data.skills.farming.crops.map((c) => [c.id, c.xp])) : {};
  const levelTotal = (lvl) => data.skills.levels.thresholds.find((t) => t.level === lvl).total;
  const seasonRows = (season, day = 1) =>
    rankCrops(crops, data, { season, today: day, tiles: 1, budget: null, farmingLevel: 0 })
      .filter((x) => !year2.includes(x.crop.id) && x.seed.source !== 'oasis')
      .map((x) => {
        const c = x.crop;
        // Cash is the limit in Year 1: how soon the seed's cost comes back, and what each gold
        // spent on seed over the season returns.
        const seed = x.seed.price;
        const need = Math.ceil(seed / x.r.perHarvest);
        const payback = c.regrow_days ? (need <= x.r.harvestDays.length ? x.r.harvestDays[need - 1] - day : null) : x.r.growth;
        return {
          id: c.id,
          name: c.name,
          seed_price: seed,
          shop: x.seed.source,
          growth: x.r.growth,
          regrows: c.regrow_days || null,
          harvests: x.r.harvestDays.length,
          profit: r0(x.total),
          continues: x.nextSeasons,
          per_harvest: r0(x.r.perHarvest),
          payback_days: payback,
          per_gold: r2(x.r.revenue / x.r.seedCost),
          xp: xp[c.id] || null,
        };
      });
  const spring = seasonRows('spring');
  const summer = seasonRows('summer');
  const fall = seasonRows('fall');
  const left = (season) =>
    crops
      .filter((c) => !c.indoor_only && c.seasons.map((s) => s.toLowerCase()).includes(season) && (year2.includes(c.id) || (c.seed_prices.oasis > 0 && !shops.some((k) => c.seed_prices[k] > 0))))
      .map((c) => ({ id: c.id, name: c.name, why: year2.includes(c.id) ? 'year2' : 'desert' }));

  // Strawberries: seeds bought at the Egg Festival and planted the same day after the festival
  // (as on Best Spring Crops), against a potato planted that day.
  const sb = byId('strawberry');
  const eggDay = y.egg_festival.day;
  const sbr = cropProfit(sb, data, { plantSeason: 'spring', plantDay: eggDay, seedSource: 'egg_festival' });
  const late = (id) => cropProfit(byId(id), data, { plantSeason: 'spring', plantDay: eggDay });
  const strawberry = {
    day: eggDay,
    plant_day: eggDay,
    seed_price: y.egg_festival.seed_price,
    harvests: sbr.harvestDays.length,
    harvest_days: sbr.harvestDays,
    profit: r0(sbr.profit),
    potato: r0(late('potato').profit),
    cauliflower: r0(late('cauliflower').profit),
    next_spring: r0(cropProfit(sb, data, { plantSeason: 'spring', plantDay: 1, seedSource: 'egg_festival' }).profit),
    next_spring_harvests: cropProfit(sb, data, { plantSeason: 'spring', plantDay: 1, seedSource: 'egg_festival' }).harvestDays.length,
  };

  const parsnip = byId('parsnip');
  // Day 1 with the starting gold and room for 40 tiles: what the gold buys and earns by Spring 28.
  const dayOne = rankCrops(crops, data, { season: 'spring', today: 1, tiles: 40, budget: y.start_gold.value, farmingLevel: 0 })
    .filter((x) => !x.unaffordable && !year2.includes(x.crop.id) && x.seed.source !== 'oasis')
    .slice(0, 4)
    .map((x) => ({ id: x.crop.id, name: x.crop.name, tiles: x.tiles, total: r0(x.total) }));
  const start = {
    day_one: dayOne,
    gold: y.start_gold.value,
    seeds: y.start_seeds.qty,
    seed_name: y.start_seeds.seed,
    parsnip_price: cropSellPrice(parsnip, 'regular'),
    parsnip_value: y.start_seeds.qty * cropSellPrice(parsnip, 'regular'),
    parsnip_xp: y.start_seeds.qty * (xp.parsnip || 0),
    potato_seeds: Math.floor(y.start_gold.value / byId('potato').seed_prices.pierre),
    parsnip_seeds: Math.floor(y.start_gold.value / parsnip.seed_prices.pierre),
    cauliflower_seeds: Math.floor(y.start_gold.value / byId('cauliflower').seed_prices.pierre),
  };

  const level = (lvl) => ({ level: lvl, xp: levelTotal(lvl), harvests: Object.fromEntries(['parsnip', 'potato', 'cauliflower', 'blueberry', 'melon', 'cranberries', 'pumpkin'].map((id) => [id, Math.ceil(levelTotal(lvl) / xp[id])])) });
  const recipe = (id) => data.crafting.recipes.find((r) => r.id === id);
  const processed = ['blueberry', 'melon', 'hot-pepper', 'cranberries', 'pumpkin', 'grape'].map((id) => {
    const c = byId(id);
    const jar = productsFor(c, data.machines).find((p) => p.machine === 'preserves-jar');
    const keg = productsFor(c, data.machines).find((p) => p.machine === 'keg');
    return { id, name: c.name, raw: c.base_price, jar: jar.productName, jar_price: jar.price, jar_days: r2(jar.days), keg: keg.productName, keg_price: keg.price, keg_days: r2(keg.days) };
  });
  const coop = buildings.find((b) => b.building === 'coop');
  const chicken = coop.animals.find((a) => a.id === 'chicken');
  const pantry = data.bundles.bundles.filter((b) => b.room === 'pantry' && b.set === 'standard' && b.items);
  const vault = data.bundles.bundles.filter((b) => b.room === 'vault' && b.set === 'standard');
  const apricot = fruitTrees ? fruitTrees.trees.find((t) => t.id === 'apricot') : null;
  return {
    start,
    spring,
    summer,
    fall,
    not_year_one: { spring: left('spring'), summer: left('summer'), fall: left('fall') },
    year2_evidence: y.pierre_year2_seeds.map((s) => ({ crop: s.crop, seed: s.seed })),
    desert: { joja: y.desert.bus_repair_joja, vault: vault.reduce((sum, b) => sum + b.gold, 0), vault_bundles: vault.map((b) => b.gold) },
    winter_shop_crops: crops.filter((c) => c.seasons.includes('Winter') && shops.some((k) => c.seed_prices[k] > 0)).length,
    strawberry,
    levels: { jar: level(Number(recipe('preserves-jar').obtained.match(/\d+/)[0])), keg: level(Number(recipe('keg').obtained.match(/\d+/)[0])) },
    jar: { obtained: recipe('preserves-jar').obtained, materials: costs['preserves-jar'].materials },
    keg: { obtained: recipe('keg').obtained, materials: costs.keg.materials },
    processed,
    coop: { level: coop.levels[0], chicken: { price: chicken.price, mature: chicken.mature, hearts0: chicken.hearts0, hearts5: chicken.hearts5, processed5: chicken.processed5, payback: chicken.payback, payback_building_share: chicken.payback_building_share } },
    pantry: pantry.map((b) => ({ name: b.name, slots: b.slots, items: b.items.map((i) => ({ name: i.name, qty: i.qty, quality: i.quality })) })),
    pantry_reward: data.bundles.rooms.find((r) => r.id === 'pantry').reward,
    apricot: apricot ? { sapling: apricot.pierre, payback_fruit: apricot.payback.raw_fruit, payback_year: apricot.payback.raw_year, first_year_raw: apricot.raw[0] } : null,
  };
}

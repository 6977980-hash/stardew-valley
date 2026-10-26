import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankCrops, reasons } from '../../assets/js/engine/decision.js';
import { cropProfit } from '../../assets/js/engine/profit.js';
import { data, json } from './helpers.js';

const crops = data.crops.crops;
const base = { farmingLevel: 0, tiles: 1, budget: null };

test('one tile, no limits: the ranking matches the Crop Profit numbers', () => {
  const ranked = rankCrops(crops, data, { ...base, season: 'spring', today: 1 });
  assert.equal(ranked[0].crop.id, 'rhubarb');
  const r = cropProfit(ranked[0].crop, data, { plantSeason: 'spring', seedSource: 'oasis' });
  assert.equal(Math.round(ranked[0].total), Math.round(r.profit));
  for (let i = 1; i < ranked.length; i++) assert.ok(ranked[i - 1].total >= ranked[i].total);
});

test('late in the season only crops that finish in time are listed', () => {
  const ranked = rankCrops(crops, data, { ...base, season: 'spring', today: 24 });
  assert.ok(ranked.length > 0);
  for (const o of ranked) assert.ok(o.lastHarvest <= 28 && o.r.harvestDays[0] - 24 >= 1);
  assert.equal(rankCrops(crops, data, { ...base, season: 'spring', today: 28 }).length, 0);
});

test('the budget limits how many tiles get seeds, and gold spent today never exceeds it', () => {
  const ranked = rankCrops(crops, data, { ...base, season: 'spring', today: 1, tiles: 100, budget: 1000 });
  for (const o of ranked.filter((x) => !x.unaffordable)) {
    assert.ok(o.spendNow <= 1000, `${o.crop.id} spends ${o.spendNow}`);
    assert.equal(o.tiles, Math.min(100, Math.floor(1000 / o.startCost)));
  }
  const parsnip = ranked.find((o) => o.crop.id === 'parsnip');
  assert.equal(parsnip.tiles, 50); // 20g seeds at Pierre's
  assert.equal(parsnip.limitedByBudget, true);
});

test('machines: processing is used only when it beats selling raw, within machine capacity', () => {
  const s = { ...base, season: 'summer', today: 1, tiles: 50, artisan: true };
  const noMachines = rankCrops(crops, data, s).find((o) => o.crop.id === 'blueberry');
  const kegs = rankCrops(crops, data, { ...s, kegs: 10 }).find((o) => o.crop.id === 'blueberry');
  assert.equal(noMachines.processing, null);
  assert.ok(kegs.processing && kegs.total > noMachines.total);
  const used = kegs.processing.plan.reduce((n, p) => n + p.items, 0);
  assert.ok(used <= kegs.items);
});

test('reasons name a real difference between the top two', () => {
  const ranked = rankCrops(crops, data, { ...base, season: 'summer', today: 1 });
  const why = reasons(ranked[0], ranked[1]);
  assert.ok(why.length >= 1 && why.length <= 3);
  assert.match(why.join(' '), new RegExp(ranked[0].crop.name));
});

test('farmYear 1 leaves out seeds Pierre only sells from Year 2', () => {
  const withYear = { ...data, yearOne: json('data/year-one.json') };
  const s = { ...base, season: 'spring', today: 1, tiles: 15, budget: 500 };
  const ids = (o) => rankCrops(crops, withYear, o).map((x) => x.crop.id);
  assert.ok(ids(s).includes('garlic'), 'no year given: Garlic is ranked');
  assert.ok(!ids({ ...s, farmYear: 1 }).includes('garlic'), 'Year 1: no Garlic');
  assert.ok(!ids({ ...s, season: 'summer', farmYear: 1 }).includes('red-cabbage'), 'Year 1: no Red Cabbage');
  assert.ok(ids({ ...s, season: 'summer', farmYear: 2 }).includes('red-cabbage'), 'Year 2: Red Cabbage is back');
});

test('farmYear 1 leaves out Oasis seeds: the desert bus is not repaired yet', () => {
  const withYear = { ...data, yearOne: json('data/year-one.json') };
  const ids = (o) => rankCrops(crops, withYear, o).map((x) => x.crop.id);
  const fall = { ...base, season: 'fall', today: 1, tiles: 50, budget: 500, farmYear: 1 };
  const top = rankCrops(crops, withYear, fall)[0];
  assert.notEqual(top.seed.source, 'oasis', 'Year 1 Fall 1: the pick is not an Oasis seed');
  assert.ok(!ids(fall).includes('beet'), 'Year 1 Fall: no Beet');
  assert.ok(!ids({ ...fall, season: 'spring' }).includes('rhubarb'), 'Year 1 Spring: no Rhubarb');
  assert.ok(!ids({ ...fall, season: 'summer' }).includes('starfruit'), 'Year 1 Summer: no Starfruit');
  assert.ok(ids({ ...fall, farmYear: 2 }).includes('beet'), 'Year 2: Beet is back');
  assert.ok(ids({ ...fall, desert: true }).includes('beet'), 'Year 1 with the bus repaired: Beet is back');
});

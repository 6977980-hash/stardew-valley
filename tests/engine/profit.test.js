import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cropProfit, seedPrice } from '../../assets/js/engine/profit.js';
import { expectedItems, maxHarvest } from '../../assets/js/engine/harvest.js';
import { data, crop } from './helpers.js';

test('expected items per harvest match the wiki descriptions', () => {
  assert.equal(expectedItems(crop('parsnip')), 1);
  assert.ok(Math.abs(expectedItems(crop('potato')) - 1.25) < 1e-9, 'potato: on average 0.25 extra');
  assert.ok(Math.abs(expectedItems(crop('unmilled-rice')) - 1.61) < 0.005, 'rice: 1.61 on average');
  assert.ok(Math.abs(expectedItems(crop('unmilled-rice'), 10) - 2.11) < 0.005, 'rice: 2.11 at level 10');
  assert.equal(maxHarvest(crop('unmilled-rice'), 9), 2);
  assert.ok(expectedItems(crop('blueberry')) > 3 && expectedItems(crop('blueberry')) < 3.03);
});

test('parsnip, spring day 1, no bonuses', () => {
  const r = cropProfit(crop('parsnip'), data, {});
  assert.deepEqual(r.harvestDays, [5, 9, 13, 17, 21, 25]);
  assert.equal(r.seedCost, 6 * 20);
  // 6 harvests * expected price at level 0 (97% 35g, 2% 43g, 1% 52g)
  const expected = 6 * (0.97 * 35 + 0.02 * 43 + 0.01 * 52) - 120;
  assert.ok(Math.abs(r.profit - expected) < 0.5, `${r.profit} vs ${expected}`);
  assert.equal(r.steps.at(-1).key, 'profit');
});

test('regrowing crop buys one seed; extras are regular quality', () => {
  const r = cropProfit(crop('blueberry'), data, { plantSeason: 'summer', farmingLevel: 10, fertilizer: 'deluxe-fertilizer' });
  assert.equal(r.harvestDays.length, 4);
  assert.equal(r.seedCost, 80);
  const first = r.steps.find((s) => s.key === 'price').value;
  const rest = r.steps.find((s) => s.key === 'price-rest').value;
  assert.ok(first > 62.5, 'deluxe fertilizer: first berry at least silver');
  assert.equal(rest, 50);
});

test('starfruit wine with Artisan', () => {
  const r = cropProfit(crop('starfruit'), data, { sellAs: 'wine', artisan: true });
  assert.deepEqual(r.harvestDays, [14, 27]);
  assert.equal(r.perHarvest, 3150);
  assert.equal(r.profit, 2 * 3150 - 2 * 400);
});

test('selling in a machine that does not take the crop is an error', () => {
  assert.throws(() => cropProfit(crop('parsnip'), data, { sellAs: 'wine' }), /cannot be made into wine/);
  assert.throws(() => cropProfit(crop('parsnip'), data, { fertilizer: 'nope' }), /unknown fertilizer/);
});

test('seeds without a gold price are not counted as free', () => {
  assert.deepEqual(seedPrice(crop('ancient-fruit')), { source: null, price: null });
  const r = cropProfit(crop('ancient-fruit'), data, { greenhouse: true, horizonDays: 112 });
  assert.equal(r.seedCost, null);
  assert.match(r.steps.find((s) => s.key === 'seeds').detail, /no gold price/);
});

test('cheapest seed source is used unless one is chosen', () => {
  assert.deepEqual(seedPrice(crop('sunflower')), { source: 'jojamart', price: 125 });
  assert.deepEqual(seedPrice(crop('sunflower'), 'pierre'), { source: 'pierre', price: 200 });
});

test('every verified crop produces a finite result in its own season', () => {
  for (const c of data.crops.crops) {
    const r = cropProfit(c, data, { greenhouse: c.indoor_only, horizonDays: 112 });
    assert.ok(Number.isFinite(r.profit), c.id);
    assert.equal(r.verified, c.verification_status === 'cross-checked');
  }
});

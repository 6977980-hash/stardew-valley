import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agedPrice, agingPlan, cellarCost } from '../../assets/js/engine/casks.js';
import { driedPrice, smokedPrice } from '../../assets/js/engine/dehydrator.js';
import { json } from './helpers.js';

const casks = json('data/casks.json');
const deh = json('data/dehydrator.json');
const item = (id) => casks.aging.items.find((i) => i.id === id);

test('cheese is 230g normal, 287g silver, 345g gold, 460g iridium without Artisan', () => {
  const p = agingPlan(casks, item('cheese'), { artisan: false }).prices;
  assert.deepEqual(p, { normal: 230, silver: 287, gold: 345, iridium: 460 });
});

test('wine is three times the fruit price, then the quality multiplier, then Artisan', () => {
  assert.equal(agedPrice(casks, item('wine'), 'normal', { fruitBase: 550, artisan: false }), 1650);
  assert.equal(agedPrice(casks, item('wine'), 'iridium', { fruitBase: 550, artisan: false }), 3300);
  assert.equal(agedPrice(casks, item('wine'), 'iridium', { fruitBase: 550 }), 4620);
  assert.throws(() => agedPrice(casks, item('wine'), 'gold'));
});

test('days and slot income follow the wiki totals', () => {
  const plan = agingPlan(casks, item('wine'), { fruitBase: 550 });
  assert.equal(plan.days.iridium, 56);
  assert.ok(Math.abs(plan.gainPerCaskDay - (4620 - 2310) / 56) < 1e-9);
});

test('full cellar needs 156 more casks, 3,120 Wood and 156 Hardwood', () => {
  const c = cellarCost(casks);
  assert.deepEqual([c.start, c.max, c.extra, c.wood, c.hardwood], [33, 189, 156, 3120, 156]);
});

test('dried fruit prices match every row of the wiki table, including the 1g rounding cases', () => {
  for (const r of deh.fruit_examples.table.filter((x) => x.product === 'dried-fruit')) {
    assert.equal(driedPrice(deh, 'dried-fruit', r.base_price, { artisan: false }), r.price, r.fruit);
    assert.equal(driedPrice(deh, 'dried-fruit', r.base_price), r.artisan_price, r.fruit);
  }
});

test('raisins are a fixed price; smoked fish doubles the fish price', () => {
  assert.equal(driedPrice(deh, 'raisins', 80, { artisan: false }), 600);
  assert.equal(driedPrice(deh, 'raisins', 80), 840);
  assert.equal(smokedPrice(deh, 100, { artisan: false }), 200);
  assert.equal(smokedPrice(deh, 100), 280);
});

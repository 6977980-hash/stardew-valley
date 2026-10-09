import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shoppingList } from '../../assets/js/engine/crafting.js';
import { json } from './helpers.js';

const crafting = json('data/crafting.json');
const qty = (list, id) => (list.materials.find((m) => m.id === id) || {}).qty || 0;

test('a recipe with only raw ingredients lists them as they are, times the crafts', () => {
  const l = shoppingList([{ id: 'cherry-bomb', qty: 3 }], crafting);
  assert.equal(qty(l, 'copper-ore'), 12);
  assert.equal(qty(l, 'coal'), 3);
  assert.equal(l.made.length, 0);
});

test('a bar is expanded into ore and the coal used to smelt it', () => {
  const crab = crafting.recipes.find((r) => r.id === 'crab-pot');
  assert.ok(crab);
  const l = shoppingList([{ id: 'crab-pot', qty: 1 }], crafting);
  assert.equal(qty(l, 'wood'), 40);
  assert.equal(qty(l, 'iron-ore'), 15); // 3 bars x 5 ore
  assert.equal(qty(l, 'coal'), 3);
  assert.equal(l.made[0].crafts, 3);
  const t = shoppingList([{ id: 'crab-pot', qty: 1 }], crafting, { trapper: true });
  assert.equal(qty(t, 'wood'), 25);
  assert.equal(qty(t, 'copper-ore'), 10);
});

test('the same intermediate needed by two recipes is rounded up once, and yield is respected', () => {
  const l = shoppingList([{ id: 'crab-pot', qty: 1 }, { id: 'crab-pot', qty: 1 }], crafting);
  assert.equal(l.made.find((m) => m.id === 'iron-bar').crafts, 6);
  const f = shoppingList([{ id: 'iron-fence', qty: 1 }], crafting);
  assert.equal(f.outputs[0].makes, 10);
});

test('shop prices follow the year: coal is 150g in year 1 and 250g after', () => {
  const l1 = shoppingList([{ id: 'cherry-bomb', qty: 1 }], crafting, { year2: false });
  const l2 = shoppingList([{ id: 'cherry-bomb', qty: 1 }], crafting, { year2: true });
  assert.equal(l1.buyCost, 4 * 75 + 150);
  const p = (id) => crafting.shop_prices.find((x) => x.id === id);
  assert.equal(p('coal').price_year2, 250);
  assert.equal(l2.buyCost, 4 * (p('copper-ore').price_year2 ?? p('copper-ore').price) + 250);
});

test('every recipe expands to raw materials only, with no loops', () => {
  for (const r of crafting.recipes) {
    const l = shoppingList([{ id: r.id, qty: 1 }], crafting);
    assert.ok(l.materials.length > 0, r.id);
    for (const m of l.materials) assert.ok(m.qty > 0 && Number.isFinite(m.qty), `${r.id}: ${m.id}`);
  }
});

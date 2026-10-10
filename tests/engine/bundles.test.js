import { test } from 'node:test';
import assert from 'node:assert/strict';
import { itemKeys, filled, isDone, isChoice, activeBundles, roomProgress, stillNeeded } from '../../assets/js/engine/bundles.js';
import { json } from './helpers.js';

const data = json('data/bundles.json');
const b = (id) => data.bundles.find((x) => x.id === id);

test('a bundle needs only as many items as it has slots', () => {
  const spring = b('spring-foraging');
  assert.equal(spring.slots, 4);
  assert.ok(!isDone(spring, ['leek']));
  assert.ok(isDone(spring, ['leek', 'daffodil', 'dandelion', 'wild-horseradish']));
});

test('the same item twice in a bundle gets two keys', () => {
  const k = itemKeys(b('construction'));
  assert.deepEqual(k.slice(0, 2), ['wood', 'wood#2']);
  assert.equal(new Set(k).size, k.length);
});

test('alternatives with the same group number fill one slot between them', () => {
  const dye = b('remixed-dye');
  assert.equal(filled(dye, ['red-mushroom', 'beet']), 1);
  assert.equal(filled(dye, ['red-mushroom', 'sea-urchin']), 2);
});

test('gold bundles are one slot', () => {
  assert.ok(!isDone(b('vault-2500'), []));
  assert.ok(isDone(b('vault-2500'), ['paid']));
});

test('remixed bundles that are alternatives only count once the player says they are in the save', () => {
  const choices = data.bundles.filter((x) => x.set === 'remixed' && isChoice(x));
  assert.ok(choices.length > 10);
  const none = activeBundles(data, 'remixed', []);
  assert.ok(choices.every((c) => !none.includes(c)));
  const some = activeBundles(data, 'remixed', [choices[0].id]);
  assert.ok(some.includes(choices[0]));
  assert.equal(activeBundles(data, 'standard').length, data.bundles.filter((x) => x.set === 'standard').length);
});

test('room progress and still-needed follow ticks', () => {
  const state = { ticked: { 'spring-foraging': ['leek', 'daffodil', 'dandelion', 'wild-horseradish'] }, mine: [] };
  const crafts = roomProgress(data, 'standard', state).find((r) => r.room.id === 'crafts-room');
  assert.equal(crafts.done, 1);
  assert.equal(crafts.total, 6);
  assert.ok(!crafts.complete);
  const left = stillNeeded(data, 'standard', state);
  assert.ok(!left.some((x) => x.name === 'Wild Horseradish' && x.bundles.includes('Spring Foraging Bundle')));
  assert.ok(left.length > 20);
});

test('an item that fills two slots of one bundle is listed once, with both amounts added', () => {
  const twice = data.bundles.find((x) => x.items && x.items.filter((i) => i.id === 'wood').length > 1);
  assert.ok(twice, 'expected a bundle with two Wood slots');
  const rows = stillNeeded(data, 'standard', { mine: [], ticked: {} });
  const wood = rows.find((r) => r.id === 'wood');
  assert.equal(wood.bundles.filter((n) => n === twice.name).length, 1);
  assert.equal(wood.qty, 198);
});

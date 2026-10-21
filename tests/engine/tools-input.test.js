// Phase 4 (2026-10-21 audit): number boxes are read the same way in every tool, and state kept
// outside the form (the crafting list) goes into share links.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readInt, plural, stateQuery, initialState } from '../../assets/js/tools/common.js';

// Stand-in for <input type="number">: valueAsNumber is what the browser parses ("1e5" = 100000).
const box = (value, min = 1, max = 28, blank) => ({
  value,
  valueAsNumber: value === '' ? NaN : Number(value),
  min: String(min),
  max: String(max),
  dataset: blank ? { blank } : {},
});

test('readInt keeps a good value and says nothing', () => {
  assert.deepEqual(readInt(box('10'), '1'), { value: 10, note: '' });
});

test('readInt clamps to min and max and says so', () => {
  const hi = readInt(box('99'), '1');
  assert.equal(hi.value, 28);
  assert.match(hi.note, /highest is 28/);
  const lo = readInt(box('-5'), '1');
  assert.equal(lo.value, 1);
  assert.match(lo.note, /lowest is 1/);
  assert.equal(readInt(box('0', 1, 10), '10').value, 1, 'a pond of 0 fish is read as 1, not 10');
});

test('readInt reads scientific notation and drops decimals with a note', () => {
  assert.deepEqual(readInt(box('1e5', 0, 100000), '100'), { value: 100000, note: '' });
  const d = readInt(box('1.5', 1, 336), '28');
  assert.equal(d.value, 1);
  assert.match(d.note, /Whole numbers/);
});

test('readInt uses the field default when blank, not 1', () => {
  const r = readInt(box('', 1, 10), '10');
  assert.equal(r.value, 10);
  assert.match(r.note, /using 10/);
  assert.equal(readInt(box('', 1, 1), '10').value, 1, 'the default is clamped too (legendary pond holds one fish)');
});

test('readInt leaves a box that allows blank empty (What to Plant budget: no limit)', () => {
  assert.deepEqual(readInt(box('', 0, 10000000, 'none'), '500'), { value: '', note: '' });
});

test('plural', () => {
  assert.equal(plural(1, 'day'), '1 day');
  assert.equal(plural(28, 'day'), '28 days');
  assert.equal(plural(1500, 'tile'), '1,500 tiles');
  assert.equal(plural(2, 'different material'), '2 different materials');
});

test('the crafting list rides in share links and opening one counts as a link', () => {
  const form = { recipe: 'crab-pot', qty: '1', year2: true };
  const qs = stateQuery(form, form, [], { list: 'keg:999,crab-pot:5' });
  assert.match(qs, /list=keg%3A999%2Ccrab-pot%3A5/);
  assert.match(qs, /share=1/);
  const s = initialState({ defaults: form, search: `?${qs}`, ownKeys: ['list'], checkboxes: ['year2'] });
  assert.equal(s.fromLink, true);
  assert.deepEqual(s.extra, [], 'the list is not copied back as a foreign param');
  assert.equal(stateQuery({ recipe: 'keg' }, { recipe: 'keg' }, [], { list: '' }), '', 'an empty list adds nothing');
});

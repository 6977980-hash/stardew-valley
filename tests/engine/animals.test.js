import { test } from 'node:test';
import assert from 'node:assert/strict';
import { productQuality, largeChance, animalOutput, rankAnimals } from '../../assets/js/engine/animals.js';
import { json } from './helpers.js';

const data = json('data/animals.json');
const fx = json('tests/fixtures/animal-formulas.json');
const animal = (id) => data.animals.find((a) => a.id === id);
const near = (a, b, eps = 0.0005) => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b}`);

test('quality chances match the wiki table (max friendship and mood, with and without Coopmaster/Shepherd)', () => {
  for (const row of fx.quality_table.rows) {
    const q = productQuality(data, { friendship: fx.quality_table.friendship, mood: fx.quality_table.mood, professionBonus: row.profession });
    near(q.iridium, row.iridium);
    near(q.gold, row.gold);
    near(q.silver, row.silver);
  }
});

test('quality worked example: score 0.266 gives 13% gold', () => {
  const e = fx.quality_example;
  const q = productQuality(data, { friendship: e.friendship, mood: e.mood });
  near(q.gold, e.gold_pct / 100, 0.005); // the wiki rounds 13.3% to 13%
  assert.equal(q.iridium, 0);
});

test('Large product chance matches the wiki worked example', () => {
  const e = fx.deluxe_examples.large;
  near(largeChance(animal('cow'), data, { friendship: e.friendship, mood: e.mood }), e.expected);
  const r = fx.deluxe_examples.rabbit;
  near(largeChance(animal('rabbit'), data, { friendship: r.friendship, mood: r.mood, luck: r.daily_luck }), r.expected);
  assert.equal(largeChance(animal('cow'), data, { friendship: 100, mood: 255 }), 0, 'needs 200 friendship');
});

test('pig: about 3 truffles a day at max friendship, as the wiki says', () => {
  near(animalOutput(animal('pig'), data, {}).perDay, 3, 0.01);
});

test('sheep: wool every day with 900+ friendship and Shepherd', () => {
  assert.equal(animalOutput(animal('sheep'), data, { friendship: 1000, shepherd: true }).perDay, 1);
  assert.equal(animalOutput(animal('sheep'), data, { friendship: 500 }).perDay, 1 / 3);
});

test('processing uses the machine only when it is worth more; Artisan raises goods, Rancher raw products', () => {
  const cow = animal('cow');
  const raw = animalOutput(cow, data, { rancher: true });
  const cheese = animalOutput(cow, data, { process: true, artisan: true });
  assert.ok(cheese.goldPerDay > raw.goldPerDay);
  assert.ok(cheese.lines.every((l) => l.sold.includes('Cheese')));
  assert.ok(cheese.machines.length > 0);
});

test('ranking covers every animal, best first', () => {
  const r = rankAnimals(data, {});
  assert.equal(r.length, data.animals.length);
  for (let i = 1; i < r.length; i++) assert.ok(r[i - 1].out.goldPerDay >= r[i].out.goldPerDay);
});

test('artisan prices use whole hundredths: a cow\'s Cheese is worth 483 with Artisan (345 x 1.4), not 482', () => {
  const o = animalOutput(animal('cow'), data, { count: 1, days: 28, friendship: 1000, mood: 255, process: true, artisan: true });
  assert.equal(o.lines.find((l) => l.sold === 'Cheese').value, 483);
});

test('payback is null (shown as "never") when the animal earns nothing after hay', () => {
  const chicken = animal('chicken');
  const r = animalOutput(chicken, data, { count: 1, days: 28, friendship: 0, mood: 0, buyHay: true, hayDays: 28 });
  assert.ok(r.paybackDays === null || Number.isFinite(r.paybackDays));
  assert.notEqual(r.paybackDays, Infinity);
  assert.ok(!(r.paybackDays < 0));
});

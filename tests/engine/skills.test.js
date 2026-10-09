import { test } from 'node:test';
import assert from 'node:assert/strict';
import { levelFromXp, totalForLevel, xpToLevel, fishXp, farmingXpPerDay, actionsFor } from '../../assets/js/engine/skills.js';
import { json } from './helpers.js';

const skills = json('data/skills.json');
const crops = json('data/crops.json').crops;
const t = skills.levels.thresholds;
const fish = (id) => skills.fishing.fish.find((f) => f.id === id);

test('levels: thresholds from the wiki, level 10 at 15,000 XP', () => {
  assert.equal(levelFromXp(0, t), 0);
  assert.equal(levelFromXp(99, t), 0);
  assert.equal(levelFromXp(100, t), 1);
  assert.equal(levelFromXp(14999, t), 9);
  assert.equal(levelFromXp(15000, t), 10);
  assert.equal(totalForLevel(10, t), 15000);
  assert.equal(xpToLevel(380, 10, t), 15000 - 380);
  assert.equal(xpToLevel(20000, 10, t), 0);
});

test('fishing XP reproduces the wiki examples stored with the formula', () => {
  const f = skills.fishing.formula;
  const sardine = { difficulty: 30, legendary: false };
  assert.equal(fishXp(sardine, f), 13);
  assert.equal(fishXp(sardine, f, { treasure: true, perfect: true }), 67);
  assert.equal(fishXp(sardine, f, { quality: 'gold', perfect: true }), 45);
  for (const ex of f.examples.filter((e) => !e.inputs.legendary && e.inputs.quality == null)) {
    assert.equal(fishXp({ difficulty: ex.inputs.difficulty, legendary: false }, f, ex.inputs), ex.xp, ex.case);
  }
});

test('fishing XP: base XP column matches the formula for every fish (legendary x5)', () => {
  for (const x of skills.fishing.fish) assert.equal(fishXp(x, skills.fishing.formula), x.base_xp, x.name);
});

test('farming XP per day: regrowing crops count each regrow, others each replant', () => {
  const xp = (id) => skills.farming.crops.find((c) => c.id === id);
  const crop = (id) => crops.find((c) => c.id === id);
  assert.equal(farmingXpPerDay(xp('parsnip'), crop('parsnip')), xp('parsnip').xp / 4);
  assert.equal(farmingXpPerDay(xp('blueberry'), crop('blueberry')), xp('blueberry').xp / 4);
  assert.equal(actionsFor(100, 8), 13);
  assert.equal(actionsFor(0, 8), 0);
});

// Headline facts that several pages print must agree with each other (audit 2026-10-21, CON-05/06,
// DATA-01/06). Reads the generated files, so run `node tools/build/answers.mjs` first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { json } from './helpers.js';

const answers = json('data/answers.json');
const entities = json('data/entities.json');
const crops = Object.values(entities.crops);

const rankedIn = (season) =>
  crops
    .flatMap((c) => c.plantings.filter((p) => p.season === season && p.rank).map((p) => ({ id: c.id, rank: p.rank, of: p.of })))
    .sort((a, b) => a.rank - b.rank);

for (const season of ['spring', 'summer', 'fall']) {
  test(`${season}: the #1 crop is the same on crop pages, Best Crops and the Crop Profit short answer`, () => {
    const ranked = rankedIn(season);
    assert.equal(ranked[0].rank, 1);
    assert.equal(ranked[0].id, answers.best_crops[season][0].id);
    assert.equal(ranked[0].id, answers.crop_profit[season][0].id);
    // Same pool of crops: shop seeds, grown outdoors.
    assert.equal(ranked.length, answers.best_crops[season].length);
    assert.deepEqual(new Set(ranked.map((r) => r.id)), new Set(answers.best_crops[season].map((r) => r.id)));
    for (const r of ranked) assert.equal(r.of, ranked.length);
  });
}

test('indoor-only and seedless crops are never ranked in a season', () => {
  for (const c of crops) {
    if (c.indoor_only) assert.equal(c.plantings.length, 0, c.id);
    if (!c.shop_seeds) for (const p of c.plantings) assert.equal(p.rank, null, c.id);
  }
});

test('greenhouse: the overall best crop is the same everywhere', () => {
  const best = crops.reduce((b, c) => (!b || c.greenhouse.established > b.greenhouse.established ? c : b), null);
  assert.equal(answers.greenhouse.raw[0].id, best.id);
  assert.equal(answers.guides.greenhouse.raw_top[0].id, best.id);
});

test('keg: the headline crop (single-input recipes) matches the guide and Keg vs Jar figures', () => {
  const lead = entities.machines.keg.crops.find((r) => r.input === 1);
  assert.equal(lead.id, 'starfruit');
  assert.equal(answers.guides.greenhouse.per_keg_day[0].name, lead.name);
  assert.equal(answers.guides.greenhouse.per_keg_day[0].gain, lead.gain_per_machine_day);
  assert.equal(answers.keg_vs_jar.starfruit_artisan.wine.gain_per_machine_day, lead.gain_per_machine_day);
  const sf = entities.crops.starfruit.machine_gain.find((m) => m.machine === 'Keg');
  assert.equal(sf.gain_per_machine_day, lead.gain_per_machine_day);
});

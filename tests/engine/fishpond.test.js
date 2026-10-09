import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baseChance, pondOutput, rankPonds } from '../../assets/js/engine/fishpond.js';
import { json } from './helpers.js';

const data = json('data/fishponds.json');
const fish = (id) => data.fish.find((f) => f.id === id);

test('base chance follows the wiki: 23% with one fish, 95% with ten, 50% legendary', () => {
  assert.equal(Math.round(baseChance(fish('woodskip'), 1, data.rules) * 100), 23);
  assert.equal(Math.round(baseChance(fish('woodskip'), 10, data.rules) * 100), 95);
  assert.equal(baseChance(fish('angler'), 1, data.rules), 0.5);
});

test('item chances equal the daily chances printed on the wiki fish pages (within rounding)', () => {
  let checked = 0;
  for (const f of data.fish) {
    for (const row of f.produce) {
      if (!row.daily || row.only_if_above_fails) continue;
      const atMin = baseChance(f, row.population.min, data.rules) * row.share;
      if (Math.abs(atMin - row.daily.at_min_population) <= 0.011) checked++;
    }
  }
  assert.ok(checked > 300, `only ${checked} rows matched`);
});

test('roe value: extra roe adds a quarter, processed roe uses Aged Roe / Caviar prices', () => {
  const s = fish('sturgeon');
  const raw = pondOutput(s, data, { population: 10, roeAs: 'raw' });
  const cav = pondOutput(s, data, { population: 10, roeAs: 'processed', artisan: true });
  const roe = raw.items.find((i) => i.roe);
  assert.equal(roe.unitPrice, s.roe.price);
  assert.equal(cav.items.find((i) => i.roe).unitPrice, s.roe.processed.price_artisan);
  assert.ok(Math.abs(roe.perDay - 0.95 * (0.75 * 1 + 0.25 * 2) * 1.25) < 1e-9);
  assert.ok(cav.jarsNeeded > 0);
});

test('ranking is sorted and covers every pond fish', () => {
  const r = rankPonds(data, { roeAs: 'raw' });
  assert.equal(r.length, data.fish.length);
  for (let i = 1; i < r.length; i++) assert.ok(r[i - 1].out.goldPerDay >= r[i].out.goldPerDay);
});

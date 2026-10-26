import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cropProfit } from '../../assets/js/engine/profit.js';
import { machinesToKeepUp } from '../../assets/js/engine/machines.js';
import { json } from './helpers.js';

const crops = json('data/crops.json').crops;
const data = { fertilizers: json('data/fertilizers.json'), machines: json('data/machines.json'), seasons: json('data/seasons.json') };
const crop = (id) => crops.find((c) => c.id === id);
const wine = data.machines.machines.find((m) => m.id === 'keg').products.find((p) => p.id === 'wine');

test('kegs to keep up: steady state, the same for the first year and later years', () => {
  const af = crop('ancient-fruit');
  const gh = { greenhouse: true, horizonDays: 112, plantSeason: 'spring', sellAs: 'wine' };
  const first = machinesToKeepUp(af, cropProfit(af, data, gh), wine, data.machines.minutes_per_day);
  const later = machinesToKeepUp(af, cropProfit(af, data, { ...gh, established: true }), wine, data.machines.minutes_per_day);
  // One fruit every 7 days, 10,000 minutes (6.25 days) per Wine: 0.89 Kegs per plant.
  assert.ok(Math.abs(first - 6.25 / 7) < 1e-9, String(first));
  assert.ok(Math.abs(later - first) < 1e-9);
  assert.equal(Math.ceil(first * 100), 90); // the keg guide's "kegs per 100 plants"
  const sf = crop('starfruit');
  const sfr = cropProfit(sf, data, { plantSeason: 'summer', sellAs: 'wine' });
  assert.ok(Math.abs(machinesToKeepUp(sf, sfr, wine) - 6.25 / sf.growth_days) < 1e-9);
});

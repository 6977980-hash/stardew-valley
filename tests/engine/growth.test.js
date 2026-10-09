import { test } from 'node:test';
import assert from 'node:assert/strict';
import { speedBonus, speedUpPhases, growthDays, harvestSchedule, lastPlantingDay } from '../../assets/js/engine/growth.js';
import { data, crop, json } from './helpers.js';

const calendars = json('tests/fixtures/growth-calendars.json');
const SEASONS = { seasons: data.seasons.seasons, daysPerSeason: 28 };

// Calendar table labels -> speed settings. "10%" is Speed-Gro or Agriculturist alone.
const LABELS = {
  Base: {},
  '10%*': { fertilizerSpeed: 0.1 },
  '25%': { fertilizerSpeed: 0.25 },
  '33%': { fertilizerSpeed: 0.33 },
  '20%': { fertilizerSpeed: 0.1, agriculturist: true },
  '35%': { fertilizerSpeed: 0.25, agriculturist: true },
  '43%': { fertilizerSpeed: 0.33, agriculturist: true },
};

// Calendar tables that contradict other calendar tables on the same wiki page, so no single
// formula can match them all. Example: Green Bean and Yam both take 10 days, yet the page shows
// Speed-Gro giving 8 days for Green Bean and 9 for Yam. The engine follows the majority
// (284 of 290 tables). If the wiki is corrected, this list must shrink, never grow.
const KNOWN_WIKI_CONFLICTS = new Set([
  'green-bean 43%',
  'hops 43%',
  'grape 43%',
  'yam 10%*',
  'taro-root 10%* Unirrigated',
  'taro-root 20% Unirrigated',
]);

test('growth days match the wiki Crop Growth Calendars', () => {
  let checked = 0;
  const mismatches = [];
  for (const [id, cal] of Object.entries(calendars.crops)) {
    const c = crop(id);
    for (const t of cal.tables) {
      const opts = LABELS[t.label.replace(/ Unirrigated$/, '')];
      assert.ok(opts, `unknown calendar label ${t.label}`);
      const days = growthDays(c, opts);
      const expected = t.days ?? t.phases.reduce((s, d) => s + d, 0);
      checked++;
      if (days !== expected) mismatches.push(`${id} ${t.label}`);
    }
  }
  assert.ok(checked > 250, `only ${checked} calendar tables checked`);
  assert.deepEqual(mismatches.sort(), [...KNOWN_WIKI_CONFLICTS].sort());
});

test('speed bonus uses the game float rounding', () => {
  // 0.1 as a 32-bit float is 0.100000001…, so 10 days * 10% rounds up to 2 days removed.
  assert.equal(growthDays(crop('green-bean'), { fertilizerSpeed: 0.1 }), 8);
  assert.equal(growthDays(crop('cauliflower'), { fertilizerSpeed: 0.1 }), 10);
  assert.equal(growthDays(crop('parsnip'), {}), 4);
  assert.equal(growthDays(crop('parsnip'), { fertilizerSpeed: 0.1 }), 3);
  assert.ok(speedBonus({ fertilizerSpeed: 0.1, agriculturist: true }) > 0.2);
});

test('a one-day first stage is never shortened', () => {
  assert.deepEqual(speedUpPhases([1, 1, 1], 0.99), [1, 0, 0]);
  assert.deepEqual(speedUpPhases([2, 2], 0), [2, 2]);
});

test('single-harvest crops are replanted until the season ends', () => {
  const s = harvestSchedule(crop('parsnip'), { plantSeason: 'spring', ...SEASONS });
  assert.deepEqual(s.harvests, [5, 9, 13, 17, 21, 25]);
  const late = harvestSchedule(crop('cauliflower'), { plantSeason: 'spring', plantDay: 17, ...SEASONS });
  assert.deepEqual(late.harvests, [], 'planted day 17, ready day 29: dies first');
  assert.deepEqual(harvestSchedule(crop('cauliflower'), { plantSeason: 'spring', plantDay: 16, ...SEASONS }).harvests, [28]);
});

test('regrowing crops keep producing; Speed-Gro does not shorten regrowth', () => {
  const plain = harvestSchedule(crop('blueberry'), { plantSeason: 'summer', ...SEASONS });
  assert.deepEqual(plain.harvests, [14, 18, 22, 26]);
  // The Blueberry wiki page: Speed-Gro "gives one extra harvest before the Fall".
  const fast = harvestSchedule(crop('blueberry'), { plantSeason: 'summer', fertilizerSpeed: 0.1, ...SEASONS });
  assert.equal(fast.harvests.length, 5);
  assert.equal(fast.harvests[1] - fast.harvests[0], 4);
});

test('multi-season crops carry over; out-of-season planting yields nothing', () => {
  const corn = harvestSchedule(crop('corn'), { plantSeason: 'summer', ...SEASONS });
  assert.equal(corn.lastDay, 56);
  assert.equal(corn.harvests[0], 15);
  assert.equal(corn.harvests.at(-1), 55);
  assert.deepEqual(harvestSchedule(crop('parsnip'), { plantSeason: 'summer', ...SEASONS }).harvests, []);
});

test('greenhouse has no season limit', () => {
  const s = harvestSchedule(crop('ancient-fruit'), { plantSeason: 'winter', greenhouse: true, horizonDays: 112, ...SEASONS });
  assert.equal(s.harvests[0], 29);
  assert.equal(s.harvests.length, 12);
});

test('last planting day', () => {
  assert.equal(lastPlantingDay(crop('cauliflower'), { plantSeason: 'spring', ...SEASONS }), 16);
  assert.equal(lastPlantingDay(crop('cauliflower'), { plantSeason: 'spring', fertilizerSpeed: 0.1, ...SEASONS }), 18);
  assert.equal(lastPlantingDay(crop('sweet-gem-berry'), { plantSeason: 'fall', ...SEASONS }), 4);
});

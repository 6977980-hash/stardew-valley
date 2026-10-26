// Regression tests for the corrections after the 2026-10-21 audit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankCrops } from '../../assets/js/engine/decision.js';
import { cropProfit } from '../../assets/js/engine/profit.js';
import { giftPoints } from '../../assets/js/engine/gifts.js';
import { stillNeeded } from '../../assets/js/engine/bundles.js';
import { initialState, stateQuery } from '../../assets/js/tools/common.js';
import { data, crop, json } from './helpers.js';

test('What to Plant: every crop gets the same machine window (Summer 1, 50 tiles, 10 kegs → Starfruit)', () => {
  const ranked = rankCrops(data.crops.crops, data, { season: 'summer', today: 1, tiles: 50, kegs: 10, farmingLevel: 6, budget: null });
  assert.equal(ranked[0].crop.id, 'starfruit');
  const wheat = ranked.find((o) => o.crop.id === 'wheat');
  const star = ranked.find((o) => o.crop.id === 'starfruit');
  // Both windows end on the same day.
  assert.equal(wheat.processing.days + wheat.r.harvestDays[0], star.processing.days + star.r.harvestDays[0]);
});

test('What to Plant: machines only start on items already harvested', () => {
  // Pumpkin on Fall 1 is harvested on days 14 and 27; Juice takes 3.75 days, so 10 kegs make
  // 4 rounds from the first harvest and none from the second (it would not finish by day 28).
  const p = rankCrops(data.crops.crops, data, { season: 'fall', today: 1, tiles: 50, kegs: 10, farmingLevel: 6, budget: null }).find((o) => o.crop.id === 'pumpkin');
  assert.deepEqual(p.r.harvestDays, [14, 27]);
  assert.equal(p.processing.plan[0].items, 40);
});

test('Sunflower: seeds dropped at harvest mean one seed purchase per tile', () => {
  const r = cropProfit(crop('sunflower'), data, { plantSeason: 'fall', farmingLevel: 6 });
  assert.ok(r.harvestDays.length > 1);
  assert.equal(r.seedCost, crop('sunflower').seed_prices.jojamart);
  assert.ok(r.profit > 0);
});

test('Coffee Bean has no gold seed price (Dust Sprites, own harvest)', () => {
  const r = cropProfit(crop('coffee-bean'), data, { plantSeason: 'spring', farmingLevel: 6 });
  assert.equal(r.seedCost, null);
  assert.ok(r.profit > 0);
});

test('gift points truncate like the game', () => {
  const fr = json('data/gifts.json').friendship;
  assert.equal(giftPoints('like', fr, { friendship101: true }), 49);
  assert.equal(giftPoints('like', fr, { event: 'winter_star', friendship101: true }), 247);
  assert.equal(giftPoints('like', fr, { quality: 'silver' }), 49);
  assert.equal(giftPoints('love', fr), 80);
});

test('bundle "still needed" adds amounts across bundles (items are used up)', () => {
  const rows = stillNeeded(json('data/bundles.json'), 'standard', { mine: [], ticked: {} });
  const parsnip = rows.find((r) => r.id === 'parsnip');
  // 1 for Spring Crops; the Quality Crops Bundle takes any 3 of 4, so its 5 gold are optional.
  assert.equal(parsnip.qty, 1);
  assert.equal(parsnip.optional, 5);
  assert.match(parsnip.qtyNote, /5 gold more if you pick it/);
});

const form = { level: '0', tiller: false, artisan: false, season: 'spring', today: '1', budget: '' };
const boxes = ['tiller', 'artisan'];

test('tool state: a foreign query string (utm, quick form) only overrides the fields it names', () => {
  const s = initialState({ defaults: form, search: '?utm_source=x&season=summer', saved: { tiller: true }, farm: { level: '10', artisan: true }, checkboxes: boxes });
  assert.equal(s.values.season, 'summer');
  assert.equal(s.values.tiller, true);
  assert.equal(s.values.artisan, true);
  assert.equal(s.values.level, '10');
  assert.deepEqual(s.extra, [['utm_source', 'x']]);
  assert.match(stateQuery(s.values, form, s.extra), /utm_source=x/);
});

test('tool state: a shared link (share=1) is the whole form, so missing boxes are unticked', () => {
  const s = initialState({ defaults: form, search: '?season=fall&tiller=1&share=1', farm: { artisan: true }, checkboxes: boxes });
  assert.equal(s.values.tiller, '1');
  assert.equal(s.values.artisan, false);
  assert.equal(s.fromLink, true);
  // A field the link leaves out was at its default when the link was made.
  assert.equal(initialState({ defaults: form, search: '?today=3&share=1', farm: { level: '10' }, checkboxes: boxes }).values.level, '0');
});

test('tool state: no saved farm means page defaults, not another tool\'s values', () => {
  const s = initialState({ defaults: form, search: '', saved: null, farm: null, checkboxes: boxes });
  assert.deepEqual(s.values, form);
  assert.equal(stateQuery(s.values, form), '');
});

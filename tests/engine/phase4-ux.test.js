// Phase 4 (2026-10-26 audit): stated tool assumptions (F-91), crafting ?recipe= links (F-92),
// the free Parsnip Seeds on a new farm (F-93) and site search matching (F-94).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { assumptionParts } from '../../assets/js/tools/common.js';
import { startingList, listParam } from '../../assets/js/engine/crafting.js';
import { rankCrops, reasons } from '../../assets/js/engine/decision.js';
import { data, json } from './helpers.js';

const crafting = json('data/crafting.json');
const yearOne = json('data/year-one.json');
const crops = data.crops.crops;

test('F-91: the Assumes line names level, fertilizer and professions from the form', () => {
  const gh = { stage: 'first', level: '10', fertilizer: '', tiller: true, artisan: true, agri: false };
  assert.deepEqual(assumptionParts(gh, { first: ['first year from seed'], then: ['sold raw'] }), ['first year from seed', 'Farming level 10', 'no fertilizer', 'Tiller, Artisan', 'sold raw']);
  assert.deepEqual(assumptionParts({ level: '0', fertilizer: 'speed-gro', tiller: false }, { fertilizer: 'Speed-Gro' }), ['Farming level 0', 'Speed-Gro', 'no professions']);
  // Crafting has no level or fertilizer: only its own phrase and the Trapper box.
  assert.deepEqual(assumptionParts({ recipe: 'keg', qty: '1', trapper: false, year2: false }, { first: ['Year 1 shop prices'] }), ['Year 1 shop prices', 'no professions']);
  assert.deepEqual(assumptionParts({ villager: 'abigail' }, { then: [''] }), [], 'empty phrases are dropped');
});

test('F-92: a ?recipe= link shows that recipe and holds the saved list back', () => {
  const saved = [{ id: 'crab-pot', qty: 5 }, { id: 'keg', qty: 2 }];
  assert.deepEqual(startingList({ search: '?recipe=bug-steak', saved, crafting }), { list: [], held: saved });
  assert.deepEqual(startingList({ search: '', saved, crafting }), { list: saved, held: [] }, 'no link: the saved list');
  assert.deepEqual(startingList({ search: '?recipe=not-a-recipe', saved, crafting }).list, saved, 'an unknown recipe is ignored');
  const shared = startingList({ search: `?recipe=keg&list=${listParam([{ id: 'sprinkler', qty: 3 }])}`, saved, crafting });
  assert.deepEqual(shared, { list: [{ id: 'sprinkler', qty: 3 }], held: [] }, 'a shared list wins over the recipe');
  assert.deepEqual(startingList({ search: '', saved: [{ id: 'keg', qty: 5000 }, { id: 'nope', qty: 1 }, null], crafting }).list, [{ id: 'keg', qty: 999 }]);
});

test('F-93: the 15 free Parsnip Seeds fill tiles for free on a new farm', () => {
  const free = { crop: yearOne.start_seeds.crop, qty: yearOne.start_seeds.qty };
  assert.equal(free.crop, 'parsnip');
  assert.equal(free.qty, 15);
  const s = { season: 'spring', today: 1, tiles: 15, budget: 500, farmingLevel: 0, farmYear: 1 };
  const without = rankCrops(crops, { ...data, yearOne }, s).find((o) => o.crop.id === 'parsnip');
  const withFree = rankCrops(crops, { ...data, yearOne }, { ...s, freeSeeds: free }).find((o) => o.crop.id === 'parsnip');
  assert.equal(withFree.freeSeeds, 15);
  assert.equal(withFree.spendNow, 0, 'nothing to buy today');
  assert.equal(Math.round(withFree.total - without.total), 15 * withFree.seed.price, 'profit rises by the seeds not bought');
  // Other crops are untouched.
  const potato = (x) => rankCrops(crops, { ...data, yearOne }, x).find((o) => o.crop.id === 'potato');
  assert.equal(potato({ ...s, freeSeeds: free }).total, potato(s).total);
  // With more soil than gold the free seeds stretch the 500g: 15 free + 25 bought, capped by tiles.
  const wide = rankCrops(crops, { ...data, yearOne }, { ...s, tiles: 60, freeSeeds: free }).find((o) => o.crop.id === 'parsnip');
  assert.equal(wide.tiles, 40);
  assert.equal(wide.freeSeeds, 15);
  const best = rankCrops(crops, { ...data, yearOne }, { ...s, tiles: 60, freeSeeds: free })[0];
  assert.equal(best.crop.id, 'parsnip');
  assert.match(reasons(best, rankCrops(crops, { ...data, yearOne }, { ...s, tiles: 60, freeSeeds: free })[1])[0], /15 free Parsnip Seeds/);
});

test('F-93: answers.json carries the tool default with the free seeds and the tile crossover', () => {
  const a = json('data/answers.json');
  assert.equal(a.decision.new_farm.situation.freeSeeds.qty, 15);
  assert.ok(a.decision.new_farm.crossover && a.decision.new_farm.crossover.tiles > 15, 'more tiles change the pick');
  assert.equal(a.guides.year_one.tool_pick.best, a.decision.new_farm.best.name);
  assert.equal(a.tables.what_to_plant.find((r) => r.id === 'parsnip').free_seeds, 15);
});

// search.js is a classic browser script; its matcher registers itself on the global object.
const ctx = {};
runInNewContext(readFileSync(new URL('../../assets/js/search.js', import.meta.url), 'utf8'), ctx);
const S = ctx.StardewSearch;
const items = [
  { t: 'Bug Steak', k: 'Recipe', d: 'Materials to craft it, in the Crafting Calculator', x: '' },
  { t: 'Tea Sapling', k: 'Recipe', d: 'Materials to craft it, in the Crafting Calculator', x: '' },
  { t: 'Strawberry', k: 'Crop', d: 'Spring crop bought at the Egg Festival', x: '' },
  { t: 'Keg vs Preserves Jar', k: 'Tool', d: 'Which machine earns more for your crop', x: 'Keg or Preserves Jar?' },
  { t: 'Ancient Fruit vs Starfruit', k: 'Tool', d: 'Side by side per tile', x: '' },
  { t: 'Bundle Tracker', k: 'Tool', d: 'Tick off Community Center bundles', x: '' },
  { t: 'Potato', k: 'Crop', d: 'Spring crop', x: '' },
].map((it) => S.prep({ ...it }));
const titles = (q) => [...S.rank(items, q)].map((it) => it.t);

test('F-94: search matches word starts, not the middle of words', () => {
  assert.deepEqual(titles('tea'), ['Tea Sapling'], '"tea" no longer finds Bug Steak');
  assert.deepEqual(titles('steak'), ['Bug Steak']);
  assert.deepEqual(titles('straw'), ['Strawberry']);
  assert.equal(titles('pot')[0], 'Potato');
  assert.deepEqual(titles('egg festival'), ['Strawberry'], 'description words count too');
});

test('F-94: one letter off still finds the page', () => {
  assert.deepEqual(titles('strawbery'), ['Strawberry']);
  assert.deepEqual(titles('potatoe'), ['Potato']);
  assert.ok(S.near('starfruit', 'starfriut') === false, 'two changes are too many');
  assert.ok(S.near('keg', 'leg'));
  assert.deepEqual(titles('kgs'), [], 'short words need an exact start');
});

test('F-94: synonyms and plurals', () => {
  assert.equal(titles('af')[0], 'Ancient Fruit vs Starfruit');
  assert.equal(titles('jelly')[0], 'Keg vs Preserves Jar');
  assert.equal(titles('community center')[0], 'Bundle Tracker');
  assert.equal(titles('cc')[0], 'Bundle Tracker');
  assert.equal(titles('kegs')[0], 'Keg vs Preserves Jar');
  assert.deepEqual(titles(''), []);
});

test('F-94: an exact title beats a partial one', () => {
  const list = [{ t: 'Keg vs Preserves Jar', k: 'Tool', d: '', x: '' }, { t: 'Keg', k: 'Recipe', d: '', x: '' }].map((it) => S.prep(it));
  assert.equal(S.rank(list, 'keg')[0].t, 'Keg');
});

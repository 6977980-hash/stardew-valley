import { test } from 'node:test';
import assert from 'node:assert/strict';
import { json, data as base } from './helpers.js';
import { qualityInYear, fruitPerYear, fruitValue, treePlan, firstYear, plantBy, QUALITIES } from '../../assets/js/engine/fruittrees.js';

const data = { ...base, fruittrees: json('data/fruittrees.json'), dehydrator: json('data/dehydrator.json') };
const tree = (id) => data.fruittrees.trees.find((t) => t.id === id);

test('fruittrees.json: eight cross-checked trees with sources and a way to buy each sapling', () => {
  const t = data.fruittrees.trees;
  assert.equal(t.length, 8);
  for (const x of t) {
    assert.equal(x.verification_status, 'cross-checked', x.id);
    assert.ok(x.sources.length >= 3 && x.sources.every((s) => s.revid > 0 && s.url.startsWith('https://stardewvalleywiki.com/')), x.id);
    assert.ok(x.sapling_prices.pierre > 0 || x.sapling_prices.island_trader, x.id);
    assert.equal(x.days_to_mature, data.fruittrees.rules.days_to_mature.value);
    assert.ok(data.seasons.seasons.includes(x.season), x.id);
  }
  for (const [k, r] of Object.entries(data.fruittrees.rules)) assert.ok(typeof r.evidence === 'string' && r.evidence.length > 10, k);
});

test('fruit prices match the wiki: every quality, Tiller, Wine, Jelly and Dried Fruit with and without Artisan', () => {
  for (const t of data.fruittrees.trees) {
    const w = t.wiki_prices;
    for (const q of QUALITIES) {
      assert.equal(fruitValue(t, data, { quality: q }), t.price_by_quality[q], `${t.id} ${q}`);
      assert.equal(fruitValue(t, data, { quality: q, tiller: true }), w.tiller[q], `${t.id} ${q} Tiller`);
    }
    assert.equal(fruitValue(t, data, { sellAs: 'wine' }), w.wine.regular, `${t.id} wine`);
    assert.equal(fruitValue(t, data, { sellAs: 'wine', artisan: true }), w.wine_artisan.regular, `${t.id} wine Artisan`);
    assert.equal(fruitValue(t, data, { sellAs: 'jelly' }), w.jelly, `${t.id} jelly`);
    assert.equal(fruitValue(t, data, { sellAs: 'jelly', artisan: true }), w.jelly_artisan, `${t.id} jelly Artisan`);
    assert.equal(fruitValue(t, data, { sellAs: 'dried-fruit' }) * 5, w.dried_fruit, `${t.id} dried`);
    assert.equal(fruitValue(t, data, { sellAs: 'dried-fruit', artisan: true }) * 5, w.dried_fruit_artisan, `${t.id} dried Artisan`);
  }
});

test('quality climbs one star a year after the tree matures', () => {
  assert.deepEqual([1, 2, 3, 4, 9].map((y) => qualityInYear(data.fruittrees, y)), ['regular', 'silver', 'gold', 'iridium', 'iridium']);
});

test('a tree fruits 28 days a year on the farm and every day in the Greenhouse', () => {
  assert.equal(fruitPerYear(tree('peach'), data, 'farm'), 28);
  assert.equal(fruitPerYear(tree('peach'), data, 'greenhouse'), 112);
  assert.equal(fruitPerYear(tree('apricot'), data, 'island'), 112);
});

test('treePlan: an Apricot sapling (2,000g) sold raw pays back in its second year', () => {
  const p = treePlan(tree('apricot'), data);
  assert.deepEqual(p.years.map((y) => y.gold), [1400, 1736, 2100, 2800]);
  assert.equal(p.paybackYear, 2);
  // 1,400g after 28 fruit, then 62g silver fruit: 10 more pays the remaining 600g.
  assert.equal(p.paybackFruit, 38);
  // Banana has no gold price (Island Trader), so no payback.
  assert.equal(treePlan(tree('banana'), data).paybackYear, null);
});

test('firstYear and plantBy: plant 28 days before the season starts', () => {
  assert.deepEqual(plantBy(tree('apricot'), data), { season: 'winter', day: 1 });
  assert.deepEqual(plantBy(tree('peach'), data), { season: 'spring', day: 1 });
  assert.deepEqual(plantBy(tree('apple'), data), { season: 'summer', day: 1 });
  assert.equal(firstYear(tree('apricot'), data, { plantSeason: 'spring', plantDay: 1 }).fruit, 0);
  assert.equal(firstYear(tree('peach'), data, { plantSeason: 'spring', plantDay: 1 }).fruit, 28);
  // Planted Summer 8: matures Fall 8, so a Fall tree gets 21 days of fruit.
  const late = firstYear(tree('apple'), data, { plantSeason: 'summer', plantDay: 8 });
  assert.deepEqual(late.matures, { season: 'fall', day: 8, nextYear: false });
  assert.equal(late.fruit, 21);
});

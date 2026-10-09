import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qualityChances, QUALITY_MULTIPLIER } from '../../assets/js/engine/quality.js';
import { applyPrice, cropSellPrice } from '../../assets/js/engine/price.js';
import { productsFor } from '../../assets/js/engine/processing.js';
import { data, crop, json } from './helpers.js';

const quality = json('tests/fixtures/quality-tables.json');
const prices = json('tests/fixtures/wiki-prices.json');

// The wiki prints whole percentages adjusted so each row adds up to 100, so a cell can be up
// to 0.66 points away from the exact chance (Basic Fertilizer, level 0: 87.38% shown as 88%).
test('quality chances match every row of the wiki Fertilizer tables', () => {
  let rows = 0;
  for (const [fert, table] of Object.entries(quality.tables)) {
    for (const row of table) {
      const c = qualityChances(row.level, Number(fert));
      const ours = Number(fert) === 3 ? [c.silver, c.gold, c.iridium] : [c.regular, c.silver, c.gold];
      ours.forEach((p, i) => assert.ok(Math.abs(p * 100 - row.pct[i]) <= 0.7, `fert ${fert} level ${row.level} col ${i}: ${(p * 100).toFixed(2)} vs ${row.pct[i]}`));
      const avg = Object.entries(c).reduce((s, [q, p]) => s + p * QUALITY_MULTIPLIER[q], 0);
      assert.ok(Math.abs(avg - row.avg_multiplier) <= 0.006, `fert ${fert} level ${row.level} average ${avg} vs ${row.avg_multiplier}`);
      rows++;
    }
  }
  assert.equal(rows, 60);
});

test('chances always add up to 1', () => {
  for (let lvl = 0; lvl <= 14; lvl++) {
    for (let f = 0; f <= 3; f++) {
      const sum = Object.values(qualityChances(lvl, f)).reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(sum - 1) < 1e-12);
    }
  }
});

test('crop sell prices match the wiki for every crop, quality and Tiller', () => {
  let n = 0;
  for (const [id, w] of Object.entries(prices.crops)) {
    const c = crop(id);
    assert.equal(c.base_price, w.base, `${id} base price`);
    ['regular', 'silver', 'gold', 'iridium'].forEach((q, i) => {
      assert.equal(cropSellPrice(c, q), w.raw.none[i], `${id} ${q}`);
      if (w.raw.tiller) assert.equal(cropSellPrice(c, q, { tiller: true }), w.raw.tiller[i], `${id} ${q} tiller`);
      n += 2;
    });
  }
  assert.ok(n > 300, `${n} prices checked`);
});

test('keg and jar prices match the wiki, with and without Artisan', () => {
  let n = 0;
  for (const [id, w] of Object.entries(prices.crops)) {
    const c = crop(id);
    for (const artisan of [false, true]) {
      const ours = productsFor(c, data.machines, { artisan });
      for (const p of ours) {
        const wiki = w.products[p.product];
        assert.ok(wiki, `${id}: wiki lists no ${p.product}`);
        assert.equal(p.price, artisan ? wiki.artisan : wiki.none, `${id} ${p.product} artisan=${artisan}`);
        n++;
      }
    }
  }
  assert.ok(n >= 140, `${n} product prices checked`);
});

test('special keg recipes replace juice', () => {
  assert.deepEqual(productsFor(crop('wheat'), data.machines).map((p) => p.product).sort(), ['beer', 'pickles']);
  assert.deepEqual(productsFor(crop('hops'), data.machines).map((p) => p.product).sort(), ['pale-ale', 'pickles']);
  const coffee = productsFor(crop('coffee-bean'), data.machines, { artisan: true });
  assert.deepEqual(coffee.map((p) => [p.product, p.inputCount, p.price]), [['coffee', 5, 150]], 'Coffee gets no Artisan bonus');
  assert.deepEqual(productsFor(crop('sweet-gem-berry'), data.machines), [], 'not a fruit or vegetable');
  assert.deepEqual(productsFor(crop('tulip'), data.machines), []);
});

test('price rounding follows Module:Calcsellprice', () => {
  assert.equal(applyPrice(35, 1.25, 1.1), 47);
  assert.equal(applyPrice(2250, 1, 1.4), 3150);
});

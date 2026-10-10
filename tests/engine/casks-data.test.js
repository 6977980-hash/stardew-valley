import { test } from 'node:test';
import assert from 'node:assert/strict';
import { json } from './helpers.js';
import {
  parseAgedCells,
  parseCaskTable,
  parseItemAged,
  parsePriceArg,
  parseIngredients,
  parseCaskProductivity,
  linkNames,
  htmlText,
  infobox,
  firstInt,
  plain,
  settle,
} from '../../tools/data/import-casks.mjs';

const casks = json('data/casks.json');
const checks = json('tests/fixtures/casks-checks.json');
const item = (id) => casks.aging.items.find((i) => i.id === id);

/* ---------- parse helpers ---------- */

test('parsePriceArg reads fixed prices and fruit multiples', () => {
  assert.deepEqual(parsePriceArg('200'), { fixed: 200 });
  assert.deepEqual(parsePriceArg('3 x Base<br />[[Fruits|Fruit]] Price'), { fruit_multiple: 3 });
  assert.deepEqual(parsePriceArg('3 × [[Fruits|Fruit]] Base Sell Price'), { fruit_multiple: 3 });
  assert.equal(parsePriceArg('Cannot be sold'), undefined);
});

test('parseAgedCells reads Aged/Total per quality', () => {
  const wt = "|{{Qualityprice|Cheese|230|quality=normal|dsv=false}}\n|{{Qualityprice|Cheese|230|quality=silver|dsv=false}} ''Aged: 3 Days''\n|{{Qualityprice|Cheese|230|quality=gold|dsv=false}} ''Aged: 4 Days<br />Total: 7 Days''\n|{{Qualityprice|Cheese|230|quality=iridium|dsv=false}} ''Aged: 7 Days<br />Total: 14 Days''";
  assert.deepEqual(parseAgedCells(wt), {
    normal: { price: { fixed: 230 } },
    silver: { aged: 3, total: 3 },
    gold: { aged: 4, total: 7 },
    iridium: { aged: 7, total: 14 },
  });
});

test('parseCaskTable skips image cells and reads ingredient and ages per row', () => {
  const wt = `<section begin="caskagedvalues" />
{|class="wikitable"
!Image
|-
|[[File:Beer.png]]
|[[Beer]]
|{{Name|Wheat|1}}
|style="vertical-align:top;"|{{Qualityprice|Beer|200|quality=normal}}
|style="vertical-align:top;"|{{Qualityprice|Beer|200|quality=silver}}
''Aged: 7 Days''
|style="vertical-align:top;"|{{Qualityprice|Beer|200|quality=gold}}
''Aged: 7 Days''<br />''Total: 14 Days''
|style="vertical-align:top;"|{{Qualityprice|Beer|200|quality=iridium}}
''Aged: 14 Days''<br />''Total: 28 Days''
|-
|}<section end="caskagedvalues" />`;
  const rows = parseCaskTable(wt);
  assert.deepEqual(Object.keys(rows), ['Beer']);
  assert.deepEqual(parseIngredients(rows.Beer.ingredient), [{ item: 'Wheat', qty: 1 }]);
  assert.equal(rows.Beer.iridium.total, 28);
  assert.equal(rows.Beer.normal.price.fixed, 200);
});

test('parseItemAged reads the single row of an item page', () => {
  const wt = "intro\n==Aged Values==\ntext\n{|class=\"wikitable\"\n!Normal Quality\n|-\n|{{Qualityprice|Mead|300|quality=normal|dsv=false}}\n|{{Qualityprice|Mead|300|quality=silver|dsv=false}} ''Aged: 7 Days''\n|}\n\n==Gifting==\nx";
  const r = parseItemAged(wt);
  assert.equal(r.silver.aged, 7);
  assert.equal(r.normal.price.fixed, 300);
});

test('parseIngredients handles Name templates and "Any fruit"', () => {
  assert.deepEqual(parseIngredients('{{Name|Wood|20}}{{Name|Hardwood|1}}'), [{ item: 'Wood', qty: 20 }, { item: 'Hardwood', qty: 1 }]);
  assert.deepEqual(parseIngredients("{{Name|Milk|1|class=inline}} ''or''{{Name|Large Milk|1}}"), [{ item: 'Milk', qty: 1 }, { item: 'Large Milk', qty: 1 }]);
  assert.deepEqual(parseIngredients('Any [[Fruits|Fruit]] (1)'), [{ item: 'Any Fruit', qty: 1 }]);
});

test('parseCaskProductivity maps wine rows to Wine and reads days and increases', () => {
  const wt = '|-\n|{{Name|Starfruit|class=inline}} [[Wine]]\n|56 Days\n|2250g\n|40.2\n|3150g\n|56.3\n|-\n|{{Name|Goat Cheese|class=inline}}\n|14 Days\n|400g\n|28.6\n|560g\n|40.0\n|-';
  assert.deepEqual(parseCaskProductivity(wt), [
    { product: 'Wine', days: 56, increase: 2250, increase_artisan: 3150 },
    { product: 'Goat Cheese', days: 14, increase: 400, increase_artisan: 560 },
  ]);
});

test('linkNames, infobox, firstInt, plain, htmlText', () => {
  assert.deepEqual(linkNames('takes [[Beer]], [[Goat Cheese]], and [[Skills#Farming|Artisan]]'), ['Beer', 'Goat Cheese', 'Skills']);
  assert.equal(firstInt(infobox('{{Infobox\n|sellprice = {{Price|230}}\n}}').sellprice), 230);
  assert.equal(plain("''Aged: 4 Days<br />Total: 7 Days''"), 'Aged: 4 Days Total: 7 Days');
  assert.equal(htmlText('<td>Artisan</td>  <td>worth&nbsp;40% more</td>'), 'Artisan worth 40% more');
});

test('settle flags disagreement and single-page values; no value fails', () => {
  const problems = [];
  const verified = {};
  const fail = [];
  assert.equal(settle('x', 'f', [{ source: 'A', value: 7 }, { source: 'B', value: 8 }], problems, verified, fail), 7);
  assert.equal(problems.length, 2); // the disagreement, and only one page agreeing with the first value
  const p2 = [];
  settle('x', 'f', [{ source: 'A (table)', page: 'A', value: 7 }, { source: 'A (infobox)', page: 'A', value: 7 }], p2, {}, fail);
  assert.match(p2[0], /only one wiki page/);
  const p3 = [];
  settle('x', 'f', [{ source: 'A', value: 7 }, { source: 'B', value: 7 }], p3, {}, fail);
  assert.deepEqual(p3, []);
  assert.equal(settle('x', 'f', [{ source: 'A', value: undefined }], [], {}, fail), null);
  assert.equal(fail.length, 1);
});

/* ---------- file shape ---------- */

test('file header, sources and status of every record', () => {
  assert.equal(casks.schema, 'stardew-tools/casks@1');
  assert.equal(casks.game_version, '1.6.15');
  assert.match(casks.last_verified, /^\d{4}-\d{2}-\d{2}$/);
  const facts = [...casks.rules, ...casks.cellar.casks, ...casks.professions, casks.obtain.upgrade_days, casks.obtain.cellar_upgrade];
  const recs = [casks, casks.quality_multipliers, casks.aged_items, casks.obtain, ...casks.aging.items, ...facts];
  for (const r of recs) {
    assert.ok(r.sources.length, r.id);
    for (const s of r.sources) {
      assert.ok(s.url.startsWith('https://stardewvalleywiki.com/'));
      assert.ok(Number.isInteger(s.revid));
    }
  }
  for (const r of recs.slice(1)) {
    assert.equal(r.verification_status, r.problems.length ? 'needs-verification' : 'cross-checked', r.id);
    assert.ok(Array.isArray(r.problems));
    if (r.evidence) assert.ok(r.evidence.length && r.evidence.every((e) => e.length > 10), r.id);
  }
  // Every value that rests on one page only must say so.
  for (const r of facts) if (r.verified.length < 2) assert.equal(r.verification_status, 'needs-verification', r.id);
});

test('aging totals are the running sum of the stage lengths', () => {
  assert.equal(casks.aging.items.length, 6);
  for (const i of casks.aging.items) {
    assert.equal(i.total_days.silver, i.aged_days.silver, i.id);
    assert.equal(i.total_days.gold, i.aged_days.silver + i.aged_days.gold, i.id);
    assert.equal(i.total_days.iridium, i.total_days.gold + i.aged_days.iridium, i.id);
    assert.equal(i.verification_status, 'cross-checked', i.id);
  }
});

/* ---------- spot checks against other wiki pages ---------- */

test('aging days and prices match each item page', () => {
  assert.equal(checks.items.length, 6);
  for (const c of checks.items) {
    const r = item(c.id);
    assert.deepEqual(r.aged_days, c.aged_days, `${c.id} (${c.source.title} rev ${c.source.revid})`);
    assert.deepEqual(r.total_days, c.total_days, c.id);
    if (c.base_price !== undefined) assert.equal(r.base_price, c.base_price, c.id);
    if (c.base_price_fruit_multiple !== undefined) assert.equal(r.price_formula.fruit_multiple, c.base_price_fruit_multiple, c.id);
    assert.ok(c.evidence.length > 20);
  }
});

test(`quality multipliers match ${checks.quality_multipliers.source.title}`, () => {
  for (const q of ['silver', 'gold', 'iridium']) assert.equal(casks.quality_multipliers[q], checks.quality_multipliers[q], q);
  assert.equal(casks.quality_multipliers.verification_status, 'cross-checked');
});

test('Wine ages 2 seasons of 28 days', () => {
  const w = casks.rules.find((r) => r.id === 'wine-seasons');
  assert.equal(w.value, checks.wine_seasons.seasons);
  assert.equal(w.value * checks.wine_seasons.days_per_season, item('wine').total_days.iridium);
});

test('cellar counts, upgrade cost, recipe and aged item list', () => {
  const c = (id) => casks.cellar.casks.find((x) => x.id === id).value;
  assert.equal(c('starting-casks'), checks.cellar.starting_casks);
  assert.equal(c('max-casks'), checks.cellar.max_casks);
  // The full-cellar material totals are consistent with the 189 - 33 casks the player has to craft.
  const craft = checks.cellar.max_casks - checks.cellar.starting_casks;
  assert.equal(c('full-cellar-hardwood'), craft * checks.recipe.ingredients.find((i) => i.item === 'Hardwood').qty);
  assert.equal(c('full-cellar-wood'), craft * checks.recipe.ingredients.find((i) => i.item === 'Wood').qty);
  assert.equal(casks.obtain.cellar_upgrade.value, checks.cellar_cost.gold);
  assert.deepEqual(casks.obtain.recipe_ingredients, checks.recipe.ingredients);
  assert.equal(casks.obtain.recipe_source, checks.recipe.recipe_source);
  assert.deepEqual(casks.aged_items.items.map((i) => i.id), checks.aged_items.ids);
});

test('Artisan adds 40%; Wine with no fruit sells for 400 (560 with Artisan)', () => {
  const p = (id) => casks.professions.find((x) => x.id === id);
  assert.equal(p('artisan-bonus-percent').value, checks.artisan.percent);
  assert.equal(p('artisan-bonus-percent').verification_status, 'cross-checked');
  const w = p('wine-without-fruit-price');
  assert.equal(w.value, checks.artisan.wine_without_fruit);
  assert.equal(w.with_artisan, checks.artisan.wine_without_fruit_with_artisan);
  assert.equal(Math.round(w.value * (1 + p('artisan-bonus-percent').value / 100)), w.with_artisan);
});

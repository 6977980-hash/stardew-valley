// Coop and Barn data (tools/data/import-buildings.mjs) and the building costs and paybacks the
// animal pages, Animal Prices page and animal guides print from it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { text, rows, links, gold, materials, infoboxColumns, totals, carpenterBuildings, materialPrice } from '../../tools/data/import-buildings.mjs';
import { validate } from '../../tools/data/validate.mjs';
import { data, json } from './helpers.js';

const buildings = json('data/buildings.json');
const entities = json('data/entities.json');
const answers = json('data/answers.json');
const byId = Object.fromEntries(buildings.buildings.map((b) => [b.id, b]));

/* ---------------------------------------------------------------- parse helpers */

test('html helpers: cells, hidden sort keys, links, gold and materials', () => {
  const cell = '<span style="display: none;">data-sort-value="4000"&gt;</span><span class="no-wrap"><img alt="Gold.png" />4,000g</span>';
  assert.equal(text(cell), '4,000g');
  assert.equal(gold(cell), 4000);
  assert.deepEqual(materials('<a title="Wood">Wood</a>&#160;(300)</span><a title="Stone">Stone</a>&#160;(100)'), { wood: 300, stone: 100 });
  assert.deepEqual(links('<a href="/Chicken" title="Chicken">Chicken</a> <a href="/File:X.png" title="File:X.png">x</a>'), ['Chicken']);
  assert.deepEqual(rows('<tr><td>a</td><th>b</th></tr><tr><td>c</td></tr>'), [['a', 'b'], ['c']]);
});

test('infobox columns and the Carpenter\'s Shop table are read per level', () => {
  const box = infoboxColumns('<tr><td id="infoboxsection">Capacity\n</td><td>4\n</td><td>8\n</td><td>12\n</td></tr>');
  assert.deepEqual(box.Capacity.map(text), ['4', '8', '12']);
  const shop = carpenterBuildings('<tr><td></td><td><a title="Big Coop">Big Coop</a></td><td>Houses 8 coop-dwelling animals. Unlocks ducks.</td><td><a title="Duck">Ducks</a></td><td>10,000g Wood&#160;(400) Stone&#160;(150)</td><td>6x3</td><td>2 days</td></tr>');
  assert.deepEqual(shop['Big Coop'], { gold: 10000, materials: { wood: 400, stone: 150 }, capacity: 8, unlocks: ['Duck'], wording: 'Houses 8 coop-dwelling animals. Unlocks ducks.' });
  assert.deepEqual(materialPrice('<tr><td></td><td>Wood</td><td>A sturdy material.</td><td>Year 1: 10g Year 2+: 50g</td></tr>', 'Wood'), { year1: 10, year2: 50 });
});

test('the stated Deluxe total is parsed with its year 1 and year 2+ prices', () => {
  const t = totals('<p>The total cost of a Deluxe Coop, built from scratch, is 34,000g , Wood (1200) and Stone (450) (Or, if all wood and stone are bought from Robin during Year 1, 55,000g , and 139,000g if bought in Year 2+.)</p>');
  assert.deepEqual({ ...t, wording: undefined }, { building: 'Deluxe Coop', gold: 34000, wood: 1200, stone: 450, gold_year1: 55000, gold_year2: 139000, wording: undefined });
});

/* ---------------------------------------------------------------- data */

test('buildings.json is valid and agrees with animals.json', () => {
  assert.deepEqual(validate({ ...data, buildings }), []);
});

test('Coop and Barn prices match the wiki totals', () => {
  assert.deepEqual([byId.coop.gold, byId['big-coop'].gold, byId['deluxe-coop'].gold], [4000, 10000, 20000]);
  assert.deepEqual([byId.barn.gold, byId['big-barn'].gold, byId['deluxe-barn'].gold], [6000, 12000, 25000]);
  // Coop page: 34,000g, 1,200 Wood, 450 Stone; 55,000g buying the materials in year 1.
  assert.deepEqual(byId['deluxe-coop'].total, { gold: 34000, wood: 1200, stone: 450, gold_year1: 55000, gold_year2: 139000 });
  assert.deepEqual(byId['deluxe-barn'].total, { gold: 43000, wood: 1350, stone: 650, gold_year1: 69500, gold_year2: 175500 });
});

test('a broken building chain fails validation', () => {
  const broken = structuredClone(buildings);
  broken.buildings.find((b) => b.id === 'big-barn').total.gold = 1;
  assert.ok(validate({ ...data, buildings: broken }).some((e) => e.includes('big-barn')));
});

test('animal pages: building and payback with the building', () => {
  const pig = entities.animals.pig;
  assert.equal(pig.building_needed.name, 'Deluxe Barn');
  assert.equal(pig.building_needed.total.gold, 43000);
  assert.deepEqual(pig.building_needed.path.map((l) => l.gold), [6000, 12000, 25000]);
  assert.equal(pig.shop, "Marnie's Ranch");
  for (const a of Object.values(entities.animals)) {
    assert.ok(a.building_needed, a.id);
    if (!a.price) {
      assert.equal(a.payback_days_with_building, null, a.id);
      continue;
    }
    const raw = a.price / a.payback_days_raw;
    assert.ok(Math.abs(a.payback_days_with_building - (a.price + a.building_needed.total.gold) / raw) < 0.05, a.id);
    assert.ok(a.payback_days_raw < a.payback_days_full_building && a.payback_days_full_building < a.payback_days_with_building, a.id);
  }
});

test('guides use the same building numbers as the animal pages', () => {
  const g = answers.guides;
  assert.equal(g.pigs.building_total, entities.animals.pig.building_needed.total.gold);
  assert.equal(g.pigs.payback_with_building, entities.animals.pig.payback_days_with_building);
  const cow = g.buildings[1].animals.find((a) => a.id === 'cow');
  assert.equal(cow.payback_building_share, entities.animals.cow.payback_days_full_building);
  assert.equal(g.buildings[0].levels.length, 3);
});

test('crop pages: uses come from the bundle, crafting and gift data', () => {
  const sgb = entities.crops['sweet-gem-berry'];
  assert.match(sgb.special_use.text, /Old Master Cannoli/);
  assert.match(sgb.special_use.text, /Stardrop/);
  assert.ok(sgb.special_use.sources.length >= 2);
  assert.deepEqual(sgb.uses.remixed_bundles.map((b) => b.name), ['Rare Crops Bundle']);
  assert.equal(sgb.uses.gifts.neutral, sgb.uses.gifts.of);
  assert.equal(sgb.products.length, 0);
  const parsnip = entities.crops.parsnip;
  assert.deepEqual(parsnip.uses.bundles.map((b) => b.name), ['Spring Crops Bundle', 'Quality Crops Bundle']);
  assert.ok(parsnip.uses.gifts.love.includes('Pam'));
  assert.deepEqual(entities.crops.garlic.uses.crafting.map((r) => r.name), ['Oil of Garlic']);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { json } from './helpers.js';
import {
  nameTemplate,
  parseIngredients,
  parseNameCell,
  noteYield,
  parseCraftingPage,
  producesCount,
  minutes,
  parseFurnace,
  ingredientAlternatives,
  parseRecycling,
  parseShop,
  shopLine,
  infobox,
} from '../../tools/data/import-crafting.mjs';

const data = json('data/crafting.json');
const checks = json('tests/fixtures/crafting-checks.json');
const recipe = (id) => {
  const r = data.recipes.find((x) => x.id === id);
  if (!r) throw new Error(`no recipe ${id}`);
  return r;
};

/* ---------- parse helpers ---------- */

test('nameTemplate reads item, quantity and skips named params', () => {
  assert.deepEqual(nameTemplate('{{Name|Copper Bar|1}}'), { name: 'Copper Bar', qty: 1, link: null, extra: null });
  assert.deepEqual(nameTemplate('{{Name|Ancient Seed|size=36px|1}}'), { name: 'Ancient Seed', qty: 1, link: null, extra: null });
  assert.deepEqual(nameTemplate('{{Name|Farming Skill Icon|link=Farming|Level 8}}'), { name: 'Farming Skill Icon', qty: null, link: 'Farming', extra: 'Level 8' });
});

test('parseIngredients handles group ingredients and the Trapper alternative', () => {
  assert.deepEqual(parseIngredients('{{Name|Sap|4}}[[File:Fish.png|24px|link=]] Any [[Fish]] (1)').ingredients, [
    { name: 'Sap', qty: 4 },
    { name: 'Any Fish', qty: 1, any: 'any-fish' },
  ]);
  assert.deepEqual(parseIngredients('Wild Seeds (Any) (2){{Name|Fiber|5}}{{Name|Wood|5}}').ingredients[0], { name: 'Wild Seeds (Any)', qty: 2, any: 'wild-seeds-any' });
  const crab = parseIngredients('{{Name|Wood|40}}{{Name|Iron Bar|3}}\n<span class="no-wrap">With [[Fishing#Fishing Skill|Trapper]] profession:</span> {{Name|Wood|25}}{{Name|Copper Bar|2}}');
  assert.deepEqual(crab.ingredients, [{ name: 'Wood', qty: 40 }, { name: 'Iron Bar', qty: 3 }]);
  assert.equal(crab.alt.condition, 'Trapper profession');
  assert.deepEqual(crab.alt.ingredients, [{ name: 'Wood', qty: 25 }, { name: 'Copper Bar', qty: 2 }]);
});

test('parseNameCell reads yields, labels and the Wild Seeds / Transmute rows', () => {
  assert.equal(parseNameCell('[[Iron Fence]] (10)').yield, 10);
  assert.deepEqual(parseNameCell('[[Bait (item)|Bait]] (5)'), { name: 'Bait', page: 'Bait (item)', recipe_name: 'Bait', yield: 5, output_page: 'Bait (item)' });
  const wild = parseNameCell('Wild Seeds (Sp)<br />([[Spring Seeds]])');
  assert.equal(wild.name, 'Spring Seeds');
  assert.equal(wild.recipe_name, 'Wild Seeds (Sp)');
  const fe = parseNameCell('Transmute (Fe)', '[[File:Iron Bar.png|center]]');
  assert.equal(fe.page, 'Iron Bar');
  assert.equal(parseNameCell('[[Iron Bar|Transmute (Fe)]]').recipe_name, 'Transmute (Fe)');
  assert.equal(noteYield("''(Note: The crafted item is called \"Spring Seeds.\" The recipe produces 10 seeds per craft.)''"), 10);
});

test('parseCraftingPage reads category, ingredients and source from a section', () => {
  const rows = parseCraftingPage(`==Sprinklers==
{|class="wikitable roundedborder"
!Image
!Name
!Description
!Ingredients
!Recipe Source
|-
|[[File:Sprinkler.png|center]]
||[[Sprinkler]]
|{{Description|Sprinkler}}
|{{Name|Copper Bar|1}}{{Name|Iron Bar|1}}
|class="no-wrap"|[[File:Farming Skill Icon.png|24px|link=]] [[Farming]] Level 2
|}
==Achievements==`);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].category, 'Sprinklers');
  assert.equal(rows[0].name, 'Sprinkler');
  assert.deepEqual(rows[0].ingredients, [{ name: 'Copper Bar', qty: 1 }, { name: 'Iron Bar', qty: 1 }]);
  assert.equal(rows[0].obtained, 'Farming Level 2');
});

test('infobox, producesCount and minutes', () => {
  const box = infobox("<onlyinclude>{{{{{1|Infobox cooking}}}\n|ingredients = {{Name|Garlic|10}}{{Name|Oil|1}}\n|recipe = x\n}}</onlyinclude>");
  assert.equal(box.ingredients, '{{Name|Garlic|10}}{{Name|Oil|1}}');
  assert.equal(producesCount('10 Iron Fences per craft', 'Iron Fence'), 10);
  assert.equal(producesCount('One Mini-Obelisk per craft', 'Mini-Obelisk'), 1);
  assert.equal(producesCount('{{Name|Tea Sapling|1}}', 'Tea Sapling'), 1);
  assert.equal(producesCount('{{Name|Deluxe Bait|4-5 daily}}', 'Deluxe Worm Bin'), null);
  assert.equal(minutes('{{duration|90m (1h 30m)}}'), 90);
  assert.equal(minutes('1.5h'), 90);
  assert.equal(minutes('9h 20m'), 560);
  assert.equal(minutes('30m'), 30);
});

test('parseFurnace, ingredientAlternatives and parseRecycling', () => {
  const f = parseFurnace(`==Smelting==
{|class="wikitable sortable"
!Input
!Output
!Time to smelt<ref name="processtime"/>
!Sells For
|-
|{{Name|Fire Quartz|1}}
|{{Name|Refined Quartz|3}}
|{{duration|90m (1h 30m)}}
|{{Price|50}} (x3)
|}`);
  assert.deepEqual(f, [{ inputs: [{ name: 'Fire Quartz', qty: 1 }], output: { name: 'Refined Quartz', qty: 3 }, minutes: 90 }]);
  assert.equal(ingredientAlternatives('{{Name|Quartz|1}}{{Name|Coal|1}}or{{Name|Fire Quartz|1}}{{Name|Coal|1}}').length, 2);
  const r = parseRecycling(`==Recycling==
{| class="wikitable sortable roundedborder"
!Image
!Name
!Description
!Produced from Recycling
|-
|rowspan="2" |[[File:Driftwood.png|center]]
|rowspan="2" |[[Driftwood]]
|rowspan="2" |{{Description|Driftwood}}
|{{Name|Wood|1-3|class=inline}} &nbsp;'''75%'''
|-
|{{Name|Coal|1-3|class=inline}} &nbsp;'''25%'''
|-
|[[File:Broken CD.png|center]]
|[[Broken CD]]
|{{Description|Broken CD}}
|{{Name|Refined Quartz|1}}
|}`);
  assert.deepEqual(r, [{ input: 'Broken CD', output: { name: 'Refined Quartz', qty: 1 } }]);
});

test('parseShop reads Year 1 / Year 2+ prices in one cell or two columns; shopLine finds the item-page line', () => {
  const robin = parseShop(`{|class="wikitable"
!class="unsortable"|Image
!Name
!Description
!Price
|-
|[[File:Wood.png|32px|center]]
|[[Wood]]
|{{Description|Wood}}
|data-sort-value="000010" class="no-wrap"|Year 1: {{Price|10}}<br />Year 2+: {{Price|50}}
|}`);
  assert.deepEqual(robin, [{ name: 'Wood', page: 'Wood', price: 10, price_year2: 50 }]);
  const clint = parseShop(`{|class="wikitable"
!class="unsortable"|Item
!Name
!Description
!Year 1<br />Price
!Year 2+<br />Price
|-
|[[File:Coal.png|center]]
|[[Coal]]
|{{Description|Coal}}
|data-sort-value="150"|{{Price|150}}
|data-sort-value="250"|{{Price|250}}
|}`);
  assert.deepEqual(clint, [{ name: 'Coal', page: 'Coal', price: 150, price_year2: 250 }]);
  assert.match(shopLine('* Can be bought at the [[Blacksmith]] for {{Price|75}} each in Year 1', ['Blacksmith', 'Clint'], 75), /Blacksmith for 75g/);
  assert.equal(shopLine('{{History|1.3|[[Blacksmith]] {{Price|75}}}}', ['Blacksmith'], 75), null);
});

/* ---------- data file ---------- */

test('file header and sources', () => {
  assert.equal(data.schema, 'stardew-tools/crafting@1');
  assert.equal(data.game_version, '1.6.15');
  assert.match(data.last_verified, /^\d{4}-\d{2}-\d{2}$/);
  for (const s of data.sources) {
    assert.match(s.url, /^https:\/\/stardewvalleywiki\.com\//);
    assert.ok(Number.isInteger(s.revid));
  }
  assert.ok(data.recipes.length >= 140);
  for (const r of [...data.recipes, ...data.conversions, ...data.shop_prices]) {
    assert.ok(r.sources.length >= 2, r.id);
    assert.ok(['cross-checked', 'needs-verification'].includes(r.verification_status), r.id);
  }
});

test('every made ingredient points at a recipe or conversion that exists', () => {
  const ids = new Set([...data.recipes.map((r) => r.id), ...data.conversions.map((c) => c.id)]);
  for (const r of data.recipes) {
    for (const i of r.ingredients) {
      assert.equal(typeof i.raw, 'boolean', `${r.id}/${i.id}`);
      if (!i.raw) assert.ok(ids.has(i.via), `${r.id}/${i.id} via ${i.via}`);
    }
  }
  assert.equal(recipe('keg').ingredients.find((i) => i.id === 'copper-bar').via, 'smelt-copper-ore');
  assert.equal(recipe('quality-sprinkler').ingredients.find((i) => i.id === 'refined-quartz').via, 'smelt-quartz');
  assert.equal(recipe('keg').ingredients.find((i) => i.id === 'wood').raw, true);
});

test(`recipes match the fixture (${checks.recipes.length} recipes from other wiki pages)`, () => {
  assert.ok(checks.recipes.length + checks.conversions.length >= 8);
  for (const c of checks.recipes) {
    const r = recipe(c.id);
    assert.deepEqual(Object.fromEntries(r.ingredients.map((i) => [i.id, i.qty])), c.ingredients, `${c.id} ingredients vs ${c.source.title}`);
    if (c.yield != null) assert.equal(r.yield, c.yield, `${c.id} yield vs ${c.source.title}`);
    assert.ok(!r.sources.some((s) => s.title === c.source.title), `${c.id}: fixture source must differ from importer sources`);
  }
});

test('smelting matches the fixture (ore pages)', () => {
  for (const c of checks.conversions) {
    const conv = data.conversions.find((x) => x.id === c.id);
    assert.ok(conv, c.id);
    assert.deepEqual(Object.fromEntries(conv.inputs.map((i) => [i.id, i.qty])), c.inputs, c.id);
    assert.equal(conv.minutes, c.minutes, c.id);
    assert.ok(!conv.sources.some((s) => s.title === c.source.title), `${c.id}: fixture source must differ`);
  }
});

test('spot values: yields, shop prices', () => {
  assert.equal(recipe('iron-fence').yield, 10);
  assert.equal(recipe('spring-seeds').yield, 10);
  assert.equal(recipe('fiber-seeds').yield, 4);
  const clint = data.shop_prices.find((s) => s.id === 'copper-ore' && s.shop === 'blacksmith');
  assert.equal(clint.price, 75);
  assert.equal(clint.price_year2, 150);
  const fq = data.conversions.find((c) => c.id === 'smelt-fire-quartz');
  assert.equal(fq.yield, 3);
});

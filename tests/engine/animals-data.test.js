import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  agree,
  frequencyDays,
  durationMinutes,
  parseAnimalPage,
  parseAnimalsPage,
  parseMarnie,
  parseBuildingPage,
  renderedSellPrices,
  parseProfitability,
  parseMachineTable,
  qualityScore,
  qualityChances,
  deluxeScore,
  moodModifier,
} from '../../tools/data/import-animals.mjs';
import { json } from './helpers.js';

const animals = json('data/animals.json');
const formulas = json('tests/fixtures/animal-formulas.json');

/* ---------------------------------------------------------------- parse helpers */

test('agree: two matching sources win, the odd one out is reported, one source is not enough', () => {
  const r = agree([
    { source: 'a', value: 800 },
    { source: 'b', value: 800 },
    { source: 'c', value: 900 },
  ]);
  assert.equal(r.ok, true);
  assert.equal(r.value, 800);
  assert.deepEqual(r.agreeing, ['a', 'b']);
  assert.deepEqual(r.disagreeing, [{ source: 'c', value: 900 }]);
  assert.equal(agree([{ source: 'a', value: 1 }, { source: 'b', value: undefined }]).ok, false);
  assert.equal(agree([{ source: 'a', value: 1 }, { source: 'b', value: 2 }]).ok, false);
  // "Not sold" (null) is a value two pages can agree on; "says nothing" (undefined) is not.
  assert.equal(agree([{ source: 'a', value: null }, { source: 'b', value: null }]).value, null);
  assert.deepEqual(agree([{ source: 'a', value: { building: 'coop', level: 2 } }, { source: 'b', value: { building: 'coop', level: 2 } }]).value, { building: 'coop', level: 2 });
});

test('frequencyDays reads the wiki wordings for production intervals', () => {
  assert.equal(frequencyDays('A mature and fed chicken produces a white or brown [[Egg]] every day, which'), 1);
  assert.equal(frequencyDays('Adult chickens will produce eggs every morning if fed.'), 1);
  assert.equal(frequencyDays('Adult [[Cow|Cows]] will produce [[Milk]] daily.'), 1);
  assert.equal(frequencyDays('Adult ducks will lay an egg or drop a [[Duck Feather]] every other day.'), 2);
  assert.equal(frequencyDays('produces a [[Duck Egg]] every 2 days'), 2);
  assert.equal(frequencyDays('A sheep will normally grow in its coat every 3rd day if it has been fed'), 3);
  assert.equal(frequencyDays('A Goat produces one Goat Milk per two days if fed on the prior days.'), 2);
  assert.equal(frequencyDays('lays a Dinosaur Egg every 7 days and makes no sound'), 7);
  assert.equal(frequencyDays('Pigs will find [[Truffle]]s after being let outdoors.'), null);
});

test('durationMinutes converts the wiki processing-time formats to game minutes', () => {
  assert.equal(durationMinutes('{{duration|3 Hours}}'), 180);
  assert.equal(durationMinutes('3h'), 180);
  assert.equal(durationMinutes('{{Duration|200m (&#8776;3h)}}'), 200);
  assert.equal(durationMinutes('200min (3.3h)'), 200);
  assert.equal(durationMinutes('{{Duration|360m (6 Hours)}}'), 360);
  assert.equal(durationMinutes(''), null);
});

test('parseAnimalPage: infobox, maturity, interval, deluxe product and table prices', () => {
  const wt = [
    '{{Infobox animal',
    '|image    = Duck.png',
    '|buyprice = 1200',
    '|building = {{Name|Big Coop}}',
    '|produce  = {{Name|Duck Egg}}{{Name|Duck Feather}}',
    '}}',
    '==Produce==',
    'Ducks who eat every day mature after 5 nights have passed. A mature and fed duck produces a [[Duck Egg]] every 2 days, which can be sold for {{Price|95}}. Once sufficient [[Animals#Friendship|friendship]] and happiness is reached, a duck may produce a [[Duck Feather]] instead of a Duck Egg, which sells for {{Price|250}}.',
    '|{{Qualityprice|Duck Egg|95|dsv=false}}',
    '|{{Qualityprice|Duck Feather|250|dsv=false}}',
    '==Selling==',
  ].join('\n');
  const a = parseAnimalPage(wt);
  assert.equal(a.buyprice, 1200);
  assert.equal(a.building, 'Big Coop');
  assert.deepEqual(a.produce, ['Duck Egg', 'Duck Feather']);
  assert.equal(a.days_to_mature, 5);
  assert.equal(a.frequency, 2, '"eat every day" before "A mature" must not be read as the interval');
  assert.deepEqual(a.deluxe, ['Duck Feather']);
  assert.deepEqual(a.table_prices, { 'Duck Egg': 95, 'Duck Feather': 250 });
  const dino = parseAnimalPage('{{Infobox animal\n|building = {{Name|Big Coop}}\n}}\n==Produce==\nDinosaurs are born mature. A mature and fed dinosaur produces a [[Dinosaur Egg]] every 7 days.\n');
  assert.equal(dino.days_to_mature, 0);
  assert.equal(dino.buyprice, null);
});

test('parseAnimalsPage, parseMarnie and parseBuildingPage read their tables', () => {
  const animalsWt = [
    '==Coop Animals==',
    '===Ducks===',
    'Adult ducks will lay an egg or drop a [[Duck Feather]] every other day.',
    '{|class="wikitable roundedborder"',
    '!Image', '!Name', '!Cost', '!Requirements', '!Produces', '!5 Heart Selling Price',
    '|-',
    '|[[File:Duck.png]]', '|[[Duck]]', '|{{Price|1200}}', '|Big Coop',
    '| [[File:Duck Egg.png|36px]][[Duck Egg]] - {{Price|95}}<br />[[File:Duck Feather.png|36px]] [[Duck Feather]] - {{Price|250}} ',
    '|{{Price|1560}}',
    '|}',
    '==Barn Animals==',
  ].join('\n');
  const a = parseAnimalsPage(animalsWt).Duck;
  assert.equal(a.cost, 1200);
  assert.equal(a.requirement, 'Big Coop');
  assert.equal(a.frequency, 2);
  assert.deepEqual(a.products, [{ name: 'Duck Egg', price: 95 }, { name: 'Duck Feather', price: 250 }]);

  const marnieWt = [
    '==Shop Inventory==', '{|class="wikitable sortable roundedborder"', '!Image', '!Name', '!Description', '!Price', '|-',
    '|[[File:Hay.png|48px|center]]', '|[[Hay]]', '|{{Description|Hay}}', '|data-sort-value="0050"|{{Price|50}}', '|}',
    '==Livestock==', '{|class="wikitable sortable roundedborder"', '! class="unsortable"|Image', '!Name', '!Description', '!Price', '!Building Required', '|-',
    '|[[File:Goat.png|center]]', '|[[Goat]]', '|{{Description|Goat}}', '|data-sort-value="04000"|{{Price|4000}}', '|[[Barn|Big Barn]]', '|}',
  ].join('\n');
  const m = parseMarnie(marnieWt);
  assert.equal(m.shop.Hay.price, 50);
  assert.deepEqual(m.livestock.Goat, { price: 4000, building: 'Big Barn', note: null });

  const coopWt = [
    "|style=\"text-align:center;\"|'''Coop'''", "|style=\"text-align:center;\"|'''Big Coop'''", "|style=\"text-align:center;\"|'''Deluxe Coop'''",
    '|id="infoboxsection" style="text-align:right;"|Animals',
    '|style="x"|{{Name|White Chicken|link=Chicken}}',
    '|style="x"|{{Name|White Chicken|link=Chicken}}{{Name|Duck}}',
    '|{{Name|White Chicken|link=Chicken}}{{Name|Duck}}{{Name|Rabbit}}',
  ].join('\n');
  const b = parseBuildingPage(coopWt);
  assert.deepEqual(b.levels, ['Coop', 'Big Coop', 'Deluxe Coop']);
  assert.deepEqual(b.minLevel, { Chicken: 1, Duck: 2, Rabbit: 3 });
});

test('renderedSellPrices reads the columns of the wiki-rendered infobox', () => {
  const cell = (v) => `<td>${v}g\n</td>`;
  const html = `<td>Sell Prices</td><td>Base</td><td><img/> <a>Rancher</a> <i>(+20%)</i></td>${[50, 62, 75, 100, 60, 74, 90, 120].map(cell).join('')}<td>Artisan Sell Prices</td>`;
  assert.deepEqual(renderedSellPrices(html), { Base: [50, 62, 75, 100], 'Rancher (+20%)': [60, 74, 90, 120] });
  // A single "Sell Price" heading with no column labels (Truffle) is the base column.
  assert.deepEqual(renderedSellPrices(`<td>Sell Price</td>${[625, 781, 937, 1250].map(cell).join('')}`), { Base: [625, 781, 937, 1250] });
  assert.equal(renderedSellPrices('<p>nothing</p>'), null);
});

test('parseProfitability and parseMachineTable read rows, counts and qualities', () => {
  const wt = [
    '==Profit==',
    '{|class="wikitable sortable"',
    '|-',
    '|{{Name|Golden Egg}}||data-sort-value="0"|Regular||data-sort-value="1"|[[File:Rancher.png|24px|link=]] Rancher||style="text-align: right;"|600||{{Name|Mayonnaise|3}}||data-sort-value="2"|[[File:Gold Quality.png|16px|link=]] Gold||style="text-align: right;"|1026||style="text-align: right;"|171%',
    '|-',
    '|{{Name|Dinosaur Egg|class=inline}} with {{Name|Treasure Appraisal Guide}} || data-sort-value="0"|Regular||&mdash;||1050||{{Name|Dinosaur Mayonnaise}}||Regular||800||76%',
    '|}',
  ].join('\n');
  assert.deepEqual(parseProfitability(wt), [
    { item: 'Golden Egg', quality: 'normal', profession: 'rancher', price: 600, output: 'Mayonnaise', count: 3, output_quality: 'gold', output_price: 1026 },
  ]);
  const table = [
    '{|class="wikitable roundedborder"', '!Image', '!Name', '!Description', '!Ingredient', '!Processing Time<noinclude><ref name="processtime"/></noinclude>', '!Sell Price', '|-',
    '|[[File:Cloth.png]]', '|[[Cloth]]', '|{{Description|Cloth}}', '|{{Name|Wool|1}}', '|{{duration|4 Hours}}', '|{{Price|470}}', '|}',
  ].join('\n');
  assert.deepEqual(parseMachineTable(table), [{ name: 'Cloth', inputs: ['Wool'], minutes: 240, price: 470 }]);
});

/* ---------------------------------------------------------------- wiki formulas */

test('quality formula reproduces the Farming page table (max friendship and mood)', () => {
  const { friendship, mood, rows } = formulas.quality_table;
  assert.equal(rows.length, 2);
  for (const row of rows) {
    const c = qualityChances(qualityScore(friendship, mood, row.profession ? animals.quality.profession_bonus : 0), animals.quality.iridium_min_score);
    for (const q of ['iridium', 'gold', 'silver']) assert.ok(Math.abs(c[q] - row[q]) < 1e-4, `${q}: ${c[q]} vs wiki ${row[q]}`);
    assert.ok(Math.abs(c.normal + c.silver + c.gold + c.iridium - 1) < 1e-12);
  }
});

test('quality and Large/Deluxe formulas reproduce the Animals page worked examples', () => {
  const q = formulas.quality_example;
  const s = qualityScore(q.friendship, q.mood);
  assert.ok(Math.abs(s - q.score) < 1e-3);
  const c = qualityChances(s);
  assert.equal(c.iridium, 0, 'score below 0.95 cannot roll iridium');
  assert.equal(Math.floor(c.gold * 100), q.gold_pct);
  assert.equal(Math.floor((c.silver / (1 - c.gold)) * 1000) / 10, q.silver_pct_if_not_gold);

  const l = formulas.deluxe_examples.large;
  assert.ok(Math.abs(deluxeScore(l.friendship, l.mood, animals.deluxe_rules.rules.large.divisor) - l.expected) < 1e-9);
  const r = formulas.deluxe_examples.rabbit;
  assert.ok(Math.abs(deluxeScore(r.friendship, r.mood, animals.deluxe_rules.rules['rabbits-foot'].divisor, r.daily_luck) - r.expected) < 1e-9);
  assert.equal(moodModifier(201), animals.deluxe_rules.mood_modifier.above_200);
  assert.equal(moodModifier(200), 0);
  assert.equal(moodModifier(60), -40);
});

/* ---------------------------------------------------------------- data/animals.json */

const isInt = (n, min = 0) => Number.isInteger(n) && n >= min;
const checkSources = (where, sources) => {
  assert.ok(Array.isArray(sources) && sources.length, `${where}: no sources`);
  for (const s of sources) {
    assert.match(s.url, /^https:\/\/stardewvalleywiki\.com\//, `${where}: bad url`);
    assert.ok(isInt(s.revid, 1), `${where}: ${s.title} has no revision id`);
  }
};

test('animals.json header and every record carry wiki sources', () => {
  assert.equal(animals.schema, 'stardew-tools/animals@1');
  assert.equal(animals.game_version, '1.6.15');
  for (const k of ['generated', 'last_verified']) assert.match(animals[k], /^\d{4}-\d{2}-\d{2}$/);
  assert.match(animals.source, /Stardew Valley Wiki/);
  for (const a of animals.animals) checkSources(`animal ${a.id}`, a.sources);
  for (const p of animals.products) checkSources(`product ${p.id}`, p.sources);
  for (const g of animals.artisan.goods) checkSources(`artisan ${g.id}`, g.sources);
  for (const m of animals.artisan.machines) checkSources(`machine ${m.id}`, m.sources);
  for (const k of ['feeding', 'quality', 'deluxe_rules']) checkSources(k, animals[k].sources);
});

test('all eleven coop and barn animals are present with valid buildings', () => {
  const ids = animals.animals.map((a) => a.id).sort();
  assert.deepEqual(ids, ['chicken', 'cow', 'dinosaur', 'duck', 'goat', 'golden-chicken', 'ostrich', 'pig', 'rabbit', 'sheep', 'void-chicken']);
  for (const a of animals.animals) {
    assert.ok(['coop', 'barn'].includes(a.building), a.id);
    assert.ok([1, 2, 3].includes(a.building_level), a.id);
    assert.match(a.building_name, a.building === 'coop' ? /Coop$/ : /Barn$/);
    assert.ok(isInt(a.days_to_mature), `${a.id}: days_to_mature`);
    assert.ok(['cross-checked', 'needs-verification'].includes(a.verification_status));
    assert.equal(a.verification_status === 'cross-checked', a.problems.length === 0, a.id);
  }
});

test('every price-critical value has at least two agreeing wiki sources', () => {
  for (const a of animals.animals) {
    const fields = ['purchase_price', 'building', ...(a.produce.frequency_days != null ? ['frequency_days'] : [])];
    for (const f of fields) assert.ok(a.verified[f]?.length >= 2, `${a.id}.${f}: ${a.verified[f]}`);
  }
  for (const p of animals.products) for (const f of ['base_price', 'rancher']) assert.ok(p.verified[f]?.length >= 2, `${p.id}.${f}`);
  for (const g of animals.artisan.goods) for (const f of ['base_price', 'minutes', 'artisan', 'rancher']) assert.ok(g.verified[f]?.length >= 2, `${g.id}.${f}`);
  assert.ok(animals.feeding.verified.hay_price.length >= 2);
  assert.ok(animals.feeding.verified.hay_per_animal_per_day.length >= 2);
});

test('purchase price is null exactly when the wiki gives an acquisition route instead', () => {
  for (const a of animals.animals) {
    if (a.purchase_price === null) {
      assert.equal(a.purchase_shop, null);
      assert.ok(a.acquisition?.wiki_wording, `${a.id}: no acquisition wording`);
    } else {
      assert.ok(isInt(a.purchase_price, 1));
      assert.equal(a.purchase_shop, 'marnie');
      assert.equal(a.acquisition, null);
    }
  }
});

test('pigs have no production interval; their outdoor conditions are explicit', () => {
  const pig = animals.animals.find((a) => a.id === 'pig');
  assert.equal(pig.produce.mode, 'outdoor-forage');
  assert.equal(pig.produce.frequency_days, null);
  assert.ok(pig.produce.conditions.some((c) => /not winter/.test(c)));
  assert.ok(pig.produce.conditions.some((c) => /not raining/.test(c)));
  for (const a of animals.animals.filter((x) => x.id !== 'pig')) assert.ok(isInt(a.produce.frequency_days, 1), a.id);
  assert.equal(animals.products.find((p) => p.id === 'truffle').rancher, false);
});

test('products, recipes and goods reference each other consistently', () => {
  const products = new Map(animals.products.map((p) => [p.id, p]));
  const goods = new Map(animals.artisan.goods.map((g) => [g.id, g]));
  for (const a of animals.animals) {
    assert.ok(products.has(a.products.regular), `${a.id}: regular product`);
    if (a.products.large) {
      assert.ok(products.has(a.products.large), `${a.id}: large product`);
      assert.ok(animals.deluxe_rules.rules[a.large_product.rule], `${a.id}: no rule ${a.large_product.rule}`);
      assert.ok(a.large_product.wiki_wording.length > 20);
    }
  }
  for (const p of animals.products) {
    assert.ok(isInt(p.base_price, 1), p.id);
    assert.equal(p.price_by_quality.normal, p.base_price, p.id);
    assert.equal(typeof p.rancher, 'boolean', p.id);
  }
  for (const m of animals.artisan.machines) {
    assert.ok(m.recipes.length, m.id);
    for (const r of m.recipes) {
      assert.ok(products.has(r.input), `${m.id}: input ${r.input}`);
      assert.ok(goods.has(r.output), `${m.id}: output ${r.output}`);
      assert.equal(goods.get(r.output).machine, m.id);
      assert.ok(isInt(r.count, 1));
      assert.ok(['normal', 'silver', 'gold', 'iridium', 'input'].includes(r.quality), `${m.id}: quality ${r.quality}`);
    }
  }
  for (const g of animals.artisan.goods) {
    assert.ok(isInt(g.base_price, 1) && isInt(g.minutes, 1), g.id);
    assert.equal(typeof g.artisan, 'boolean');
    if (g.price_by_quality) assert.equal(g.price_by_quality.normal, g.base_price);
  }
  // Gold-quality outputs must have a gold price recorded.
  for (const r of animals.artisan.machines.flatMap((m) => m.recipes).filter((x) => x.quality === 'gold')) {
    assert.ok(goods.get(r.output).price_by_quality?.gold > 0, r.output);
  }
});

test('profession multipliers come from the wiki and match its rounded infobox prices', () => {
  const { rancher, artisan } = animals.professions;
  assert.ok(rancher.sell_multiplier > 1 && artisan.sell_multiplier > 1);
  assert.equal(json('data/professions.json').professions.find((p) => p.id === 'artisan').effect.sell_multiplier, artisan.sell_multiplier);
  assert.ok(isInt(animals.feeding.hay.price, 1));
  assert.ok(isInt(animals.feeding.hay.per_animal_per_day, 1));
});

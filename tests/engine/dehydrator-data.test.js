import { test } from 'node:test';
import assert from 'node:assert/strict';
import { json } from './helpers.js';
import {
  parseNames,
  parseRecipeSource,
  craftRow,
  shopRecipePrice,
  prizeNumber,
  parseProductsTable,
  parseDuration,
  parseCraftTime,
  parsePriceRule,
  perItemRule,
  totalArtisanRule,
  artisanBonus,
  applyPrice,
  artisanRule,
  parseFruitRows,
  settle,
  status,
} from '../../tools/data/import-dehydrator.mjs';

const data = json('data/dehydrator.json');
const checks = json('tests/fixtures/dehydrator-checks.json');
const machine = (id) => data.machines.find((m) => m.id === id);
const deh = machine('dehydrator');
const smoker = machine('fish-smoker');
const product = (id) => [...deh.products, ...smoker.products].find((p) => p.id === id);
const qtyMap = (list) => Object.fromEntries(list.map((i) => [i.id, i.qty]));

/* ---------- parse helpers ---------- */

test('parseNames reads {{Name|Item|qty}} lists', () => {
  assert.deepEqual(parseNames('{{Name|Wood|30}}{{Name|Fire Quartz|1}}{{Name|Coal}}'), [
    { id: 'wood', name: 'Wood', qty: 30 },
    { id: 'fire-quartz', name: 'Fire Quartz', qty: 1 },
    { id: 'coal', name: 'Coal', qty: 1 },
  ]);
});

test('parseRecipeSource handles all three wiki phrasings', () => {
  assert.deepEqual(parseRecipeSource("[[Pierre's]] for {{Price|10000}}"), { shop: "Pierre's General Store", price: 10000 });
  assert.deepEqual(parseRecipeSource('{{Price|10000}} at the [[Fish Shop]]'), { shop: 'Fish Shop', price: 10000 });
  assert.deepEqual(parseRecipeSource('[[Fish Shop]] for {{Price|10000}}'), { shop: 'Fish Shop', price: 10000 });
  assert.equal(parseRecipeSource('[[Farming]] Level 8'), undefined);
});

test('craftRow, shopRecipePrice and prizeNumber', () => {
  const wt = '|[[Dehydrator]]\n|{{Description|Dehydrator}}\n|{{Name|Wood|30}}{{Name|Clay|2}}\n|[[Pierre\'s]] for {{Price|10000}}\n|}';
  assert.deepEqual(craftRow(wt, 'Dehydrator'), { ingredients: [{ id: 'wood', name: 'Wood', qty: 30 }, { id: 'clay', name: 'Clay', qty: 2 }], source: { shop: "Pierre's General Store", price: 10000 } });
  assert.equal(craftRow(wt, 'Keg'), undefined);
  assert.equal(shopRecipePrice('|[[Dehydrator]] (Recipe)\n|{{Description|Recipe}}\n|data-sort-value="10000"|{{Price|10000}}', 'Dehydrator'), 10000);
  assert.equal(prizeNumber('|-\n|rowspan="2"|12\n|{{Name|Fish Smoker|1}}\n|-\n|{{Name|Dehydrator|1}}\n|-\n|13\n|{{Name|Trove|4}}', 'Dehydrator'), 12);
  assert.equal(prizeNumber('|-\n|rowspan="2"|12\n|{{Name|Fish Smoker|1}}', 'Keg'), undefined);
});

test('parseProductsTable reads one-cell-per-line and inline rows', () => {
  const a = '<section begin="x"/>\n{|\n!Image\n|-\n||[[File:A.png|center]]\n|[[Raisins]]\n|{{Description|Raisins}}\n|5 [[Grape]]s\n|data-sort-value="01"|{{Duration|1 day|class=inline}} (ready the next morning)\n|{{Price|600}}\n|{{energy|125}}\n|}<section end="x"/>';
  const [r] = parseProductsTable(a, 'x');
  assert.equal(r.name, 'Raisins');
  assert.deepEqual(parseDuration(r.time), { minutes: undefined, days: 1, next_morning: true });
  assert.deepEqual(parsePriceRule(r.price), { fixed: 600 });
  const b = '<section begin="y"/>\n{|\n! Image\n|-\n| [[File:S.png]] || [[Smoked Fish]] || desc || Any [[Fish]] (1) {{Name|Coal|1}} || {{duration|50 mins}} || 2 × Fish Price || {{Energy|1.5 × Fish Energy}}\n|}<section end="y"/>';
  const [s] = parseProductsTable(b, 'y');
  assert.equal(s.name, 'Smoked Fish');
  assert.equal(parseDuration(s.time).minutes, 50);
  assert.deepEqual(parsePriceRule(s.price), { multiplier: 2, add: 0 });
  assert.deepEqual(parseProductsTable(b, 'missing'), []);
});

test('parseCraftTime and parsePriceRule', () => {
  assert.equal(parseCraftTime('1750m (&#8776;1d)'), 1750);
  assert.equal(parseCraftTime('50m'), 50);
  assert.equal(parseCraftTime(undefined), undefined);
  assert.deepEqual(parsePriceRule('7.5 &times; [[Fruits|Fruit]] Base Price + {{Price|25}} (1.5 &times; Base + {{Price|5}} per [[Fruits|Fruit]])'), { multiplier: 7.5, add: 25 });
  assert.deepEqual(parsePriceRule('(7.5 × mushroom Base Price) + 25'), { multiplier: 7.5, add: 25 });
  assert.deepEqual(parsePriceRule('7.5 × Fruit Base Price + 25'), { multiplier: 7.5, add: 25 });
  assert.deepEqual(parsePriceRule('600'), { fixed: 600 });
  assert.deepEqual(parsePriceRule('2 × [[Fish]] Sell Price (includes Quality & Artisan prices)'), { multiplier: 2, add: 0 });
  assert.equal(parsePriceRule('Cannot be sold'), undefined);
});

test('per-item and Artisan text rules scale to a batch of five', () => {
  assert.deepEqual(perItemRule('the sell price of Dried Fruit is (1.5 x Fruit Base Price + 5) per fruit used.', 5), { multiplier: 7.5, add: 25 });
  assert.deepEqual(perItemRule('((7.5 x mushroom Base Price) + 25) total, or ((1.5x mushroom Base Price) + 5) per mushroom used.', 5), { multiplier: 7.5, add: 25 });
  assert.deepEqual(perItemRule('With the Artisan Profession, the sell price is (2.1 x Fruit Base Price + 7) per fruit used.', 5), { multiplier: 10.5, add: 35 });
  assert.deepEqual(totalArtisanRule('the sell price changes to ((10.5 x mushroom Base Price) + 35) total, or ((2.1x mushroom Base Price) + 7) per mushroom used'), { multiplier: 10.5, add: 35 });
  assert.equal(perItemRule('nothing', 5), undefined);
  assert.equal(artisanBonus('worth 40% more', /worth (\d+)% more/), 1.4);
});

test('applyPrice and artisanRule truncate like the game', () => {
  assert.equal(applyPrice({ multiplier: 7.5, add: 25 }, 100), 775);
  assert.equal(applyPrice({ fixed: 600 }, 80), 600);
  assert.deepEqual(artisanRule({ multiplier: 7.5, add: 25 }, 1.4), { multiplier: 10.5, add: 35 });
  assert.deepEqual(artisanRule({ fixed: 600 }, 1.4), { fixed: 840 });
  assert.deepEqual(artisanRule({ multiplier: 2, add: 0 }, 1.4), { multiplier: 2.8, add: 0 });
});

test('parseFruitRows reads dried and Artisan prices from the rendered table', () => {
  const prices = [100, 125, 150, 200, 110, 137, 165, 220, 300, 375, 450, 600, 250, 775, 420, 525, 630, 840, 350, 1085];
  const html = `<td>x</a></div></div> </td> <td><a href="/Apple" title="Apple">Apple</a> </td><td>${prices.map((p) => p.toLocaleString('en-US') + 'g').join(' <td>')}`;
  assert.deepEqual(parseFruitRows(html), [{ name: 'Apple', base: 100, dried: 775, artisan_dried: 1085 }]);
});

test('settle needs two agreeing sources, otherwise records a problem', () => {
  const p1 = [];
  assert.equal(settle('x', [{ source: 'A', value: 5 }, { source: 'B', value: 5 }], p1, {}), 5);
  assert.deepEqual(p1, []);
  const p2 = [];
  const v = {};
  assert.equal(settle('x', [{ source: 'A', value: 5 }, { source: 'B', value: 6 }], p2, v), 5);
  assert.equal(p2.length, 2);
  const p3 = [];
  assert.equal(settle('x', [{ source: 'A', value: 5 }, { source: 'B', value: undefined }], p3, {}), 5);
  assert.match(p3[0], /only 1 source/);
  assert.equal(status(p3), 'needs-verification');
  assert.equal(status([]), 'cross-checked');
});

/* ---------- file shape ---------- */

test('file header, sources and verification status', () => {
  assert.equal(data.schema, 'stardew-tools/dehydrator@1');
  assert.equal(data.game_version, '1.6.15');
  assert.match(data.last_verified, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(data.source, /Stardew Valley Wiki/);
  const recs = [data.artisan, ...data.machines.flatMap((m) => [m.recipe, ...m.rules, ...m.products]), data.fruit_examples];
  for (const r of [data, ...data.machines, ...recs]) {
    assert.ok(r.sources.length, r.id);
    for (const s of r.sources) {
      assert.ok(s.url.startsWith('https://stardewvalleywiki.com/'), r.id);
      assert.ok(Number.isInteger(s.revid), r.id);
    }
  }
  for (const r of recs) {
    assert.ok(Array.isArray(r.problems), r.id);
    assert.equal(r.verification_status, r.problems.length ? 'needs-verification' : 'cross-checked', r.id);
  }
  for (const p of [...deh.products, ...smoker.products]) {
    assert.ok(p.evidence.length >= 3, p.id);
    for (const [field, srcs] of Object.entries(p.verified)) if (!p.problems.some((x) => x.startsWith(field + ':'))) assert.ok(srcs.length >= 2, `${p.id}.${field} verified by ${srcs.join(', ')}`);
  }
});

test('the Dehydrator timing disagreement is flagged, nothing else is', () => {
  for (const p of deh.products) {
    assert.equal(p.verification_status, 'needs-verification', p.id);
    assert.ok(p.problems.every((x) => x.startsWith('minutes:')), `${p.id}: ${p.problems.join('; ')}`);
  }
  assert.equal(smoker.products[0].verification_status, 'cross-checked');
  assert.equal(deh.recipe.verification_status, 'cross-checked');
  assert.equal(smoker.recipe.verification_status, 'cross-checked');
});

/* ---------- spot checks against wiki sentences ---------- */

test(`Dehydrator: input count, minutes, quality, exclusions (${checks.dehydrator.input_count.evidence})`, () => {
  const c = checks.dehydrator;
  assert.equal(deh.rules.find((r) => r.id === 'input-count').value, c.input_count.value);
  for (const p of deh.products) {
    assert.equal(p.input.count, c.input_count.value, p.id);
    assert.equal(p.minutes, c.minutes_all_products.value, p.id);
    assert.equal(p.ready_next_morning, c.ready_next_morning.value, p.id);
  }
  assert.equal(deh.rules.find((r) => r.id === 'output-quality-normal').value, c.output_quality.value);
  assert.deepEqual(deh.rules.filter((r) => r.id.startsWith('excluded-') || r.id === 'grapes-make-raisins').map((r) => r.value).sort(), [...c.excluded.value].sort());
  assert.deepEqual(product('dried-mushrooms').input.excludes, ['red-mushroom', 'truffle']);
  assert.deepEqual(product('dried-fruit').input.excludes, ['grape']);
});

test('Dehydrator and Fish Smoker recipes and unlocks', () => {
  const c = checks.dehydrator;
  assert.deepEqual(qtyMap(deh.recipe.ingredients), c.ingredients.value);
  assert.deepEqual(deh.recipe.unlock, { shop: c.unlock.shop, price: c.unlock.price });
  assert.equal(deh.recipe.other_sources.find((o) => o.kind === 'prize-machine').ticket_prize, c.prize_machine_ticket.value);
  assert.equal(deh.recipe.other_sources.find((o) => o.kind === 'farm-cave-mushroom-option').free, true);
  const f = checks.fish_smoker;
  assert.deepEqual(qtyMap(smoker.recipe.ingredients), f.ingredients.value);
  assert.deepEqual(smoker.recipe.unlock, { shop: f.unlock.shop, price: f.unlock.price });
  assert.equal(smoker.recipe.other_sources.find((o) => o.kind === 'prize-machine').ticket_prize, c.prize_machine_ticket.value);
  assert.equal(smoker.recipe.other_sources.find((o) => o.kind === 'riverland-farm-start').free, f.riverland_start.value);
});

test('price rules, Artisan prices and energy multipliers match the product pages', () => {
  assert.equal(data.artisan.multiplier, checks.artisan_multiplier.value);
  for (const [id, c] of Object.entries(checks.products)) {
    const p = product(id);
    assert.deepEqual(p.price, c.price, id);
    assert.deepEqual(p.artisan_price, c.artisan_price, id);
    assert.equal(p.artisan, true, id);
    if (c.energy_health_multiplier) assert.equal(p.energy_health_multiplier, c.energy_health_multiplier, id);
    if (c.input) assert.deepEqual({ item: p.input.item, count: p.input.count }, c.input, id);
    // the Artisan rule is the normal rule times the wiki's Artisan multiplier
    assert.deepEqual(p.artisan_price, artisanRule(p.price, data.artisan.multiplier), id);
  }
});

test(`wiki worked prices follow the formulas (${checks.fruit_prices.source.title} rev ${checks.fruit_prices.source.revid})`, () => {
  const dried = product('dried-fruit');
  const raisins = product('raisins');
  for (const r of checks.fruit_prices.rows) {
    const rule = r.fruit === 'Grape' ? raisins : dried;
    assert.equal(applyPrice(rule.price, r.base_price), r.price, `${r.fruit} normal`);
    // The game truncates the dried price, then applies +40% and truncates again.
    assert.equal(Math.trunc(Math.round(applyPrice(rule.price, r.base_price) * data.artisan.multiplier * 1000) / 1000), r.artisan_price, `${r.fruit} Artisan`);
    const row = data.fruit_examples.table.find((x) => x.fruit === r.fruit);
    assert.deepEqual({ base_price: row.base_price, price: row.price, artisan_price: row.artisan_price }, { base_price: r.base_price, price: r.price, artisan_price: r.artisan_price }, r.fruit);
  }
  assert.ok(data.fruit_examples.table.length >= 20);
  assert.equal(data.fruit_examples.verification_status, 'cross-checked');
  assert.deepEqual(data.fruit_examples.rounding_differences.map((x) => x.fruit).sort(), ['Cactus Fruit', 'Cranberries']);
});

test('Fish Smoker product: fish + Coal, 50 minutes, 2x price, 2.8x with Artisan, 1.5x energy', () => {
  const f = checks.fish_smoker;
  const p = product('smoked-fish');
  assert.equal(p.input.category, 'fish');
  assert.equal(p.input.count, f.input.fish);
  assert.deepEqual(p.input.extra, [{ id: 'coal', qty: f.input.coal }]);
  assert.equal(p.minutes, f.minutes.value);
  assert.deepEqual(p.price, { multiplier: f.price_multiplier.value, add: 0 });
  assert.deepEqual(p.artisan_price, { multiplier: f.artisan_multiplier.value, add: 0 });
  assert.equal(p.energy_health_multiplier, f.energy_health_multiplier.value);
  assert.equal(smoker.rules.find((r) => r.id === 'output-quality-retained').value, 'same-as-input');
  assert.deepEqual(p.examples.map((e) => e.multiplier), [2, 2.8]);
});

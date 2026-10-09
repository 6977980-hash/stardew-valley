import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseFishPond,
  parsePondProduce,
  parsePondQuests,
  nameTemplate,
  renderedPrices,
  itemSellPrice,
  voteSpawn,
  compareProduce,
  roePrice,
  withMultiplier,
  baseChance,
  itemKey,
} from '../../tools/data/import-fishponds.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const json = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
const ponds = json('data/fishponds.json');
const oracle = json('tests/fixtures/fishpond-prices.json').fish;
const fish = (name) => ponds.fish.find((f) => f.name === name);

/* ---------- parse helpers ---------- */

test('nameTemplate reads quantity, label and link (including {{!}})', () => {
  assert.deepEqual(nameTemplate('{{Name|Blue Roe|1|link=Roe}}'), { name: 'Blue Roe', link: 'Roe', quantity: { min: 1, max: 1 } });
  assert.deepEqual(nameTemplate('{{Name|Trash (item)|1|link=Trash (item){{!}}Trash}}'), { name: 'Trash (item)', link: 'Trash (item)', quantity: { min: 1, max: 1 } });
  assert.deepEqual(nameTemplate('{{Name|Seaweed|1-3}}'), { name: 'Seaweed', link: 'Seaweed', quantity: { min: 1, max: 3 } });
});

test('itemKey matches wiki spellings of the same item', () => {
  assert.equal(itemKey('Warp Totem: Beach'), itemKey('Warp Totem Beach'));
});

const SECTION = `
Anchovies can be placed in a [[Fish Pond]], where they will reproduce every 2 days. The initial pond capacity is 3 fish, but the capacity can be increased to 10 by completing three quests.

'''[[Fish Pond#Quests|Quests]]'''
{|class="wikitable"
|-
!Before Quest
!After Quest
|-
| 3   || 5   || 3 [[Driftwood]], 1 [[Frozen Geode]], or 1-2 [[Seaweed]] || 30
|-
| 5   || 10  || 2 [[Clam]]s or 2 [[Coral]] || 30
|}

'''[[Fish Pond#Produce|Produce]]'''
{|class="wikitable"
|-
!Item(s) Produced
|-
|rowspan="2"|{{Name|Blue Roe|1|link=Roe}}
|rowspan="2"|11
| 1-4  || 70%     || 16-33%
|-
| 5-10 || 100%    || 55-95%
|-
|rowspan="2"|''Nothing''
|rowspan="2"|
| 1-4  || 30%     || 84-67%
|-
| 5-10 || 0%      || 45-5%
|}
`;

test('parseFishPond reads capacities, quests and produce bands', () => {
  const f = parseFishPond(SECTION);
  assert.equal(f.spawn_days, 2);
  assert.equal(f.initial_capacity, 3);
  assert.equal(f.max_capacity, 10);
  assert.deepEqual(f.quests.map((q) => [q.population, q.capacity_after, q.xp]), [[3, 5, 30], [5, 10, 30]]);
  assert.deepEqual(f.quests[0].options[2], { item: 'Seaweed', min: 1, max: 2 });
  assert.equal(f.produce.length, 2);
  assert.deepEqual(f.produce[1], { name: 'Blue Roe', link: 'Roe', quantity: { min: 1, max: 1 }, fishing_xp: 11, population: { min: 5, max: 10 }, share: 1, daily: { from: 0.55, to: 0.95 } });
  assert.deepEqual(f.nothing.map((n) => n.share), [0.3, 0]);
});

test('parseFishPond recognises a fish that cannot reproduce', () => {
  const f = parseFishPond("Tiger Trout can be placed in a [[Fish Pond]], but unlike all other fish, they cannot reproduce. The initial pond capacity is 10 fish; no quests are necessary to increase the pond capacity.\n");
  assert.equal(f.reproduces, false);
  assert.equal(f.max_capacity, 10);
});

test('parsePondProduce and parsePondQuests read shared row groups', () => {
  const wt = `==Quests==
{|class="wikitable sortable"
|-
!Fish
|-
|rowspan="2"|[[Carp]]
|3
|2 [[Green Algae]]
|rowspan="2"| 1 day
|-
|5
|2 [[Cave Carrot]]
|}
==Produce==
{|class="wikitable sortable"
|-
!Fish
|-
|rowspan="2"| [[Clam]]<br />[[Crab]]
|data-sort-value="Roe"| 1 [[Roe]]
| 1
|data-sort-value="11"| 11-13%
|data-sort-value="3"| 3-10%
|-
|data-sort-value="Trash"| 1 [[Trash (item)|Trash]]
| 1
| 6%
|data-sort-value="1.9"| 1.9-6%
|}`;
  const q = parsePondQuests(wt).get('Carp');
  assert.equal(q.spawn_days, 1);
  assert.deepEqual(q.quests.map((x) => x.population), [3, 5]);
  const p = parsePondProduce(wt);
  assert.equal(p.get('Clam'), p.get('Crab'));
  assert.deepEqual(p.get('Crab')[1], { item: 'Trash', link: 'Trash (item)', quantity: { min: 1, max: 1 }, min_population: 1, share: { from: 0.06, to: 0.06 }, daily: { from: 0.019, to: 0.06 }, only_if_above_fails: false });
});

test('renderedPrices handles fish, crab pot fish and forage infoboxes', () => {
  const html = (tokens) => tokens.map((t) => `<td>${t}</td>`).join('');
  const crab = renderedPrices(html(['Sell Prices', 'Base', 'Fisher', '(+25%)', 'Angler', '(+50%)', '100g', '125g', '125g', '156g', '150g', '187g', 'Artisan Sell Prices', 'Roe', 'Aged Roe', 'Aged Roe', '(+40%)', '80g', '160g', '224g', 'The']));
  assert.deepEqual(crab.sell, { base: [100, 125], fisher: [125, 156], angler: [150, 187] });
  assert.deepEqual(crab.artisan, { Roe: 80, 'Aged Roe': 160, 'Aged Roe (+40%)': 224 });
  const coral = renderedPrices(html(['Sell Price', '80g', '100g', '120g', '160g', 'Coral']));
  assert.deepEqual(coral.sell, { base: [80, 100, 120, 160], fisher: null, angler: null });
});

test('itemSellPrice reads plain, variant and missing prices', () => {
  assert.equal(itemSellPrice('{{Infobox\n|sellprice = 300\n}}', 'Dolomite'), 300);
  assert.equal(itemSellPrice('{{Infobox\n|price     = 80\n}}', 'Coral'), 80);
  assert.equal(itemSellPrice('{{Infobox\n|sellprice = N/A\n}}', 'Golden Coconut'), null);
  const egg = '{{Infobox\n|sellprice   = <nowiki/>\n[[File:Green Slime Egg.png|24px|link=]] 1,000g\n<br />[[File:Tiger Slime Egg.png|24px|link=]] 8,000g\n}}';
  assert.equal(itemSellPrice(egg, 'Tiger Slime Egg'), 8000);
});

test('voteSpawn needs two of three sources', () => {
  assert.equal(voteSpawn(1, 2, 2).value, 2);
  assert.match(voteSpawn(1, 2, 2).note, /2 of 3/);
  assert.equal(voteSpawn(3, 3, 3).note, null);
  assert.equal(voteSpawn(1, 2, 3).value, null);
  assert.ok(voteSpawn(1, 2, 3).problem);
});

test('compareProduce flags a missing item and a quantity mismatch', () => {
  const fishRows = [{ name: 'Blue Roe', link: 'Roe', quantity: { min: 1, max: 1 }, population: { min: 1, max: 10 }, share: 1 }];
  const pondRows = [
    { item: 'Roe', link: 'Roe', quantity: { min: 1, max: 2 }, min_population: 1, share: { from: 1, to: 1 } },
    { item: 'Pearl', link: 'Pearl', quantity: { min: 1, max: 1 }, min_population: 9, share: { from: 0.02, to: 0.02 } },
  ];
  const { problems } = compareProduce(fishRows, pondRows, 10, false);
  assert.ok(problems.some((p) => /Pearl on Fish Pond page but not on fish page/.test(p)));
  assert.ok(problems.some((p) => /quantity 1-2 vs fish page 1-1/.test(p)));
});

/* ---------- the imported data ---------- */

test('header, building and rules carry wiki sources', () => {
  assert.equal(ponds.schema, 'stardew-tools/fishponds@1');
  assert.equal(ponds.game_version, '1.6.15');
  for (const s of [...ponds.building.sources, ...ponds.rules.produce.sources, ...ponds.rules.population.sources]) {
    assert.match(s.url, /^https:\/\/stardewvalleywiki\.com\//);
    assert.ok(Number.isInteger(s.revid) && s.revid > 0);
  }
  assert.equal(ponds.building.cost, 5000);
  assert.deepEqual(ponds.rules.produce.base_chance, { per_fish: 0.08, add: 0.15, legendary: 0.5, empty_pond: 0 });
  assert.ok(ponds.rules.produce.evidence.every((e) => typeof e === 'string' && e.length > 20));
});

test('base chance spans the 23-95% the wiki states', () => {
  assert.equal(baseChance(1), 0.23);
  assert.equal(baseChance(10), 0.95);
  assert.equal(baseChance(0), 0);
  assert.equal(baseChance(1, true), 0.5);
});

test('every pond fish is cross-checked and sourced', () => {
  assert.equal(ponds.fish.length, 73);
  assert.deepEqual(ponds.fish.filter((f) => f.verification_status !== 'cross-checked').map((f) => f.name), []);
  assert.deepEqual(ponds.skipped.map((s) => s.name).sort(), ['Cave Jelly', 'Green Algae', 'River Jelly', 'Sea Jelly', 'Seaweed', 'White Algae']);
  const ids = new Set();
  for (const f of ponds.fish) {
    assert.ok(!ids.has(f.id), `duplicate ${f.id}`);
    ids.add(f.id);
    assert.ok(f.sources.length >= 3 && f.sources.every((s) => s.revid > 0), f.name);
    assert.ok(Number.isInteger(f.base_price) && f.base_price > 0, f.name);
    assert.ok([1, 10].includes(f.max_population), f.name);
  }
});

test('produce shares plus "nothing" add up to 100% at every population', () => {
  for (const f of ponds.fish) {
    for (let p = 1; p <= f.max_population; p++) {
      const at = (rows) => rows.filter((r) => r.population.min <= p && p <= r.population.max).reduce((s, r) => s + r.share, 0);
      assert.ok(Math.abs(at(f.produce) + at(f.nothing) - 1) <= 0.011, `${f.name} pop ${p}`);
    }
  }
});

test('roe rule reproduces every roe price the wiki renders', () => {
  let checked = 0;
  for (const f of ponds.fish) {
    const o = oracle[f.id];
    if (!f.roe) continue;
    assert.equal(roePrice(f.base_price), f.roe.price, f.name);
    assert.equal(o.artisan.Roe, f.roe.price, f.name);
    assert.equal(o.artisan[f.roe.processed.name], f.roe.processed.price, f.name);
    assert.equal(o.artisan[`${f.roe.processed.name} (+40%)`], f.roe.processed.price_artisan, f.name);
    checked++;
  }
  assert.ok(checked >= 5);
  assert.equal(fish('Sturgeon').roe.processed.name, 'Caviar');
  assert.equal(fish('Tilapia').roe.price, 67); // odd base price 75: floor(30 + 37.5)
  assert.equal(fish('Tilapia').roe.processed.price, 134);
  assert.equal(fish('Squid').roe, null);
  assert.equal(fish('Coral').roe, null);
});

test('Fisher and Angler multiply the base price only (Angler replaces Fisher)', () => {
  const [fisher, angler] = ponds.professions;
  for (const f of ponds.fish.filter((x) => x.fish_professions_apply)) {
    const o = oracle[f.id];
    assert.equal(o.base[0], f.base_price, f.name);
    assert.deepEqual(o.fisher, o.base.map((b) => withMultiplier(b, fisher.effect.sell_multiplier)), f.name);
    assert.deepEqual(o.angler, o.base.map((b) => withMultiplier(b, angler.effect.sell_multiplier)), f.name);
  }
  assert.equal(fisher.effect.roe, false);
  assert.equal(angler.effect.roe, false);
});

test('legendary ponds hold one fish and roll roe twice', () => {
  const a = fish('Angler');
  assert.equal(a.max_population, 1);
  assert.equal(a.produce.length, 2);
  assert.equal(a.produce[1].only_if_above_fails, true);
});

test('produced items have a wiki sell price or say why not', () => {
  for (const i of ponds.items) {
    assert.ok(i.sell_price === null ? Boolean(i.note) : Number.isInteger(i.sell_price), i.name);
    assert.ok(i.sources[0].revid > 0, i.name);
  }
  for (const f of ponds.fish) for (const r of f.produce) assert.ok(r.item === 'Roe' || ponds.items.some((i) => i.id === r.item_id), `${f.name}: ${r.item}`);
});

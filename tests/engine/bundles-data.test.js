import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  plain,
  shortNote,
  seasonsIn,
  infoboxSeasons,
  renderedSeasons,
  infobox,
  itemRefs,
  tableRows,
  bundleTables,
  parseBundleTable,
  parseRawBundles,
  bundleKey,
  parseBundleTemplate,
  mentionedBundles,
  agree,
  renderedBundle,
  renderedQty,
} from '../../tools/data/import-bundles.mjs';
import { json } from './helpers.js';

const data = json('data/bundles.json');
const fixture = json('tests/fixtures/bundles-checks.json');
const bundle = (id) => {
  const b = data.bundles.find((x) => x.id === id);
  assert.ok(b, `no bundle ${id}`);
  return b;
};

/* ---------------------------------------------------------------- parse helpers */

const SPRING = `{|class="wikitable"
!id="Spring Foraging Bundle" colspan="4" |[[File:Bundle Green.png|32px|link=]] Spring Foraging Bundle
|-
| rowspan="2"|[[File:Spring Foraging Bundle.png|center]]
| rowspan="2" |[[File:Bundle Slot.png|center|link=]][[File:Bundle Slot.png|center|link=]]
| {{Name|Wild Horseradish}}
| [[Spring]] [[Foraging]]
|-
| {{Name|Wood|99}}
| Chopping [[Trees]]
|-
| colspan="2" style="text-align: center;"|[[File:Bundle Reward.png|18px|link=]] Reward:
| colspan="2" | {{Name|Spring Seeds|30}}
|}`;

test('parseBundleTable reads name, slots, items, quantities, notes and reward', () => {
  const b = parseBundleTable(SPRING, 'Spring Foraging Bundle');
  assert.equal(b.name, 'Spring Foraging Bundle');
  assert.equal(b.slots, 2);
  assert.deepEqual(
    b.items.map((i) => [i.name, i.qty, i.quality]),
    [
      ['Wild Horseradish', 1, 'normal'],
      ['Wood', 99, 'normal'],
    ],
  );
  assert.equal(plain(b.items[0].note), 'Spring Foraging');
  assert.deepEqual(b.reward, { name: 'Spring Seeds', page: 'Spring Seeds', qty: 30 });
});

test('parseBundleTable: quality rows, alternatives groups, random items, shared notes and gold', () => {
  const q = parseBundleTable(
    `{| class="wikitable"
!id="Quality Crops Bundle" colspan="4" |[[File:Bundle Teal.png|32px|link=]] Quality Crops Bundle (2 items chosen at random)
|-
| rowspan="2" |[[File:Bundle Slot.png|center|link=]]
| <table>
<tr><td>{{Quality|Parsnip|gold|24}}</td><td> [[Parsnip]] (5)</td></tr>
<tr><td>{{Quality|Potato|gold|24}}</td><td> [[Potato]] (5)</td></tr>
</table>
| Gold quality [[Spring]] [[Crops]]
|-
| {{Name|Amethyst}}
| rowspan="2" | [[Mining]]
|-
| {{Name|Large Brown Egg|link=Large Egg|Brown}}
|-
| colspan="2" |[[File:Bundle Reward.png|18px|link=]] Reward:
| colspan="2" |[[File:Deluxe Bait.png|24px|link=]] [[Deluxe Bait]] (30)
|}`,
    'Quality Crops Bundle',
  );
  assert.equal(q.name, 'Quality Crops Bundle');
  assert.equal(q.random_items, 2);
  assert.deepEqual(
    q.items.map((i) => [i.name, i.qty, i.quality, i.group ?? null]),
    [
      ['Parsnip', 5, 'gold', 1],
      ['Potato', 5, 'gold', 1],
      ['Amethyst', 1, 'normal', null],
      ['Large Brown Egg', 1, 'normal', null],
    ],
  );
  assert.equal(q.items[3].page, 'Large Egg');
  assert.equal(plain(q.items[3].note), 'Mining', 'a rowspan note is shared by the rows below it');
  assert.deepEqual(q.reward, { name: 'Deluxe Bait', page: 'Deluxe Bait', qty: 30 });
  const v = parseBundleTable(
    `{|class="wikitable"
!id="g2500 Bundle" colspan="2"|[[File:Bundle Red.png|32px|link=]] 2,500 Bundle
|-
|[[File:2500 Bundle.png|center]]
| style="text-align: center;"|[[File:Bundle Purchase.png|center|link=]] <p>{{Price|2500}}</p>
|-
| style="text-align: center;"|[[File:Bundle Reward.png|18px|link=]] Reward:
| {{Name|Chocolate Cake|3}}
|}`,
    'g2500 Bundle',
  );
  assert.equal(v.gold, 2500);
  assert.equal(v.slots, null);
  assert.equal(v.reward.qty, 3);
});

test('tableRows keeps nested {| tables inside one cell; bundleTables finds each table', () => {
  const rows = tableRows(`|-\n|\n{|\n|-\n|{{Quality|Wine|silver|24}}\n|Silver or better quality [[Wine]] (any)\n|-\n|}\n|[[Cask]]\n|}`);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].length, 2);
  assert.match(rows[0][0], /Quality\|Wine/);
  assert.equal(rows[0][1], '[[Cask]]');
  const t = bundleTables(`text\n${SPRING}\n'''''or'''''\n${SPRING.replace(/Spring Foraging/g, 'Sticky')}`);
  assert.deepEqual(
    t.map((x) => x.anchor),
    ['Spring Foraging Bundle', 'Sticky Bundle'],
  );
});

test('itemRefs reads Name and Quality templates', () => {
  assert.deepEqual(
    itemRefs('{{Name|Jelly|link=Jellies and Pickles{{!}}Jelly}} {{Quality|Corn|gold|24}} {{Name|Sap|500}}').map((r) => [r.name, r.page, r.qty, r.quality]),
    [
      ['Jelly', 'Jellies and Pickles', null, null],
      ['Corn', 'Corn', null, 'gold'],
      ['Sap', 'Sap', 500, null],
    ],
  );
});

test('parseRawBundles reads Data/Bundles entries (Modding:Bundles format)', () => {
  const r = parseRawBundles(`<syntaxhighlight lang="json">
{
  "Pantry/3": "Quality Crops/BO 15 1/24 5 2 254 5 2 276 5 2 270 5 2/6/3",
  "Vault/23": "2,500g/O 220 3/-1 2500 2500/4",
  "Abandoned Joja Mart/36": "The Missing//348 1 1 807 1 0/1/5"
}
</syntaxhighlight>`);
  assert.equal(r[0].slots, 3);
  assert.deepEqual(r[0].items[0], { id: 24, qty: 5, quality: 'gold' });
  assert.deepEqual(r[0].reward, { type: 'BO', id: 15, qty: 1 });
  assert.equal(r[1].gold, 2500);
  assert.equal(r[2].reward, null);
  assert.equal(r[2].items[0].quality, 'silver');
});

test('bundleKey matches the different spellings of one bundle', () => {
  assert.equal(bundleKey("Blacksmith's Bundle"), bundleKey("Blacksmith's"));
  assert.equal(bundleKey('2,500 Bundle'), bundleKey('2,500g'));
  assert.equal(bundleKey('Night Fishing Bundle'), bundleKey('Night Fish'));
  assert.equal(bundleKey('The Missing Bundle'), bundleKey('The Missing'));
  assert.equal(bundleKey('remixed Spring Crops Bundle'), bundleKey('Spring Crops Bundle'));
});

test('parseBundleTemplate + mentionedBundles resolve {{Bundle|alias}} on item pages', () => {
  const aliases = parseBundleTemplate(`|homecook
|home cook's = [[File:x.png]] [[Remixed Bundles#Home Cook's Bundle|Home Cook's Bundle]] {{#ifeq:}}
|night
|night fishing = [[File:x.png]] [[Bundles#Night Fishing Bundle|Night Fishing Bundle]]`);
  assert.equal(aliases.homecook, bundleKey("Home Cook's Bundle"));
  const m = mentionedBundles('*Ten Eggs are required for the {{Bundle|homecook||y}}. Also {{Bundle|Night||y}}.', aliases);
  assert.ok(m.has(bundleKey("Home Cook's")));
  assert.ok(m.has(bundleKey('Night Fishing')));
});

test('season parsing (notes, infobox, rendered infobox)', () => {
  assert.deepEqual(seasonsIn('River, when raining, all seasons except Winter'), ['Spring', 'Summer', 'Fall']);
  assert.deepEqual(seasonsIn('Found in Rivers, 12pm – 2am, [[Fall]] ([[Winter]] with [[Rain Totem]]).'), ['Fall']);
  assert.deepEqual(seasonsIn('Found in Rivers, 6pm – 2am, All Seasons.'), ['Spring', 'Summer', 'Fall', 'Winter']);
  assert.deepEqual(infoboxSeasons('{{Season|spring}} • {{Season|fall}}'), ['Spring', 'Fall']);
  assert.deepEqual(infoboxSeasons('{{Season|Fall}} • {{Season|Winter}} with [[Rain Totem]]'), ['Fall']);
  assert.deepEqual(infoboxSeasons('[[Spring]] • [[Summer]] • [[Fall]]<br />All Seasons on [[Ginger Island]]'), ['Spring', 'Summer', 'Fall']);
  assert.equal(infoboxSeasons('<nowiki />'), null);
  assert.deepEqual(infobox('{{Infobox\n|season = {{Season|Spring}} • \n{{Season|Summer}}\n|sellprice = 5\n}}').season.replace(/\s+/g, ' '), '{{Season|Spring}} • {{Season|Summer}}');
  assert.deepEqual(
    renderedSeasons('<td id="infoboxsection">Season</td>\n<td id="infoboxdetail"><a>Spring</a> • <a>Summer</a><br />All Seasons on <a>Ginger Island</a></td>'),
    ['Spring', 'Summer'],
  );
});

test('rendered bundle section: slots, quantities, quality icons', () => {
  const html = `<th id="Fish_Farmer.27s_Bundle">x</th><td><img alt="Bundle Slot.png" /><img alt="Bundle Slot.png" /></td>
<td><a>Roe</a>&#160;(15)</td><td><img alt="Gold Quality Icon.png" /><a>Large Egg</a>&#160;(Brown)</td><td>Reward:</td><td><a>Worm Bin</a>&#160;(1)</td><th id="Next">`;
  const h = renderedBundle(html, "Fish Farmer's Bundle");
  assert.equal(h.slots, 2);
  assert.equal(h.gold, 1);
  assert.deepEqual(renderedQty(h.text, 'Roe'), [15]);
  assert.deepEqual(renderedQty(h.text, 'Large Brown Egg', 'Large Egg'), [1]);
  assert.deepEqual(renderedQty(h.text, 'Worm Bin'), [], 'the reward is not an item');
});

test('agree and shortNote', () => {
  assert.equal(agree([{ source: 'a', value: 3 }, { source: 'b', value: 3 }]).ok, true);
  assert.equal(agree([{ source: 'a', value: 3 }, { source: 'b', value: 4 }]).ok, false);
  assert.equal(agree([{ source: 'a', value: 3 }, { source: 'b', value: undefined }]).ok, false);
  const long = 'Found in Rivers, 6am – midnight, Spring and Fall. Only when raining; Can be found in Summer during rain in the Secret Woods and the Witch Swamp, Winter with a Rain Totem, more text here';
  assert.ok(shortNote(long).length <= 152);
  assert.ok(shortNote(long).endsWith('…'));
});

/* ---------------------------------------------------------------- the data file */

test('file shape, sources and verification fields', () => {
  assert.equal(data.schema, 'stardew-tools/bundles@1');
  assert.equal(data.game_version, '1.6.15');
  assert.match(data.last_verified, /^\d{4}-\d{2}-\d{2}$/);
  for (const rec of [data, ...data.rooms, ...data.bundles, ...data.items]) {
    assert.ok(rec.sources.length >= 1, `${rec.name || 'file'} has sources`);
    for (const s of rec.sources) {
      assert.ok(s.url.startsWith('https://stardewvalleywiki.com/'), s.url);
      assert.ok(Number.isInteger(s.revid), `${s.title} revid`);
    }
  }
  for (const rec of [...data.rooms, ...data.bundles, ...data.items]) {
    assert.equal(rec.verification_status, rec.problems.length ? 'needs-verification' : 'verified', rec.name);
  }
  assert.deepEqual(
    data.rooms.map((r) => r.name),
    ['Crafts Room', 'Pantry', 'Fish Tank', 'Boiler Room', 'Bulletin Board', 'Vault', 'Abandoned JojaMart'],
  );
  assert.equal(data.bundles.filter((b) => b.set === 'standard').length, 31);
  const itemIds = new Set(data.items.map((i) => i.id));
  for (const b of data.bundles) {
    assert.ok(['standard', 'remixed'].includes(b.set));
    if (b.gold) continue;
    assert.ok(b.slots >= 1 && b.slots <= b.items.length, `${b.id} slots`);
    for (const it of b.items) {
      assert.ok(itemIds.has(it.id), `${b.id}: ${it.id}`);
      assert.ok(['normal', 'silver', 'gold', 'iridium'].includes(it.quality));
    }
  }
});

test('remixed alternatives: each random group picks fewer bundles than it offers', () => {
  const groups = new Map();
  for (const b of data.bundles.filter((x) => x.remix)) {
    const g = groups.get(b.remix.group) || { ...b.remix, n: 0 };
    g.n++;
    groups.set(b.remix.group, g);
  }
  for (const [name, g] of groups) {
    assert.equal(g.n, g.of, name);
    assert.ok(g.pick < g.of, name);
  }
  assert.equal(groups.get('boiler-room').pick, 3);
  assert.equal(groups.get('bulletin-board').pick, 5);
});

test('item ids match the existing data files where the item already exists', () => {
  const crops = json('data/crops.json').crops;
  const animals = json('data/animals.json');
  for (const r of [...crops, ...animals.products]) {
    const it = data.items.find((i) => i.name === r.name);
    if (it) assert.equal(it.id, r.id, r.name);
  }
  assert.ok(data.items.find((i) => i.id === 'large-goat-milk'));
});

test('spot checks against other wiki pages (fixture)', () => {
  assert.ok(fixture.checks.length >= 8);
  for (const c of fixture.checks) {
    assert.ok(c.source.title && Number.isInteger(c.source.revid));
    if (c.bundle) {
      const items = bundle(c.bundle).items.filter((i) => i.id === c.item);
      assert.ok(items.length, `${c.bundle} has ${c.item}`);
      if (c.expect.count) assert.equal(items.length, c.expect.count, `${c.bundle} ${c.item} count`);
      assert.equal(items[0].qty, c.expect.qty, `${c.bundle} ${c.item} qty (${c.source.title})`);
      if (c.expect.quality) assert.equal(items[0].quality, c.expect.quality, `${c.bundle} ${c.item} quality`);
      if (c.expect.any) assert.equal(items[0].any, true);
    } else if (c.vault_total) {
      const sum = data.bundles.filter((b) => b.set === 'standard' && b.room === 'vault').reduce((s, b) => s + b.gold, 0);
      assert.equal(sum, c.vault_total);
    } else if (c.room) {
      const r = data.rooms.find((x) => x.id === c.room);
      assert.match(`${r.reward} ${r.effect}`, new RegExp(c.effect_mentions));
    }
  }
});

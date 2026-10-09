import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  slug,
  itemRef,
  parseCategory,
  topLevelItems,
  parseVillagerGifts,
  parseGiftCell,
  parseListOfAllGifts,
  parseInfoboxBirthday,
  parseInfoboxMarriage,
  parseVillagersPage,
  parseUniversalSection,
  parseExceptionBullets,
  parseExceptionTable,
  parseGiftsByItem,
  parsePointTable,
  parseQualityTable,
  parseNameTemplateHtml,
  normalizeTaste,
  agree,
  TASTES,
} from '../../tools/data/import-gifts.mjs';
import { json } from './helpers.js';

const gifts = json('data/gifts.json');
const checks = json('tests/fixtures/gifts-checks.json');

/* ---------------------------------------------------------------- parse helpers */

test('slug folds accents and apostrophes like the other data files', () => {
  assert.equal(slug('Piña Colada'), 'pina-colada');
  assert.equal(slug("Rabbit's Foot"), 'rabbits-foot');
  assert.equal(slug('Strange Doll (green)'), 'strange-doll-green');
});

test('itemRef picks the item a link names', () => {
  assert.equal(itemRef({ target: 'Red Mushroom', label: 'Red' }), 'red-mushroom');
  assert.equal(itemRef({ target: 'Jellies and Pickles', label: 'Pickles' }), 'pickles');
  assert.equal(itemRef({ target: 'Fruit Trees', label: 'Fruit Tree Fruit' }), 'all-fruit-trees');
  assert.equal(itemRef({ target: 'Fish#Fish Types', label: 'Fish' }), 'all-fish');
  assert.equal(itemRef({ target: 'Version History#1.5', label: 'pre-1.5' }), null);
});

test('parseCategory keeps group entries as markers with their exceptions', () => {
  assert.deepEqual(parseCategory("All [[Fruits|Fruit]] ''(except [[Fruit Trees|Fruit Tree Fruit]] &amp; [[Salmonberry]])''"), {
    id: 'all-fruits',
    text: 'All Fruit (except Fruit Tree Fruit & Salmonberry)',
    except: ['all-fruit-trees', 'salmonberry'],
  });
  assert.deepEqual(parseCategory("All Mushrooms ''(except [[Red Mushroom|Red]])''").except, ['red-mushroom']);
  assert.equal(parseCategory("'''All Eggs*'''").id, 'all-eggs');
  assert.equal(parseCategory("'''[[Vegetables|All Vegetables]]''' ''(except [[Hops]])''").id, 'all-vegetables');
  assert.equal(parseCategory("'''[[Cooking|All Cooked Dishes]]''' ''(other than [[Bread]])''").id, 'all-cooking');
  assert.equal(parseCategory('{{Name|Coffee}}'), null);
});

test('topLevelItems keeps nested lists inside their parent entry', () => {
  const li = topLevelItems('<ul><li>A <em>(except:<ul><li>x</li><li>y</li></ul>)</em></li><li>B</li></ul>');
  assert.equal(li.length, 2);
  assert.match(li[0], /^A .*x.*y/);
  assert.equal(li[1], 'B');
});

const VILLAGER_SAMPLE = `==Gifts==
{{GiftHeader}}
===Love===
{|class="wikitable"
!Image
!Name
|-
| [[File:X Happy.png|48px|center]]
|colspan="4"| <ul><li>'''All [[Friendship#Universal Loves|Universal Loves]]'''</li></ul>
|-
|[[File:Coffee.png|center]]
|[[Coffee]]
|[[Keg]]
|-
|[[File:Pickles.png|center]]
|[[Jellies and Pickles|Pickles]]
|[[Preserves Jar]]
|}
===Like===
{|class="wikitable"
|-
| [[File:X Happy.png|48px|center]]
|colspan="3"| <ul><li>'''All [[Friendship#Universal Likes|Universal Likes]]''' ''(except '''[[Vegetables]]''')''</li><li>'''All Eggs''' ''(except [[Void Egg]])*''</li></ul>
|-
|[[File:Quartz.png|center]]
|[[Quartz]]
|}
===Neutral===
===Dislike===
===Hate===
==Movies==`;

test('parseVillagerGifts reads rows, group bullets and the universal clause', () => {
  const g = parseVillagerGifts(VILLAGER_SAMPLE);
  assert.deepEqual(g.love.items, ['coffee', 'pickles']);
  assert.equal(g.love.universal, true);
  assert.deepEqual(g.like.items, ['quartz']);
  assert.deepEqual(g.like.universal_except, ['all-vegetables']);
  assert.deepEqual(g.like.categories.map((c) => [c.id, c.except]), [['all-eggs', ['void-egg']]]);
  assert.deepEqual(Object.keys(g), TASTES);
});

const LOAG_SAMPLE = `*'''All Eggs''' = {{Name|Egg|class=inline}}, {{Name|Void Egg|class=inline}}

{|class="wikitable sortable roundedborder"
!Villager
!Birthday
!class="unsortable" style="width:13%;"|Loves [[File:DialogueBubbleLove.png|24px|link=]] &nbsp; (+80)
!class="unsortable" style="width:13%;"|Likes &nbsp; (+45)
!class="unsortable" style="width:13%;"|Neutral &nbsp; (+20)
!class="unsortable" style="width:13%;"|Dislikes &nbsp; (-20)
!class="unsortable" style="width:13%;"|Hates [[File:DialogueBubbleHate.png|24px|link=]] &nbsp; (-40)
|-
| style="text-align: center;" | [[File:Alex.png|80px|link=Alex]]<br />[[Alex]]
|<!--Birthday--> data-sort-value="0213" style="text-align: center;" |[[Summer]] 13
|<!--Loves-->
*{{Name|Complete Breakfast}}
|<!--Likes-->
*All Eggs ''(except [[Void Egg]])''
|<!--Neutral-->
*{{Name|Daffodil}}
|<!--Dislikes-->
*All [[Cooking]] ''except for [[Bread]]; and the fish dishes he likes: [[Baked Fish]] &amp; [[Trout Soup]]''
|<!--Hates-->
*{{Name|Holly}}
|}`;

test('parseListOfAllGifts reads groups, points, birthdays and taste cells', () => {
  const L = parseListOfAllGifts(LOAG_SAMPLE);
  assert.deepEqual(L.groups['all-eggs'].members, ['egg', 'void-egg']);
  assert.deepEqual(L.points, { love: 80, like: 45, neutral: 20, dislike: -20, hate: -40 });
  assert.equal(L.rows.length, 1);
  assert.deepEqual(L.rows[0].birthday, { season: 'summer', day: 13 });
  assert.deepEqual(L.rows[0].tastes.love.items, ['complete-breakfast']);
  assert.deepEqual(L.rows[0].tastes.hate.items, ['holly']);
  // "the fish dishes he likes: …" inside a dislike entry are likes.
  assert.deepEqual(L.rows[0].tastes.like.items, ['baked-fish', 'trout-soup']);
  // Group expansion is only used for comparing two pages.
  assert.deepEqual([...normalizeTaste(L.rows[0].tastes.like, L.groups).items].sort(), ['baked-fish', 'egg', 'trout-soup']);
});

test('parseGiftCell separates items and groups', () => {
  const t = parseGiftCell("*{{Name|Coffee}}\n*All Milk\n*{{Name|Wine}}");
  assert.deepEqual(t.items, ['coffee', 'wine']);
  assert.deepEqual(t.categories, [{ id: 'all-milk', text: 'All Milk', except: [] }]);
});

test('infobox birthday, marriage and the Villagers galleries', () => {
  assert.deepEqual(parseInfoboxBirthday('|birthday  = {{Season|Fall|13}}\n'), { season: 'fall', day: 13 });
  assert.deepEqual(parseInfoboxBirthday('|birthday  = {{Season|Summer}} 13\n'), { season: 'summer', day: 13 });
  assert.equal(parseInfoboxMarriage('|marriage  = Yes\t\n'), true);
  assert.equal(parseInfoboxMarriage('|marriage  = No, but can become a [[#Roommate|roommate]]\n'), false);
  const v = parseVillagersPage(`==[[Marriage|Marriage]] Candidates==\n<gallery>\nFile:Alex.png|[[Alex]]|link=Alex\n</gallery>\n==Non-marriage candidates==\n<gallery>\nFile:Clint.png|[[Clint]]|link=Clint\n</gallery>\n==Non-giftable NPCs==\n<gallery>\nFile:Gil.png|[[Gil]]|link=Gil\n</gallery>`);
  assert.deepEqual(v, { giftable: ['Alex', 'Clint'], candidates: ['Alex'] });
});

test('universal sections and their exception lists', () => {
  const u = parseUniversalSection(`*'''All Building Materials''' -- [[Battery Pack]]s, [[Clay]]
*'''[[Vegetables|All Vegetables]]''' (including [[Fiddlehead Fern]], but excluding [[Hops]] and [[Unmilled Rice]].)
*{{Name|Oil}}`);
  assert.deepEqual(u.items, ['oil']);
  assert.deepEqual(u.categories[0].members, ['battery-pack', 'clay']);
  assert.deepEqual(u.categories[1].except, ['hops', 'unmilled-rice']);
  const e = parseExceptionBullets("*[[File:Abigail Icon.png|24px|link=]] [[Abigail]] loves [[Pufferfish]]; likes [[Ancient Sword]], [[Bone Flute]]; hates [[Clay]]\n*[[File:Haley Icon.png|24px|link=]] [[Haley]] hates '''[[Fish#Fish Types|All Fish]]''', [[Clay]]");
  assert.deepEqual(e.filter((x) => x.item).map((x) => `${x.villager}:${x.taste}:${x.item}`), ['Abigail:love:pufferfish', 'Abigail:like:ancient-sword', 'Abigail:like:bone-flute', 'Abigail:hate:clay', 'Haley:hate:clay']);
  assert.deepEqual(e.find((x) => x.category), { villager: 'Haley', taste: 'hate', category: 'all-fish', text: 'All Fish' });
  const tbl = parseExceptionTable("{|class=\"wikitable\"\n|-\n!Villager\n|-\n|{{NPC|Abigail}}\n|<!--Loves-->'''Gems:''' [[Amethyst]]<br />'''Vegetables:''' [[Pumpkin]]\n|<!--Likes-->\n|<!--Neutrals-->\n|<!--Dislikes-->'''[[Vegetables|All Vegetables]]''' except [[Pumpkin]]\n|<!--Hates-->\n|}");
  assert.deepEqual(tbl.map((x) => x.item || x.category), ['amethyst', 'pumpkin', 'all-vegetables']);
});

test('GiftsByItem, point and quality tables, rendered Name templates', () => {
  assert.deepEqual(parseGiftsByItem('{{GiftsByItem\n|love=Abigail,Willy\n|hate=Jas\n}}'), { Abigail: 'love', Willy: 'love', Jas: 'hate' });
  assert.deepEqual(parsePointTable('|-\n| Love\n| +80\n| +88\n| +400\n|-\n| Hate\n| -40\n| -40\n| -200\n'), { love: [80, 88, 400], hate: [-40, -40, -200] });
  assert.deepEqual(parseQualityTable('|\n| Normal\n| ×1\n| +0%\n|-\n| [[File:Gold Quality.png|12px]]\n| Gold\n| ×1.25\n'), { normal: 1, gold: 1.25 });
  const m = parseNameTemplateHtml('<span class="nametemplate"><img alt="Green Frog Egg.png" src="x" /> <a href="/Frog_Egg" title="Frog Egg">Frog Egg</a></span>');
  assert.equal(m.get('green-frog-egg'), 'frog-egg');
});

test('agree needs two matching sources', () => {
  assert.equal(agree([{ source: 'a', value: 'love' }, { source: 'b', value: 'love' }, { source: 'c', value: 'like' }]).value, 'love');
  assert.equal(agree([{ source: 'a', value: 'love' }, { source: 'b', value: undefined }]).ok, false);
});

/* ---------------------------------------------------------------- the data file */

const villager = (id) => {
  const v = gifts.villagers.find((x) => x.id === id);
  if (!v) throw new Error(`no villager ${id}`);
  return v;
};
const explicitTaste = (v, item) => TASTES.find((t) => v.tastes[t].items.includes(item));

test('file shape, sources and verification fields', () => {
  assert.equal(gifts.schema, 'stardew-tools/gifts@1');
  assert.equal(gifts.game_version, '1.6.15');
  assert.match(gifts.generated, /^\d{4}-\d{2}-\d{2}/);
  assert.match(gifts.last_verified, /^\d{4}-\d{2}-\d{2}$/);
  const records = [gifts, gifts.friendship, gifts.universal, ...gifts.villagers];
  for (const r of records) {
    assert.ok(r.sources.length > 0);
    for (const s of r.sources) {
      assert.match(s.url, /^https:\/\/stardewvalleywiki\.com\//);
      assert.ok(Number.isInteger(s.revid));
    }
  }
  for (const r of [gifts.friendship, gifts.universal, ...gifts.villagers]) {
    assert.equal(r.verification_status, r.problems.length ? 'needs-verification' : 'verified');
  }
});

test('every giftable villager, including the Dwarf, Krobus, Wizard and Leo', () => {
  assert.equal(gifts.villagers.length, 34);
  for (const id of ['dwarf', 'krobus', 'wizard', 'leo', 'sandy', 'willy']) assert.ok(villager(id));
  assert.equal(gifts.villagers.filter((v) => v.marriage_candidate).length, 12);
  assert.equal(villager('krobus').marriage_candidate, false);
  assert.equal(villager('abigail').marriage_candidate, true);
  for (const v of gifts.villagers) {
    assert.ok(['spring', 'summer', 'fall', 'winter'].includes(v.birthday.season));
    assert.ok(v.birthday.day >= 1 && v.birthday.day <= 28);
    for (const t of TASTES) assert.ok(v.tastes[t], `${v.id} ${t}`);
  }
});

test('points and multipliers', () => {
  const f = gifts.friendship;
  assert.deepEqual(f.points, { love: 80, like: 45, neutral: 20, dislike: -20, hate: -40 });
  assert.equal(f.multipliers.birthday, 8);
  assert.equal(f.multipliers.winter_star, 5);
  assert.deepEqual(f.quality_multipliers, { normal: 1, silver: 1.1, gold: 1.25, iridium: 1.5 });
  assert.equal(f.points.love * f.multipliers.birthday * f.quality_multipliers.iridium, f.max_single_gift);
  for (const e of Object.values(f.evidence.points)) assert.ok(e.length > 20);
});

test('universal tastes keep categories as markers', () => {
  const u = gifts.universal;
  for (const id of ['prismatic-shard', 'rabbits-foot', 'pearl', 'golden-pumpkin']) assert.ok(u.love.items.includes(id), id);
  assert.ok(u.like.categories.some((c) => c.id === 'all-vegetables'));
  assert.ok(u.hate.items.includes('carp'));
  assert.ok(u.exceptions.some((e) => e.villager === 'haley' && e.item === 'prismatic-shard' && e.taste === 'hate'));
  const ids = new Set(gifts.categories.map((c) => c.id));
  for (const t of TASTES) for (const c of u[t].categories) assert.ok(ids.has(c.id), c.id);
  assert.deepEqual(gifts.categories.find((c) => c.id === 'all-eggs').members.includes('void-egg'), true);
});

test('every taste item is in the items list, and ids match the other data files', () => {
  const items = new Set(gifts.items.map((i) => i.id));
  for (const v of gifts.villagers) for (const t of TASTES) for (const id of v.tastes[t].items) assert.ok(items.has(id), `${v.id} ${t} ${id}`);
  const others = new Map();
  const walk = (o) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') {
      if (typeof o.id === 'string' && typeof o.name === 'string') others.set(o.name.toLowerCase(), o.id);
      Object.values(o).forEach(walk);
    }
  };
  ['data/crops.json', 'data/animals.json', 'data/fishponds.json'].forEach((f) => walk(json(f)));
  let overlap = 0;
  for (const it of gifts.items) {
    const id = others.get(it.name.toLowerCase());
    if (id) {
      overlap++;
      assert.equal(it.id, id);
    }
  }
  assert.ok(overlap > 30, `only ${overlap} shared items`);
});

test('birthdays match Module:NPCDispositions (a page the importer does not read)', () => {
  assert.ok(checks.birthdays.values.length >= 8);
  assert.ok(Number.isInteger(checks.birthdays.source.revid));
  for (const b of checks.birthdays.values) assert.deepEqual(villager(b.villager).birthday, { season: b.season, day: b.day }, b.villager);
});

test('gift tastes match the item pages (GiftsByItem, pages the importer does not read for these)', () => {
  assert.ok(checks.tastes.length >= 8);
  for (const c of checks.tastes) {
    assert.ok(Number.isInteger(c.source.revid));
    assert.equal(explicitTaste(villager(c.villager), c.item), c.taste, `${c.villager} ${c.item} (${c.source.title} rev ${c.source.revid})`);
  }
});

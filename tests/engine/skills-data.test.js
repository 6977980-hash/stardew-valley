import { test } from 'node:test';
import assert from 'node:assert/strict';
import { json } from './helpers.js';
import {
  parseLevelTable,
  parseTotalsTable,
  parseCropXpTables,
  cropPageXp,
  cropXp,
  parseFishTable,
  fishXp,
  parseMonsterTable,
  monsterPageXp,
  infobox,
  firstInt,
  settle,
  compact,
} from '../../tools/data/import-skills.mjs';

const skills = json('data/skills.json');
const checks = json('tests/fixtures/skills-checks.json');
const crops = json('data/crops.json').crops;
const ponds = json('data/fishponds.json').fish;

/* ---------- parse helpers ---------- */

test('parseLevelTable reads increments and totals', () => {
  const wt = '{| class="wikitable"\n|-\n! 1\n| 100\n| 100\n|-\n! 2\n| +280\n| 380\n|-\n|}';
  assert.deepEqual(parseLevelTable(wt), [
    { level: 1, xp: 100, total: 100 },
    { level: 2, xp: 280, total: 380 },
  ]);
});

test('parseTotalsTable picks the requested column and ignores footnote stars', () => {
  const wt = '! 1\n| 100\n| 8\n| 1\n| 20*\n|-\n! 2\n| 380\n| 30\n| 2\n| 76\n|-';
  assert.deepEqual(parseTotalsTable(wt, 0), { 1: 100, 2: 380 });
  assert.deepEqual(parseTotalsTable(wt, 3), { 1: 20, 2: 76 });
});

test('parseCropXpTables reads seasonal tables and flags disagreeing duplicates', () => {
  const wt = '|{{Name|Corn}}\n| 10\n|-\n|{{Name|Sunflower}}\n| 5<ref name="sunflower" />\n|-\n|{{Name|Corn}}\n| 11\n|}';
  const r = parseCropXpTables(wt);
  assert.equal(r.xp.Sunflower, 5);
  assert.deepEqual(r.conflicts, ['Corn: 10 vs 11']);
});

test('cropPageXp reads the infobox value and skips Wild Seeds entries', () => {
  assert.equal(cropPageXp('|xp          = 8 [[Farming#Experience Points|Farming XP]]'), 8);
  assert.equal(cropPageXp('|xp = <nowiki />\n*[[Foraging]]: 7 [[Foraging]] XP\n*[[Cactus Seeds]]: 14 [[Farming]] XP'), 14);
  assert.equal(
    cropPageXp('*[[Fall Seeds]]: 2 [[Foraging#Experience Points|Foraging XP]] and 3 [[Farming#Experience Points|Farming XP]]<br />Grape Starter: 14 [[Farming#Experience Points|Farming XP]]'),
    14,
  );
  assert.equal(cropPageXp('no xp here'), undefined);
});

test('infobox and firstInt read multi-line parameters and prices', () => {
  const box = infobox('{{Infobox seed\n|sellprice = {{Price|20}} (harvested)\n|xp = <nowiki />\n*a\n}}');
  assert.equal(firstInt(box.sellprice), 20);
  assert.match(box.xp, /\*a/);
});

test('crop formula: XP = round(16 ln(0.018 price + 1))', () => {
  assert.equal(cropXp(35), 8); // Parsnip
  assert.equal(cropXp(20), 5); // Sunflower Seeds
  assert.equal(cropXp(3000), 64); // Sweet Gem Berry
});

test('parseFishTable reads name, difficulty, behavior and base XP from section-wrapped rows', () => {
  const wt = '{|\n|-\n<section begin="Tuna" />\n| [[File:Tuna.png|center]]\n| [[Tuna]]\n| {{Description|Tuna}}\n| 12–61\n| 70 smooth\n| 26\n| {{Bundle|Ocean Fish}}<section end="Tuna" />\n|-\n|}';
  assert.deepEqual(parseFishTable(wt), [{ name: 'Tuna', difficulty: 70, behavior: 'smooth', base_xp: 26 }]);
});

test('fishXp follows the Fishing page examples', () => {
  for (const ex of skills.fishing.formula.examples) assert.equal(fishXp(ex.inputs), ex.xp, ex.case);
  assert.equal(fishXp({ difficulty: 95, legendary: true }), 170);
});

test('parseMonsterTable and monsterPageXp', () => {
  const rows = parseMonsterTable('{|\n|-\n|[[Bats|Frost Bat]]\n|7\n|-\n|[[Dust Sprite]]\n|2\n|}');
  assert.deepEqual(rows, [
    { label: 'Frost Bat', link: 'Bats', xp: 7 },
    { label: 'Dust Sprite', link: 'Dust Sprite', xp: 2 },
  ]);
  const bats = '[[File:Bat.png|24px|link=]] [[File:Bat Dangerous.png|24px|link=]] 03, [[File:Frost Bat.png|24px|link=]] [[File:Frost Bat Dangerous.png|24px|link=]] 07';
  assert.equal(monsterPageXp(bats, 'Frost Bat', 'Bats'), 7);
  assert.equal(monsterPageXp('2', 'Dust Sprite', 'Dust Sprite'), 2);
  assert.equal(monsterPageXp('3', 'Green Slime', 'Slimes'), undefined);
});

test('settle records disagreements and compact merges per-level sources', () => {
  const problems = [];
  const verified = {};
  assert.equal(settle('x', 'xp', [{ source: 'A', value: 14 }, { source: 'B', value: 12 }], problems, verified), 14);
  assert.equal(problems.length, 1);
  assert.deepEqual(compact({ total_1: ['A'], total_2: ['A'], other: ['B'] }, 'total'), { total_each_level: ['A'], other: ['B'] });
});

/* ---------- file shape ---------- */

test('file header and sources', () => {
  assert.equal(skills.schema, 'stardew-tools/skills@1');
  assert.equal(skills.game_version, '1.6.15');
  assert.match(skills.last_verified, /^\d{4}-\d{2}-\d{2}$/);
  const recs = [skills.levels, skills.mastery, ...skills.farming.crops, ...skills.farming.other, ...skills.fishing.fish, ...skills.fishing.other, ...skills.foraging.actions, ...skills.mining.actions, ...skills.combat.monsters, ...skills.combat.other];
  for (const r of [skills, ...recs]) {
    assert.ok(r.sources.length, r.id);
    for (const s of r.sources) {
      assert.ok(s.url.startsWith('https://stardewvalleywiki.com/'));
      assert.ok(Number.isInteger(s.revid));
    }
  }
  for (const r of recs) {
    assert.equal(r.verification_status, r.problems.length ? 'needs-verification' : 'cross-checked', r.id);
    assert.ok(Array.isArray(r.problems));
  }
});

test('every crop in data/crops.json has Farming XP; fish ids match data/fishponds.json', () => {
  for (const c of crops) assert.ok(skills.farming.crops.find((x) => x.id === c.id)?.xp > 0, c.id);
  const pondIds = new Set(ponds.map((f) => f.id));
  for (const f of skills.fishing.fish) assert.equal(f.in_fishponds, pondIds.has(f.id), f.id);
  for (const id of skills.fishing.other.find((x) => x.id === 'crab-pot').applies_to) assert.ok(pondIds.has(id), id);
});

/* ---------- spot checks against other wiki pages ---------- */

test(`level totals match ${checks.level_totals.source.title} (rev ${checks.level_totals.source.revid})`, () => {
  assert.equal(checks.level_totals.rows.length, 10);
  for (const row of checks.level_totals.rows) {
    assert.equal(skills.levels.thresholds.find((t) => t.level === row.level).total, row.total);
    // "Total Sardines (No stars)": normal Sardine = 13 XP; "Total Crab Pot": 5 XP each.
    const sardine = fishXp({ difficulty: skills.fishing.fish.find((f) => f.id === 'sardine').difficulty });
    assert.equal(Math.ceil(row.total / sardine), row.sardines, `sardines L${row.level}`);
    assert.equal(Math.ceil(row.total / skills.fishing.other.find((x) => x.id === 'crab-pot').xp), row.crab_pots, `crab pots L${row.level}`);
  }
});

test(`parsnips needed per level match ${checks.parsnips_per_level.source.title}`, () => {
  const parsnip = skills.farming.crops.find((c) => c.id === 'parsnip').xp;
  for (const row of checks.parsnips_per_level.rows) {
    const total = skills.levels.thresholds.find((t) => t.level === row.level).total;
    assert.equal(total, row.total);
    assert.equal(Math.ceil(total / parsnip), row.parsnips, `L${row.level}`);
  }
});

test('crop XP matches each crop page', () => {
  assert.ok(checks.crops.length >= 8);
  for (const c of checks.crops) assert.equal(skills.farming.crops.find((x) => x.id === c.id).xp, c.xp, `${c.id} (${c.source.title} rev ${c.source.revid})`);
});

test('fish difficulty matches each fish page', () => {
  assert.ok(checks.fish.length >= 8);
  for (const f of checks.fish) assert.equal(skills.fishing.fish.find((x) => x.id === f.id).difficulty, f.difficulty, `${f.id} (${f.source.title} rev ${f.source.revid})`);
});

test('monster XP matches each monster page', () => {
  for (const m of checks.monsters) assert.equal(skills.combat.monsters.find((x) => x.id === m.id).xp, m.xp, `${m.id} (${m.source.title})`);
});

test('mastery totals, crab pot, animal care and skill book XP', () => {
  assert.deepEqual(skills.mastery.levels.map((l) => l.total), checks.mastery_totals.rows.map((r) => r.total));
  assert.equal(skills.fishing.other.find((x) => x.id === 'crab-pot').xp, checks.crab_pot_xp.xp);
  assert.equal(skills.farming.other.find((x) => x.id === 'animal-care').xp, checks.animal_care_xp.xp);
  for (const s of ['farming', 'fishing', 'foraging', 'mining', 'combat']) {
    const list = skills[s].other || skills[s].actions;
    assert.equal(list.find((x) => x.id === 'skill-book').xp, checks.skill_book_xp.xp, s);
  }
});

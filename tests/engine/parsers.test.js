import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitCropsPage, parseCropSection, parseCropPage, parsePageStages } from '../../tools/data/parse-crops.mjs';
import { parseCalendars } from '../../tools/data/parse-calendars.mjs';
import { parseYield } from '../../tools/data/import-crops.mjs';

test('Crops page section: stages, regrowth, seeds, price; first variant of a split cell', () => {
  const wt = [
    '==Summer Crops==',
    '===[[File:Taro Root.png]] [[Taro Root]]===',
    '<p>Grows in [[Summer]].</p>',
    '|rowspan="2"|<br />[[File:Taro Tuber.png|center]][[Taro Tuber]]',
    '<div class="no-wrap" style="x">[[File:A.png|24px|link=]] [[Pierre\'s General Store|Pierre\'s]]: {{Price|1,200}}</div>',
    '|{{Qualityprice|Taro Root|100|dsv=false}}',
    '|class="no-wrap"|1 day <sup>1</sup><br /> 1 day <sup>2</sup>',
    '|class="no-wrap"|2 days <sup>1</sup><br /> 1 day <sup>2</sup>',
    '|class="no-wrap"|Total: 3 days <sup>1</sup><br />Total: 2 days <sup>2</sup>',
    '|Regrowth:<br />4 days',
  ].join('\n');
  const [section] = splitCropsPage(wt);
  const c = parseCropSection(section);
  assert.equal(c.name, 'Taro Root');
  assert.equal(c.group, 'Summer Crops');
  assert.deepEqual(c.phases, [1, 2]);
  assert.equal(c.total, 3);
  assert.equal(c.regrow, 4);
  assert.equal(c.basePrice, 100);
  assert.deepEqual(c.sources, { "Pierre's": 1200 });
});

test('crop page infobox picks the line for the given seed', () => {
  const wt = "{{Infobox\n|growth = 7 days (Summer Seeds)<br />10 days (Grape Starter)\n|season = {{Season|Summer}} (Summer Seeds)<br />{{Season|Fall}} (Grape Starter)\n|sellprice = 80\n}}\nThe '''Grape''' is a [[Fruits|fruit]]. Not a [[Vegetables|vegetable]].\n==Stages==\n{|\n|1 Day\n|9 Days\n|Total: 10 Days\n|}";
  const p = parseCropPage(wt, 'Grape Starter');
  assert.equal(p.growth, 10);
  assert.deepEqual(p.seasons, ['Fall']);
  assert.equal(p.category, 'fruit', 'category from the first sentence only');
  assert.deepEqual(parsePageStages(wt), { phases: [1, 9], total: 10 });
});

test('harvest size sentences', () => {
  assert.deepEqual(parseYield('Each plant yields 4 beans per harvest, with a 2% chance for more beans.'), { min: 4, max: 4, max_per_level: 0, extra_chance: 0.02, stated: true });
  assert.equal(parseYield('Yields at least 1 Potato, with a chance to produce, on average, 0.25 extra potatoes.').extra_chance, 0.2);
  assert.equal(parseYield('Harvesting a sunflower will also produce 0-2 Sunflower Seeds.').min, 1, 'seed by-product is not the harvest');
  assert.equal(parseYield('Nothing stated.').stated, false);
});

test('growth calendar: stage run lengths up to the first harvest image', () => {
  const cell = (f) => `|[[File:${f}.png|center|link=]]`;
  const wt = ['===[[Kale]]===', '{|class="wikitable"', '!colspan="7"|Base', cell('Kale Stage 1'), cell('Kale Stage 2'), cell('Kale Stage 2'), cell('Kale Stage 3'), cell('Kale'), '|}'].join('\n');
  const [cal] = parseCalendars(wt);
  assert.equal(cal.name, 'Kale');
  assert.deepEqual(cal.tables[0], { label: 'Base', group: 'Base', phases: [1, 2, 1], days: 4 });
});

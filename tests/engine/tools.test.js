import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allocate, runsIn } from '../../assets/js/engine/machines.js';
import { sprinklerCoverage, paintGrid } from '../../assets/js/engine/greenhouse.js';
import { cropProfit } from '../../assets/js/engine/profit.js';
import { harvestSchedule } from '../../assets/js/engine/growth.js';
import { data, crop } from './helpers.js';

const SEASONS = { seasons: data.seasons.seasons, daysPerSeason: 28 };

test('greenhouse sprinkler layouts water every soil tile and match the wiki tile counts', () => {
  for (const layout of data.greenhouse.sprinklers) {
    const c = sprinklerCoverage(layout, data.greenhouse);
    assert.equal(c.unwatered, 0, `${layout.id} leaves tiles dry`);
    assert.equal(c.soilUsed, layout.soil_used, `${layout.id} soil used`);
    assert.equal(c.plantable, 120 - layout.soil_used);
  }
  const iridium = data.greenhouse.sprinklers.find((s) => s.id === 'iridium');
  assert.equal(iridium.positions.length, 6, 'the wiki optimal layout uses 6 iridium sprinklers');
});

test('a layout with a gap is caught', () => {
  const c = sprinklerCoverage({ radius: 2, positions: [[2, 2]] }, data.greenhouse);
  assert.ok(c.unwatered > 0);
});

test('paintGrid fills plantable tiles in order', () => {
  const c = sprinklerCoverage(data.greenhouse.sprinklers.find((s) => s.id === 'iridium'), data.greenhouse);
  const grid = paintGrid(c, [{ id: 'ancient-fruit', tiles: 100 }, { id: 'starfruit', tiles: 16 }]);
  assert.equal(grid.filter((t) => t.crop === 'ancient-fruit').length, 100);
  assert.equal(grid.filter((t) => t.crop === 'starfruit').length, 16);
  assert.equal(grid.filter((t) => t.kind === 'sprinkler').length, 4);
});

test('machine runs use 1,600 minutes per day', () => {
  assert.equal(runsIn(28, 10000), 4, 'wine: 4 full runs in 28 days');
  assert.equal(runsIn(28, 4000), 11, 'jelly: 11 runs');
  assert.equal(runsIn(0, 4000), 0);
});

test('keg vs jar: per item the keg wins for valuable fruit, per machine-day the jar can win', () => {
  const r = allocate(crop('starfruit'), data.machines, { items: 0, counts: {}, days: 28 });
  const keg = r.options.find((o) => o.machine === 'keg');
  const jar = r.options.find((o) => o.machine === 'preserves-jar');
  assert.equal(keg.price, 2250);
  assert.equal(jar.price, 1550);
  assert.ok(keg.gainPerItem > jar.gainPerItem);
  assert.ok(jar.gainPerMachineDay > keg.gainPerMachineDay, 'jar: 800g gain every 2.5 days beats 1,500g every 6.25 days');
});

test('keg vs jar: break-even at 50g for fruit and 200g for vegetables', () => {
  const gain = (c) => {
    const o = allocate(c, data.machines, { items: 0, counts: {}, days: 28 }).options;
    return o.find((x) => x.machine === 'keg').gainPerItem - o.find((x) => x.machine === 'preserves-jar').gainPerItem;
  };
  assert.ok(gain(crop('blueberry')) === 0, 'blueberry (50g): keg and jar earn the same');
  assert.ok(gain(crop('cranberries')) > 0);
  assert.ok(gain(crop('pumpkin')) > 0, 'pumpkin (320g): juice beats pickles');
  assert.ok(gain(crop('cauliflower')) < 0, 'cauliflower (175g): pickles beat juice');
});

test('allocation fills the better machine first and sells the rest raw', () => {
  const r = allocate(crop('starfruit'), data.machines, { items: 100, counts: { keg: 10, 'preserves-jar': 5 }, days: 28 });
  const [first, second, rest] = r.plan;
  assert.deepEqual([first.product, first.items], ['wine', 40]);
  assert.deepEqual([second.product, second.items], ['jelly', 55]);
  assert.deepEqual([rest.product, rest.items], ['raw', 5]);
  assert.equal(r.total, 40 * 2250 + 55 * 1550 + 5 * 750);
  assert.equal(r.extra, r.total - 100 * 750);
});

test('coffee needs 5 beans per run; remainders stay raw', () => {
  const r = allocate(crop('coffee-bean'), data.machines, { items: 12, counts: { keg: 1 }, days: 1 });
  assert.equal(r.plan[0].product, 'coffee');
  assert.equal(r.plan[0].items, 10);
  assert.equal(r.plan[1].items, 2);
});

test('established regrowing crops harvest from day one of the window', () => {
  const s = harvestSchedule(crop('ancient-fruit'), { plantSeason: 'spring', greenhouse: true, horizonDays: 112, established: true, ...SEASONS });
  assert.equal(s.harvests[0], 7);
  assert.equal(s.harvests.length, 16);
  const r = cropProfit(crop('ancient-fruit'), data, { greenhouse: true, horizonDays: 112, established: true, sellAs: 'wine', artisan: true });
  assert.equal(r.seedCost, 0);
  assert.equal(r.profit, 16 * 2310);
});

test("'best' picks the most valuable way to sell", () => {
  assert.equal(cropProfit(crop('starfruit'), data, { sellAs: 'best' }).sellAs, 'wine');
  assert.equal(cropProfit(crop('blueberry'), data, { plantSeason: 'summer', sellAs: 'best' }).sellAs, 'wine');
  assert.equal(cropProfit(crop('tulip'), data, { sellAs: 'best' }).sellAs, 'raw');
  assert.equal(cropProfit(crop('cauliflower'), data, { sellAs: 'best' }).sellAs, 'pickles');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { json, data } from './helpers.js';
import { cropProfit } from '../../assets/js/engine/profit.js';
import { harvestSchedule } from '../../assets/js/engine/growth.js';

const gi = json('data/ginger-island.json');
const guide = json('data/answers.json').guides.ginger_island;
const crops = json('data/crops.json').crops.filter((c) => c.verification_status === 'cross-checked');
const fruittrees = json('data/fruittrees.json');

test('ginger-island.json: every fact has wiki evidence, unlock costs add up to the stated total', () => {
  assert.equal(gi.walnuts.unlocks.reduce((s, u) => s + u.walnuts, 0), gi.walnuts.all_unlocks.value);
  for (const u of gi.walnuts.unlocks) assert.ok(u.evidence.length >= 1 && u.sources.every((s) => s.revid > 0), u.id);
  assert.deepEqual(gi.getting_there.boat_repair.value.map((b) => b.item), ['Hardwood', 'Iridium Bar', 'Battery Pack']);
  assert.equal(gi.getting_there.boat_repair.sources.length, 4, 'boat materials checked on the Fish Shop page and each material page');
  assert.ok(gi.getting_there.ticket.sources.length >= 2);
  for (const f of Object.values(gi.farm)) assert.ok(f.evidence.length >= 1, JSON.stringify(f).slice(0, 40));
});

test('Island Trader saplings agree with fruittrees.json', () => {
  for (const t of gi.trader.trades.filter((x) => x.tree)) {
    const tree = fruittrees.trees.find((x) => x.id === t.tree);
    assert.deepEqual(tree.sapling_prices.island_trader, { item: t.item, qty: t.qty }, t.id);
  }
});

test('irrigated Taro Root: 7-day stages from the wiki give 15 harvests in a 112-day island year', () => {
  const taro = gi.irrigated.crops.find((x) => x.crop === 'taro-root');
  assert.deepEqual(taro.phase_days, [1, 1, 2, 3]);
  const c = crops.find((x) => x.id === 'taro-root');
  const s = harvestSchedule({ ...c, phase_days: taro.phase_days }, { plantSeason: 'spring', seasons: data.seasons.seasons, greenhouse: true, horizonDays: 112 });
  assert.equal(s.harvests.length, 15);
  assert.equal(guide.irrigated.find((x) => x.id === 'taro-root').harvests, 15);
});

test('guide ranking matches the Crop Profit Calculator in island mode (a 112-day all-season year)', () => {
  for (const row of guide.crops.slice(0, 10)) {
    const c = crops.find((x) => x.id === row.id);
    const r = cropProfit(c, data, { greenhouse: true, horizonDays: 112, established: true, sellAs: 'raw' });
    assert.equal(row.raw, Math.round(r.profit), row.id);
  }
  for (let i = 1; i < guide.crops.length; i++) assert.ok(guide.crops[i - 1].raw >= guide.crops[i].raw);
  assert.ok(guide.crops.some((c) => c.id === 'cactus-fruit'), 'Cactus Fruit grows on the island farm');
  assert.equal(guide.to_farmhouse, 31);
  assert.deepEqual(guide.frog.crops.map((c) => c.id), ['melon', 'wheat', 'garlic']);
});

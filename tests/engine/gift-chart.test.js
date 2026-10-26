import { test } from 'node:test';
import assert from 'node:assert/strict';
import { json } from './helpers.js';
import { buildGiftChart, birthdayCrop, yearOneSeed } from '../../tools/build/gift-chart.mjs';
import { tasteOf } from '../../assets/js/engine/gifts.js';

const gifts = json('data/gifts.json');
const yearOne = json('data/year-one.json');
const crops = json('data/crops.json').crops.filter((c) => c.verification_status === 'cross-checked');
const fish = json('data/fish.json');
const chart = buildGiftChart({ gifts, yearOne, fish }, crops);
const v = (id) => gifts.villagers.find((x) => x.id === id);
const crop = (id) => crops.find((c) => c.id === id);

test('every villager is on the chart, in birthday order', () => {
  assert.equal(chart.villagers.length, gifts.villagers.length);
  const order = ['spring', 'summer', 'fall', 'winter'];
  const key = (r) => order.indexOf(r.birthday.season) * 100 + r.birthday.day;
  for (let i = 1; i < chart.villagers.length; i++) assert.ok(key(chart.villagers[i - 1]) < key(chart.villagers[i]));
});

test('Year 1 seeds: no Oasis and no Pierre Year 2 seeds', () => {
  assert.equal(yearOneSeed(crop('cactus-fruit'), yearOne), null);
  assert.equal(yearOneSeed(crop('garlic'), yearOne), null);
  assert.deepEqual(yearOneSeed(crop('parsnip'), yearOne), { shop: 'pierre', price: 20 });
});

test('birthday crop: loved first, ready by the date or kept from an earlier season', () => {
  // Pam loves Parsnip: 4 days, so planted by Spring 14 it is ready on Spring 18.
  assert.deepEqual(
    (({ id, taste, plant_by }) => ({ id, taste, plant_by }))(birthdayCrop(v('pam'), gifts, crops, yearOne)),
    { id: 'parsnip', taste: 'love', plant_by: 14 },
  );
  // Krobus (Winter 1) loves Pumpkin, grown in Fall and kept.
  const k = birthdayCrop(v('krobus'), gifts, crops, yearOne);
  assert.equal(k.id, 'pumpkin');
  assert.equal(k.plant_by, null);
  assert.equal(k.grown_in, 'fall');
  // Kent's birthday is Spring 4: nothing from seed is ready yet.
  assert.equal(birthdayCrop(v('kent'), gifts, crops, yearOne), null);
  for (const r of chart.villagers) {
    const b = r.birthday_crop;
    if (!b) continue;
    assert.ok(['love', 'like'].includes(tasteOf(b.id, v(r.id), gifts)), `${r.name} ${b.id}`);
    if (b.plant_by != null) assert.ok(b.plant_by >= 1 && b.plant_by + crop(b.id).growth_days <= r.birthday.day, `${r.name} ${b.id}`);
  }
});

test('season lists: most villagers pleased first, with who to skip', () => {
  for (const s of ['spring', 'summer', 'fall']) {
    const list = chart.seasons[s];
    assert.ok(list.length >= 3, s);
    for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].pleased >= list[i].pleased);
    for (const c of list) assert.equal(c.pleased + c.avoid.length <= gifts.villagers.length, true);
  }
  assert.deepEqual(chart.seasons.winter, []);
});

test('fish gifts: named loves such as Willy and the Catfish', () => {
  const cat = chart.fish.find((f) => f.id === 'catfish');
  assert.ok(cat.love.includes('Willy'));
});

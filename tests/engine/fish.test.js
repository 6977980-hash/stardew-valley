import { test } from 'node:test';
import assert from 'node:assert/strict';
import { json } from './helpers.js';
import { bites, findFish, fishAreas, timeLabel, seasonLabel, hourLabel } from '../../assets/js/engine/fish.js';
import { parseTime, parseSeasons, infoboxSeasons } from '../../tools/data/import-fish.mjs';

const data = json('data/fish.json');
const fish = (id) => data.fish.find((f) => f.id === id);

test('fish.json: every fish cross-checked between the Fish page and its own page', () => {
  assert.ok(data.fish.length >= 60);
  for (const f of data.fish) {
    assert.equal(f.verification_status, 'cross-checked', f.id);
    assert.ok(f.sources.length >= 2 && f.sources.every((s) => s.revid > 0), f.id);
    assert.ok(fishAreas(f).length >= 1 || /Forest Farm|Ghost/.test(f.locations.join()), `${f.id} has an area`);
  }
  assert.equal(data.fish.filter((f) => f.kind === 'legendary').length, 5);
});

test('fish prices agree with fishponds.json', () => {
  for (const p of json('data/fishponds.json').fish) {
    const f = fish(p.id);
    if (f) assert.equal(f.base_price, p.base_price, p.id);
  }
});

test('wiki cell parsers: times past midnight, Rain Totem seasons, place notes', () => {
  assert.deepEqual(parseTime('6am – 11am 7pm – 2am'), [[6, 11], [19, 26]]);
  assert.deepEqual(parseTime('Anytime'), [[6, 26]]);
  assert.deepEqual(parseTime('6am – 12am'), [[6, 24]]);
  const s = parseSeasons('{{Season|Spring}}<br />{{Season|Fall}}<br />({{Season|Spring}} &amp;<br />{{Season|Summer}} in [[Secret Woods|Secret Woods Pond]])<br />{{Season|Winter}} with [[Rain Totem]]');
  assert.deepEqual(s.seasons, ['spring', 'fall']);
  assert.deepEqual(s.rain_totem, ['winter']);
  assert.equal(s.notes.length, 1);
  assert.deepEqual(infoboxSeasons('{{Season|Fall}} • {{Season|Winter}} with [[Rain Totem]]'), ['fall']);
  assert.deepEqual(infoboxSeasons('{{Season|Spring}} • {{Season|Summer}} • {{Season|Fall}} in [[The Mountain|The Mountain Lake]]<br />\n{{Season|Any}} in [[Secret Woods]]'), ['spring', 'summer', 'fall', 'winter']);
});

test('bites: season, weather, hour and place as the wiki states them', () => {
  const catfish = fish('catfish');
  assert.ok(bites(catfish, { season: 'spring', weather: 'rain', hour: 10, area: 'river' }));
  assert.ok(!bites(catfish, { season: 'spring', weather: 'sun' }), 'Catfish needs rain');
  assert.ok(!bites(catfish, { season: 'spring', weather: 'rain', hour: 25 }), 'Catfish stops at midnight');
  assert.ok(bites(catfish, { season: 'winter', weather: 'rain' }), 'Winter with a Rain Totem');
  assert.ok(!bites(catfish, { season: 'winter' }));
  const puffer = fish('pufferfish');
  assert.ok(!bites(puffer, { season: 'winter', area: 'ocean' }));
  assert.ok(bites(puffer, { season: 'winter', area: 'island' }), 'all year on Ginger Island');
  assert.ok(bites(fish('lionfish'), { season: 'winter' }));
  assert.ok(!bites(fish('squid'), { hour: 12 }));
  assert.ok(bites(fish('squid'), { hour: 25, season: 'winter', area: 'ocean' }));
  assert.ok(bites(fish('lobster'), { area: 'crab-pot', season: 'summer', weather: 'rain' }));
});

test('findFish sorts by price and labels read like the wiki', () => {
  const all = findFish(data, {});
  assert.equal(all.length, data.fish.length);
  for (let i = 1; i < all.length; i++) assert.ok(all[i - 1].base_price >= all[i].base_price);
  assert.ok(!findFish(data, {}, { legendary: false }).some((f) => f.kind === 'legendary'));
  assert.equal(timeLabel([[6, 19]]), '6am–7pm');
  assert.equal(timeLabel([[6, 26]]), 'Any time');
  assert.equal(hourLabel(24), '12am');
  assert.equal(seasonLabel(fish('walleye')), 'Fall (Winter with a Rain Totem)');
  assert.equal(seasonLabel(fish('blobfish')), 'Winter 15–17');
});

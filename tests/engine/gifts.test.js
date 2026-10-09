import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tasteOf, itemsAt, villagersFor, giftPoints, heartsFor } from '../../assets/js/engine/gifts.js';
import { json } from './helpers.js';

const gifts = json('data/gifts.json');
const v = (id) => gifts.villagers.find((x) => x.id === id);

test('a villager\'s own list wins, then the universal list, then recorded exceptions', () => {
  assert.equal(tasteOf('salmon-dinner', v('alex'), gifts), 'love');
  assert.equal(tasteOf('pearl', v('alex'), gifts), 'love'); // universal love
  assert.equal(tasteOf('prismatic-shard', v('haley'), gifts), 'hate'); // wiki exception
  assert.equal(tasteOf('rabbits-foot', v('penny'), gifts), 'hate');
  assert.equal(tasteOf('amethyst', v('abigail'), gifts), 'love');
});

test('items nobody lists are unknown, not guessed', () => {
  assert.equal(tasteOf('not-an-item', v('alex'), gifts), null);
});

test('itemsAt includes universal items that still apply and leaves out overridden ones', () => {
  const haleyLoves = itemsAt('love', v('haley'), gifts);
  assert.ok(!haleyLoves.includes('prismatic-shard'));
  assert.ok(itemsAt('hate', v('haley'), gifts).includes('prismatic-shard'));
  assert.ok(itemsAt('love', v('alex'), gifts).includes('pearl'));
});

test('villagersFor splits all villagers across the groups', () => {
  const g = villagersFor('pearl', gifts);
  const total = Object.values(g).reduce((s, a) => s + a.length, 0);
  assert.equal(total, gifts.villagers.length);
  assert.ok(g.love.length > 20);
});

test('gift points: base, quality, birthday, Winter Star, Friendship 101', () => {
  const fr = gifts.friendship;
  assert.equal(giftPoints('love', fr), 80);
  assert.equal(giftPoints('like', fr), 45);
  assert.equal(giftPoints('love', fr, { quality: 'iridium', event: 'birthday' }), 960);
  assert.equal(giftPoints('love', fr, { quality: 'gold', event: 'birthday' }), 800);
  assert.equal(giftPoints('neutral', fr, { quality: 'gold' }), 20);
  assert.equal(giftPoints('hate', fr, { friendship101: true }), -40);
  assert.equal(giftPoints('love', fr, { friendship101: true }), 88);
  assert.equal(giftPoints('love', fr, { event: 'winter_star' }), 400);
  assert.equal(heartsFor(960), 3.84);
});

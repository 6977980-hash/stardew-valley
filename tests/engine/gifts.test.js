import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tasteOf, tasteWhy, itemsAt, villagersFor, giftPoints, heartsFor } from '../../assets/js/engine/gifts.js';
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

test('universal categories count: Parsnip is a universal like (All Vegetables)', () => {
  assert.deepEqual(tasteWhy('parsnip', v('alex'), gifts), { taste: 'like', via: 'universal-category', category: 'all-vegetables' });
  // Abigail's own "All Vegetables" dislike beats the universal like.
  assert.equal(tasteOf('parsnip', v('abigail'), gifts), 'dislike');
  assert.equal(tasteOf('pumpkin', v('abigail'), gifts), 'love');
  const by = villagersFor('parsnip', gifts);
  assert.ok(by.like.length > 20, `liked by ${by.like.length}`);
  assert.equal(by.unknown.length, 0);
});

test('Tulip is liked except where a villager names flowers; Poppy is hated except by Penny', () => {
  const tulip = villagersFor('tulip', gifts);
  assert.ok(tulip.like.length > 20);
  for (const id of ['sebastian', 'clint', 'george']) assert.equal(tasteOf('tulip', v(id), gifts), 'dislike', id);
  assert.equal(tasteOf('poppy', v('penny'), gifts), 'love');
  assert.equal(tasteOf('poppy', v('alex'), gifts), 'hate');
});

test('category exceptions: tree fruit for "All Fruit (except Fruit Tree Fruit)", Honey for Jas', () => {
  // Alex: All Fruit is neutral except tree fruit, so an Apple falls to the universal tree-fruit like.
  assert.deepEqual(tasteWhy('apple', v('alex'), gifts), { taste: 'like', via: 'universal-category', category: 'all-fruit-trees' });
  assert.equal(tasteOf('strawberry', v('alex'), gifts), 'neutral');
  // Jas hates artisan goods "except Honey, Jelly, universally liked".
  assert.equal(tasteOf('honey', v('jas'), gifts), 'like');
  assert.equal(tasteOf('wine', v('jas'), gifts), 'hate');
});

test('a category with no member list is never guessed', () => {
  const fish = gifts.categories.find((c) => c.id === 'all-fish');
  assert.equal(fish.members, null);
  const tree = gifts.categories.find((c) => c.id === 'all-fruit-trees');
  assert.deepEqual(tree.members, ['apple', 'apricot', 'banana', 'cherry', 'mango', 'orange', 'peach', 'pomegranate']);
  for (const id of ['apple', 'peach', 'starfruit', 'ancient-fruit']) assert.ok(gifts.items.some((i) => i.id === id), id);
});

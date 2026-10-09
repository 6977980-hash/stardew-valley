// Gift Finder: a villager's loved and liked gifts, or every villager's opinion of one item.
import { TASTES, tasteOf, itemsAt, villagersFor, giftPoints, heartsFor } from '../engine/index.js';
import { loadData, bindTool, esc, num } from './common.js';

const g = loadData().gifts;
const form = document.getElementById('gift-form');
const tool = form.closest('.tool');
const out = tool.querySelector('[data-results]');
const summary = tool.querySelector('[data-summary]');
const MONTH = { spring: 'Spring', summer: 'Summer', fall: 'Fall', winter: 'Winter' };
const LABEL = { love: 'Loves', like: 'Likes', neutral: 'Neutral', dislike: 'Dislikes', hate: 'Hates' };
const PAST = { love: 'Loved', like: 'Liked', neutral: 'Neutral', dislike: 'Disliked', hate: 'Hated' };
const nameOf = (id) => g.names[id] || id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
const sortNames = (ids) => ids.map(nameOf).sort((a, b) => a.localeCompare(b));
const list = (names) => `<ul class="gift-list">${names.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`;
const pts = (n) => `${n > 0 ? '+' : ''}${num(n)}`;

function pointsTable(v) {
  const opts = { quality: v.quality, event: v.event, friendship101: v.friendship101 };
  return `<table class="results-table">
    <caption class="visually-hidden">Friendship points for one gift</caption>
    <thead><tr><th scope="col">Taste</th><th scope="col" class="num">Points</th><th scope="col" class="num">Hearts</th></tr></thead>
    <tbody>${TASTES.map((t) => {
      const p = giftPoints(t, g.friendship, opts);
      return `<tr><th scope="row">${PAST[t]}</th><td class="num">${pts(p)}</td><td class="num">${p >= 0 ? '+' : ''}${(Math.round(heartsFor(p) * 100) / 100).toString()}</td></tr>`;
    }).join('')}</tbody></table>`;
}

function renderVillager(v) {
  const vil = g.villagers.find((x) => x.id === v.villager) || g.villagers[0];
  const loves = itemsAt('love', vil, g);
  const likes = itemsAt('like', vil, g);
  const bd = vil.birthday ? `${MONTH[vil.birthday.season]} ${vil.birthday.day}` : 'unknown';
  summary.innerHTML = `<strong>${esc(vil.name)}</strong>: birthday ${esc(bd)}${vil.marry ? ', can be married' : ''}. Loves ${loves.length} items and likes ${likes.length} more by name.`;
  const block = (level) => {
    const ids = itemsAt(level, vil, g);
    const cats = vil.tastes[level].categories;
    return `<section class="gift-block"><h3>${LABEL[level]}</h3>${ids.length ? list(sortNames(ids)) : '<p class="table-note">Nothing listed by name.</p>'}${cats.length ? `<p class="table-note">Also by category:</p>${list(cats)}` : ''}</section>`;
  };
  out.innerHTML = `<div class="gift-grid">${block('love')}${block('like')}</div>
    <h3>What one gift is worth</h3>${pointsTable(v)}
    <details class="gift-more"><summary>Neutral, disliked and hated gifts</summary><div class="gift-grid">${block('neutral')}${block('dislike')}${block('hate')}</div></details>`;
}

function renderItem(v) {
  const id = g.names[v.item] ? v.item : Object.keys(g.names)[0];
  const by = villagersFor(id, g);
  const loved = by.love.length;
  summary.innerHTML = `<strong>${esc(nameOf(id))}</strong>: loved by ${loved} villager${loved === 1 ? '' : 's'}, liked by ${by.like.length}, hated by ${by.hate.length}.`;
  const rows = [...TASTES, 'unknown']
    .filter((t) => by[t].length)
    .map((t) => `<tr><th scope="row">${t === 'unknown' ? 'Not listed' : LABEL[t]}</th><td>${esc(by[t].map((x) => x.name).join(', '))}</td><td class="num col-hide-sm">${t === 'unknown' ? '—' : pts(giftPoints(t, g.friendship, { quality: v.quality, event: v.event, friendship101: v.friendship101 }))}</td></tr>`)
    .join('');
  out.innerHTML = `<div class="table-wrap"><table class="results-table">
    <caption class="visually-hidden">What each villager thinks of ${esc(nameOf(id))}</caption>
    <thead><tr><th scope="col">Opinion</th><th scope="col">Villagers</th><th scope="col" class="num col-hide-sm">Points</th></tr></thead>
    <tbody>${rows}</tbody></table></div>
    ${by.unknown.length ? '<p class="table-note">“Not listed” villagers have no opinion recorded by name for this item. It may fall under a category such as “All Fruit”, or count as neutral.</p>' : ''}`;
}

function render(v) {
  const item = v.mode === 'item';
  form.querySelector('[name=villager]').closest('.field').hidden = item;
  form.querySelector('[name=item]').closest('.field').hidden = !item;
  if (item) renderItem(v);
  else renderVillager(v);
}

bindTool({ form, storageKey: 'st:gifts', render });

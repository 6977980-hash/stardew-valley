// Crafting Calculator: a shopping list of raw materials for everything you want to craft.
import { shoppingList, cleanList, listParam, startingList, LIST_MAX as MAX } from '../engine/crafting.js';
import { loadData, bindTool, esc, num, gold, plural } from './common.js';

const crafting = loadData().crafting;
const form = document.getElementById('craft-form');
const tool = form.closest('.tool');
const listEl = tool.querySelector('[data-list]');
const summary = tool.querySelector('[data-summary]');
const out = tool.querySelector('[data-results]');
const madeEl = tool.querySelector('[data-made]');
const KEY = 'st:craft-list';

const clean = (rows) => cleanList(rows, crafting);

let saved = [];
try {
  saved = JSON.parse(localStorage.getItem(KEY) || '[]') || [];
} catch {
  saved = [];
}
// A shared link's list wins, but is only saved here once the visitor changes it. A ?recipe= link
// shows that recipe; the saved list waits in `held` until "Show my list" or "Add to list".
let { list, held } = startingList({ search: location.search, saved, crafting });
const unhold = () => {
  if (!held.length) return;
  list = clean([...held, ...list]);
  held = [];
};
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* private mode: the list lasts until the page is closed */
  }
};
const nameOf = (id) => (crafting.recipes.find((r) => r.id === id) || {}).name || id;

let last = {};
function render(v) {
  last = v;
  const qty = Math.min(MAX, Math.max(1, parseInt(v.qty, 10) || 1));
  const wanted = list.length ? list : [{ id: v.recipe, qty }];
  const res = shoppingList(wanted, crafting, { trapper: v.trapper, year2: v.year2 });

  listEl.innerHTML = list.length
    ? `<ul class="craft-list">${list.map((w, i) => `<li><span>${num(w.qty)} × ${esc(nameOf(w.id))}</span> <button type="button" class="link-button" id="craft-remove-${i}" data-remove="${i}" aria-label="Remove ${esc(nameOf(w.id))} from the list">Remove</button></li>`).join('')}</ul>`
    : held.length
      ? `<p class="table-note">This shows the recipe from your link. Your saved list (${plural(held.length, 'item')}) is kept. <button type="button" class="link-button" data-show-list>Show my list</button></p>`
      : '<p class="table-note">Nothing on the list yet, so this shows the recipe selected above. Press “Add to list” to build a list.</p>';

  const unpriced = res.unpriced.length ? ` Not for sale, so not counted: ${esc(res.unpriced.join(', '))}.` : '';
  summary.innerHTML = res.materials.length
    ? `You need <strong>${plural(res.materials.length, 'different material')}</strong>. ${res.buyCost > 0 ? `Buying every part a shop sells would cost <strong>${gold(res.buyCost)}</strong>.` : 'None of these parts are sold in shops.'}${unpriced}`
    : 'Pick a recipe to see what it needs.';

  out.innerHTML = `<table class="results-table">
    <caption class="visually-hidden">Raw materials needed</caption>
    <thead><tr><th scope="col">Material</th><th scope="col" class="num">Amount</th><th scope="col" class="num col-hide-sm">Shop price</th><th scope="col" class="num">Shop cost</th></tr></thead>
    <tbody>${res.materials.map((m) => `<tr><th scope="row">${esc(m.name)}</th><td class="num">${num(m.qty)}</td><td class="num col-hide-sm">${m.unit == null ? '—' : gold(m.unit)}</td><td class="num">${m.cost == null ? '—' : gold(m.cost)}</td></tr>`).join('')}</tbody></table>`;

  madeEl.innerHTML = res.made.length
    ? `<table class="results-table">
    <caption class="visually-hidden">Made ingredients to craft or smelt first</caption>
    <thead><tr><th scope="col">Make first</th><th scope="col" class="num">Needed</th><th scope="col" class="num">Crafts or smelts</th></tr></thead>
    <tbody>${res.made.map((m) => `<tr><th scope="row">${esc(m.name)}</th><td class="num">${num(m.need)}</td><td class="num">${num(m.crafts)}</td></tr>`).join('')}</tbody></table>`
    : '';
}

const tool$ = bindTool({
  form,
  storageKey: 'st:craft',
  render,
  assumes: (v) => ({ first: [v.year2 ? 'Year 2+ shop prices' : 'Year 1 shop prices'] }),
  own: { keys: ['list'], query: () => ({ list: listParam(list) }) },
  // Reset empties the list too, so the page is back to how it first opened.
  onReset: () => {
    list = [];
    held = [];
    save();
  },
});

form.querySelector('[data-add]').addEventListener('click', () => {
  unhold();
  const qty = Math.min(MAX, Math.max(1, parseInt(last.qty, 10) || 1));
  const same = list.find((w) => w.id === last.recipe);
  if (same) same.qty = Math.min(MAX, same.qty + qty);
  else list.push({ id: last.recipe, qty });
  save();
  tool$.refresh();
});
listEl.addEventListener('click', (e) => {
  if (e.target.closest('[data-show-list]')) {
    unhold();
    tool$.refresh();
    listEl.setAttribute('tabindex', '-1');
    listEl.focus();
    return;
  }
  const b = e.target.closest('[data-remove]');
  if (!b) return;
  const i = Number(b.dataset.remove);
  list.splice(i, 1);
  save();
  tool$.refresh();
  // Keep keyboard focus in the list: the next Remove button, the one before, or the list itself.
  const next = document.getElementById(`craft-remove-${Math.min(i, list.length - 1)}`);
  if (next) next.focus();
  else {
    listEl.setAttribute('tabindex', '-1');
    listEl.focus();
  }
});

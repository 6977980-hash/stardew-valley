// Crafting Calculator: a shopping list of raw materials for everything you want to craft.
import { shoppingList } from '../engine/index.js';
import { loadData, bindTool, esc, num, gold } from './common.js';

const crafting = loadData().crafting;
const form = document.getElementById('craft-form');
const tool = form.closest('.tool');
const listEl = tool.querySelector('[data-list]');
const summary = tool.querySelector('[data-summary]');
const out = tool.querySelector('[data-results]');
const madeEl = tool.querySelector('[data-made]');
const KEY = 'st:craft-list';

let list = [];
try {
  list = (JSON.parse(localStorage.getItem(KEY) || '[]') || []).filter((w) => crafting.recipes.some((r) => r.id === w.id) && w.qty > 0);
} catch {
  list = [];
}
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
  const qty = Math.min(999, Math.max(1, parseInt(v.qty, 10) || 1));
  const wanted = list.length ? list : [{ id: v.recipe, qty }];
  const res = shoppingList(wanted, crafting, { trapper: v.trapper, year2: v.year2 });

  listEl.innerHTML = list.length
    ? `<ul class="craft-list">${list.map((w, i) => `<li><span>${num(w.qty)} × ${esc(nameOf(w.id))}</span> <button type="button" class="link-button" data-remove="${i}" aria-label="Remove ${esc(nameOf(w.id))} from the list">Remove</button></li>`).join('')}</ul>`
    : '<p class="table-note">Nothing on the list yet, so this shows the recipe selected above. Press “Add to list” to build a list.</p>';

  const unpriced = res.unpriced.length ? ` Not for sale, so not counted: ${esc(res.unpriced.join(', '))}.` : '';
  summary.innerHTML = res.materials.length
    ? `You need <strong>${res.materials.length} different materials</strong>. Buying every part a shop sells would cost <strong>${gold(res.buyCost)}</strong>.${unpriced}`
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

bindTool({ form, storageKey: 'st:craft', render });

form.querySelector('[data-add]').addEventListener('click', () => {
  const qty = Math.min(999, Math.max(1, parseInt(last.qty, 10) || 1));
  const same = list.find((w) => w.id === last.recipe);
  if (same) same.qty = Math.min(999, same.qty + qty);
  else list.push({ id: last.recipe, qty });
  save();
  render(last);
});
listEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-remove]');
  if (!b) return;
  list.splice(Number(b.dataset.remove), 1);
  save();
  render(last);
});

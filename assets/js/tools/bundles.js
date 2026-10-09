// Bundle Tracker: tick off bundle items, see room progress and what is still missing.
// Everything is kept in this browser (localStorage); nothing is sent anywhere.
import { itemKeys, isChoice, isDone, filled, slotsOf, activeBundles, roomProgress, stillNeeded } from '../engine/index.js';
import { loadData, esc, num, gold } from './common.js';

const data = loadData().bundles;
const tool = document.querySelector('.tool');
const roomsEl = tool.querySelector('[data-rooms]');
const out = tool.querySelector('[data-results]');
const summary = tool.querySelector('[data-summary]');
const hint = tool.querySelector('[data-remix-hint]');
const KEY = 'st:bundles';

let state = { set: 'standard', ticked: {}, mine: [] };
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (saved && typeof saved === 'object') state = { set: saved.set === 'remixed' ? 'remixed' : 'standard', ticked: saved.ticked || {}, mine: saved.mine || [] };
} catch {
  /* start fresh */
}
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode: ticks last until the page is closed */
  }
};
const QUALITY = { silver: 'silver or better', gold: 'gold or better' };

function bundleHtml(b, open) {
  const ticked = state.ticked[b.id] || [];
  const done = isDone(b, ticked);
  const need = slotsOf(b);
  const keys = itemKeys(b);
  const choice = state.set === 'remixed' && isChoice(b);
  const mine = state.mine.includes(b.id);
  const items = b.items
    ? b.items
        .map((it, i) => {
          const id = `b-${b.id}-${i}`;
          const q = QUALITY[it.quality] ? `, ${QUALITY[it.quality]}` : '';
          const alt = it.group != null ? ' <span class="tag">alternative</span>' : '';
          return `<li><label for="${id}"><input type="checkbox" id="${id}" data-bundle="${esc(b.id)}" data-key="${esc(keys[i])}"${ticked.includes(keys[i]) ? ' checked' : ''}${choice && !mine ? ' disabled' : ''}> ${esc(it.name)}${it.qty > 1 ? ` ×${it.qty}` : ''}${esc(q)}${alt}</label></li>`;
        })
        .join('')
    : `<li><label for="b-${esc(b.id)}-gold"><input type="checkbox" id="b-${esc(b.id)}-gold" data-bundle="${esc(b.id)}" data-key="paid"${ticked.includes('paid') ? ' checked' : ''}${choice && !mine ? ' disabled' : ''}> Pay ${gold(b.gold)}</label></li>`;
  const reward = b.reward ? ` Reward: ${esc(b.reward.name)}${b.reward.qty > 1 ? ` ×${b.reward.qty}` : ''}.` : '';
  const pick = choice ? `<label class="bundle__mine"><input type="checkbox" data-mine="${esc(b.id)}"${mine ? ' checked' : ''}> In my game</label>` : '';
  const slotText = b.items ? `Fill ${need} of ${b.items.length}${b.random_items ? ' (your save shows ' + b.random_items + ' of them)' : ''}.` : 'One payment.';
  return `<details class="bundle${done ? ' is-done' : ''}"${open ? ' open' : ''}><summary>${esc(b.name)} <span class="bundle__count">${Math.min(filled(b, ticked), need)}/${need}${done ? ' ✓' : ''}</span></summary>
    <p class="table-note">${slotText}${reward}</p>${pick}<ul class="bundle__items">${items}</ul></details>`;
}

function render() {
  const set = state.set;
  hint.hidden = set !== 'remixed';
  for (const r of tool.querySelectorAll('[name=bundle-set]')) r.checked = r.value === set;
  const prog = roomProgress(data, set, state);
  const all = data.bundles.filter((b) => b.set === set);
  const active = activeBundles(data, set, state.mine);
  const done = active.filter((b) => isDone(b, state.ticked[b.id] || [])).length;
  const choicesPending = set === 'remixed' && prog.some((p) => p.undecided);
  summary.innerHTML = active.length
    ? `<strong>${done} of ${active.length}</strong> bundles finished${choicesPending ? '. Some rooms still need you to tick which bundles are in your game' : ''}.`
    : `Tick which bundles are in your game to start (${all.length} possible).`;

  const open = new Set([...roomsEl.querySelectorAll('details[data-room][open]')].map((d) => d.dataset.room));
  const openBundles = new Set([...roomsEl.querySelectorAll('details.bundle[open]')].map((d) => d.querySelector('input')?.dataset.bundle).filter(Boolean));
  roomsEl.innerHTML = prog
    .map((p) => {
      const bundles = all.filter((b) => b.room === p.room.id);
      return `<details class="room${p.complete ? ' is-done' : ''}" data-room="${esc(p.room.id)}"${open.has(p.room.id) || open.size === 0 ? ' open' : ''}>
        <summary><strong>${esc(p.room.name)}</strong> <span class="bundle__count">${p.done}/${p.total}${p.complete ? ' ✓' : ''}</span></summary>
        <p class="table-note">${esc(p.room.effect || p.room.reward)}</p>
        ${bundles.map((b) => bundleHtml(b, openBundles.has(b.id))).join('')}</details>`;
    })
    .join('');

  const left = stillNeeded(data, set, state);
  out.innerHTML = left.length
    ? `<table class="results-table">
      <caption class="visually-hidden">Items still needed for unfinished bundles</caption>
      <thead><tr><th scope="col">Item</th><th scope="col" class="num">Bundles</th><th scope="col" class="col-hide-sm">Season</th><th scope="col">Used in</th></tr></thead>
      <tbody>${left.map((r) => `<tr><th scope="row">${esc(r.name)}</th><td class="num">${num(r.bundles.length)}</td><td class="col-hide-sm">${r.seasons && r.seasons.length < 4 ? esc(r.seasons.join(', ')) : 'Any'}</td><td>${esc(r.bundles.join(', '))}</td></tr>`).join('')}</tbody></table>`
    : '<p class="table-note">Nothing left on your active bundles.</p>';
}

roomsEl.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.mine) {
    state.mine = t.checked ? [...new Set([...state.mine, t.dataset.mine])] : state.mine.filter((x) => x !== t.dataset.mine);
  } else if (t.dataset.bundle) {
    const cur = new Set(state.ticked[t.dataset.bundle] || []);
    if (t.checked) cur.add(t.dataset.key);
    else cur.delete(t.dataset.key);
    state.ticked[t.dataset.bundle] = [...cur];
  } else return;
  save();
  render();
});
for (const r of tool.querySelectorAll('[name=bundle-set]')) {
  r.addEventListener('change', () => {
    state.set = r.value;
    save();
    render();
  });
}
tool.querySelector('[data-reset]').addEventListener('click', () => {
  if (!confirm('Clear all ticks for both bundle sets?')) return;
  state = { set: state.set, ticked: {}, mine: [] };
  save();
  render();
});

document.documentElement.classList.add('tool-ready');
render();

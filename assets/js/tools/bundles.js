// Bundle Tracker: tick off bundle items, see room progress and what is still missing.
// Everything is kept in this browser (localStorage); nothing is sent anywhere.
import { itemKeys, isChoice, isDone, filled, slotsOf, activeBundles, roomProgress, stillNeeded } from '../engine/bundles.js';
import { loadData, esc, num, gold } from './common.js';

const data = loadData().bundles;
const tool = document.querySelector('.tool');
const roomsEl = tool.querySelector('[data-rooms]');
const out = tool.querySelector('[data-results]');
const summary = tool.querySelector('[data-summary]');
const hint = tool.querySelector('[data-remix-hint]');
const KEY = 'st:bundles';

const byId = new Map(data.bundles.map((b) => [b.id, b]));

/**
 * Saved state, checked piece by piece so an old or damaged copy can't blank the page: unknown
 * bundles and non-list ticks are dropped, and no Remixed slot keeps more bundles than a save has.
 */
function cleanState(saved) {
  const out = { set: 'standard', ticked: {}, mine: [] };
  if (!saved || typeof saved !== 'object') return out;
  out.set = saved.set === 'remixed' ? 'remixed' : 'standard';
  if (saved.ticked && typeof saved.ticked === 'object' && !Array.isArray(saved.ticked)) {
    for (const [id, keys] of Object.entries(saved.ticked)) {
      if (byId.has(id) && Array.isArray(keys)) out.ticked[id] = keys.filter((k) => typeof k === 'string');
    }
  }
  const mine = Array.isArray(saved.mine) ? saved.mine.filter((id) => byId.has(id) && isChoice(byId.get(id))) : [];
  for (const id of new Set(mine)) {
    const g = byId.get(id).remix;
    if (out.mine.filter((x) => byId.get(x).remix.group === g.group).length < g.pick) out.mine.push(id);
  }
  return out;
}

let state = cleanState(null);
try {
  state = cleanState(JSON.parse(localStorage.getItem(KEY) || 'null'));
} catch {
  /* start fresh */
}

/** Bundles of one Remixed slot, and how many of them are ticked as in this save. */
const groupOf = (b) => data.bundles.filter((x) => x.remix && x.remix.group === b.remix.group);
const pickedIn = (b) => groupOf(b).filter((x) => state.mine.includes(x.id)).length;
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
  // A save holds only `pick` of the bundles in this slot; once that many are ticked the rest lock.
  const full = choice && !mine && pickedIn(b) >= b.remix.pick;
  const pick = choice
    ? `<label class="bundle__mine" for="m-${esc(b.id)}"><input type="checkbox" id="m-${esc(b.id)}" data-mine="${esc(b.id)}"${mine ? ' checked' : ''}${full ? ' disabled' : ''}> In my game</label><p class="table-note">A save has ${b.remix.pick} of the ${b.remix.of} bundles marked “In my game” here.${full ? ' Untick one of the others first.' : ''}</p>`
    : '';
  const slotText = b.items ? `Fill ${need} of ${b.items.length}${b.random_items ? ' (your save shows ' + b.random_items + ' of them)' : ''}.` : 'One payment.';
  return `<details class="bundle${done ? ' is-done' : ''}" data-bundle-id="${esc(b.id)}"${open ? ' open' : ''}><summary>${esc(b.name)} <span class="bundle__count">${Math.min(filled(b, ticked), need)}/${need}${done ? ' ✓' : ''}</span></summary>
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

  // The rooms are rebuilt on every tick, so put keyboard focus back on the same box afterwards.
  const focused = document.activeElement && roomsEl.contains(document.activeElement) ? document.activeElement.id : '';
  const open = new Set([...roomsEl.querySelectorAll('details[data-room][open]')].map((d) => d.dataset.room));
  const openBundles = new Set([...roomsEl.querySelectorAll('details.bundle[open]')].map((d) => d.dataset.bundleId));
  roomsEl.innerHTML = prog
    .map((p) => {
      const bundles = all.filter((b) => b.room === p.room.id);
      return `<details class="room${p.complete ? ' is-done' : ''}" data-room="${esc(p.room.id)}"${open.has(p.room.id) || open.size === 0 ? ' open' : ''}>
        <summary><strong>${esc(p.room.name)}</strong> <span class="bundle__count">${p.done}/${p.total}${p.complete ? ' ✓' : ''}</span></summary>
        <p class="table-note">${esc(p.room.effect || p.room.reward)}</p>
        ${bundles.map((b) => bundleHtml(b, openBundles.has(b.id))).join('')}</details>`;
    })
    .join('');
  if (focused) document.getElementById(focused)?.focus();
  renderLeft();
}

// "Still to find": filtered by season, and cut to the first rows until "Show all" is pressed.
const SHORT = 15;
let showAll = false;
function renderLeft() {
  const season = seasonEl ? seasonEl.value : '';
  const left = stillNeeded(data, state.set, state).filter((r) => !season || !r.seasons || r.seasons.includes(season));
  const rows = showAll ? left : left.slice(0, SHORT);
  const when = season ? ` in ${season}` : '';
  out.innerHTML = left.length
    ? `<table class="results-table">
      <caption class="visually-hidden">Items still needed for unfinished bundles${esc(when)}</caption>
      <thead><tr><th scope="col">Item</th><th scope="col" class="num">Qty</th><th scope="col" class="num">Bundles</th><th scope="col" class="col-hide-sm">Season</th><th scope="col">Used in</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><th scope="row">${esc(r.name)}</th><td class="num">${num(r.qty)}${r.qtyNote ? `<span class="cell-sub">${esc(r.qtyNote)}</span>` : ''}</td><td class="num">${num(r.bundles.length)}</td><td class="col-hide-sm">${r.seasons && r.seasons.length < 4 ? esc(r.seasons.join(', ')) : 'Any'}</td><td>${esc(r.bundles.join(', '))}</td></tr>`).join('')}</tbody></table>`
    : `<p class="table-note">Nothing left to find${esc(when)} on your active bundles.</p>`;
  if (moreEl) {
    moreEl.hidden = left.length <= SHORT;
    moreEl.setAttribute('aria-expanded', String(showAll));
    moreEl.textContent = showAll ? 'Show fewer' : `Show all ${num(left.length)} items`;
  }
}
const seasonEl = tool.querySelector('[data-season]');
const moreEl = tool.querySelector('[data-more]');
if (seasonEl) seasonEl.addEventListener('change', renderLeft);
if (moreEl) {
  moreEl.addEventListener('click', () => {
    showAll = !showAll;
    renderLeft();
  });
}

roomsEl.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.mine) {
    state.mine = t.checked ? [...new Set([...state.mine, t.dataset.mine])] : state.mine.filter((x) => x !== t.dataset.mine);
    state = cleanState(state);
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

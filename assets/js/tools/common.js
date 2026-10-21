// Shared helpers for the tool pages: data, form state in the URL (share links) and in
// localStorage (remembered settings), formatting and "Explain the Math" rendering.

export function loadData() {
  const el = document.getElementById('st-data');
  return JSON.parse(el.textContent);
}

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
export const gold = (n) => (n == null || Number.isNaN(n) ? '—' : `${nf0.format(Math.round(n))}g`);
export const num = (n, d = 0) => (d ? nf1.format(n) : nf0.format(Math.round(n)));
/** "1 day", "28 days". */
export const plural = (n, one, many = `${one}s`) => `${num(n)} ${Math.round(n) === 1 ? one : many}`;

/**
 * A number box read as a whole number inside its min and max. Blank or unreadable input gives the
 * fallback (the field's default), or '' when the box has data-blank="none" (blank means no limit).
 * valueAsNumber reads "1e5" as 100,000 where parseInt read 1. `note` says what was changed and is
 * empty when the box already holds a usable value.
 * @param el an <input type="number">, or anything with value, valueAsNumber, min, max and dataset
 * @returns { value: number|'', note: string }
 */
export function readInt(el, fallback) {
  const min = el.min === '' || el.min == null ? -Infinity : Number(el.min);
  const max = el.max === '' || el.max == null ? Infinity : Number(el.max);
  const clamp = (n) => Math.min(max, Math.max(min, n));
  const n = el.valueAsNumber;
  if (n == null || Number.isNaN(n) || !Number.isFinite(n)) {
    if (String(el.value || '').trim() === '' && el.dataset && el.dataset.blank === 'none') return { value: '', note: '' };
    const value = clamp(Math.floor(Number(fallback) || 0));
    return { value, note: `Empty or not a number, so using ${num(value)}.` };
  }
  const whole = Math.floor(n);
  const value = clamp(whole);
  if (value > whole) return { value, note: `The lowest is ${num(min)}, so using ${num(value)}.` };
  if (value < whole) return { value, note: `The highest is ${num(max)}, so using ${num(value)}.` };
  if (whole !== n) return { value, note: `Whole numbers only, so using ${num(value)}.` };
  return { value, note: '' };
}

/** Show, change or remove the "using N instead" line under a number box. */
function fixNote(el, text) {
  const id = `${el.id || el.name}-fix`;
  let p = document.getElementById(id);
  const described = (el.getAttribute('aria-describedby') || '').split(' ').filter((x) => x && x !== id);
  if (!text) {
    if (p) p.remove();
    if (described.length) el.setAttribute('aria-describedby', described.join(' '));
    else el.removeAttribute('aria-describedby');
    return;
  }
  if (!p) {
    p = document.createElement('p');
    p.className = 'field__hint field__fix';
    p.id = id;
    (el.closest('.field') || el.parentElement).appendChild(p);
  }
  p.textContent = text;
  el.setAttribute('aria-describedby', [...described, id].join(' '));
}

/** Bring the result into view and move focus to its summary, for visitors who arrive with settings. */
export function showResult(tool) {
  const target = tool.querySelector('[data-summary]') || tool.querySelector('.tool-results');
  if (!target) return;
  const section = target.closest('.tool-results') || target;
  section.scrollIntoView({ block: 'start', behavior: 'instant' });
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

// "Read the full answer" on phones: the short answer box is clamped by CSS until it is opened.
// (Guarded so the tests can import this module outside a browser.)
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.answer__more');
    if (!b) return;
    const box = b.closest('.answer');
    const open = !box.classList.contains('is-open');
    box.classList.toggle('is-open', open);
    b.setAttribute('aria-expanded', String(open));
    b.textContent = open ? 'Show less' : 'Read the full answer';
  });
}

const store = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode: settings are simply not remembered */
    }
  },
};

// Choices that describe the player's farm rather than one question, shared by every tool that
// has the control. Remembered in this browser only.
const FARM_KEY = 'st:farm';
const FARM_FIELDS = ['level', 'tiller', 'artisan', 'agri', 'rancher', 'shepherd', 'trapper'];

/** Current values of every named control in the form. */
export function readForm(form) {
  const out = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') out[el.name] = el.checked;
    else if (el.type === 'radio') {
      if (el.checked) out[el.name] = el.value;
    } else out[el.name] = el.value;
  }
  return out;
}

function writeForm(form, values) {
  for (const el of form.elements) {
    if (!el.name || !(el.name in values)) continue;
    const v = values[el.name];
    if (el.type === 'checkbox') el.checked = v === true || v === '1' || v === 'true';
    else if (el.type === 'radio') el.checked = el.value === String(v);
    else if (el.tagName === 'SELECT') {
      if ([...el.options].some((o) => o.value === String(v))) el.value = String(v);
    } else el.value = v;
  }
}

// Marker added to links made by this site's own share button and address bar: such a link
// describes the whole form, so a box missing from it is unticked. Any other query string (home
// page quick form, utm_*, fbclid) only overrides the fields it names. Not "s": WordPress
// treats ?s= as a search.
const SHARE_KEY = 'share';

/**
 * The values a tool form opens with. Pure, so it can be tested without a browser.
 * @param o { defaults, search (location.search), saved (this tool's saved copy), farm (shared
 *          farm settings), farmFields, checkboxes (names of checkbox fields) }
 * @returns { values, fromLink, extra } extra = query params that are not form fields
 */
export function initialState({ defaults, search = '', saved = null, farm = null, farmFields = FARM_FIELDS, checkboxes = [], ownKeys = [] }) {
  const params = new URLSearchParams(search);
  const fromUrl = {};
  const extra = [];
  let own = false;
  for (const [k, v] of params) {
    if (k in defaults) fromUrl[k] = v;
    else if (ownKeys.includes(k)) own = true;
    else if (k !== SHARE_KEY) extra.push([k, v]);
  }
  const full = params.get(SHARE_KEY) === '1';
  const mine = farmFields.filter((k) => k in defaults);
  const farmHere = Object.fromEntries(mine.filter((k) => farm && k in farm).map((k) => [k, farm[k]]));
  // A shared link is the whole form: a field it leaves out was at its default, and an unchecked
  // box is simply absent. Otherwise saved farm settings win over this tool's own saved copy, and
  // the link's fields win over both.
  const values = full ? { ...defaults, ...fromUrl } : { ...defaults, ...(saved || {}), ...farmHere, ...fromUrl };
  if (full) for (const k of checkboxes) if (!(k in fromUrl)) values[k] = false;
  return { values, fromLink: full || own || Object.keys(fromUrl).length > 0, extra };
}

/**
 * Query string for the current values: changed fields, state the tool keeps outside the form
 * (`own`, e.g. the crafting list), the share marker, then foreign params.
 */
export function stateQuery(values, defaults, extra = [], own = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(values)) {
    if (v === false) continue;
    if (v !== defaults[k] || v === true) params.set(k, v === true ? '1' : v);
  }
  for (const [k, v] of Object.entries(own)) if (v) params.set(k, v);
  if ([...params.keys()].length) params.set(SHARE_KEY, '1');
  for (const [k, v] of extra) params.append(k, v);
  return params.toString();
}

/**
 * Wires a tool form: restores state (URL first, then saved settings), recalculates on every
 * change and keeps the URL shareable. Settings are saved in this browser only when the visitor
 * changes something, so opening a tool, a link, Reset or "Forget my farm" never writes them.
 * Number boxes are read with readInt: the result uses the corrected value at once, and the box
 * is rewritten (with a note saying why) when the visitor leaves it.
 * @param o.prepare  called before each read, e.g. to set a max that depends on another field
 * @param o.own      { keys, query() } state kept outside the form that belongs in share links
 * @param o.onReset  called when Reset is pressed, before the form is recalculated
 * @returns { refresh() } recalculate and update the address after a change outside the form
 */
export function bindTool({ form, storageKey, render, farmFields = FARM_FIELDS, prepare = null, own = null, onReset = null }) {
  const tool = form.closest('.tool');
  const defaults = readForm(form);
  const checkboxes = [...form.elements].filter((el) => el.type === 'checkbox' && el.name).map((el) => el.name);
  const numbers = [...form.elements].filter((el) => el.type === 'number' && el.name);
  const mine = farmFields.filter((k) => k in defaults);
  const start = initialState({ defaults, search: location.search, saved: store.get(storageKey), farm: store.get(FARM_KEY), farmFields, checkboxes, ownKeys: own ? own.keys : [] });
  writeForm(form, start.values);

  // commit: the visitor left the box (change), or the values came from a link or Reset, so a
  // corrected number is written back. typed: the box being edited, whose old note can go.
  const update = (commit = false, typed = null) => {
    if (prepare) prepare(form);
    const values = readForm(form);
    for (const el of numbers) {
      const r = readInt(el, defaults[el.name]);
      values[el.name] = String(r.value);
      if (r.note) fixNote(el, r.note);
      else if (el === typed || typed === true) fixNote(el, '');
      // Show the number that was used ("1e5" becomes 100000) once the visitor leaves the box.
      if (commit && el.value !== String(r.value)) el.value = r.value;
    }
    render(values);
    const qs = stateQuery(values, defaults, start.extra, own ? own.query() : {});
    history.replaceState(null, '', (qs ? `?${qs}` : location.pathname) + location.hash);
    return values;
  };
  // Only a real edit saves: the tool's own copy and the farm fields shared with other tools.
  const edited = (commit, typed) => {
    const values = update(commit, typed);
    store.set(storageKey, values);
    if (mine.length) store.set(FARM_KEY, { ...(store.get(FARM_KEY) || {}), ...Object.fromEntries(mine.map((k) => [k, values[k]])) });
  };
  form.addEventListener('input', (e) => edited(false, e.target));
  form.addEventListener('change', (e) => edited(true, e.target));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    update(true);
  });

  const reset = form.querySelector('[data-reset]');
  if (reset) {
    reset.addEventListener('click', () => {
      // Back to the page defaults; the shared farm settings are left alone.
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* nothing saved */
      }
      writeForm(form, defaults);
      if (onReset) onReset();
      update(true, true);
    });
  }
  const share = tool.querySelector('[data-share]');
  if (share) share.addEventListener('click', () => copy(location.href, share, 'Link copied'));

  // Say so, and let people forget it. Only on tools that share farm settings.
  if (mine.length && !start.fromLink) {
    const note = document.createElement('p');
    note.className = 'field__hint farm-note';
    note.innerHTML = 'Your farm settings (level and professions) are remembered in this browser and shared by the tools. <button type="button" class="linklike" data-forget-farm>Forget my farm</button>';
    form.appendChild(note);
    note.querySelector('button').addEventListener('click', () => {
      try {
        localStorage.removeItem(FARM_KEY);
        localStorage.removeItem(storageKey);
      } catch {
        /* nothing saved */
      }
      writeForm(form, defaults);
      update(true, true);
    });
  }

  document.documentElement.classList.add('tool-ready');
  update(true);
  // Someone who arrives with settings (the home page planner, a shared link) came for the answer.
  // After the load event: the browser's own jump to #result would otherwise undo the focus.
  if (start.fromLink) {
    if (document.readyState === 'complete') showResult(tool);
    else addEventListener('load', () => setTimeout(() => showResult(tool)), { once: true });
  }
  return { refresh: () => update(), fromLink: start.fromLink };
}

/** Copy text and show a short confirmation in the button's live region. */
export async function copy(text, button, done) {
  const status = button.parentElement.querySelector('[data-copy-status]');
  try {
    await navigator.clipboard.writeText(text);
    if (status) status.textContent = done;
  } catch {
    if (status) status.textContent = 'Copy failed: select the address bar and copy the link';
  }
  setTimeout(() => {
    if (status) status.textContent = '';
  }, 3000);
}

/** "Explain the Math" list from engine steps. */
export function stepsHtml(steps) {
  return `<ol class="math">${steps
    .map((s) => {
      const value = typeof s.value === 'number' ? (/^(growth|regrow|harvests|items)$/.test(s.key) ? num(s.value, 1) : gold(s.value)) : s.value == null ? '—' : esc(s.value);
      return `<li><span class="math__label">${esc(s.label)}</span> <strong class="math__value">${value}</strong>${s.detail ? `<span class="math__detail">${esc(s.detail)}</span>` : ''}</li>`;
    })
    .join('')}</ol>`;
}

export const SELL_LABEL = { raw: 'Sold raw', wine: 'Wine', juice: 'Juice', jelly: 'Jelly', pickles: 'Pickles', beer: 'Beer', 'pale-ale': 'Pale Ale', coffee: 'Coffee' };

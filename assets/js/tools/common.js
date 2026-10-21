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
export function initialState({ defaults, search = '', saved = null, farm = null, farmFields = FARM_FIELDS, checkboxes = [] }) {
  const params = new URLSearchParams(search);
  const fromUrl = {};
  const extra = [];
  for (const [k, v] of params) {
    if (k in defaults) fromUrl[k] = v;
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
  return { values, fromLink: full || Object.keys(fromUrl).length > 0, extra };
}

/** Query string for the current values: changed fields, the share marker, then foreign params. */
export function stateQuery(values, defaults, extra = []) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(values)) {
    if (v === false) continue;
    if (v !== defaults[k] || v === true) params.set(k, v === true ? '1' : v);
  }
  if ([...params.keys()].length) params.set(SHARE_KEY, '1');
  for (const [k, v] of extra) params.append(k, v);
  return params.toString();
}

/**
 * Wires a tool form: restores state (URL first, then saved settings), recalculates on every
 * change and keeps the URL shareable. Settings are saved in this browser only when the visitor
 * changes something, so opening a tool, a link, Reset or "Forget my farm" never writes them.
 */
export function bindTool({ form, storageKey, render, farmFields = FARM_FIELDS }) {
  const defaults = readForm(form);
  const checkboxes = [...form.elements].filter((el) => el.type === 'checkbox' && el.name).map((el) => el.name);
  const mine = farmFields.filter((k) => k in defaults);
  const start = initialState({ defaults, search: location.search, saved: store.get(storageKey), farm: store.get(FARM_KEY), farmFields, checkboxes });
  writeForm(form, start.values);

  const update = () => {
    const values = readForm(form);
    render(values);
    const qs = stateQuery(values, defaults, start.extra);
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
    return values;
  };
  // Only a real edit saves: the tool's own copy and the farm fields shared with other tools.
  const edited = () => {
    const values = update();
    store.set(storageKey, values);
    if (mine.length) store.set(FARM_KEY, { ...(store.get(FARM_KEY) || {}), ...Object.fromEntries(mine.map((k) => [k, values[k]])) });
  };
  form.addEventListener('input', edited);
  form.addEventListener('change', edited);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    update();
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
      update();
    });
  }
  const share = form.closest('.tool').querySelector('[data-share]');
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
      update();
    });
  }

  document.documentElement.classList.add('tool-ready');
  update();
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

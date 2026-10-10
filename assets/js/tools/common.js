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

/**
 * Wires a tool form: restores state (URL first, then saved settings), recalculates on every
 * change, keeps the URL shareable and remembers the settings in this browser.
 */
export function bindTool({ form, storageKey, render, farmFields = FARM_FIELDS }) {
  const defaults = readForm(form);
  const fromUrl = Object.fromEntries(new URLSearchParams(location.search));
  const mine = farmFields.filter((k) => k in defaults);
  const farm = store.get(FARM_KEY) || {};
  const farmHere = Object.fromEntries(mine.filter((k) => k in farm).map((k) => [k, farm[k]]));
  // Saved farm settings win over this tool's own saved copy; a shared link wins over both.
  const saved = { ...(store.get(storageKey) || {}), ...farmHere };
  writeForm(form, Object.keys(fromUrl).length ? { ...saved, ...fromUrl } : saved);
  // Unchecked boxes are absent from a shared URL; a shared link describes the whole state.
  if (Object.keys(fromUrl).length) {
    for (const el of form.elements) if (el.type === 'checkbox' && el.name && !(el.name in fromUrl)) el.checked = false;
  }

  // Opening someone else's link must not overwrite your own saved farm until you change something.
  let fromLink = Object.keys(fromUrl).length > 0;
  const update = () => {
    const values = readForm(form);
    render(values);
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(values)) {
      if (v === false) continue;
      if (v !== defaults[k] || v === true) params.set(k, v === true ? '1' : v);
    }
    const qs = params.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
    store.set(storageKey, values);
    if (mine.length && !fromLink) store.set(FARM_KEY, { ...(store.get(FARM_KEY) || {}), ...Object.fromEntries(mine.map((k) => [k, values[k]])) });
  };
  const edited = () => {
    fromLink = false;
    update();
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
      writeForm(form, defaults);
      update();
    });
  }
  const share = form.closest('.tool').querySelector('[data-share]');
  if (share) share.addEventListener('click', () => copy(location.href, share, 'Link copied'));

  // Say so, and let people forget it. Only on tools that share farm settings.
  if (mine.length && !Object.keys(fromUrl).length) {
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

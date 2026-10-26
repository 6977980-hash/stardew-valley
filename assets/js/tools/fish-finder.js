// Fish Finder: which fish bite for a season, weather, time and place, and where and when to find each.
import { findFish, timeLabel, seasonLabel, hourLabel, AREAS, WEATHER_LABEL } from '../engine/fish.js';
import { loadData, bindTool, esc, gold } from './common.js';

const data = loadData().fish;
const form = document.getElementById('fish-form');
const tool = form.closest('.tool');
const out = tool.querySelector('[data-results]');
const summary = tool.querySelector('[data-summary]');
const KIND = { legendary: 'legendary', 'night-market': 'Night Market', 'crab-pot': 'crab pot' };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function render(v) {
  const conditions = { season: v.season, weather: v.weather, hour: v.hour === 'any' ? null : Number(v.hour), area: v.area };
  const q = (v.q || '').trim().toLowerCase();
  const list = findFish(data, conditions, { sort: v.sort, legendary: v.legendary, crabPots: v.crabpots }).filter((f) => !q || f.name.toLowerCase().includes(q));
  const when = [
    v.season !== 'any' ? `in ${cap(v.season)}` : '',
    v.weather === 'rain' ? 'on a rainy day' : v.weather === 'sun' ? 'on a sunny day' : '',
    v.hour !== 'any' ? `at ${hourLabel(Number(v.hour))}` : '',
    v.area !== 'any' ? `in ${AREAS[v.area]}` : '',
  ].filter(Boolean);
  if (!list.length) {
    summary.textContent = `No fish bite ${when.join(' ') || 'with these settings'}${q ? ` matching "${v.q.trim()}"` : ''}. Try another time or place.`;
    out.innerHTML = '';
    return;
  }
  const top = list[0];
  summary.innerHTML = `<strong>${list.length} fish</strong> ${list.length === 1 ? 'bites' : 'bite'}${when.length ? ` ${esc(when.join(' '))}` : ''}${q ? ` matching "${esc(v.q.trim())}"` : ''}. ${v.sort === 'price' ? `Worth the most: <strong>${esc(top.name)}</strong> (${gold(top.base_price)}).` : ''}`;
  out.innerHTML = `<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens"><table class="results-table">
    <caption class="visually-hidden">Fish that bite with these settings</caption>
    <thead><tr><th scope="col">Fish</th><th scope="col">Where</th><th scope="col">Time</th><th scope="col">Season</th><th scope="col">Weather</th><th scope="col" class="num">Price</th><th scope="col" class="num col-hide-sm">Difficulty</th></tr></thead>
    <tbody>${list
      .map((f) => {
        const tag = KIND[f.kind] ? `<span class="tag">${KIND[f.kind]}</span>` : '';
        const level = f.min_fishing_level ? `<span class="cell-sub">Fishing level ${f.min_fishing_level}+</span>` : '';
        const bundles = f.bundles ? `<span class="cell-sub">${esc([...new Set(f.bundles.filter((b) => b.set === 'standard').map((b) => b.name))].join(', '))}</span>` : '';
        const notes = (f.season_notes || []).filter((n) => !/Ginger Island/.test(n));
        return `<tr><th scope="row">${esc(f.name)}${tag}${bundles}</th>
          <td>${esc(f.locations.join(', '))}${level}</td>
          <td>${esc(timeLabel(f.time))}</td>
          <td>${esc(seasonLabel(f))}${notes.length ? `<span class="cell-sub">${esc(notes.join('; '))}</span>` : ''}</td>
          <td>${WEATHER_LABEL[f.weather]}</td>
          <td class="num">${gold(f.base_price)}</td>
          <td class="num col-hide-sm">${f.difficulty ?? '—'}</td></tr>`;
      })
      .join('')}</tbody></table></div>
    <p class="table-note">Price is the base (normal quality) price without Fisher or Angler. Standard Community Center bundles that take the fish are listed under its name.</p>`;
}

bindTool({ form, storageKey: 'st:fish-finder', render, farmFields: [], assumes: false });

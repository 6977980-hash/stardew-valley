// Fish Pond Calculator: one pond's daily produce, and every fish ranked for a full pond.
import { pondOutput, rankPonds } from '../engine/index.js';
import { loadData, bindTool, esc, gold, num } from './common.js';

const data = loadData().fishponds;
const form = document.getElementById('fish-pond-form');
const tool = form.closest('.tool');
const out = tool.querySelector('[data-results]');
const ranking = tool.querySelector('[data-ranking]');
const summary = tool.querySelector('[data-summary]');
const pct = (n) => `${num(n * 100, 1)}%`;

function render(v) {
  const fish = data.fish.find((f) => f.id === v.fish) || data.fish[0];
  const popInput = form.querySelector('[name="pop"]');
  popInput.max = fish.max_population;
  const opts = { population: parseInt(v.pop, 10) || 1, days: parseInt(v.days, 10) || 28, roeAs: v.roe, artisan: v.artisan };
  const r = pondOutput(fish, data, opts);
  summary.innerHTML = `A pond of ${r.population} ${esc(fish.name)} makes something on ${pct(r.baseChance)} of days, worth about <strong>${gold(r.goldPerDay)} a day</strong> (${gold(r.gold)} in ${num(r.days)} days)${r.processed ? `, with ${num(Math.ceil(r.jarsNeeded))} Preserves Jar${Math.ceil(r.jarsNeeded) > 1 ? 's' : ''} for the ${esc(r.processed.name)}` : ''}.${fish.max_population < 10 ? ' Legendary ponds hold one fish.' : ''}`;
  out.innerHTML = `<table class="results-table">
    <caption class="visually-hidden">What the pond produces per day</caption>
    <thead><tr><th scope="col">Item</th><th scope="col" class="num">Chance a day</th><th scope="col" class="num col-hide-sm">Per day</th><th scope="col" class="num">Gold a day</th></tr></thead>
    <tbody>${r.items
      .map((i) => `<tr><th scope="row">${esc(i.item)}${i.unpriced ? '<span class="tag">no sell price</span>' : `<span class="cell-sub">${gold(i.unitPrice)} each</span>`}</th>
        <td class="num">${pct(i.chance)}</td><td class="num col-hide-sm">${num(i.perDay, 1)}</td><td class="num"><strong>${gold(i.goldPerDay)}</strong></td></tr>`)
      .join('') || '<tr><td colspan="4">This fish makes nothing at this population.</td></tr>'}</tbody></table>
    <p class="cell-sub"><a href="${esc(fish.url)}" rel="noopener">${esc(fish.name)} fish pond on the wiki</a></p>`;

  const ranked = rankPonds(data, { roeAs: v.roe, artisan: v.artisan });
  const row = (x, i) => `<tr${x.fish.id === fish.id ? ' class="is-best"' : ''}><td>${i + 1}</td><th scope="row">${esc(x.fish.name)}</th>
    <td class="num"><strong>${gold(x.out.goldPerDay)}</strong></td><td class="num col-hide-sm">${x.out.processed ? num(Math.ceil(x.out.jarsNeeded)) : '–'}</td></tr>`;
  const normal = ranked.filter((x) => x.fish.kind !== 'legendary');
  const legendary = ranked.filter((x) => x.fish.kind === 'legendary');
  ranking.innerHTML = `<table class="results-table">
    <caption class="visually-hidden">Fish ranked by gold per day in a full pond</caption>
    <thead><tr><th scope="col">#</th><th scope="col">Fish (10 in the pond)</th><th scope="col" class="num">Gold a day</th><th scope="col" class="num col-hide-sm">Jars</th></tr></thead>
    <tbody>${normal.slice(0, 15).map(row).join('')}</tbody></table>
    <details class="math-details"><summary>Legendary fish (one per pond)</summary><table class="results-table"><caption class="visually-hidden">Legendary fish ranked</caption>
    <thead><tr><th scope="col">#</th><th scope="col">Fish</th><th scope="col" class="num">Gold a day</th><th scope="col" class="num col-hide-sm">Jars</th></tr></thead>
    <tbody>${legendary.map(row).join('')}</tbody></table></details>`;
}

bindTool({ form, storageKey: 'st:fish-pond', render });

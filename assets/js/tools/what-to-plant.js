// What to Plant Today: one recommendation, the reasons, a shopping list and the full ranking.
import { rankCrops, reasons } from '../engine/index.js';
import { loadData, bindTool, esc, gold, num, stepsHtml } from './common.js';

const data = loadData();
const form = document.getElementById('what-to-plant-form');
const tool = form.closest('.tool');
const pick = tool.querySelector('[data-pick]');
const out = tool.querySelector('[data-results]');
const summary = tool.querySelector('[data-summary]');
const SHOP = { pierre: "Pierre's", jojamart: 'JojaMart', oasis: 'the Oasis' };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function render(v) {
  const greenhouse = v.season === 'greenhouse';
  const situation = {
    season: v.season,
    today: Math.min(28, Math.max(1, parseInt(v.today, 10) || 1)),
    tiles: Math.max(1, parseInt(v.tiles, 10) || 1),
    budget: v.budget === '' ? null : Math.max(0, parseInt(v.budget, 10) || 0),
    farmingLevel: parseInt(v.level, 10) || 0,
    fertilizer: v.fertilizer || null,
    kegs: parseInt(v.kegs, 10) || 0,
    jars: parseInt(v.jars, 10) || 0,
    tiller: v.tiller,
    artisan: v.artisan,
    agriculturist: v.agri,
  };
  const all = rankCrops(data.crops, data, situation);
  const ranked = all.filter((o) => !o.unaffordable);
  const when = greenhouse ? 'in the greenhouse' : `on ${cap(v.season)} ${situation.today}`;
  form.querySelector('[name="today"]').closest('.field').hidden = greenhouse;

  if (!ranked.length) {
    summary.textContent = all.length
      ? `Your gold does not cover one seed of any crop that can still be harvested ${when}.`
      : `Nothing can be harvested if you plant ${when}. Plant next season's crops on day 1, or use the greenhouse.`;
    pick.innerHTML = '';
    out.innerHTML = '';
    return;
  }
  const best = ranked[0];
  const next = ranked[1];
  summary.innerHTML = `Plant <strong>${esc(best.crop.name)}</strong> ${esc(when)}: about ${gold(best.total)} profit on ${num(best.tiles)} tile${best.tiles > 1 ? 's' : ''}${next ? `, ${gold(best.total - next.total)} more than ${esc(next.crop.name)}` : ''}.`;

  const shop = [
    `${num(best.tiles)} ${esc(best.crop.seed || `${best.crop.name} seeds`)} from ${esc(SHOP[best.seed.source] || best.seed.source)}: ${gold(best.seed.price * best.tiles)}`,
  ];
  if (best.fertilizer) shop.push(`${num(best.fertilizer.count)} ${esc(best.fertilizer.name)}: ${best.fertilizer.price == null ? 'not sold for gold' : gold(best.fertilizer.price * best.fertilizer.count)}`);
  if (best.seedsLater) shop.push(`Later: ${num(best.seedsLater)} more seeds to replant after each harvest (${gold(best.seedsLater * best.seed.price)}, paid from sales)`);
  const machine = best.processing
    ? `<p>Put ${best.processing.plan.map((p) => `${num(p.items)} into ${esc(p.machineName)}s (${num(p.outputs)} ${esc(p.productName)})`).join(' and ')}, and sell the other ${num(best.processing.rawItems)} raw.</p>`
    : '';
  pick.innerHTML = `<article class="pick">
    <h3>Plant ${esc(best.crop.name)}</h3>
    <p class="big">${gold(best.total)} <span class="cell-sub">profit${greenhouse ? ' over a year' : ''} on ${num(best.tiles)} tiles</span></p>
    ${best.limitedByBudget ? `<p class="notice">Your gold covers ${num(best.tiles)} of ${num(situation.tiles)} tiles.</p>` : ''}
    <h4>Why</h4><ul>${reasons(best, next, gold).map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
    ${machine}
    <h4>Shopping list</h4><ul>${shop.map((s) => `<li>${s}</li>`).join('')}</ul>
    <p class="cell-sub">Harvest days: ${best.r.harvestDays.map((d) => (greenhouse ? `day ${d}` : dayName(d, v.season))).join(', ')}</p>
    <details class="math-details"><summary>Explain the math (one tile)</summary>${stepsHtml(best.r.steps)}</details>
  </article>`;

  out.innerHTML = `<table class="results-table">
    <caption>Every crop you could plant ${esc(when)}, best first</caption>
    <thead><tr><th scope="col">Crop</th><th scope="col" class="num">Tiles</th><th scope="col" class="num">Total profit</th><th scope="col" class="num col-hide-sm">Per tile</th><th scope="col" class="num col-hide-sm">Harvests</th></tr></thead>
    <tbody>${ranked
      .slice(0, 12)
      .map(
        (o, i) => `<tr${i === 0 ? ' class="is-best"' : ''}><th scope="row">${esc(o.crop.name)}${o.processing ? `<span class="cell-sub">${esc(o.processing.plan.map((p) => p.productName).join(' + '))}</span>` : ''}</th>
        <td class="num">${num(o.tiles)}</td><td class="num"><strong>${gold(o.total)}</strong></td>
        <td class="num col-hide-sm">${gold(o.perTile)}</td><td class="num col-hide-sm">${o.r.harvestDays.length}</td></tr>`
      )
      .join('')}</tbody></table>`;
}

const SEASONS = ['spring', 'summer', 'fall', 'winter'];
function dayName(d, season) {
  const i = SEASONS.indexOf(season) + Math.floor((d - 1) / 28);
  return `${cap(SEASONS[i % 4])} ${((d - 1) % 28) + 1}`;
}

bindTool({ form, storageKey: 'st:what-to-plant', render });

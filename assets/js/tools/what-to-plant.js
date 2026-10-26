// What to Plant Today: one recommendation, the reasons, a shopping list and the full ranking.
import { rankCrops, reasons } from '../engine/decision.js';
import { loadData, bindTool, esc, gold, num, plural, stepsHtml } from './common.js';

const data = loadData();
const form = document.getElementById('what-to-plant-form');
const tool = form.closest('.tool');
const pick = tool.querySelector('[data-pick]');
const out = tool.querySelector('[data-results]');
const summary = tool.querySelector('[data-summary]');
const SHOP = { pierre: "Pierre's", jojamart: 'JojaMart', oasis: 'the Oasis' };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// The seeds Mayor Lewis gives every new farm (data/year-one.json start_seeds).
const start = data.yearOne && data.yearOne.start_seeds;
const freeField = form.querySelector('[data-free-seeds]');
// The free seeds only count on a Year 1 spring, when the box is ticked.
const freeSeedsFor = (v) => (start && v.free && v.farmyear === '1' && v.season === 'spring' ? { crop: start.crop, qty: start.qty } : null);

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
    farmYear: v.farmyear === '1' ? 1 : 2,
    freeSeeds: freeSeedsFor(v),
  };
  const all = rankCrops(data.crops, data, situation);
  const ranked = all.filter((o) => !o.unaffordable);
  const when = greenhouse ? 'in the greenhouse' : `on ${cap(v.season)} ${situation.today}`;
  form.querySelector('[name="today"]').closest('.field').hidden = greenhouse;
  if (freeField) freeField.hidden = !(start && v.farmyear === '1' && v.season === 'spring');

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
  summary.innerHTML = `Plant <strong>${esc(best.crop.name)}</strong> ${esc(when)}: about ${gold(best.total)} profit on ${num(best.tiles)} tile${best.tiles > 1 ? 's' : ''}${next ? `, ${gold(best.total - next.total)} more than ${esc(next.crop.name)}` : ''}${situation.budget === null ? ' (no gold limit)' : ''}.`;

  const shop = [
    `${num(best.tiles)} ${esc(best.crop.seed || `${best.crop.name} seeds`)} from ${esc(SHOP[best.seed.source] || best.seed.source)}: ${gold(best.seed.price * best.tiles)}`,
  ];
  if (best.fertilizer) shop.push(`${num(best.fertilizer.count)} ${esc(best.fertilizer.name)}: ${best.fertilizer.price == null ? 'not sold for gold' : gold(best.fertilizer.price * best.fertilizer.count)}`);
  if (best.freeSeeds) shop.push(`${num(best.freeSeeds)} of the seeds are your free ones, so you pay for ${num(best.tiles - best.freeSeeds)}`);
  if (best.seedsLater) shop.push(`Later: ${num(best.seedsLater)} more seeds to replant after each harvest (${gold(best.seedsLater * best.seed.price)}, paid from sales)`);
  const machine = best.processing
    ? `<p>Put ${best.processing.plan.map((p) => `${num(p.items)} into ${esc(p.machineName)}s (${num(p.outputs)} ${esc(p.productName)})`).join(' and ')}, and sell the other ${num(best.processing.rawItems)} raw.</p>`
    : '';
  pick.innerHTML = `<article class="pick">
    <h3>Plant ${esc(best.crop.name)}</h3>
    <p class="big">${gold(best.total)} <span class="cell-sub">profit${greenhouse ? ' over a year' : ''} on ${plural(best.tiles, 'tile')}</span></p>
    ${best.limitedByBudget ? `<p class="notice">Your gold covers ${num(best.tiles)} of ${num(situation.tiles)} tiles.</p>` : ''}
    <h4>Why</h4><ul>${reasons(best, next, gold).map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
    ${machine}
    ${extraFree(best, situation)}
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

/** When the free seeds are not the pick: what they add planted on tiles of their own. */
function extraFree(best, situation) {
  const free = situation.freeSeeds;
  if (!free || best.crop.id === free.crop) return '';
  const own = rankCrops(data.crops, data, { ...situation, tiles: free.qty, budget: 0, kegs: 0, jars: 0 }).find((o) => o.crop.id === free.crop && !o.unaffordable);
  if (!own) return '';
  return `<p class="notice">Plant your ${num(free.qty)} free ${esc(own.crop.seed || `${own.crop.name} seeds`)} too, on ${num(free.qty)} more tiles: about ${gold(own.total)} more profit by the end of ${cap(situation.season)}. With more empty soil than gold, the free seeds plus cheap seeds can beat this pick; raise "Tiles you can plant" to see.</p>`;
}

const SEASONS = ['spring', 'summer', 'fall', 'winter'];
function dayName(d, season) {
  const i = SEASONS.indexOf(season) + Math.floor((d - 1) / 28);
  return `${cap(SEASONS[i % 4])} ${((d - 1) % 28) + 1}`;
}

bindTool({
  form,
  storageKey: 'st:what-to-plant',
  render,
  assumes: (v) => {
    const kegs = parseInt(v.kegs, 10) || 0;
    const jars = parseInt(v.jars, 10) || 0;
    const machines = kegs || jars ? [kegs && plural(kegs, 'Keg'), jars && plural(jars, 'Preserves Jar')].filter(Boolean).join(' and ') : 'no Kegs or Jars';
    const free = freeSeedsFor(v);
    return { first: [v.farmyear === '1' ? 'Year 1' : 'Year 2 or later'], then: [machines, free ? `your ${free.qty} free ${start.seed}` : ''] };
  },
});

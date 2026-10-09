// Greenhouse Planner: sprinkler layout, crops per tile, a year of profit and machines needed.
import { cropProfit, sprinklerCoverage, paintGrid } from '../engine/index.js';
import { loadData, bindTool, esc, gold, num, stepsHtml, SELL_LABEL } from './common.js';

const data = loadData();
const form = document.getElementById('greenhouse-form');
const tool = form.closest('.tool');
const out = tool.querySelector('[data-results]');
const gridEl = tool.querySelector('[data-grid]');
const warnEl = tool.querySelector('[data-warnings]');
const summary = tool.querySelector('[data-summary]');
const gh = data.greenhouse;
const SHOPS = ['pierre', 'jojamart', 'oasis'];
const DAYS = 112;
const products = data.machines.machines.flatMap((m) => m.products.map((p) => ({ ...p, machine: m.name })));

function cropResult(crop, v) {
  const seedSource = SHOPS.filter((k) => crop.seed_prices[k] > 0).sort((a, b) => crop.seed_prices[a] - crop.seed_prices[b])[0] || null;
  const r = cropProfit(crop, data, {
    plantSeason: 'spring',
    greenhouse: true,
    horizonDays: DAYS,
    established: v.stage === 'established',
    sellAs: v.sell,
    farmingLevel: parseInt(v.level, 10) || 0,
    fertilizer: v.fertilizer || null,
    tiller: v.tiller,
    artisan: v.artisan,
    agriculturist: v.agri,
    seedSource,
  });
  const p = products.find((x) => x.id === r.sellAs);
  const perTileMachines = p ? (r.harvestDays.length * r.itemsPerHarvest * p.minutes) / data.machines.minutes_per_day / DAYS : 0;
  return { r, machine: p ? p.machine : null, perTileMachines };
}

function render(v) {
  const layout = gh.sprinklers.find((s) => s.id === v.sprinkler) || gh.sprinklers[0];
  const cov = sprinklerCoverage(layout, gh);
  const warnings = [];

  // Rows in form order; tiles beyond the plantable soil are dropped from the last rows.
  let left = cov.plantable;
  const plan = [];
  for (const n of [1, 2, 3]) {
    const crop = data.crops.find((c) => c.id === v[`c${n}`]);
    const want = Math.max(0, parseInt(v[`n${n}`], 10) || 0);
    if (!crop || !want) continue;
    const tiles = Math.min(want, left);
    if (tiles < want) warnings.push(`Only ${num(cov.plantable)} tiles are plantable with ${layout.name.toLowerCase()}; ${esc(crop.name)} gets ${num(tiles)} instead of ${num(want)}.`);
    left -= tiles;
    if (tiles) plan.push({ id: crop.id, crop, tiles, index: plan.length, ...cropResult(crop, v) });
  }
  if (left > 0 && plan.length) warnings.push(`${num(left)} plantable tile${left > 1 ? 's are' : ' is'} empty.`);
  if (layout.radius === 0) warnings.push('Without sprinklers you water all 120 tiles by hand every day.');
  for (const p of plan) if (!p.r.harvestDays.length) warnings.push(`${esc(p.crop.name)} is not harvested within one greenhouse year.`);
  for (const p of plan) if (p.r.seedCost === null && p.r.harvestDays.length) warnings.push(`${esc(p.crop.name)} seeds have no gold price, so their cost is not counted.`);
  warnEl.innerHTML = warnings.length ? `<ul class="notice">${warnings.map((w) => `<li>${w}</li>`).join('')}</ul>` : '';

  // Grid with the wooden border ring around the soil.
  const painted = paintGrid(cov, plan.map((p) => ({ id: p.id, tiles: p.tiles })));
  const at = new Map(painted.map((t) => [`${t.x},${t.y}`, t]));
  const sprinklers = new Set(layout.positions.map(([x, y]) => `${x},${y}`));
  const colour = Object.fromEntries(plan.map((p) => [p.id, p.index]));
  const cells = [];
  for (let y = -1; y <= gh.height; y++) {
    for (let x = -1; x <= gh.width; x++) {
      const t = at.get(`${x},${y}`);
      if (sprinklers.has(`${x},${y}`)) cells.push('<span class="gh-cell gh-cell--sprinkler"></span>');
      else if (!t) cells.push('<span class="gh-cell gh-cell--border"></span>');
      else if (t.crop) cells.push(`<span class="gh-cell gh-c${colour[t.crop]}">${colour[t.crop] + 1}</span>`);
      else cells.push('<span class="gh-cell gh-cell--soil"></span>');
    }
  }
  const label = `Greenhouse layout: ${layout.positions.length} sprinklers${cov.border ? ` (${cov.border} on the border)` : ''}${plan.map((p) => `, ${p.tiles} ${p.crop.name}`).join('')}${left ? `, ${left} empty` : ''}.`;
  gridEl.innerHTML = `<div class="gh-grid" role="img" aria-label="${esc(label)}">${cells.join('')}</div>
    <ul class="gh-legend">${plan.map((p) => `<li><span class="gh-swatch gh-c${p.index}">${p.index + 1}</span>${esc(p.crop.name)} (${num(p.tiles)})</li>`).join('')}
      ${layout.positions.length ? '<li><span class="gh-swatch gh-cell--sprinkler"></span>Sprinkler</li>' : ''}${left ? '<li><span class="gh-swatch gh-cell--soil"></span>Empty soil</li>' : ''}</ul>`;

  if (!plan.length) {
    summary.textContent = 'Choose a crop and a number of tiles.';
    out.innerHTML = '';
    return;
  }
  const total = plan.reduce((s, p) => s + p.r.profit * p.tiles, 0);
  const machines = {};
  for (const p of plan) if (p.machine) machines[p.machine] = (machines[p.machine] || 0) + Math.ceil(p.perTileMachines * p.tiles);
  const machineText = Object.entries(machines).map(([m, n]) => `${num(n)} ${m}${n > 1 ? 's' : ''}`).join(' and ');
  summary.innerHTML = `${v.stage === 'established' ? 'Year 2+' : 'First year'}: <strong>${gold(total)}</strong> profit from ${num(cov.plantable - left)} tiles${machineText ? `, with ${machineText} to keep up` : ''}.`;

  out.innerHTML = `<table class="results-table">
    <caption class="visually-hidden">Profit for each crop in the plan over one greenhouse year</caption>
    <thead><tr><th scope="col">Crop</th><th scope="col" class="num">Tiles</th><th scope="col" class="col-hide-sm">Sold as</th><th scope="col" class="num">Per tile</th><th scope="col" class="num">Total</th></tr></thead>
    <tbody>${plan
      .map(
        (p) => `<tr><th scope="row"><span class="gh-swatch gh-c${p.index}">${p.index + 1}</span> ${esc(p.crop.name)}${p.machine ? `<span class="cell-sub">${num(Math.ceil(p.perTileMachines * p.tiles))} ${esc(p.machine)}${Math.ceil(p.perTileMachines * p.tiles) > 1 ? 's' : ''}</span>` : ''}</th>
          <td class="num">${num(p.tiles)}</td><td class="col-hide-sm">${esc(SELL_LABEL[p.r.sellAs] || p.r.sellAs)}</td>
          <td class="num">${gold(p.r.profit)}</td><td class="num"><strong>${gold(p.r.profit * p.tiles)}</strong></td></tr>`
      )
      .join('')}</tbody>
    <tfoot><tr><th scope="row">Total</th><td class="num">${num(cov.plantable - left)}</td><td class="col-hide-sm"></td><td></td><td class="num"><strong>${gold(total)}</strong></td></tr></tfoot>
  </table>
  ${plan.map((p) => `<details class="math-details"><summary>Explain the math: ${esc(p.crop.name)}</summary>${stepsHtml(p.r.steps)}</details>`).join('')}`;
}

bindTool({ form, storageKey: 'st:greenhouse', render });

// Ancient Fruit vs Starfruit, side by side for one setup.
import { cropProfit } from '../engine/index.js';
import { loadData, bindTool, esc, gold, num, stepsHtml, SELL_LABEL } from './common.js';

const data = loadData();
const form = document.getElementById('af-sf-form');
const tool = form.closest('.tool');
const out = tool.querySelector('[data-results]');
const summary = tool.querySelector('[data-summary]');
const crop = (id) => data.crops.find((c) => c.id === id);

const SETUPS = {
  gh1: { greenhouse: true, horizonDays: 112, plantSeason: 'spring', label: 'in the greenhouse, first year' },
  gh2: { greenhouse: true, horizonDays: 112, plantSeason: 'spring', established: true, label: 'in the greenhouse, year 2+' },
  summer: { plantSeason: 'summer', label: 'outdoors from Summer 1' },
  spring: { plantSeason: 'spring', label: 'outdoors from Spring 1' },
};

function result(id, v) {
  const c = crop(id);
  const setup = SETUPS[v.where] || SETUPS.gh1;
  const opts = {
    ...setup,
    // Only Ancient Fruit can be "already grown"; Starfruit is always replanted.
    established: setup.established && id === 'ancient-fruit',
    sellAs: v.sell,
    artisan: v.artisan,
    tiller: v.tiller,
    agriculturist: v.agri,
    farmingLevel: parseInt(v.level, 10) || 0,
    fertilizer: v.fertilizer || null,
  };
  // Starfruit does not grow outdoors in Spring.
  if (id === 'starfruit' && v.where === 'spring') return { c, r: null, why: 'Starfruit only grows in Summer outdoors.' };
  const r = cropProfit(c, data, opts);
  const days = setup.horizonDays || (r.harvestDays.length ? Math.max(...r.harvestDays) : 28);
  const p = data.machines.machines.flatMap((m) => m.products.map((x) => ({ ...x, machineId: m.id }))).find((x) => x.id === r.sellAs);
  const machines = p ? (r.harvestDays.length * r.itemsPerHarvest * p.minutes) / (p.input?.count || 1) / data.machines.minutes_per_day / days : 0;
  return { c, r, machines, machineName: p ? (p.machineId === 'keg' ? 'Kegs' : 'Preserves Jars') : '' };
}

function card({ c, r, machines, machineName, why }, tiles, best) {
  if (!r) return `<article class="compare-card"><h3>${esc(c.name)}</h3><p>${esc(why)}</p></article>`;
  return `<article class="compare-card${best ? ' is-best' : ''}">
    <h3>${esc(c.name)} ${best ? '<span class="badge badge--ok">Earns more</span>' : ''}</h3>
    <p class="big">${gold(r.profit)} <span class="cell-sub">profit per tile</span></p>
    <dl>
      <dt>Harvests</dt><dd>${r.harvestDays.length}</dd>
      <dt>Value per harvest</dt><dd>${gold(r.perHarvest)}</dd>
      <dt>Seeds</dt><dd>${r.seedCost == null ? 'not sold for gold' : gold(r.seedCost)}</dd>
      <dt>${num(tiles)} tiles</dt><dd>${gold(r.profit * tiles)}</dd>
      ${machines ? `<dt>${esc(machineName)} to keep up</dt><dd>${num(Math.ceil(machines * tiles))}</dd>` : ''}
    </dl>
    <details><summary>Explain the math</summary>${stepsHtml(r.steps)}</details>
  </article>`;
}

function render(v) {
  const tiles = Math.max(1, parseInt(v.tiles, 10) || 1);
  const a = result('ancient-fruit', v);
  const s = result('starfruit', v);
  const label = (SETUPS[v.where] || SETUPS.gh1).label;
  if (!s.r) {
    summary.textContent = `Only Ancient Fruit grows ${label}: ${gold(a.r.profit)} per tile.`;
  } else {
    const winner = a.r.profit >= s.r.profit ? a : s;
    const loser = winner === a ? s : a;
    const diff = winner.r.profit - loser.r.profit;
    summary.innerHTML = `${label.charAt(0).toUpperCase() + label.slice(1)}: <strong>${esc(winner.c.name)}</strong> earns ${gold(diff)} more per tile (${gold(winner.r.profit)} vs ${gold(loser.r.profit)}), ${gold(diff * tiles)} more on ${num(tiles)} tiles.`;
  }
  const aBest = !s.r || a.r.profit >= s.r.profit;
  out.innerHTML = card(a, tiles, aBest) + card(s, tiles, !aBest);
}

bindTool({ form, storageKey: 'st:af-sf', render });

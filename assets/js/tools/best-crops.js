// Best crops by season: re-ranks the server-rendered table for your level, fertilizer and Tiller.
import { rankCrops } from '../engine/index.js';
import { loadData, bindTool, esc, gold, num } from './common.js';

const data = loadData();
const form = document.getElementById('best-crops-form');
const tool = form.closest('.tool');
const out = tool.querySelector('[data-results]');
const summary = tool.querySelector('[data-summary]');
const season = form.dataset.season;
const SHOP = { pierre: "Pierre's", jojamart: 'JojaMart', oasis: 'Oasis' };

function render(v) {
  const level = parseInt(v.level, 10) || 0;
  const ranked = rankCrops(data.crops, data, { season, today: 1, tiles: 1, budget: null, farmingLevel: level, fertilizer: v.fertilizer || null, tiller: v.tiller });
  const fert = v.fertilizer ? data.fertilizers.fertilizers.find((f) => f.id === v.fertilizer) : null;
  summary.textContent = `Ranked for farming level ${level}, ${fert ? fert.name : 'no fertilizer'}${v.tiller ? ', Tiller' : ', no professions'}.`;
  out.innerHTML = `<table class="results-table">
    <caption class="visually-hidden">Profit per tile for each crop, best first</caption>
    <thead><tr><th scope="col">#</th><th scope="col">Crop</th><th scope="col" class="num">Profit / tile</th><th scope="col" class="num">Per day</th><th scope="col" class="num col-hide-sm">Harvests</th><th scope="col" class="col-hide-sm">Seeds</th></tr></thead>
    <tbody>${ranked
      .map(
        (o, i) => `<tr${i === 0 ? ' class="is-best"' : ''}><td>${i + 1}</td>
        <th scope="row">${esc(o.crop.name)}${o.crop.regrow_days ? '<span class="tag">regrows</span>' : ''}${o.nextSeasons.length ? `<span class="tag">into ${esc(o.nextSeasons.join(', '))}</span>` : ''}</th>
        <td class="num"><strong>${gold(o.total)}</strong></td>
        <td class="num">${num(o.total / (o.lastHarvest - 1), 1)}g</td>
        <td class="num col-hide-sm">${o.r.harvestDays.length}</td>
        <td class="col-hide-sm">${gold(o.seed.price)} (${esc(SHOP[o.seed.source] || o.seed.source)})</td></tr>`
      )
      .join('')}</tbody></table>`;
}

bindTool({ form, storageKey: `st:best-crops`, render });

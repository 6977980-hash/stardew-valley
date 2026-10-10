// Crop Profit Calculator: every crop that can still be harvested from the chosen day.
import { cropProfit, productsFor } from '../engine/index.js';
import { loadData, bindTool, esc, gold, stepsHtml, SELL_LABEL } from './common.js';

const data = loadData();
const form = document.getElementById('crop-profit-form');
const tool = form.closest('.tool');
const out = tool.querySelector('[data-results]');
const summary = tool.querySelector('[data-summary]');
const SHOPS = ['pierre', 'jojamart', 'oasis'];
const SOURCE_LABEL = { pierre: "Pierre's", jojamart: 'JojaMart', oasis: 'Oasis', traveling_cart: 'Traveling Cart', egg_festival: 'Egg Festival', crafting: 'crafted' };

function rows(v) {
  const greenhouse = v.season === 'greenhouse';
  const day = Math.min(28, Math.max(1, parseInt(v.today, 10) || 1));
  const list = [];
  for (const crop of data.crops) {
    const seasons = crop.seasons.map((s) => s.toLowerCase());
    if (!greenhouse && (!seasons.includes(v.season) || crop.indoor_only)) continue;
    const hasShop = SHOPS.some((k) => crop.seed_prices[k] > 0);
    if (!hasShop && !v.noshop) continue;

    let sellAs = v.sell;
    if (sellAs === 'keg' || sellAs === 'preserves-jar') {
      const p = productsFor(crop, data.machines).find((x) => x.machine === v.sell);
      if (!p) continue;
      sellAs = p.product;
    }
    const seedSource = v.seeds && crop.seed_prices[v.seeds] > 0 ? v.seeds : SHOPS.filter((k) => crop.seed_prices[k] > 0).sort((a, b) => crop.seed_prices[a] - crop.seed_prices[b])[0] || null;
    const r = cropProfit(crop, data, {
      plantSeason: greenhouse ? 'spring' : v.season,
      plantDay: greenhouse ? 1 : day,
      greenhouse,
      horizonDays: greenhouse ? 112 : null,
      farmingLevel: parseInt(v.level, 10) || 0,
      fertilizer: v.fertilizer || null,
      tiller: v.tiller,
      artisan: v.artisan,
      agriculturist: v.agri,
      seedSource,
      sellAs,
    });
    if (!r.harvestDays.length) continue;
    list.push({ crop, r, seedSource });
  }
  return list.sort((a, b) => b.r.profit - a.r.profit);
}

function render(v) {
  const list = rows(v);
  const day = Math.min(28, Math.max(1, parseInt(v.today, 10) || 1));
  const where = v.season === 'greenhouse' ? 'in the greenhouse over one year' : `planted on ${cap(v.season)} ${day}`;
  if (!list.length) {
    summary.textContent = `No crop can be harvested ${where}. Try an earlier day or another season.`;
    out.innerHTML = '';
    return;
  }
  const top = list[0];
  summary.innerHTML = `Best ${esc(where)}: <strong>${esc(top.crop.name)}</strong>, ${gold(top.r.profit)} profit per tile from ${top.r.harvestDays.length} harvest${top.r.harvestDays.length > 1 ? 's' : ''}${list[1] ? `. Runner-up: ${esc(list[1].crop.name)} (${gold(list[1].r.profit)})` : ''}.`;

  out.innerHTML = `<table class="results-table">
    <caption class="visually-hidden">Profit per tile for each crop, best first</caption>
    <thead><tr><th scope="col">Crop</th><th scope="col">Harvests</th><th scope="col" class="col-hide-sm">Sold as</th><th scope="col" class="num">Profit / tile</th><th scope="col" class="num">Per day</th><th scope="col"><span class="visually-hidden">Details</span></th></tr></thead>
    <tbody>${list
      .map(({ crop, r, seedSource }, i) => {
        const id = `math-${crop.id}`;
        const seedNote = r.seedCost === null ? '<span class="tag">seed cost not counted</span>' : '';
        return `<tr${i === 0 ? ' class="is-best"' : ''}>
          <th scope="row">${esc(crop.name)}${seedNote}${crop.regrow_days ? '<span class="tag">regrows</span>' : ''}</th>
          <td>${r.harvestDays.length}</td>
          <td class="col-hide-sm">${esc(SELL_LABEL[r.sellAs] || r.sellAs)}</td>
          <td class="num"><strong>${gold(r.profit)}</strong></td>
          <td class="num">${gold(r.profitPerDay)}</td>
          <td><button type="button" class="link-button" aria-expanded="false" aria-controls="${id}">Show math</button></td>
        </tr>
        <tr class="math-row" id="${id}" hidden><td colspan="6">${stepsHtml(r.steps)}
          <p class="math__source">Seeds: ${seedSource ? esc(SOURCE_LABEL[seedSource] || seedSource) : 'no shop price'} · Data: <a href="${esc(crop.sources[0].url)}" rel="noopener">${esc(crop.name)} on the wiki</a>${crop.notes.length ? ` · ${esc(crop.notes.join(' '))}` : ''}</p></td></tr>`;
      })
      .join('')}</tbody></table>`;
}

out.addEventListener('click', (e) => {
  const btn = e.target.closest('button[aria-controls]');
  if (!btn) return;
  const row = document.getElementById(btn.getAttribute('aria-controls'));
  const open = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', String(!open));
  btn.textContent = open ? 'Show math' : 'Hide math';
  row.hidden = open;
});

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

bindTool({ form, storageKey: 'st:crop-profit', render });

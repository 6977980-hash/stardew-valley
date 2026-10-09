// Animal Profit Calculator: one animal type's daily produce and value, and every animal ranked.
import { animalOutput, rankAnimals } from '../engine/index.js';
import { loadData, bindTool, esc, gold, num } from './common.js';

const data = loadData().animals;
const form = document.getElementById('animals-form');
const tool = form.closest('.tool');
const out = tool.querySelector('[data-results]');
const ranking = tool.querySelector('[data-ranking]');
const summary = tool.querySelector('[data-summary]');

function opts(v) {
  return {
    count: parseInt(v.count, 10) || 1,
    days: parseInt(v.days, 10) || 28,
    friendship: (parseInt(v.hearts, 10) || 0) * 200,
    mood: parseInt(v.mood, 10) || 0,
    hayDays: parseInt(v.hay, 10) || 0,
    buyHay: (parseInt(v.hay, 10) || 0) > 0,
    process: v.process,
    rancher: v.rancher,
    artisan: v.artisan,
    coopmaster: v.coopmaster,
    shepherd: v.shepherd,
  };
}

function render(v) {
  const animal = data.animals.find((a) => a.id === v.animal) || data.animals[0];
  const o = opts(v);
  const r = animalOutput(animal, data, o);
  const forage = animal.produce.mode === 'outdoor-forage';
  summary.innerHTML = `${num(r.count)} ${esc(animal.name)}${r.count > 1 ? 's' : ''}: about <strong>${gold(r.goldPerDay * r.count)} a day</strong>${forage ? ' on days the pig can go outside' : ''}, ${gold(r.total)} over ${num(r.days)} ${forage ? "outdoor " : ""}days${r.hayCost ? ` after ${gold(r.hayCost * r.count)} of hay` : ''}.${animal.purchase_price ? ` One costs ${gold(animal.purchase_price)} at Marnie's and pays for itself in about ${num(Math.ceil(r.paybackDays))} days.` : ' Not sold at Marnie\'s.'}`;
  const machines = r.machines.length ? `<p>To keep up: ${r.machines.map((m) => `${num(Math.ceil(m.perAnimal * r.count))} ${esc(m.name)}${Math.ceil(m.perAnimal * r.count) > 1 ? 's' : ''}`).join(', ')}.</p>` : '';
  out.innerHTML = `<table class="results-table">
    <caption class="visually-hidden">What one ${esc(animal.name)} makes per day</caption>
    <thead><tr><th scope="col">Product</th><th scope="col" class="num">Per day</th><th scope="col" class="num">Avg. value</th><th scope="col" class="num">Gold a day</th></tr></thead>
    <tbody>${r.lines
      .map((l) => `<tr><th scope="row">${esc(l.name)}${l.sold !== l.name ? `<span class="cell-sub">sold as ${esc(l.sold)}</span>` : ''}</th>
        <td class="num">${num(l.perDay, 1)}</td><td class="num">${gold(l.value)}</td><td class="num"><strong>${gold(l.goldPerDay)}</strong></td></tr>`)
      .join('')}</tbody></table>
    ${machines}
    <details class="math-details"><summary>Explain the math</summary><ol class="math">${r.steps.map((s) => `<li><span class="math__label">${esc(s.label)}</span> <strong class="math__value">${typeof s.value === 'number' ? num(s.value, 1) : esc(s.value)}</strong></li>`).join('')}</ol>
    <p class="cell-sub"><a href="${esc(animal.url)}" rel="noopener">${esc(animal.name)} on the wiki</a></p></details>`;

  const ranked = rankAnimals(data, o);
  ranking.innerHTML = `<table class="results-table">
    <caption class="visually-hidden">Every animal ranked by gold per day</caption>
    <thead><tr><th scope="col">Animal</th><th scope="col" class="num">Gold a day</th><th scope="col" class="num col-hide-sm">Price</th><th scope="col" class="num col-hide-sm">Pays back</th></tr></thead>
    <tbody>${ranked
      .map((x) => `<tr${x.animal.id === animal.id ? ' class="is-best"' : ''}><th scope="row">${esc(x.animal.name)}${x.animal.produce.mode === 'outdoor-forage' ? '<span class="cell-sub">outdoor days only</span>' : ''}</th>
        <td class="num"><strong>${gold(x.out.goldPerDay)}</strong></td>
        <td class="num col-hide-sm">${x.animal.purchase_price ? gold(x.animal.purchase_price) : 'not sold'}</td>
        <td class="num col-hide-sm">${x.out.paybackDays ? `${num(Math.ceil(x.out.paybackDays))} days` : '–'}</td></tr>`)
      .join('')}</tbody></table>`;
}

bindTool({ form, storageKey: 'st:animals', render });

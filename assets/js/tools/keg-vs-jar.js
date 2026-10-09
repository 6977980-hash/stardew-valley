// Keg vs Preserves Jar: compare per item and per machine-day, then split the harvest.
import { allocate } from '../engine/index.js';
import { loadData, bindTool, esc, gold, num } from './common.js';

const data = loadData();
const form = document.getElementById('keg-jar-form');
const tool = form.closest('.tool');
const out = tool.querySelector('[data-results]');
const summary = tool.querySelector('[data-summary]');
const int = (v, d = 0) => Math.max(0, parseInt(v, 10) || d);

function render(v) {
  const crop = data.crops.find((c) => c.id === v.crop) || data.crops[0];
  const r = allocate(crop, data.machines, {
    items: int(v.items),
    counts: { keg: int(v.kegs), 'preserves-jar': int(v.jars) },
    days: Math.max(1, int(v.days, 28)),
    artisan: v.artisan,
    tiller: v.tiller,
    rawQuality: v.quality,
  });
  const opts = [...r.options].sort((a, b) => b.gainPerItem - a.gainPerItem);
  const perItem = opts[0];
  const perDay = [...r.options].sort((a, b) => b.gainPerMachineDay - a.gainPerMachineDay)[0];

  if (!opts.length) {
    summary.textContent = `${crop.name} cannot go in a Keg or a Preserves Jar. Sell it raw for ${gold(r.rawPrice)} each.`;
    out.innerHTML = '';
    return;
  }
  const used = r.plan.filter((p) => p.machine);
  const planText = r.plan.map((p) => (p.machine ? `${num(p.items)} into ${p.machineName}s (${num(p.outputs)} ${p.productName})` : `sell ${num(p.items)} raw`)).join(', ');
  summary.innerHTML = used.length
    ? `Best split: ${esc(planText)}. Total <strong>${gold(r.total)}</strong>, ${gold(r.extra)} more than selling everything raw.`
    : perItem.gainPerItem <= 0
      ? `Sell ${esc(crop.name)} raw: at this quality it is worth more than its ${esc(perItem.productName)}.`
      : `Add machines or days to process your ${esc(crop.name)}; for now sell all ${num(int(v.items))} raw for ${gold(r.allRaw)}.`;

  const sameItem = opts.length > 1 && opts[0].gainPerItem === opts[1].gainPerItem;
  const verdict = opts.length < 2 ? '' : `<p>Per item: <strong>${sameItem ? 'a tie' : esc(perItem.machineName)}</strong>. Per machine per day: <strong>${esc(perDay.machineName)}</strong>.${perItem.machine !== perDay.machine && !sameItem ? ` If you have more ${esc(crop.name)} than your machines can process, build more ${esc(perDay.machineName)}s.` : ''}</p>`;

  out.innerHTML = `${verdict}<div class="table-wrap"><table class="results-table">
    <caption class="visually-hidden">Keg and Preserves Jar compared for ${esc(crop.name)}</caption>
    <thead><tr><th scope="col">Machine</th><th scope="col" class="num">Sells for</th><th scope="col" class="num">Adds per item</th><th scope="col" class="num">Per machine per day</th><th scope="col" class="num col-hide-sm">Runs in ${num(int(v.days, 28))} days</th></tr></thead>
    <tbody>
      <tr><th scope="row">Sell raw<span class="cell-sub">${esc(crop.name)}</span></th><td class="num">${gold(r.rawPrice)}</td><td class="num">—</td><td class="num">—</td><td class="num col-hide-sm">—</td></tr>
      ${opts
        .map(
          (o) => `<tr${o === perItem ? ' class="is-best"' : ''}><th scope="row">${esc(o.machineName)}<span class="cell-sub">${esc(o.productName)}${o.inputCount > 1 ? ` (${o.inputCount} ${esc(crop.name)} each)` : ''}</span></th><td class="num">${gold(o.price)}</td><td class="num">${gold(o.gainPerItem)}</td><td class="num">${gold(o.gainPerMachineDay)}</td><td class="num col-hide-sm">${num(o.runsPerMachine)} (${num(o.days, 1)} days each)</td></tr>`,
        )
        .join('')}
    </tbody></table></div>
    <details class="math-details"><summary>Explain the math</summary>
      <ol class="math">
        <li>Raw ${esc(crop.name)} (${esc(v.quality)}${v.tiller ? ', Tiller' : ''}): <strong>${gold(r.rawPrice)}</strong></li>
        ${opts
          .map(
            (o) => `<li>${esc(o.productName)}: ${gold(o.price)}${o.inputCount > 1 ? ` for ${o.inputCount} beans` : ''}${v.artisan && o.product !== 'coffee' ? ' with Artisan' : ''}. Adds ${gold(o.price)} − ${o.inputCount} × ${gold(r.rawPrice)} = ${gold(o.price - o.inputCount * r.rawPrice)} per run. A run takes ${num(o.minutes)} minutes = ${num(o.days, 1)} days, so ${gold(o.gainPerMachineDay)} per machine per day. ${num(o.count)} machines × ${num(o.runsPerMachine)} runs = room for ${num(o.capacityItems)} items.</li>`,
          )
          .join('')}
        ${r.plan.map((p) => `<li>${p.machine ? `${num(p.items)} → ${esc(p.machineName)}: ${num(p.outputs)} × ${esc(p.productName)}` : `${num(p.items)} sold raw`} = <strong>${gold(p.value)}</strong></li>`).join('')}
        <li>Total ${gold(r.total)} vs ${gold(r.allRaw)} all raw.</li>
      </ol>
    </details>`;
}

bindTool({ form, storageKey: 'st:keg-jar', render });

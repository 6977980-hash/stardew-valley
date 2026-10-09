// Keg vs Preserves Jar: how to split a stock of one crop between the machines you own.
//
// Each machine runs back to back for the days you give it; one run takes `minutes` (1,600 game
// minutes per day, as the wiki states). Items are identical, so the best split is greedy: fill
// the machine with the higher gain over selling raw first, then the other, sell the rest raw.

import { productsFor } from './processing.js';
import { cropSellPrice } from './price.js';

/** Whole runs a machine finishes in `days`. */
export function runsIn(days, minutes, minutesPerDay = 1600) {
  return Math.max(0, Math.floor((days * minutesPerDay) / minutes + 1e-9));
}

/**
 * @param crop
 * @param machinesData data/machines.json
 * @param o { items, counts: { keg, 'preserves-jar' }, days, artisan, tiller, rawQuality }
 * @returns { rawPrice, options:[...], plan:[...], total, allRaw, extra }
 */
export function allocate(crop, machinesData, o) {
  const items = Math.max(0, Math.floor(o.items || 0));
  const rawPrice = cropSellPrice(crop, o.rawQuality || 'regular', { tiller: !!o.tiller });
  const products = productsFor(crop, machinesData, { artisan: !!o.artisan });

  // One product per machine: the one with the best gain per input item.
  const byMachine = new Map();
  for (const p of products) {
    const gainPerItem = p.price / p.inputCount - rawPrice;
    const cur = byMachine.get(p.machine);
    if (!cur || gainPerItem > cur.gainPerItem) byMachine.set(p.machine, { ...p, gainPerItem });
  }
  const options = [...byMachine.values()].map((p) => {
    const count = Math.max(0, Math.floor((o.counts || {})[p.machine] || 0));
    const runs = runsIn(o.days ?? 28, p.minutes, machinesData.minutes_per_day);
    return {
      ...p,
      count,
      runsPerMachine: runs,
      capacityItems: count * runs * p.inputCount,
      // Extra gold one machine earns per day over selling raw, when it is never idle.
      gainPerMachineDay: ((p.price - p.inputCount * rawPrice) * machinesData.minutes_per_day) / p.minutes,
    };
  });

  let left = items;
  const plan = [];
  for (const opt of [...options].sort((a, b) => b.gainPerItem - a.gainPerItem)) {
    if (opt.gainPerItem <= 0 || !opt.capacityItems || left < opt.inputCount) continue;
    const used = Math.min(left - (left % opt.inputCount), opt.capacityItems);
    const outputs = used / opt.inputCount;
    plan.push({ machine: opt.machine, machineName: opt.machineName, product: opt.product, productName: opt.productName, items: used, outputs, value: outputs * opt.price });
    left -= used;
  }
  if (left > 0) plan.push({ machine: null, machineName: null, product: 'raw', productName: crop.name, items: left, outputs: left, value: left * rawPrice });

  const total = plan.reduce((s, p) => s + p.value, 0);
  const allRaw = items * rawPrice;
  return { rawPrice, options, plan, total, allRaw, extra: total - allRaw };
}

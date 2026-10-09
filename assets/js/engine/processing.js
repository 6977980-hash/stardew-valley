// Keg and Preserves Jar products for a crop. Input quality is ignored by both machines.

import { applyPrice } from './price.js';

/** Products a crop can go into, with their sell price per output and processing time. */
export function productsFor(crop, machines, { artisan = false } = {}) {
  const out = [];
  for (const machine of machines.machines) {
    // Item-specific recipes (Wheat -> Beer) replace the category recipe in the same machine.
    const specific = machine.products.filter((p) => p.input.item === crop.id);
    const candidates = specific.length ? specific : machine.products.filter((p) => p.input.category && p.input.category === crop.category);
    for (const p of candidates) {
      const raw = p.price.fixed != null ? p.price.fixed : Math.floor(crop.base_price * p.price.multiplier + p.price.add);
      const price = p.artisan && artisan ? applyPrice(raw, 1, 1.4) : raw;
      out.push({
        machine: machine.id,
        machineName: machine.name,
        product: p.id,
        productName: p.name,
        inputCount: p.input.count,
        minutes: p.minutes,
        days: p.minutes / machines.minutes_per_day,
        price,
      });
    }
  }
  return out;
}

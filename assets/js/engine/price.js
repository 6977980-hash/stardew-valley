// Sell prices, following the wiki's Module:Calcsellprice:
//   price = floor( floor( profession * 10 * floor(quality * base) ) / 10 )
// Profession multipliers: Tiller 1.1 on vegetables, flowers and farmed fruit; Artisan 1.4 on
// artisan goods (not Coffee or Oil).

import { QUALITY_MULTIPLIER } from './quality.js';

export function applyPrice(base, qualityMult = 1, professionMult = 1) {
  return Math.floor(Math.floor(professionMult * 10 * Math.floor(qualityMult * base)) / 10);
}

export function cropSellPrice(crop, quality = 'regular', { tiller = false } = {}) {
  const tillerApplies = tiller && ['vegetable', 'flower', 'fruit'].includes(crop.category);
  return applyPrice(crop.base_price, QUALITY_MULTIPLIER[quality], tillerApplies ? 1.1 : 1);
}

/** Expected sell price of one item given quality chances. */
export function expectedCropPrice(crop, chances, opts = {}) {
  let sum = 0;
  for (const [q, p] of Object.entries(chances)) if (p) sum += p * cropSellPrice(crop, q, opts);
  return sum;
}

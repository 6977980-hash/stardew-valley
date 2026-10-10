// Casks: what an item is worth after aging, and what a cask slot earns per day. Prices use the
// wiki's quality multipliers (data/casks.json); the Artisan profession is applied after them.

// Multiply in hundredths to avoid floating-point error (325 x 1.4 must be 455).
const times = (n, m) => Math.floor((n * Math.round(m * 100)) / 100);
const TIERS = ['normal', 'silver', 'gold', 'iridium'];

/** Base price of an aged item; wine is a multiple of the fruit's own base price. */
export function agedBase(item, fruitBase) {
  if (item.price_formula) {
    if (fruitBase == null) throw new Error('wine needs the fruit base price');
    return item.price_formula.fruit_multiple * fruitBase;
  }
  return item.base_price;
}

/** Sell price at one quality tier, floored as the game does. */
export function agedPrice(data, item, tier, { fruitBase = null, artisan = true } = {}) {
  const mult = tier === 'normal' ? 1 : data.quality_multipliers[tier];
  const base = times(agedBase(item, fruitBase), mult);
  return artisan ? times(base, 1.4) : base;
}

/** Prices and days for every tier, plus the gold a cask slot earns per day while aging to iridium. */
export function agingPlan(data, item, o = {}) {
  const prices = Object.fromEntries(TIERS.map((t) => [t, agedPrice(data, item, t, o)]));
  const days = { normal: 0, ...item.total_days };
  const gain = prices.iridium - prices.normal;
  return { id: item.id, name: item.name, prices, days, gain, gainPerCaskDay: gain / days.iridium, gainPerCaskDayToGold: (prices.gold - prices.normal) / days.gold };
}

/** Wood and hardwood to fill the cellar from its starting casks to the maximum. */
export function cellarCost(data) {
  const fact = (id) => data.cellar.casks.find((f) => f.id === id).value;
  const extra = fact('max-casks') - fact('starting-casks');
  const qty = (name) => data.obtain.recipe_ingredients.find((i) => i.item === name).qty;
  return { start: fact('starting-casks'), max: fact('max-casks'), extra, wood: extra * qty('Wood'), hardwood: extra * qty('Hardwood') };
}

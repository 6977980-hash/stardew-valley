// Items per harvest. The game picks a whole number between min and max (max grows with
// farming level for a few crops, e.g. Unmilled Rice), then keeps adding one more item while a
// roll under extra_chance succeeds, so the expected extra is p / (1 - p).

export function maxHarvest(crop, farmingLevel = 0) {
  const y = crop.yield;
  return y.max + Math.floor(farmingLevel * y.max_per_level + 1e-9);
}

/** Expected number of items per harvest. */
export function expectedItems(crop, farmingLevel = 0) {
  const y = crop.yield;
  const base = (y.min + Math.max(y.min, maxHarvest(crop, farmingLevel))) / 2;
  const extra = y.extra_chance > 0 && y.extra_chance < 1 ? y.extra_chance / (1 - y.extra_chance) : 0;
  return base + extra;
}

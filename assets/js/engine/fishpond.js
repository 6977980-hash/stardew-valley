// Fish ponds: expected daily produce and gold for one pond, using the wiki's produce rule
// (data/fishponds.json rules.produce): each day an item is produced with chance
// base_chance(population) x the item's share; a Roe drop can add extra Roe (20%, repeating).

/** Chance that a pond of this fish produces anything on a given day. */
export function baseChance(fish, population, rules) {
  const p = rules.produce.base_chance;
  if (population < 1) return p.empty_pond;
  if (fish.kind === 'legendary') return p.legendary;
  return Math.min(1, population * p.per_fish + p.add);
}

/** Price of the processed roe product (Aged Roe or Caviar), or null if it has none. */
export function processedRoe(fish, { artisan = false } = {}) {
  const p = fish.roe && fish.roe.processed;
  if (!p) return null;
  return { id: p.id, name: p.name, price: artisan ? p.price_artisan : p.price };
}

/**
 * Expected produce for one pond.
 * @param fish   record from data/fishponds.json
 * @param data   data/fishponds.json (rules, products)
 * @param o      { population, days, roeAs: 'raw' | 'processed', artisan }
 */
export function pondOutput(fish, data, o = {}) {
  const population = Math.max(0, Math.min(fish.max_population, Math.floor(o.population ?? fish.max_population)));
  const days = Math.max(1, Math.floor(o.days ?? 28));
  const base = baseChance(fish, population, data.rules);
  const extraRoe = 1 + data.rules.produce.extra_roe.average_extra;
  const proc = o.roeAs === 'processed' ? processedRoe(fish, o) : null;

  const items = [];
  for (const row of fish.produce) {
    if (population < row.population.min || population > row.population.max) continue;
    const isRoe = row.item_id === 'roe';
    const avgQty = (row.quantity.min + row.quantity.max) / 2;
    const perDay = base * row.share * avgQty * (isRoe ? extraRoe : 1);
    const unit = isRoe && proc ? proc.price : row.item_price;
    items.push({
      item: isRoe ? (proc ? proc.name : row.wiki_name || 'Roe') : row.item,
      roe: isRoe,
      chance: base * row.share,
      perDay,
      unitPrice: unit,
      goldPerDay: unit == null ? 0 : perDay * unit,
      unpriced: unit == null,
    });
  }
  // Merge rows that produce the same item (legendary fallback Roe rolls).
  const merged = [];
  for (const it of items) {
    const m = merged.find((x) => x.item === it.item);
    if (m) {
      m.chance += it.chance;
      m.perDay += it.perDay;
      m.goldPerDay += it.goldPerDay;
    } else merged.push({ ...it });
  }
  const goldPerDay = merged.reduce((s, i) => s + i.goldPerDay, 0);
  const roePerDay = merged.filter((i) => i.roe).reduce((s, i) => s + i.perDay, 0);
  // Preserves Jars that keep up with the roe (one jar per run of `minutes`).
  const jarMinutes = proc ? (proc.id === 'caviar' ? caviarMinutes(data) : data.products.aged_roe.minutes) : 0;
  const jars = proc ? (roePerDay * jarMinutes) / 1600 : 0;
  return {
    fish: fish.id,
    population,
    days,
    baseChance: base,
    items: merged,
    goldPerDay,
    gold: goldPerDay * days,
    roePerDay,
    jarsNeeded: jars,
    processed: proc,
  };
}

/** Every pond-able fish ranked by gold per day at full population. */
export function rankPonds(data, o = {}) {
  return data.fish
    .map((fish) => ({ fish, out: pondOutput(fish, data, { ...o, population: fish.max_population }) }))
    .sort((a, b) => b.out.goldPerDay - a.out.goldPerDay);
}

function caviarMinutes(data) {
  return data.products.caviar ? data.products.caviar.minutes : data.products.aged_roe.minutes;
}

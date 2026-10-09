// Gift tastes: what a villager thinks of an item, and how much friendship a gift is worth.
// A villager's own list wins; otherwise the universal list applies, minus the wiki's recorded
// exceptions. Whole categories ("All Fruit") are not expanded because the wiki doesn't list their
// members, so an item that only fits a category is reported as unknown, never guessed.

export const TASTES = ['love', 'like', 'neutral', 'dislike', 'hate'];
export const POINTS_PER_HEART = 250;

/** love | like | neutral | dislike | hate, or null when the item isn't listed for this villager. */
export function tasteOf(itemId, villager, gifts) {
  for (const t of TASTES) if (villager.tastes[t].items.includes(itemId)) return t;
  const ex = gifts.universal.exceptions.find((e) => e.villager === villager.id && e.item === itemId);
  if (ex) return ex.taste;
  for (const t of TASTES) {
    const mine = villager.tastes[t];
    if (gifts.universal[t].items.includes(itemId) && mine.universal !== false && !(mine.universal_except || []).includes(itemId)) return t;
  }
  return null;
}

/** Item ids at one taste level for a villager: their own list plus the universal items that still apply. */
export function itemsAt(level, villager, gifts) {
  const ids = new Set(villager.tastes[level].items);
  for (const id of gifts.universal[level].items) if (tasteOf(id, villager, gifts) === level) ids.add(id);
  return [...ids];
}

/** Every villager grouped by how they feel about one item. `unknown` are those with no listed taste. */
export function villagersFor(itemId, gifts) {
  const out = Object.fromEntries([...TASTES, 'unknown'].map((t) => [t, []]));
  for (const v of gifts.villagers) out[tasteOf(itemId, v, gifts) || 'unknown'].push(v);
  return out;
}

/** Friendship points from one gift. Quality only changes loved and liked gifts. */
export function giftPoints(level, fr, { quality = 'normal', event = 'none', friendship101 = false } = {}) {
  const base = fr.points[level];
  if (base == null) return 0;
  let p = base;
  if (fr.quality_applies_to.includes(level)) p *= fr.quality_multipliers[quality] ?? 1;
  if (event === 'birthday') p *= fr.multipliers.birthday;
  else if (event === 'winter_star') p *= fr.multipliers.winter_star;
  if (friendship101 && base > 0) p *= fr.multipliers.friendship_101;
  return Math.round(p);
}

export const heartsFor = (points) => points / POINTS_PER_HEART;

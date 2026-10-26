// Gift tastes: what a villager thinks of an item, and how much friendship a gift is worth.
// Order, most specific first (wiki "Friendship"): the villager's own named items, the wiki's
// recorded universal exceptions, the villager's own categories ("All Fruit"), the universal named
// items, then the universal categories ("All Vegetables"). A category only counts when
// gifts.categories lists its members; one without members is never guessed, so an item that
// only fits such a category is reported as unknown.

export const TASTES = ['love', 'like', 'neutral', 'dislike', 'hate'];
export const POINTS_PER_HEART = 250;

const membersOf = (gifts, id) => (gifts.categories || []).find((c) => c.id === id)?.members || null;

/** Is the item in this category entry ({ id, except }), counting category ids in `except`? */
function inCategory(itemId, cat, gifts) {
  const members = membersOf(gifts, cat.id);
  if (!members || !members.includes(itemId)) return false;
  for (const ex of cat.except || []) {
    if (ex === itemId) return false;
    if (ex.startsWith('all-') && (membersOf(gifts, ex) || []).includes(itemId)) return false;
  }
  return true;
}

/**
 * Why a villager feels this way: { taste, via, category } or null when nothing applies.
 * via: 'own' | 'exception' | 'own-category' | 'universal' | 'universal-category'.
 */
export function tasteWhy(itemId, villager, gifts) {
  for (const t of TASTES) if (villager.tastes[t].items.includes(itemId)) return { taste: t, via: 'own' };
  const ex = gifts.universal.exceptions.find((e) => e.villager === villager.id && e.item === itemId);
  if (ex) return { taste: ex.taste, via: 'exception' };
  for (const t of TASTES) {
    const c = villager.tastes[t].categories.find((x) => inCategory(itemId, x, gifts));
    if (c) return { taste: t, via: 'own-category', category: c.id };
  }
  for (const t of TASTES) {
    const mine = villager.tastes[t];
    if (gifts.universal[t].items.includes(itemId) && mine.universal !== false && !(mine.universal_except || []).includes(itemId)) return { taste: t, via: 'universal' };
  }
  for (const t of TASTES) {
    const mine = villager.tastes[t];
    if (mine.universal === false) continue;
    for (const c of gifts.universal[t].categories) {
      if (!inCategory(itemId, c, gifts)) continue;
      // The villager's own entry for the same category lists this item as an exception when the
      // wiki says it stays universal ("All Artisan Goods (except Honey, Jelly, universally liked)"),
      // which beats the villager's "All Universal Likes (except All Artisan Goods)".
      const keeps = TASTES.some((u) => villager.tastes[u].categories.some((x) => x.id === c.id && (x.except || []).includes(itemId)));
      const blocked = (mine.universal_except || []).includes(c.id) || (mine.universal_except || []).includes(itemId);
      if (!blocked || keeps) return { taste: t, via: 'universal-category', category: c.id };
    }
  }
  return null;
}

/** love | like | neutral | dislike | hate, or null when the item isn't listed for this villager. */
export function tasteOf(itemId, villager, gifts) {
  return tasteWhy(itemId, villager, gifts)?.taste ?? null;
}

/** Display name of a category id ("all-vegetables" -> "All Vegetables"). */
export function categoryName(gifts, id) {
  return (gifts.categories || []).find((c) => c.id === id)?.name || id.replace(/^all-/, 'All ').replace(/-/g, ' ');
}

/** Item ids at one taste level for a villager: their own list plus the universal items that still apply. */
export function itemsAt(level, villager, gifts) {
  const ids = new Set(villager.tastes[level].items);
  for (const id of gifts.universal[level].items) if (tasteOf(id, villager, gifts) === level) ids.add(id);
  return [...ids];
}

/**
 * Every villager grouped by how they feel about one item. `unknown` are those with no listed
 * taste. `why` maps villager id -> tasteWhy() result.
 */
export function villagersFor(itemId, gifts) {
  const out = Object.fromEntries([...TASTES, 'unknown'].map((t) => [t, []]));
  const why = {};
  Object.defineProperty(out, 'why', { value: why, enumerable: false });
  for (const v of gifts.villagers) {
    const w = tasteWhy(itemId, v, gifts);
    why[v.id] = w;
    out[w?.taste || 'unknown'].push(v);
  }
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
  // The game truncates (wiki Friendship table: liked + Friendship 101 = 49, not 50). The rounding
  // to 6 places first drops float noise such as 88.00000000000001.
  return Math.trunc(Math.round(p * 1e6) / 1e6);
}

export const heartsFor = (points) => points / POINTS_PER_HEART;

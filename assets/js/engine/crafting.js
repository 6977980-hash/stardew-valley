// Crafting: turn a list of things to craft into the raw materials to gather or buy.
// Ingredients flagged raw (ore, coal, wood, stone...) stop the expansion. Anything else is made
// from another recipe or a furnace conversion named in `via`, and its own inputs are added.

/** The ingredients to use for a recipe; the Trapper profession swaps a few of them. */
export function ingredientsOf(recipe, { trapper = false } = {}) {
  return trapper && recipe.alt_ingredients ? recipe.alt_ingredients.ingredients : recipe.ingredients;
}

function makerOf(via, crafting) {
  const r = crafting.recipes.find((x) => x.id === via);
  if (r) return { yield: r.yield || 1, inputs: r.ingredients };
  const c = crafting.conversions.find((x) => x.id === via);
  return c ? { yield: c.yield || 1, inputs: c.inputs } : null;
}

/**
 * wanted: [{ id, qty }] where id is a recipe id and qty is how many crafts.
 * Returns the raw materials, the intermediate items to make first, and what the shop part costs.
 */
export function shoppingList(wanted, crafting, { trapper = false, year2 = true } = {}) {
  const raw = new Map();
  const need = new Map(); // non-raw ingredient id -> how many are needed in total
  const via = new Map();
  const names = new Map();
  const outputs = [];
  const add = (map, id, qty) => map.set(id, (map.get(id) || 0) + qty);

  const take = (ingredients, times) => {
    for (const ing of ingredients) {
      names.set(ing.id, ing.name);
      if (ing.raw || !ing.via) add(raw, ing.id, ing.qty * times);
      else {
        add(need, ing.id, ing.qty * times);
        via.set(ing.id, ing.via);
      }
    }
  };

  for (const w of wanted) {
    const recipe = crafting.recipes.find((r) => r.id === w.id);
    if (!recipe || !(w.qty > 0)) continue;
    const crafts = Math.ceil(w.qty);
    outputs.push({ id: recipe.id, name: recipe.name, crafts, makes: crafts * (recipe.yield || 1) });
    take(ingredientsOf(recipe, { trapper }), crafts);
  }

  // Expand intermediates, parents first, so a bar needed by two recipes is rounded up once.
  const made = [];
  const done = new Set();
  const feeds = (id) => [...need.keys()].some((other) => !done.has(other) && other !== id && (makerOf(via.get(other), crafting)?.inputs || []).some((i) => i.id === id));
  while (done.size < need.size) {
    const id = [...need.keys()].find((k) => !done.has(k) && !feeds(k));
    if (id === undefined) break;
    done.add(id);
    const maker = makerOf(via.get(id), crafting);
    if (!maker) {
      add(raw, id, need.get(id));
      continue;
    }
    const crafts = Math.ceil(need.get(id) / maker.yield);
    made.push({ id, name: names.get(id) || id, need: need.get(id), crafts, makes: crafts * maker.yield, via: via.get(id) });
    take(maker.inputs, crafts);
  }

  const price = (id) => {
    const p = crafting.shop_prices.find((s) => s.id === id);
    return p ? (year2 && p.price_year2 != null ? p.price_year2 : p.price) : null;
  };
  const materials = [...raw.entries()]
    .map(([id, qty]) => {
      const unit = price(id);
      const shop = crafting.shop_prices.find((s) => s.id === id);
      return { id, name: names.get(id) || id, qty, unit, cost: unit == null ? null : unit * qty, shop: shop ? shop.shop : null };
    })
    .sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
  return {
    outputs,
    made,
    materials,
    buyCost: materials.reduce((s, m) => s + (m.cost || 0), 0),
    unpriced: materials.filter((m) => m.unit == null).map((m) => m.name),
  };
}

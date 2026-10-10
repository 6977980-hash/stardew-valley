// Farm animals: expected products per day and profit for one animal type, using the wiki's
// rules stored in data/animals.json (quality score, Large/Deluxe chance, produce frequency,
// pig truffles, artisan machines). Daily luck is taken as 0 (an average day).

const QUALITIES = ['normal', 'silver', 'gold', 'iridium'];

/** Wiki "Mood Modifier" for the Large/Deluxe formula. */
export function moodModifier(mood) {
  if (mood > 200) return 1.5;
  if (mood <= 100) return mood - 100;
  return 0;
}

/** Chance the animal can make quality and Large/Deluxe products at all (Mood / 150, max 1). */
export function ability(mood) {
  return Math.max(0, Math.min(1, mood / 150));
}

/** Chance a product is Large/Deluxe instead of regular. */
export function largeChance(animal, data, { friendship, mood, luck = 0 }) {
  const rule = animal.large_product && data.deluxe_rules.rules[animal.large_product.rule];
  if (!rule) return 0;
  if (rule.min_friendship != null && friendship < rule.min_friendship) return 0;
  const score = (friendship + mood * moodModifier(mood)) / rule.divisor + (rule.daily_luck ? luck : 0);
  return ability(mood) * clamp01(score);
}

/** Quality chances for an animal product (wiki "Quality" rules). */
export function productQuality(data, { friendship, mood, professionBonus = false }) {
  const q = data.quality;
  const score = friendship / q.friendship_divisor - (1 - mood / q.mood_divisor) + (professionBonus ? q.profession_bonus : 0);
  const can = ability(mood);
  const iridium = score >= q.iridium_min_score ? clamp01(score / 2) : 0;
  const gold = (1 - iridium) * clamp01(score / 2);
  const silver = (1 - iridium - gold) * clamp01(score);
  return {
    iridium: can * iridium,
    gold: can * gold,
    silver: can * silver,
    normal: 1 - can * (iridium + gold + silver),
  };
}

/** Days to earn back the purchase price; null when the animal never pays for itself (net gold per day is zero or less). */
const payback = (price, netPerDay) => (price && netPerDay > 0 ? price / netPerDay : null);

const product = (data, id) => data.products.find((p) => p.id === id);
const good = (data, id) => data.artisan.goods.find((g) => g.id === id);

/** Sell price with quality and profession bonuses (floor, as the wiki's infoboxes show). */
function priceOf(item, quality, { rancher, artisan, isGood }) {
  const base = item.price_by_quality && item.price_by_quality[quality] != null ? item.price_by_quality[quality] : item.base_price;
  // Rancher only for raw animal products; Artisan only for artisan goods.
  const mult = isGood ? (artisan && item.artisan ? 1.4 : 1) : rancher && item.rancher ? 1.2 : 1;
  // Whole hundredths so 325 x 1.4 is 455, not 454.99999999999994.
  return Math.floor((base * Math.round(mult * 100)) / 100);
}

/**
 * @param animal record from data/animals.json
 * @param data   data/animals.json
 * @param o      { count, days, friendship (0-1000), mood (0-255), rancher, artisan,
 *                 coopmaster, shepherd, process (bool), hayDays, buyHay }
 */
export function animalOutput(animal, data, o = {}) {
  const friendship = clamp(o.friendship ?? 1000, 0, 1000);
  const mood = clamp(o.mood ?? 255, 0, 255);
  const count = Math.max(1, Math.floor(o.count ?? 1));
  const days = Math.max(1, Math.floor(o.days ?? 28));
  const professionBonus = animal.building === 'coop' ? !!o.coopmaster : !!o.shepherd;
  // Truffle quality comes from the player's Foraging skill, not the pig: counted as regular.
  const forage = animal.produce.mode === 'outdoor-forage';
  const qual = forage ? { normal: 1, silver: 0, gold: 0, iridium: 0 } : productQuality(data, { friendship, mood, professionBonus });
  const prof = { rancher: !!o.rancher, artisan: !!o.artisan };
  const steps = [];

  // Items per day.
  let perDay;
  if (animal.produce.mode === 'outdoor-forage') {
    // One truffle a day plus extra truffles at Friendship/1500 each, repeating (≈3 at max).
    const extra = Math.min(0.99, friendship / 1500);
    perDay = 1 / (1 - extra);
    steps.push({ label: 'Truffles a day (outside, not raining, not winter)', value: perDay });
  } else {
    let every = animal.produce.frequency_days;
    for (const r of animal.produce.frequency_reductions || []) {
      if ((r.min_friendship != null && friendship >= r.min_friendship) || (r.profession && o[r.profession])) every -= r.days;
    }
    every = Math.max(1, every);
    perDay = 1 / every;
    steps.push({ label: 'Product every', value: `${every} day${every > 1 ? 's' : ''}` });
  }
  const large = largeChance(animal, data, { friendship, mood });
  if (animal.products.large) steps.push({ label: `Chance of ${product(data, animal.products.large).name}`, value: `${round(large * 100, 1)}%` });
  steps.push({ label: 'Quality chances', value: QUALITIES.filter((q) => qual[q] > 0.0005).map((q) => `${q} ${round(qual[q] * 100, 1)}%`).join(', ') });

  // What one day's produce is worth, raw or processed.
  const lines = [];
  const add = (id, share) => {
    if (share <= 0) return;
    const item = product(data, id);
    const raw = QUALITIES.reduce((s, q) => s + qual[q] * priceOf(item, q, { ...prof, isGood: false }), 0);
    let value = raw;
    let sold = item.name;
    let machine = null;
    if (o.process) {
      const recipe = data.artisan.machines.flatMap((m) => m.recipes.map((r) => ({ ...r, machine: m.id, machineName: m.name }))).find((r) => r.input === id);
      if (recipe) {
        const g = good(data, recipe.output);
        const outQ = recipe.quality === 'input' ? qual : { normal: recipe.quality === 'normal' ? 1 : 0, silver: 0, gold: recipe.quality === 'gold' ? 1 : 0, iridium: 0 };
        let extra = 0;
        if (recipe.second_output_chance_by_input_quality) {
          for (const [q, c] of Object.entries(recipe.second_output_chance_by_input_quality)) extra += qual[q] * c;
        }
        const processed = (recipe.count + extra) * QUALITIES.reduce((s, q) => s + outQ[q] * priceOf(g, q, { ...prof, isGood: true }), 0);
        if (processed > raw) {
          value = processed;
          sold = g.name;
          machine = { id: recipe.machine, name: recipe.machineName, minutes: g.minutes };
        }
      }
    }
    lines.push({ id, name: item.name, sold, perDay: perDay * share, value, goldPerDay: perDay * share * value, machine });
  };
  add(animal.products.regular, 1 - large);
  if (animal.products.large) add(animal.products.large, large);

  const goldPerDay = lines.reduce((s, l) => s + l.goldPerDay, 0);
  const hayDays = Math.min(days, Math.max(0, Math.floor(o.hayDays ?? 0)));
  const hayCost = o.buyHay ? hayDays * data.feeding.hay.price * data.feeding.hay.per_animal_per_day : 0;
  const perAnimal = goldPerDay * days - hayCost;
  // Machines that keep up with one animal's produce.
  const machines = lines.filter((l) => l.machine).map((l) => ({ name: l.machine.name, perAnimal: (l.perDay * l.machine.minutes) / 1600 }));
  return {
    animal: animal.id,
    count,
    days,
    perDay,
    largeChance: large,
    quality: qual,
    lines,
    goldPerDay,
    hayCost,
    total: perAnimal * count,
    perAnimal,
    paybackDays: payback(animal.purchase_price, goldPerDay - (o.buyHay && hayDays ? data.feeding.hay.price * (hayDays / days) : 0)),
    machines,
    steps,
  };
}

/** Every animal ranked by gold per day (each at the same friendship, mood and settings). */
export function rankAnimals(data, o = {}) {
  return data.animals
    .map((a) => ({ animal: a, out: animalOutput(a, data, { ...o, count: 1 }) }))
    .sort((a, b) => b.out.goldPerDay - a.out.goldPerDay);
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number(v)));
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

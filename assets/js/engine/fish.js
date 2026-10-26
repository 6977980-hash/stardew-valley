// Fish Finder (data/fish.json): which fish bite for a season, weather, hour and place, and how to
// say when and where in words. Hours are game hours: 6 = 6am, 24 = midnight, 26 = 2am.

export const AREAS = {
  ocean: 'Ocean (the Beach)',
  river: 'Rivers (Town, Forest)',
  lake: 'Mountain Lake and ponds',
  'secret-woods': 'Secret Woods',
  swamp: "Witch's Swamp",
  sewers: 'Sewers and Mutant Bug Lair',
  mines: 'The Mines',
  desert: 'Calico Desert',
  island: 'Ginger Island',
  'night-market': 'Night Market submarine',
  'crab-pot': 'Crab Pots',
};

/** The areas one location string belongs to ("Ginger Island Oceans" is the island, not the ocean). */
export function areasOf(location) {
  const l = location.toLowerCase();
  const out = [];
  if (/ginger island|pirate cove|volcano/.test(l)) out.push('island');
  else {
    if (/ocean|beach|pier/.test(l)) out.push('ocean');
    if (/river|waterfall|arrowhead|joja/.test(l)) out.push('river');
    if (/lake|pond/.test(l) && !/secret woods/.test(l)) out.push('lake');
  }
  if (/secret woods/.test(l)) out.push('secret-woods');
  if (/witch's swamp/.test(l)) out.push('swamp');
  if (/sewer|mutant bug lair/.test(l)) out.push('sewers');
  if (/mines|floor/.test(l)) out.push('mines');
  if (/desert/.test(l)) out.push('desert');
  if (/night market/.test(l)) out.push('night-market');
  return out;
}

/** Every area a fish can be caught in. */
export function fishAreas(fish) {
  if (fish.kind === 'crab-pot') return ['crab-pot'];
  return [...new Set(fish.locations.flatMap(areasOf))];
}

const inWindow = (hour, [from, to]) => hour >= from && hour < to;

/**
 * Does the fish bite with these conditions? Any condition left out (null/'any') matches.
 * Rain in Winter only comes from a Rain Totem, so Rain Totem seasons count on rainy days. Fish that
 * bite all year on Ginger Island match any season unless another area is chosen.
 */
export function bites(fish, { season = null, weather = null, hour = null, area = null } = {}) {
  const areas = fishAreas(fish);
  if (area && area !== 'any' && !areas.includes(area)) return false;
  if (season && season !== 'any') {
    const islandOnly = areas.length === 1 && areas[0] === 'island';
    const allYearHere = fish.island_all_year && (!area || area === 'any' || area === 'island');
    const totem = weather === 'rain' && (fish.rain_totem || []).includes(season);
    if (!islandOnly && !allYearHere && !totem && !fish.seasons.includes(season)) return false;
  }
  if (weather && weather !== 'any' && fish.weather !== 'any' && fish.weather !== weather) return false;
  if (hour != null && hour !== 'any' && !fish.time.some((w) => inWindow(Number(hour), w))) return false;
  return true;
}

/** Game hour -> "6am", "12pm", "2am". */
export function hourLabel(h) {
  const n = h % 24;
  if (n === 0) return '12am';
  if (n === 12) return '12pm';
  return n < 12 ? `${n}am` : `${n - 12}pm`;
}

/** [[6, 19]] -> "6am–7pm"; the whole day -> "Any time". */
export function timeLabel(time) {
  if (time.length === 1 && time[0][0] <= 6 && time[0][1] >= 26) return 'Any time';
  return time.map(([a, b]) => `${hourLabel(a)}–${hourLabel(b)}`).join(', ');
}

const CAP = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** ['spring', 'fall'] -> "Spring, Fall"; all four -> "All seasons". */
export function seasonLabel(fish) {
  const all = fish.seasons.length === 4;
  let s = all ? 'All seasons' : fish.seasons.map(CAP).join(', ');
  if (fish.days) s += ` ${fish.days.from}–${fish.days.to}`;
  if (fish.rain_totem && fish.rain_totem.length) s += ` (${fish.rain_totem.map(CAP).join(', ')} with a Rain Totem)`;
  if (fish.island_all_year) s += ' (all year on Ginger Island)';
  return s;
}

export const WEATHER_LABEL = { any: 'Any', sun: 'Sun', rain: 'Rain' };

/** Fish that bite with the conditions, sorted by base price (highest first) or name. */
export function findFish(data, conditions = {}, { sort = 'price', legendary = true, crabPots = true } = {}) {
  const list = data.fish.filter((f) => f.verification_status === 'cross-checked' && (legendary || f.kind !== 'legendary') && (crabPots || f.kind !== 'crab-pot') && bites(f, conditions));
  const by = {
    price: (a, b) => b.base_price - a.base_price || a.name.localeCompare(b.name),
    name: (a, b) => a.name.localeCompare(b.name),
    difficulty: (a, b) => (a.difficulty ?? 0) - (b.difficulty ?? 0) || a.name.localeCompare(b.name),
  };
  return list.sort(by[sort] || by.price);
}

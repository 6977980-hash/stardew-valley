// Skill levels and experience: level from total XP, XP still needed, farming XP per crop and
// fishing XP per catch, using the thresholds and formulas stored in data/skills.json.

import { growthDays } from './growth.js';

/** Level reached with `total` XP (0-10). */
export function levelFromXp(total, thresholds) {
  let level = 0;
  for (const t of thresholds) if (total >= t.total) level = t.level;
  return level;
}

/** Total XP needed to reach `level` (0 for level 0). */
export function totalForLevel(level, thresholds) {
  if (level <= 0) return 0;
  const t = thresholds.find((x) => x.level === level);
  return t ? t.total : thresholds[thresholds.length - 1].total;
}

/** XP still needed to go from `current` total XP to `target` level. */
export function xpToLevel(current, target, thresholds) {
  return Math.max(0, totalForLevel(target, thresholds) - Math.max(0, current));
}

/**
 * Fishing XP for one catch (wiki "Fishing" formula): trunc((quality + 1) x 3 + difficulty / 3),
 * then x2.2 with a treasure chest, x2.4 for a perfect catch and x5 for a legendary fish, each
 * truncated. Quality is the fish's quality before a perfect catch raises it.
 */
export function fishXp(fish, formula, { quality = 'normal', treasure = false, perfect = false } = {}) {
  const q = formula.quality_values[quality] ?? 0;
  let xp = Math.trunc((q + 1) * 3 + fish.difficulty / 3);
  if (treasure) xp = Math.trunc(xp * 2.2);
  if (perfect) xp = Math.trunc(xp * 2.4);
  if (fish.legendary) xp = Math.trunc(xp * 5);
  return xp;
}

/** Farming XP a day for one tile of a crop, once it is producing (one XP award per harvest). */
export function farmingXpPerDay(cropXp, crop) {
  const every = crop.regrow_days || growthDays(crop);
  return cropXp.xp / every;
}

/** How many actions of `xpEach` cover `needed` XP. */
export const actionsFor = (needed, xpEach) => (xpEach > 0 ? Math.ceil(needed / xpEach) : null);

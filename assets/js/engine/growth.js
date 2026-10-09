// Crop growth: stage lengths after speed bonuses, and harvest days within a season window.
//
// The speed-up follows the game's HoeDirt.applySpeedIncreases: the bonus (fertilizer +
// Agriculturist) is summed as a 32-bit float, days to remove = ceil(totalDays * bonus), and the
// days are taken one at a time from each stage in turn (never from a 1-day first stage), at
// most three passes. Because 0.1 as a float is slightly above 0.1, Speed-Gro on a 10-day crop
// removes 2 days, not 1. Checked against every table on the wiki's Crop Growth Calendars.

const f = Math.fround;

/** Total speed bonus as the game sums it: fertilizer speed + 0.1 for Agriculturist. */
export function speedBonus({ fertilizerSpeed = 0, agriculturist = false } = {}) {
  let bonus = f(0);
  if (fertilizerSpeed) bonus = f(bonus + f(fertilizerSpeed));
  if (agriculturist) bonus = f(bonus + f(0.1));
  return bonus;
}

/** Stage lengths after the speed bonus. Stages that drop to 0 days are kept as 0. */
export function speedUpPhases(phases, bonus) {
  const out = phases.slice();
  if (!bonus) return out;
  const total = out.reduce((s, d) => s + d, 0);
  let remove = Math.ceil(total * bonus);
  for (let pass = 0; remove > 0 && pass < 3; pass++) {
    for (let i = 0; i < out.length; i++) {
      if ((i > 0 || out[i] > 1) && out[i] > 0) {
        out[i]--;
        remove--;
      }
      if (remove <= 0) break;
    }
  }
  return out;
}

/** Days from planting to first harvest. */
export function growthDays(crop, opts = {}) {
  return speedUpPhases(crop.phase_days, speedBonus(opts)).reduce((s, d) => s + d, 0);
}

/**
 * Seasons the crop can keep growing through, starting from the planting season. A crop
 * planted in Summer that also grows in Fall survives into Fall; anything else dies at the
 * end of day 28. In the Greenhouse (or other all-season spots) there is no season limit.
 */
export function growingWindow(crop, plantSeason, { seasons, daysPerSeason = 28, greenhouse = false, horizonDays = null }) {
  if (greenhouse) return horizonDays ?? daysPerSeason * seasons.length;
  const start = seasons.indexOf(plantSeason);
  if (start < 0) throw new Error(`unknown season ${plantSeason}`);
  const allowed = crop.seasons.map((s) => s.toLowerCase());
  if (!allowed.includes(plantSeason)) return 0;
  let n = 0;
  for (let i = start; i < seasons.length && allowed.includes(seasons[i]); i++) n++;
  return n * daysPerSeason;
}

/**
 * Harvest days (1-based day numbers counted from day 1 of the planting season).
 * Single-harvest crops are replanted on harvest day when `replant` is true. `established` means a
 * regrowing crop that is already mature on the first day (e.g. greenhouse, second year).
 * @returns {{growth:number, harvests:number[], lastDay:number}}
 */
export function harvestSchedule(crop, { plantDay = 1, plantSeason, seasons, daysPerSeason = 28, greenhouse = false, horizonDays = null, replant = true, established = false, fertilizerSpeed = 0, agriculturist = false }) {
  const growth = growthDays(crop, { fertilizerSpeed, agriculturist });
  const window = growingWindow(crop, plantSeason, { seasons, daysPerSeason, greenhouse, horizonDays });
  const lastDay = window;
  const harvests = [];
  if (!window || plantDay > lastDay) return { growth, harvests, lastDay };
  // An established regrowing plant (already grown last year) is ready every regrow_days.
  let day = established && crop.regrow_days ? plantDay - 1 + crop.regrow_days : plantDay + growth;
  if (crop.regrow_days) {
    while (day <= lastDay) {
      harvests.push(day);
      day += crop.regrow_days;
    }
  } else {
    while (day <= lastDay) {
      harvests.push(day);
      if (!replant) break;
      day += growth;
    }
  }
  return { growth, harvests, lastDay };
}

/** Latest planting day that still gets at least one harvest in the window (null if none). */
export function lastPlantingDay(crop, opts) {
  const growth = growthDays(crop, opts);
  const window = growingWindow(crop, opts.plantSeason, opts);
  const day = window - growth;
  return day >= 1 ? day : null;
}

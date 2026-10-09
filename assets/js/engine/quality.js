// Crop quality chances at harvest (Farming page, "Complete Formula"):
//   gold    = 0.2*(level/10) + 0.2*fert*((level+2)/12) + 0.01
//   silver  = min(2*gold, 0.75)
//   iridium = gold/2, only with Deluxe Fertilizer (fert 3), where silver is the minimum.
// The game checks iridium, then gold, then silver; each later check only runs if the earlier
// ones failed, so the chances are chained.

export const QUALITY_MULTIPLIER = { regular: 1, silver: 1.25, gold: 1.5, iridium: 2 };

export function qualityChances(farmingLevel, fertilizerLevel = 0) {
  const gold = 0.2 * (farmingLevel / 10) + 0.2 * fertilizerLevel * ((farmingLevel + 2) / 12) + 0.01;
  const g = Math.min(gold, 1);
  if (fertilizerLevel >= 3) {
    const iridium = Math.min(gold / 2, 1);
    const goldP = (1 - iridium) * g;
    return { regular: 0, silver: 1 - iridium - goldP, gold: goldP, iridium };
  }
  const silver = (1 - g) * Math.min(2 * gold, 0.75);
  return { regular: 1 - g - silver, silver, gold: g, iridium: 0 };
}

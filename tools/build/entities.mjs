// Numbers for the crop, animal and machine pages, computed with the same engine as the tools and
// stored in data/entities.json. Run through tools/build/answers.mjs (npm run build:answers).
import { cropProfit } from '../../assets/js/engine/profit.js';
import { growthDays, lastPlantingDay } from '../../assets/js/engine/growth.js';
import { cropSellPrice } from '../../assets/js/engine/price.js';
import { qualityChances } from '../../assets/js/engine/quality.js';
import { expectedItems } from '../../assets/js/engine/harvest.js';
import { productsFor } from '../../assets/js/engine/processing.js';
import { allocate } from '../../assets/js/engine/machines.js';
import { animalOutput } from '../../assets/js/engine/animals.js';

const r0 = (n) => Math.round(n);
const r2 = (n) => Math.round(n * 100) / 100;
const SEASON_ORDER = ['spring', 'summer', 'fall', 'winter'];

export function buildEntities(data, crops) {
  const byId = new Map(crops.map((c) => [c.id, c]));
  const seasons = data.seasons.seasons;
  const profit = (c, o) => cropProfit(c, data, o);

  /* ---- Crops: planting results per season, ranked inside the season ---- */
  const rankBySeason = {};
  for (const s of SEASON_ORDER) {
    rankBySeason[s] = crops
      .filter((c) => c.seasons.map((x) => x.toLowerCase()).includes(s))
      .map((c) => ({ id: c.id, name: c.name, profit: r0(profit(c, { plantSeason: s, farmingLevel: 6 }).profit) }))
      .filter((x) => x.profit !== 0 || true)
      .sort((a, b) => b.profit - a.profit);
  }

  const cropOut = {};
  for (const c of crops) {
    const outdoor = c.seasons.map((x) => x.toLowerCase());
    const plantings = outdoor.map((s) => {
      const base = (level, extra = {}) => profit(c, { plantSeason: s, farmingLevel: level, ...extra });
      const l0 = base(0);
      const l6 = base(6);
      const l10 = base(10);
      const ranks = rankBySeason[s];
      const rank = ranks.findIndex((x) => x.id === c.id) + 1;
      const peers = ranks.filter((x) => x.id !== c.id).slice(0, 3);
      const fert = Object.fromEntries(['basic-fertilizer', 'quality-fertilizer', 'speed-gro', 'deluxe-speed-gro'].map((f) => [f, r0(base(6, { fertilizer: f }).profit)]));
      return {
        season: s,
        growth: l0.growth,
        harvests: l0.harvestDays,
        last_planting_day: lastPlantingDay(c, { plantSeason: s, seasons, daysPerSeason: data.seasons.days_per_season }),
        profit: { level0: r0(l0.profit), level6: r0(l6.profit), level10: r0(l10.profit) },
        per_harvest_level6: r0(l6.perHarvest),
        seed_cost: l0.seedCost,
        rank,
        of: ranks.length,
        peers,
        fertilizer_level6: fert,
        best_fertilizer: Object.entries(fert).sort((a, b) => b[1] - a[1])[0],
      };
    });

    const prices = Object.fromEntries(['regular', 'silver', 'gold', 'iridium'].map((q) => [q, cropSellPrice(c, q)]));
    const tiller = cropSellPrice(c, 'regular', { tiller: true });
    const machinesOpt = allocate(c, data.machines, { items: 0, counts: {}, days: 28, artisan: false });
    const machinesArt = allocate(c, data.machines, { items: 0, counts: {}, days: 28, artisan: true });
    const products = productsFor(c, data.machines, { artisan: true }).map((p) => ({ machine: p.machineName, product: p.productName, price: p.price, input: p.inputCount, days: r2(p.days) }));
    const gain = machinesArt.options.map((o) => ({ machine: o.machineName, product: o.productName, gain_per_machine_day: r0(o.gainPerMachineDay) }));
    void machinesOpt;

    const ghEst = profit(c, { greenhouse: true, horizonDays: 112, established: true, farmingLevel: 6 });
    const ghFirst = profit(c, { greenhouse: true, horizonDays: 112, established: false, farmingLevel: 6 });

    cropOut[c.id] = {
      id: c.id,
      name: c.name,
      category: c.category,
      seasons: outdoor,
      growth_days: growthDays(c),
      regrow_days: c.regrow_days,
      base_price: c.base_price,
      prices,
      tiller_price: tiller,
      seed_prices: c.seed_prices,
      trellis: !!c.trellis,
      giant: !!c.giant,
      indoor_only: !!c.indoor_only,
      items_per_harvest: { level0: r2(expectedItems(c, 0)), level10: r2(expectedItems(c, 10)) },
      quality: [0, 5, 10].map((lv) => ({ level: lv, chances: Object.fromEntries(Object.entries(qualityChances(lv, 0)).map(([k, v]) => [k, r2(v * 100)])) })),
      plantings,
      products,
      machine_gain: gain,
      greenhouse: { established: r0(ghEst.profit), first_year: r0(ghFirst.profit), harvests: ghEst.harvestDays.length },
      verification: c.verification_status,
    };
  }

  /* ---- Animals ---- */
  const a = data.animals;
  const animalRank = a.animals.map((x) => ({ id: x.id, raw: animalOutput(x, a, { friendship: 1000, mood: 255 }).goldPerDay })).sort((p, q) => q.raw - p.raw);
  const animalsOut = {};
  for (const x of a.animals) {
    const at = (hearts, o = {}) => {
      const out = animalOutput(x, a, { friendship: hearts * 200, mood: 255, ...o });
      return { per_day: r2(out.perDay), gold: r0(out.goldPerDay), lines: out.lines.map((l) => ({ name: l.name, sold: l.sold, per_day: r2(l.perDay), value: r0(l.value) })) };
    };
    const full = animalOutput(x, a, { friendship: 1000, mood: 255 });
    const proc = animalOutput(x, a, { friendship: 1000, mood: 255, process: true, artisan: true });
    animalsOut[x.id] = {
      id: x.id,
      name: x.name,
      building: x.building_name,
      price: x.purchase_price,
      days_to_mature: x.days_to_mature,
      mode: x.produce.mode,
      frequency_days: x.produce.frequency_days,
      products: [x.products.regular, x.products.large].filter(Boolean).map((id) => {
        const p = a.products.find((y) => y.id === id);
        return { id, name: p.name, prices: p.price_by_quality || { normal: p.base_price } };
      }),
      by_hearts: [0, 1, 2, 3, 4, 5].map((h) => ({ hearts: h, ...at(h), processed: at(h, { process: true, artisan: true }).gold })),
      full: { raw: r0(full.goldPerDay), processed: r0(proc.goldPerDay), large_chance: r2(full.largeChance * 100), quality: Object.fromEntries(Object.entries(full.quality).map(([k, v]) => [k, r2(v * 100)])), machines: proc.machines.map((m) => ({ name: m.name, per_animal: r2(m.perAnimal) })) },
      payback_days: x.purchase_price ? r2(x.purchase_price / Math.max(full.goldPerDay, proc.goldPerDay)) : null,
      rank_raw: animalRank.findIndex((r) => r.id === x.id) + 1,
      of: animalRank.length,
      notes: x.produce.notes || [],
      conditions: x.produce.conditions || [],
      verification: x.verification_status,
    };
  }

  /* ---- Machines: Keg and Preserves Jar, ranked by gold per machine day ---- */
  const machinesOut = {};
  for (const m of data.machines.machines) {
    const rows = crops
      .map((c) => {
        const o = allocate(c, data.machines, { items: 0, counts: {}, days: 28, artisan: true }).options.find((x) => x.machine === m.id);
        return o ? { id: c.id, name: c.name, product: o.productName, price: o.price, input: o.inputCount, minutes: o.minutes, days: r2(o.minutes / data.machines.minutes_per_day), gain_per_machine_day: r0(o.gainPerMachineDay), raw: o.price / o.inputCount - o.gainPerItem } : null;
      })
      .filter(Boolean)
      .sort((x, y) => y.gain_per_machine_day - x.gain_per_machine_day);
    machinesOut[m.id] = { id: m.id, name: m.name, crops: rows.map(({ raw, ...rest }) => rest), accepted: rows.length };
  }

  return { game_version: data.crops.game_version, crops: cropOut, animals: animalsOut, machines: machinesOut };
}

// Numbers for the crop, animal and machine pages, computed with the same engine as the tools and
// stored in data/entities.json. Run through tools/build/answers.mjs (npm run build:answers).
import { cropProfit } from '../../assets/js/engine/profit.js';
import { growthDays, lastPlantingDay, dayToSeasonDay } from '../../assets/js/engine/growth.js';
import { cropSellPrice } from '../../assets/js/engine/price.js';
import { qualityChances } from '../../assets/js/engine/quality.js';
import { expectedItems } from '../../assets/js/engine/harvest.js';
import { productsFor } from '../../assets/js/engine/processing.js';
import { allocate } from '../../assets/js/engine/machines.js';
import { animalOutput } from '../../assets/js/engine/animals.js';
import { villagersFor } from '../../assets/js/engine/gifts.js';

const r0 = (n) => Math.round(n);
const r2 = (n) => Math.round(n * 100) / 100;
const SEASON_ORDER = ['spring', 'summer', 'fall', 'winter'];
// Shops that sell seeds every day the crop is in season; the same rule as the Best Crops pages.
const SHOPS = ['pierre', 'jojamart', 'oasis'];
// A crop is ranked in a season only when it grows outdoors and a shop sells its seed, so seed
// cost is always counted and the ranks match /best-<season>-crops/.
export const rankable = (c) => !c.indoor_only && SHOPS.some((k) => c.seed_prices[k] > 0);

export function buildEntities(data, crops) {
  const byId = new Map(crops.map((c) => [c.id, c]));
  const seasons = data.seasons.seasons;
  const profit = (c, o) => cropProfit(c, data, o);

  /* ---- Crops: planting results per season, ranked inside the season ---- */
  const rankBySeason = {};
  for (const s of SEASON_ORDER) {
    rankBySeason[s] = crops
      .filter((c) => rankable(c) && c.seasons.map((x) => x.toLowerCase()).includes(s))
      .map((c) => ({ id: c.id, name: c.name, profit: r0(profit(c, { plantSeason: s, farmingLevel: 6 }).profit) }))
      .sort((a, b) => b.profit - a.profit);
  }

  // Last day to plant for one harvest, as a real date: day 42 counted from Summer 1 is Fall 14.
  const lastPlanting = (c, s) => {
    const opts = { plantSeason: s, seasons, daysPerSeason: data.seasons.days_per_season };
    const n = lastPlantingDay(c, opts);
    if (!n) return { last_planting_day: null, last_planting_season: null };
    const d = dayToSeasonDay(n, s, opts);
    return { last_planting_day: d.day, last_planting_season: d.season };
  };

  // What else a crop is for: Community Center bundles, crafting recipes and gifts. Each part is
  // empty when its data file isn't loaded.
  const roomName = new Map(((data.bundles || {}).rooms || []).map((r) => [r.id, r.name]));
  const usesOf = (c) => {
    const inBundles = (set) =>
      ((data.bundles || {}).bundles || [])
        .filter((b) => b.set === set && (b.items || []).some((i) => i.id === c.id))
        .map((b) => {
          const i = b.items.find((x) => x.id === c.id);
          return { name: b.name, room: roomName.get(b.room) || b.room, qty: i.qty, quality: i.quality };
        });
    const standard = inBundles('standard');
    const remixed = inBundles('remixed').filter((b) => !standard.some((x) => x.name === b.name && x.qty === b.qty && x.quality === b.quality));
    const crafting = ((data.crafting || {}).recipes || [])
      .filter((r) => r.ingredients.some((i) => i.id === c.id))
      .map((r) => ({ name: r.name, qty: r.ingredients.find((i) => i.id === c.id).qty, category: r.category }));
    let gifts = null;
    if (data.gifts) {
      const v = villagersFor(c.id, data.gifts);
      const names = (t) => v[t].map((x) => x.name);
      gifts = { love: names('love'), like: names('like'), neutral: v.neutral.length, dislike: names('dislike'), hate: names('hate'), of: data.gifts.villagers.length };
    }
    return { bundles: standard, remixed_bundles: remixed, crafting, gifts };
  };

  const cropOut = {};
  for (const c of crops) {
    const outdoor = c.seasons.map((x) => x.toLowerCase());
    // Indoor-only crops (Cactus Fruit) have no outdoor planting, so no season rank.
    const plantings = (c.indoor_only ? [] : outdoor).map((s) => {
      const base = (level, extra = {}) => profit(c, { plantSeason: s, farmingLevel: level, ...extra });
      const l0 = base(0);
      const l6 = base(6);
      const l10 = base(10);
      const ranks = rankBySeason[s];
      const ranked = rankable(c);
      // Crops without shop seeds get the place they would take if you already had the seeds.
      const at = ranked ? ranks.findIndex((x) => x.id === c.id) : ranks.findIndex((x) => x.profit < r0(l6.profit));
      const pos = at < 0 ? ranks.length : at;
      const others = ranks.filter((x) => x.id !== c.id);
      const peers = others.slice(Math.max(0, pos - 2), pos + 2);
      const last = l0.harvestDays[l0.harvestDays.length - 1] || 0;
      const later = SEASON_ORDER.slice(SEASON_ORDER.indexOf(s) + 1).filter((x, i) => outdoor.includes(x) && last > (i + 1) * data.seasons.days_per_season);
      const fert = Object.fromEntries(['basic-fertilizer', 'quality-fertilizer', 'speed-gro', 'deluxe-speed-gro'].map((f) => [f, r0(base(6, { fertilizer: f }).profit)]));
      return {
        season: s,
        growth: l0.growth,
        harvests: l0.harvestDays,
        ...lastPlanting(c, s),
        profit: { level0: r0(l0.profit), level6: r0(l6.profit), level10: r0(l10.profit) },
        per_harvest_level6: r0(l6.perHarvest),
        seed_cost: l0.seedCost,
        rank: ranked ? pos + 1 : null,
        would_rank: ranked ? null : pos + 1,
        of: ranks.length,
        carries_into: later,
        leader: ranks[0] && ranks[0].id !== c.id ? ranks[0] : null,
        peers,
        fertilizer_level6: fert,
        best_fertilizer: Object.entries(fert).sort((a, b) => b[1] - a[1])[0],
        // Every fertilizer that beats planting with none, best first.
        paying_fertilizers: Object.entries(fert).filter(([, v]) => v > r0(l6.profit)).sort((a, b) => b[1] - a[1]).map(([k]) => k),
      };
    });

    const prices = Object.fromEntries(['regular', 'silver', 'gold', 'iridium'].map((q) => [q, cropSellPrice(c, q)]));
    const tiller = cropSellPrice(c, 'regular', { tiller: true });
    // Artisan is a level-10 branch of Tiller, so Artisan prices are always compared with the
    // Tiller raw price.
    const machinesArt = allocate(c, data.machines, { items: 0, counts: {}, days: 28, artisan: true, tiller: true });
    const products = productsFor(c, data.machines, { artisan: true }).map((p) => ({ machine: p.machineName, product: p.productName, price: p.price, input: p.inputCount, days: r2(p.days) }));
    const gain = machinesArt.options.map((o) => ({ machine: o.machineName, product: o.productName, gain_per_machine_day: r0(o.gainPerMachineDay) }));

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
      shop_seeds: rankable(c) || (!!c.indoor_only && SHOPS.some((k) => c.seed_prices[k] > 0)),
      returns_seeds: c.returns_seeds || 0,
      seed_note: c.seed_note || null,
      irrigated_growth_days: c.irrigated_growth_days || null,
      items_per_harvest: { level0: r2(expectedItems(c, 0)), level10: r2(expectedItems(c, 10)) },
      quality: [0, 5, 10].map((lv) => ({ level: lv, chances: Object.fromEntries(Object.entries(qualityChances(lv, 0)).map(([k, v]) => [k, r2(v * 100)])) })),
      plantings,
      products,
      machine_gain: gain,
      greenhouse: { established: r0(ghEst.profit), first_year: r0(ghFirst.profit), harvests: ghEst.harvestDays.length },
      uses: usesOf(c),
      wiki_url: (c.sources.find((x) => x.title === c.name) || {}).url || null,
      special_use: c.special_use || null,
      verification: c.verification_status,
    };
  }

  /* ---- Animals ---- */
  const a = data.animals;
  const animalRank = a.animals.map((x) => ({ id: x.id, raw: animalOutput(x, a, { friendship: 1000, mood: 255 }).goldPerDay })).sort((p, q) => q.raw - p.raw);
  const animalsOut = {};
  const freq = (x, withProfession) => {
    if (x.produce.frequency_days == null) return null;
    let d = x.produce.frequency_days;
    for (const r of x.produce.frequency_reductions || []) {
      if ((r.min_friendship != null && r.min_friendship <= 1000) || (withProfession && r.profession)) d -= r.days;
    }
    return Math.max(1, d);
  };
  // The Coop or Barn level an animal needs, and everything it costs to get there from an empty plot.
  const levels = ((data.buildings || {}).buildings || []);
  const buildingFor = (x) => {
    const b = levels.find((y) => y.family === x.building && y.level === x.building_level);
    if (!b) return null;
    const path = levels.filter((y) => y.family === b.family && y.level <= b.level).sort((p, q) => p.level - q.level);
    return { id: b.id, name: b.name, level: b.level, capacity: b.capacity, gold: b.gold, path: path.map((y) => ({ id: y.id, name: y.name, gold: y.gold, wood: y.materials.wood, stone: y.materials.stone })), total: b.total };
  };
  const SHOP_NAMES = { marnie: "Marnie's Ranch" };
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
      // Days between products at full friendship, and with the profession that also shortens it.
      frequency_full_days: freq(x, false),
      frequency_profession: (x.produce.frequency_reductions || []).filter((r) => r.profession).map((r) => ({ profession: r.profession, days: freq(x, true) })),
      products: [x.products.regular, x.products.large].filter(Boolean).map((id) => {
        const p = a.products.find((y) => y.id === id);
        return { id, name: p.name, prices: p.price_by_quality || { normal: p.base_price } };
      }),
      by_hearts: [0, 1, 2, 3, 4, 5].map((h) => ({ hearts: h, ...at(h), processed: at(h, { process: true, artisan: true }).gold })),
      full: { raw: r0(full.goldPerDay), processed: r0(proc.goldPerDay), large_chance: r2(full.largeChance * 100), quality: Object.fromEntries(Object.entries(full.quality).map(([k, v]) => [k, r2(v * 100)])), machines: proc.machines.map((m) => ({ name: m.name, per_animal: r2(m.perAnimal) })) },
      // Price divided by gold a day at five hearts: selling raw, and the best case (artisan goods made from the products).
      payback_days_raw: x.purchase_price && full.goldPerDay > 0 ? r2(x.purchase_price / full.goldPerDay) : null,
      payback_days_best_case: x.purchase_price ? r2(x.purchase_price / Math.max(full.goldPerDay, proc.goldPerDay)) : null,
      shop: x.purchase_shop ? SHOP_NAMES[x.purchase_shop] || x.purchase_shop : null,
      // Animals no shop sells: how the wiki says to hatch one, and the egg's price where a shop sells it.
      acquisition: x.acquisition ? { how: x.acquisition.wiki_wording, egg: x.acquisition.egg || null } : null,
      building_needed: buildingFor(x),
      ...(() => {
        // Payback counting the building's gold (wood and stone left out, they can be gathered): the
        // first animal carrying the whole building, and one of a full building carrying its share.
        const b = buildingFor(x);
        if (!b || !x.purchase_price || !(full.goldPerDay > 0)) return { payback_days_with_building: null, payback_days_full_building: null };
        return {
          payback_days_with_building: r2((x.purchase_price + b.total.gold) / full.goldPerDay),
          payback_days_full_building: r2((x.purchase_price + b.total.gold / b.capacity) / full.goldPerDay),
        };
      })(),
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
        const o = allocate(c, data.machines, { items: 0, counts: {}, days: 28, artisan: true, tiller: true }).options.find((x) => x.machine === m.id);
        return o ? { id: c.id, name: c.name, product: o.productName, price: o.price, input: o.inputCount, minutes: o.minutes, days: r2(o.minutes / data.machines.minutes_per_day), gain_per_machine_day: r0(o.gainPerMachineDay), raw: o.price / o.inputCount - o.gainPerItem } : null;
      })
      .filter(Boolean)
      .sort((x, y) => y.gain_per_machine_day - x.gain_per_machine_day);
    machinesOut[m.id] = { id: m.id, name: m.name, crops: rows.map(({ raw, ...rest }) => rest), accepted: rows.length };
  }

  return { game_version: data.crops.game_version, crops: cropOut, animals: animalsOut, machines: machinesOut };
}

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (header, rows) => [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n';

/** Plain CSV downloads of the entity tables (file name => text). */
export function buildCsv(ent) {
  const crops = Object.values(ent.crops).map((c) => {
    const best = c.plantings.reduce((b, p) => (!b || p.profit.level6 > b.profit.level6 ? p : b), null);
    return [c.id, c.name, c.category, c.seasons.join('/'), c.growth_days, c.regrow_days, c.base_price, c.prices.silver, c.prices.gold, c.prices.iridium, best && best.season, best && best.profit.level0, best && best.profit.level6, best && best.profit.level10, best && best.seed_cost];
  });
  const animals = Object.values(ent.animals).map((a) => [a.id, a.name, a.building, a.price, a.days_to_mature, a.frequency_days, a.frequency_full_days, a.full.raw, a.full.processed, a.payback_days_raw, a.payback_days_best_case, a.building_needed && a.building_needed.total.gold, a.payback_days_with_building, a.payback_days_full_building]);
  const machines = Object.values(ent.machines).flatMap((m) => m.crops.map((c, i) => [m.id, i + 1, c.id, c.product, c.input, c.price, c.days, c.gain_per_machine_day]));
  return {
    'stardew-crops.csv': toCsv(['id', 'name', 'type', 'seasons', 'growth_days', 'regrow_days', 'sell_price', 'silver_price', 'gold_price', 'iridium_price', 'best_season', 'profit_per_tile_level0', 'profit_per_tile_level6', 'profit_per_tile_level10', 'seed_cost'], crops),
    'stardew-farm-animals.csv': toCsv(['id', 'name', 'building', 'price', 'days_to_mature', 'days_between_products_base', 'days_between_products_5_hearts', 'raw_gold_per_day_5_hearts', 'artisan_goods_gold_per_day_5_hearts', 'payback_days_raw', 'payback_days_best_case_artisan', 'building_gold_from_scratch', 'payback_days_raw_incl_whole_building', 'payback_days_raw_incl_building_share_full'], animals),
    'stardew-machine-rankings.csv': toCsv(['machine', 'rank', 'crop_id', 'product', 'crops_needed', 'product_price', 'days', 'extra_gold_per_machine_day'], machines),
  };
}

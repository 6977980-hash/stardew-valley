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
import { villagersFor, itemsAt, TASTES, POINTS_PER_HEART, categoryName } from '../../assets/js/engine/gifts.js';

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
      // The universal category most likers come through ("All Vegetables"), when there is one.
      const via = v.like.map((x) => v.why[x.id]).filter((w) => w.via === 'universal-category');
      const rule = via.length ? categoryName(data.gifts, via[0].category) : null;
      gifts = { love: names('love'), like: names('like'), like_rule: rule, neutral: v.neutral.length, dislike: names('dislike'), hate: names('hate'), unknown: v.unknown.length, of: data.gifts.villagers.length };
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

  const out = { game_version: data.crops.game_version, crops: cropOut, animals: animalsOut, machines: machinesOut };
  if (data.gifts) out.villagers = buildVillagers(data.gifts, cropOut);
  if (data.bundles) out.bundles = buildBundles(data.bundles, cropOut);
  return out;
}

/* ---- Villagers: birthday and every gift taste, from gifts.json ---- */
function buildVillagers(gifts, cropOut) {
  const names = new Map(gifts.items.map((i) => [i.id, i.name]));
  const fr = gifts.friendship;
  const name = (id) => names.get(id) || id;
  const out = {};
  for (const v of gifts.villagers) {
    const tastes = {};
    const categories = {};
    for (const t of TASTES) {
      tastes[t] = itemsAt(t, v, gifts).sort((a, b) => name(a).localeCompare(name(b)));
      const mine = v.tastes[t];
      const universal = mine.universal === false ? [] : gifts.universal[t].categories.filter((c) => !(mine.universal_except || []).includes(c.id)).map((c) => `${categoryName(gifts, c.id)} (universal)`);
      categories[t] = [...mine.categories.map((c) => c.text), ...universal];
    }
    const sameSeason = gifts.villagers
      .filter((o) => o.id !== v.id && o.birthday.season === v.birthday.season)
      .sort((a, b) => a.birthday.day - b.birthday.day)
      .map((o) => ({ id: o.id, name: o.name, day: o.birthday.day }));
    const own = new Set(TASTES.flatMap((t) => v.tastes[t].items));
    out[v.id] = {
      id: v.id,
      name: v.name,
      birthday: v.birthday,
      marriage_candidate: !!v.marriage_candidate,
      // Item names per taste: the villager's own list first, then the universal items that apply.
      tastes: Object.fromEntries(TASTES.map((t) => [t, { own: tastes[t].filter((id) => own.has(id)).map(name), universal: tastes[t].filter((id) => !own.has(id)).map(name) }])),
      categories,
      // Universal loves this villager does not love (their own list or a recorded exception wins).
      not_universal: gifts.universal.love.items.filter((id) => !tastes.love.includes(id)).map((id) => ({ name: name(id), taste: TASTES.find((t) => tastes[t].includes(id)) || null })),
      growable: ['love', 'like'].flatMap((t) => tastes[t].filter((id) => cropOut[id]).map((id) => ({ id, name: name(id), taste: t, seasons: cropOut[id].seasons }))),
      points: { ...fr.points, birthday: fr.multipliers.birthday, winter_star: fr.multipliers.winter_star, quality: fr.quality_multipliers, per_heart: POINTS_PER_HEART, loves_for_10_hearts: Math.ceil((10 * POINTS_PER_HEART) / fr.points.love) },
      birthday_neighbours: sameSeason,
      sources: v.sources.map((x) => x.url),
    };
  }
  return out;
}

/* ---- Community Center rooms: each standard bundle with where to find every item ---- */
function buildBundles(bundles, cropOut) {
  const items = new Map(bundles.items.map((i) => [i.id, i]));
  const out = {};
  for (const room of bundles.rooms) {
    const list = (set) => bundles.bundles.filter((b) => b.set === set && b.room === room.id);
    const standard = list('standard');
    if (!standard.length) continue;
    const one = (b) => ({
      id: b.id,
      name: b.name,
      slots: b.slots || 0,
      gold: b.gold || 0,
      reward: b.reward ? { name: b.reward.name || b.reward.room_reward || b.reward.id, qty: b.reward.qty || 1 } : null,
      items: (b.items || []).map((i) => {
        const info = items.get(i.id) || {};
        return { id: i.id, name: i.name, qty: i.qty, quality: i.quality, seasons: info.seasons || [], obtain: info.obtain || '', ...(cropOut[i.id] ? { crop: true } : {}) };
      }),
    });
    out[room.id] = {
      id: room.id,
      name: room.name,
      reward: room.reward,
      unlock: room.unlock || '',
      effect: room.effect || '',
      // Rooms of gold-only or single bundles are covered on the index page, not a thin page of their own.
      page: standard.filter((b) => (b.items || []).length).length > 1,
      bundles: standard.map(one),
      remixed: list('remixed')
        .filter((b) => !standard.some((x) => x.name === b.name && JSON.stringify(one(x).items) === JSON.stringify(one(b).items)))
        .map(one),
    };
  }
  return out;
}

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (header, rows) => [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n';

// Columns of each CSV download: [name, type, description]. The header row, datapackage.json and
// the column dictionary on /data/ all come from this list.
export const CSV_COLUMNS = {
  'stardew-crops': {
    title: 'Crops',
    description: 'One row per crop: seasons, growth, sell prices by quality and profit per tile in its best season.',
    columns: [
      ['id', 'string', 'Our slug for the crop, also its page URL: /crops/{id}/'],
      ['name', 'string', 'Crop name as in the game'],
      ['type', 'string', 'vegetable, fruit, flower or other'],
      ['seasons', 'string', 'Seasons it grows outdoors, separated by /'],
      ['growth_days', 'integer', 'Days from planting to the first harvest, no fertilizer'],
      ['regrow_days', 'integer', 'Days between harvests for regrowing crops; empty if it is replanted'],
      ['sell_price', 'integer', 'Sell price of one normal-quality crop in gold, no professions'],
      ['silver_price', 'integer', 'Sell price at silver quality'],
      ['gold_price', 'integer', 'Sell price at gold quality'],
      ['iridium_price', 'integer', 'Sell price at iridium quality'],
      ['best_season', 'string', 'Season with the highest profit per tile at Farming level 6, planted on day 1'],
      ['profit_per_tile_level0', 'integer', 'Gold per tile over that season at Farming level 0: harvests sold raw, minus seeds'],
      ['profit_per_tile_level6', 'integer', 'The same at Farming level 6'],
      ['profit_per_tile_level10', 'integer', 'The same at Farming level 10'],
      ['seed_cost', 'integer', 'Seed gold spent on one tile over that season (cheapest shop); empty if seeds have no shop price'],
    ],
  },
  'stardew-farm-animals': {
    title: 'Farm animals',
    description: 'One row per farm animal: building, price, product timing, gold per day at five hearts and payback.',
    columns: [
      ['id', 'string', 'Our slug for the animal, also its page URL: /farm-animals/{id}/'],
      ['name', 'string', 'Animal name as in the game'],
      ['building', 'string', 'coop or barn'],
      ['price', 'integer', "Price at Marnie's Ranch; empty if it is not sold"],
      ['days_to_mature', 'integer', 'Days before it starts producing'],
      ['days_between_products_base', 'number', 'Days between products before friendship or professions'],
      ['days_between_products_5_hearts', 'number', 'Days between products at five hearts and full mood'],
      ['raw_gold_per_day_5_hearts', 'integer', 'Gold a day selling its products raw at five hearts, no professions, average luck'],
      ['artisan_goods_gold_per_day_5_hearts', 'integer', 'Gold a day with products made into artisan goods, with the Artisan profession'],
      ['payback_days_raw', 'integer', 'Animal price divided by raw gold per day'],
      ['payback_days_best_case_artisan', 'integer', 'Animal price divided by artisan gold per day'],
      ['building_gold_from_scratch', 'integer', 'Gold to build the smallest building it needs from an empty plot (wood and stone not priced)'],
      ['payback_days_raw_incl_whole_building', 'integer', 'Days to pay back the animal and that whole building with raw sales'],
      ['payback_days_raw_incl_building_share_full', 'integer', 'Days to pay back the animal and its share of a full building with raw sales'],
    ],
  },
  'stardew-machine-rankings': {
    title: 'Machine rankings',
    description: 'One row per crop per machine (Keg, Preserves Jar): the product, its price, the time and extra gold per machine per day.',
    columns: [
      ['machine', 'string', 'keg or preserves-jar'],
      ['rank', 'integer', 'Place in that machine\'s list, best extra gold per machine per day first'],
      ['crop_id', 'string', 'Crop slug, as in the crops file'],
      ['product', 'string', 'What the machine makes from it'],
      ['crops_needed', 'integer', 'Crops needed for one run (5 for Coffee, 1 for the rest)'],
      ['product_price', 'integer', 'Product price with the Artisan profession'],
      ['days', 'number', 'Days one run takes, at 1,600 game minutes a day'],
      ['extra_gold_per_machine_day', 'integer', 'Product price minus the crops\' raw value (with Tiller), per day of machine time'],
    ],
  },
};

/** Plain CSV downloads of the entity tables (file name => text), plus a copy named with the game version. */
export function buildCsv(ent) {
  const crops = Object.values(ent.crops).map((c) => {
    const best = c.plantings.reduce((b, p) => (!b || p.profit.level6 > b.profit.level6 ? p : b), null);
    return [c.id, c.name, c.category, c.seasons.join('/'), c.growth_days, c.regrow_days, c.base_price, c.prices.silver, c.prices.gold, c.prices.iridium, best && best.season, best && best.profit.level0, best && best.profit.level6, best && best.profit.level10, best && best.seed_cost];
  });
  const animals = Object.values(ent.animals).map((a) => [a.id, a.name, a.building, a.price, a.days_to_mature, a.frequency_days, a.frequency_full_days, a.full.raw, a.full.processed, a.payback_days_raw, a.payback_days_best_case, a.building_needed && a.building_needed.total.gold, a.payback_days_with_building, a.payback_days_full_building]);
  const machines = Object.values(ent.machines).flatMap((m) => m.crops.map((c, i) => [m.id, i + 1, c.id, c.product, c.input, c.price, c.days, c.gain_per_machine_day]));
  const rows = { 'stardew-crops': crops, 'stardew-farm-animals': animals, 'stardew-machine-rankings': machines };
  const out = {};
  for (const [name, r] of Object.entries(rows)) {
    const text = toCsv(CSV_COLUMNS[name].columns.map((c) => c[0]), r);
    out[`${name}.csv`] = text;
    out[`${name}-${ent.game_version}.csv`] = text;
  }
  out['datapackage.json'] = JSON.stringify(buildDatapackage(ent.game_version), null, 2) + '\n';
  return out;
}

/** Frictionless Data package describing the CSVs: source, licence, version and every column. */
export function buildDatapackage(version) {
  return {
    name: 'stardew-tools-data',
    title: `Stardew Tools data downloads (Stardew Valley ${version})`,
    description: 'Crop, farm animal and artisan machine tables calculated by the Stardew Tools engine from game data on the Stardew Valley Wiki. Assumptions for each column are in its description.',
    homepage: 'https://stardewtools.net/data/',
    version,
    licenses: [{ name: 'CC-BY-NC-SA-3.0', path: 'https://creativecommons.org/licenses/by-nc-sa/3.0/', title: 'Creative Commons Attribution-NonCommercial-ShareAlike 3.0 (the Stardew Valley Wiki licence)' }],
    sources: [{ title: 'Stardew Valley Wiki', path: 'https://stardewvalleywiki.com/' }],
    contributors: [{ title: 'Stardew Tools', path: 'https://stardewtools.net/', role: 'author' }],
    keywords: ['Stardew Valley', 'crops', 'farm animals', 'artisan machines', 'profit'],
    resources: Object.entries(CSV_COLUMNS).map(([name, def]) => ({
      name,
      path: `${name}-${version}.csv`,
      title: def.title,
      description: def.description,
      format: 'csv',
      mediatype: 'text/csv',
      encoding: 'utf-8',
      schema: { fields: def.columns.map(([n, type, description]) => ({ name: n, type, description })) },
    })),
  };
}

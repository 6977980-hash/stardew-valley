// Default-state tables printed on the tool pages (data/answers.json "tables"), so that search
// engines, answer engines and people without JavaScript see the same results the calculator shows
// before anything is changed. Built from the same engine and data as the tools.
import { allocate } from '../../assets/js/engine/machines.js';
import { rankCrops } from '../../assets/js/engine/decision.js';
import { rankPonds } from '../../assets/js/engine/fishpond.js';
import { cropProfit } from '../../assets/js/engine/profit.js';
import { itemsAt } from '../../assets/js/engine/gifts.js';
import { fishXp, farmingXpPerDay } from '../../assets/js/engine/skills.js';

const SHOPS = ['pierre', 'jojamart', 'oasis'];
const r0 = (n) => Math.round(n);

/** Crafting recipes shown on the Crafting Calculator: the machines and sprinklers players plan for. */
export const CRAFTING_TABLE = ['keg', 'preserves-jar', 'cask', 'dehydrator', 'bee-house', 'cheese-press', 'mayonnaise-machine', 'loom', 'oil-maker', 'fish-smoker', 'crab-pot', 'sprinkler', 'quality-sprinkler', 'iridium-sprinkler', 'seed-maker', 'crystalarium'];

export function buildToolTables(data, crops) {
  // What to Plant Today with the tool's defaults: Year 1, Spring 1, 500g, 15 tiles, level 0, no
  // machines, and the free seeds every new farm has.
  const start = data.yearOne && data.yearOne.start_seeds ? { crop: data.yearOne.start_seeds.crop, qty: data.yearOne.start_seeds.qty } : null;
  const plant = rankCrops(crops, data, { season: 'spring', today: 1, tiles: 15, budget: 500, farmingLevel: 0, farmYear: 1, freeSeeds: start })
    .filter((x) => !x.unaffordable)
    .slice(0, 10)
    .map((x) => ({ id: x.crop.id, name: x.crop.name, tiles: x.tiles, seed_price: x.seed.price, spend_now: r0(x.spendNow), free_seeds: x.freeSeeds || 0, harvests: x.r.harvestDays.length, total: r0(x.total) }));

  // Keg vs Preserves Jar for every crop both machines accept, at normal quality, no professions.
  const kegJar = crops
    .map((c) => {
      const o = allocate(c, data.machines, { items: 0, counts: {}, days: 28 }).options;
      const keg = o.find((x) => x.machine === 'keg');
      const jar = o.find((x) => x.machine === 'preserves-jar');
      if (!keg || !jar) return null;
      const better = keg.gainPerItem === jar.gainPerItem ? 'tie' : keg.gainPerItem > jar.gainPerItem ? 'keg' : 'jar';
      return {
        id: c.id,
        name: c.name,
        keg: { product: keg.productName, price: keg.price, per_item: r0(keg.gainPerItem), per_day: r0(keg.gainPerMachineDay) },
        jar: { product: jar.productName, price: jar.price, per_item: r0(jar.gainPerItem), per_day: r0(jar.gainPerMachineDay) },
        better,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Math.max(b.keg.per_day, b.jar.per_day) - Math.max(a.keg.per_day, a.jar.per_day));

  // Greenhouse: every crop for a year, already grown (year 2+), raw and the best way with Artisan.
  const tiles = 120 - data.greenhouse.sprinklers.find((s) => s.id === 'iridium').soil_used;
  const ghOne = (c, sellAs) => cropProfit(c, data, { greenhouse: true, horizonDays: 112, established: true, sellAs, artisan: true });
  const greenhouse = crops
    .map((c) => ({ c, raw: ghOne(c, 'raw'), best: ghOne(c, 'best') }))
    .filter(({ raw }) => raw.harvestDays.length)
    .sort((a, b) => b.raw.profit - a.raw.profit)
    .slice(0, 12)
    .map(({ c, raw, best }) => ({ id: c.id, name: c.name, harvests: raw.harvestDays.length, raw: r0(raw.profit), raw_total: r0(raw.profit * tiles), best: r0(best.profit), best_as: best.sellAs }));

  // Fish ponds: the 20 best full ponds a day with roe sold raw, and the same pond with Artisan roe.
  // Legendary fish are left out, as in the short answer: their ponds hold one fish.
  const processed = new Map(rankPonds(data.fishponds, { roeAs: 'processed', artisan: true }).map((x) => [x.fish.id, x.out]));
  const ponds = rankPonds(data.fishponds, { roeAs: 'raw' })
    .filter((x) => x.fish.kind !== 'legendary')
    .slice(0, 20)
    .map((x) => ({ id: x.fish.id, name: x.fish.name, max: x.fish.max_population, raw: r0(x.out.goldPerDay), processed: r0(processed.get(x.fish.id).goldPerDay) }));

  // XP: the level table, the best farming XP per tile per day and the best fish per catch.
  let xp = null;
  if (data.skills) {
    const sk = data.skills;
    xp = {
      levels: sk.levels.thresholds.map((t) => ({ level: t.level, step: t.xp_from_previous, total: t.total })),
      farming: sk.farming.crops
        .map((x) => ({ x, c: crops.find((c) => c.id === x.id) }))
        .filter(({ c }) => c && SHOPS.some((k) => c.seed_prices[k] > 0))
        .map(({ x, c }) => ({ name: x.name, xp: x.xp, per_day: Math.round(farmingXpPerDay(x, c) * 100) / 100 }))
        .sort((a, b) => b.per_day - a.per_day)
        .slice(0, 10),
      fishing: sk.fishing.fish
        .filter((f) => !f.legendary && !data.fishponds.fish.some((p) => p.id === f.id && p.kind === 'legendary'))
        .map((f) => ({ name: f.name, difficulty: f.difficulty, xp: fishXp(f, sk.fishing.formula), perfect: fishXp(f, sk.fishing.formula, { perfect: true }) }))
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 10),
    };
  }

  // Gifts: every villager's birthday and loved gifts (their own list plus universal loves that apply).
  let gifts = null;
  if (data.gifts) {
    const name = (id) => data.gifts.items.find((i) => i.id === id)?.name || id;
    gifts = data.gifts.villagers.map((v) => ({
      id: v.id,
      name: v.name,
      birthday: v.birthday,
      loves: v.tastes.love.items.map(name),
      love_categories: v.tastes.love.categories.map((c) => c.text),
      universal: itemsAt('love', v, data.gifts).filter((id) => !v.tastes.love.items.includes(id)).length,
    }));
  }

  // Bundles: the standard Community Center bundles, room by room.
  let bundles = null;
  if (data.bundles) {
    bundles = data.bundles.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      reward: room.reward,
      bundles: data.bundles.bundles
        .filter((b) => b.set === 'standard' && b.room === room.id)
        .map((b) => ({
          id: b.id,
          name: b.name,
          gold: b.gold || 0,
          slots: b.slots || 0,
          items: (b.items || []).map((i) => `${i.qty > 1 ? `${i.qty} ` : ''}${i.name}${i.quality !== 'normal' ? ` (${i.quality})` : ''}`),
          reward: b.reward ? `${b.reward.qty > 1 ? `${b.reward.qty} ` : ''}${b.reward.name}` : '',
        })),
    })).filter((r) => r.bundles.length);
  }

  // Crafting: ingredients and how to get the recipe for the common farm machines.
  let crafting = null;
  if (data.crafting) {
    crafting = CRAFTING_TABLE.map((id) => data.crafting.recipes.find((r) => r.id === id))
      .filter(Boolean)
      .map((r) => ({ id: r.id, name: r.name, ingredients: r.ingredients.map((i) => `${i.qty} ${i.name}`), obtained: (r.obtained || '').replace(/(\d{4,})g/, (m, n) => `${Number(n).toLocaleString('en-US')}g`) }));
  }

  return { what_to_plant: plant, keg_vs_jar: kegJar, greenhouse: { tiles, rows: greenhouse }, fishpond: ponds, xp, gifts, bundles, crafting };
}

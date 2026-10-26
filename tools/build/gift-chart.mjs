// The Gift Chart page (data/answers.json "gift_chart"): every villager's birthday, own loves and
// hates, the cheapest crop you can grow for the Year 1 birthday, the crops most villagers like in
// each season, and the fish villagers love or like. Built from gifts.json, crops.json, fish.json
// and year-one.json with the same taste rules as the Gift Finder.
import { tasteOf, itemsAt, categoryName } from '../../assets/js/engine/gifts.js';
import { seasonLabel } from '../../assets/js/engine/fish.js';

export const SEASONS = ['spring', 'summer', 'fall', 'winter'];
// Shops open every day of Year 1. The Oasis needs the desert bus, which most farms fix later.
const YEAR_ONE_SHOPS = ['pierre', 'jojamart'];

/** Cheapest Year 1 seed for a crop ({ shop, price }), or null when Year 1 shops do not sell it. */
export function yearOneSeed(crop, yearOne) {
  const later = new Set((yearOne?.pierre_year2_seeds || []).map((s) => s.crop));
  const offers = YEAR_ONE_SHOPS.filter((k) => crop.seed_prices?.[k] > 0 && !(k === 'pierre' && later.has(crop.id))).map((k) => ({ shop: k, price: crop.seed_prices[k] }));
  return offers.sort((a, b) => a.price - b.price)[0] || null;
}

/**
 * The cheapest loved crop, else liked crop, that a Year 1 farm can give on the birthday: grown in
 * the birthday season and ready by the day (plant by the day shown), or grown in an earlier season
 * of the same year and kept in a chest. Null when nothing grows in time (early Spring birthdays).
 */
export function birthdayCrop(villager, gifts, crops, yearOne) {
  const { season, day } = villager.birthday;
  const at = SEASONS.indexOf(season);
  const options = [];
  for (const c of crops) {
    const taste = tasteOf(c.id, villager, gifts);
    if (taste !== 'love' && taste !== 'like') continue;
    const seed = yearOneSeed(c, yearOne);
    if (!seed || c.indoor_only) continue;
    const seasons = c.seasons.map((s) => s.toLowerCase());
    if (seasons.includes(season) && 1 + c.growth_days <= day) {
      options.push({ c, taste, seed, plant_by: day - c.growth_days, grown_in: season });
      continue;
    }
    const earlier = SEASONS.slice(0, at).filter((s) => seasons.includes(s));
    if (earlier.length) options.push({ c, taste, seed, plant_by: null, grown_in: earlier[earlier.length - 1] });
  }
  // Loved before liked, then ready the same season, then the cheapest seed and the quickest crop.
  options.sort((a, b) => (a.taste === 'love' ? 0 : 1) - (b.taste === 'love' ? 0 : 1) || (a.plant_by == null) - (b.plant_by == null) || a.seed.price - b.seed.price || a.c.growth_days - b.c.growth_days || a.c.name.localeCompare(b.c.name));
  const o = options[0];
  return o ? { id: o.c.id, name: o.c.name, taste: o.taste, seed_price: o.seed.price, shop: o.seed.shop, growth_days: o.c.growth_days, plant_by: o.plant_by, grown_in: o.grown_in } : null;
}

export function buildGiftChart(data, crops) {
  const gifts = data.gifts;
  const names = new Map(gifts.items.map((i) => [i.id, i.name]));
  const name = (id) => names.get(id) || id;
  const order = (v) => SEASONS.indexOf(v.birthday.season) * 100 + v.birthday.day;
  const villagers = [...gifts.villagers].sort((a, b) => order(a) - order(b));
  const growable = crops.filter((c) => !c.indoor_only && yearOneSeed(c, data.yearOne));

  const rows = villagers.map((v) => {
    const own = (t) => v.tastes[t].items.map(name).sort((a, b) => a.localeCompare(b));
    return {
      id: v.id,
      name: v.name,
      birthday: v.birthday,
      marriage_candidate: !!v.marriage_candidate,
      loves: [...own('love'), ...v.tastes.love.categories.map((c) => c.text)],
      universal_loves: itemsAt('love', v, gifts).filter((id) => !v.tastes.love.items.includes(id)).map(name).sort((a, b) => a.localeCompare(b)),
      hates: [...own('hate'), ...v.tastes.hate.categories.map((c) => c.text)],
      birthday_crop: birthdayCrop(v, gifts, crops, data.yearOne),
    };
  });

  // Per season: Year 1 crops that please the most villagers (love or like), and who to skip.
  const seasons = {};
  for (const s of SEASONS) {
    const list = growable
      .filter((c) => c.seasons.map((x) => x.toLowerCase()).includes(s))
      .map((c) => {
        const by = { love: [], like: [], neutral: [], dislike: [], hate: [], unknown: [] };
        for (const v of villagers) by[tasteOf(c.id, v, gifts) || 'unknown'].push(v.name);
        const seed = yearOneSeed(c, data.yearOne);
        return { id: c.id, name: c.name, seed_price: seed.price, shop: seed.shop, growth_days: c.growth_days, regrow_days: c.regrow_days, love: by.love, like_count: by.like.length, pleased: by.love.length + by.like.length, avoid: [...by.dislike, ...by.hate] };
      })
      .sort((a, b) => b.pleased - a.pleased || a.seed_price - b.seed_price || a.name.localeCompare(b.name));
    seasons[s] = list.slice(0, 5);
  }

  // Fish that some villager loves or likes by name, with where and when to catch them.
  const fishGifts = [];
  for (const f of data.fish ? data.fish.fish.filter((x) => x.verification_status === 'cross-checked') : []) {
    const love = villagers.filter((v) => tasteOf(f.id, v, gifts) === 'love').map((v) => v.name);
    const like = villagers.filter((v) => tasteOf(f.id, v, gifts) === 'like').map((v) => v.name);
    if (!love.length && !like.length) continue;
    fishGifts.push({ id: f.id, name: f.name, kind: f.kind, where: f.locations.join(', '), season: seasonLabel(f), love, like });
  }
  fishGifts.sort((a, b) => b.love.length - a.love.length || b.like.length - a.like.length || a.name.localeCompare(b.name));

  // Universal likes every villager shares (named groups), shown once above the chart.
  const universalLike = gifts.universal.like.categories.map((c) => categoryName(gifts, c.id));
  return { villagers: rows, seasons, fish: fishGifts, universal_like: universalLike, universal_love: gifts.universal.love.items.map(name) };
}

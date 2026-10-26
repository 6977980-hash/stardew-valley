#!/usr/bin/env node
// Builds data/ginger-island.json: the facts the Ginger Island farm guide needs that no other data
// file holds. How to reach the island (Willy's invitation, the boat repair, the ticket), what each
// Golden Walnut unlock costs, how the island farm differs from the valley (any crop in any season,
// no crows, its own weather, plantable tiles), the island-only seeds and saplings the Island Trader
// barters for, the irrigated growth of Taro Root and Rice, the walnuts farming gives, and the
// shortcuts back and forth (Farm Obelisk, Warp Totem: Island, Island Obelisk).
//
// Nothing is typed in by hand. Each value is paired with the wiki sentence or table cell that states
// it and the import fails if that evidence is gone. Values that two pages state must agree on both
// (the boat materials on the Fish Shop page and each material's page, each walnut price on the
// Golden Walnut table and the area's page, each trade on the Island Trader page and the seed's own
// page, saplings also against data/fruittrees.json). A value only one page states is marked
// single_source. The file is only written once every check passed.
//
//   node tools/data/import-ginger-island.mjs [--cached]
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchRendered, fetchArticle, sleep } from './wiki.mjs';
import { slug } from './parse-crops.mjs';
import { text } from './import-buildings.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = join(ROOT, 'tools', 'data', '.cache');
const GAME_VERSION = '1.6.15';
const useCache = process.argv.includes('--cached');
const failures = [];

async function cached(key, fn) {
  const file = join(CACHE, `${key}.json`);
  if (useCache && existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  let v;
  for (let attempt = 1; ; attempt++) {
    try {
      v = await fn();
      break;
    } catch (e) {
      if (attempt >= 5) throw e;
      await sleep(2000 * attempt);
    }
  }
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(file, JSON.stringify(v));
  await sleep(1500);
  return v;
}
// The API first; the article URL serves the same rendered HTML when the API is unavailable.
const rendered = (title) =>
  cached(`${slug(title)}-html`, async () => {
    try {
      return await fetchRendered(title);
    } catch {
      return fetchArticle(title);
    }
  });
const ref = (p) => ({ title: p.title, url: p.url, revid: p.revid });
const num = (s) => Number(String(s).replace(/,/g, ''));
const pages = {};
const page = async (title) => (pages[title] ??= await rendered(title));
const txt = (p) => (p._text ??= text(p.html));

/** The first match of re on the page's text, or a failure. */
function find(p, re) {
  const m = txt(p).match(re);
  if (!m) failures.push(`${p.title}: evidence not found ${re}`);
  return m;
}

/** A fact with its evidence sentences and source pages. */
const fact = (value, ...found) => {
  const ok = found.filter(Boolean);
  return { value, evidence: ok.map((f) => f.m[0].replace(/\s+/g, ' ').trim()), sources: ok.map((f) => ref(f.p)), ...(ok.length < 2 ? { single_source: true } : {}) };
};
const at = async (title, re) => {
  const p = await page(title);
  const m = find(p, re);
  return m ? { p, m } : null;
};
function agree(what, ...vals) {
  const v = vals.filter((x) => x !== undefined && x !== null).map(String);
  if (v.length < 2 || new Set(v).size !== 1) failures.push(`${what}: pages disagree or one is missing (${vals.join(' / ')})`);
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);

  /* ---------- Getting there ---------- */
  const invite = await at('Fish Shop', /When the player completes the Community Center Bundles or views the Joja Warehouse completion cutscene, Willy will mail the player an invitation/);
  const boatShop = await at('Fish Shop', /To repair the boat, the player must provide: Hardwood \((\d+)\) for the hull Iridium Bar \((\d+)\) for the anchor Battery Pack \((\d+)\) for the ticket stand/);
  const hard = await at('Hardwood', /Willy's Boat needs (\d+) Hardwood to repair the boat's outer hull\./);
  const irid = await at('Iridium Bar', /Willy's Boat needs (\d+) Iridium Bars to repair the anchor\./);
  const batt = await at('Battery Pack', /Willy's Boat needs (\d+) Battery Packs to repair the ticket stand\./);
  if (boatShop) {
    agree('boat Hardwood', boatShop.m[1], hard && hard.m[1]);
    agree('boat Iridium Bars', boatShop.m[2], irid && irid.m[1]);
    agree('boat Battery Packs', boatShop.m[3], batt && batt.m[1]);
  }
  const ticketShop = await at('Fish Shop', /transportation to and from Ginger Island at a ticket price of ([\d,]+)g/);
  const ticketIsland = await at('Ginger Island', /Purchasing a ticket to ride the boat costs ([\d,]+)g , including the return trip/);
  agree('boat ticket', ticketShop && num(ticketShop.m[1]), ticketIsland && num(ticketIsland.m[1]));
  const ticketDay = await at('Fish Shop', /Starting the day after viewing the boat repair cutscene with Willy & Robin, the player can buy a boat ticket in the back room\./);
  const freeBack = await at('Ginger Island', /The player can return to Stardew Valley at any time for free by entering the boat on the southern beach\./);

  const getting_there = {
    invitation: fact('community-center-or-joja', invite),
    boat_repair: fact(
      boatShop ? [
        { item: 'Hardwood', qty: num(boatShop.m[1]), part: 'hull' },
        { item: 'Iridium Bar', qty: num(boatShop.m[2]), part: 'anchor' },
        { item: 'Battery Pack', qty: num(boatShop.m[3]), part: 'ticket stand' },
      ] : null,
      boatShop, hard, irid, batt,
    ),
    ticket: fact(ticketShop ? num(ticketShop.m[1]) : null, ticketShop, ticketIsland),
    ticket_from_next_day: fact(true, ticketDay),
    return_free: fact(true, freeBack),
  };

  /* ---------- Golden Walnut unlocks ---------- */
  const gw = await page('Golden Walnut');
  const total = await at('Golden Walnut', /The player can find a total of (\d+) Golden Walnuts scattered on the island/);
  const allRewards = await at('Golden Walnut', /(\d+) walnuts are needed to unlock all of the rewards/);
  const qiRoom = await at('Golden Walnut', /After finding (\d+) Golden Walnuts: Qi's Walnut Room is unlocked\./);
  // "Reward Description Location Cost" table on the Golden Walnut page, then each area's own page.
  const UNLOCKS = [
    { id: 'north', name: 'Ginger Island North', row: /Ginger Island North Unlock access to the north side of the island\. Leo's house (\d+)/, also: null },
    { id: 'west', name: 'Ginger Island West', row: /Ginger Island West Unlock access to the west side of the island\. Ginger Island South (\d+)/, also: ['Ginger Island', /The turtle blocking the path to Island West can be removed by paying the nearby parrot (\d+) Golden Walnuts \./] },
    { id: 'farmhouse', name: 'Island Farmhouse', row: /Ginger Island Farmhouse Unlock the Farmhouse on the west side of the island, which can be used to sleep in to pass the day without leaving the island\. Ginger Island West (\d+)/, also: ['Island Farmhouse', /It can be repaired for (\d+) Golden Walnuts \./] },
    { id: 'mailbox', name: 'Farmhouse Mailbox', row: /Farmhouse Mailbox Allow players to access their mail without leaving the island\. Ginger Island Farmhouse (\d+)/, also: ['Island Farmhouse', /The player has the option to pay another (\d+) Golden Walnuts to add a mailbox/] },
    { id: 'farm-obelisk', name: 'Farm Obelisk', row: /Farm Obelisk Allow players to teleport back to the farm , similar to a warp totem \. Ginger Island Farmhouse (\d+)/, also: ['Island Farmhouse', /the player can then pay (\d+) Golden Walnuts for the parrots to build a Farm Obelisk/] },
    { id: 'dig-site', name: 'Island Dig Site', row: /Island Dig Site Repair the bridge to access the island dig site \. Ginger Island North (\d+)/, also: ['Ginger Island', /broken bridge which can be repaired by parrots in exchange for (\d+) Golden Walnuts \./] },
    { id: 'trader', name: 'Island Trader', row: /Island Trader Unlock the Island Trader shop\. Ginger Island North (\d+)/, also: ['Island Trader', /The Island Trader is unlocked for (\d+) Golden Walnuts after purchasing the Island Farmhouse \./] },
    { id: 'volcano-bridge', name: 'Volcano Bridge', row: /Volcano Bridge Unlock a permanent bridge into the volcano so that players no longer have to have their watering can to get in\. Volcano Dungeon entrance (\d+)/, also: ['Ginger Island', /a parrot will perch near the lava river offering to unlock a permanent bridge in exchange for (\d+) Golden Walnuts \./] },
    { id: 'volcano-shortcut', name: 'Volcano Exit Shortcut', row: /Volcano Exit Shortcut Unlock an escape shortcut from level 5 of the Volcano Dungeon , allowing quick access to Island North \. Volcano Dungeon level 5 (\d+)/, also: null },
    { id: 'resort', name: 'Island Resort', row: /Island Resort Unlock a beach resort\. NPCs from the town will occasionally come to visit the resort\. This also unlocks Island Southeast and the Pirate Cove \. Ginger Island South (\d+)/, also: ['Ginger Island', /the ruins can be rebuilt into a beach resort for (\d+) Golden Walnuts \./] },
    { id: 'parrot-express', name: 'Parrot Express', row: /Parrot Express Unlock a fast travel system to quickly get around the island\. Ginger Island (\d+)/, also: ['Ginger Island', /To unlock the express, the player must pay (\d+) Golden Walnuts to the parrots/] },
  ];
  const unlocks = [];
  for (const u of UNLOCKS) {
    const a = { p: gw, m: find(gw, u.row) };
    const b = u.also ? await at(u.also[0], u.also[1]) : null;
    if (!a.m) continue;
    if (u.also) agree(`${u.name} walnuts`, a.m[1], b && b.m[1]);
    unlocks.push({ id: u.id, name: u.name, walnuts: num(a.m[1]), ...fact(null, a, b), value: undefined });
  }
  const unlockSum = unlocks.reduce((s, u) => s + u.walnuts, 0);
  if (allRewards && unlockSum !== num(allRewards.m[1])) failures.push(`Golden Walnut: unlock costs sum to ${unlockSum}, page says ${allRewards.m[1]}`);
  const westLeo = await at('Ginger Island', /This parrot will only appear after the first parrot in Leo 's house has received its own Golden Walnut \./);

  /* ---------- The island farm ---------- */
  const anyCrop = await at('Ginger Island', /Just like with the Greenhouse , any crop can be grown on the Ginger Island farm regardless of the season\./);
  const seasonless = await at('Ginger Island', /the current season does not affect which crops can be planted and grown on the island/);
  const crows = await at('Ginger Island', /Crows won't spawn on this farm either, so Scarecrows aren't necessary\./);
  const sprinklers = await at('Ginger Island', /Sprinklers can be placed here and fruit trees can be planted\./);
  const tiles = await at('Ginger Island', /Island West contains (\d+) plantable tiles which are accessible in normal gameplay: (\d+) on the main farmland/);
  const bin = await at('Island Farmhouse', /The repair includes the addition of a Shipping Bin outside\./);
  const stay = await at('Island Farmhouse', /Repairing the farmhouse allows players to ship goods and spend the night on Ginger Island without passing out\./);
  const animals = await at('Island Farmhouse', /spouses , children , and farm animals cannot be moved to the island\./);
  const weatherOwn = await at('Weather', /The weather on Ginger Island is different from in Stardew Valley/);
  const rain = await at('Weather', /Ginger Island only has two types of weather: sun and rain\. The chance for rain is (\d+)% \(0% on first visit\)\./);
  const cactus = await at('Cactus Seeds', /Cactus seeds may only be planted in the Greenhouse , inside another building using a Garden Pot , or on Ginger Island \./);

  const farm = {
    any_crop_any_season: fact(true, anyCrop, seasonless),
    no_crows: fact(true, crows),
    sprinklers_and_trees: fact(true, sprinklers),
    plantable_tiles: fact(tiles ? num(tiles.m[1]) : null, tiles),
    main_farmland_tiles: fact(tiles ? num(tiles.m[2]) : null, tiles),
    shipping_bin_with_farmhouse: fact(true, bin, stay),
    no_animals: fact(true, animals),
    own_weather: fact(true, weatherOwn, rain),
    rain_chance: fact(rain ? num(rain.m[1]) / 100 : null, rain),
    // Cactus Fruit is indoor-only in the valley (crops.json indoor_only) but grows on the island farm.
    outdoor_ok: fact(['cactus-fruit'], cactus),
  };

  /* ---------- Island Trader seeds and saplings ---------- */
  // "Name Description Price": the price cell of one row ends where the next row's name begins.
  const TRADES = [
    { id: 'taro-tuber', name: 'Taro Tuber', crop: 'taro-root', row: /Taro Tuber Plant these in warm weather\. Takes 10 days to mature\. Grows faster if planted near a body of water\. ([A-Z][a-z]+(?: [A-Z][a-z]+)*) \((\d+)\)/, own: ['Taro Tuber', /Island Trader : ([A-Z][a-z]+(?: [A-Z][a-z]+)*) \((\d+)\)/] },
    { id: 'pineapple-seeds', name: 'Pineapple Seeds', crop: 'pineapple', row: /Pineapple Seeds Plant these in warm weather\. Takes 14 days to mature, and keeps producing fruit after that\. ([A-Z][a-z]+(?: [A-Z][a-z]+)*) \((\d+)\)/, own: ['Pineapple Seeds', /Island Trader : ([A-Z][a-z]+(?: [A-Z][a-z]+)*) \((\d+)\)/] },
    { id: 'banana-sapling', name: 'Banana Sapling', tree: 'banana', row: /Banana Sapling Takes 28 days to produce a mature Banana tree\. Bears fruit in the summer, or all year round when planted on Ginger Island\. ([A-Z][a-z]+(?: [A-Z][a-z]+)*) \((\d+)\)/, own: ['Banana Sapling', /Island Trader : ([A-Z][a-z]+(?: [A-Z][a-z]+)*) \((\d+)\)/] },
    { id: 'mango-sapling', name: 'Mango Sapling', tree: 'mango', row: /Mango Sapling Takes 28 days to produce a mature Mango tree\. Bears fruit in the summer, or all year round when planted on Ginger Island\. ([A-Z][a-z]+(?: [A-Z][a-z]+)*) \((\d+)\)/, own: ['Mango Sapling', /Island Trader : ([A-Z][a-z]+(?: [A-Z][a-z]+)*) \((\d+)\)/] },
  ];
  const fruittrees = JSON.parse(readFileSync(join(ROOT, 'data', 'fruittrees.json'), 'utf8'));
  const crops = JSON.parse(readFileSync(join(ROOT, 'data', 'crops.json'), 'utf8'));
  const trades = [];
  for (const t of TRADES) {
    const a = await at('Island Trader', t.row);
    const b = await at(t.own[0], t.own[1]);
    if (!a || !b) continue;
    agree(`${t.name} trade`, `${a.m[1]} ${a.m[2]}`, `${b.m[1]} ${b.m[2]}`);
    if (t.tree) {
      const tree = fruittrees.trees.find((x) => x.id === t.tree);
      const it = tree && tree.sapling_prices.island_trader;
      if (!it || it.item !== a.m[1] || it.qty !== num(a.m[2])) failures.push(`${t.name}: Island Trader page (${a.m[1]} ${a.m[2]}) vs fruittrees.json (${it ? `${it.item} ${it.qty}` : 'none'})`);
    }
    if (t.crop && !crops.crops.some((c) => c.id === t.crop && c.verification_status === 'cross-checked')) failures.push(`${t.name}: crop ${t.crop} missing from crops.json`);
    trades.push({ id: t.id, name: t.name, ...(t.crop ? { crop: t.crop } : { tree: t.tree }), item: a.m[1], qty: num(a.m[2]), evidence: [a.m[0], b.m[0]], sources: [ref(a.p), ref(b.p)] });
  }
  const traderOnly = await at('Island Trader', /the Island Trader does not accept gold but only barters in exchange for other items\./);

  /* ---------- Irrigated growth (Taro Root, Unmilled Rice) ---------- */
  const IRRIGATED = [
    { crop: 'taro-root', title: 'Taro Root', re: /(?<!Non-)Irrigated ((?:\d+ Days? ){4})Total: (\d+) Days/, rule: /Taro Root plants do not need to be watered if they are planted near water\./ },
    { crop: 'unmilled-rice', title: 'Unmilled Rice', re: /(?<!Non-)Irrigated ((?:\d+ Days? ){4})Total: (\d+) Days/, rule: /Irrigated Rice Shoots mature in (\d+) days and do not need to be watered\./ },
  ];
  const irrigated = [];
  for (const g of IRRIGATED) {
    const a = await at(g.title, g.re);
    const r = await at(g.title, g.rule);
    if (!a) continue;
    const phases = [...a.m[1].matchAll(/(\d+) Days?/g)].map((x) => num(x[1]));
    const sum = phases.reduce((s, d) => s + d, 0);
    if (sum !== num(a.m[2])) failures.push(`${g.title}: irrigated stages ${phases.join('+')} != ${a.m[2]}`);
    if (r && r.m[1] && num(r.m[1]) !== sum) failures.push(`${g.title}: irrigated ${sum} days vs sentence ${r.m[1]}`);
    const crop = crops.crops.find((c) => c.id === g.crop);
    if (crop && crop.irrigated_growth_days && crop.irrigated_growth_days !== sum) failures.push(`${g.title}: irrigated ${sum} days vs crops.json ${crop.irrigated_growth_days}`);
    irrigated.push({ crop: g.crop, phase_days: phases, growth_days: sum, no_watering: !!r, evidence: [a.m[0], r && r.m[0]].filter(Boolean), sources: [ref(a.p)] });
  }
  const irrigatedMap = await at('Ginger Island', /Island West irrigated tiles map \(taro and rice\)/);

  /* ---------- Walnuts from farming ---------- */
  const harvest = await at('Golden Walnut', /(\d+) Harvesting Each crop harvested on the Ginger Island farm, either by hand or with an Iridium Scythe , have a (\d+)% chance of yielding a Golden Walnut, up to a total of (\d+)\. Only crops that do not regrow and do not require a Scythe to harvest will give Golden Walnuts\./);
  const frogGw = await at('Golden Walnut', /(\d+) Puzzle After the farmhouse is repaired, the player may talk to the Gourmand Frog \. The frog then asks the player to grow a (\w+) , a (\w+) , and a (\w+) , in that order\./);
  const frogPage = await at('Ginger Island', /The Gourmand Frog asks the player to grow three crops, one crop at a time: first (\w+) , then (\w+) , then (\w+) \./);
  const frogEach = await at('Ginger Island', /the frog gives the player (\d+) Golden Walnuts but does not take the crop/);
  if (frogGw && frogPage) agree('Gourmand Frog crops', frogGw.m.slice(2, 5).join(','), frogPage.m.slice(1, 4).join(','));
  if (frogGw && frogEach && num(frogGw.m[1]) !== 3 * num(frogEach.m[1])) failures.push(`Gourmand Frog: ${frogGw.m[1]} walnuts vs 3 × ${frogEach.m[1]}`);
  const frogCrops = frogGw ? frogGw.m.slice(2, 5).map((n) => crops.crops.find((c) => c.name === n)) : [];
  if (frogCrops.some((c) => !c)) failures.push('Gourmand Frog: a requested crop is not in crops.json');
  const farming_walnuts = {
    harvest: harvest ? { max: num(harvest.m[3]), chance: num(harvest.m[2]) / 100, rule: 'single-harvest crops not cut with a scythe', evidence: [harvest.m[0]], sources: [ref(harvest.p)] } : null,
    gourmand_frog: frogGw ? { total: num(frogGw.m[1]), each: frogEach ? num(frogEach.m[1]) : null, crops: frogCrops.map((c) => c && c.id), ...fact(null, frogGw, frogPage), value: undefined } : null,
  };
  if (harvest && num(harvest.m[1]) !== num(harvest.m[3])) failures.push('Golden Walnut: harvest walnut count vs cap');

  /* ---------- Travel shortcuts ---------- */
  const obelisk = await at('Island Obelisk', /Build cost ([\d,]+)g Build materials Iridium Bar \((\d+)\) Dragon Tooth \((\d+)\) Banana \((\d+)\)/);
  const obeliskBanana = await at('Banana', /Ten bananas are required to purchase the Island Obelisk from the Wizard's Tower \./);
  const totem = await at('Warp Totem: Island', /Recipe Source\(s\) Volcano Dwarf for ([\d,]+)g Ingredients Hardwood \((\d+)\) Dragon Tooth \((\d+)\) Ginger \((\d+)\)/);
  const totemGinger = await at('Ginger', /Warp Totem: Island Warp directly to Ginger Island\. Consumed on use\. Hardwood \((\d+)\) Dragon Tooth \((\d+)\) Ginger \((\d+)\) Volcano Dwarf for ([\d,]+)g/);
  if (totem && totemGinger) agree('Warp Totem: Island recipe', totem.m.slice(1, 5).map(num).join(','), [totemGinger.m[4], totemGinger.m[1], totemGinger.m[2], totemGinger.m[3]].map(num).join(','));
  const freeTotem = await at('Warp Totem: Island', /One is obtained after repairing the Farm Obelisk on Ginger Island \./);
  if (obelisk && num(obelisk.m[4]) !== 10) failures.push('Island Obelisk: banana count');
  const travel = {
    island_obelisk: obelisk ? { gold: num(obelisk.m[1]), items: [{ item: 'Iridium Bar', qty: num(obelisk.m[2]) }, { item: 'Dragon Tooth', qty: num(obelisk.m[3]) }, { item: 'Banana', qty: num(obelisk.m[4]) }], ...fact(null, obelisk, obeliskBanana), value: undefined } : null,
    warp_totem: totem ? { recipe_gold: num(totem.m[1]), seller: 'Volcano Dwarf', items: [{ item: 'Hardwood', qty: num(totem.m[2]) }, { item: 'Dragon Tooth', qty: num(totem.m[3]) }, { item: 'Ginger', qty: num(totem.m[4]) }], free_with_farm_obelisk: !!freeTotem, ...fact(null, totem, totemGinger), value: undefined } : null,
  };

  if (failures.length) {
    console.error('Ginger Island import failed:\n  ' + failures.join('\n  '));
    process.exit(1);
  }
  const clean = (o) => JSON.parse(JSON.stringify(o));
  const out = clean({
    schema: 'stardew-tools/gingerisland@1',
    game_version: GAME_VERSION,
    generated: today,
    last_verified: today,
    source: 'Stardew Valley Wiki (CC BY-NC-SA 3.0)',
    sources: [ref(pages['Ginger Island']), ref(gw)],
    getting_there,
    walnuts: {
      total: fact(total ? num(total.m[1]) : null, total),
      all_unlocks: fact(allRewards ? num(allRewards.m[1]) : null, allRewards),
      qi_room: fact(qiRoom ? num(qiRoom.m[1]) : null, qiRoom),
      west_needs_leo: fact(true, westLeo),
      unlocks,
    },
    farm,
    trader: { gold_not_accepted: fact(true, traderOnly), trades },
    irrigated: { tiles_map: fact(true, irrigatedMap), crops: irrigated },
    farming_walnuts,
    travel,
  });
  writeFileSync(join(ROOT, 'data', 'ginger-island.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`ginger-island.json: ${unlocks.length} walnut unlocks (${unlockSum}), ${trades.length} trades, ${irrigated.length} irrigated crops`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

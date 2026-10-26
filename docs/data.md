# Game data: sources and verification

All numbers in `data/` come from the [Stardew Valley Wiki](https://stardewvalleywiki.com) (game version
1.6.15) through its MediaWiki API, and every record stores the page titles, URLs and revision IDs it was
read from. We store facts (numbers, names), not wiki prose. Rebuild with:

```
npm run data:import     # fetch, cross-check, write data/ and tests/fixtures/
npm test                # validate data + engine tests
```

`--cached` on any importer reuses `tools/data/.cache/` (git-ignored) for offline re-runs.

Facts the Crops table cannot express (Sunflower seeds dropped at harvest, Coffee Bean and Ancient Fruit having no shop seed, irrigated growth for Rice and Taro, Sweet Gem Berry's Rare Seed sources and Stardrop trade) live in `CROP_FACTS` in `tools/data/import-crops.mjs`, each with its wiki quote. They are applied on every import; `node tools/data/import-crops.mjs --facts` re-applies them to the current `data/crops.json` without fetching the wiki.

## How a crop is verified

Each crop is read from three wiki pages and only marked `cross-checked` when they agree:

1. **Crops** overview page: stage lengths, total days, regrowth, seed shops and prices, base sell price.
2. **The crop's own page**: infobox growth days, sell price and seasons; its own stage table; category
   from the first sentence, confirmed by the **Fruits / Vegetables / Flowers** list pages.
3. **Crop Growth Calendars**: the day-by-day Base calendar, from which stage lengths are re-derived.

Stage lengths need two of the three sources to agree. Where one disagrees, the record keeps a note.
Today that applies to Powdermelon and Summer Squash, whose own pages show different stage splits
(same total days) than the Crops page and the calendar.

Anything that fails a check is written with `verification_status: "needs-verification"` and a
`problems` list; `Data::crops()` and the tools leave such crops out. Today all 44 crops pass.

## Rule data

`tools/data/import-rules.mjs` writes fertilizers, machines, professions and seasons. Each value is
paired with the exact wiki sentence or table cell that states it, and the import fails if that
evidence is no longer on the current page, so a wiki change can never leave a stale number behind.

Greenhouse: `greenhouse.json` takes the soil size from the Greenhouse page and each sprinkler layout
from that page's layout images plus the Quality and Iridium Sprinkler pages; the engine test checks
every layout waters all 120 tiles.

## Test oracles (tests/fixtures/)

| Fixture | From | Used to check |
| --- | --- | --- |
| `growth-calendars.json` | Crop Growth Calendars: 290 tables (base, Speed-Gro, Deluxe, Hyper, each with and without Agriculturist) | `growth.js` |
| `quality-tables.json` | Fertilizer page: 60 rows of quality percentages | `quality.js` |
| `wiki-prices.json` | Fruits / Vegetables / Flowers pages as rendered by the wiki (its own price module): every quality, Tiller, and Wine/Jelly/Juice/Pickles/Beer/Pale Ale with and without Artisan | `price.js`, `processing.js` |

Known wiki inconsistencies the tests list explicitly: 6 of the 290 calendar tables contradict other
tables on the same page (for example Green Bean and Yam both take 10 days, yet the page shows
Speed-Gro giving 8 days for one and 9 for the other). The engine follows the other 284.

## Fish ponds and animals

`tools/data/import-fishponds.mjs` writes `fishponds.json`. Every fish's base price agrees on its own
page, the Fish page and the wiki-rendered infobox; produce tables come from each fish's page (the
Fish Pond page's summary is kept for comparison, and differences are listed in `produce_conflicts`).
The roe rule (30 + half the fish price, rounded down) is checked against 72 fish pages; the produce
rule (base chance = 8% per fish + 15%, legendary 50%; extra roe 20% repeating) is quoted from the
Fish Pond page.

`tools/data/import-animals.mjs` writes `animals.json`. Price-critical values need two agreeing pages
(the animal's page, Animals, Marnie's Ranch, the Coop/Barn page, the product page and Animal Products
Profitability). The quality and Large-product formulas are checked against the wiki's own table and
worked examples (`tests/fixtures/animal-formulas.json`). Days to mature appear on one page only and
are marked `single_source`. Dinosaur Egg's Rancher bonus is disputed between pages and the record is
marked `needs-verification`.

Two calls the tools make where the wiki is unclear: Rancher is applied to raw animal products only,
not to Mayonnaise, Cheese or Cloth (the profession says "animal products"; some infoboxes list a
Rancher price for those goods); and Truffle quality is counted as regular because it comes from the
player's Foraging skill.

`tools/data/import-buildings.mjs` writes `buildings.json`: the Coop and Barn at each level, with
Robin's gold, wood and stone, capacity and the animals each level adds. Every value must agree between
the Coop/Barn page infobox and the Carpenter's Shop table, the Deluxe totals the Coop and Barn pages
state (in gold, and with wood and stone bought in year 1 and year 2+) must equal the computed sums,
and every animal's building in `animals.json` must be the level that first houses it. It reads the
rendered pages and falls back to the normal article URL when the wiki API is down.

## Skills, crafting, gifts and bundles

Each has an importer in `tools/data/` (`import-skills.mjs`, `import-crafting.mjs`, `import-gifts.mjs`,
`import-bundles.mjs`) and a fixture file in `tests/fixtures/` of wiki figures the tests compare against.
Values need two agreeing pages or are flagged.

- **Skills:** the wiki's gold-quality fishing examples disagree on the quality value; the tools use
  gold = 2 as in its Sardine example. Two tree XP values (14 vs 12, stump 2 vs 1) are marked
  needs-verification and not shown.
- **Crafting:** 150 recipes, no open issues. Ingredients are marked raw (gathered or from a non-recipe
  machine) or made (`via` names the recipe or furnace conversion). The Crab Pot has an alternative
  list for the Trapper profession. Only items that a shop always sells carry a price.
- **Gifts:** the wiki does not name every member of categories like "All Fruit", so the Gift Finder
  never guesses an item into a category. Three villagers are needs-verification where two pages
  disagree (Jas: Hops/Wheat/Tea Leaves exception; Leo: Mango Sticky Rice; Linus: Wild Bait). Hearts use
  250 points per heart (Stardrop Tea: 250 points, 1 heart).
- **Bundles:** Remixed saves pick bundles at random, which can't be read from here, so the tracker
  asks the player which ones they have.

## Casks and Dehydrator (`casks.json`, `dehydrator.json`)

Imported by `tools/data/import-casks.mjs` and `import-dehydrator.mjs` with the same rules as the other
sets (wiki sentence stored as evidence, two agreeing pages or `needs-verification`). Casks: six aged
products with days per quality step, the 1.25 / 1.5 / 2 quality multipliers, cellar size and recipe.
Dehydrator: Dried Fruit, Dried Mushrooms, Raisins and Smoked Fish formulas.

## Fish (`fish.json`)

`tools/data/import-fish.mjs` reads the four tables of the wiki's Fish page (fishing rod fish, Night
Market fish, legendary fish, Crab Pot fish) and checks every fish against its own page's infobox: base
price, difficulty, hours, weather and seasons must agree, and rod fish locations are compared loosely.
A fish is written as `cross-checked` only when both pages agree. Rain Totem seasons, Ginger Island
all-year fish and minimum Fishing levels for legendary fish are kept as separate fields. Bundle names
come from `bundles.json`; prices are also compared with `fishponds.json`. Hours are game hours (6 = 6am,
26 = 2am). The Fish Finder and its reference table use `assets/js/engine/fish.js`.

## Gift Chart (`answers.json` "gift_chart")

`tools/build/gift-chart.mjs` builds the Gift Chart page from `gifts.json`, `crops.json`, `fish.json` and
`year-one.json`; it adds no data of its own. Tastes use the Gift Finder's rules (`engine/gifts.js`
`tasteOf`, so category likes such as All Vegetables count). The Year 1 birthday crop is the cheapest
loved crop, else liked, whose seeds Pierre's or JojaMart sell in Year 1 (Pierre's Year 2 seeds and the
Oasis are left out) and that is ready on the birthday: planted by `day - growth_days` in the birthday
season, or grown in an earlier season of the year and kept. Season lists rank those crops by how many
villagers love or like them.

## Not yet covered

Fruit trees and other artisan machines (Mayonnaise Machine, Cheese Press, Oil Maker…) are added with the tools that need them. Taro Root and Unmilled Rice
use their unirrigated growth times; irrigation is not modelled yet.

Wiki content is licensed CC BY-NC-SA 3.0. Sources are credited on every record and on the
Methodology page.

## Checking for a new game version

After a game patch (or about once a week) run `npm run data:check-version`. It reads the wiki's Version History page and compares the newest version with `game_version` in `data/crops.json`. Exit code 0 means up to date, 1 means a newer version exists (re-run the importers in `tools/data/`, review the diff and bump the version), 2 means the wiki could not be read.

## Fruit trees and Year 1 facts (`fruittrees.json`, `year-one.json`)

`tools/data/import-fruittrees.mjs` writes `fruittrees.json`: the 8 fruit trees, sapling prices (Pierre,
Traveling Cart range, Island Trader trade), season, days to mature and the fruit's price at each
quality. Every tree is read from the Fruit Trees page, its sapling's page and the Fruits list, and each
value must agree on at least two of them. The rules (28 days, one fruit a day, up to 3 on the tree,
quality per year, every day in the Greenhouse and on Ginger Island, sapling quality speed, Tiller and
Artisan, lightning) are each stored with the sentence that states them, and the stated price of all six
Pierre saplings must equal their sum. The Fruits page's own rendered prices (Tiller, Wine, Jelly, Dried
Fruit, with and without Artisan) are kept in `wiki_prices` and `tests/engine/fruittrees.test.js` checks
the engine against every one of them.

`tools/data/import-year-one.mjs` writes `year-one.json` for the Year 1 money guide: starting gold
(Gold), the 15 Parsnip Seeds (Parsnip Seeds), the Egg Festival day and Strawberry Seed price (Egg
Festival; must match `crops.json`), which Pierre seeds are only sold from Year 2 (read from every
seed page Pierre sells: today Artichoke, Garlic, Red Cabbage and Rice Shoot) and that the desert and its
Oasis seeds open with the bus (Calico Desert).

Both importers read the rendered pages and fall back to the article URL when the wiki API is down; on
2026-10-21 the API returned 503 and some uncached article pages did too, so the importers retry and
`--cached` reruns them offline.


## Ginger Island (`ginger-island.json`)

`tools/data/import-ginger-island.mjs` writes the facts the Ginger Island farm guide needs: Willy's
invitation, the boat repair (checked on the Fish Shop page and on the Hardwood, Iridium Bar and Battery
Pack pages), the ticket price (Fish Shop and Ginger Island), every Golden Walnut unlock (the Golden Walnut
table and the area's own page; the costs must add up to the stated total), the island farm rules (any
crop in any season, no crows, plantable tiles, its own weather and rain chance, Cactus allowed outdoors),
the Island Trader trades (trader page and the seed or sapling page; saplings also against
`fruittrees.json`), the irrigated stage lengths of Taro Root and Unmilled Rice, the walnuts farming gives
(harvest drops and the Gourmand Frog), and the Farm Obelisk, Warp Totem: Island and Island Obelisk.
Values only one page states carry `single_source: true`.

The island farm uses the same growth rules as the Greenhouse, so the guide and the Crop Profit
Calculator's "Ginger Island farm" season compute a 112-day all-season year with the same engine. Taro
Root and Rice on irrigated tiles use the irrigated stages from this file.

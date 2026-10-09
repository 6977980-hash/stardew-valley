# Game data: sources and verification

All numbers in `data/` come from the [Stardew Valley Wiki](https://stardewvalleywiki.com) (game version
1.6.15) through its MediaWiki API, and every record stores the page titles, URLs and revision IDs it was
read from. We store facts (numbers, names), not wiki prose. Rebuild with:

```
npm run data:import     # fetch, cross-check, write data/ and tests/fixtures/
npm test                # validate data + engine tests
```

`--cached` on any importer reuses `tools/data/.cache/` (git-ignored) for offline re-runs.

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

## Test oracles (tests/fixtures/)

| Fixture | From | Used to check |
| --- | --- | --- |
| `growth-calendars.json` | Crop Growth Calendars: 290 tables (base, Speed-Gro, Deluxe, Hyper, each with and without Agriculturist) | `growth.js` |
| `quality-tables.json` | Fertilizer page: 60 rows of quality percentages | `quality.js` |
| `wiki-prices.json` | Fruits / Vegetables / Flowers pages as rendered by the wiki (its own price module): every quality, Tiller, and Wine/Jelly/Juice/Pickles/Beer/Pale Ale with and without Artisan | `price.js`, `processing.js` |

Known wiki inconsistencies the tests list explicitly: 6 of the 290 calendar tables contradict other
tables on the same page (for example Green Bean and Yam both take 10 days, yet the page shows
Speed-Gro giving 8 days for one and 9 for the other). The engine follows the other 284.

## Not yet covered

Animals, animal products, fish ponds, fruit trees and other artisan machines (Dehydrator, Cheese Press,
Mayonnaise Machine…) are added with the tools that need them (Phase 4). Taro Root and Unmilled Rice
use their unirrigated growth times; irrigation is not modelled yet.

Wiki content is licensed CC BY-NC-SA 3.0. Sources are credited on every record and on the
Methodology page.

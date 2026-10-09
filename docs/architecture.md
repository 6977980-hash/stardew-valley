# Architecture

## Deployment

```
Claude / local dev  →  GitHub (6977980-hash/stardew-valley, branch main)
                    →  Hostinger "Deploy from GitHub"
                    →  public_html/wp-content/plugins/stardew-tools
                    →  https://stardewtools.net
```

- The repo root **is** the plugin folder. Do not rename the plugin folder or main file: WordPress would deactivate it.
- The theme ships inside the plugin at `theme/stardew-tools-theme` and is registered with
  `register_theme_directory()`, so one repo and one deployment cover both. The theme appears under
  Appearance > Themes only while the plugin is active.
- A GitHub push is not a deployment. Hostinger must pull (manual "Deploy" or its auto-deploy webhook),
  and every release is checked on the live site before it is called deployed.
- Git deploys do not fire WordPress activation hooks, so one-time setup runs on `init` when the stored
  version (`stardew_tools_installed_version`) differs from `STARDEW_TOOLS_VERSION`.
- `tests/`, `docs/` and `tools/` are deployed with the repo but blocked by `.htaccess` (`Require all denied`).

## Plugin (business logic)

| File | Responsibility |
| --- | --- |
| `stardew-tools.php` | Bootstrap, constants, `stardew_tools_brand()` and `stardew_tools_ad()` helpers, theme directory |
| `includes/class-config.php` | Single source of brand identity, colors, default SEO values (`stardew_tools_config` filter) |
| `includes/class-head.php` | Favicons, manifest, theme-color, emoji/generator clean-up |
| `includes/class-seo.php` | Titles, meta description, canonical, robots, Open Graph/Twitter, JSON-LD, sitemap and robots.txt tweaks; steps aside if Yoast/Rank Math/AIOSEO is active |
| `includes/class-ads.php` | Ad slots (off by default), AdSense loader, `/ads.txt`, reserved slot heights |
| `includes/class-pages.php` + `includes/page-templates/` | About, Contact, Privacy, Terms, Disclaimer, Methodology, Changelog |
| `includes/class-data.php` | Read-only access to `data/*.json` (`Data::get()`, `Data::crops()`) |
| `includes/class-admin.php` | Settings > Stardew Tools (status + ad settings) |
| `includes/class-tools.php` + `includes/tool-templates/` | Tool pages: creates one page per tool (`[stardew_tool id]` shortcode, never overwritten once published), renders the template, adds `assets/css/tools.css`, the game data inline (`#st-data`), the tool's ES module and WebApplication JSON-LD |

Tools live in the plugin, not in the theme. A definition may name a shared `template` (the four "Best … Crops" pages share `best-crops.php` and differ by `season`); those pages render their ranked table on the server and use Article schema instead of WebApplication. Each tool is a PHP template (server-rendered short
answer from `data/answers.json`, the form, explanation) plus a module in `assets/js/tools/` that
reads the form and renders results with the engine. `common.js` keeps form state in the URL (share
links) and in localStorage, and renders "Explain the Math". Form field names must not be WordPress
query vars (`day`, `year`, `name`, `page`, `type`…): `?day=` turns the page into a 404.

After a version change the plugin fires `litespeed_purge_all` once (LiteSpeed Cache is active on
Hostinger), so cached pages never keep pointing at old scripts.

`data/answers.json` is built by `node tools/build/answers.mjs` from the data and the engine, so the
short answers in the HTML always match the calculators; `npm test` fails if it is stale.

## Game data (`data/`)

Verified JSON for game version 1.6.15, generated from the Stardew Valley Wiki by `npm run data:import`.
Never edit these files by hand; fix the importer and re-run it. See `docs/data.md`.

| File | Contents |
| --- | --- |
| `crops.json` | 44 crops: stages, growth, regrowth, seasons, category, base price, harvest size, seed prices, sources with wiki revision IDs, verification status |
| `fertilizers.json` | Quality and speed fertilizers, shop prices, fertilizer rules |
| `machines.json` | Keg and Preserves Jar products: inputs, minutes, price rules, Artisan eligibility |
| `professions.json` | Tiller, Artisan, Agriculturist |
| `seasons.json` | 4 seasons of 28 days |
| `greenhouse.json` | Soil grid (12 × 10) and the verified sprinkler layouts that water all of it |
| `fishponds.json` | 73 pond fish: base price, roe, max population, produce table by population (item, quantity, share, price), pond rules (base chance, extra roe), Aged Roe / Caviar, Fisher/Angler |
| `animals.json` | Coop and barn animals: price, building, maturity, frequency, regular and Large/Deluxe products, quality and Large formulas, pig truffles, artisan machines and goods, hay |
| `skills.json` | Level thresholds (level 10 = 15,000 XP), farming XP per crop, fishing XP formula and per-fish difficulty, Mastery, other skills |
| `crafting.json` | 150 recipes with ingredients (raw or made via a recipe/furnace conversion), 9 furnace conversions, 10 shop prices (year 1 and 2) |
| `gifts.json` | 34 villagers: birthday, marriage, loved/liked/neutral/disliked/hated items and categories; universal tastes and exceptions; friendship points |
| `bundles.json` | Community Center rooms, 31 standard and 47 Remixed bundles, items with quantity and quality, season and how to obtain |
| `answers.json` | Built, not imported: short answers shown on the tool pages, and the numbers printed in guides (`guides`, from `tools/build/guides.mjs`) |

## Calculation engine (`assets/js/engine/`)

Plain ES modules, no build step, no dependencies. The same files run in the browser and in Node
tests. Functions are pure: data goes in as arguments.

| Module | What it does |
| --- | --- |
| `growth.js` | Speed-Gro/Agriculturist stage reduction (game algorithm incl. float rounding), harvest days, multi-season and greenhouse windows, last planting day |
| `quality.js` | Regular/silver/gold/iridium chances by farming level and fertilizer |
| `price.js` | Sell price with quality and Tiller/Artisan, using the wiki's rounding |
| `harvest.js` | Expected items per harvest (min/max, level scaling, extra-harvest chance) |
| `processing.js` | Keg and Preserves Jar products for a crop (Beer, Pale Ale, Coffee special cases) |
| `profit.js` | Profit over the growing window with step-by-step explanation (`steps`) for "Explain the Math"; `sellAs: 'best'`, `established` regrowing crops |
| `machines.js` | Splits a harvest across the kegs and jars you own (greedy by gain per item, limited by machine runs) |
| `greenhouse.js` | Sprinkler coverage of the greenhouse soil and the painted layout |
| `fishpond.js` | Daily produce and gold for a pond (base chance × share, extra roe), Aged Roe / Caviar and jars needed, every fish ranked |
| `animals.js` | Quality, Large/Deluxe chance, frequency, pig truffles, machines and professions for one animal type; every animal ranked |
| `skills.js` | Level from XP, XP to a level, fishing XP per catch (quality, treasure, perfect, legendary), farming XP per tile per day |
| `crafting.js` | Expands a list of recipes into raw materials (bars into ore and coal), rounds crafts up once per made item, prices shop-sold parts |
| `gifts.js` | A villager's taste for an item (own list, then universal, then recorded exceptions), items at a taste level, friendship points per gift |
| `bundles.js` | Slots filled, bundle and room progress, items still needed; Remixed alternatives |
| `decision.js` | Decision engine: ranks crops for one player's day, gold, tiles, machines and skills (`rankCrops`) and explains the winner against the runner-up in plain sentences (`reasons`) |

## Theme (presentation)

Classic PHP theme, no build step, no web fonts, ~8 KB CSS, ~0.5 KB JS. Mobile-first (360/390/414 px),
light and dark mode via `prefers-color-scheme`, WCAG 2.1 AA. Reads brand values through
`st_theme_brand()`, which falls back safely if the plugin is missing.

## Ads

| Setting | Effect |
| --- | --- |
| Publisher ID | Validated `ca-pub-…`; also publishes `/ads.txt` |
| AdSense code | Adds the AdSense loader for site review |
| Ad slots | Renders slots that have a slot ID; each reserves height and shows "Advertisement" |

With slots off, nothing ad-related is printed. Slots never render on 404s or search results, and are
placed only after content or results, never between inputs and buttons. EEA/UK consent uses
Google's own CMP, configured in AdSense > Privacy & messaging.

## SEO identity defaults

- Home title: `Stardew Valley Tools, Calculators & Planning Hub | Stardew Tools`
- Other pages: `{Title} | Stardew Tools`
- Schema: WebSite + Organization (home), BreadcrumbList (pages). FAQ/HowTo only where content truly is one.
- Sitemap: WordPress core `/wp-sitemap.xml`, users removed, pages with `_stardew_tools_noindex` excluded.

Tool pages only inline the data sets their definition lists in `data` (default: crops, fertilizers,
machines, seasons, greenhouse). Fish ponds and animals are slimmed first (`Tools::slim_fishponds()`,
`Tools::slim_animals()`): the full files carry wiki evidence and are too large to inline. Skills, crafting,
gifts and bundles have their own `slim_*` functions for the same reason.

## Guides and hubs (`includes/class-guides.php`)

Five topic hubs (Crops and Farming, Artisan Goods, Animals, Fishing, Greenhouse) and guides as child
pages of their hub (`/artisan-goods/how-many-kegs-do-i-need/`). Shortcodes `[stardew_hub id=]` and
`[stardew_guide id=]`; the templates are in `includes/hub-templates/` and `includes/guide-templates/`.
Every number a guide prints comes from `data/answers.json` (`guides`), built by `tools/build/guides.mjs`
with the same engine as the calculators, so a guide cannot disagree with its tool. Tool pages list the
guides that mention them. Schema: Article (guides), CollectionPage with ItemList (hubs), BreadcrumbList.

The Crafting Calculator keeps its list, and the Bundle Tracker its ticks, in `localStorage` only.

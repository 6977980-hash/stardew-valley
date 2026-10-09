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

Tools (Phase 3+) live in the plugin, not in the theme.

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
| `profit.js` | Profit over the growing window with step-by-step explanation (`steps`) for "Explain the Math" |

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

=== Stardew Tools ===
Requires at least: 6.4
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.12.0
License: GPL-2.0-or-later

Core plugin for StardewTools.net: brand identity, SEO foundation, ad slots, site pages and the bundled Stardew Tools Theme.

== Deployment ==
This repository is the plugin folder itself. Hostinger "Deploy from GitHub" root directory:
public_html/wp-content/plugins/stardew-tools

After each deploy the plugin re-runs its page installers once and purges LiteSpeed Cache by
itself. The Hostinger CDN is separate: purge it in hPanel > Website > Cache Manager.

== Changelog ==

= 0.12.0 (2026-10-21) =
* Tools: result next to the form on laptops, short answer folds on phones, home planner and shared links open at the result.
* Inputs: every number box is read the same way (min/max, blank = default, 1e5, decimals) and says what it used; XP target follows the level; plurals.
* Crafting list in share links and cleared by Reset; Bundle Tracker keeps focus, survives bad saved data, enforces Remixed slots, season filter.
* Search: villagers, pond fish and recipes; one Escape closes; index cached and loaded on first open instead of inlined on every page.
* Fallbacks: notice when a tool can't load, menu works without nav.js. Home: one "Browse all tools" link, New badges expire after 30 days.

= 0.11.0 (2026-10-21) =
* Security: no username leak through ?author= or the REST users list, XML-RPC and pingbacks off, no WordPress version in feeds, dev files and raw data blocked.
* Search: empty feeds return 410, /page/N/ and upper-case URLs redirect, robots.txt no longer hides noindex search pages, sitemap dates follow each release.
* Structured data: Organization on every page, complete Article data on Best Crops pages, short breadcrumb names, UtilitiesApplication tools.
* Links: crop names in Best Crops tables, season and building link rows on crop and animal pages, "Learn more" guides under every tool, Gift Finder and Bundle Tracker on the home page.
* Ops: GitHub Actions CI, release lock and cache purge on every deploy, orphaned pages go to draft.

= 0.10.0 (2026-10-21) =
* Animal price questions answered on animal pages, new Animal Prices page, crop "Price, Uses and Profit" pages.

= 0.9.0 (2026-10-21) =
* Calculator and page corrections from the October audit.

= 0.8.2 (2026-10-13) =
* Dataset license on /data/.

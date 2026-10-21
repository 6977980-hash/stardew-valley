=== Stardew Tools ===
Requires at least: 6.4
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.15.0
License: GPL-2.0-or-later

Core plugin for StardewTools.net: brand identity, SEO foundation, ad slots, site pages and the bundled Stardew Tools Theme.

== Deployment ==
This repository is the plugin folder itself. Hostinger "Deploy from GitHub" root directory:
public_html/wp-content/plugins/stardew-tools

After each deploy the plugin re-runs its page installers once and purges LiteSpeed Cache by
itself. The Hostinger CDN is separate: purge it in hPanel > Website > Cache Manager.

== Changelog ==

= 0.15.0 (2026-10-21) =
* New guide: Best Fruit Trees (/crops-and-farming/best-fruit-trees/): all 8 trees, sapling prices, when to plant, fruit price by quality and year, payback, Wine/Jelly/Dried Fruit per fruit, four-year totals, Greenhouse income, Banana and Mango, bundles.
* New guide: Making Money in Year 1 (/crops-and-farming/how-to-make-money-year-1/): Spring 1 with 500g, every crop you can buy in Year 1 by season with seed payback and gold back per gold of seed, Egg Festival Strawberries, Year 2 and desert seeds, Farming XP to Preserves Jars and Kegs, Pantry bundles, coop and trees.
* Data: data/fruittrees.json (tools/data/import-fruittrees.mjs: Fruit Trees, each sapling page and Fruits must agree) and data/year-one.json (tools/data/import-year-one.mjs: starting gold and seeds, Egg Festival, Pierre's Year 2 seeds, desert access). Engine assets/js/engine/fruittrees.js, tested against the wiki's own prices for every quality, Tiller, Wine, Jelly and Dried Fruit.
* Links: both guides on the Crops and Farming hub, /guides/ start-here path, /tools/, the Greenhouse hub and the tool pages they use.

= 0.14.1 (2026-10-21) =
* About: "About the creator" section in the founder's own words (two years playing on PlayStation, mobile and Xbox); Person description in the ProfilePage schema.

= 0.14.0 (2026-10-21) =
* Every tool sends a reference table in the first HTML (default answer readable without JavaScript and by crawlers): 11 tools, data from answers.json "tables".
* New reference pages: /villagers/ (one per villager: birthday, loved/liked gifts, growable gifts, gifts to avoid, 10-heart math) and /bundles/ (one per Community Center room with item tables and seasons; Vault and Missing Bundle on the index).
* Own 1200x630 share image per crop, animal, machine, villager, room and guide (npm run og), og:type article, hand-written tips on top crop and all animal pages.
* All 8 guides over 1,500 words; Quick questions (visible Q&A, no FAQPage schema) on guides and hubs; fishing hub covers catching, tackle, crab pots, legendary fish and the Fish Smoker; /machines/ lists every artisan machine.
* About/Methodology/Contact: no unsupported in-game test claim, corrections policy, AI-assistance note, ProfilePage schema. llms.txt rewritten with key facts, hubs, reference pages and data.
* Data: versioned CSV copies, datapackage.json (Frictionless) and a column dictionary on /data/.
* Tests: stale e2e checks fixed (greenhouse share link, home tool links), JS tables are focusable regions; new content-aeo e2e spec and integration checks.

= 0.13.0 (2026-10-21) =
* Speed: guide and hub pages no longer jump while loading (the "On this page" box is sent closed and opened on wide screens before first paint); short answer sits above it on phones.
* Tools load only the engine files they use, with modulepreload links in the head (no import waterfall). Hero art is drawn with merged paths, 103 KB to 47 KB, same pixels.
* Accessibility: each scrolling table is named after its caption, "On this page" is a nav landmark, the guide "Next step" box is no longer a nested aside.
* All Crops table: profit is the second column, crop names stay in view while scrolling on phones, with a hint above. Byline separators replaced by spacing (no dangling "·"); 404 wording.

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

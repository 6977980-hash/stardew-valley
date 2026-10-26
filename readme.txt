=== Stardew Tools ===
Requires at least: 6.4
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.22.0
License: GPL-2.0-or-later

Core plugin for StardewTools.net: brand identity, SEO foundation, ad slots, site pages and the bundled Stardew Tools Theme.

== Deployment ==
This repository is the plugin folder itself. Hostinger "Deploy from GitHub" root directory:
public_html/wp-content/plugins/stardew-tools

After each deploy the plugin re-runs its page installers once and purges LiteSpeed Cache by
itself. The Hostinger CDN is separate: purge it in hPanel > Website > Cache Manager.

== Changelog ==

= 0.22.0 (2026-10-26) =
* Audit 2026-10-26 suggestion S-4: new tool /fish-finder/ (Fish Finder): pick season, weather, hour and place and see every fish that bites, most valuable first, with location, hours, seasons, weather, base price, difficulty and the Community Center bundles that take it. Covers 66 fish (48 rod, 3 Night Market, 5 legendary, 10 crab pot). Server-rendered reference table of every fish. Listed under Finders on /tools/ and linked from the Fishing hub.
* data/fish.json from tools/data/import-fish.mjs: the wiki's Fish page tables, each fish cross-checked against its own page (price, difficulty, hours, weather, seasons). Bundles from bundles.json, prices against fishponds.json. Validated in tools/data/validate.mjs; engine assets/js/engine/fish.js with tests/engine/fish.test.js.

= 0.21.0 (2026-10-26) =
* Audit 2026-10-26 suggestion S-1 (closes F-66): new guide /crops-and-farming/ginger-island-farm/ (about 2,800 words): boat repair and ticket, every Golden Walnut unlock in the order that matters for farming, how the island farm differs, all 44 crops ranked for a 112-day year (established, first year, and Keg/Jar with Artisan), 100 tiles with the Kegs and Jars to keep up, irrigated Taro Root and Rice, fruit trees on the island, the 20 walnuts farming gives (Gourmand Frog, harvest drops), Farm Obelisk, Warp Totem: Island and Island Obelisk.
* data/ginger-island.json from tools/data/import-ginger-island.mjs (every fact with its wiki sentence; values two pages state must agree; saplings checked against fruittrees.json). Validated in tools/data/validate.mjs; tests/engine/ginger-island.test.js.
* Crop Profit Calculator: new "Ginger Island farm (one year)" season (all crops, Cactus Fruit included, 112 days). Linked from the Crops and Farming hub and the /guides/ late-game stage.

= 0.20.0 (2026-10-26) =
* Audit 2026-10-26 Phase 3 (content), 2 fixes:
* F-106 Entity pages say what is true for that entry and leave shared rules to one place. Median share of 5-word text shared with more than half the pages of the same type: crops 55% -> 36%, farm animals 59% -> 39%, villagers 63% -> 39% (new integration test keeps it under 45%). Villager pages: own gift lists only, "Also loved by" per loved gift, a birthday gift plan from the crop data (crops ready by the birthday with plant-by day, seed and sell price, or one to keep from the season before), weekday of the birthday, exceptions to the universal lists; the universal lists, points table and 10-heart maths moved to All Villagers (#universal-gifts). Crop pages: a facts sentence (regrow, trellis, giant crop, items per harvest, best machine), average sale price per item at levels 0/5/10 instead of the shared quality table, Keg vs Jar in numbers; the counting rules and quality chances moved to All Crops (#how-we-count). Trellis text corrected (trellis crops block your path). Animal pages compare the animals of the same building with payback, give full-building income and machines needed; counting rules moved to All Farm Animals (#how-we-count). The sources note names each entry's own wiki pages. "The The Missing Bundle" fixed.
* F-107 One definition of checked data on Methodology, About, /data/, tools and guides: a value is used only when two separate wiki sources agree ("verified" in the gift and bundle files means the same as cross-checked). Methodology explains that "Verified for 1.6.15" means checked against the wiki for that version, not tested in a save file.

= 0.19.0 (2026-10-26) =
* Audit 2026-10-26 Phase 5 (speed, security and ops), 5 fixes:
* F-97 The deploy check no longer stats every plugin file on each request: the file-time fingerprint is kept 5 minutes in a transient (a new version number is still seen at once), and a visitor's request only schedules the install as a wp-cron event; admin pages, cron and WP-CLI run it, and a visitor runs it only if the cron event is 10 minutes overdue.
* F-98 Links to plugin pages come from one path => address map (Pages::url): one query builds it, a transient keeps it, and it is cleared when a page is saved, deleted or trashed, when permalinks change and on each deploy. Replaces 100+ get_page_by_path queries per uncached render in Entities/Tools/Guides/Search/llms.txt and the theme's fallback menu.
* F-99 Installer: the lock is an atomic INSERT IGNORE (stale lock taken over by one UPDATE); kses is off while the installers save the plugin's own text, and generated-text hashes are of the saved text, so About/Methodology/Changelog cannot get stuck; pages the owner drafts stay drafts (only pages retire_orphans drafted, marked _stardew_tools_retired, are republished); the search index cache is cleared on each deploy.
* F-104 Security headers on every page: X-Content-Type-Options, X-Frame-Options SAMEORIGIN, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy, and HSTS (1 year) on https. The deploy copies the brand favicon.ico to the site root if none is there, and /favicon.ico requests that reach WordPress redirect to it.
* F-105 Engine and tool modules (assets/js/engine, assets/js/tools) are cached for a day with revalidation instead of a year immutable, so a browser that ignores the import map cannot keep a stale module.

= 0.18.1 (2026-10-26) =
* Google Analytics 4 (G-ZYXVVT76GG) on every public page via includes/class-analytics.php: async gtag.js first in <head>, marked data-no-optimize/data-no-defer for LiteSpeed. Not printed for logged-in editors/admins, previews or feeds. Filter stardew_tools_ga_id ('' turns it off).

= 0.18.0 (2026-10-26) =
* Audit 2026-10-26 Phase 2 (crawl, index and technical SEO), 5 fixes:
* F-96 Sitemap lastmod is per page: each deploy renders every published page and moves its lastmod only when its title, description or text changed (Release::stamp_pages, post meta _stardew_tools_content_hash / _stardew_tools_lastmod). A release that changes one tool no longer marks all 142 pages as modified.
* F-100 Tool pages show the date their own data was checked (Tools::checked: Data::checked of the tool's data files), not the crops file's date, in the byline and dateModified.
* F-101 Titles that would pass 60 characters with " | Stardew Tools" drop the brand suffix (Seo::TITLE_MAX); the brand stays in og:site_name and the Organization schema.
* F-102 Bundle room pages get links from the Bundle Tracker (answer box and each room), from every crop page's "Bundles" line and from the Year 1 money guide's Pantry section.
* F-103 Entity index pages' CollectionPage has dateModified; Best Spring/Summer/Fall/Greenhouse Crops have their own share images (assets/og/tool-best-*-crops.jpg) used in og:image and the Article schema; oEmbed responses no longer include author_name/author_url; the theme no longer prints feed links (feeds return 410), its fallback menu skips unpublished pages, and its version fallback reads style.css.

= 0.17.0 (2026-10-26) =
* Audit 2026-10-26 Phase 4 (tools UX, mobile and accessibility), 5 fixes:
* F-91 Every calculator prints an "Assumes: ..." line above its result, built from the form (year, farming level, fertilizer, professions, machines). Greenhouse Planner and Ancient Fruit vs Starfruit short answers name their settings and the planner's different opening settings; the /greenhouse/ table says level 0, no professions. Crafting Calculator opens on Year 1 shop prices.
* F-92 Crafting Calculator: a ?recipe= link (search results) shows that recipe; a saved list is kept and comes back with "Show my list" or "Add to list" (engine startingList()).
* F-93 What to Plant Today counts the 15 free Parsnip Seeds on a Year 1 spring (box "I still have my 15 free Parsnip Seeds", engine option freeSeeds), suggests planting them next to the pick, and says why the Year 1 guide picks Parsnip (more soil than gold; crossover tile count in answers.json).
* F-94 Site search: word-start matching, one-letter typos ("strawbery"), plurals and a synonyms list ("af", "jelly", "cc"); "tea" no longer finds Bug Steak.
* F-95 Search box aria-expanded follows the result list; Greenhouse Planner grid cells and swatches are hidden from screen readers behind one summary label.

= 0.16.0 (2026-10-26) =
* Audit 2026-10-26 Phase 1 (wrong numbers and contradictions), 19 fixes:
* F-72 What to Plant Today: in Year 1 the Oasis is closed (desert bus not repaired), so Beet, Rhubarb, Starfruit and Cactus Fruit seeds are not suggested. Engine option `desert` reopens it.
* F-73 Gift Finder: universal and villager category tastes now count ("All Vegetables", "All Cooking", "All Artisan Goods", "All Flowers", "All Fruit Tree Fruits", "All Gems", "All Fruit", "All Milk", ...). Parsnip is liked by 28 villagers instead of 0; each row names the category. Category members come from wiki categories and the repo's crop and fruit tree data (tools/data/import-gifts.mjs --categories); categories without a member list stay markers.
* F-89 Gift Finder: Apple, Peach and the other tree fruit, Starfruit, Ancient Fruit and every category member are in the item list; an unknown ?item= says "Item not found" instead of quietly showing Pearl.
* F-74 What to Plant reference table uses Year 1 (no Garlic or Rice) and names its caption example from the rows.
* F-75 Kegs to keep up: one steady-state formula (machinesToKeepUp) for Ancient Fruit vs Starfruit, the Greenhouse Planner and the keg guide: 90 Kegs per 100 Ancient Fruit.
* F-76 Pantry by the end of Fall; F-77 Pumpkin is 13 days; F-78 unranked crop pages compare with the ranked leader correctly; F-79 seed-cost rule spelled out on /crops/ and /data/; F-80 iridium smelts in 8 hours.
* F-81 Year 1 guide wording (replant the same tiles; Melon XP among Year 1 seeds; Cactus Fruit not listed as an outdoor crop); F-82 fruit tree guide derives tied leaders and the per-gold deal from data; F-83 villager pages note the 8-heart cap before the Bouquet; F-84 /bundles/ says 30 bundles in 6 rooms plus the Missing Bundle, and the tracker no longer adds every option of "pick N of M" bundles; F-85 Egg Festival Strawberries planted the same day everywhere; F-86 Best Summer/Fall Crops tag Pierre's Year 2 seeds "Year 2+"; F-87 pig payback uses the year average; F-88 not-sold animals show "n/a (not sold)"; F-90 /villagers/ shows category loves (Penny: All Books).

= 0.15.1 (2026-10-21) =
* What to Plant Today: new Year field (default Year 1). In Year 1 it no longer suggests Garlic, Unmilled Rice, Red Cabbage or Artichoke, whose seeds Pierre sells from Year 2 (data/year-one.json). The short answer on the page uses Year 1.

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

<?php
/** Changelog content. @package Stardew_Tools */
defined( 'ABSPATH' ) || exit;
?>
<p>Notable changes to <?php echo esc_html( $brand ); ?>, newest first.</p>

<h2>October 21, 2026: fruit trees and Year 1 money</h2>
<ul>
<li>New guide: <a href="<?php echo esc_url( home_url( '/crops-and-farming/best-fruit-trees/' ) ); ?>">Best Fruit Trees</a>, with every sapling's price, when to plant it, what it earns each year as the fruit improves, and whether to make Wine or Jelly.</li>
<li>New guide: <a href="<?php echo esc_url( home_url( '/crops-and-farming/how-to-make-money-year-1/' ) ); ?>">Making Money in Year 1</a>, a season-by-season plan from your first 500g, with only the seeds you can really buy in Year 1.</li>
</ul>

<h2>October 21, 2026: about the creator</h2>
<ul>
<li>The <a href="<?php echo esc_url( home_url( '/about/' ) ); ?>">About</a> page now has a short note from the site's creator about why the site exists.</li>
</ul>

<h2>October 21, 2026: villager and bundle pages, fuller guides</h2>
<ul>
<li>New: a page for every villager with their birthday, loved and liked gifts, the gifts you can grow and the ones to avoid, starting at <a href="<?php echo esc_url( home_url( '/villagers/' ) ); ?>">all villagers</a>.</li>
<li>New: a page for each Community Center room with every bundle item, its season and where to find it, starting at <a href="<?php echo esc_url( home_url( '/bundles/' ) ); ?>">Community Center bundles</a>.</li>
<li>Every calculator now shows a ready-made table of the default answer at the end of the page, so you can read it even before the tool loads.</li>
<li>All guides are longer, with new sections and "Quick questions" at the end. The topic pages got Quick questions too, the Fishing page now covers catching fish, tackle, crab pots, legendary fish and the Fish Smoker, and the Machines page lists every artisan machine.</li>
<li>Crop and animal pages have a practical tip, and links you share show a picture of that page.</li>
<li>About, How We Calculate and Contact say more plainly how the site is made and how we fix mistakes. The data downloads have a file for each game version and a description of every column.</li>
</ul>

<h2>October 21, 2026: steadier, faster pages</h2>
<ul>
<li>Guides and topic pages no longer jump while they load on a phone. The short answer now comes first, with the "On this page" list right under it.</li>
<li>Calculators load less code before they start working, and the farm picture on the home page is half the size it was, with the same look.</li>
<li>The All Crops table puts the profit right after the crop name. On a phone the crop names stay in view while you swipe the table sideways.</li>
<li>Screen readers now hear the name of each table (for example "Kegs needed to keep up with one plant") instead of the same generic label every time.</li>
</ul>

<h2>October 21, 2026: tools that show your answer sooner</h2>
<ul>
<li>On a laptop the result now sits next to the form, so you see it change as you type. On a phone the short answer at the top folds to a few lines (tap "Read the full answer" to open it).</li>
<li>"Show my best crop" on the home page, and any shared link, now opens right at your answer instead of the top of the page.</li>
<li>Number boxes behave the same in every tool. A number that is too high, too low, empty or not whole is changed to one the tool can use, and a note under the box says what was used. Fish ponds can no longer hold 0 fish, and the XP Calculator moves the target level up when it is below your current level.</li>
<li>What to Plant Today says when an empty gold box means no limit. Small wording fixes: "1 day" and "1 tile" instead of "1 days" and "1 tiles".</li>
<li>Crafting Calculator: "Copy link to this result" now includes your whole shopping list, and Reset clears the list.</li>
<li>Bundle Tracker: ticking a box keeps your place for keyboard and screen reader users, Remixed rooms only let you pick as many bundles as a save really has, and "Still to find" can be filtered by season and shows the first 15 items until you ask for all.</li>
<li>Search finds villagers, fish and crafting recipes (try "Abigail" or "Sturgeon") and opens the right tool already set to them. One press of Escape closes it, and pages load a little lighter.</li>
<li>If a calculator can't load in your browser, the page now says so, and the phone menu opens even when other scripts are blocked.</li>
</ul>

<h2>October 21, 2026: easier to find your way, safer behind the scenes</h2>
<ul>
<li>Crop names in the Best Spring, Summer, Fall and Greenhouse Crops tables now link to each crop's page.</li>
<li>Every crop page links to all the other crops of its season, and every animal page links to all the other Coop and Barn animals.</li>
<li>Each tool ends with a "Learn more" list of the guides that go with it. The Gift Finder and Bundle Tracker are on the home page and the Crops and Farming page, and the Tools page suggests a guide to start with.</li>
<li>Breadcrumbs use short names ("Home › Crops › Parsnip"), and search engines get fuller page details (publisher, dates and author) on every page.</li>
<li>Behind the scenes: account names are no longer visible to the public, unused feeds and old WordPress features are switched off, and every change is now tested automatically before it goes live.</li>
</ul>

<h2>October 21, 2026: clearer answers on animal and crop pages</h2>
<ul>
<li>Animal pages now answer "how much does it cost?" at the top: the price at Marnie's Ranch, the Coop or Barn it needs and what that building costs from Robin, and how many days it takes to pay back with and without the building.</li>
<li>New: a <a href="<?php echo esc_url( home_url( '/animal-prices/' ) ); ?>">Stardew Valley Animal Prices</a> page with every animal, every Coop and Barn level and the payback for each, linked from the animal pages and the Animals hub.</li>
<li>Coop and Barn prices, wood, stone and capacity now come from the wiki like the rest of our data. Coop or Barn First? and Are Pigs Worth It? count the building in their payback figures.</li>
<li>Crop pages show the sell price for every quality and where to buy the seeds at the top, plus a new "What to do with it" section: the bundles that ask for it, crafting recipes, who loves it as a gift and the best machine.</li>
<li>Sweet Gem Berry explains where Rare Seeds come from and how to trade one berry for a Stardrop.</li>
</ul>

<h2>October 21, 2026: corrections after the second audit</h2>
<ul>
<li>Crop pages now rank a crop only against crops whose seeds you can buy every day and that grow outdoors, the same list as the Best Crops pages. Cactus Fruit is shown as an indoor crop, crops without shop seeds say so, and multi-season crops say when their total includes the next season.</li>
<li>What to Plant Today gives every crop the same number of days for your Kegs and Jars, and only processes fruit after it is harvested. With 10 kegs on Summer 1 it now picks Starfruit, not Wheat.</li>
<li>Best Greenhouse Crops says plainly that Ancient Fruit is the best greenhouse crop overall, and that its list covers seeds you can buy.</li>
<li>Your farm settings are saved only when you change something. Opening one tool no longer changes another tool's level or professions, and links with extra tracking codes or from the home page form no longer untick your professions.</li>
<li>Fixed: Sunflower counts the seeds each harvest drops (it now makes a profit), Coffee Bean no longer charges the rare 2,500g Traveling Cart price, Sheep say "every 2 days" at full friendship, gift points round down like the game, and the Bundle Tracker adds up items needed by more than one bundle and shows the amount.</li>
<li>Fixed: fish ponds take longer to fill than we said (each quest restarts the spawn timer), fertilizer advice lists every option that pays, Artisan figures use the Tiller raw price, and the shop notes now say when Deluxe Speed-Gro, Quality Fertilizer and Oasis seeds become available.</li>
<li>Smaller wording fixes across the Kegs, Greenhouse, Speed-Gro, Dehydrator and Pigs guides, and each page now shows the date its own data was checked.</li>
</ul>

<h2>October 10, 2026: fuller topic pages</h2>
<ul>
<li>The Crops, Artisan Goods, Animals, Fishing and Greenhouse pages now explain what decides the answer, with tables built from the same game data as the tools: best crops by season, kegs per plant, every animal at full hearts, what a full fish pond earns, and the best greenhouse crop for the number of kegs you own.</li>
<li>Flower crop pages link to each other, and the Fish Pond Calculator notes the three fish where the wiki gives two different times between new fish.</li>
</ul>

<h2>October 10, 2026: easier to find things</h2>
<ul>
<li>New: a Tools page and a Guides page that list everything in one place, both linked from the main menu.</li>
<li>The home page now starts with the three most-used tools, and the "page not found" page has a search button and links to the tools and guides.</li>
</ul>

<h2>October 10, 2026: corrections after a full audit</h2>
<ul>
<li>Fixed: the "Last day to plant" on crop pages is now a real date (for example Corn: Fall 14).</li>
<li>Fixed: the Fish Pond Calculator added extra roe as a percentage instead of a fixed amount, which overstated roe for some fish by up to 13%. Rankings and the fish pond guide are updated.</li>
<li>Fixed: machine counts in the Greenhouse Planner and Ancient Fruit vs Starfruit now allow for recipes that take several items (Coffee Beans), the animal payback is shown as "never" when an animal earns nothing, and animal tables show both a raw and a best-case payback.</li>
<li>Fixed: a Potato price in the Speed-Gro guide, the Deluxe Fertilizer rule for iridium quality, Cheese prices with Artisan (483g), and bundles that list the same item twice.</li>
<li>New: your farm level and professions are remembered across tools in your browser, with a "Forget my farm" button. Every tool page now shows when its data was last checked.</li>
</ul>

<h2>October 10, 2026: easier to use on phones</h2>
<ul>
<li>The home page is shorter, has a quick "What should I plant today?" form at the top, and no longer lists tools that are not built yet.</li>
<li>One-row header on phones, plainer headings in guides, and a "Next step" box at the end of every guide.</li>
</ul>

<h2>October 10, 2026: reference pages, search and more guides</h2>
<ul>
<li>New: a page for every crop, farm animal and machine, with prices, quality chances, profit per tile, fertilizer, processing and the greenhouse, plus ranked tables of all crops, animals and machines.</li>
<li>New: free CSV downloads of those tables on the Data page, and a site search (press Ctrl+K, Cmd+K or /).</li>
<li>New guides: are casks worth it, Dehydrator vs Keg, and which animals to buy first. The first five guides now have 1,500 words or more, with more tables built from the game data.</li>
<li>Game data for casks, the Dehydrator and the Fish Smoker, cross-checked on the Stardew Valley Wiki.</li>
</ul>

<h2>October 9, 2026: trackers and guides</h2>
<ul>
<li>New: XP Calculator (Farming and Fishing), Crafting Calculator with a shopping list, Gift Finder for all villagers, and a Bundle Tracker for standard and Remixed bundles that saves in your browser.</li>
<li>New: five topic hubs and the first five guides (Speed-Gro vs Fertilizer, how many Kegs you need, whether pigs are worth it, the best fish for Fish Ponds, the best Greenhouse setup). Every number in a guide comes from the same data as the calculators.</li>
</ul>

<h2>October 9, 2026: decision tools</h2>
<ul>
<li>New: What to Plant Today (one crop for your day, gold, tiles and machines, with the reasons and a shopping list), Fish Pond Calculator, Animal Profit Calculator, and Best Spring, Summer, Fall and Greenhouse Crops.</li>
<li>Game data for fish ponds (73 fish) and farm animals, generated from the Stardew Valley Wiki and cross-checked.</li>
</ul>

<h2>October 9, 2026: first tools</h2>
<ul>
<li>New tools: Crop Profit Calculator, Keg vs Preserves Jar, Ancient Fruit vs Starfruit and Greenhouse Planner, with share links, remembered settings and "Explain the math".</li>
<li>Game data for crops, fertilizers, machines, professions and the greenhouse, generated from the Stardew Valley Wiki and cross-checked.</li>
</ul>

<h2>October 9, 2026: launch</h2>
<ul>
<li>Launched the site foundation: new design, branding, and the About, Methodology, Privacy, Terms, Disclaimer and Contact pages.</li>
<li>Game data target: Stardew Valley <?php echo esc_html( $version ); ?>.</li>
</ul>

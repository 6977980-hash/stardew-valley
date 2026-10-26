<?php
/**
 * Guide: Ginger Island farm (unlocks, walnuts and the best year-round crops).
 *
 * @var array    $g        data/answers.json "guides".
 * @var callable $gold     Formats gold.
 * @var callable $tool_url Tool permalink.
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

$gi = isset( $g['ginger_island'] ) ? $g['ginger_island'] : null;
if ( ! $gi ) {
	return;
}
$crop = array();
foreach ( $gi['crops'] as $c ) {
	$crop[ $c['id'] ] = $c;
}
$unlock = array();
foreach ( $gi['unlocks'] as $u ) {
	$unlock[ $u['id'] ] = $u['walnuts'];
}
$trade = array();
foreach ( $gi['trades'] as $t ) {
	$trade[ $t['id'] ] = $t;
}
$tree = array();
foreach ( $gi['trees'] as $t ) {
	$tree[ $t['id'] ] = $t;
}
$irr = array();
foreach ( $gi['irrigated'] as $r ) {
	$irr[ $r['id'] ] = $r;
}
// "5 Dragon Tooth" reads as "5 Dragon Teeth": item names from the wiki are singular.
$items   = function ( $qty, $item ) {
	$plural = array(
		'Dragon Tooth' => 'Dragon Teeth',
		'Hardwood'     => 'Hardwood',
	);
	if ( 1 !== (int) $qty ) {
		$item = isset( $plural[ $item ] ) ? $plural[ $item ] : $item . 's';
	}
	return (int) $qty . ' ' . $item;
};
$seed_label = function ( $c ) use ( $gold, $items ) {
	if ( empty( $c['seed'] ) ) {
		return 'not sold';
	}
	if ( isset( $c['seed']['trade'] ) ) {
		return $items( $c['seed']['trade']['qty'], $c['seed']['trade']['item'] );
	}
	$where = array(
		'pierre'         => "Pierre's",
		'jojamart'       => 'JojaMart',
		'oasis'          => 'Oasis',
		'traveling_cart' => 'Traveling Cart',
		'egg_festival'   => 'Egg Festival',
	);
	return $gold( $c['seed']['gold'] ) . ' (' . ( isset( $where[ $c['seed']['source'] ] ) ? $where[ $c['seed']['source'] ] : $c['seed']['source'] ) . ')';
};
$pct     = function ( $x ) {
	return round( $x * 100 ) . '%';
};
$top     = $gi['crops'][0];
$second  = $gi['crops'][1];
$best    = $crop[ $gi['by_best'][0] ];
$best2   = $crop[ $gi['by_best'][1] ];
$pine    = $crop['pineapple'];
$taro    = $irr['taro-root'];
$rice    = isset( $irr['unmilled-rice'] ) ? $irr['unmilled-rice'] : null;
$af      = $crop['ancient-fruit'];
$sf      = $crop['starfruit'];
$hops    = $crop['hops'];
$blue    = $crop['blueberry'];
$cactus  = isset( $crop['cactus-fruit'] ) ? $crop['cactus-fruit'] : null;
$banana  = $tree['banana'];
$mango   = $tree['mango'];
$hundred = $gi['hundred'];
$frog    = $gi['frog'];
$hw      = $gi['harvest_walnuts'];
$boat    = array_map(
	function ( $b ) use ( $items ) {
		return $items( $b['qty'], $b['item'] ) . ' (' . $b['part'] . ')';
	},
	$gi['boat']
);
$profit  = $tool_url( 'crop-profit-calculator' );
$kegjar  = $tool_url( 'keg-vs-preserves-jar' );
$planner = $tool_url( 'greenhouse-planner' );
$trees_g = Stardew_Tools\Guides::guide_url( 'best-fruit-trees' );
$gh_g    = Stardew_Tools\Guides::guide_url( 'best-greenhouse-setup-for-money' );
$kegs_g  = Stardew_Tools\Guides::guide_url( 'how-many-kegs-do-i-need' );
$bundles = Stardew_Tools\Entities::url( 'bundles', '' );
$af_link = Stardew_Tools\Entities::url( 'crops', 'ancient-fruit' );
$first   = $crop[ $gi['by_first'][0] ];
$h_af    = $hundred[0];
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> the Ginger Island farm grows every crop in every season, so it works like a second Greenhouse with room for hundreds of plants. Sold raw, the best crop for a full year there is <strong><?php echo esc_html( $top['name'] ); ?></strong> at <?php echo esc_html( $gold( $top['raw'] ) ); ?> per tile a year once the plants are grown, ahead of <?php echo esc_html( $second['name'] ); ?> (<?php echo esc_html( $gold( $second['raw'] ) ); ?>). If you have enough Kegs, <?php echo esc_html( $best['name'] ); ?> made into <?php echo esc_html( $best['best_as'] ); ?> earns the most: <?php echo esc_html( $gold( $best['best'] ) ); ?> per tile a year with the Artisan profession.</p>
	<p>To farm there you need to repair Willy's boat, buy a <?php echo esc_html( $gold( $gi['ticket'] ) ); ?> ticket, and spend <?php echo (int) $gi['to_farmhouse']; ?> Golden Walnuts to open the west side and fix the Island Farmhouse, which gives you a Shipping Bin and a bed on the island.</p>
</div>

<h2>How to unlock Ginger Island</h2>
<p>Ginger Island opens once the valley's big project is done: Willy mails you an invitation to the back room of his Fish Shop once you finish the Community Center bundles, or once you see the Joja Warehouse completion cutscene if you went the Joja route. In the back room is an old boat that needs:</p>
<ul>
	<?php foreach ( $boat as $b ) : ?>
	<li><?php echo esc_html( $b ); ?></li>
	<?php endforeach; ?>
</ul>
<p>After you hand everything over, Willy and Robin repair the boat overnight, and from the next day you can buy a ticket in the back room. A ticket costs <?php echo esc_html( $gold( $gi['ticket'] ) ); ?> and covers the return trip; going home is free from the boat on the island's south beach. The Hardwood is the slow part for most players: it comes from Large Stumps, Large Logs and Mahogany Trees. Six Large Stumps grow back in the Secret Woods every day, which is 12 Hardwood a day, so 200 takes about 17 days from the woods alone. Iridium Bars are smelted from Iridium Ore, mostly mined in the Skull Cavern, and Battery Packs come from Lightning Rods during thunderstorms, so start collecting those as soon as you see the invitation coming.</p>

<h2>Golden Walnuts: what to unlock first</h2>
<p>On the island the parrots take Golden Walnuts instead of gold. There are <?php echo (int) $gi['walnuts_total']; ?> walnuts to find, and every parrot unlock together costs <?php echo (int) $gi['walnuts_all_unlocks']; ?>. Finding <?php echo (int) $gi['qi_room']; ?> also opens Qi's Walnut Room. For farming, the order that matters is:</p>
<ol>
	<li><strong>Island North (<?php echo (int) $unlock['north']; ?>).</strong> Give one walnut to the parrot in Leo's hut on the east side. The parrot at the west path only shows up after that.</li>
	<li><strong>Island West (<?php echo (int) $unlock['west']; ?>).</strong> The turtle blocking the west path moves when you pay the parrot next to it. The farm is in Island West.</li>
	<li><strong>Island Farmhouse (<?php echo (int) $unlock['farmhouse']; ?>).</strong> The repair adds a Shipping Bin outside, so you can sell crops on the island, and a bed, so you can sleep there without passing out.</li>
	<li><strong>Island Trader (<?php echo (int) $unlock['trader']; ?>).</strong> The trader in Island North sells Taro Tubers and Pineapple Seeds, the two crops that are cheapest to start on the island, plus Banana and Mango saplings. It only unlocks after the farmhouse.</li>
	<li><strong>Mailbox (<?php echo (int) $unlock['mailbox']; ?>) and Farm Obelisk (<?php echo (int) $unlock['farm-obelisk']; ?>).</strong> The obelisk takes you straight back to your farm in the valley, and building it gives you one Warp Totem: Island.</li>
</ol>
<p>That is <?php echo (int) $gi['to_farmhouse']; ?> walnuts to start farming and <?php echo (int) $gi['to_trader']; ?> to reach the trader. The other unlocks (<?php echo esc_html( implode( ', ', array_map( function ( $u ) { return $u['name'] . ' ' . $u['walnuts']; }, array_filter( $gi['unlocks'], function ( $u ) { return ! in_array( $u['id'], array( 'north', 'west', 'farmhouse', 'trader', 'mailbox', 'farm-obelisk' ), true ); } ) ) ) ); ?>) can wait.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Every Golden Walnut unlock and its cost</caption>
	<thead><tr><th scope="col">Unlock</th><th scope="col" class="num">Walnuts</th></tr></thead>
	<tbody>
	<?php foreach ( $gi['unlocks'] as $u ) : ?>
		<tr><th scope="row"><?php echo esc_html( $u['name'] ); ?></th><td class="num"><?php echo (int) $u['walnuts']; ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>

<h2>How the island farm is different</h2>
<ul>
	<li><strong>No seasons.</strong> Any crop grows on the island farm whatever the valley season is, just like in the Greenhouse. A crop that would die at the end of Summer keeps growing and regrowing through Winter.</li>
	<li><strong>Lots of room.</strong> Island West has <?php echo (int) $gi['tiles']; ?> plantable tiles, <?php echo (int) $gi['main_tiles']; ?> of them on the main farmland. The Greenhouse has 120. The farm starts covered in logs, stones and weeds, like your first farm, so bring an axe and pickaxe on the first trip.</li>
	<li><strong>No crows.</strong> Crows never spawn on the island farm, so you do not need Scarecrows.</li>
	<li><strong>Its own weather.</strong> The island only has sun and rain, and it rains on about <?php echo esc_html( $pct( $gi['rain_chance'] ) ); ?> of days (never on your first visit). The weather report shows it after the valley forecast. It does not follow the valley's weather, so plan sprinklers rather than counting on rain.</li>
	<li><strong>Sprinklers and fruit trees work.</strong> You can place sprinklers anywhere on the farm and plant fruit trees, which bear fruit every day here.</li>
	<li><strong>Some indoor crops can go outside.</strong> <?php echo esc_html( implode( ', ', $gi['outdoor_ok'] ) ); ?> seeds can only be planted indoors in the valley, but the island farm accepts them.</li>
	<li><strong>No animals.</strong> Farm animals, your spouse and your children cannot move to the island; it is for crops and trees.</li>
</ul>
<p>Two habits make island farming smoother. Buy seasonal seeds while they are in stock, because Pierre only sells each seed in its own season even though you can plant it on the island any time. And put your crops near the Farmhouse, the Shipping Bin and the Parrot Express stop (<?php echo (int) $unlock['parrot-express']; ?> walnuts) so a day on the island is a quick loop.</p>

<h2>Best crops for the Ginger Island farm</h2>
<p>Because the island has no seasons, the fair comparison is a full year of <?php echo (int) $gi['days']; ?> days on one tile. The table ranks all <?php echo (int) $gi['count']; ?> crops by profit per tile in a year when they are already established (regrowing crops already grown, single-harvest crops replanted on harvest day), sold raw with no professions and farming level 0. The first-year column starts from a seed on day 1.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Best Ginger Island crops: profit per tile over a year</caption>
	<thead><tr><th scope="col">Crop</th><th scope="col">Seed</th><th scope="col" class="num">Harvests a year</th><th scope="col" class="num">Raw, established</th><th scope="col" class="num">Per day</th><th scope="col" class="num">First year from seed</th><th scope="col" class="num">Kegs/Jars, Artisan</th></tr></thead>
	<tbody>
	<?php foreach ( array_slice( $gi['crops'], 0, 15 ) as $i => $c ) : ?>
		<tr<?php echo 0 === $i ? ' class="is-best"' : ''; ?>><th scope="row"><?php echo esc_html( $c['name'] ); ?><?php echo $c['regrows'] ? '<span class="tag">regrows</span>' : ''; ?></th><td><?php echo esc_html( $seed_label( $c ) ); ?></td><td class="num"><?php echo (int) $c['harvests']; ?></td><td class="num"><strong><?php echo esc_html( $gold( $c['raw'] ) ); ?></strong></td><td class="num"><?php echo esc_html( $gold( $c['per_day'] ) ); ?></td><td class="num"><?php echo esc_html( $gold( $c['first_year'] ) ); ?></td><td class="num"><?php echo esc_html( $gold( $c['best'] ) . ( $c['best_as'] !== $c['name'] ? ' (' . $c['best_as'] . ')' : '' ) ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p class="table-note">Profit is the sale value minus seeds bought for gold. Crops whose seeds have no gold price (traded, crafted or saved from your own harvest) count no seed cost. The last column assumes a free Keg or Preserves Jar for every harvest and the Artisan profession.</p>
<p>What the ranking means in practice:</p>
<ul>
	<li><strong><?php echo esc_html( $af['name'] ); ?> is the island's best raw crop.</strong> It regrows every <?php echo (int) $af['regrow']; ?> days for <?php echo (int) $af['harvests']; ?> harvests a year and never needs replanting. It is not sold in any shop, so the island is where you multiply it: plant the seeds you have, run a few fruit through a Seed Maker, and expand a little every week. <?php echo $af_link ? 'The <a href="' . esc_url( $af_link ) . '">Ancient Fruit page</a> covers where the first seed comes from.' : ''; ?></li>
	<li><strong><?php echo esc_html( $crop['sweet-gem-berry']['name'] ); ?> ranks high but cannot fill a farm.</strong> Its seeds come from the Traveling Cart a few at a time, so treat it as a bonus for the seeds you get, not a plan.</li>
	<li><strong><?php echo esc_html( $pine['name'] ); ?> is the best crop you can start at scale.</strong> One seed costs <?php echo esc_html( $items( $trade['pineapple-seeds']['qty'], $trade['pineapple-seeds']['item'] ) ); ?> at the Island Trader, it regrows every <?php echo (int) $pine['regrow']; ?> days, and the seed is bought once per tile, so a Magma Cap run in the Volcano Dungeon pays for itself for as long as you keep the plant: <?php echo esc_html( $gold( $pine['raw'] ) ); ?> a tile a year raw.</li>
	<li><strong><?php echo esc_html( $blue['name'] ); ?> is the best cheap shop crop.</strong> Seeds at <?php echo esc_html( $seed_label( $blue ) ); ?>, one planting a year, <?php echo esc_html( $gold( $blue['raw'] ) ); ?> a tile. Buy a stack in Summer and plant them on the island in any season.</li>
	<li><strong><?php echo esc_html( $sf['name'] ); ?> slips down the list.</strong> It is worth more per harvest than Ancient Fruit, but it has to be replanted every <?php echo (int) $sf['growth']; ?> days with a <?php echo esc_html( $seed_label( $sf ) ); ?> seed, so it makes <?php echo esc_html( $gold( $sf['raw'] ) ); ?> a tile sold raw. As Wine it does much better (<?php echo esc_html( $gold( $sf['best'] ) ); ?>), which is why Kegs change the answer.</li>
</ul>

<h2>With Kegs: what earns the most</h2>
<p>If you can process everything, the order changes: <?php echo esc_html( $best['name'] ); ?> as <?php echo esc_html( $best['best_as'] ); ?> earns <?php echo esc_html( $gold( $best['best'] ) ); ?> a tile a year, then <?php echo esc_html( $best2['name'] ); ?> as <?php echo esc_html( $best2['best_as'] ); ?> at <?php echo esc_html( $gold( $best2['best'] ) ); ?>. The catch is the number of machines. This is what 100 tiles of the leaders make in a year, and how many machines keep up with them:</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>100 tiles for a year: raw, processed, and machines needed</caption>
	<thead><tr><th scope="col">Crop</th><th scope="col" class="num">Raw</th><th scope="col" class="num">Processed, Artisan</th><th scope="col" class="num">Kegs to keep up</th><th scope="col" class="num">Or Preserves Jars</th></tr></thead>
	<tbody>
	<?php foreach ( $hundred as $h ) : ?>
		<tr><th scope="row"><?php echo esc_html( $h['name'] ); ?></th><td class="num"><?php echo esc_html( $gold( $h['raw'] ) ); ?></td><td class="num"><?php echo esc_html( $gold( $h['best'] ) . ( $h['best_as'] !== $h['name'] ? ' (' . $h['best_as'] . ')' : '' ) ); ?></td><td class="num"><?php echo $h['kegs'] ? (int) $h['kegs'] : '—'; ?></td><td class="num"><?php echo $h['jars'] ? (int) $h['jars'] : '—'; ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p class="table-note">Kegs to keep up: machines that process every harvest as it comes in, once the plants are producing steadily.</p>
<p><?php echo esc_html( $hops['name'] ); ?> is the extreme case: a harvest every day means you need well over one Keg per plant for Pale Ale, so it only wins on a farm that is already full of Kegs. <?php echo esc_html( $af['name'] ); ?> Wine needs about <?php echo (int) $h_af['kegs']; ?> Kegs per 100 tiles, which most late-game farms can reach. If you have fewer Kegs than that, plant <?php echo esc_html( $af['name'] ); ?> anyway and sell what the Kegs cannot take, or turn the rest into Jelly. <?php echo $kegs_g ? '<a href="' . esc_url( $kegs_g ) . '">How Many Kegs Do I Need?</a> walks through the same maths for any crop.' : ''; ?></p>

<h2>Taro Root, Rice and the irrigated tiles</h2>
<p>Part of the island farm is irrigated: tiles next to the water count as watered. Taro Root (from Taro Tubers, <?php echo esc_html( $items( $trade['taro-tuber']['qty'], $trade['taro-tuber']['item'] ) ); ?> each at the Island Trader) and Unmilled Rice both grow faster there and need no watering.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Irrigated crops on the island: a year on one tile</caption>
	<thead><tr><th scope="col">Crop</th><th scope="col" class="num">Days to grow, dry</th><th scope="col" class="num">Days to grow, irrigated</th><th scope="col" class="num">Raw a year, dry</th><th scope="col" class="num">Raw a year, irrigated</th><th scope="col" class="num">As <?php echo esc_html( $taro['best_as'] ); ?>, Artisan</th></tr></thead>
	<tbody>
	<?php foreach ( $gi['irrigated'] as $r ) : ?>
		<tr><th scope="row"><?php echo esc_html( $r['name'] ); ?></th><td class="num"><?php echo (int) $r['dry_growth']; ?></td><td class="num"><?php echo (int) $r['growth']; ?></td><td class="num"><?php echo esc_html( $gold( $r['dry_raw'] ) ); ?></td><td class="num"><?php echo esc_html( $gold( $r['raw'] ) ); ?></td><td class="num"><?php echo esc_html( $gold( $r['best'] ) ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>Taro Root on irrigated tiles makes <?php echo esc_html( $gold( $taro['raw'] ) ); ?> a tile a year raw, well below the regrowing fruit, but it costs no watering at all and its tubers are cheap to trade for. Use the wet tiles for Taro and put the regrowing crops under sprinklers on the dry land. The Taro numbers above do not count the tubers, since they are traded for Bone Fragments rather than bought.</p>

<h2>Fruit trees on Ginger Island</h2>
<p>A fruit tree on the island fruits every day of the year, so one tree gives <?php echo (int) $gi['days']; ?> fruit a year instead of 28 in the valley. Every tree works here, not only the tropical ones. One tree, one year, sold raw:</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>One fruit tree on Ginger Island, per year</caption>
	<thead><tr><th scope="col">Tree</th><th scope="col">Sapling</th><th scope="col" class="num">First year, raw</th><th scope="col" class="num">Iridium (year 4+), raw</th><th scope="col" class="num">Wine with Artisan</th></tr></thead>
	<tbody>
	<?php foreach ( $gi['trees'] as $t ) : ?>
		<tr><th scope="row"><?php echo esc_html( $t['name'] ); ?></th><td><?php echo esc_html( $t['pierre'] ? $gold( $t['pierre'] ) : ( $t['trade'] ? $items( $t['trade']['qty'], $t['trade']['item'] ) : '' ) ); ?></td><td class="num"><?php echo esc_html( $gold( $t['island_y1'] ) ); ?></td><td class="num"><?php echo esc_html( $gold( $t['island_y4'] ) ); ?></td><td class="num"><?php echo esc_html( $gold( $t['wine_artisan'] ) ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>The Banana is the best tree on the island: <?php echo esc_html( $gold( $banana['island_y1'] ) ); ?> in its first year raw and <?php echo esc_html( $gold( $banana['island_y4'] ) ); ?> once its fruit is iridium. Its sapling costs <?php echo esc_html( $items( $banana['trade']['qty'], $banana['trade']['item'] ) ); ?> at the Island Trader, and the Mango sapling <?php echo esc_html( $items( $mango['trade']['qty'], $mango['trade']['item'] ) ); ?>. Trees need no water, so they are the easiest way to use the corners of the farm that sprinklers do not reach. A sapling still needs an empty 3x3 space to grow. <?php echo $trees_g ? 'For quality, chopping for saplings and Wine versus Jelly, see <a href="' . esc_url( $trees_g ) . '">Best Fruit Trees</a>.' : ''; ?></p>

<h2>Golden Walnuts from farming</h2>
<p>The farm itself gives <?php echo (int) $gi['farming_walnuts']; ?> of the island's walnuts:</p>
<ul>
	<li><strong>The Gourmand Frog (<?php echo (int) $frog['total']; ?>).</strong> After the Farmhouse is repaired, a cave opens in the northeast corner of the farm. The frog asks for three crops, one at a time, in this order: <?php echo esc_html( implode( ', then ', wp_list_pluck( $frog['crops'], 'name' ) ) ); ?>. Grow one plant of each on the island, leave it unharvested when it is ripe, and talk to the frog. He gives <?php echo (int) $frog['each']; ?> walnuts per crop and does not take it. You can plant all three on the same day: the slowest, <?php echo esc_html( $frog['crops'][0]['name'] ); ?>, is ready after <?php echo (int) $frog['all_ready_by']; ?> days.</li>
	<li><strong>Harvest drops (<?php echo (int) $hw['max']; ?>).</strong> Each crop harvested on the island farm has a <?php echo esc_html( $pct( $hw['chance'] ) ); ?> chance to drop a walnut, up to <?php echo (int) $hw['max']; ?> in total. Only crops that do not regrow and are not cut with a scythe count. On average that is about <?php echo (int) $hw['expected_harvests']; ?> qualifying harvests for all five, so a field of a fast single-harvest crop gets them in a few weeks.</li>
</ul>
<p>Keep a few frog seeds in a chest before you sail. <?php foreach ( $frog['crops'] as $f ) : ?><?php echo esc_html( $f['name'] ); ?> seeds are sold in <?php echo esc_html( implode( ' and ', $f['seasons'] ) ); ?> (<?php echo esc_html( $gold( $f['seed'] ) ); ?><?php echo $f['year_two'] ? ', and Pierre only stocks them from Year 2' : ''; ?>). <?php endforeach; ?>If the island opens in Winter, you will not be able to buy any of them until the right season comes round.</p>

<h2>Getting there faster</h2>
<p>A <?php echo esc_html( $gold( $gi['ticket'] ) ); ?> boat ride every day adds up, and the boat only runs while Willy's shop is open. Three things replace it:</p>
<ul>
	<li><strong>Farm Obelisk on the island</strong> (<?php echo (int) $gi['to_obelisk']; ?> walnuts with the mailbox): a free trip from the island back to your farm.</li>
	<?php if ( $gi['totem'] ) : ?>
	<li><strong>Warp Totem: Island</strong>: the recipe costs <?php echo esc_html( $gold( $gi['totem']['recipe_gold'] ) ); ?> from the <?php echo esc_html( $gi['totem']['seller'] ); ?> in the Volcano Dungeon, and each totem takes <?php echo esc_html( implode( ', ', array_map( function ( $i ) use ( $items ) { return $items( $i['qty'], $i['item'] ); }, $gi['totem']['items'] ) ) ); ?>. Building the Farm Obelisk gives you one free.</li>
	<?php endif; ?>
	<?php if ( $gi['obelisk'] ) : ?>
	<li><strong>Island Obelisk</strong> on your valley farm: <?php echo esc_html( $gold( $gi['obelisk']['gold'] ) ); ?> plus <?php echo esc_html( implode( ', ', array_map( function ( $i ) use ( $items ) { return $items( $i['qty'], $i['item'] ); }, $gi['obelisk']['items'] ) ) ); ?> from the Wizard. Together with the island's Farm Obelisk it makes the trip instant both ways, which is what turns the island into a daily farm instead of a weekly one. The bananas are one more reason to plant a Banana tree early.</li>
	<?php endif; ?>
</ul>

<h2>A simple first plan</h2>
<ol>
	<li>Open the west side and repair the Farmhouse (<?php echo (int) $gi['to_farmhouse']; ?> walnuts). Clear a block near the house and the Shipping Bin.</li>
	<li>Plant one <?php echo esc_html( $frog['crops'][0]['name'] ); ?>, one <?php echo esc_html( $frog['crops'][1]['name'] ); ?> and one <?php echo esc_html( $frog['crops'][2]['name'] ); ?> for the frog, and a patch of a fast single-harvest crop for the harvest walnuts.</li>
	<li>Move your <?php echo esc_html( $af['name'] ); ?> seeds to the island and fill sprinkler blocks as the Seed Maker produces more.</li>
	<li>Unlock the Island Trader (<?php echo (int) $unlock['trader']; ?> walnuts), trade Magma Caps for Pineapple Seeds and Bone Fragments for Taro Tubers, and plant the Taro on the irrigated tiles.</li>
	<li>Trade for a Banana sapling, then build Kegs to match your <?php echo esc_html( $af['name'] ); ?> and Pineapple harvests.</li>
</ol>
<p>Check your own numbers, with your farming level, professions and fertilizer, in the <a href="<?php echo esc_url( $profit ); ?>">Crop Profit Calculator</a>: pick "Ginger Island farm (one year)" as the season.<?php echo $gh_g ? ' The <a href="' . esc_url( $gh_g ) . '">greenhouse setup guide</a> covers the same choice on 120 tiles.' : ''; ?></p>

<?php
Stardew_Tools\Guides::quick_questions(
	array(
		'Do crops die on Ginger Island when the season changes?' => 'No. The island farm ignores the valley season, so a Summer crop keeps growing in Fall and Winter, the same as in the Greenhouse.',
		'Do I have to water crops on Ginger Island?'              => 'Yes, unless it rains there or the crop is Taro Root or Rice on an irrigated tile by the water. The island has its own weather with rain on about ' . $pct( $gi['rain_chance'] ) . ' of days, so use sprinklers.',
		'Can I put Scarecrows on the island farm?'                => 'You can, but you do not need them: crows never spawn on the Ginger Island farm.',
		'What is the best crop for Ginger Island?'                => esc_html( $top['name'] ) . ' sold raw (' . esc_html( $gold( $top['raw'] ) ) . ' a tile a year once grown). With enough Kegs, ' . esc_html( $best['name'] ) . ' as ' . esc_html( $best['best_as'] ) . '.',
		'How many walnuts do I need to farm on the island?'      => (int) $gi['to_farmhouse'] . ': ' . (int) $unlock['north'] . ' for Island North, ' . (int) $unlock['west'] . ' for Island West and ' . (int) $unlock['farmhouse'] . ' for the Farmhouse and its Shipping Bin.',
		'How do I get Pineapple Seeds?'                           => 'From the Island Trader in Island North, ' . esc_html( $items( $trade['pineapple-seeds']['qty'], $trade['pineapple-seeds']['item'] ) ) . ' per seed, once you have paid ' . (int) $unlock['trader'] . ' walnuts to open the shop.',
	)
);

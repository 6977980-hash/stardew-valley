<?php
/**
 * Guide: Are casks worth it?
 *
 * @var array    $g        data/answers.json "guides".
 * @var callable $gold     Formats gold.
 * @var callable $tool_url Tool permalink.
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

$c = isset( $g['casks'] ) ? $g['casks'] : null;
if ( ! $c ) {
	return;
}
$num   = function ( $n ) {
	return rtrim( rtrim( number_format( $n, 1 ), '0' ), '.' );
};
$wine  = array();
foreach ( $c['wine'] as $w ) {
	$wine[ $w['id'] ] = $w;
}
$cell  = $c['cellar'];
$star  = $wine['starfruit'];
$af    = $wine['ancient-fruit'];
$goat  = null;
$chee  = null;
foreach ( $c['items'] as $i ) {
	if ( 'goat-cheese' === $i['id'] ) {
		$goat = $i;
	}
	if ( 'cheese' === $i['id'] ) {
		$chee = $i;
	}
}
$wood  = $c['recipe'][0]['qty'];
$hard  = $c['recipe'][1]['qty'];
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> yes, if you already make wine or cheese, because a cask doubles the price of what you put in it for the cost of <?php echo (int) $wood; ?> Wood and <?php echo (int) $hard; ?> Hardwood. A Starfruit wine goes from <?php echo esc_html( $gold( $star['wine'] ) ); ?> to <?php echo esc_html( $gold( $star['iridium'] ) ); ?> in <?php echo (int) $cell['wine_days']['iridium']; ?> days (Artisan prices). A cask is an add-on to Kegs and Preserves Jars, not a replacement: it earns about <?php echo esc_html( $gold( round( $star['per_cask_day'] ) ) ); ?> a day for Starfruit wine, while the Keg that made that wine earns about <?php echo esc_html( $gold( $star['keg_per_day'] ) ); ?>. Casks only work in the cellar, which you unlock with the third Farmhouse upgrade for <?php echo esc_html( $gold( $cell['upgrade_gold'] ) ); ?>.</p>
</div>

<h2>What a cask does</h2>
<p>A cask holds one aged product and slowly raises its quality. The item starts at normal quality and moves to silver, then gold, then iridium. Each step multiplies the item's normal price: 1.25 for silver, 1.5 for gold and 2 for iridium. The Artisan profession then adds <?php echo (int) $c['artisan_percent']; ?>% on top, and it applies to everything aged in a cask. That is why an iridium Starfruit wine is exactly twice a normal one.</p>
<p>Only six products can be aged: wine, beer, pale ale, mead, cheese and goat cheese. Make them in a Keg or a Cheese Press as usual, then carry them to the cellar. A cask only works inside the cellar, so you cannot place one on the farm or in a barn. If you need the slot back before the item reaches iridium, you can take it out early with an Axe, Hoe or Pickaxe.</p>
<p>The time per step is fixed for each product. Everything below is the total number of days since you put the item in:</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Days in the cask to reach each quality</caption>
	<thead><tr><th scope="col">Product</th><th scope="col">Silver</th><th scope="col">Gold</th><th scope="col">Iridium</th></tr></thead>
	<tbody>
		<tr><th scope="row">Wine</th><td><?php echo (int) $cell['wine_days']['silver']; ?></td><td><?php echo (int) $cell['wine_days']['gold']; ?></td><td><?php echo (int) $cell['wine_days']['iridium']; ?></td></tr>
		<?php foreach ( $c['items'] as $i ) : ?>
		<tr><th scope="row"><?php echo esc_html( $i['name'] ); ?></th><td><?php echo (int) $i['days']['silver']; ?></td><td><?php echo (int) $i['days']['gold']; ?></td><td><?php echo (int) $i['days']['iridium']; ?></td></tr>
		<?php endforeach; ?>
	</tbody>
</table>
</div>
<p class="table-note">Wine takes two full seasons, which is 56 days. Cheese and goat cheese are the fastest, at two weeks.</p>

<h2>What cheese, ale and mead are worth aged</h2>
<p>The table shows the price at every step with and without the Artisan profession. "Per cask day" is the extra gold the cask adds each day it is busy, counted from the normal price to iridium.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Aged prices, with Artisan in brackets</caption>
	<thead><tr><th scope="col">Product</th><th scope="col">Normal</th><th scope="col">Silver</th><th scope="col">Gold</th><th scope="col">Iridium</th><th scope="col">Extra gold per cask day</th></tr></thead>
	<tbody>
		<?php foreach ( $c['items'] as $i ) : ?>
		<tr><th scope="row"><?php echo esc_html( $i['name'] ); ?></th><td><?php echo esc_html( $gold( $i['normal'] ) ); ?> (<?php echo esc_html( $gold( $i['artisan']['normal'] ) ); ?>)</td><td><?php echo esc_html( $gold( $i['silver'] ) ); ?> (<?php echo esc_html( $gold( $i['artisan']['silver'] ) ); ?>)</td><td><?php echo esc_html( $gold( $i['gold'] ) ); ?> (<?php echo esc_html( $gold( $i['artisan']['gold'] ) ); ?>)</td><td><?php echo esc_html( $gold( $i['iridium'] ) ); ?> (<?php echo esc_html( $gold( $i['artisan']['iridium'] ) ); ?>)</td><td><?php echo esc_html( $num( $i['per_day'] ) ); ?> (<?php echo esc_html( $num( $i['artisan']['per_day'] ) ); ?>)</td></tr>
		<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>Goat Cheese is the best product to age after wine: it reaches <?php echo esc_html( $gold( $goat['artisan']['iridium'] ) ); ?> with Artisan in only <?php echo (int) $goat['days']['iridium']; ?> days. That is about <?php echo esc_html( $gold( round( $goat['artisan']['per_day'] ) ) ); ?> extra a day per cask, more than three times what a Pale Ale earns. Plain Cheese reaches <?php echo esc_html( $gold( $chee['artisan']['iridium'] ) ); ?>. If you have cows and goats, a cask turns an ordinary stack of cheese into a good extra income without more machines. Large Milk makes gold-quality cheese directly, so a cask only has to do the last step, which takes <?php echo (int) ( $chee['days']['iridium'] - $chee['days']['gold'] ); ?> days for cheese. See <a href="<?php echo esc_url( $tool_url( 'animal-profit-calculator' ) ); ?>">the Animal Profit Calculator</a> for what the animals are worth before processing.</p>
<p>Beer, Pale Ale and Mead are the weakest products to age. They are worth <?php echo esc_html( $gold( $c['items'][0]['artisan']['normal'] ) ); ?> or less before aging and earn about <?php echo esc_html( $num( $c['items'][1]['artisan']['per_day'] ) ); ?> to <?php echo esc_html( $num( $c['items'][2]['artisan']['per_day'] ) ); ?> a day per cask, which is why aging them only makes sense once the better products already have a cask each.</p>

<h2>Wine: where casks really pay</h2>
<p>Wine is worth three times the base price of the fruit it is made from, so a more expensive fruit gains more from the same multiplier. This table shows Artisan wine prices from a normal-quality fruit and what a cask adds:</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Wine from each fruit, with Artisan</caption>
	<thead><tr><th scope="col">Fruit</th><th scope="col">Fruit price</th><th scope="col">Wine, normal</th><th scope="col">Wine, gold</th><th scope="col">Wine, iridium</th><th scope="col">Extra gold per cask day</th></tr></thead>
	<tbody>
		<?php foreach ( $c['wine'] as $w ) : ?>
		<tr<?php echo 'starfruit' === $w['id'] ? ' class="is-best"' : ''; ?>><th scope="row"><?php echo esc_html( $w['name'] ); ?></th><td><?php echo esc_html( $gold( $w['base'] ) ); ?></td><td><?php echo esc_html( $gold( $w['wine'] ) ); ?></td><td><?php echo esc_html( $gold( $w['gold'] ) ); ?></td><td><?php echo esc_html( $gold( $w['iridium'] ) ); ?></td><td><?php echo esc_html( $num( $w['per_cask_day'] ) ); ?></td></tr>
		<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>Starfruit leads at <?php echo esc_html( $gold( $star['iridium'] ) ); ?> for an iridium bottle, and Ancient Fruit follows at <?php echo esc_html( $gold( $af['iridium'] ) ); ?>. They are the two fruits worth planning around, and they are also the two fruits behind the best greenhouses in <a href="<?php echo esc_url( $tool_url( 'greenhouse-planner' ) ); ?>">the Greenhouse Planner</a>. Cheap fruit like Blueberry (<?php echo esc_html( $gold( $wine['blueberry']['iridium'] ) ); ?> iridium) or Grape (<?php echo esc_html( $gold( $wine['grape']['iridium'] ) ); ?>) gains only a few gold per cask day. They are better made into jam or sold, so the cask slot goes to Starfruit.</p>

<h2>Casks are an add-on, not a replacement</h2>
<p>It is tempting to compare a cask with a Keg directly, but they do different jobs. A Keg turns fruit into wine, and a cask then ages wine that already exists. Look at the numbers for Starfruit with Artisan:</p>
<ul>
	<li>The Keg turns a Starfruit worth <?php echo esc_html( $gold( $star['base'] ) ); ?> into wine worth <?php echo esc_html( $gold( $star['wine'] ) ); ?>, an extra <?php echo esc_html( $gold( $star['keg_per_day'] ) ); ?> a day for each Keg that stays busy.</li>
	<li>The cask doubles that wine to <?php echo esc_html( $gold( $star['iridium'] ) ); ?>, an extra <?php echo esc_html( $gold( $star['extra_cask'] ) ); ?> over <?php echo (int) $cell['wine_days']['iridium']; ?> days, or about <?php echo esc_html( $num( $star['per_cask_day'] ) ); ?> a day for each cask.</li>
</ul>
<p>So the cask earns far less per day than the Keg, but it is cheap, it needs no fruit and it never stops: a single bottle of Starfruit wine aged to iridium is worth <?php echo esc_html( $gold( $star['extra_cask'] ) ); ?> more than the same bottle sold straight away. Casks hold the output of your Kegs, so when you have more Kegs than you can empty, the cellar is where the extra wine goes. <a href="<?php echo esc_url( $tool_url( 'keg-vs-preserves-jar' ) ); ?>">Keg vs Preserves Jar</a> shows which machine to use for each crop first.</p>
<p>One more result follows from the data. The extra gold per cask day is the same at every quality step: aging Starfruit wine to silver adds <?php echo esc_html( $num( $star['per_cask_day'] ) ); ?> a day, and so does the step to gold and the step to iridium. That means stopping at gold doesn't waste a slot. If you have more wine than casks, take bottles out at gold and refill with new ones. If you have more casks than wine, leave everything for iridium.</p>

<h2>The cellar: size and cost</h2>
<p>The cellar comes with the third Farmhouse upgrade. Robin charges <?php echo esc_html( $gold( $cell['upgrade_gold'] ) ); ?> and takes <?php echo (int) $cell['upgrade_days']; ?> days to build it. It starts with <?php echo (int) $cell['start']; ?> casks already placed and has room for <?php echo (int) $cell['max']; ?> in total, so you craft the rest yourself. Each cask needs <?php echo (int) $wood; ?> Wood and <?php echo (int) $hard; ?> Hardwood, so filling the cellar means <?php echo (int) $cell['extra']; ?> more casks:</p>
<ul>
	<li><?php echo esc_html( number_format( $cell['wood'] ) ); ?> Wood</li>
	<li><?php echo esc_html( number_format( $cell['hardwood'] ) ); ?> Hardwood</li>
</ul>
<p>Hardwood is the scarce material, so the <?php echo esc_html( number_format( $cell['hardwood'] ) ); ?> pieces are the real limit. Plan to fill the cellar over several seasons, not at once. The <a href="<?php echo esc_url( $tool_url( 'crafting-calculator' ) ); ?>">Crafting Calculator</a> adds up the materials for any number of casks.</p>
<p>What a full cellar earns is large: <?php echo (int) $cell['max']; ?> casks of iridium Starfruit wine would add about <?php echo esc_html( $gold( $star['cellar'] ) ); ?> over one 56-day cycle compared with selling the wine at once, and the same number of Ancient Fruit wines about <?php echo esc_html( $gold( $af['cellar'] ) ); ?>. Few farms grow that many fruit in a cycle, so size the cellar to the fruit you really harvest.</p>

<h2>What to age first</h2>
<ol>
	<li><strong>Starfruit and Ancient Fruit wine.</strong> Best gold per cask, and the slot is used for the full <?php echo (int) $cell['wine_days']['iridium']; ?> days.</li>
	<li><strong>Goat Cheese</strong> if you keep goats: <?php echo esc_html( $gold( $goat['artisan']['iridium'] ) ); ?> in two weeks.</li>
	<li><strong>Pineapple, Melon and Rhubarb wine</strong> next, then Cheese.</li>
	<li><strong>Mead, Beer and Pale Ale</strong> only with spare casks.</li>
	<li><strong>Cheap fruit wine</strong> last. Jam or raw sales use fewer slots.</li>
</ol>

<h2>Mistakes to avoid</h2>
<ul>
	<li><strong>Waiting for iridium when you are short of casks.</strong> The rate is the same at every step, so take gold bottles out and refill. (You can take an item out early with an Axe, Hoe or Pickaxe.)</li>
	<li><strong>Buying the cellar only for casks.</strong> It is a Farmhouse upgrade, and you need the first two upgrades before it, so plan the gold.</li>
	<li><strong>Using Kegs for cheap fruit.</strong> A Keg slot is worth more than the cask slot, so keep Kegs on Starfruit and Ancient Fruit and use the cellar for what they make.</li>
	<li><strong>Forgetting Artisan.</strong> It adds <?php echo (int) $c['artisan_percent']; ?>% to everything on this page. Without it, divide the prices above by 1.4.</li>
</ul>

<h2>Related</h2>
<p>Know how many Kegs one plant keeps busy in <a href="<?php echo esc_url( home_url( '/artisan-goods/how-many-kegs-do-i-need/' ) ); ?>">How many kegs do I need?</a>, and see Dehydrators as a faster machine for fruit in <a href="<?php echo esc_url( home_url( '/artisan-goods/dehydrator-vs-keg/' ) ); ?>">Dehydrator vs Keg</a>.</p>

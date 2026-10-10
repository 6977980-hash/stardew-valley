<?php
/**
 * Guide: Are pigs worth it?
 *
 * @var array    $g        data/answers.json "guides".
 * @var callable $gold     Formats gold.
 * @var callable $tool_url Tool permalink.
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

$p = isset( $g['pigs'] ) ? $g['pigs'] : null;
if ( ! $p ) {
	return;
}
$num = function ( $n ) {
	return rtrim( rtrim( number_format( $n, 1 ), '0' ), '.' );
};
$animal_url = $tool_url( 'animal-profit-calculator' );
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> yes. A happy pig at full hearts finds about <?php echo esc_html( $num( $p['truffles_per_day_max'] ) ); ?> truffles on every day it can go outside, worth <?php echo esc_html( $gold( $p['raw_per_day'] ) ); ?> sold raw. That pays back its <?php echo esc_html( $gold( $p['price'] ) ); ?> price in about <?php echo esc_html( $num( $p['payback_raw'] ) ); ?> good days. Turn the truffles into Truffle Oil with the Artisan profession and it makes <?php echo esc_html( $gold( $p['oil_artisan_per_day'] ) ); ?> a day. The catch is that pigs find nothing in winter or on rainy days.</p>
</div>

<h2>What a pig makes</h2>
<p>Pigs live in a <?php echo esc_html( $p['building'] ); ?> and dig up truffles when they go outside. They stay inside in winter and when it rains, storms or snows, so a pig only works on dry days in spring, summer and fall. On those days, a pig at full friendship finds about <?php echo esc_html( $num( $p['truffles_per_day_max'] ) ); ?> truffles. At half friendship it is about <?php echo esc_html( $num( $p['truffles_per_day_half_hearts'] ) ); ?>, so petting and feeding them every day matters more for pigs than for any other animal.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>One pig at full hearts, per day it goes outside</caption>
	<thead><tr><th scope="col">How you sell</th><th scope="col">Price each</th><th scope="col">Gold per day</th><th scope="col">Days to pay back <?php echo esc_html( $gold( $p['price'] ) ); ?></th></tr></thead>
	<tbody>
		<tr><th scope="row">Truffles, raw</th><td><?php echo esc_html( $gold( $p['truffle']['normal'] ) ); ?></td><td><?php echo esc_html( $gold( $p['raw_per_day'] ) ); ?></td><td><?php echo esc_html( $num( $p['payback_raw'] ) ); ?></td></tr>
		<tr><th scope="row">Truffle Oil</th><td><?php echo esc_html( $gold( $p['oil']['price'] ) ); ?></td><td><?php echo esc_html( $gold( $p['oil_per_day'] ) ); ?></td><td><?php echo esc_html( $num( $p['price'] / $p['oil_per_day'] ) ); ?></td></tr>
		<tr><th scope="row">Truffle Oil with Artisan</th><td><?php echo esc_html( $gold( $p['oil']['artisan'] ) ); ?></td><td><?php echo esc_html( $gold( $p['oil_artisan_per_day'] ) ); ?></td><td><?php echo esc_html( $num( $p['payback_oil_artisan'] ) ); ?></td></tr>
	</tbody>
</table>
</div>
<p class="table-note">Regular-quality truffles. The pay-back days count only days the pig goes out, so on the calendar it takes longer.</p>
<p>For comparison, a cow at full hearts earns about <?php echo esc_html( $gold( $p['cow_per_day'] ) ); ?> a day from milk. A pig costs about ten times as much as a cow and earns over five times as much on a good day selling raw. It still pays for itself in a couple of weeks of good weather, and every day after that is profit.</p>

<h2>Truffle Oil or raw truffles?</h2>
<p>For a regular truffle, Truffle Oil wins every time: <?php echo esc_html( $gold( $p['oil']['price'] ) ); ?> against <?php echo esc_html( $gold( $p['truffle']['normal'] ) ); ?>, and <?php echo esc_html( $gold( $p['oil']['artisan'] ) ); ?> with Artisan. An Oil Maker takes 6 hours per truffle, so one machine handles about <?php echo esc_html( $num( $p['oil']['per_machine_day'] ) ); ?> truffles a day. That's roughly <?php echo esc_html( $num( $p['oil_makers_per_pig'] ) ); ?> of an Oil Maker per pig, or 2 Oil Makers for every 3 pigs.</p>
<p>It changes if your truffles are iridium quality. Truffle quality depends on your Foraging skill, not on the pig: the wiki's Truffle page notes that truffles benefit from the Gatherer and Botanist professions. An iridium truffle sells for <?php echo esc_html( $gold( $p['truffle']['iridium'] ) ); ?>, more than Truffle Oil without Artisan (<?php echo esc_html( $gold( $p['oil']['price'] ) ); ?>) but less than with it (<?php echo esc_html( $gold( $p['oil']['artisan'] ) ); ?>). Truffle Oil comes out the same whatever the truffle's quality, so:</p>
<ul>
	<li>Artisan: make oil from everything.</li>
	<li>No Artisan, but Botanist: sell the iridium truffles raw.</li>
	<li>Neither: make oil.</li>
</ul>

<h2>Before you buy</h2>
<ul>
	<li>Pigs need a <?php echo esc_html( $p['building'] ); ?>, the last Barn upgrade, so budget for the building as well as the <?php echo esc_html( $gold( $p['price'] ) ); ?> pig.</li>
	<li>A pig only earns on dry days in spring, summer and fall. Buy early in spring rather than late in fall.</li>
	<li>Leave the barn door open and keep grass nearby so they go out and stay happy.</li>
	<li>Compare pigs with every other animal, at your hearts and professions, in the <a href="<?php echo esc_url( $animal_url ); ?>">Animal Profit Calculator</a>.</li>
</ul>

<h2>What the pig needs every day</h2>
<p>A pig produces a truffle only when every one of these is true:</p>
<ul>
	<?php foreach ( $p['conditions'] as $c ) : ?>
	<li><?php echo esc_html( ucfirst( $c ) ); ?>.</li>
	<?php endforeach; ?>
</ul>
<p>The last one catches people out. A truffle is placed on a free tile outside, so a pig let out into a yard full of crops, fences and stumps has nowhere to put one. Give pigs a plain stretch of grass or dirt. Truffles you don't pick up stay on the ground until the next day, but anything left on day 28 of a season is gone the next morning, so make a last sweep before the calendar turns.</p>

<h2>How friendship changes the income</h2>
<p>Every pig finds one truffle on a good day. Friendship decides how often it finds extras: the chance of an extra truffle is the pig's friendship divided by 1,500, and the extra can repeat. A new pig averages one truffle a day. A pig at five hearts averages about three. That triples the income from the same animal, so friendship is worth more here than with any other animal.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>One pig, by friendship, per day it goes outside</caption>
	<thead><tr><th scope="col">Hearts</th><th scope="col">Truffles a day</th><th scope="col">Raw</th><th scope="col">Oil with Artisan</th></tr></thead>
	<tbody>
	<?php foreach ( $p['by_friendship'] as $r ) : ?>
		<tr><th scope="row"><?php echo (int) $r['hearts']; ?></th><td><?php echo esc_html( $num( $r['truffles'] ) ); ?></td><td><?php echo esc_html( $gold( $r['raw'] ) ); ?></td><td><?php echo esc_html( $gold( $r['oil_artisan'] ) ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p class="table-note">Animal hearts are 200 friendship points each, so five hearts is the maximum of 1,000. Regular-quality truffles, an average day.</p>
<p>The first hearts take effort and the last ones pay the most. Going from four hearts to five lifts the raw income from <?php echo esc_html( $gold( $p['by_friendship'][4]['raw'] ) ); ?> to <?php echo esc_html( $gold( $p['by_friendship'][5]['raw'] ) ); ?> a day. Pet and feed your pigs every day from the start and don't leave the last heart for later.</p>

<h2>Pigs against every other animal</h2>
<p>This is every animal you can buy, at full friendship, ranked by what it makes a day when its products are turned into artisan goods by an Artisan player. "Days to pay back" is the price divided by the better of raw or processed income.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Animals ranked by processed income per day</caption>
	<thead><tr><th scope="col">Animal</th><th scope="col">Needs</th><th scope="col">Price</th><th scope="col">Raw a day</th><th scope="col">Processed a day</th><th scope="col">Days to pay back</th></tr></thead>
	<tbody>
	<?php foreach ( $p['compare'] as $r ) : ?>
		<tr<?php echo 'pig' === $r['id'] ? ' class="is-best"' : ''; ?>><th scope="row"><?php echo esc_html( $r['name'] ); ?></th><td><?php echo esc_html( $r['building'] ); ?></td><td><?php echo esc_html( $gold( $r['price'] ) ); ?></td><td><?php echo esc_html( $gold( $r['raw'] ) ); ?></td><td><?php echo esc_html( $gold( $r['processed'] ) ); ?></td><td><?php echo esc_html( $num( $r['payback'] ) ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p class="table-note">Pigs only earn on days they can go outside, the others earn on every day. Animals that need special items to obtain (Void Chicken, Golden Chicken, Dinosaur, Ostrich) are not in the table.</p>
<p>Two things stand out. The pig earns far more than anything else, but it also needs more setup, and its income depends on the weather. The Chicken is the opposite: it pays back its price fastest and works in every season. A farm that wants steady gold should keep chickens or cows as well, and add pigs for the big spring-to-fall income. Use the <a href="<?php echo esc_url( $animal_url ); ?>">Animal Profit Calculator</a> to rank them for your own hearts and professions.</p>

<h2>Setting up the oil</h2>
<p>An Oil Maker is <?php echo esc_html( implode( ', ', array_map( function ( $m ) { return number_format( $m['qty'] ) . ' ' . $m['name']; }, $g['costs']['oil-maker']['materials'] ) ) ); ?> and needs <?php echo esc_html( $g['costs']['oil-maker']['obtained'] ); ?>. The Slime and Hardwood are the slow part, so build the first one before you buy a second pig.</p>
<p>With <?php echo esc_html( $num( $p['oil_makers_per_pig'] ) ); ?> of an Oil Maker needed per pig, four pigs at full hearts want <?php echo (int) ceil( 4 * $p['oil_makers_per_pig'] ); ?> machines. You can start with fewer. Truffles wait on the ground or in a chest without spoiling, so a backlog is harmless: it means the next machine is worth building.</p>

<h2>How we counted</h2>
<p>Every figure here comes from the same animal rules as the Animal Profit Calculator: full friendship (1,000 points, five hearts), a happy animal, regular-quality truffles, and no Rancher bonus on truffles. The Artisan profession is applied only where a column says so. Income is for a day the pig goes out; it does not average in rainy days or winter, because those depend on your save.</p>

<h2>Things worth knowing</h2>
<ul>
	<li><strong>Bad weather means no truffle.</strong> Rain, storms and snow keep the pig inside, and so does all of winter. The income in this guide is per good day, not per calendar day.</li>
	<li><strong>Golden Animal Crackers don't work on pigs.</strong> The wiki notes that a cracker can double any farm animal's produce except pigs.</li>
	<li><strong>About one dig in 500 is a Truffle Crab.</strong> Pigs have a 0.2% chance to dig up a Truffle Crab instead of a truffle. It's rare enough to ignore when planning income.</li>
	<li><strong>Quality comes from you, not the pig.</strong> Truffle quality follows your Foraging skill, so the table assumes regular quality and your real income may be higher.</li>
</ul>

<h2>A plan that works</h2>
<ol>
	<li><strong>Finish the Deluxe Barn first.</strong> The pig can't be bought until you have it.</li>
	<li><strong>Buy one pig in spring.</strong> A pig bought in early spring has three seasons of dry days ahead of it.</li>
	<li><strong>Pet and feed daily, and keep the yard clear.</strong> That's what moves the pig from one truffle to three.</li>
	<li><strong>Collect truffles each morning and feed an Oil Maker.</strong> Sell what's left raw or hold it for the next machine.</li>
	<li><strong>Add pigs as your Oil Makers catch up.</strong> More pigs than machines just means a backlog.</li>
</ol>

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

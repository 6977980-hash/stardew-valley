<?php
/**
 * Hub intro: Greenhouse.
 *
 * @var array $answers
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;
$gh = isset( $answers['greenhouse'] ) ? $answers['greenhouse'] : array();
$gg = isset( $answers['guides']['greenhouse'] ) ? $answers['guides']['greenhouse'] : array();
$g  = function ( $n ) {
	return number_format( (int) $n ) . 'g';
};
?>
<p class="hub-lead">The greenhouse grows any crop in any season, so it is where long-term money is decided. A good plan needs three things: a sprinkler layout that waters every tile, the right crop, and enough kegs to process what it grows.</p>
<?php if ( $gh ) : ?>
<p>With 6 Iridium Sprinklers you get <?php echo (int) $gh['tiles']; ?> plantable tiles. Planted with Ancient Fruit and sold raw, that is about <?php echo esc_html( number_format( (int) $gh['raw'][0]['total'] ) ); ?>g a year once the plants are grown, and much more with kegs.</p>
<?php endif; ?>
<h2>Start here</h2>
<ol>
	<li>Lay it out and see a year of profit in the <a href="<?php echo esc_url( Stardew_Tools\Tools::url( 'greenhouse-planner' ) ); ?>">Greenhouse Planner</a>.</li>
	<li>Which crop, for the kegs you own? Read <a href="<?php echo esc_url( Stardew_Tools\Guides::guide_url( 'best-greenhouse-setup-for-money' ) ); ?>">Best Greenhouse Setup for Money</a>.</li>
	<li>Choosing between the two famous fruits? <a href="<?php echo esc_url( Stardew_Tools\Tools::url( 'ancient-fruit-vs-starfruit' ) ); ?>">Ancient Fruit vs Starfruit</a> compares them with your professions.</li>
</ol>
<?php if ( ! empty( $gg['layouts'] ) ) : ?>
<h2>Sprinklers: fewer tiles, less work</h2>
<p>The greenhouse floor has 120 plantable tiles. Every sprinkler takes a tile, so the layout is a trade between tiles lost and watering saved. For a full greenhouse of Ancient Fruit, sold raw, a year looks like this:</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Ancient Fruit, sold raw, one year (established plants)</caption>
	<thead><tr><th scope="col">Layout</th><th scope="col">Sprinklers</th><th scope="col">Tiles</th><th scope="col">Gold per year</th></tr></thead>
	<tbody>
	<?php foreach ( $gg['layouts'] as $l ) : ?>
		<tr><th scope="row"><?php echo esc_html( $l['name'] ); ?></th><td><?php echo (int) $l['sprinklers']; ?></td><td><?php echo (int) $l['tiles']; ?></td><td><?php echo esc_html( $g( $l['ancient_fruit_raw'] ) ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>Watering by hand squeezes in the most tiles, but you do it every day. Iridium Sprinklers give up only a few tiles and water everything for you, which is why most farms end up with them. The planner shows each layout on the real greenhouse grid.</p>
<?php endif; ?>
<?php if ( ! empty( $gg['by_kegs'] ) ) : ?>
<h2>The best crop depends on your kegs</h2>
<p>Raw, the greenhouse is easy: <?php echo esc_html( $gh['raw'][0]['name'] ); ?> wins. Once you process the harvest, the winner changes with how many kegs you own, because every fruit has to wait its turn in a keg.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Best greenhouse crop by number of kegs, one year, 116 tiles</caption>
	<thead><tr><th scope="col">Kegs</th><th scope="col">Best crop</th><th scope="col">Gold per year</th><th scope="col">Runner-up</th></tr></thead>
	<tbody>
	<?php foreach ( $gg['by_kegs'] as $row ) : ?>
		<tr><th scope="row"><?php echo (int) $row['kegs']; ?></th><td><?php echo esc_html( $row['top'][0]['name'] ); ?></td><td><?php echo esc_html( $g( $row['top'][0]['total'] ) ); ?></td><td><?php echo esc_html( $row['top'][1]['name'] ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>With no machines, Ancient Fruit is ahead. It stays ahead for a long time as you add kegs, and Hops only pass it when the keg count is very large, because a Hops vine makes a cone every day and drowns a small keg shed. If you are not sure how many kegs to build, <a href="<?php echo esc_url( Stardew_Tools\Guides::guide_url( 'how-many-kegs-do-i-need' ) ); ?>">How Many Kegs Do I Need?</a> works it out per crop.</p>
<?php endif; ?>
<?php if ( ! empty( $gg['first_year'][0] ) ) : ?>
<h2>Year one is smaller than year two</h2>
<p><?php echo esc_html( $gg['first_year'][0]['name'] ); ?> takes <?php echo (int) $gg['first_year'][0]['growth']; ?> days to grow the first time. In the first year it makes about <?php echo esc_html( $g( $gg['first_year'][0]['first_profit'] ) ); ?> per tile from <?php echo (int) $gg['first_year'][0]['first_harvests']; ?> harvests, and in later years about <?php echo esc_html( $g( $gg['first_year'][0]['established_profit'] ) ); ?> from <?php echo (int) $gg['first_year'][0]['established_harvests']; ?>, because the plants are already grown. Plan around the first-year figure, and treat the second as a bonus.</p>
<?php endif; ?>
<h2>Common mistakes</h2>
<ul>
	<li><strong>Filling it with Hops on a small keg shed.</strong> One vine fills a keg more than once over, so most cones end up sold raw and Hops fall behind Ancient Fruit.</li>
	<li><strong>Judging by the second year.</strong> Year two numbers assume the plants are already grown. Check the first-year figure for money you need soon.</li>
	<li><strong>Counting tiles you do not have.</strong> Every sprinkler sits on a tile you can no longer plant, so compare layouts in the planner instead of assuming all 120 tiles are free.</li>
</ul>

<?php
/**
 * All-crops index.
 *
 * @var array    $all  Entities file.
 * @var callable $tool_url
 * @var callable $guide_url
 * @var callable $gold
 * @var callable $link
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

$rows = array();
foreach ( $all['crops'] as $id => $c ) {
	$best = null;
	foreach ( $c['plantings'] as $p ) {
		if ( ! $best || $p['profit']['level6'] > $best['profit']['level6'] ) {
			$best = $p;
		}
	}
	$rows[] = array( $id, $c, $best );
}
usort(
	$rows,
	function ( $a, $b ) {
		return ( $b[2] ? $b[2]['profit']['level6'] : -1 ) <=> ( $a[2] ? $a[2]['profit']['level6'] : -1 );
	}
);
$top = $rows[0];
// Leader among crops a shop sells seeds for, the same pool as the Best Crops pages.
$shop_top = null;
foreach ( $rows as $r ) {
	if ( ! empty( $r[1]['shop_seeds'] ) && $r[2] ) {
		$shop_top = $r;
		break;
	}
}
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> this page lists all <?php echo (int) count( $rows ); ?> crops we have verified for Stardew Valley 1.6, sorted by profit per tile for a farmer at Farming level 6 planting on day 1 of the crop's best season. Crops whose seeds no shop sells every day are counted at their one-off seed price (Strawberry at the Egg Festival, Sweet Gem Berry's Rare Seed at the Traveling Cart for 1,000g), Ancient Fruit and Coffee Bean with no seed cost because you replant your own, and Cactus Fruit, which only grows indoors, is listed with its greenhouse year. The top of the list is <?php echo esc_html( $top[1]['name'] ); ?> at <?php echo esc_html( $gold( $top[2]['profit']['level6'] ) ); ?> per tile<?php echo $shop_top && $shop_top[0] !== $top[0] ? ', but no shop sells its seeds; the best crop you can buy seeds for is ' . esc_html( $shop_top[1]['name'] ) . ' at ' . esc_html( $gold( $shop_top[2]['profit']['level6'] ) ) . ' (' . esc_html( ucfirst( $shop_top[2]['season'] ) ) . ')' : ''; ?>. Click any crop for its full page: quality chances, fertilizer, machines and the greenhouse.</p>
</div>

<h2>Every crop, ranked by profit per tile</h2>
<p>Profit is net of seeds, sold raw at regular quality mixed by the level-6 chances, planted on day 1 of the best season for that crop. Crops that only grow in the greenhouse are shown with their greenhouse profit for a year. "Per harvest" is the gold from one harvest of one plant. For your own level, fertilizer and professions use the <a href="<?php echo esc_url( $tool_url( 'crop-profit-calculator' ) ); ?>">Crop Profit Calculator</a>.</p>
<p class="table-hint" aria-hidden="true">Swipe the table sideways for more columns →</p>
<div class="table-wrap table-wrap--sticky" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>All crops, best profit per tile first</caption>
	<thead><tr><th scope="col">Crop</th><th scope="col">Best profit per tile</th><th scope="col">Seasons</th><th scope="col">Type</th><th scope="col">Days to grow</th><th scope="col">Regrow</th><th scope="col">Sell price</th></tr></thead>
	<tbody>
	<?php foreach ( $rows as $r ) : ?>
		<?php
		$c = $r[1];
		$p = $r[2];
		?>
		<tr>
			<th scope="row"><?php echo $link( 'crops', $r[0], $c['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?></th>
			<td><?php echo $p ? esc_html( $gold( $p['profit']['level6'] ) ) . ' <small>(' . esc_html( ucfirst( $p['season'] ) ) . ')</small>' : esc_html( $gold( $c['greenhouse']['established'] ) ) . ' <small>(greenhouse year)</small>'; ?></td>
			<td><?php echo esc_html( implode( ', ', array_map( 'ucfirst', $c['seasons'] ) ) ); ?></td>
			<td><?php echo esc_html( ucfirst( $c['category'] ) ); ?></td>
			<td><?php echo (int) $c['growth_days']; ?></td>
			<td><?php echo $c['regrow_days'] ? (int) $c['regrow_days'] . ' days' : '—'; ?></td>
			<td><?php echo esc_html( $gold( $c['base_price'] ) ); ?></td>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>

<h2>How to use this list</h2>
<p>A high profit per tile is not the whole story. Crops that regrow, such as Strawberry or Blueberry, pay back after several harvests and need no replanting. Crops that give one harvest, like Pumpkin (13 days), must be replanted each time. For the best choice on a given day with a given budget, ask <a href="<?php echo esc_url( $tool_url( 'what-to-plant' ) ); ?>">What to Plant Today</a>. For a season overview read <a href="<?php echo esc_url( home_url( '/' ) ); ?>">our season pages</a> from the home page, or the guide <a href="<?php echo esc_url( $guide_url( 'speed-gro-vs-fertilizer' ) ); ?>">Speed-Gro vs Fertilizer</a> to see what fertilizer adds.</p>

<?php $q_rows = $top[1]['quality']; ?>
<h2 id="how-we-count">How the crop pages count</h2>
<p>Every crop page uses the same rules, so they are written here once:</p>
<ul>
	<li><strong>Profit per tile</strong> is one tile planted on day 1 of the season and replanted after each harvest (or left to regrow), sold raw, after paying for seeds. Every harvest that fits before the season ends counts, and a crop that also grows in the next season carries on into it.</li>
	<li><strong>The rank</strong> compares only crops whose seeds a shop sells every day, the same pool as the Best Crops pages. Those pages rank at farming level 0 and crop pages at level 6, so neighbours can swap places.</li>
	<li><strong>Machines:</strong> "extra gold per machine per day" is what one never-idle Keg or Preserves Jar adds over selling the crop raw, with the Artisan profession (+40%). Artisan comes after Tiller, so the raw price it is compared with includes Tiller's +10%.</li>
	<li><strong>Quality</strong> depends on your farming level. Silver sells for 1.25×, gold 1.5× and iridium 2× the regular price. Without fertilizer the chances are:</li>
</ul>
<div class="table-wrap" tabindex="0" role="region" aria-label="<?php echo esc_attr( Stardew_Tools\Entities::TABLE_LABEL ); ?>">
<table class="results-table">
	<caption>Chance of each crop quality, no fertilizer</caption>
	<thead><tr><th scope="col">Farming level</th><th scope="col">Regular</th><th scope="col">Silver</th><th scope="col">Gold</th><th scope="col">Iridium</th></tr></thead>
	<tbody>
	<?php foreach ( $q_rows as $q ) : ?>
		<tr><th scope="row"><?php echo (int) $q['level']; ?></th><td><?php echo esc_html( $q['chances']['regular'] ); ?>%</td><td><?php echo esc_html( $q['chances']['silver'] ); ?>%</td><td><?php echo esc_html( $q['chances']['gold'] ); ?>%</td><td><?php echo esc_html( $q['chances']['iridium'] ); ?>%</td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p class="table-note">Iridium quality needs Deluxe Fertilizer, which is why it is 0% here.</p>

<p><a href="<?php echo esc_url( Stardew_Tools\Entities::csv_url( 'stardew-crops.csv' ) ); ?>" download>Download this table as CSV</a>, or see all <a href="<?php echo esc_url( home_url( '/data/' ) ); ?>">data downloads</a>.</p>

<h2>Related</h2>
<ul class="related-list">
	<li><a href="<?php echo esc_url( $tool_url( 'crop-profit-calculator' ) ); ?>">Crop Profit Calculator</a><span>Your level, fertilizer and professions.</span></li>
	<li><a href="<?php echo esc_url( $tool_url( 'what-to-plant' ) ); ?>">What to Plant Today</a><span>Best crop for today's date and budget.</span></li>
	<li><a href="<?php echo esc_url( $tool_url( 'xp-calculator' ) ); ?>">XP Calculator</a><span>Farming XP per crop.</span></li>
</ul>

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
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> this page lists all <?php echo (int) count( $rows ); ?> crops we have verified for Stardew Valley 1.6, sorted by profit per tile for a farmer at Farming level 6 planting on the best day of a season. The top of the list is <?php echo esc_html( $top[1]['name'] ); ?> at <?php echo esc_html( $gold( $top[2]['profit']['level6'] ) ); ?> per tile. Click any crop for its full page: quality chances, fertilizer, machines and the greenhouse.</p>
</div>

<h2>Every crop, ranked by profit per tile</h2>
<p>Profit is net of seeds, sold raw at regular quality mixed by the level-6 chances, planted on day 1 of the best season for that crop. Crops that only grow in the greenhouse are shown with their greenhouse profit for a year. "Per harvest" is the gold from one harvest of one plant. For your own level, fertilizer and professions use the <a href="<?php echo esc_url( $tool_url( 'crop-profit-calculator' ) ); ?>">Crop Profit Calculator</a>.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>All crops, best profit per tile first</caption>
	<thead><tr><th scope="col">Crop</th><th scope="col">Type</th><th scope="col">Seasons</th><th scope="col">Days to grow</th><th scope="col">Regrow</th><th scope="col">Sell price</th><th scope="col">Best profit per tile</th></tr></thead>
	<tbody>
	<?php foreach ( $rows as $r ) : ?>
		<?php
		$c = $r[1];
		$p = $r[2];
		?>
		<tr>
			<th scope="row"><?php echo $link( 'crops', $r[0], $c['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?></th>
			<td><?php echo esc_html( ucfirst( $c['category'] ) ); ?></td>
			<td><?php echo esc_html( implode( ', ', array_map( 'ucfirst', $c['seasons'] ) ) ); ?></td>
			<td><?php echo (int) $c['growth_days']; ?></td>
			<td><?php echo $c['regrow_days'] ? (int) $c['regrow_days'] . ' days' : '—'; ?></td>
			<td><?php echo esc_html( $gold( $c['base_price'] ) ); ?></td>
			<td><?php echo $p ? esc_html( $gold( $p['profit']['level6'] ) ) . ' <small>(' . esc_html( ucfirst( $p['season'] ) ) . ')</small>' : '—'; ?></td>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>

<h2>How to use this list</h2>
<p>A high profit per tile is not the whole story. Crops that regrow, such as Strawberry or Blueberry, pay back after several harvests and need no replanting. Crops that take 28 days like Pumpkin are one big harvest per season. For the best choice on a given day with a given budget, ask <a href="<?php echo esc_url( $tool_url( 'what-to-plant' ) ); ?>">What to Plant Today</a>. For a season overview read <a href="<?php echo esc_url( home_url( '/' ) ); ?>">our season pages</a> from the home page, or the guide <a href="<?php echo esc_url( $guide_url( 'speed-gro-vs-fertilizer' ) ); ?>">Speed-Gro vs Fertilizer</a> to see what fertilizer adds.</p>

<h2>Related</h2>
<ul class="related-list">
	<li><a href="<?php echo esc_url( $tool_url( 'crop-profit-calculator' ) ); ?>">Crop Profit Calculator</a><span>Your level, fertilizer and professions.</span></li>
	<li><a href="<?php echo esc_url( $tool_url( 'what-to-plant' ) ); ?>">What to Plant Today</a><span>Best crop for today's date and budget.</span></li>
	<li><a href="<?php echo esc_url( $tool_url( 'xp-calculator' ) ); ?>">XP Calculator</a><span>Farming XP per crop.</span></li>
</ul>

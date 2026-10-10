<?php
/**
 * Artisan machine page (Keg, Preserves Jar).
 *
 * @var array    $e        Machine record from data/entities.json.
 * @var array    $all      The whole entities file.
 * @var callable $tool_url Tool permalink.
 * @var callable $ent_url  Entity permalink.
 * @var callable $guide_url Guide permalink.
 * @var callable $gold     Formats gold.
 * @var callable $link     Link to an entity page.
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

$rows  = $e['crops'];
$top   = array_slice( $rows, 0, 5 );
$fruit = array_values(
	array_filter(
		$rows,
		function ( $r ) use ( $all ) {
			return isset( $all['crops'][ $r['id'] ] ) && 'fruit' === $all['crops'][ $r['id'] ]['category'];
		}
	)
);
$n     = function ( $v ) {
	return rtrim( rtrim( number_format( (float) $v, 2 ), '0' ), '.' );
};
$other = 'keg' === $e['id'] ? 'preserves-jar' : 'keg';
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> the <?php echo esc_html( $e['name'] ); ?> accepts <?php echo (int) $e['accepted']; ?> crops. Measured by extra gold per machine per day, the best are <?php echo esc_html( $top[0]['name'] ); ?> (<?php echo esc_html( $gold( $top[0]['gain_per_machine_day'] ) ); ?>), <?php echo esc_html( $top[1]['name'] ); ?> (<?php echo esc_html( $gold( $top[1]['gain_per_machine_day'] ) ); ?>) and <?php echo esc_html( $top[2]['name'] ); ?> (<?php echo esc_html( $gold( $top[2]['gain_per_machine_day'] ) ); ?>). The list changes a lot if you have only a few machines, because a machine that is always busy earns more from a fast, valuable crop than a slow, cheap one.</p>
</div>

<h2>How to read the table</h2>
<p>"Extra gold per machine per day" is the price of the product minus what the crop would have sold for raw, spread over the days the machine takes, assuming it is never idle and the Artisan profession is on. It is the number to use when you own fewer machines than you have crops. If you have more machines than crops, rank by total gold instead, which is what the <a href="<?php echo esc_url( $tool_url( 'keg-vs-preserves-jar' ) ); ?>">Keg vs Preserves Jar</a> tool does with your real harvest. Times use 1,600 game minutes per day, as the wiki states.</p>

<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Crops for the <?php echo esc_html( $e['name'] ); ?>, best first</caption>
	<thead><tr><th scope="col">#</th><th scope="col">Crop</th><th scope="col">Makes</th><th scope="col">Price</th><th scope="col">Days</th><th scope="col">Extra gold per machine per day</th></tr></thead>
	<tbody>
	<?php foreach ( $rows as $i => $r ) : ?>
		<tr<?php echo $i < 3 ? ' class="is-best"' : ''; ?>>
			<td><?php echo (int) $i + 1; ?></td>
			<th scope="row"><?php echo $link( 'crops', $r['id'], $r['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?></th>
			<td><?php echo esc_html( $r['product'] ); ?><?php echo $r['input'] > 1 ? ' <small>(' . (int) $r['input'] . ' needed)</small>' : ''; ?></td>
			<td><?php echo esc_html( $gold( $r['price'] ) ); ?></td>
			<td><?php echo esc_html( $n( $r['days'] ) ); ?></td>
			<td><?php echo esc_html( $gold( $r['gain_per_machine_day'] ) ); ?></td>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>

<h2>Reading the top of the list</h2>
<?php if ( 'keg' === $e['id'] ) : ?>
<p>Coffee Beans come out first because Coffee takes only two hours per run and a Keg turns five beans into one. That is a real gain, but it isn't something you can scale: a single Coffee Bean plant doesn't give five beans a day, so a Keg usually waits for beans. Treat the top row as "good when you have the beans" and look further down for crops you grow in volume. Among fruit, <?php echo isset( $fruit[0] ) ? esc_html( $fruit[0]['name'] ) : 'the leaders'; ?> earns <?php echo isset( $fruit[0] ) ? esc_html( $gold( $fruit[0]['gain_per_machine_day'] ) ) : ''; ?> a machine-day.</p>
<?php else : ?>
<p>A Preserves Jar finishes every fruit and vegetable in 2.5 game days, much faster than the Keg's wine, so it earns well on cheap crops: it needs fewer machines to keep up. Its best crops are those with a high price after processing, and the list rewards value more than volume. Among the five best, <?php echo esc_html( $top[0]['name'] ); ?> makes <?php echo esc_html( $top[0]['product'] ); ?> worth <?php echo esc_html( $gold( $top[0]['price'] ) ); ?>.</p>
<?php endif; ?>
<p>Each crop has its own page with profit per tile, fertilizer and the other machine. See also <a href="<?php echo esc_url( $guide_url( 'how-many-kegs-do-i-need' ) ); ?>">How many kegs do I need?</a> for how many machines one plant keeps busy, and <a href="<?php echo esc_url( $guide_url( 'best-greenhouse-setup-for-money' ) ); ?>">Best Greenhouse Setup for Money</a> for the keg count that decides the greenhouse crop.</p>

<h2>Related</h2>
<ul class="related-list">
	<li><a href="<?php echo esc_url( $tool_url( 'keg-vs-preserves-jar' ) ); ?>">Keg vs Preserves Jar</a><span>Split a harvest across the machines you own.</span></li>
	<?php if ( $ent_url( 'machines', $other ) ) : ?>
	<li><a href="<?php echo esc_url( $ent_url( 'machines', $other ) ); ?>"><?php echo esc_html( $all['machines'][ $other ]['name'] ); ?></a><span>The same ranking for the other machine.</span></li>
	<?php endif; ?>
	<?php if ( $ent_url( 'crops', '' ) ) : ?>
	<li><a href="<?php echo esc_url( $ent_url( 'crops', '' ) ); ?>">All crops</a><span>Every crop in one table.</span></li>
	<?php endif; ?>
</ul>

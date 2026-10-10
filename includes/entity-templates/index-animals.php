<?php
/**
 * All-animals index.
 *
 * @var array    $all
 * @var callable $tool_url
 * @var callable $guide_url
 * @var callable $gold
 * @var callable $link
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

$rows = $all['animals'];
uasort(
	$rows,
	function ( $a, $b ) {
		return $b['full']['raw'] <=> $a['full']['raw'];
	}
);
$ids = array_keys( $rows );
$top = $rows[ $ids[0] ];
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> there are <?php echo (int) count( $rows ); ?> farm animals. Selling their products raw at full friendship, <?php echo esc_html( $top['name'] ); ?> earns the most at <?php echo esc_html( $gold( $top['full']['raw'] ) ); ?> a day. Made into artisan goods by an Artisan player, the order can change, so both columns are below.</p>
</div>

<h2>Every animal, ranked</h2>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Farm animals at five hearts, best raw income first</caption>
	<thead><tr><th scope="col">Animal</th><th scope="col">Building</th><th scope="col">Price</th><th scope="col">Gold a day, raw</th><th scope="col">Gold a day, artisan goods</th><th scope="col">Pays back in</th></tr></thead>
	<tbody>
	<?php foreach ( $rows as $id => $a ) : ?>
		<tr>
			<th scope="row"><?php echo $link( 'animals', $id, $a['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?></th>
			<td><?php echo esc_html( ucfirst( $a['building'] ) ); ?></td>
			<td><?php echo $a['price'] ? esc_html( $gold( $a['price'] ) ) : '—'; ?></td>
			<td><?php echo esc_html( $gold( $a['full']['raw'] ) ); ?></td>
			<td><?php echo esc_html( $gold( $a['full']['processed'] ) ); ?></td>
			<td><?php echo $a['payback_days'] ? esc_html( number_format( $a['payback_days'] ) ) . ' days' : '—'; ?></td>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>

<h2>Reading the table</h2>
<p>Figures assume five hearts of friendship and maximum happiness, an average day of luck, and no hay costs. Payback is the animal's price divided by its daily income, so it ignores the building and the weeks it takes to reach full friendship. Animals with no price are not sold in a shop. If you are choosing between a coop and a barn first, compare the top row of each building here, then check your own numbers in the <a href="<?php echo esc_url( $tool_url( 'animal-profit-calculator' ) ); ?>">Animal Profit Calculator</a>. For pigs in particular, <a href="<?php echo esc_url( $guide_url( 'are-pigs-worth-it' ) ); ?>">Are pigs worth it?</a> goes through the conditions.</p>

<h2>Related</h2>
<ul class="related-list">
	<li><a href="<?php echo esc_url( $tool_url( 'animal-profit-calculator' ) ); ?>">Animal Profit Calculator</a><span>Hearts, mood and professions.</span></li>
	<li><a href="<?php echo esc_url( $tool_url( 'fish-pond-calculator' ) ); ?>">Fish Pond Calculator</a><span>Another way to earn from a building.</span></li>
</ul>

<?php
/**
 * All-villagers index: a birthday calendar with each villager's own loved gifts.
 *
 * @var array    $all
 * @var callable $tool_url
 * @var callable $link
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

$rows  = $all['villagers'];
$order = array_flip( array( 'spring', 'summer', 'fall', 'winter' ) );
uasort(
	$rows,
	function ( $a, $b ) use ( $order ) {
		return array( $order[ $a['birthday']['season'] ], $a['birthday']['day'] ) <=> array( $order[ $b['birthday']['season'] ], $b['birthday']['day'] );
	}
);
$first   = reset( $rows );
$married = count(
	array_filter(
		$rows,
		function ( $v ) {
			return $v['marriage_candidate'];
		}
	)
);
$uni     = array();
foreach ( $rows as $v ) {
	$uni = array_unique( array_merge( $uni, $v['tastes']['love']['universal'], array_column( $v['not_universal'], 'name' ) ) );
}
sort( $uni );
$finder  = $tool_url( 'gift-finder' );
$p       = $first['points'];
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> Stardew Valley has <?php echo (int) count( $rows ); ?> villagers you can befriend with gifts, <?php echo (int) $married; ?> of them marriage candidates. Almost all of them love <?php echo esc_html( implode( ', ', $uni ) ); ?>, so those are the safest loved gifts; the table below adds each villager's own loved items and birthday. A loved gift is +<?php echo (int) $p['love']; ?> friendship points, and × <?php echo (int) $p['birthday']; ?> on a birthday.</p>
</div>

<h2>Birthdays and loved gifts, in calendar order</h2>
<div class="table-wrap" tabindex="0" role="region" aria-label="<?php echo esc_attr( Stardew_Tools\Entities::TABLE_LABEL ); ?>">
<table class="results-table">
	<caption>Villager birthdays from Spring 1 to Winter 28, with their own loved gifts</caption>
	<thead><tr><th scope="col">Villager</th><th scope="col">Birthday</th><th scope="col">Loves (own list)</th><th scope="col">Marriage</th></tr></thead>
	<tbody>
	<?php foreach ( $rows as $id => $v ) : ?>
		<tr>
			<th scope="row"><?php echo $link( 'villagers', $id, $v['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?></th>
			<td><?php echo esc_html( ucfirst( $v['birthday']['season'] ) . ' ' . (int) $v['birthday']['day'] ); ?></td>
			<td><?php $own_loves = array_merge( $v['tastes']['love']['own'], $v['categories']['love'] ); echo esc_html( $own_loves ? implode( ', ', $own_loves ) : 'Universal loves only' ); ?></td>
			<td><?php echo $v['marriage_candidate'] ? 'Yes' : 'No'; ?></td>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>

<h2>How to use this list</h2>
<p>Check the calendar at the start of each season and note the birthdays. A loved gift on a birthday is worth <?php echo (int) ( $p['love'] * $p['birthday'] ); ?> points, which is more than two hearts at once, so a birthday is the best day to catch up with someone. On other days you can give each villager two gifts a week.</p>
<p>The own-list items are often cooked dishes or gems, which are hard early on. When you have nothing they love, a liked gift (+<?php echo (int) $p['like']; ?>) is worth more than half as much and is usually easy: each villager's page lists them, plus the crops they love or like that you can grow on the farm. Gifts that are hated cost <?php echo (int) abs( $p['hate'] ); ?> points, so check the page before giving anything unusual.</p>
<p>Universal loves are not quite universal. A few villagers have exceptions (for example, someone who hates a Prismatic Shard), and the villager pages call these out.<?php if ( $finder ) : ?> To look up one item instead of one person, use the <a href="<?php echo esc_url( $finder ); ?>">Gift Finder</a>.<?php endif; ?></p>

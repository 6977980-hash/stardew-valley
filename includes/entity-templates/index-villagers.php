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
<?php $chart_u = Stardew_Tools\Entities::chart_url(); ?>
<?php if ( $chart_u ) : ?>
<p>To keep the whole list next to the game, the <a href="<?php echo esc_url( $chart_u ); ?>">Gift Chart</a> puts every villager's loves, hates and a cheap Year 1 birthday crop on one printable page.</p>
<?php endif; ?>
<p>Check the calendar at the start of each season and note the birthdays. A loved gift on a birthday is worth <?php echo (int) ( $p['love'] * $p['birthday'] ); ?> points, which is more than two hearts at once, so a birthday is the best day to catch up with someone. On other days you can give each villager two gifts a week.</p>
<p>The own-list items are often cooked dishes or gems, which are hard early on. When you have nothing they love, a liked gift (+<?php echo (int) $p['like']; ?>) is worth more than half as much and is usually easy: each villager's page lists them, plus the crops they love or like that you can grow on the farm. Gifts that are hated cost <?php echo (int) abs( $p['hate'] ); ?> points, so check the page before giving anything unusual.</p>
<p>Universal loves are not quite universal. A few villagers have exceptions (for example, someone who hates a Prismatic Shard), and the villager pages call these out.<?php if ( $finder ) : ?> To look up one item instead of one person, use the <a href="<?php echo esc_url( $finder ); ?>">Gift Finder</a>.<?php endif; ?></p>

<?php
// The universal lists, once for the whole site: each villager page lists only its own tastes and exceptions.
$uni_lists = array();
foreach ( array( 'love', 'like', 'neutral', 'dislike', 'hate' ) as $taste ) {
	$names  = array();
	$groups = array();
	foreach ( $rows as $v ) {
		$names = array_merge( $names, $v['tastes'][ $taste ]['universal'] );
		foreach ( $v['categories'][ $taste ] as $g ) {
			if ( false !== strpos( $g, '(universal)' ) ) {
				$groups[] = trim( str_replace( '(universal)', '', $g ) );
			}
		}
	}
	$names  = array_unique( $names );
	$groups = array_unique( $groups );
	sort( $names );
	sort( $groups );
	$uni_lists[ $taste ] = array_merge( $groups, $names );
}
$uni_label = array(
	'love'    => 'Universal loves',
	'like'    => 'Universal likes',
	'neutral' => 'Universal neutral',
	'dislike' => 'Universal dislikes',
	'hate'    => 'Universal hates',
);
?>
<h2 id="universal-gifts">Gift rules that apply to every villager</h2>
<p>Each villager page lists only that person's own tastes and where they break the rules below. Everything here is the same for everyone unless a villager page says otherwise.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="<?php echo esc_attr( Stardew_Tools\Entities::TABLE_LABEL ); ?>">
<table class="results-table">
	<caption>Friendship points per gift</caption>
	<thead><tr><th scope="col">Taste</th><th scope="col" class="num">Normal day</th><th scope="col" class="num">Birthday (× <?php echo (int) $p['birthday']; ?>)</th><th scope="col" class="num">Winter Star (× <?php echo (int) $p['winter_star']; ?>)</th></tr></thead>
	<tbody>
	<?php foreach ( array( 'love' => 'Loved', 'like' => 'Liked', 'neutral' => 'Neutral', 'dislike' => 'Disliked', 'hate' => 'Hated' ) as $k => $label ) : ?>
		<tr><th scope="row"><?php echo esc_html( $label ); ?></th><td class="num"><?php echo esc_html( sprintf( '%+d', $p[ $k ] ) ); ?></td><td class="num"><?php echo esc_html( sprintf( '%+d', $p[ $k ] * $p['birthday'] ) ); ?></td><td class="num"><?php echo esc_html( sprintf( '%+d', $p[ $k ] * $p['winter_star'] ) ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p class="table-note">Winter Star counts only for the villager you drew as your secret friend. Quality multiplies loved and liked gifts: silver × <?php echo esc_html( $p['quality']['silver'] ); ?>, gold × <?php echo esc_html( $p['quality']['gold'] ); ?>, iridium × <?php echo esc_html( $p['quality']['iridium'] ); ?>.</p>
<p>One heart is <?php echo (int) $p['per_heart']; ?> points, so 10 hearts is <?php echo esc_html( number_format( 10 * $p['per_heart'] ) ); ?>: <?php echo (int) $p['loves_for_10_hearts']; ?> loved gifts on normal days. You can give each villager two gifts a week plus one on the birthday, so the birthday gift (<?php echo (int) ( $p['love'] * $p['birthday'] ); ?> points) is the biggest single jump. Talking every day adds a little, and points slowly drop if you ignore someone. Marriage candidates stop at 8 hearts until you give a Bouquet.</p>
<?php foreach ( $uni_lists as $taste => $names ) : ?>
	<?php if ( $names ) : ?>
<p><strong><?php echo esc_html( $uni_label[ $taste ] ); ?>:</strong> <?php echo esc_html( implode( ', ', $names ) ); ?>.</p>
	<?php endif; ?>
<?php endforeach; ?>

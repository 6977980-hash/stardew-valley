<?php
/**
 * Villager page: birthday and every gift taste, from data/gifts.json via data/entities.json.
 *
 * @var array    $e        Villager record from data/entities.json.
 * @var array    $all      The whole entities file.
 * @var callable $tool_url Tool permalink.
 * @var callable $ent_url  Entity permalink.
 * @var callable $link     Link to an entity page.
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

$t        = $e['tastes'];
$p        = $e['points'];
$season   = ucfirst( $e['birthday']['season'] );
$bday     = $season . ' ' . (int) $e['birthday']['day'];
$finder   = $tool_url( 'gift-finder' );
$finder_v = $finder ? add_query_arg( 'villager', $e['id'], $finder ) : '';
$list     = function ( $names ) {
	if ( count( $names ) < 2 ) {
		return implode( '', $names );
	}
	return implode( ', ', array_slice( $names, 0, -1 ) ) . ' and ' . end( $names );
};
// Crop names link to their crop page.
$crop_ids = array();
foreach ( $all['crops'] as $cid => $c ) {
	$crop_ids[ $c['name'] ] = $cid;
}
$items = function ( $names ) use ( $crop_ids, $link ) {
	return implode(
		', ',
		array_map(
			function ( $n ) use ( $crop_ids, $link ) {
				return isset( $crop_ids[ $n ] ) ? $link( 'crops', $crop_ids[ $n ], $n ) : esc_html( $n );
			},
			$names
		)
	);
};
$loved_crop = null;
$liked_crop = null;
foreach ( $e['growable'] as $g ) {
	if ( 'love' === $g['taste'] && ! $loved_crop ) {
		$loved_crop = $g;
	}
	if ( 'like' === $g['taste'] && ! $liked_crop ) {
		$liked_crop = $g;
	}
}
$word  = array(
	'love'    => 'loved',
	'like'    => 'liked',
	'neutral' => 'neutral',
	'dislike' => 'disliked',
	'hate'    => 'hated',
);
$easy  = $loved_crop ? $loved_crop : $liked_crop;
$own   = $t['love']['own'];
$loves = count( $own ) + count( $t['love']['universal'] );
$likes = count( $t['like']['own'] ) + count( $t['like']['universal'] );
$hates = count( $t['hate']['own'] ) + count( $t['hate']['universal'] );
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> <?php echo esc_html( $e['name'] ); ?> loves <?php echo $own ? esc_html( $list( $own ) ) : 'only the universal loves'; ?><?php echo $own && $t['love']['universal'] ? ', plus the gifts almost everyone loves (' . esc_html( $list( $t['love']['universal'] ) ) . ')' : ''; ?>. <?php echo esc_html( $e['name'] ); ?>'s birthday is <strong><?php echo esc_html( $bday ); ?></strong>, when a loved gift is worth <?php echo (int) ( $p['love'] * $p['birthday'] ); ?> friendship points instead of <?php echo (int) $p['love']; ?>.<?php if ( $easy ) : ?> The easiest <?php echo 'love' === $easy['taste'] ? 'loved' : 'liked'; ?> gift to grow is <?php echo $link( 'crops', $easy['id'], $easy['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?> (<?php echo esc_html( implode( ', ', array_map( 'ucfirst', $easy['seasons'] ) ) ); ?>).<?php endif; ?></p>
</div>

<h2>Quick facts</h2>
<ul>
	<li><strong>Birthday:</strong> <?php echo esc_html( $bday ); ?>.</li>
	<li><strong>Marriage:</strong> <?php echo $e['marriage_candidate'] ? 'yes, ' . esc_html( $e['name'] ) . ' can be dated and married.' : 'no, ' . esc_html( $e['name'] ) . ' is not a marriage candidate.'; ?></li>
	<li><strong>Gifts by name:</strong> <?php echo (int) $loves; ?> loved, <?php echo (int) $likes; ?> liked and <?php echo (int) $hates; ?> hated items, counting the universal lists.</li>
	<li><strong>Points per gift:</strong> loved +<?php echo (int) $p['love']; ?>, liked +<?php echo (int) $p['like']; ?>, neutral +<?php echo (int) $p['neutral']; ?>, disliked <?php echo (int) $p['dislike']; ?>, hated <?php echo (int) $p['hate']; ?>. One heart is <?php echo (int) $p['per_heart']; ?> points.</li>
</ul>

<h2>What <?php echo esc_html( $e['name'] ); ?> loves</h2>
<div class="table-wrap" tabindex="0" role="region" aria-label="<?php echo esc_attr( Stardew_Tools\Entities::TABLE_LABEL ); ?>">
<table class="results-table">
	<caption>Loved gifts for <?php echo esc_html( $e['name'] ); ?></caption>
	<thead><tr><th scope="col">Gift</th><th scope="col">Listed as</th><th scope="col" class="num">Points</th><th scope="col" class="num">On the birthday</th></tr></thead>
	<tbody>
	<?php foreach ( array( 'own', 'universal' ) as $kind ) : ?>
		<?php foreach ( $t['love'][ $kind ] as $n ) : ?>
		<tr><th scope="row"><?php echo $items( array( $n ) ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $items. ?></th><td><?php echo 'own' === $kind ? esc_html( $e['name'] . "'s own list" ) : 'Universal love'; ?></td><td class="num">+<?php echo (int) $p['love']; ?></td><td class="num">+<?php echo (int) ( $p['love'] * $p['birthday'] ); ?></td></tr>
		<?php endforeach; ?>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<?php if ( $e['categories']['love'] ) : ?>
<p><?php echo esc_html( $e['name'] ); ?> also loves whole groups of items: <?php echo esc_html( implode( '; ', $e['categories']['love'] ) ); ?>.</p>
<?php endif; ?>
<?php if ( $e['not_universal'] ) : ?>
<p>Careful with the universal loves: <?php echo esc_html( $e['name'] ); ?> is an exception for <?php echo esc_html( $list( array_map( function ( $x ) use ( $word ) { return $x['name'] . ( $x['taste'] ? ' (' . $word[ $x['taste'] ] . ')' : '' ); }, $e['not_universal'] ) ) ); ?>.</p>
<?php endif; ?>
<p>Quality makes loved and liked gifts worth more: silver × <?php echo esc_html( $p['quality']['silver'] ); ?>, gold × <?php echo esc_html( $p['quality']['gold'] ); ?> and iridium × <?php echo esc_html( $p['quality']['iridium'] ); ?>. A gift at the Feast of the Winter Star counts × <?php echo (int) $p['winter_star']; ?> if you drew <?php echo esc_html( $e['name'] ); ?> as your secret friend.</p>

<h2>What <?php echo esc_html( $e['name'] ); ?> likes</h2>
<p><?php echo esc_html( $e['name'] ); ?> likes <?php echo $t['like']['own'] ? $items( $t['like']['own'] ) : 'nothing by name'; // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $items. ?>. The universal likes that also count: <?php echo $t['like']['universal'] ? $items( $t['like']['universal'] ) : 'none'; // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $items. ?>. Each liked gift is +<?php echo (int) $p['like']; ?> points, a bit more than half a loved one, and usually much easier to find.<?php echo $e['categories']['like'] ? ' Groups: ' . esc_html( implode( '; ', $e['categories']['like'] ) ) . '.' : ''; ?></p>

<?php if ( $e['growable'] ) : ?>
<h2>Gifts for <?php echo esc_html( $e['name'] ); ?> you can grow</h2>
<p>These are crops on the farm that <?php echo esc_html( $e['name'] ); ?> loves or likes, so you can plant them ahead of the birthday:</p>
<ul>
	<?php foreach ( $e['growable'] as $g ) : ?>
	<li><?php echo $link( 'crops', $g['id'], $g['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?>: <?php echo 'love' === $g['taste'] ? 'loved' : 'liked'; ?>, grows in <?php echo esc_html( implode( ', ', array_map( 'ucfirst', $g['seasons'] ) ) ); ?>.</li>
	<?php endforeach; ?>
</ul>
<?php endif; ?>

<h2>Gifts to avoid</h2>
<p><?php echo esc_html( $e['name'] ); ?> hates <?php echo $t['hate']['own'] ? $items( $t['hate']['own'] ) : 'nothing on a personal list'; // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $items. ?>, and <?php echo (int) count( $t['hate']['universal'] ); ?> items almost everyone hates, such as <?php echo esc_html( $list( array_slice( $t['hate']['universal'], 0, 5 ) ) ); ?>. A hated gift costs <?php echo (int) abs( $p['hate'] ); ?> points, twice the loss of a disliked one.<?php echo $e['categories']['hate'] ? ' Hated groups: ' . esc_html( implode( '; ', $e['categories']['hate'] ) ) . '.' : ''; ?></p>
<p>Disliked (<?php echo (int) $p['dislike']; ?> points): <?php echo $t['dislike']['own'] ? $items( $t['dislike']['own'] ) : 'nothing by name'; // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $items. ?><?php echo $e['categories']['dislike'] ? ', and ' . esc_html( implode( '; ', $e['categories']['dislike'] ) ) : ''; ?>.</p>
<p>Neutral (+<?php echo (int) $p['neutral']; ?> points): <?php echo $t['neutral']['own'] ? $items( $t['neutral']['own'] ) : 'nothing by name'; // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $items. ?><?php echo $e['categories']['neutral'] ? ', and ' . esc_html( implode( '; ', $e['categories']['neutral'] ) ) : ''; ?>. A neutral gift still helps, but only a quarter as much as a loved one.</p>

<h2>How many gifts to reach 10 hearts</h2>
<p>Ten hearts is <?php echo esc_html( number_format( 10 * $p['per_heart'] ) ); ?> friendship points. With loved gifts alone that is <?php echo (int) $p['loves_for_10_hearts']; ?> gifts on normal days. You can give each villager two gifts a week plus one on the birthday, so a birthday gift is the fastest single jump: <?php echo (int) ( $p['love'] * $p['birthday'] ); ?> points, <?php echo esc_html( number_format( $p['love'] * $p['birthday'] / $p['per_heart'], 1 ) ); ?> hearts in one day. Talking every day adds a little more, and points slowly drop if you ignore <?php echo esc_html( $e['name'] ); ?> for a while.<?php if ( $e['marriage_candidate'] ) : ?> As a marriage candidate, <?php echo esc_html( $e['name'] ); ?> stops at 8 hearts (<?php echo esc_html( number_format( 8 * $p['per_heart'] ) ); ?> points) until you give a Bouquet, so gifts beyond that are wasted until then; the last two hearts come after the Bouquet.<?php endif; ?></p>
<?php if ( $finder_v ) : ?>
<p>To check any single item, open the <a href="<?php echo esc_url( $finder_v ); ?>">Gift Finder for <?php echo esc_html( $e['name'] ); ?></a>: it shows the points for each quality and day.</p>
<?php endif; ?>

<?php if ( $e['birthday_neighbours'] ) : ?>
<h2>Other birthdays in <?php echo esc_html( $season ); ?></h2>
<p>Plan gifts for the whole season at once:
<?php
echo implode(
	', ',
	array_map(
		function ( $o ) use ( $link, $season ) {
			return $link( 'villagers', $o['id'], $o['name'] ) . ' (' . esc_html( $season . ' ' . (int) $o['day'] ) . ')';
		},
		$e['birthday_neighbours']
	)
); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link.
?>.</p>
<?php endif; ?>

<h2>Related</h2>
<ul class="related-list">
	<?php if ( $finder ) : ?>
	<li><a href="<?php echo esc_url( $finder ); ?>">Gift Finder</a><span>Who loves any item, and the points for each gift.</span></li>
	<?php endif; ?>
	<?php if ( $ent_url( 'villagers', '' ) ) : ?>
	<li><a href="<?php echo esc_url( $ent_url( 'villagers', '' ) ); ?>">All villagers</a><span>Every birthday and loved gift in one table.</span></li>
	<?php endif; ?>
	<?php if ( $ent_url( 'crops', '' ) ) : ?>
	<li><a href="<?php echo esc_url( $ent_url( 'crops', '' ) ); ?>">All crops</a><span>Each crop's page lists who loves it.</span></li>
	<?php endif; ?>
</ul>

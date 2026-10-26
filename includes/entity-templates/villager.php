<?php
/**
 * Villager page: birthday and every gift taste, from data/gifts.json via data/entities.json.
 *
 * Only what is true for this villager is spelled out here: own gift lists, exceptions to the
 * universal lists, who shares each loved gift, and a birthday plan from the crop data. The
 * universal lists and the friendship point rules are the same for everyone, so they live once
 * on the All Villagers page and are linked from here.
 *
 * @var array    $e        Villager record from data/entities.json.
 * @var array    $all      The whole entities file.
 * @var callable $tool_url Tool permalink.
 * @var callable $ent_url  Entity permalink.
 * @var callable $link     Link to an entity page.
 * @var callable $gold     Formats gold.
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

$t        = $e['tastes'];
$p        = $e['points'];
$name     = $e['name'];
$b_season = $e['birthday']['season'];
$b_day    = (int) $e['birthday']['day'];
$season   = ucfirst( $b_season );
$bday     = $season . ' ' . $b_day;
$weekdays = array( 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday' );
$weekday  = $weekdays[ ( $b_day - 1 ) % 7 ];
$finder   = $tool_url( 'gift-finder' );
$finder_v = $finder ? add_query_arg( 'villager', $e['id'], $finder ) : '';
$index    = $ent_url( 'villagers', '' );
$rules    = $index ? $index . '#universal-gifts' : '';
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
$item  = function ( $n ) use ( $crop_ids, $link ) {
	return isset( $crop_ids[ $n ] ) ? $link( 'crops', $crop_ids[ $n ], $n ) : esc_html( $n );
};
$items = function ( $names ) use ( $item, $list ) {
	return $list( array_map( $item, $names ) );
};
$word  = array(
	'love'    => 'loves',
	'like'    => 'likes',
	'neutral' => 'is neutral about',
	'dislike' => 'dislikes',
	'hate'    => 'hates',
);
// Group lists marked "(universal)" are the same for almost everyone; the rest are this villager's own.
$own_groups = function ( $taste ) use ( $e ) {
	return array_values(
		array_filter(
			$e['categories'][ $taste ],
			function ( $g ) {
				return false === strpos( $g, '(universal)' );
			}
		)
	);
};

// Who else has each of this villager's loved gifts on their own list.
$shared = array();
foreach ( $t['love']['own'] as $n ) {
	$shared[ $n ] = array();
	foreach ( $all['villagers'] as $vid => $v ) {
		if ( $vid !== $e['id'] && in_array( $n, $v['tastes']['love']['own'], true ) ) {
			$shared[ $n ][] = $link( 'villagers', $vid, $v['name'] );
		}
	}
}

// Exceptions to the universal lists: items most villagers treat one way and this villager another.
$tastes     = array( 'love', 'like', 'neutral', 'dislike', 'hate' );
$exceptions = array();
foreach ( $tastes as $uni_taste ) {
	$everyone = array();
	foreach ( $all['villagers'] as $v ) {
		$everyone = array_merge( $everyone, $v['tastes'][ $uni_taste ]['universal'] );
	}
	foreach ( array_unique( $everyone ) as $n ) {
		if ( in_array( $n, $t[ $uni_taste ]['universal'], true ) ) {
			continue;
		}
		foreach ( $tastes as $real ) {
			if ( $real !== $uni_taste && ( in_array( $n, $t[ $real ]['own'], true ) || in_array( $n, $t[ $real ]['universal'], true ) ) ) {
				$exceptions[] = array(
					'name' => $n,
					'is'   => $real,
					'was'  => $uni_taste,
				);
			}
		}
	}
}

// Every crop this villager loves or likes, by name or through a group such as All Vegetables.
$year_one  = Stardew_Tools\Data::get( 'year-one' );
$year_two  = $year_one ? array_column( $year_one['pierre_year2_seeds'], 'crop' ) : array();
$order     = array( 'spring', 'summer', 'fall', 'winter' );
$gift_crop = array();
foreach ( $all['crops'] as $cid => $c ) {
	$g = isset( $c['uses']['gifts'] ) ? $c['uses']['gifts'] : null;
	if ( ! $g || ! empty( $c['indoor_only'] ) ) {
		continue;
	}
	$taste = in_array( $name, $g['love'], true ) ? 'love' : ( in_array( $name, $g['like'], true ) ? 'like' : '' );
	if ( ! $taste ) {
		continue;
	}
	$seed = array_filter(
		array_intersect_key( $c['seed_prices'], array_flip( array( 'pierre', 'jojamart' ) ) ),
		function ( $v ) {
			return $v > 0;
		}
	);
	$gift_crop[ $cid ] = array(
		'id'     => $cid,
		'name'   => $c['name'],
		'taste'  => $taste,
		'c'      => $c,
		'seed'   => $seed ? min( $seed ) : null,
		'year'   => in_array( $cid, $year_two, true ) ? 2 : 1,
		'price'  => (int) $c['base_price'],
	);
}
// Crops grown from shop seeds in the birthday season that are ready by the birthday.
$plan = array();
foreach ( $gift_crop as $gc ) {
	if ( null !== $gc['seed'] && in_array( $b_season, $gc['c']['seasons'], true ) && $b_day - (int) $gc['c']['growth_days'] >= 1 ) {
		$plan[] = $gc + array( 'by' => $b_day - (int) $gc['c']['growth_days'] );
	}
}
usort(
	$plan,
	function ( $a, $b ) {
		return array( 'love' === $a['taste'] ? 0 : 1, $a['year'], $a['price'] ) <=> array( 'love' === $b['taste'] ? 0 : 1, $b['year'], $b['price'] );
	}
);
// Without one, a crop from the last growing season before the birthday, kept in a chest.
$keep = array();
if ( ! $plan ) {
	$i = array_search( $b_season, $order, true );
	do {
		$i = ( $i + 3 ) % 4;
	} while ( 'winter' === $order[ $i ] );
	foreach ( $gift_crop as $gc ) {
		if ( null !== $gc['seed'] && in_array( $order[ $i ], $gc['c']['seasons'], true ) ) {
			$keep[] = $gc;
		}
	}
	usort(
		$keep,
		function ( $a, $b ) {
			return array( 'love' === $a['taste'] ? 0 : 1, $a['year'], $a['price'] ) <=> array( 'love' === $b['taste'] ? 0 : 1, $b['year'], $b['price'] );
		}
	);
	$keep_season = ucfirst( $order[ $i ] );
}
$loved_crops = array_filter(
	$gift_crop,
	function ( $gc ) {
		return 'love' === $gc['taste'];
	}
);

$own       = $t['love']['own'];
$love_grp  = $own_groups( 'love' );
$like_grp  = $own_groups( 'like' );
$first     = $plan ? $plan[0] : ( $keep ? $keep[0] : null );
$bday_love = (int) ( $p['love'] * $p['birthday'] );
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> <?php echo esc_html( $name ); ?> loves <?php echo $own ? esc_html( $list( array_merge( $own, $love_grp ) ) ) : ( $love_grp ? esc_html( $list( $love_grp ) ) : 'only the universal loves' ); ?><?php echo $own || $love_grp ? ', plus universal loves such as ' . esc_html( in_array( 'Prismatic Shard', $t['love']['universal'], true ) ? 'a Prismatic Shard' : reset( $t['love']['universal'] ) ) : ''; ?>. <?php echo esc_html( $name ); ?>'s birthday is <strong><?php echo esc_html( $bday ); ?></strong> (a <?php echo esc_html( $weekday ); ?>), when a loved gift is worth <?php echo (int) $bday_love; ?> friendship points instead of <?php echo (int) $p['love']; ?>.<?php if ( $first ) : ?> The cheapest <?php echo 'love' === $first['taste'] ? 'loved' : 'liked'; ?> gift you can grow for <?php echo esc_html( $name ); ?> is <?php echo $link( 'crops', $first['id'], $first['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?><?php echo $plan ? ': plant it by ' . esc_html( $season . ' ' . $first['by'] ) : ', grown in ' . esc_html( $keep_season ) . ' and kept until then'; ?>.<?php endif; ?></p>
</div>

<h2>Quick facts</h2>
<ul>
	<li><strong>Birthday:</strong> <?php echo esc_html( $bday ); ?>, a <?php echo esc_html( $weekday ); ?>.</li>
	<li><strong>Marriage:</strong>
	<?php if ( $e['marriage_candidate'] ) : ?>
		yes. Friendship stops at 8 hearts (<?php echo esc_html( number_format( 8 * $p['per_heart'] ) ); ?> points) until you give <?php echo esc_html( $name ); ?> a Bouquet, so extra gifts before that are wasted.
	<?php else : ?>
		no, but friendship still goes up to 10 hearts.
	<?php endif; ?></li>
	<li><strong>Own gift lists:</strong> <?php echo (int) count( $own ); ?> loved, <?php echo (int) count( $t['like']['own'] ); ?> liked and <?php echo (int) count( $t['hate']['own'] ); ?> hated by name<?php echo $exceptions ? ', and ' . (int) count( $exceptions ) . ( 1 === count( $exceptions ) ? ' exception' : ' exceptions' ) . ' to the universal lists' : ''; ?>.</li>
	<?php if ( $gift_crop ) : ?>
	<li><strong>Crops to grow for <?php echo esc_html( $name ); ?>:</strong> <?php echo $loved_crops ? (int) count( $loved_crops ) . ' loved and ' : ''; ?><?php echo (int) ( count( $gift_crop ) - count( $loved_crops ) ); ?> liked.</li>
	<?php endif; ?>
</ul>

<h2>What <?php echo esc_html( $name ); ?> loves</h2>
<?php if ( $own ) : ?>
<div class="table-wrap" tabindex="0" role="region" aria-label="<?php echo esc_attr( Stardew_Tools\Entities::TABLE_LABEL ); ?>">
<table class="results-table">
	<caption><?php echo esc_html( $name ); ?>'s own loved gifts (+<?php echo (int) $p['love']; ?>, or +<?php echo (int) $bday_love; ?> on <?php echo esc_html( $bday ); ?>)</caption>
	<thead><tr><th scope="col">Gift</th><th scope="col">Also loved by</th></tr></thead>
	<tbody>
	<?php foreach ( $own as $n ) : ?>
		<tr><th scope="row"><?php echo $item( $n ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $item. ?></th><td><?php echo $shared[ $n ] ? implode( ', ', $shared[ $n ] ) : 'Nobody else'; // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
	<?php
	$unique = array_keys(
		array_filter(
			$shared,
			function ( $s ) {
				return ! $s;
			}
		)
	);
	?>
	<?php if ( $unique && count( $unique ) < count( $own ) ) : ?>
<p>Only <?php echo esc_html( $name ); ?> loves <?php echo $items( $unique ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $items. ?>.</p>
	<?php endif; ?>
<?php else : ?>
<p><?php echo esc_html( $name ); ?> has no loved gifts of their own<?php echo $love_grp ? ' apart from ' . esc_html( $list( $love_grp ) ) : ''; ?>, so the universal loves are the only loved gifts.</p>
<?php endif; ?>
<?php if ( $own && $love_grp ) : ?>
<p><?php echo esc_html( $name ); ?> also loves whole groups: <?php echo esc_html( implode( '; ', $love_grp ) ); ?>.</p>
<?php endif; ?>
<p>The universal loves count too: <?php echo $items( $t['love']['universal'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $items. ?>.<?php echo $rules ? ' What "universal" means and the points for each kind of gift: <a href="' . esc_url( $rules ) . '">gift rules for every villager</a>.' : ''; ?></p>

<h2>What <?php echo esc_html( $name ); ?> likes</h2>
<p><?php echo esc_html( $name ); ?> likes <?php echo $t['like']['own'] ? $items( $t['like']['own'] ) : 'nothing by name'; // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $items. ?><?php echo $like_grp ? ', and ' . esc_html( implode( '; ', $like_grp ) ) : ''; ?>. A liked gift (+<?php echo (int) $p['like']; ?>) is the easy fallback when you have nothing loved<?php echo $gift_crop ? ': ' . (int) ( count( $gift_crop ) - count( $loved_crops ) ) . ' crops count as liked for ' . esc_html( $name ) : ''; ?>.</p>

<h2>Birthday gift plan for <?php echo esc_html( $bday ); ?></h2>
<?php if ( $plan ) : ?>
<p>These <?php echo 'love' === $plan[0]['taste'] ? 'loved and liked' : 'liked'; ?> crops grow from shop seeds in <?php echo esc_html( $season ); ?> and are ready on <?php echo esc_html( $bday ); ?> if you plant them by the day shown, at normal growth speed. Cheapest to give first: the sell price is the gold you give up.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="<?php echo esc_attr( Stardew_Tools\Entities::TABLE_LABEL ); ?>">
<table class="results-table">
	<caption>Crops for <?php echo esc_html( $name ); ?>'s birthday, loved first</caption>
	<thead><tr><th scope="col">Crop</th><th scope="col">Taste</th><th scope="col">Plant by</th><th scope="col" class="num">Seeds</th><th scope="col" class="num">Sells for</th></tr></thead>
	<tbody>
	<?php foreach ( array_slice( $plan, 0, 5 ) as $gc ) : ?>
		<tr><th scope="row"><?php echo $link( 'crops', $gc['id'], $gc['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?></th><td><?php echo 'love' === $gc['taste'] ? 'Loved' : 'Liked'; ?></td><td><?php echo esc_html( $season . ' ' . $gc['by'] ); ?><?php echo 2 === $gc['year'] ? ' <small>(seeds from Year 2)</small>' : ''; ?></td><td class="num"><?php echo esc_html( $gold( $gc['seed'] ) ); ?></td><td class="num"><?php echo esc_html( $gold( $gc['price'] ) ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<?php elseif ( $keep ) : ?>
<p>Nothing from shop seeds is ready in <?php echo esc_html( $season ); ?> by day <?php echo (int) $b_day; ?>, so grow the gift in <?php echo esc_html( $keep_season ); ?> and keep it in a chest: crops never spoil. Cheapest choices: <?php echo $list( array_map( function ( $gc ) use ( $link, $gold ) { return $link( 'crops', $gc['id'], $gc['name'] ) . ' (' . ( 'love' === $gc['taste'] ? 'loved' : 'liked' ) . ', sells for ' . esc_html( $gold( $gc['price'] ) ) . ')'; }, array_slice( $keep, 0, 3 ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?>.</p>
<?php else : ?>
<p>No crop is a loved or liked gift for <?php echo esc_html( $name ); ?>, so the birthday gift has to come from the lists above: cook, mine or fish for it ahead of <?php echo esc_html( $bday ); ?>.</p>
<?php endif; ?>
<?php if ( $loved_crops && ! array_filter( $plan, function ( $gc ) { return 'love' === $gc['taste']; } ) ) : ?>
<p>The loved <?php echo 1 === count( $loved_crops ) ? 'crop' : 'crops'; ?> (<?php echo $list( array_map( function ( $gc ) use ( $link ) { return $link( 'crops', $gc['id'], $gc['name'] ); }, $loved_crops ) ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?>) <?php $lc_seasons = array_unique( array_merge( ...array_map( function ( $gc ) { return $gc['c']['seasons']; }, array_values( $loved_crops ) ) ) ); ?>can't be grown from seed by <?php echo esc_html( $bday ); ?>; <?php echo in_array( $b_season, $lc_seasons, true ) ? 'grow one the year before' : 'harvest one in ' . esc_html( implode( ' or ', array_map( 'ucfirst', $lc_seasons ) ) ); ?> and keep it in a chest, since crops never spoil.</p>
<?php endif; ?>
<?php if ( $e['birthday_neighbours'] ) : ?>
<p>Other <?php echo esc_html( $season ); ?> birthdays, so one trip can cover several:
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

<h2>Gifts to avoid</h2>
<p><?php echo esc_html( $name ); ?> hates <?php echo $t['hate']['own'] ? $items( $t['hate']['own'] ) : 'nothing on a personal list'; // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $items. ?><?php echo $own_groups( 'hate' ) ? ', and ' . esc_html( implode( '; ', $own_groups( 'hate' ) ) ) : ''; ?> (<?php echo (int) $p['hate']; ?> each), and dislikes <?php echo $t['dislike']['own'] ? $items( $t['dislike']['own'] ) : 'nothing by name'; // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $items. ?><?php echo $own_groups( 'dislike' ) ? ', and ' . esc_html( implode( '; ', $own_groups( 'dislike' ) ) ) : ''; ?> (<?php echo (int) $p['dislike']; ?>). On top of that come the universal hates, such as trash and bait.</p>
<?php if ( $t['neutral']['own'] || $own_groups( 'neutral' ) ) : ?>
<p>Neutral (+<?php echo (int) $p['neutral']; ?>) for <?php echo esc_html( $name ); ?>: <?php echo $items( $t['neutral']['own'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $items. ?><?php echo $own_groups( 'neutral' ) ? ( $t['neutral']['own'] ? ', and ' : '' ) . esc_html( implode( '; ', $own_groups( 'neutral' ) ) ) : ''; ?>.</p>
<?php endif; ?>

<?php if ( $exceptions ) : ?>
<h2>Where <?php echo esc_html( $name ); ?> breaks the universal rules</h2>
<p>These items are universal for most villagers, but not for <?php echo esc_html( $name ); ?>:</p>
<ul>
	<?php foreach ( $exceptions as $x ) : ?>
	<li><?php echo $item( $x['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $item. ?>: <?php echo esc_html( $name . ' ' . $word[ $x['is'] ] . ' it' ); ?>, though most villagers <?php echo esc_html( 'neutral' === $x['was'] ? 'are neutral about it' : rtrim( $word[ $x['was'] ], 's' ) . ' it' ); ?>.</li>
	<?php endforeach; ?>
</ul>
<?php endif; ?>

<?php if ( $finder_v ) : ?>
<p>To check any single item, with the points for each quality and day, open the <a href="<?php echo esc_url( $finder_v ); ?>">Gift Finder for <?php echo esc_html( $name ); ?></a>.</p>
<?php endif; ?>

<h2>Related</h2>
<ul class="related-list">
	<?php if ( $finder ) : ?>
	<li><a href="<?php echo esc_url( $finder ); ?>">Gift Finder</a><span>Who loves any item.</span></li>
	<?php endif; ?>
	<?php if ( $index ) : ?>
	<li><a href="<?php echo esc_url( $index ); ?>">All villagers</a><span>Birthday calendar and gift rules.</span></li>
	<?php endif; ?>
</ul>

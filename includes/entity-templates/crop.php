<?php
/**
 * Crop page.
 *
 * @var array    $e        Crop record from data/entities.json.
 * @var array    $all      The whole entities file.
 * @var callable $tool_url Tool permalink.
 * @var callable $ent_url  Entity permalink: ( type, id ).
 * @var callable $gold     Formats gold.
 * @var callable $link     Link to an entity page: ( type, id, text ).
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

$best = null;
foreach ( $e['plantings'] as $p ) {
	if ( ! $best || $p['profit']['level6'] > $best['profit']['level6'] ) {
		$best = $p;
	}
}
$indoor    = ! $best;
$seasons   = implode( ', ', array_map( 'ucfirst', $e['seasons'] ) );
$regrows   = ! empty( $e['regrow_days'] );
$every     = function ( $d ) {
	return 1 === (int) $d ? 'every day' : 'every ' . (int) $d . ' days';
};
$cat_names = array(
	'fruit'     => 'fruit',
	'vegetable' => 'vegetable',
	'flower'    => 'flower',
);
$category  = isset( $cat_names[ $e['category'] ] ) ? $cat_names[ $e['category'] ] : 'crop';
$rank      = $best ? $best['rank'] : null;
$of        = $best ? $best['of'] : 0;
$tier      = '';
if ( $rank && $of > 3 ) {
	$tier = $rank <= 3 ? 'one of the best' : ( $rank <= ceil( $of / 3 ) ? 'above average' : ( $rank > floor( 2 * $of / 3 ) ? 'one of the weaker' : 'middle-of-the-pack' ) );
}
$season_list = function ( $list ) {
	$list = array_map( 'ucfirst', $list );
	return count( $list ) > 1 ? implode( ', ', array_slice( $list, 0, -1 ) ) . ' and ' . end( $list ) : implode( '', $list );
};
$shops     = array(
	'pierre'         => "Pierre's",
	'jojamart'       => 'JojaMart',
	'oasis'          => 'the Oasis',
	'krobus'         => 'Krobus',
	'traveling'      => 'the Traveling Cart',
	'traveling_cart' => 'the Traveling Cart',
	'egg_festival'   => 'the Egg Festival (Spring 13)',
);
$shop_name = function ( $s ) use ( $shops ) {
	return isset( $shops[ $s ] ) ? $shops[ $s ] : ucwords( str_replace( array( '-', '_' ), ' ', $s ) );
};
// When each seller has the seeds: Pierre's and JojaMart stock them only while the crop is in season.
$shop_when  = array(
	'pierre'   => 'in season',
	'jojamart' => 'in season',
	'oasis'    => 'in the Calico Desert, once the bus is repaired',
);
$seed_parts = array();
foreach ( $e['seed_prices'] as $shop => $price ) {
	if ( $price > 0 ) {
		$seed_parts[] = $gold( $price ) . ' at ' . $shop_name( $shop ) . ( isset( $shop_when[ $shop ] ) ? ' (' . $shop_when[ $shop ] . ')' : '' );
	}
}
$n2        = function ( $v ) {
	return rtrim( rtrim( number_format( (float) $v, 2 ), '0' ), '.' );
};
$kegs      = null;
$jars      = null;
foreach ( $e['machine_gain'] as $m ) {
	if ( 'Keg' === $m['machine'] ) {
		$kegs = $m;
	}
	if ( 'Preserves Jar' === $m['machine'] ) {
		$jars = $m;
	}
}
$best_machine = null;
foreach ( $e['machine_gain'] as $m ) {
	if ( ! $best_machine || $m['gain_per_machine_day'] > $best_machine['gain_per_machine_day'] ) {
		$best_machine = $m;
	}
}
$fert_names = array(
	'basic-fertilizer'   => 'Basic Fertilizer',
	'quality-fertilizer' => 'Quality Fertilizer',
	'speed-gro'          => 'Speed-Gro',
	'deluxe-speed-gro'   => 'Deluxe Speed-Gro',
);
$calc_url = $tool_url( 'crop-profit-calculator' );
$how_url  = $ent_url( 'crops', '' ) ? $ent_url( 'crops', '' ) . '#how-we-count' : '';
// What sets this crop apart, in one sentence built from its own facts.
$trait_parts = array();
if ( $regrows ) {
	$trait_parts[] = 'keeps producing ' . $every( $e['regrow_days'] ) . ' after the first harvest';
} elseif ( ! empty( $e['returns_seeds'] ) ) {
	$trait_parts[] = 'drops its own seeds, so you buy them once';
} else {
	$trait_parts[] = 'has to be replanted after every harvest';
}
if ( $e['trellis'] ) {
	$trait_parts[] = 'grows on a trellis that blocks your path';
}
if ( ! empty( $e['giant'] ) ) {
	$trait_parts[] = 'can merge into a giant crop when planted in a 3×3 square';
}
if ( $e['items_per_harvest']['level10'] > 1.05 ) {
	$trait_parts[] = 'gives about ' . $n2( $e['items_per_harvest']['level10'] ) . ' items a harvest at level 10';
}
if ( $best_machine ) {
	$trait_parts[] = 'is worth most as ' . $best_machine['product'] . ' from a ' . $best_machine['machine'];
}
$last_trait = array_pop( $trait_parts );
$traits     = $e['name'] . ' ' . ( $trait_parts ? implode( ', ', $trait_parts ) . ' and ' : '' ) . $last_trait . '.';
// Average gold for one item sold raw at each quality-chance level (no fertilizer).
$avg_price = array();
foreach ( $e['quality'] as $q ) {
	$sum = 0;
	foreach ( $q['chances'] as $qk => $pct ) {
		$sum += $pct / 100 * $e['prices'][ $qk ];
	}
	$avg_price[ (int) $q['level'] ] = $sum;
}
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> <?php echo esc_html( $e['name'] ); ?> is <?php echo $indoor ? 'an indoor ' . esc_html( $category ) : 'a ' . esc_html( $seasons ) . ' ' . esc_html( $category ); ?> that takes <?php echo (int) $e['growth_days']; ?> days to grow<?php echo $regrows ? ' and then gives a harvest ' . esc_html( $every( $e['regrow_days'] ) ) : ''; ?>. It sells for <?php echo esc_html( $gold( $e['base_price'] ) ); ?>.
	<?php if ( $indoor ) : ?>
	It can't be planted in the farm's outdoor fields, so it has no season ranking: grow it in the greenhouse or in Garden Pots indoors, where it makes about <?php echo esc_html( $gold( $e['greenhouse']['established'] ) ); ?> a tile over a 112-day year once established, at farming level 6.
	<?php else : ?>
	Planted on day 1 of <?php echo esc_html( ucfirst( $best['season'] ) ); ?> at farming level 6 it makes about <?php echo esc_html( $gold( $best['profit']['level6'] ) ); ?> per tile<?php echo null !== $best['seed_cost'] ? ' after seeds' : ' (no seed cost counted, since no shop sells the seeds)'; ?><?php echo $best['carries_into'] ? ', counting the harvests it keeps giving in ' . esc_html( $season_list( $best['carries_into'] ) ) : ''; ?>.
		<?php if ( $rank ) : ?>
	That is <?php echo $tier ? esc_html( $tier ) . ', ' : ''; ?>number <?php echo (int) $rank; ?> of <?php echo (int) $of; ?> <?php echo esc_html( ucfirst( $best['season'] ) ); ?> crops whose seeds you can buy.
		<?php elseif ( $of ) : ?>
	Its seeds are not sold in shops every day, so it is left out of the <?php echo esc_html( ucfirst( $best['season'] ) ); ?> ranking; on profit alone it would sit at number <?php echo (int) $best['would_rank']; ?> of <?php echo (int) $of + 1; ?>.
		<?php else : ?>
	Its seeds are not sold in shops, and no other <?php echo esc_html( ucfirst( $best['season'] ) ); ?> crop grows outdoors, so there is no ranking to compare it with.
		<?php endif; ?>
	<?php endif; ?>
	<?php echo esc_html( $traits ); ?>
	</p>
</div>

<h2>Quick facts</h2>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption><?php echo esc_html( $e['name'] ); ?> at a glance</caption>
	<tbody>
		<tr><th scope="row">Seasons</th><td><?php echo $e['indoor_only'] ? 'Any season, indoors only (greenhouse or Garden Pots)' : esc_html( $seasons ); ?></td></tr>
		<tr><th scope="row">Days to first harvest</th><td><?php echo (int) $e['growth_days']; ?></td></tr>
		<tr><th scope="row">After the first harvest</th><td><?php echo esc_html( $regrows ? 'Regrows ' . $every( $e['regrow_days'] ) . ', no replanting' : 'Replant after each harvest' ); ?></td></tr>
		<tr><th scope="row">Sell price</th><td><?php echo esc_html( $gold( $e['prices']['regular'] ) . ' regular, ' . $gold( $e['prices']['silver'] ) . ' silver, ' . $gold( $e['prices']['gold'] ) . ' gold, ' . $gold( $e['prices']['iridium'] ) . ' iridium' ); ?></td></tr>
		<?php if ( ! empty( $e['irrigated_growth_days'] ) ) : ?>
		<tr><th scope="row">Next to water</th><td><?php echo (int) $e['irrigated_growth_days']; ?> days instead of <?php echo (int) $e['growth_days']; ?> when planted beside water (irrigated); the numbers on this page use the slower, unirrigated time</td></tr>
		<?php endif; ?>
		<tr><th scope="row">Seeds</th><td>
			<?php
			if ( $seed_parts && ! empty( $e['seed_note'] ) ) {
				echo esc_html( $e['seed_note'] );
			} elseif ( $seed_parts ) {
				echo esc_html( implode( '; ', $seed_parts ) );
				if ( ! empty( $e['returns_seeds'] ) && ! $regrows ) {
					echo ' (each harvest drops about one seed, so you only buy them once)';
				}
			} else {
				echo esc_html( ! empty( $e['seed_note'] ) ? $e['seed_note'] : 'Not sold in shops for gold' );
			}
			?>
		</td></tr>
		<?php if ( $e['items_per_harvest']['level0'] > 1 || $e['items_per_harvest']['level10'] > 1 ) : ?>
		<tr><th scope="row">Items per harvest</th><td><?php echo esc_html( $n2( $e['items_per_harvest']['level0'] ) ); ?> at farming level 0, <?php echo esc_html( $n2( $e['items_per_harvest']['level10'] ) ); ?> at level 10</td></tr>
		<?php endif; ?>
		<?php if ( $best && $best['last_planting_day'] ) : ?>
		<tr><th scope="row">Last day to plant</th><td>Day <?php echo (int) $best['last_planting_day']; ?> of <?php echo esc_html( ucfirst( $best['last_planting_season'] ? $best['last_planting_season'] : $best['season'] ) ); ?> for one harvest</td></tr>
		<?php endif; ?>
		<?php if ( $e['trellis'] ) : ?>
		<tr><th scope="row">Trellis</th><td>Grows on a trellis. You can't walk through it, so leave a path between rows.</td></tr>
		<?php endif; ?>
	</tbody>
</table>
</div>

<?php
$uses     = isset( $e['uses'] ) ? $e['uses'] : array();
$q_names  = array(
	'normal'  => '',
	'silver'  => ', silver quality or better',
	'gold'    => ', gold quality or better',
	'iridium' => ', iridium quality',
);
$people   = function ( $list ) {
	return count( $list ) > 1 ? implode( ', ', array_slice( $list, 0, -1 ) ) . ' and ' . end( $list ) : implode( '', $list );
};
// Escaped HTML; the first mention of each room links to its page.
$rooms_linked = array();
$bundle_t     = function ( $b ) use ( $q_names, $link, &$rooms_linked ) {
	$room = sanitize_title( $b['room'] );
	$name = isset( $rooms_linked[ $room ] ) ? esc_html( $b['room'] ) : $link( 'bundles', $room, $b['room'] );
	$rooms_linked[ $room ] = true;
	return esc_html( preg_replace( '/^The /', '', $b['name'] ) ) . ' (' . $name . ', ' . (int) $b['qty'] . ' needed' . esc_html( isset( $q_names[ $b['quality'] ] ) ? $q_names[ $b['quality'] ] : '' ) . ')';
};
$gifts    = isset( $uses['gifts'] ) ? $uses['gifts'] : null;
?>
<h2>What to do with <?php echo esc_html( $e['name'] ); ?></h2>
<?php if ( ! empty( $e['special_use'] ) ) : ?>
<p><strong><?php echo esc_html( $e['special_use']['title'] ); ?>.</strong> <?php echo esc_html( $e['special_use']['text'] ); ?></p>
<?php endif; ?>
<ul>
	<li><strong>Bundles:</strong>
	<?php
	if ( ! empty( $uses['bundles'] ) ) {
		// phpcs:disable WordPress.Security.EscapeOutput -- $bundle_t escapes.
		echo 'the Community Center asks for it in the ' . $people( array_map( $bundle_t, $uses['bundles'] ) ) . '.';
		echo ! empty( $uses['remixed_bundles'] ) ? ' With Remixed Bundles it can also come up in the ' . $people( array_map( $bundle_t, $uses['remixed_bundles'] ) ) . '.' : '';
	} elseif ( ! empty( $uses['remixed_bundles'] ) ) {
		echo 'no standard Community Center bundle needs it, but with Remixed Bundles it can come up in the ' . $people( array_map( $bundle_t, $uses['remixed_bundles'] ) ) . '.';
		// phpcs:enable
	} else {
		echo 'no Community Center bundle asks for it.';
	}
	?>
	<?php if ( ! empty( $uses['bundles'] ) || ! empty( $uses['remixed_bundles'] ) ) : ?>Track it in the <a href="<?php echo esc_url( $tool_url( 'bundle-tracker' ) ); ?>">Bundle Tracker</a>.<?php endif; ?></li>
	<li><strong>Crafting:</strong>
	<?php
	if ( ! empty( $uses['crafting'] ) ) {
		echo esc_html(
			'an ingredient in ' . $people(
				array_map(
					function ( $r ) {
						return $r['name'] . ' (' . (int) $r['qty'] . ' needed)';
					},
					$uses['crafting']
				)
			) . '.'
		);
	} else {
		echo 'not used in any crafting recipe.';
	}
	?>
	<?php if ( ! empty( $e['wiki_url'] ) ) : ?>For cooking recipes, see the <a href="<?php echo esc_url( $e['wiki_url'] ); ?>" rel="noopener">wiki's <?php echo esc_html( $e['name'] ); ?> page</a>.<?php endif; ?></li>
	<?php if ( $gifts ) : ?>
	<li><strong>Gifts:</strong>
		<?php
		if ( $gifts['neutral'] >= $gifts['of'] ) {
			echo 'every villager treats it as a neutral gift, so it is not worth giving;';
		} else {
			$parts = array();
			if ( $gifts['love'] ) {
				$parts[] = $people( $gifts['love'] ) . ( count( $gifts['love'] ) > 1 ? ' love' : ' loves' ) . ' it';
			}
			if ( $gifts['like'] && count( $gifts['like'] ) * 2 > $gifts['of'] ) {
				// Most villagers like it through a category ("All Vegetables"): a count reads better than 28 names.
				$parts[] = count( $gifts['like'] ) . ' of ' . (int) $gifts['of'] . ' villagers like it' . ( ! empty( $gifts['like_rule'] ) ? ' (universal like: ' . $gifts['like_rule'] . ')' : '' );
			} elseif ( $gifts['like'] ) {
				$parts[] = $people( $gifts['like'] ) . ( count( $gifts['like'] ) > 1 ? ' like' : ' likes' ) . ' it';
			}
			$bad = array_merge( $gifts['dislike'], $gifts['hate'] );
			if ( $bad ) {
				$parts[] = 'avoid giving it to ' . $people( $bad );
			}
			echo esc_html( $parts ? implode( '; ', $parts ) . '.' : 'no villager names it as a loved or liked gift.' );
			if ( ! isset( $gifts['unknown'] ) || $gifts['unknown'] > 0 ) {
				echo ' For the rest it is neutral or not recorded, and';
			} elseif ( $gifts['neutral'] > 0 ) {
				echo ' Everyone else treats it as neutral, and';
			} else {
				echo ' For the points per gift,';
			}
		}
		?>
		the <a href="<?php echo esc_url( $tool_url( 'gift-finder' ) ); ?>">Gift Finder</a> shows every villager.</li>
	<?php endif; ?>
	<li><strong>Machines:</strong>
	<?php if ( $best_machine ) : ?>
		<?php echo esc_html( $best_machine['product'] ); ?> from a <?php echo esc_html( $best_machine['machine'] ); ?> earns the most, +<?php echo esc_html( $gold( $best_machine['gain_per_machine_day'] ) ); ?> a machine-day (below).
	<?php else : ?>
		it can't go in a Keg or Preserves Jar, so sell it raw.
	<?php endif; ?></li>
</ul>

<h2>What <?php echo esc_html( $e['name'] ); ?> sells for</h2>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Sell price by quality</caption>
	<thead><tr><th scope="col">Regular</th><th scope="col">Silver</th><th scope="col">Gold</th><th scope="col">Iridium</th><th scope="col">Regular with Tiller</th></tr></thead>
	<tbody><tr>
		<td><?php echo esc_html( $gold( $e['prices']['regular'] ) ); ?></td>
		<td><?php echo esc_html( $gold( $e['prices']['silver'] ) ); ?></td>
		<td><?php echo esc_html( $gold( $e['prices']['gold'] ) ); ?></td>
		<td><?php echo esc_html( $gold( $e['prices']['iridium'] ) ); ?></td>
		<td><?php echo esc_html( $gold( $e['tiller_price'] ) ); ?></td>
	</tr></tbody>
</table>
</div>
<?php if ( isset( $avg_price[0], $avg_price[10] ) ) : ?>
<p>Without fertilizer, one <?php echo esc_html( $e['name'] ); ?> sells for <?php echo esc_html( $gold( $avg_price[0] ) ); ?> on average at farming level 0<?php echo isset( $avg_price[5] ) ? ', ' . esc_html( $gold( $avg_price[5] ) ) . ' at level 5' : ''; ?> and <?php echo esc_html( $gold( $avg_price[10] ) ); ?> at level 10, as more of the harvest comes up silver and gold<?php echo $how_url ? ' (<a href="' . esc_url( $how_url ) . '">quality chances</a>)' : ''; ?>. Tiller adds 10%: <?php echo esc_html( $gold( $e['tiller_price'] ) ); ?> for a regular one.</p>
<?php endif; ?>

<?php if ( ! $indoor ) : ?>
<h2>Profit per tile</h2>
<?php if ( count( $e['seasons'] ) > 1 ) : ?>
<p><?php echo esc_html( $e['name'] ); ?> grows in <?php echo esc_html( $season_list( $e['seasons'] ) ); ?>, so a planting carries on into the next of those seasons and its profit covers both.</p>
<?php endif; ?>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Profit per tile, planted on day 1, sold raw<?php echo null !== $best['seed_cost'] ? ', after seeds' : ''; ?></caption>
	<thead><tr><th scope="col">Planted in</th><th scope="col">Harvests</th><th scope="col">Level 0</th><th scope="col">Level 6</th><th scope="col">Level 10</th><th scope="col">Rank at level 6</th></tr></thead>
	<tbody>
	<?php foreach ( $e['plantings'] as $p ) : ?>
		<tr<?php echo $p['season'] === $best['season'] ? ' class="is-best"' : ''; ?>>
			<th scope="row"><?php echo esc_html( ucfirst( $p['season'] ) ); ?><?php echo $p['carries_into'] ? ' <small>(into ' . esc_html( $season_list( $p['carries_into'] ) ) . ')</small>' : ''; ?></th>
			<td><?php echo count( $p['harvests'] ); ?></td>
			<td><?php echo esc_html( $gold( $p['profit']['level0'] ) ); ?></td>
			<td><?php echo esc_html( $gold( $p['profit']['level6'] ) ); ?></td>
			<td><?php echo esc_html( $gold( $p['profit']['level10'] ) ); ?></td>
			<td><?php echo $p['rank'] ? (int) $p['rank'] . ' of ' . (int) $p['of'] : 'Not ranked (no shop seeds)'; ?></td>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<?php
$gain = $best['profit']['level0'] > 0 ? round( ( $best['profit']['level10'] / $best['profit']['level0'] - 1 ) * 100 ) : null;
$days = $best['harvests'];
if ( $regrows ) {
	$seed_text = 'Because it regrows, you pay for seeds once and then collect ' . $every( $e['regrow_days'] ) . ', which is why the number rises quickly the earlier in the season you plant it.';
} elseif ( null === $best['seed_cost'] ) {
	$seed_text = 'It has to be replanted after every harvest; no shop sells the seeds, so their cost is not counted.';
} elseif ( ! empty( $e['returns_seeds'] ) ) {
	$seed_text = 'Each harvest drops about one seed on average, so after the first bag (' . $gold( $best['seed_cost'] ) . ') you replant for free.';
} else {
	$seed_text = 'It has to be replanted after every harvest, so the seed cost repeats: ' . $gold( $best['seed_cost'] ) . ' over the season.';
}
?>
<?php if ( $how_url ) : ?><p class="table-note"><a href="<?php echo esc_url( $how_url ); ?>">How profit and rank are counted</a>.</p><?php endif; ?>
<p>Planted on day 1 of <?php echo esc_html( ucfirst( $best['season'] ) ); ?>, <?php echo esc_html( $e['name'] ); ?> is harvested on day <?php echo esc_html( implode( ', ', array_slice( $days, 0, 8 ) ) ); ?><?php echo count( $days ) > 8 ? ' and ' . ( count( $days ) - 8 ) . ' more times' : ''; ?>. <?php if ( null !== $gain && $gain > 0 ) : ?>Going from farming level 0 to 10 raises its profit by about <?php echo (int) $gain; ?>%, mostly through better quality<?php echo $e['items_per_harvest']['level10'] > $e['items_per_harvest']['level0'] ? ' and extra items per harvest' : ''; ?>.<?php endif; ?> <?php echo esc_html( $seed_text ); ?> Other days and levels: <a href="<?php echo esc_url( $calc_url ); ?>">Crop Profit Calculator</a>.</p>

<h2>Does fertilizer help?</h2>
<?php $paying = isset( $best['paying_fertilizers'] ) ? $best['paying_fertilizers'] : array(); ?>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Profit per tile at farming level 6, planted on day 1 of <?php echo esc_html( ucfirst( $best['season'] ) ); ?></caption>
	<thead><tr><th scope="col">Nothing</th><?php foreach ( $fert_names as $label ) : ?><th scope="col"><?php echo esc_html( $label ); ?></th><?php endforeach; ?></tr></thead>
	<tbody><tr>
		<td><?php echo esc_html( $gold( $best['profit']['level6'] ) ); ?></td>
		<?php foreach ( $fert_names as $key => $label ) : ?>
		<td<?php echo $paying && $paying[0] === $key ? ' class="is-best"' : ''; ?>><?php echo esc_html( $gold( $best['fertilizer_level6'][ $key ] ) ); ?></td>
		<?php endforeach; ?>
	</tr></tbody>
</table>
</div>
<?php if ( $paying ) : ?>
	<?php
	$top_f  = $paying[0];
	$others = array_map(
		function ( $k ) use ( $fert_names ) {
			return $fert_names[ $k ];
		},
		array_slice( $paying, 1 )
	);
	?>
<p>For <?php echo esc_html( $e['name'] ); ?>, the best is <?php echo esc_html( $fert_names[ $top_f ] ); ?>: it lifts profit from <?php echo esc_html( $gold( $best['profit']['level6'] ) ); ?> to <?php echo esc_html( $gold( $best['fertilizer_level6'][ $top_f ] ) ); ?> a tile. <?php echo $others ? esc_html( $season_list( $others ) . ( count( $others ) > 1 ? ' also pay' : ' also pays' ) . ', by less.' ) : 'It is the only one that pays; the others cost more than they bring in.'; ?> <?php if ( in_array( $top_f, array( 'speed-gro', 'deluxe-speed-gro' ), true ) ) : ?>It pays by fitting in an extra harvest (<a href="<?php echo esc_url( $guide_url( 'speed-gro-vs-fertilizer' ) ); ?>">why</a>).<?php endif; ?></p>
<?php else : ?>
<p>No fertilizer pays for itself on <?php echo esc_html( $e['name'] ); ?> here: each bag costs more than the extra harvests or better quality bring in. Skip it and plant more tiles. <a href="<?php echo esc_url( $guide_url( 'speed-gro-vs-fertilizer' ) ); ?>">Speed-Gro vs Fertilizer</a> explains why this is common.</p>
<?php endif; ?>
<?php endif; ?>

<h2>Sell it raw or process it?</h2>
<?php if ( $e['products'] ) : ?>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>What <?php echo esc_html( $e['name'] ); ?> becomes in a machine (Artisan prices, compared with the Tiller raw price)</caption>
	<thead><tr><th scope="col">Machine</th><th scope="col">Makes</th><th scope="col">Price</th><th scope="col">Days in machine</th><th scope="col">Extra gold per machine per day</th></tr></thead>
	<tbody>
	<?php foreach ( $e['products'] as $pr ) : ?>
		<?php
		$pg = null;
		foreach ( $e['machine_gain'] as $mg ) {
			if ( $mg['machine'] === $pr['machine'] && $mg['product'] === $pr['product'] ) {
				$pg = $mg;
			}
		}
		?>
		<tr><th scope="row"><?php echo esc_html( $pr['machine'] ); ?></th><td><?php echo esc_html( $pr['product'] ); ?><?php echo $pr['input'] > 1 ? ' <small>(' . (int) $pr['input'] . ' needed)</small>' : ''; ?></td><td><?php echo esc_html( $gold( $pr['price'] ) ); ?></td><td><?php echo esc_html( $pr['days'] ); ?></td><td><?php echo esc_html( $pg ? $gold( $pg['gain_per_machine_day'] ) : 'Not the better product' ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<?php if ( $kegs && $jars ) : ?>
<p>For <?php echo esc_html( $e['name'] ); ?> a Keg adds <?php echo esc_html( $gold( $kegs['gain_per_machine_day'] ) ); ?> per machine-day over the raw price and a Preserves Jar <?php echo esc_html( $gold( $jars['gain_per_machine_day'] ) ); ?>, so <?php echo $kegs['gain_per_machine_day'] >= $jars['gain_per_machine_day'] ? 'Kegs win whether crops or machines are your limit.' : 'Jars win when machines are short; with more machines than crops, pick the product worth more per item.'; ?> The <a href="<?php echo esc_url( $tool_url( 'keg-vs-preserves-jar' ) ); ?>">Keg vs Preserves Jar</a> tool splits a harvest across the machines you own.</p>
<?php elseif ( $best_machine ) : ?>
<p>Each <?php echo esc_html( $best_machine['machine'] ); ?> adds <?php echo esc_html( $gold( $best_machine['gain_per_machine_day'] ) ); ?> a day over selling <?php echo esc_html( $e['name'] ); ?> raw, if it is never idle.</p>
<?php endif; ?>
<?php else : ?>
<p><?php echo esc_html( $e['name'] ); ?> can't be made into an artisan good in a Keg or Preserves Jar, so the only decision is when to sell it.</p>
<?php endif; ?>

<h2>In the greenhouse</h2>
<p>Grown in the greenhouse all year (112 days) at farming level 6, <?php echo esc_html( $e['name'] ); ?> makes about <?php echo esc_html( $gold( $e['greenhouse']['established'] ) ); ?> a tile once established, from <?php echo (int) $e['greenhouse']['harvests']; ?> harvests<?php echo $e['greenhouse']['first_year'] !== $e['greenhouse']['established'] ? ', and ' . esc_html( $gold( $e['greenhouse']['first_year'] ) ) . ' in the first year while it is still growing' : ''; ?> (<a href="<?php echo esc_url( $guide_url( 'best-greenhouse-setup-for-money' ) ); ?>">best greenhouse setup</a>).</p>

<?php if ( ! $indoor ) : ?>
<h2>How it compares</h2>
	<?php if ( $best['peers'] ) : ?>
<p><?php echo $rank ? esc_html( ucfirst( $best['season'] ) ) . ' crops with shop seeds that make about the same at farming level 6:' : 'For comparison, ' . esc_html( ucfirst( $best['season'] ) ) . ' crops with shop seeds that make the closest amount at farming level 6:'; ?></p>
<ul>
		<?php foreach ( $best['peers'] as $peer ) : ?>
	<li><?php echo $link( 'crops', $peer['id'], $peer['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?>: <?php echo esc_html( $gold( $peer['profit'] ) ); ?> per tile</li>
		<?php endforeach; ?>
</ul>
	<?php endif; ?>
<p><?php echo esc_html( $e['name'] ); ?> makes <?php echo esc_html( $gold( $best['profit']['level6'] ) ); ?><?php echo $rank ? ', number ' . (int) $rank . ' of ' . (int) $of : ''; ?>.
	<?php
	if ( 1 === (int) $rank ) {
		echo 'It is the most profitable ' . esc_html( ucfirst( $best['season'] ) ) . ' crop you can buy seeds for.';
	} elseif ( ! $rank && $best['leader'] ) {
		// Unranked (no everyday shop seed): compare with the ranked leader without calling it "more".
		$lead_gap = $best['profit']['level6'] - $best['leader']['profit'];
		echo 'It is not ranked because its seeds are not sold in shops every day. ';
		if ( $lead_gap > 0 ) {
			echo 'If you have the seeds, it beats the ranked leader, ' . $link( 'crops', $best['leader']['id'], $best['leader']['name'] ) . ' (' . esc_html( $gold( $best['leader']['profit'] ) ) . ' a tile), by ' . esc_html( $gold( $lead_gap ) ) . '.'; // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link.
		} else {
			echo 'The ranked leader, ' . $link( 'crops', $best['leader']['id'], $best['leader']['name'] ) . ', makes ' . esc_html( $gold( $best['leader']['profit'] ) ) . ' a tile' . ( $lead_gap < 0 ? ', ' . esc_html( $gold( -$lead_gap ) ) . ' more' : '' ) . '.'; // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link.
		}
	} elseif ( $best['leader'] ) {
		echo 'The leader, ' . $link( 'crops', $best['leader']['id'], $best['leader']['name'] ) . ', makes ' . esc_html( $gold( $best['leader']['profit'] ) ) . ' a tile' . ( $best['leader']['profit'] > $best['profit']['level6'] ? ', ' . esc_html( $gold( $best['leader']['profit'] - $best['profit']['level6'] ) ) . ' more' : '' ) . '.'; // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link.
		echo $rank && $rank <= 3 ? ' It is near the top of its season, so it is a safe choice.' : '';
	}
	?>
 <?php $season_url = $tool_url( 'best-' . $best['season'] . '-crops' ); ?><?php if ( $season_url ) : ?>Full list: <a href="<?php echo esc_url( $season_url ); ?>">Best <?php echo esc_html( ucfirst( $best['season'] ) ); ?> Crops</a>.<?php endif; ?></p>
<?php endif; ?>

<?php $st_tips = include __DIR__ . '/tips.php'; ?>
<?php if ( ! empty( $st_tips['crops'][ $e['id'] ] ) ) : ?>
<h2>Tip</h2>
<p><?php echo esc_html( $st_tips['crops'][ $e['id'] ] ); ?></p>
<?php endif; ?>

<h2>Related</h2>
<ul class="related-list">
	<li><a href="<?php echo esc_url( $calc_url ); ?>">Crop Profit Calculator</a></li>
	<li><a href="<?php echo esc_url( $tool_url( 'xp-calculator' ) ); ?>">XP Calculator</a></li>
	<?php if ( $ent_url( 'crops', '' ) ) : ?>
	<li><a href="<?php echo esc_url( $ent_url( 'crops', '' ) ); ?>">All crops</a></li>
	<?php endif; ?>
</ul>
<?php
// Every other crop of the same season (and of the same kind: flowers, crops without shop seeds),
// so each crop page is one click from its whole season and not only from its closest earners.
$crop_rows = array();
foreach ( $e['seasons'] as $season_key ) {
	$crop_rows[ 'More ' . ucfirst( $season_key ) . ' crops' ] = function ( $pe ) use ( $season_key ) {
		return in_array( $season_key, $pe['seasons'], true );
	};
}
if ( empty( $e['shop_seeds'] ) ) {
	$crop_rows['Other crops whose seeds no shop sells every day'] = function ( $pe ) {
		return empty( $pe['shop_seeds'] );
	};
}
if ( 'flower' === $e['category'] ) {
	$crop_rows['Other flowers'] = function ( $pe ) {
		return 'flower' === $pe['category'];
	};
}
foreach ( $crop_rows as $row_label => $row_match ) {
	$peers = array();
	foreach ( $all['crops'] as $pid => $pe ) {
		if ( $pid !== $id && $row_match( $pe ) && $ent_url( 'crops', $pid ) ) {
			$peers[] = '<a href="' . esc_url( $ent_url( 'crops', $pid ) ) . '">' . esc_html( $pe['name'] ) . '</a>';
		}
	}
	if ( $peers ) {
		echo '<p class="entity-links">' . esc_html( $row_label ) . ': ' . implode( ' · ', $peers ) . '</p>'; // phpcs:ignore WordPress.Security.EscapeOutput -- built from escaped parts.
	}
}
?>

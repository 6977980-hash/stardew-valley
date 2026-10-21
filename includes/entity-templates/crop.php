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
		<tr><th scope="row">Trellis</th><td>Grows on a trellis, so you can walk through the rows.</td></tr>
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
$bundle_t = function ( $b ) use ( $q_names ) {
	return $b['name'] . ' (' . $b['room'] . ', ' . (int) $b['qty'] . ' needed' . ( isset( $q_names[ $b['quality'] ] ) ? $q_names[ $b['quality'] ] : '' ) . ')';
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
		echo esc_html( 'the Community Center asks for it in the ' . $people( array_map( $bundle_t, $uses['bundles'] ) ) . '.' );
		echo ! empty( $uses['remixed_bundles'] ) ? esc_html( ' With Remixed Bundles it can also come up in the ' . $people( array_map( $bundle_t, $uses['remixed_bundles'] ) ) . '.' ) : '';
	} elseif ( ! empty( $uses['remixed_bundles'] ) ) {
		echo esc_html( 'no standard Community Center bundle needs it, but with Remixed Bundles it can come up in the ' . $people( array_map( $bundle_t, $uses['remixed_bundles'] ) ) . '.' );
	} else {
		echo 'no Community Center bundle asks for it.';
	}
	?>
	<?php if ( ! empty( $uses['bundles'] ) || ! empty( $uses['remixed_bundles'] ) ) : ?>Keep some back until those bundles are done; the <a href="<?php echo esc_url( $tool_url( 'bundle-tracker' ) ); ?>">Bundle Tracker</a> shows what is still missing.<?php endif; ?></li>
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
			if ( $gifts['like'] ) {
				$parts[] = $people( $gifts['like'] ) . ( count( $gifts['like'] ) > 1 ? ' like' : ' likes' ) . ' it';
			}
			$bad = array_merge( $gifts['dislike'], $gifts['hate'] );
			if ( $bad ) {
				$parts[] = 'avoid giving it to ' . $people( $bad );
			}
			echo esc_html( $parts ? implode( '; ', $parts ) . '. For everyone else' : 'no villager names it as a loved or liked gift. For most' );
			echo ' it depends on a group rule such as "all fruit" or "all vegetables", and';
		}
		?>
		the <a href="<?php echo esc_url( $tool_url( 'gift-finder' ) ); ?>">Gift Finder</a> shows every villager.</li>
	<?php endif; ?>
	<li><strong>Machines:</strong>
	<?php if ( $best_machine ) : ?>
		the best is the <?php echo esc_html( $best_machine['machine'] ); ?>, which makes <?php echo esc_html( $best_machine['product'] ); ?> and adds about <?php echo esc_html( $gold( $best_machine['gain_per_machine_day'] ) ); ?> per machine per day over selling it raw, with the Artisan profession (details below).
	<?php else : ?>
		it can't go in a Keg or Preserves Jar, so sell it raw.
	<?php endif; ?></li>
</ul>

<h2>What <?php echo esc_html( $e['name'] ); ?> sells for</h2>
<p>Quality changes the price: silver is worth about a quarter more than regular, gold about a half more, and iridium double. Your farming level decides how often you get each.</p>
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
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Chance of each quality, no fertilizer</caption>
	<thead><tr><th scope="col">Farming level</th><th scope="col">Regular</th><th scope="col">Silver</th><th scope="col">Gold</th><th scope="col">Iridium</th></tr></thead>
	<tbody>
	<?php foreach ( $e['quality'] as $q ) : ?>
		<tr><th scope="row"><?php echo (int) $q['level']; ?></th><td><?php echo esc_html( $q['chances']['regular'] ); ?>%</td><td><?php echo esc_html( $q['chances']['silver'] ); ?>%</td><td><?php echo esc_html( $q['chances']['gold'] ); ?>%</td><td><?php echo esc_html( $q['chances']['iridium'] ); ?>%</td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p class="table-note">Iridium quality only becomes possible with Deluxe Fertilizer, which is why the chance is 0% here.</p>

<?php if ( ! $indoor ) : ?>
<h2>Profit per tile</h2>
<p>This is profit for one tile planted on day 1 of the season and replanted after each harvest, sold raw<?php echo null !== $best['seed_cost'] ? ', after paying for seeds' : ''; ?>. It counts every harvest that fits before the season ends<?php echo count( $e['seasons'] ) > 1 ? ', and carries the crop into the next season if it also grows there, so a planting that continues covers more than one season' : ''; ?>. The rank compares only crops whose seeds a shop sells every day, the same list as the Best Crops pages (they rank at farming level 0, so neighbours can swap places).</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Profit per tile by planting season and farming level</caption>
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
<p>Planted on day 1 of <?php echo esc_html( ucfirst( $best['season'] ) ); ?>, <?php echo esc_html( $e['name'] ); ?> is harvested on day <?php echo esc_html( implode( ', ', array_slice( $days, 0, 8 ) ) ); ?><?php echo count( $days ) > 8 ? ' and ' . ( count( $days ) - 8 ) . ' more times' : ''; ?>. <?php if ( null !== $gain && $gain > 0 ) : ?>Going from farming level 0 to 10 raises its profit by about <?php echo (int) $gain; ?>%, mostly through better quality<?php echo $e['items_per_harvest']['level10'] > $e['items_per_harvest']['level0'] ? ' and extra items per harvest' : ''; ?>.<?php endif; ?> <?php echo esc_html( $seed_text ); ?> For a different day, farming level, profession or fertilizer, use the <a href="<?php echo esc_url( $calc_url ); ?>">Crop Profit Calculator</a>.</p>

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
<p>For <?php echo esc_html( $e['name'] ); ?>, the best is <?php echo esc_html( $fert_names[ $top_f ] ); ?>: it lifts profit from <?php echo esc_html( $gold( $best['profit']['level6'] ) ); ?> to <?php echo esc_html( $gold( $best['fertilizer_level6'][ $top_f ] ) ); ?> a tile. <?php echo $others ? esc_html( $season_list( $others ) . ( count( $others ) > 1 ? ' also pay' : ' also pays' ) . ', by less.' ) : 'It is the only one that pays; the others cost more than they bring in.'; ?> <?php if ( in_array( $top_f, array( 'speed-gro', 'deluxe-speed-gro' ), true ) ) : ?>Speed fertilizer works by fitting an extra harvest into the season; see <a href="<?php echo esc_url( $guide_url( 'speed-gro-vs-fertilizer' ) ); ?>">Speed-Gro vs Fertilizer</a> for when that happens.<?php endif; ?></p>
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
<p>The last column is what one machine adds per day over selling the crop raw, if it is never idle. Artisan comes after Tiller at farming level 10, so the raw price it is compared with includes Tiller's 10%. <?php if ( $best_machine ) : ?>For <?php echo esc_html( $e['name'] ); ?> the better machine is the <?php echo esc_html( $best_machine['machine'] ); ?> (<?php echo esc_html( $best_machine['product'] ); ?>, <?php echo esc_html( $gold( $best_machine['gain_per_machine_day'] ) ); ?> a machine-day). <?php endif; ?><?php if ( $kegs && $jars ) : ?><?php echo $kegs['gain_per_machine_day'] >= $jars['gain_per_machine_day'] ? 'Kegs earn more here per machine-day too, so this crop belongs in Kegs whether you are short of crops or of machines.' : 'Per machine-day the Preserves Jar earns more here, so use Jars when machines are your limit; when crops are your limit, pick the product worth more per item.'; ?> The <a href="<?php echo esc_url( $tool_url( 'keg-vs-preserves-jar' ) ); ?>">Keg vs Preserves Jar</a> tool splits a harvest across the machines you actually own.<?php endif; ?></p>
<?php else : ?>
<p><?php echo esc_html( $e['name'] ); ?> can't be made into an artisan good in a Keg or Preserves Jar, so the only decision is when to sell it.</p>
<?php endif; ?>

<h2>In the greenhouse</h2>
<p>Grown in the greenhouse all year (112 days) at farming level 6, <?php echo esc_html( $e['name'] ); ?> makes about <?php echo esc_html( $gold( $e['greenhouse']['established'] ) ); ?> a tile once established, from <?php echo (int) $e['greenhouse']['harvests']; ?> harvests<?php echo $e['greenhouse']['first_year'] !== $e['greenhouse']['established'] ? ', and ' . esc_html( $gold( $e['greenhouse']['first_year'] ) ) . ' in the first year while it is still growing' : ''; ?>. Compare crops for a full greenhouse in <a href="<?php echo esc_url( $guide_url( 'best-greenhouse-setup-for-money' ) ); ?>">Best Greenhouse Setup for Money</a>.</p>

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
	} elseif ( $best['leader'] ) {
		echo 'The leader, ' . $link( 'crops', $best['leader']['id'], $best['leader']['name'] ) . ', makes ' . esc_html( $gold( $best['leader']['profit'] ) ) . ' a tile' . ( $best['leader']['profit'] > $best['profit']['level6'] ? ', ' . esc_html( $gold( $best['leader']['profit'] - $best['profit']['level6'] ) ) . ' more' : '' ) . '.'; // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link.
		echo $rank && $rank <= 3 ? ' It is near the top of its season, so it is a safe choice.' : '';
	}
	?>
 <?php $season_url = $tool_url( 'best-' . $best['season'] . '-crops' ); ?><?php if ( $season_url ) : ?>See every crop for the season on <a href="<?php echo esc_url( $season_url ); ?>">Best <?php echo esc_html( ucfirst( $best['season'] ) ); ?> Crops</a>, or ask <a href="<?php echo esc_url( $tool_url( 'what-to-plant' ) ); ?>">What to Plant Today</a> for a pick that fits your day and budget.<?php endif; ?></p>
<?php endif; ?>

<?php $st_tips = include __DIR__ . '/tips.php'; ?>
<?php if ( ! empty( $st_tips['crops'][ $e['id'] ] ) ) : ?>
<h2>Tip</h2>
<p><?php echo esc_html( $st_tips['crops'][ $e['id'] ] ); ?></p>
<?php endif; ?>

<h2>Related</h2>
<ul class="related-list">
	<li><a href="<?php echo esc_url( $calc_url ); ?>">Crop Profit Calculator</a><span>Set the day, level and fertilizer yourself.</span></li>
	<li><a href="<?php echo esc_url( $tool_url( 'xp-calculator' ) ); ?>">XP Calculator</a><span>How many <?php echo esc_html( $e['name'] ); ?> harvests to your next farming level.</span></li>
	<?php if ( $ent_url( 'crops', '' ) ) : ?>
	<li><a href="<?php echo esc_url( $ent_url( 'crops', '' ) ); ?>">All crops</a><span>Every crop in one table, with a CSV download.</span></li>
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

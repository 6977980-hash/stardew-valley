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
$seasons   = implode( ', ', array_map( 'ucfirst', $e['seasons'] ) );
$regrows   = ! empty( $e['regrow_days'] );
$rank      = $best['rank'];
$of        = $best['of'];
$tier      = $rank <= 3 ? 'one of the best' : ( $rank <= ceil( $of / 3 ) ? 'above average' : ( $rank > floor( 2 * $of / 3 ) ? 'one of the weaker' : 'middle-of-the-pack' ) );
$cheapest  = null;
foreach ( $e['seed_prices'] as $shop => $price ) {
	if ( null === $cheapest || $price < $cheapest[1] ) {
		$cheapest = array( $shop, $price );
	}
}
$shops     = array(
	'pierre'    => "Pierre's",
	'jojamart'  => 'JoJaMart',
	'oasis'     => 'the Oasis',
	'krobus'    => 'Krobus',
	'traveling' => 'the Traveling Cart',
);
$shop_name = function ( $s ) use ( $shops ) {
	return isset( $shops[ $s ] ) ? $shops[ $s ] : ucwords( str_replace( '-', ' ', $s ) );
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
	<p class="answer__lead"><strong>Short answer:</strong> <?php echo esc_html( $e['name'] ); ?> is a <?php echo esc_html( $seasons ); ?> <?php echo esc_html( $e['category'] ); ?> that takes <?php echo (int) $e['growth_days']; ?> days to grow<?php echo $regrows ? ' and then gives a harvest every ' . (int) $e['regrow_days'] . ' days' : ''; ?>. It sells for <?php echo esc_html( $gold( $e['base_price'] ) ); ?>. Planted on day 1 of <?php echo esc_html( ucfirst( $best['season'] ) ); ?> at farming level 6 it makes about <?php echo esc_html( $gold( $best['profit']['level6'] ) ); ?> per tile after seeds, <?php echo esc_html( $tier ); ?> (number <?php echo (int) $rank; ?> of <?php echo (int) $of; ?> <?php echo esc_html( ucfirst( $best['season'] ) ); ?> crops).</p>
</div>

<h2>Quick facts</h2>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption><?php echo esc_html( $e['name'] ); ?> at a glance</caption>
	<tbody>
		<tr><th scope="row">Seasons</th><td><?php echo esc_html( $seasons ); ?><?php echo $e['indoor_only'] ? ' (indoors only)' : ''; ?></td></tr>
		<tr><th scope="row">Days to first harvest</th><td><?php echo (int) $e['growth_days']; ?></td></tr>
		<tr><th scope="row">After the first harvest</th><td><?php echo $regrows ? 'Regrows every ' . (int) $e['regrow_days'] . ' days, no replanting' : 'Replant after each harvest'; ?></td></tr>
		<tr><th scope="row">Sell price</th><td><?php echo esc_html( $gold( $e['base_price'] ) ); ?></td></tr>
		<tr><th scope="row">Seeds</th><td>
			<?php
			if ( $e['seed_prices'] ) {
				$parts = array();
				foreach ( $e['seed_prices'] as $shop => $price ) {
					$parts[] = esc_html( $gold( $price ) . ' at ' . $shop_name( $shop ) );
				}
				echo implode( '; ', $parts ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped above.
			} else {
				echo 'Not sold in shops';
			}
			?>
		</td></tr>
		<tr><th scope="row">Items per harvest</th><td><?php echo esc_html( rtrim( rtrim( number_format( $e['items_per_harvest']['level0'], 2 ), '0' ), '.' ) ); ?> at farming level 0, <?php echo esc_html( rtrim( rtrim( number_format( $e['items_per_harvest']['level10'], 2 ), '0' ), '.' ) ); ?> at level 10</td></tr>
		<?php if ( $best['last_planting_day'] ) : ?>
		<tr><th scope="row">Last day to plant</th><td>Day <?php echo (int) $best['last_planting_day']; ?> of <?php echo esc_html( ucfirst( $best['last_planting_season'] ? $best['last_planting_season'] : $best['season'] ) ); ?> for one harvest</td></tr>
		<?php endif; ?>
		<?php if ( $e['trellis'] ) : ?>
		<tr><th scope="row">Trellis</th><td>Grows on a trellis, so you can walk through the rows.</td></tr>
		<?php endif; ?>
	</tbody>
</table>
</div>

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

<h2>Profit per tile</h2>
<p>This is profit for one tile planted on day 1 of the season and replanted after each harvest, sold raw, after paying for seeds. It counts every harvest that fits before the season ends<?php echo count( $e['seasons'] ) > 1 ? ', and carries the crop into the next season if it also grows there' : ''; ?>.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Profit per tile by planting season and farming level</caption>
	<thead><tr><th scope="col">Planted in</th><th scope="col">Harvests</th><th scope="col">Level 0</th><th scope="col">Level 6</th><th scope="col">Level 10</th><th scope="col">Rank at level 6</th></tr></thead>
	<tbody>
	<?php foreach ( $e['plantings'] as $p ) : ?>
		<tr<?php echo $p['season'] === $best['season'] ? ' class="is-best"' : ''; ?>>
			<th scope="row"><?php echo esc_html( ucfirst( $p['season'] ) ); ?></th>
			<td><?php echo count( $p['harvests'] ); ?></td>
			<td><?php echo esc_html( $gold( $p['profit']['level0'] ) ); ?></td>
			<td><?php echo esc_html( $gold( $p['profit']['level6'] ) ); ?></td>
			<td><?php echo esc_html( $gold( $p['profit']['level10'] ) ); ?></td>
			<td><?php echo (int) $p['rank']; ?> of <?php echo (int) $p['of']; ?></td>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<?php
$gain = $best['profit']['level0'] > 0 ? round( ( $best['profit']['level10'] / $best['profit']['level0'] - 1 ) * 100 ) : null;
$days = $best['harvests'];
?>
<p>Planted on day 1 of <?php echo esc_html( ucfirst( $best['season'] ) ); ?>, <?php echo esc_html( $e['name'] ); ?> is harvested on day <?php echo esc_html( implode( ', ', array_slice( $days, 0, 8 ) ) ); ?><?php echo count( $days ) > 8 ? ' and ' . ( count( $days ) - 8 ) . ' more times' : ''; ?>. <?php if ( null !== $gain && $gain > 0 ) : ?>Going from farming level 0 to 10 raises its profit by about <?php echo (int) $gain; ?>%, mostly through better quality<?php echo $e['items_per_harvest']['level10'] > $e['items_per_harvest']['level0'] ? ' and extra items per harvest' : ''; ?>.<?php endif; ?> <?php if ( $regrows ) : ?>Because it regrows, you pay for seeds once and then collect every <?php echo (int) $e['regrow_days']; ?> days, which is why the number rises quickly the earlier in the season you plant it.<?php else : ?>It has to be replanted after every harvest, so the seed cost repeats: <?php echo esc_html( $gold( $best['seed_cost'] ) ); ?> over the season.<?php endif; ?> For a different day, farming level, profession or fertilizer, use the <a href="<?php echo esc_url( $calc_url ); ?>">Crop Profit Calculator</a>.</p>

<h2>Does fertilizer help?</h2>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Profit per tile at farming level 6, planted on day 1 of <?php echo esc_html( ucfirst( $best['season'] ) ); ?></caption>
	<thead><tr><th scope="col">Nothing</th><?php foreach ( $fert_names as $label ) : ?><th scope="col"><?php echo esc_html( $label ); ?></th><?php endforeach; ?></tr></thead>
	<tbody><tr>
		<td<?php echo 'none' === $best['best_fertilizer'][0] ? '' : ''; ?>><?php echo esc_html( $gold( $best['profit']['level6'] ) ); ?></td>
		<?php foreach ( $fert_names as $key => $label ) : ?>
		<td<?php echo $best['best_fertilizer'][0] === $key && $best['best_fertilizer'][1] > $best['profit']['level6'] ? ' class="is-best"' : ''; ?>><?php echo esc_html( $gold( $best['fertilizer_level6'][ $key ] ) ); ?></td>
		<?php endforeach; ?>
	</tr></tbody>
</table>
</div>
<?php if ( $best['best_fertilizer'][1] > $best['profit']['level6'] ) : ?>
<p>For <?php echo esc_html( $e['name'] ); ?>, <?php echo esc_html( $fert_names[ $best['best_fertilizer'][0] ] ); ?> is the only one that pays: it lifts profit from <?php echo esc_html( $gold( $best['profit']['level6'] ) ); ?> to <?php echo esc_html( $gold( $best['best_fertilizer'][1] ) ); ?> a tile. The others cost more than they bring in. <?php if ( in_array( $best['best_fertilizer'][0], array( 'speed-gro', 'deluxe-speed-gro' ), true ) ) : ?>Speed fertilizer works by fitting an extra harvest into the season; see <a href="<?php echo esc_url( $guide_url( 'speed-gro-vs-fertilizer' ) ); ?>">Speed-Gro vs Deluxe Fertilizer</a> for when that happens.<?php endif; ?></p>
<?php else : ?>
<p>No fertilizer pays for itself on <?php echo esc_html( $e['name'] ); ?> here: each bag costs more than the extra harvests or better quality bring in. Skip it and plant more tiles. <a href="<?php echo esc_url( $guide_url( 'speed-gro-vs-fertilizer' ) ); ?>">Speed-Gro vs Deluxe Fertilizer</a> explains why this is common.</p>
<?php endif; ?>

<h2>Sell it raw or process it?</h2>
<?php if ( $e['products'] ) : ?>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>What <?php echo esc_html( $e['name'] ); ?> becomes in a machine (Artisan prices)</caption>
	<thead><tr><th scope="col">Machine</th><th scope="col">Makes</th><th scope="col">Price</th><th scope="col">Days in machine</th><th scope="col">Extra gold per machine per day</th></tr></thead>
	<tbody>
	<?php foreach ( $e['products'] as $i => $pr ) : ?>
		<tr><th scope="row"><?php echo esc_html( $pr['machine'] ); ?></th><td><?php echo esc_html( $pr['product'] ); ?><?php echo $pr['input'] > 1 ? ' <small>(' . (int) $pr['input'] . ' needed)</small>' : ''; ?></td><td><?php echo esc_html( $gold( $pr['price'] ) ); ?></td><td><?php echo esc_html( $pr['days'] ); ?></td><td><?php echo esc_html( isset( $e['machine_gain'][ $i ] ) ? $gold( $e['machine_gain'][ $i ]['gain_per_machine_day'] ) : '' ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>The last column is what one machine adds per day over selling the crop raw, if it is never idle. <?php if ( $best_machine ) : ?>For <?php echo esc_html( $e['name'] ); ?> the better machine is the <?php echo esc_html( $best_machine['machine'] ); ?> (<?php echo esc_html( $best_machine['product'] ); ?>, <?php echo esc_html( $gold( $best_machine['gain_per_machine_day'] ) ); ?> a machine-day). <?php endif; ?><?php if ( $kegs && $jars ) : ?><?php echo $kegs['gain_per_machine_day'] >= $jars['gain_per_machine_day'] ? 'Kegs earn more here, so give this crop to your Kegs first.' : 'Preserves Jars earn more here, so keep your Kegs for crops with a higher gain.'; ?> The <a href="<?php echo esc_url( $tool_url( 'keg-vs-preserves-jar' ) ); ?>">Keg vs Preserves Jar</a> tool splits a harvest across the machines you actually own.<?php endif; ?></p>
<?php else : ?>
<p><?php echo esc_html( $e['name'] ); ?> can't be made into an artisan good in a Keg or Preserves Jar, so the only decision is when to sell it.</p>
<?php endif; ?>

<h2>In the greenhouse</h2>
<p>Grown in the greenhouse all year (112 days), <?php echo esc_html( $e['name'] ); ?> makes about <?php echo esc_html( $gold( $e['greenhouse']['established'] ) ); ?> a tile once established, from <?php echo (int) $e['greenhouse']['harvests']; ?> harvests<?php echo $e['greenhouse']['first_year'] !== $e['greenhouse']['established'] ? ', and ' . esc_html( $gold( $e['greenhouse']['first_year'] ) ) . ' in the first year while it is still growing' : ''; ?>. Compare crops for a full greenhouse in <a href="<?php echo esc_url( $guide_url( 'best-greenhouse-setup-for-money' ) ); ?>">Best Greenhouse Setup for Money</a>.</p>

<h2>How it compares</h2>
<?php if ( $best['peers'] ) : ?>
<p>The top <?php echo esc_html( ucfirst( $best['season'] ) ); ?> crops at farming level 6 are:</p>
<ul>
	<?php foreach ( $best['peers'] as $peer ) : ?>
	<li><?php echo $link( 'crops', $peer['id'], $peer['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?>: <?php echo esc_html( $gold( $peer['profit'] ) ); ?> per tile</li>
	<?php endforeach; ?>
</ul>
<?php endif; ?>
<p><?php echo esc_html( $e['name'] ); ?> makes <?php echo esc_html( $gold( $best['profit']['level6'] ) ); ?>, number <?php echo (int) $rank; ?> of <?php echo (int) $of; ?>. <?php
if ( $rank > 3 && $best['peers'] ) {
	echo 'The gap to the leader is ' . esc_html( $gold( $best['peers'][0]['profit'] - $best['profit']['level6'] ) ) . ' a tile, so ' . esc_html( $e['name'] ) . ' is worth planting for the reasons above, not for the profit table alone.';
} else {
	echo 'It is near the top of its season, so it is a safe choice.';
}
?> See every crop for the season on <a href="<?php echo esc_url( $tool_url( 'best-' . $best['season'] . '-crops' ) ); ?>">Best <?php echo esc_html( ucfirst( $best['season'] ) ); ?> Crops</a>, or ask <a href="<?php echo esc_url( $tool_url( 'what-to-plant' ) ); ?>">What to Plant Today</a> for a pick that fits your day and budget.</p>

<h2>Related</h2>
<ul class="related-list">
	<li><a href="<?php echo esc_url( $calc_url ); ?>">Crop Profit Calculator</a><span>Set the day, level and fertilizer yourself.</span></li>
	<li><a href="<?php echo esc_url( $tool_url( 'xp-calculator' ) ); ?>">XP Calculator</a><span>How many <?php echo esc_html( $e['name'] ); ?> harvests to your next farming level.</span></li>
	<?php if ( $ent_url( 'crops', '' ) ) : ?>
	<li><a href="<?php echo esc_url( $ent_url( 'crops', '' ) ); ?>">All crops</a><span>Every crop in one table, with a CSV download.</span></li>
	<?php endif; ?>
</ul>

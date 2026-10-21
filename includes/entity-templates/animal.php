<?php
/**
 * Farm animal page.
 *
 * @var array    $e        Animal record from data/entities.json.
 * @var array    $all      The whole entities file.
 * @var callable $tool_url Tool permalink.
 * @var callable $ent_url  Entity permalink.
 * @var callable $guide_url Guide permalink.
 * @var callable $gold     Formats gold.
 * @var callable $link     Link to an entity page.
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

$full    = $e['full'];
$n       = function ( $v ) {
	return rtrim( rtrim( number_format( (float) $v, 2 ), '0' ), '.' );
};
$tier    = $e['rank_raw'] <= 2 ? 'one of the best earners' : ( $e['rank_raw'] > $e['of'] - 3 ? 'one of the lower earners' : 'a middle earner' );
$forage  = 'outdoor-forage' === $e['mode'];
$every   = function ( $d ) {
	return 1 === (int) $d ? 'every day' : 'every ' . (int) $d . ' days';
};
$full_d  = isset( $e['frequency_full_days'] ) ? $e['frequency_full_days'] : $e['frequency_days'];
$prof_d  = ! empty( $e['frequency_profession'] ) ? $e['frequency_profession'][0] : null;
$pace    = $forage ? 'goes outside and digs up truffles' : 'produces ' . $every( $full_d ) . ( $prof_d && (int) $prof_d['days'] !== (int) $full_d ? ' (' . $every( $prof_d['days'] ) . ' with ' . ucfirst( $prof_d['profession'] ) . ')' : '' );
// Base interval, then what friendship and a profession shorten it to (Sheep: 3, 2 at 900+ friendship, 1 with Shepherd).
$cadence = $forage ? '' : ucfirst( $every( $e['frequency_days'] ) );
if ( ! $forage && (int) $full_d !== (int) $e['frequency_days'] ) {
	$cadence .= '; ' . $every( $full_d ) . ' once friendship reaches 900 points (4.5 hearts) and you pet it';
}
if ( $prof_d && (int) $prof_d['days'] !== (int) $full_d ) {
	$cadence .= '; ' . $every( $prof_d['days'] ) . ' with the ' . ucfirst( $prof_d['profession'] ) . ' profession as well';
}
$first   = $e['products'][0];
$large   = isset( $e['products'][1] ) ? $e['products'][1] : null;
$peers   = array();
foreach ( $all['animals'] as $id => $other ) {
	if ( $id !== $e['id'] ) {
		$peers[ $id ] = $other;
	}
}
uasort(
	$peers,
	function ( $a, $b ) {
		return $b['full']['raw'] <=> $a['full']['raw'];
	}
);
?>
<?php
$bld      = isset( $e['building_needed'] ) ? $e['building_needed'] : null;
$days     = function ( $v ) use ( $n ) {
	return $v < 10 ? $n( round( $v, 1 ) ) : number_format( round( $v ) );
};
$prices_u = Stardew_Tools\Entities::prices_url();
?>
<div class="answer">
	<?php if ( $e['price'] ) : ?>
	<p class="answer__lead"><strong>Short answer:</strong> <?php echo esc_html( Stardew_Tools\Entities::article( $e['name'] ) . ' ' . $e['name'] ); ?> costs <strong><?php echo esc_html( $gold( $e['price'] ) ); ?></strong> at <?php echo esc_html( $e['shop'] ? $e['shop'] : "Marnie's Ranch" ); ?><?php if ( $bld ) : ?>, and you need a <?php echo esc_html( $bld['name'] ); ?> to buy one. Built from an empty plot, that building costs <?php echo esc_html( $gold( $bld['total']['gold'] ) ); ?> plus <?php echo esc_html( number_format( $bld['total']['wood'] ) ); ?> Wood and <?php echo esc_html( number_format( $bld['total']['stone'] ) ); ?> Stone<?php echo count( $bld['path'] ) > 1 ? ' (' . esc_html( implode( ', ', array_map( function ( $l ) use ( $gold ) { return $l['name'] . ' ' . $gold( $l['gold'] ); }, $bld['path'] ) ) ) . ')' : ''; ?>, and it holds <?php echo (int) $bld['capacity']; ?> animals<?php endif; ?>.</p>
	<?php if ( ! empty( $e['payback_days_raw'] ) ) : ?>
	<p>At five hearts it earns about <?php echo esc_html( $gold( $full['raw'] ) ); ?> a day selling its products raw, so it pays back its own price in about <?php echo esc_html( $days( $e['payback_days_raw'] ) ); ?> days<?php if ( ! empty( $e['payback_days_with_building'] ) ) : ?>, <?php echo esc_html( $days( $e['payback_days_with_building'] ) ); ?> days if it also has to pay for the whole <?php echo esc_html( $bld['name'] ); ?>, or <?php echo esc_html( $days( $e['payback_days_full_building'] ) ); ?> days as one of <?php echo (int) $bld['capacity']; ?> animals sharing the building's cost<?php endif; ?>.</p>
	<?php endif; ?>
	<?php else : ?>
	<p class="answer__lead"><strong>Short answer:</strong> the <?php echo esc_html( $e['name'] ); ?> is not sold in any shop: you hatch it from an egg<?php echo $bld ? ' in a ' . esc_html( $bld['name'] ) . ' (' . esc_html( $gold( $bld['total']['gold'] ) ) . ' to build from an empty plot)' : ''; ?>. At five hearts it earns about <?php echo esc_html( $gold( $full['raw'] ) ); ?> a day selling its products raw.</p>
	<?php endif; ?>
</div>

<p>At full friendship a <?php echo esc_html( $e['name'] ); ?> <?php echo esc_html( $pace ); ?> and earns about <?php echo esc_html( $gold( $full['raw'] ) ); ?> a day selling its products as they are, or <?php echo esc_html( $gold( $full['processed'] ) ); ?> a day made into artisan goods by an Artisan player. That makes it <?php echo esc_html( $tier ); ?> (number <?php echo (int) $e['rank_raw']; ?> of <?php echo (int) $e['of']; ?> by raw income).<?php echo $prices_u ? ' Compare every animal and building on <a href="' . esc_url( $prices_u ) . '">Stardew Valley Animal Prices</a>.' : ''; ?></p>

<h2>Quick facts</h2>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption><?php echo esc_html( $e['name'] ); ?> at a glance</caption>
	<tbody>
		<tr><th scope="row">Building</th><td><?php echo esc_html( $e['building'] ); ?></td></tr>
		<tr><th scope="row">Price</th><td><?php echo $e['price'] ? esc_html( $gold( $e['price'] ) . ' at ' . ( $e['shop'] ? $e['shop'] : "Marnie's Ranch" ) ) : 'Not sold in a shop'; ?></td></tr>
		<?php if ( $bld ) : ?>
		<tr><th scope="row"><?php echo esc_html( $bld['name'] ); ?> cost</th><td><?php echo esc_html( $gold( $bld['gold'] ) ); ?><?php echo count( $bld['path'] ) > 1 ? esc_html( ' for this upgrade; ' . $gold( $bld['total']['gold'] ) . ', ' . number_format( $bld['total']['wood'] ) . ' Wood and ' . number_format( $bld['total']['stone'] ) . ' Stone from an empty plot' ) : esc_html( ', ' . number_format( $bld['total']['wood'] ) . ' Wood and ' . number_format( $bld['total']['stone'] ) . ' Stone' ); ?> (from Robin)</td></tr>
		<?php endif; ?>
		<?php if ( ! empty( $e['payback_days_with_building'] ) ) : ?>
		<tr><th scope="row">Payback, raw</th><td><?php echo esc_html( $days( $e['payback_days_raw'] ) ); ?> days for the animal alone; <?php echo esc_html( $days( $e['payback_days_with_building'] ) ); ?> with the whole building; <?php echo esc_html( $days( $e['payback_days_full_building'] ) ); ?> with a full building's share</td></tr>
		<?php endif; ?>
		<?php if ( $e['days_to_mature'] ) : ?>
		<tr><th scope="row">Days to mature</th><td><?php echo (int) $e['days_to_mature']; ?></td></tr>
		<?php endif; ?>
		<tr><th scope="row">Produces</th><td><?php echo esc_html( $forage ? 'Truffles, found outside on dry days in spring, summer and fall' : $cadence ); ?></td></tr>
		<tr><th scope="row">Regular product</th><td><?php echo esc_html( $first['name'] ); ?> (<?php echo esc_html( $gold( $first['prices']['normal'] ) ); ?>)</td></tr>
		<?php if ( $large ) : ?>
		<tr><th scope="row">Large product</th><td><?php echo esc_html( $large['name'] ); ?> (<?php echo esc_html( $gold( $large['prices']['normal'] ) ); ?>), chance at full friendship about <?php echo esc_html( $n( $full['large_chance'] ) ); ?>%</td></tr>
		<?php endif; ?>
	</tbody>
</table>
</div>
<?php if ( ! empty( $e['payback_days_with_building'] ) ) : ?>
<p class="table-note">Payback divides the gold you spend by raw income at five hearts. The building counts its gold only: its wood and stone can be gathered for free, and hay and the days before five hearts are not counted.</p>
<?php endif; ?>

<h2>Income by hearts</h2>
<p>Animal friendship is counted in hearts, 200 points each, up to five. Friendship raises the chance of silver, gold and iridium products<?php echo $large ? ' and of the Large product' : ''; ?>, so income climbs as you pet and feed it. Gold per day for one animal, with happiness at the maximum:</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>One <?php echo esc_html( $e['name'] ); ?>, by friendship hearts</caption>
	<thead><tr><th scope="col">Hearts</th><th scope="col"><?php echo $forage ? 'Truffles' : 'Products'; ?> a day</th><th scope="col">Gold a day, raw</th><th scope="col">Gold a day, artisan goods (Artisan)</th></tr></thead>
	<tbody>
	<?php foreach ( $e['by_hearts'] as $row ) : ?>
		<tr<?php echo 5 === (int) $row['hearts'] ? ' class="is-best"' : ''; ?>><th scope="row"><?php echo (int) $row['hearts']; ?></th><td><?php echo esc_html( $n( $row['per_day'] ) ); ?></td><td><?php echo esc_html( $gold( $row['gold'] ) ); ?></td><td><?php echo esc_html( $gold( $row['processed'] ) ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<?php
$zero = $e['by_hearts'][0]['gold'];
$five = $e['by_hearts'][5]['gold'];
?>
<p>Going from no hearts to five takes a <?php echo esc_html( $e['name'] ); ?> from <?php echo esc_html( $gold( $zero ) ); ?> to <?php echo esc_html( $gold( $five ) ); ?> a day<?php echo $zero > 0 && $five > $zero ? ', an increase of ' . (int) round( ( $five / $zero - 1 ) * 100 ) . '%' : ''; ?>. <?php echo $forage ? 'For a pig the difference comes from extra truffles rather than quality, so friendship matters more here than for any other animal.' : 'Most of that comes from better quality, so petting daily in the first weeks is worth the time.'; ?></p>

<h2>Artisan goods</h2>
<?php if ( $full['machines'] ) : ?>
<p>The products of a <?php echo esc_html( $e['name'] ); ?> can be turned into artisan goods, which is where the processed column above comes from. One animal at full friendship keeps this much machine time busy:</p>
<ul>
	<?php foreach ( $full['machines'] as $m ) : ?>
	<li><?php echo esc_html( $m['name'] ); ?>: <?php echo esc_html( $n( $m['per_animal'] ) ); ?> machine(s) per animal</li>
	<?php endforeach; ?>
</ul>
<p>Machines run the whole day, so a figure below one means a single machine can look after several animals. The Artisan profession adds 40% to the price of goods like these, but not to raw products.</p>
<?php else : ?>
<p>The <?php echo esc_html( $first['name'] ); ?> is not turned into an artisan good in our data, so the raw and processed income are the same.</p>
<?php endif; ?>

<h2>Quality chances at full friendship</h2>
<?php if ( $forage ) : ?>
<p>Truffle quality depends on your Foraging skill, not on the pig, so the figures on this page use regular quality. Gatherer and Botanist raise what a truffle is worth.</p>
<?php else : ?>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Chance of each quality, five hearts, maximum mood</caption>
	<thead><tr><th scope="col">Regular</th><th scope="col">Silver</th><th scope="col">Gold</th><th scope="col">Iridium</th></tr></thead>
	<tbody><tr><td><?php echo esc_html( $n( $full['quality']['normal'] ) ); ?>%</td><td><?php echo esc_html( $n( $full['quality']['silver'] ) ); ?>%</td><td><?php echo esc_html( $n( $full['quality']['gold'] ) ); ?>%</td><td><?php echo esc_html( $n( $full['quality']['iridium'] ) ); ?>%</td></tr></tbody>
</table>
</div>
<p class="table-note">Daily luck is counted as zero, an average day.</p>
<?php endif; ?>

<?php if ( $e['conditions'] ) : ?>
<h2>What it needs each day</h2>
<ul>
	<?php foreach ( $e['conditions'] as $c ) : ?>
	<li><?php echo esc_html( ucfirst( $c ) ); ?>.</li>
	<?php endforeach; ?>
</ul>
<?php endif; ?>

<h2>How it compares</h2>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Raw gold per day at full friendship</caption>
	<thead><tr><th scope="col">Animal</th><th scope="col">Price</th><th scope="col">Gold a day</th></tr></thead>
	<tbody>
		<tr class="is-best"><th scope="row"><?php echo esc_html( $e['name'] ); ?></th><td><?php echo $e['price'] ? esc_html( $gold( $e['price'] ) ) : '—'; ?></td><td><?php echo esc_html( $gold( $full['raw'] ) ); ?></td></tr>
		<?php foreach ( array_slice( $peers, 0, 4, true ) as $id => $o ) : ?>
		<tr><th scope="row"><?php echo $link( 'animals', $id, $o['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?></th><td><?php echo $o['price'] ? esc_html( $gold( $o['price'] ) ) : '—'; ?></td><td><?php echo esc_html( $gold( $o['full']['raw'] ) ); ?></td></tr>
		<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>The animals above are the four best earners other than the <?php echo esc_html( $e['name'] ); ?>. Rank by your own hearts and professions in the <a href="<?php echo esc_url( $tool_url( 'animal-profit-calculator' ) ); ?>">Animal Profit Calculator</a>.<?php echo 'pig' === $e['id'] ? ' For whether a pig is worth the price, read <a href="' . esc_url( $guide_url( 'are-pigs-worth-it' ) ) . '">Are pigs worth it?</a>' : ''; ?></p>

<h2>Related</h2>
<ul class="related-list">
	<li><a href="<?php echo esc_url( $tool_url( 'animal-profit-calculator' ) ); ?>">Animal Profit Calculator</a><span>Gold per day for any animal, hearts and professions.</span></li>
	<?php if ( $prices_u ) : ?>
	<li><a href="<?php echo esc_url( $prices_u ); ?>">Animal prices</a><span>Every animal's price, building cost and payback in one table.</span></li>
	<?php endif; ?>
	<?php if ( $ent_url( 'animals', '' ) ) : ?>
	<li><a href="<?php echo esc_url( $ent_url( 'animals', '' ) ); ?>">All farm animals</a><span>Every animal in one table, with a CSV download.</span></li>
	<?php endif; ?>
</ul>
<?php
// Every other animal, by building, so no animal page depends on the top-four table to be found.
$animal_rows = array();
foreach ( $all['animals'] as $aid => $ae ) {
	$group = false !== strpos( $ae['building'], 'Coop' ) ? 'Coop animals' : 'Barn animals';
	if ( $aid !== $e['id'] && $ent_url( 'animals', $aid ) ) {
		$animal_rows[ $group ][] = '<a href="' . esc_url( $ent_url( 'animals', $aid ) ) . '">' . esc_html( $ae['name'] ) . '</a>';
	}
}
foreach ( $animal_rows as $group => $links ) {
	echo '<p class="entity-links">' . esc_html( $group ) . ': ' . implode( ' · ', $links ) . '</p>'; // phpcs:ignore WordPress.Security.EscapeOutput -- built from escaped parts.
}
?>

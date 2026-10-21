<?php
/**
 * Animal Prices page: every farm animal's price, the building it needs and what that building
 * costs, and how long each animal takes to pay for itself.
 *
 * @var array    $all       The whole entities file.
 * @var callable $tool_url  Tool permalink.
 * @var callable $ent_url   Entity permalink.
 * @var callable $guide_url Guide permalink.
 * @var callable $gold      Formats gold.
 * @var callable $link      Link to an entity page.
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

$rows      = $all['animals'];
$buildings = Stardew_Tools\Data::get( 'buildings' );
$levels    = $buildings ? $buildings['buildings'] : array();
$mats      = $buildings ? $buildings['materials'] : null;
$days      = function ( $v ) {
	return null === $v ? '—' : ( $v < 10 ? rtrim( rtrim( number_format( $v, 1 ), '0' ), '.' ) : number_format( round( $v ) ) ) . ' days';
};
$sold      = array_filter(
	$rows,
	function ( $a ) {
		return ! empty( $a['price'] );
	}
);
$hatched   = array_diff_key( $rows, $sold );
// Shop animals by price, cheapest first; the order a new farm meets them in.
uasort(
	$sold,
	function ( $a, $b ) {
		return $a['price'] <=> $b['price'];
	}
);
$ids       = array_keys( $sold );
$cheap     = $sold[ $ids[0] ];
$dear      = $sold[ end( $ids ) ];
$fastest   = null;
foreach ( $sold as $a ) {
	if ( ! empty( $a['payback_days_full_building'] ) && ( ! $fastest || $a['payback_days_full_building'] < $fastest['payback_days_full_building'] ) ) {
		$fastest = $a;
	}
}
$name_of   = function ( $id ) use ( $rows ) {
	return isset( $rows[ $id ] ) ? $rows[ $id ]['name'] : ucwords( str_replace( '-', ' ', $id ) );
};
$shops     = array(
	'marnie' => "Marnie's Ranch",
	'krobus' => 'Krobus',
);
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> <?php echo (int) count( $sold ); ?> of the <?php echo (int) count( $rows ); ?> farm animals are sold at Marnie's Ranch, from the <?php echo esc_html( $cheap['name'] ); ?> at <?php echo esc_html( $gold( $cheap['price'] ) ); ?> to the <?php echo esc_html( $dear['name'] ); ?> at <?php echo esc_html( $gold( $dear['price'] ) ); ?>. Each needs a Coop or Barn of the right level from Robin, which usually costs more than the animal: a <?php echo esc_html( $dear['building_needed']['name'] ); ?> for the <?php echo esc_html( $dear['name'] ); ?> is <?php echo esc_html( $gold( $dear['building_needed']['total']['gold'] ) ); ?> from an empty plot.<?php if ( $fastest ) : ?> Counting its share of a full building, the <?php echo esc_html( $fastest['name'] ); ?> pays for itself fastest, in about <?php echo esc_html( $days( $fastest['payback_days_full_building'] ) ); ?>.<?php endif; ?></p>
</div>

<h2>Every animal's price</h2>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Farm animals sold at Marnie's Ranch, cheapest first</caption>
	<thead><tr><th scope="col">Animal</th><th scope="col">Price</th><th scope="col">Building needed</th><th scope="col">Building, from empty plot</th><th scope="col">Gold a day, raw</th><th scope="col">Pays back, animal only</th><th scope="col">Pays back, full building</th></tr></thead>
	<tbody>
	<?php foreach ( $sold as $aid => $a ) : ?>
		<?php $b = $a['building_needed']; ?>
		<tr>
			<th scope="row"><?php echo $link( 'animals', $aid, $a['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?></th>
			<td><?php echo esc_html( $gold( $a['price'] ) ); ?></td>
			<td><?php echo esc_html( $b ? $b['name'] : ucfirst( $a['building'] ) ); ?></td>
			<td><?php echo $b ? esc_html( $gold( $b['total']['gold'] ) ) : '—'; ?></td>
			<td><?php echo esc_html( $gold( $a['full']['raw'] ) ); ?></td>
			<td><?php echo esc_html( $days( $a['payback_days_raw'] ) ); ?></td>
			<td><?php echo esc_html( $days( $a['payback_days_full_building'] ) ); ?></td>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p class="table-note">Gold a day is at five hearts and full mood, selling the products as they are. "Full building" adds the building's gold divided by the animals it holds, the cost per animal once it is full. Wood, stone and hay are not counted.</p>

<p>The animal's own price is rarely the big cost. A Cow is cheap at <?php echo isset( $rows['cow'] ) ? esc_html( $gold( $rows['cow']['price'] ) ) : 'its price'; ?>, but the first one also needs a Barn; a Sheep or a Pig needs the barn upgraded twice. If the first animal had to pay for its whole building alone, it would take much longer:</p>
<ul>
	<?php foreach ( $sold as $aid => $a ) : ?>
		<?php if ( ! empty( $a['payback_days_with_building'] ) ) : ?>
	<li><?php echo esc_html( $a['name'] ); ?>: <?php echo esc_html( $days( $a['payback_days_with_building'] ) ); ?> for the animal and an empty-plot <?php echo esc_html( $a['building_needed']['name'] ); ?> together, against <?php echo esc_html( $days( $a['payback_days_raw'] ) ); ?> for the animal alone.</li>
		<?php endif; ?>
	<?php endforeach; ?>
</ul>
<p>So the order you buy in matters more than any single price. Animals that share a building also share its cost, and each upgrade keeps the animals you already have.</p>

<?php if ( $levels ) : ?>
<h2>Coop and Barn costs</h2>
<p>Robin at the Carpenter's Shop builds and upgrades both. Each level holds four more animals and adds new ones; an upgrade takes two days, and the building stays in use while Robin works.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Coop and Barn at each level</caption>
	<thead><tr><th scope="col">Building</th><th scope="col">Cost of this step</th><th scope="col">Wood</th><th scope="col">Stone</th><th scope="col">From empty plot</th><th scope="col">Holds</th><th scope="col">Adds</th></tr></thead>
	<tbody>
	<?php foreach ( $levels as $b ) : ?>
		<tr>
			<th scope="row"><?php echo esc_html( $b['name'] ); ?></th>
			<td><?php echo esc_html( $gold( $b['gold'] ) ); ?></td>
			<td><?php echo esc_html( number_format( $b['materials']['wood'] ) ); ?></td>
			<td><?php echo esc_html( number_format( $b['materials']['stone'] ) ); ?></td>
			<td><?php echo esc_html( $gold( $b['total']['gold'] ) ); ?></td>
			<td><?php echo (int) $b['capacity']; ?></td>
			<td><?php echo esc_html( implode( ', ', array_map( $name_of, $b['adds_animals'] ) ) ); ?></td>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
	<?php if ( $mats ) : ?>
		<?php
		$deluxe = array();
		foreach ( $levels as $b ) {
			if ( 3 === (int) $b['level'] ) {
				$deluxe[] = $b;
			}
		}
		?>
<p class="table-note">Robin also sells Wood for <?php echo esc_html( $gold( $mats['wood']['year1'] ) ); ?> and Stone for <?php echo esc_html( $gold( $mats['stone']['year1'] ) ); ?> in year 1 (<?php echo esc_html( $gold( $mats['wood']['year2'] ) ); ?> and <?php echo esc_html( $gold( $mats['stone']['year2'] ) ); ?> from year 2). Buying every piece in year 1, <?php echo esc_html( implode( ' and ', array_map( function ( $b ) use ( $gold ) { return 'a ' . $b['name'] . ' from an empty plot comes to ' . $gold( $b['total']['gold_year1'] ); }, $deluxe ) ) ); ?>.</p>
	<?php endif; ?>
<?php endif; ?>

<?php if ( $hatched ) : ?>
<h2>Animals you hatch</h2>
<p>These are not sold in any shop. You hatch them from an egg in an incubator, so their cost is the egg and the building with the incubator.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Animals hatched from eggs</caption>
	<thead><tr><th scope="col">Animal</th><th scope="col">Building needed</th><th scope="col">Egg</th><th scope="col">Gold a day, raw</th></tr></thead>
	<tbody>
	<?php foreach ( $hatched as $aid => $a ) : ?>
		<?php $egg = ! empty( $a['acquisition']['egg']['price'] ) ? $a['acquisition']['egg'] : null; ?>
		<tr>
			<th scope="row"><?php echo $link( 'animals', $aid, $a['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?></th>
			<td><?php echo esc_html( $a['building_needed'] ? $a['building_needed']['name'] : ucfirst( $a['building'] ) ); ?></td>
			<td><?php echo $egg ? esc_html( $gold( $egg['price'] ) . ( isset( $shops[ $egg['shop'] ] ) ? ' from ' . $shops[ $egg['shop'] ] : '' ) . ( ! empty( $egg['requirement'] ) ? '. ' . $egg['requirement'] : '' ) ) : 'Not sold; found while playing'; ?></td>
			<td><?php echo esc_html( $gold( $a['full']['raw'] ) ); ?></td>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<?php endif; ?>

<h2>Which animal to buy first</h2>
<p>With a new Coop, Chickens are the only choice and cost almost nothing next to the building. With a new Barn, Cows come first. After that, upgrade the building you will fill: a full Deluxe Barn of Pigs earns the most per day, but it is also the most expensive line to build. Whether to start with a coop or a barn is covered step by step in <a href="<?php echo esc_url( $guide_url( 'coop-or-barn-first' ) ); ?>">Coop or Barn First?</a>, and pigs get their own page in <a href="<?php echo esc_url( $guide_url( 'are-pigs-worth-it' ) ); ?>">Are Pigs Worth It?</a></p>
<p>Your own hearts, professions and artisan machines change the numbers above. Set them in the <a href="<?php echo esc_url( $tool_url( 'animal-profit-calculator' ) ); ?>">Animal Profit Calculator</a>.</p>

<section class="tool-meta" aria-labelledby="prices-sources">
	<h2 id="prices-sources">Where these numbers come from</h2>
	<p>Animal and building prices come from the <a href="https://stardewvalleywiki.com/" rel="noopener">Stardew Valley Wiki</a>: each animal page, Marnie's Ranch, the Coop and Barn pages and the Carpenter's Shop, each number found on at least two of them (last checked <?php echo esc_html( Stardew_Tools\Data::checked( array( 'animals', 'buildings' ) ) ); ?>). Income comes from the same engine as the Animal Profit Calculator. See the <a href="<?php echo esc_url( home_url( '/methodology/' ) ); ?>">methodology</a>.<?php echo $ent_url( 'animals', '' ) ? ' Every animal, with artisan income: <a href="' . esc_url( $ent_url( 'animals', '' ) ) . '">All Farm Animals</a>.' : ''; ?></p>
</section>

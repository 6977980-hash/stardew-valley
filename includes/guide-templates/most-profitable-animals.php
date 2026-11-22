<?php
/**
 * Guide: Most profitable animals in Stardew Valley, ranked.
 *
 * Every number comes from data/answers.json "guides" (buildings, egg_animals, pigs), which the
 * Animal Profit Calculator engine builds from data/animals.json, plus the Rancher and Artisan
 * multipliers in data/animals.json.
 *
 * @var array    $g        data/answers.json "guides".
 * @var callable $gold     Formats gold.
 * @var callable $tool_url Tool permalink.
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

if ( empty( $g['buildings'] ) || empty( $g['egg_animals'] ) || empty( $g['pigs'] ) ) {
	return;
}
$num   = function ( $n ) {
	return rtrim( rtrim( number_format( $n, 1 ), '0' ), '.' );
};
$pct   = function ( $x ) {
	return round( $x * 100 ) . '%';
};
$pigs  = $g['pigs'];
$by    = array();
$bld   = array();
foreach ( $g['buildings'] as $b ) {
	foreach ( $b['animals'] as $a ) {
		$by[ $a['id'] ] = $a;
	}
	$bld[ $b['building'] ] = $b['levels'];
}
$eggs = array();
foreach ( $g['egg_animals'] as $e ) {
	$eggs[ $e['id'] ] = $e;
}
$chicken = $by['chicken'];
$cow     = $by['cow'];
$goat    = $by['goat'];
$sheep   = $by['sheep'];
$pig     = $by['pig'];
$duck    = $by['duck'];
$rabbit  = $by['rabbit'];
$golden  = $eggs['golden-chicken'];
$ostrich = $eggs['ostrich'];

// Rancher (+20%) applies to animal products flagged rancher in data/animals.json; truffles are
// forage, so a Pig gets nothing from it. Artisan (+40%) is already in the processed numbers.
$animals_data = Stardew_Tools\Data::get( 'animals' );
$rancher_mult = isset( $animals_data['professions']['rancher']['sell_multiplier'] ) ? (float) $animals_data['professions']['rancher']['sell_multiplier'] : 1.2;
$artisan_mult = isset( $animals_data['professions']['artisan']['sell_multiplier'] ) ? (float) $animals_data['professions']['artisan']['sell_multiplier'] : 1.4;
$rancher_ok   = array();
$prod_flag    = array();
foreach ( $animals_data ? $animals_data['products'] : array() as $pr ) {
	$prod_flag[ $pr['id'] ] = ! empty( $pr['rancher'] );
}
$freq = array();
foreach ( $animals_data ? $animals_data['animals'] : array() as $an ) {
	$regular                = isset( $an['products']['regular'] ) ? $an['products']['regular'] : '';
	$rancher_ok[ $an['id'] ] = isset( $prod_flag[ $regular ] ) ? $prod_flag[ $regular ] : false;
	$freq[ $an['id'] ]       = isset( $an['produce']['frequency_days'] ) ? $an['produce']['frequency_days'] : null;
}

// Days in a year an animal produces: every day (fed hay in winter), except the Pig, which only
// finds truffles on dry days outside winter. 84 is the most a Pig can have, before rain.
$days_year = 112;
$pig_days  = 84;

// One ranking of every animal, bought or hatched, at five hearts.
$rank = array();
foreach ( $by as $a ) {
	$rank[] = array(
		'id'        => $a['id'],
		'name'      => $a['name'],
		'building'  => $a['building_name'],
		'price'     => $a['price'],
		'raw'       => $a['hearts5'],
		'processed' => $a['processed5'],
		'hatched'   => false,
	);
}
foreach ( $g['egg_animals'] as $e ) {
	$rank[] = array(
		'id'        => $e['id'],
		'name'      => $e['name'],
		'building'  => $e['building_name'],
		'price'     => null,
		'raw'       => $e['hearts5'],
		'processed' => $e['processed5'],
		'hatched'   => true,
	);
}
usort(
	$rank,
	function ( $a, $b ) {
		return $b['raw'] <=> $a['raw'];
	}
);
$rank_proc = $rank;
usort(
	$rank_proc,
	function ( $a, $b ) {
		return $b['processed'] <=> $a['processed'];
	}
);
$bought = array_values(
	array_filter(
		$rank,
		function ( $r ) {
			return ! $r['hatched'];
		}
	)
);
$second = $bought[1];
$deluxe = 12;
$animal_link = function ( $id, $name ) {
	$u = Stardew_Tools\Entities::url( 'animals', $id );
	return $u ? '<a href="' . esc_url( $u ) . '">' . esc_html( $name ) . '</a>' : esc_html( $name );
};
$calc      = $tool_url( 'animal-profit-calculator' );
$pigs_g    = Stardew_Tools\Guides::guide_url( 'are-pigs-worth-it' );
$coop_g    = Stardew_Tools\Guides::guide_url( 'coop-or-barn-first' );
$prices_u  = Stardew_Tools\Entities::prices_url();
$deluxe_b  = end( $bld['barn'] );
$deluxe_c  = end( $bld['coop'] );
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> the <strong><?php echo $animal_link( 'pig', $pig['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $animal_link. ?></strong> is the most profitable animal in Stardew Valley by a wide margin: about <?php echo esc_html( $gold( $pig['hearts5'] ) ); ?> a day at five hearts selling truffles raw, and <?php echo esc_html( $gold( $pig['processed5'] ) ); ?> a day as Truffle Oil with the Artisan profession. The next best animal you can buy, the <?php echo esc_html( $second['name'] ); ?>, makes <?php echo esc_html( $gold( $second['raw'] ) ); ?>. The catch: a Pig costs <?php echo esc_html( $gold( $pig['price'] ) ); ?>, needs a <?php echo esc_html( $pig['building_name'] ); ?>, and finds nothing in winter or on rainy days.</p>
	<p>For a small budget the <?php echo esc_html( $cow['name'] ); ?> (<?php echo esc_html( $gold( $cow['price'] ) ); ?>, <?php echo esc_html( $gold( $cow['hearts5'] ) ); ?> a day) and the <?php echo esc_html( $chicken['name'] ); ?> (<?php echo esc_html( $gold( $chicken['price'] ) ); ?>, <?php echo esc_html( $gold( $chicken['processed5'] ) ); ?> a day as mayonnaise) pay themselves back fastest. If you can hatch one, a <?php echo esc_html( $golden['name'] ); ?> earns <?php echo esc_html( $gold( $golden['hearts5'] ) ); ?> a day, more than any animal except the Pig.</p>
</div>

<h2>Every farm animal ranked by gold per day</h2>
<p>The table ranks all <?php echo count( $rank ); ?> animals by what one of them earns on a day it produces, at five hearts (full friendship), with a normal mood, no professions and average luck. "Artisan goods" is the same animal with its products made into Mayonnaise, Cheese, Cloth or Truffle Oil and sold with the Artisan profession. A product that takes several days, like wool from a Sheep or Rabbit, is spread over those days, so every row is comparable.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Most profitable animals in Stardew Valley at five hearts, per producing day</caption>
	<thead><tr><th scope="col">#</th><th scope="col">Animal</th><th scope="col" class="num">Raw / day</th><th scope="col" class="num">Artisan goods / day</th><th scope="col">Price</th><th scope="col">Building</th></tr></thead>
	<tbody>
	<?php foreach ( $rank as $i => $r ) : ?>
		<tr<?php echo 0 === $i ? ' class="is-best"' : ''; ?>>
			<td><?php echo (int) $i + 1; ?></td>
			<th scope="row"><?php echo $animal_link( $r['id'], $r['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $animal_link. ?><?php echo $r['hatched'] ? ' <span class="tag">hatched</span>' : ''; ?></th>
			<td class="num"><strong><?php echo esc_html( $gold( $r['raw'] ) ); ?></strong></td>
			<td class="num"><?php echo esc_html( $gold( $r['processed'] ) ); ?></td>
			<td><?php echo null === $r['price'] ? 'not sold' : esc_html( $gold( $r['price'] ) ); ?></td>
			<td><?php echo esc_html( $r['building'] ); ?></td>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p class="table-note">Five hearts, normal mood, regular feed, daily luck 0, no Rancher. Hatched animals are not sold by Marnie; you hatch them from an egg in an Incubator. Change hearts, mood and professions for any animal in the <a href="<?php echo esc_url( $calc ); ?>">Animal Profit Calculator</a>.</p>
<p>Three things stand out. First, the Pig is in a class of its own: <?php echo esc_html( $num( $pig['hearts5'] / $second['raw'] ) ); ?> times the next best bought animal selling raw, and <?php echo esc_html( $num( $pig['processed5'] / $rank_proc[1]['processed'] ) ); ?> times the next best with artisan goods (the <?php echo esc_html( $rank_proc[1]['name'] ); ?>, at <?php echo esc_html( $gold( $rank_proc[1]['processed'] ) ); ?>). Second, the Golden Chicken is the only other animal that comes close, and you can't buy one. Third, the animals in the middle (Cow, Goat, Sheep, Rabbit, Chicken) are within a few hundred gold of each other, so for them the price and the building matter more than the ranking.</p>

<h2>Raw or processed: which animal gains most from machines?</h2>
<p>Processing changes the order a lot. Selling raw, the <?php echo esc_html( $cow['name'] ); ?> beats the <?php echo esc_html( $sheep['name'] ); ?>; with a Loom and the Artisan profession, the <?php echo esc_html( $sheep['name'] ); ?> wins. The table shows how much each bought animal gains when its products go through a machine, and how much machine time one animal at full hearts keeps busy.</p>
<?php
$gain = $bought;
usort(
	$gain,
	function ( $a, $b ) {
		return ( $b['processed'] / max( 1, $b['raw'] ) ) <=> ( $a['processed'] / max( 1, $a['raw'] ) );
	}
);
?>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Gain from artisan goods with the Artisan profession, five hearts</caption>
	<thead><tr><th scope="col">Animal</th><th scope="col" class="num">Raw</th><th scope="col" class="num">Processed</th><th scope="col" class="num">Gain</th><th scope="col">Machine per animal</th></tr></thead>
	<tbody>
	<?php foreach ( $gain as $r ) : ?>
		<?php $m = ! empty( $by[ $r['id'] ]['machines'][0] ) ? $by[ $r['id'] ]['machines'][0] : null; ?>
		<tr><th scope="row"><?php echo esc_html( $r['name'] ); ?></th><td class="num"><?php echo esc_html( $gold( $r['raw'] ) ); ?></td><td class="num"><?php echo esc_html( $gold( $r['processed'] ) ); ?></td><td class="num">+<?php echo esc_html( $pct( $r['processed'] / max( 1, $r['raw'] ) - 1 ) ); ?></td><td><?php echo $m ? esc_html( rtrim( rtrim( number_format( $m['per_animal'], 2 ), '0' ), '.' ) . ' ' . $m['name'] ) : ''; ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>The <?php echo esc_html( $gain[0]['name'] ); ?> gains the most from processing (+<?php echo esc_html( $pct( $gain[0]['processed'] / max( 1, $gain[0]['raw'] ) - 1 ) ); ?>), so if you plan to run a Mayonnaise Machine anyway, a coop full of chickens is far better than its raw numbers suggest. The <?php echo esc_html( end( $gain )['name'] ); ?> gains the least, which is why it is the easiest animal to sell raw. Machine time is the other half of the story: one Mayonnaise Machine handles about <?php echo esc_html( $num( 1 / max( 0.01, $chicken['machines'][0]['per_animal'] ) ) ); ?> chickens, while one Pig keeps about <?php echo esc_html( $num( $pigs['oil_makers_per_pig'] ) ); ?> of an Oil Maker busy, so a barn of 12 pigs needs about <?php echo (int) ceil( $deluxe * $pigs['oil_makers_per_pig'] ); ?> Oil Makers to turn every truffle into oil. With fewer machines, process what you can and sell the rest raw; truffles never go bad in a chest.</p>
<p>Artisan multiplies the price of artisan goods by <?php echo esc_html( $num( $artisan_mult ) ); ?> (40% more), and Truffle Oil counts. The numbers above already include it. Without Artisan, processing still pays for every animal, but by less: Truffle Oil sells for <?php echo esc_html( $gold( $pigs['oil']['price'] ) ); ?> against <?php echo esc_html( $gold( $pigs['oil']['artisan'] ) ); ?> with the profession, a Pig makes <?php echo esc_html( $gold( $pigs['oil_per_day'] ) ); ?> a day as oil instead of <?php echo esc_html( $gold( $pigs['oil_artisan_per_day'] ) ); ?>.</p>

<h2>Rancher or Artisan?</h2>
<p>At Farming level 5 you pick Rancher (animal products worth 20% more) or Tiller (crops worth 10% more), and at level 10 a Rancher picks Coopmaster or Shepherd. The Artisan profession sits on the Tiller side. So the real choice for an animal farm is Rancher at level 5 or Artisan at level 10, and the data makes it fairly clear:</p>
<ul>
	<li><strong>Rancher</strong> multiplies raw animal products by <?php echo esc_html( $num( $rancher_mult ) ); ?>. A Cow goes from <?php echo esc_html( $gold( $cow['hearts5'] ) ); ?> to about <?php echo esc_html( $gold( $cow['hearts5'] * $rancher_mult ) ); ?> a day and a Chicken from <?php echo esc_html( $gold( $chicken['hearts5'] ) ); ?> to about <?php echo esc_html( $gold( $chicken['hearts5'] * $rancher_mult ) ); ?>.<?php echo empty( $rancher_ok['pig'] ) ? ' It does nothing for the Pig: truffles are foraged items, not animal products.' : ''; ?></li>
	<li><strong>Artisan</strong> is worth more for every animal once you have the machines: a Cow as cheese makes <?php echo esc_html( $gold( $cow['processed5'] ) ); ?>, well above <?php echo esc_html( $gold( $cow['hearts5'] * $rancher_mult ) ); ?> raw with Rancher, and a Pig as Truffle Oil makes <?php echo esc_html( $gold( $pig['processed5'] ) ); ?>.</li>
</ul>
<p>Rancher is still a good pick for the levels 5 to 9 stretch if most of your income is animals sold raw, and the choice is not final: the Statue of Uncertainty in the Sewers lets you pick again. But if you will be running a Pig barn with Oil Makers, Tiller then Artisan is the path that pays: the Pig alone earns more from Artisan than a whole barn of cows earns from Rancher.</p>

<h2>A full building of each</h2>
<p>Per animal is only half the picture, because buildings cost more than the animals and hold a fixed number. The <?php echo esc_html( $deluxe_b['name'] ); ?> and <?php echo esc_html( $deluxe_c['name'] ); ?> hold <?php echo (int) $deluxe; ?> animals each. Here is what a full building of one kind earns on a producing day, and over a <?php echo (int) $days_year; ?>-day year:</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Twelve animals of one kind at five hearts</caption>
	<thead><tr><th scope="col">Building of 12</th><th scope="col" class="num">Raw / day</th><th scope="col" class="num">Artisan / day</th><th scope="col" class="num">Raw / year</th><th scope="col">Days counted</th></tr></thead>
	<tbody>
	<?php foreach ( $rank as $r ) : ?>
		<?php
		if ( in_array( $r['id'], array( 'void-chicken', 'dinosaur' ), true ) ) {
			continue;
		}
		$d = 'pig' === $r['id'] ? $pig_days : $days_year;
		?>
		<tr><th scope="row"><?php echo esc_html( $r['name'] ); ?></th><td class="num"><?php echo esc_html( $gold( $r['raw'] * $deluxe ) ); ?></td><td class="num"><?php echo esc_html( $gold( $r['processed'] * $deluxe ) ); ?></td><td class="num"><?php echo esc_html( $gold( $r['raw'] * $deluxe * $d ) ); ?></td><td><?php echo 'pig' === $r['id'] ? 'at most ' . (int) $pig_days . ' (no winter, minus rain)' : (int) $days_year; ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p class="table-note">The year column assumes every animal is fed (hay in winter) and at five hearts all year. Pigs stay inside in winter and in rain, so their row is a ceiling: real years have some rainy days in spring, summer and fall too.</p>
<p>Even after losing all of winter, a barn of pigs earns about <?php echo esc_html( $num( ( $pig['hearts5'] * $pig_days ) / ( $cow['hearts5'] * $days_year ) ) ); ?> times what a barn of cows does over a year, selling raw. The building is the same <?php echo esc_html( $deluxe_b['name'] ); ?> either way (cows can live in any barn), so once you own one, every slot you give a pig instead of a cow is worth it. The real limit is the price of the pigs: twelve of them cost <?php echo esc_html( $gold( $pig['price'] * $deluxe ) ); ?>.</p>

<h2>Best value for your gold</h2>
<p>If you only have a few thousand gold, the question is not which animal earns the most, but which one pays for itself first. Counting only the animal's price, at full hearts:</p>
<?php
$pay = $bought;
usort(
	$pay,
	function ( $a, $b ) {
		return ( $a['price'] / max( 1, $a['raw'] ) ) <=> ( $b['price'] / max( 1, $b['raw'] ) );
	}
);
?>
<ul>
	<?php foreach ( $pay as $r ) : ?>
	<li><strong><?php echo esc_html( $r['name'] ); ?>:</strong> <?php echo esc_html( $gold( $r['price'] ) ); ?>, back in about <?php echo esc_html( $num( $r['price'] / max( 1, $r['raw'] ) ) ); ?> producing days raw, or <?php echo esc_html( $num( $r['price'] / max( 1, $r['processed'] ) ) ); ?> with artisan goods.</li>
	<?php endforeach; ?>
</ul>
<p>The Chicken, Cow and Pig all pay back in a week or two of good days, which is why they are the three animals worth building around. The Rabbit and Sheep take much longer for what they make, and the Goat sits in between. The buildings change this: a Barn costs <?php echo esc_html( $gold( $bld['barn'][0]['gold'] ) ); ?> and a Coop <?php echo esc_html( $gold( $bld['coop'][0]['gold'] ) ); ?> before wood and stone. <?php echo $coop_g ? 'The <a href="' . esc_url( $coop_g ) . '">Coop or Barn First</a> guide works out payback with the building included, and which one to build first.' : ''; ?><?php echo $prices_u ? ' Every animal and building price is on <a href="' . esc_url( $prices_u ) . '">Animal Prices</a>.' : ''; ?></p>

<h2>Friendship decides the income</h2>
<p>All the numbers so far are at five hearts. A new animal earns much less, because friendship raises product quality and the chance of large products, and for the Pig the number of truffles it digs up.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Raw gold per day by friendship</caption>
	<thead><tr><th scope="col">Animal</th><th scope="col" class="num">0 hearts</th><th scope="col" class="num">3 hearts</th><th scope="col" class="num">5 hearts</th><th scope="col" class="num">Growth</th></tr></thead>
	<tbody>
	<?php foreach ( $bought as $r ) : ?>
		<?php $a = $by[ $r['id'] ]; ?>
		<tr><th scope="row"><?php echo esc_html( $a['name'] ); ?></th><td class="num"><?php echo esc_html( $gold( $a['hearts0'] ) ); ?></td><td class="num"><?php echo esc_html( $gold( $a['hearts3'] ) ); ?></td><td class="num"><?php echo esc_html( $gold( $a['hearts5'] ) ); ?></td><td class="num">x<?php echo esc_html( $num( $a['hearts5'] / max( 1, $a['hearts0'] ) ) ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>The Pig gains the most gold from friendship, from <?php echo esc_html( $gold( $pig['hearts0'] ) ); ?> to <?php echo esc_html( $gold( $pig['hearts5'] ) ); ?>, because its extra truffles depend on friendship. Even a brand-new Pig earns more than any animal you can buy does at full hearts. Petting each animal every day, feeding them, and letting them out on dry days are free and raise income more than buying another animal would. The <?php echo $pigs_g ? '<a href="' . esc_url( $pigs_g ) . '">Are Pigs Worth It?</a>' : 'Are Pigs Worth It?'; ?> guide breaks the Pig down heart by heart.</p>

<h2>Hatched animals: Golden Chicken and Ostrich</h2>
<p>Four animals can't be bought from Marnie. You hatch them from an egg in an Incubator (or, for the Ostrich, an Ostrich Incubator):</p>
<ul>
	<?php foreach ( $g['egg_animals'] as $e ) : ?>
	<li><strong><?php echo esc_html( $e['name'] ); ?></strong> (<?php echo esc_html( $e['building_name'] ); ?>): <?php echo esc_html( $gold( $e['hearts5'] ) ); ?> a day raw, <?php echo esc_html( $gold( $e['processed5'] ) ); ?> processed.</li>
	<?php endforeach; ?>
</ul>
<p>The <?php echo esc_html( $golden['name'] ); ?> is the second most profitable animal in the game, at <?php echo esc_html( $gold( $golden['hearts5'] ) ); ?> a day raw. The wiki says: "<?php echo esc_html( $golden['how'] ); ?>" Once you have one, it is a clear upgrade over a regular chicken in the same coop slot. The <?php echo esc_html( $ostrich['name'] ); ?> lays one egg a week, so it earns little raw (<?php echo esc_html( $gold( $ostrich['hearts5'] ) ); ?> a day), but one Ostrich Egg makes many jars of Mayonnaise, which lifts it to <?php echo esc_html( $gold( $ostrich['processed5'] ) ); ?> a day processed. The Void Chicken and Dinosaur are novelties rather than earners.</p>

<h2>What to buy at each stage</h2>
<ol>
	<li><strong>First animals (Year 1, spring or summer):</strong> a Coop and Chickens, or a Barn and a Cow if you can afford <?php echo esc_html( $gold( $bld['barn'][0]['gold'] + $cow['price'] ) ); ?>. Both pay back fast, and the Cow out-earns the Chicken selling raw from day one.</li>
	<li><strong>Add machines before more animals:</strong> a Mayonnaise Machine and a Cheese Press raise a Chicken from <?php echo esc_html( $gold( $chicken['hearts5'] ) ); ?> to <?php echo esc_html( $gold( $chicken['processed5'] ) ); ?> and a Cow from <?php echo esc_html( $gold( $cow['hearts5'] ) ); ?> to <?php echo esc_html( $gold( $cow['processed5'] ) ); ?> a day, for a few crafting materials each.</li>
	<li><strong>Save for the <?php echo esc_html( $deluxe_b['name'] ); ?>:</strong> it costs <?php echo esc_html( $gold( $deluxe_b['total'] ) ); ?> in gold from an empty plot. Buy your first Pig early in spring so it has three seasons to dig before winter.</li>
	<li><strong>Fill the barn with Pigs, one at a time:</strong> each new Pig pays itself back in about <?php echo esc_html( $num( $pigs['payback_raw'] ) ); ?> good days selling raw. Keep a few cows or goats if you want cheese in winter.</li>
	<li><strong>Late game:</strong> build Oil Makers to match your pigs, take Artisan, and hatch a Golden Chicken if you find a Golden Egg.</li>
</ol>

<h2>What these numbers leave out</h2>
<ul>
	<li><strong>Feed.</strong> Hay is not counted. Animals eat grass outside for free in spring, summer and fall; a Silo stores cut grass as hay for winter.</li>
	<li><strong>Rainy days.</strong> Only the Pig loses them. Other animals produce inside as long as they are fed.</li>
	<li><strong>Quality from friendship takes time.</strong> Five hearts takes weeks of petting; until then use the zero- or three-heart numbers.</li>
	<li><strong>Professions other than Artisan.</strong> Coopmaster and Shepherd speed up friendship and some products; the calculator shows their effect.</li>
	<li><strong>Your time.</strong> A big barn means daily petting and refilling machines. If that's a chore, a smaller barn of pigs still earns more than a large one of anything else.</li>
</ul>

<?php
Stardew_Tools\Guides::quick_questions(
	array(
		'What is the most profitable animal in Stardew Valley?' => 'The Pig: about ' . esc_html( $gold( $pig['hearts5'] ) ) . ' a day at five hearts selling truffles raw, or ' . esc_html( $gold( $pig['processed5'] ) ) . ' as Truffle Oil with Artisan. It only works on dry days outside winter.',
		'What is the most profitable animal you can buy cheaply?' => 'The Cow: ' . esc_html( $gold( $cow['price'] ) ) . ' for ' . esc_html( $gold( $cow['hearts5'] ) ) . ' a day at five hearts, back in about ' . esc_html( $num( $cow['price'] / $cow['hearts5'] ) ) . ' days. The Chicken is cheaper still and best if you make mayonnaise.',
		'Are sheep worth it in Stardew Valley?'                   => 'Only with a Loom and Artisan. A Sheep earns ' . esc_html( $gold( $sheep['hearts5'] ) ) . ' a day raw, less than a Cow that costs far less, but ' . esc_html( $gold( $sheep['processed5'] ) ) . ' a day as Cloth.',
		'Are ostriches worth it?'                                 => 'For mayonnaise, yes: ' . esc_html( $gold( $ostrich['processed5'] ) ) . ' a day processed against ' . esc_html( $gold( $ostrich['hearts5'] ) ) . ' raw. It lays one egg a week and lives in a Barn.',
		'Does Rancher work on truffles?'                          => empty( $rancher_ok['pig'] ) ? 'No. Truffles are foraged items, so Rancher does not raise their price. Truffle Oil does get the Artisan bonus.' : 'Yes, Rancher raises the truffle price by 20%.',
		'Which coop animal makes the most money?'                 => 'The Golden Chicken if you can hatch one (' . esc_html( $gold( $golden['hearts5'] ) ) . ' a day). Of the ones Marnie sells, the Chicken processed into mayonnaise (' . esc_html( $gold( $chicken['processed5'] ) ) . ' a day).',
	)
);
?>

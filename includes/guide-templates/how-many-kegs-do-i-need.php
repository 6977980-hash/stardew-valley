<?php
/**
 * Guide: How many kegs do I need?
 *
 * @var array    $g        data/answers.json "guides".
 * @var callable $gold     Formats gold.
 * @var callable $tool_url Tool permalink.
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

$kegs = isset( $g['kegs'] ) ? $g['kegs'] : null;
if ( ! $kegs ) {
	return;
}
$k = array();
foreach ( $kegs as $r ) {
	$k[ $r['id'] ] = $r;
}
$gh   = $g['greenhouse'];
$num  = function ( $n ) {
	return rtrim( rtrim( number_format( $n, 2 ), '0' ), '.' );
};
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> about <strong>9 kegs for every 10 Ancient Fruit</strong> plants, <strong>1 keg for every 2 Starfruit</strong>, and <strong>14 kegs for every 10 Hops</strong>. A full greenhouse of <?php echo (int) $gh['tiles']; ?> Ancient Fruit needs <?php echo (int) ceil( $k['ancient-fruit']['kegs_per_plant'] * $gh['tiles'] ); ?> kegs to never fall behind. Blueberries and Cranberries make so much fruit that kegging all of it is rarely realistic.</p>
</div>

<p>The question is really: how many kegs does one plant keep busy? A keg takes a fixed time per item, and a plant gives fruit at a fixed pace. Divide one by the other and you get kegs per plant. Below that number, fruit piles up in a chest. Above it, kegs sit empty.</p>

<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Kegs needed to keep up with one plant</caption>
	<thead><tr><th scope="col">Crop</th><th scope="col">Items a day per plant</th><th scope="col">Keg makes</th><th scope="col">Days per keg run</th><th scope="col">Kegs per plant</th><th scope="col">Kegs per 100 plants</th></tr></thead>
	<tbody>
	<?php foreach ( $kegs as $r ) : ?>
		<tr>
			<th scope="row"><?php echo esc_html( $r['name'] ); ?></th>
			<td><?php echo esc_html( $num( $r['items_per_day'] ) ); ?></td>
			<td><?php echo esc_html( $r['keg_product'] ); ?></td>
			<td><?php echo esc_html( $num( $r['keg_days'] ) ); ?></td>
			<td><?php echo esc_html( $num( $r['kegs_per_plant'] ) ); ?></td>
			<td><?php echo (int) $r['kegs_per_100']; ?></td>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p class="table-note">Items a day is the long-run pace once a plant is producing: one harvest every regrow cycle for regrowing crops, or one every growing cycle if you replant. Average extra items per harvest are included, at farming level 0. Keg times use the wiki's 1,600 game minutes per day.</p>

<h2>How the numbers work</h2>
<p>Take Ancient Fruit. It regrows every 7 days, so one plant gives 1 fruit a week. Wine takes 10,000 minutes in a keg, which is <?php echo esc_html( $num( $k['ancient-fruit']['keg_days'] ) ); ?> days. One keg finishes a bit more than a week's fruit in a week, so each plant needs <?php echo esc_html( $num( $k['ancient-fruit']['kegs_per_plant'] ) ); ?> of a keg. Round up per 10 plants and you get 9.</p>
<p>Hops go the other way. A Hops vine gives one cone every day, and Pale Ale takes <?php echo esc_html( $num( $k['hops']['keg_days'] ) ); ?> days. One vine keeps <?php echo esc_html( $num( $k['hops']['kegs_per_plant'] ) ); ?> kegs busy, so 100 vines need <?php echo (int) $k['hops']['kegs_per_100']; ?> kegs. That is why Hops look amazing on paper and disappoint on a farm with 30 kegs.</p>

<h2>Berries: don't try to keg them all</h2>
<p>A Blueberry plant averages about <?php echo esc_html( $num( $k['blueberry']['items_per_day'] ) ); ?> berries a day once it is producing. Keeping up would take <?php echo esc_html( $num( $k['blueberry']['kegs_per_plant'] ) ); ?> kegs per plant, or <?php echo (int) $k['blueberry']['kegs_per_100']; ?> kegs for 100 plants. Cranberries need <?php echo esc_html( $num( $k['cranberries']['kegs_per_plant'] ) ); ?> per plant. Nobody has that many. Keg what you can, put the rest in Preserves Jars or sell it raw, and spend your kegs on fruit that is worth more per keg-day. The <a href="<?php echo esc_url( $tool_url( 'keg-vs-preserves-jar' ) ); ?>">Keg vs Preserves Jar</a> tool splits a harvest across the machines you own.</p>

<h2>A full greenhouse</h2>
<p>With 6 Iridium Sprinklers the greenhouse has <?php echo (int) $gh['tiles']; ?> plantable tiles. Planted with one crop:</p>
<ul>
	<li>Ancient Fruit: <?php echo (int) ceil( $k['ancient-fruit']['kegs_per_plant'] * $gh['tiles'] ); ?> kegs.</li>
	<li>Starfruit: <?php echo (int) ceil( $k['starfruit']['kegs_per_plant'] * $gh['tiles'] ); ?> kegs.</li>
	<li>Hops: <?php echo (int) ceil( $k['hops']['kegs_per_plant'] * $gh['tiles'] ); ?> kegs.</li>
</ul>
<p>If you have fewer kegs than that, the best crop changes. Our <a href="<?php echo esc_url( Stardew_Tools\Guides::guide_url( 'best-greenhouse-setup-for-money' ) ); ?>">greenhouse money guide</a> shows which crop wins at 20, 50 and 100 kegs, and the <a href="<?php echo esc_url( $tool_url( 'greenhouse-planner' ) ); ?>">Greenhouse Planner</a> counts the machines for any mix of crops.</p>

<h2>Kegs or Preserves Jars?</h2>
<p>A jar is faster than a keg: 4,000 minutes (2.5 days) for any fruit or vegetable. So it takes fewer jars to keep up, for example <?php echo esc_html( $num( $k['ancient-fruit']['jars_per_plant'] ) ); ?> jars per Ancient Fruit plant against <?php echo esc_html( $num( $k['ancient-fruit']['kegs_per_plant'] ) ); ?> kegs. Wine is worth much more than jelly for expensive fruit though, so for Ancient Fruit and Starfruit, more kegs are the better use of your materials. For cheap fruit the jar often wins. The Keg vs Preserves Jar tool shows the gold per machine for every crop.</p>

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

<h2>Kegs for the plot you actually have</h2>
<p>Few farms are 100 plants of one crop. This table turns the per-plant figure into kegs for plots of 10, 25 and 50 plants, rounded up, because you can't own a third of a keg.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Kegs to keep up with a plot</caption>
	<thead><tr><th scope="col">Crop</th><th scope="col">10 plants</th><th scope="col">25 plants</th><th scope="col">50 plants</th></tr></thead>
	<tbody>
	<?php foreach ( array( 'ancient-fruit', 'starfruit', 'pineapple', 'melon', 'pumpkin', 'hops', 'wheat' ) as $id ) : ?>
		<tr>
			<th scope="row"><?php echo esc_html( $k[ $id ]['name'] ); ?></th>
			<?php foreach ( array( 10, 25, 50 ) as $n ) : ?>
			<td><?php echo (int) ceil( $k[ $id ]['kegs_per_plant'] * $n ); ?></td>
			<?php endforeach; ?>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>Use it as a ceiling, not a target. Ancient Fruit and Pineapple both need <?php echo (int) ceil( $k['ancient-fruit']['kegs_per_plant'] * 25 ); ?> kegs for 25 plants, nearly one keg per plant, because each plant gives one fruit every 7 days and Wine takes 6.25 days. If you have 15 kegs, fifteen kegs are always busy and the other ten plants' fruit goes into a chest or a jar. That's not a problem. It means your next keg is worth building, which is the real use of this table.</p>

<h2>What a keg is worth</h2>
<p>More kegs only help if the extra output sells for enough. This is the gold a keg adds per day it runs, over the raw price of the item, at farming level 0 with the Artisan profession:</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Gold added per keg per day</caption>
	<thead><tr><th scope="col">Crop</th><th scope="col">Product</th><th scope="col">Gold per keg per day</th></tr></thead>
	<tbody>
	<?php foreach ( $gh['per_keg_day'] as $r ) : ?>
		<tr><th scope="row"><?php echo esc_html( $r['name'] ); ?></th><td><?php echo esc_html( $r['product'] ); ?></td><td><?php echo esc_html( $gold( $r['gain'] ) ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>A Starfruit keg adds <?php echo esc_html( $gold( $gh['per_keg_day'][0]['gain'] ) ); ?> a day, and Pineapple only <?php echo esc_html( $gold( $gh['per_keg_day'][3]['gain'] ) ); ?>. So when kegs are scarce, fill them with Starfruit first, Ancient Fruit and Hops next, and leave Pineapple for jars or the shipping bin. A keg costs a fixed amount of materials whatever you put in it. The dearer the fruit, the faster it pays for itself.</p>

<h2>What kegs cost to build</h2>
<p>One Keg is <?php echo esc_html( implode( ', ', array_map( function ( $m ) { return number_format( $m['qty'] ) . ' ' . $m['name']; }, $g['costs']['keg']['materials'] ) ) ); ?>. It unlocks at <?php echo esc_html( $g['costs']['keg']['obtained'] ); ?>. The ore and coal include smelting the Copper Bar and Iron Bar the recipe asks for. Fifty kegs, which is a serious winery, comes to <?php echo esc_html( implode( ', ', array_map( function ( $m ) { return number_format( $m['qty'] ) . ' ' . $m['name']; }, $g['costs']['kegs_50']['materials'] ) ) ); ?>.</p>
<p>Wood is the easy part. The limit is Oak Resin and the coal for smelting, so most players grow their keg count slowly across seasons, adding a few at a time as fruit starts to pile up. A Preserves Jar is <?php echo esc_html( implode( ', ', array_map( function ( $m ) { return number_format( $m['qty'] ) . ' ' . $m['name']; }, $g['costs']['preserves-jar']['materials'] ) ) ); ?> and has no ore at all, which is why jars are the cheaper machine to scale. The <a href="<?php echo esc_url( $tool_url( 'crafting-calculator' ) ); ?>">Crafting Calculator</a> adds up the materials for any number of either.</p>

<h2>A sensible build order</h2>
<ol>
	<li><strong>Start with one keg per five plants of your best fruit.</strong> That keeps pace with about a fifth of the harvest and costs a handful of materials. See how fast fruit piles up before you build more.</li>
	<li><strong>Add kegs whenever you carry more than a few unprocessed fruit around.</strong> Fruit in a chest is money you haven't collected yet.</li>
	<li><strong>Use jars as overflow.</strong> They finish in 2.5 days, so a small number of jars absorbs a lot of surplus fruit.</li>
	<li><strong>Don't build past the table.</strong> Once your kegs equal the figure for your plot, extra kegs sit empty.</li>
</ol>

<h2>Why the plan changes with luck and levels</h2>
<p>The figures use average yields at farming level 0. Higher levels raise the average number of items per harvest for crops that can drop extra, like Blueberries and Cranberries, so those two need more machines than shown once your level is up. Single-item crops such as Ancient Fruit and Starfruit don't change, so their numbers hold at any level. If a table figure and your own chest disagree, trust the chest and adjust.</p>

<h2>One-harvest crops arrive in a burst</h2>
<p>Everything above is a steady pace. A crop that gives one harvest and is then replanted, like Pumpkin, doesn't work that way: all of its fruit shows up on the same day. Fifty Pumpkin plants give fifty pumpkins at once. Juice takes <?php echo esc_html( $num( $k['pumpkin']['keg_days'] ) ); ?> days in a keg, so with 10 kegs the last pumpkin is in a keg after five rounds, about <?php echo esc_html( $num( 5 * $k['pumpkin']['keg_days'] ) ); ?> days later. With 50 kegs it all starts the same day. Neither is wrong. Fewer kegs just stretch the work over more days, and the products come out the same.</p>

<h2>Mistakes that waste kegs</h2>
<ul>
	<li><strong>Sizing for the whole farm.</strong> Work out kegs crop by crop and add them up. A mixed plot needs less than the biggest single-crop figure.</li>
	<li><strong>Keeping kegs full of cheap fruit.</strong> A keg busy with a low-value fruit is a keg that can't take Starfruit. Check the gold-per-keg table before you fill them.</li>
	<li><strong>Leaving a finished keg alone.</strong> Wine only counts when you collect it. A full keg is an idle keg.</li>
	<li><strong>Treating the table as a promise.</strong> Real harvests vary. Use the figures to decide how many kegs to build next, not to decide you are finished.</li>
</ul>

<?php
/**
 * Guide: Speed-Gro vs Fertilizer.
 *
 * @var array    $g        data/answers.json "guides".
 * @var callable $gold     Formats gold.
 * @var callable $tool_url Tool permalink.
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

$f     = isset( $g['fertilizer'] ) ? $g['fertilizer'] : null;
if ( ! $f ) {
	return;
}
$rows  = array();
foreach ( $f['rows'] as $r ) {
	$rows[ $r['id'] ] = $r;
}
$names = array(
	'none'               => 'Nothing',
	'basic-fertilizer'   => 'Basic Fertilizer',
	'quality-fertilizer' => 'Quality Fertilizer',
	'speed-gro'          => 'Speed-Gro',
	'deluxe-speed-gro'   => 'Deluxe Speed-Gro',
);
$cell  = function ( $r, $key ) use ( $gold ) {
	$v    = $r[ $key ];
	$best = $r['best'] === $key ? ' class="is-best"' : '';
	echo '<td' . $best . '>' . esc_html( $gold( $v['profit'] ) ) . ( $v['harvests'] !== $r['none']['harvests'] ? ' <small>(' . (int) $v['harvests'] . ' harvests)</small>' : '' ) . '</td>';
};
$sf    = $rows['starfruit'];
$cr    = $rows['cranberries'];
$p0    = $f['level0'][0];
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> buy Speed-Gro only when it gets you one more harvest before the season ends. On most crops it doesn't, and the 100g bag just eats your profit. Deluxe Speed-Gro (80g at the Oasis) is the one that pays: it fits a third Cauliflower, Melon, Starfruit or Pumpkin harvest into the season. Basic and Quality Fertilizer from Pierre lose money on almost everything except Starfruit once your farming level is up.</p>
</div>

<p>Every number below is profit per tile for one season, planted on day 1 and replanted the same day after each harvest, at farming level <?php echo (int) $f['level']; ?>, sold raw, no professions. The cost of one bag per tile is already taken off. One bag is enough for the season: the wiki's Fertilizer page says fertilizer "remains in the soil all season", so you don't pay again when you replant. The best option for each crop is highlighted.</p>

<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Profit per tile for one season (farming level <?php echo (int) $f['level']; ?>)</caption>
	<thead><tr><th scope="col">Crop</th><th scope="col">No fertilizer</th><th scope="col">Basic</th><th scope="col">Quality</th><th scope="col">Speed-Gro</th><th scope="col">Deluxe Speed-Gro</th></tr></thead>
	<tbody>
	<?php foreach ( $f['rows'] as $r ) : ?>
		<tr>
			<th scope="row"><?php echo esc_html( $r['name'] ); ?> <small><?php echo esc_html( ucfirst( $r['season'] ) ); ?></small></th>
			<?php
			$cell( $r, 'none' );
			$cell( $r, 'basic-fertilizer' );
			$cell( $r, 'quality-fertilizer' );
			$cell( $r, 'speed-gro' );
			$cell( $r, 'deluxe-speed-gro' );
			?>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>

<h2>Why Speed-Gro so often loses</h2>
<p>Speed-Gro cuts growing time by at least 10%, but a season is 28 days and harvests come in whole days. Cauliflower takes 12 days, or 10 with Speed-Gro. Planted on day 1 you harvest on days 11 and 21 instead of 13 and 25, and a third harvest would land on day 31, after the season ends. Two harvests either way, so you spent 100g for nothing: <?php echo esc_html( $gold( $rows['cauliflower']['none']['profit'] ) ); ?> a tile without it, <?php echo esc_html( $gold( $rows['cauliflower']['speed-gro']['profit'] ) ); ?> with it.</p>
<p>It only pays when the saved days add up to a whole extra harvest. Potato and Kale go from 4 to 5 harvests, and Bok Choy from 6 to 9. Even then the gain is small, because each extra harvest of a cheap crop is worth little. Potato still ends up lower with Speed-Gro (<?php echo esc_html( $gold( $rows['potato']['speed-gro']['profit'] ) ); ?> against <?php echo esc_html( $gold( $rows['potato']['none']['profit'] ) ); ?>).</p>
<p>For regrowing crops like Blueberry, Speed-Gro only shortens the first growth, not the days between harvests. On Blueberry that still adds one harvest and pays (<?php echo esc_html( $gold( $rows['blueberry']['speed-gro']['profit'] ) ); ?> against <?php echo esc_html( $gold( $rows['blueberry']['none']['profit'] ) ); ?>). On Cranberries it adds nothing, and nothing beats planting them bare.</p>

<h2>Deluxe Speed-Gro: the one worth buying</h2>
<p>Deluxe Speed-Gro cuts growing time by at least 25%. Cauliflower drops to 9 days and is ready on days 10, 19 and 28. That is enough to squeeze a third harvest of a 12 or 13 day crop into a 28-day season. That is where the big jumps in the table come from: Starfruit goes from <?php echo esc_html( $gold( $sf['none']['profit'] ) ); ?> to <?php echo esc_html( $gold( $sf['deluxe-speed-gro']['profit'] ) ); ?> a tile, and Pumpkin from <?php echo esc_html( $gold( $rows['pumpkin']['none']['profit'] ) ); ?> to <?php echo esc_html( $gold( $rows['pumpkin']['deluxe-speed-gro']['profit'] ) ); ?>.</p>
<p>Buy it at the Oasis for 80g if you can. Pierre sells it for 150g, which is still worth it on Starfruit and Pumpkin but eats most of the gain on cheaper crops. To get the third harvest you have to plant on day 1, so buy the bags at the end of the season before.</p>

<h2>Basic and Quality Fertilizer</h2>
<p>Quality fertilizer raises the chance of a silver or gold crop, but only on the first item of each harvest. For a 60g Potato, a better chance at silver isn't worth 100g a tile. It only pays on expensive crops: at level <?php echo (int) $f['level']; ?>, Quality Fertilizer takes Starfruit from <?php echo esc_html( $gold( $sf['none']['profit'] ) ); ?> to <?php echo esc_html( $gold( $sf['quality-fertilizer']['profit'] ) ); ?>. At farming level 0 it doesn't even pay there (<?php echo esc_html( $gold( $f['level0'][1]['quality-fertilizer']['profit'] ) ); ?> against <?php echo esc_html( $gold( $f['level0'][1]['none']['profit'] ) ); ?>), because your quality chances are still low.</p>
<p>Early in the game the gap is wider. A level 0 Potato makes <?php echo esc_html( $gold( $p0['none']['profit'] ) ); ?> a tile bare and only <?php echo esc_html( $gold( $p0['quality-fertilizer']['profit'] ) ); ?> with Quality Fertilizer. Spend that gold on more seeds instead.</p>

<h2>What about Deluxe Fertilizer and Hyper Speed-Gro?</h2>
<p>Neither is sold for gold. You craft them after buying the recipes in Qi's Walnut Room on Ginger Island, so the table leaves them out. If you already have Deluxe Fertilizer, use it on your most valuable crop. Without counting its cost, it takes Starfruit to <?php echo esc_html( $gold( $sf['deluxe'] ) ); ?> a tile and Cranberries to <?php echo esc_html( $gold( $cr['deluxe'] ) ); ?>.</p>

<h2>Quick rules</h2>
<ul>
	<li>Planting a 12 or 13 day crop on day 1? Use Deluxe Speed-Gro.</li>
	<li>Regrowing crop? Speed-Gro only if it adds a harvest. Check with the <a href="<?php echo esc_url( $tool_url( 'crop-profit-calculator' ) ); ?>">Crop Profit Calculator</a>.</li>
	<li>Cheap crop under 100g? Skip fertilizer and plant more tiles.</li>
	<li>Starfruit at farming level 6 or higher? Quality Fertilizer pays for itself.</li>
	<li>Planting mid-season? Use <a href="<?php echo esc_url( $tool_url( 'what-to-plant' ) ); ?>">What to Plant Today</a>, which counts the days you have left.</li>
</ul>

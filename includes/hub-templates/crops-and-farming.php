<?php
/**
 * Hub intro: Crops and Farming.
 *
 * @var array $answers
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;
$cp = isset( $answers['crop_profit'] ) ? $answers['crop_profit'] : array();
?>
<p class="hub-lead">Crops are where most of your early money comes from, and where most planning mistakes cost you a season. These tools work out what to plant on the day you are actually on, with your gold and your skills, instead of assuming you start on day 1 with unlimited money.</p>
<?php if ( $cp ) : ?>
<p>Planted on day 1 and sold raw, the top crop per tile is <?php echo esc_html( $cp['spring'][0]['name'] ); ?> in spring, <?php echo esc_html( $cp['summer'][0]['name'] ); ?> in summer and <?php echo esc_html( $cp['fall'][0]['name'] ); ?> in fall. That changes fast once you count seed money, the days left and what your kegs can take, which is what the tools below are for.</p>
<?php endif; ?>
<h2>Start here</h2>
<ol>
	<li>New farm or mid-season? <a href="<?php echo esc_url( Stardew_Tools\Tools::url( 'what-to-plant' ) ); ?>">What to Plant Today</a> picks one crop for your day, gold and tiles.</li>
	<li>Comparing crops for a whole season? Use the <a href="<?php echo esc_url( Stardew_Tools\Tools::url( 'crop-profit-calculator' ) ); ?>">Crop Profit Calculator</a>.</li>
	<li>Thinking of buying Speed-Gro or fertilizer? Read <a href="<?php echo esc_url( Stardew_Tools\Guides::guide_url( 'speed-gro-vs-fertilizer' ) ); ?>">Speed-Gro vs Fertilizer</a> first.</li>
</ol>
<?php if ( ! empty( $cp['spring'] ) && ! empty( $cp['summer'] ) && ! empty( $cp['fall'] ) ) : ?>
<h2>The best crops by season</h2>
<p>Planted on day 1 with no fertilizer and sold raw, the three best crops per tile in each season are:</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Profit per tile, planted on day 1, sold raw</caption>
	<thead><tr><th scope="col">Season</th><th scope="col">Best</th><th scope="col">Second</th><th scope="col">Third</th></tr></thead>
	<tbody>
	<?php foreach ( array( 'spring' => 'Spring', 'summer' => 'Summer', 'fall' => 'Fall' ) as $key => $label ) : ?>
		<tr><th scope="row"><?php echo esc_html( $label ); ?></th>
		<?php foreach ( array_slice( $cp[ $key ], 0, 3 ) as $c ) : ?>
			<td><?php echo esc_html( $c['name'] ); ?> <small><?php echo esc_html( number_format( (int) $c['profit'] ) ); ?>g, <?php echo (int) $c['harvests']; ?> harvest<?php echo 1 === (int) $c['harvests'] ? '' : 's'; ?></small></td>
		<?php endforeach; ?>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>In winter only Powdermelon grows outdoors, and its seeds are not sold in shops, so winter money comes from the greenhouse, animals and machines. The best-crops pages below rank every crop in each season, and the greenhouse page covers year-round growing.</p>
<?php endif; ?>
<h2>Why the answer changes during the season</h2>
<ul>
	<li><strong>Days left.</strong> Late in a season a fast crop can beat a more valuable slow one, because the slow one may not finish before the season ends. What to Plant Today counts the days that remain.</li>
	<li><strong>Seed money.</strong> The most profitable crop per tile is no use if you can afford only a handful of seeds. The tools price the seeds and stop at your budget.</li>
	<li><strong>Machines.</strong> A crop that can be made into wine or juice can be worth far more than its raw price, but only up to the number of kegs and jars you own.</li>
	<li><strong>Skills.</strong> The Tiller, Artisan and Agriculturist professions and fertilizer all change the ranking.</li>
</ul>

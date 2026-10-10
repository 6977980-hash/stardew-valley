<?php
/**
 * Hub intro: Artisan Goods.
 *
 * @var array $answers
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;
$ks = isset( $answers['guides']['kegs'] ) ? $answers['guides']['kegs'] : array();
$kj = isset( $answers['keg_vs_jar'] ) ? $answers['keg_vs_jar'] : array();
$cs = isset( $answers['guides']['casks'] ) ? $answers['guides']['casks'] : array();
$g  = function ( $n ) {
	return number_format( (int) $n ) . 'g';
};
?>
<p class="hub-lead">Kegs and Preserves Jars are how a farm goes from good money to big money. The two questions that matter are which machine to use for each crop, and how many machines you need so nothing sits waiting in a chest.</p>
<p>The short version: wine from expensive fruit belongs in kegs, cheap fruit and vegetables often do better in jars, and almost every farm has fewer machines than its fields can feed. Our tools show the gold per machine, not just the price per bottle, because machines are usually what runs out first.</p>
<h2>Start here</h2>
<ol>
	<li>Keg or jar for a crop? <a href="<?php echo esc_url( Stardew_Tools\Tools::url( 'keg-vs-preserves-jar' ) ); ?>">Keg vs Preserves Jar</a>.</li>
	<li>How many machines to build? <a href="<?php echo esc_url( Stardew_Tools\Guides::guide_url( 'how-many-kegs-do-i-need' ) ); ?>">How Many Kegs Do I Need?</a></li>
	<li>Which machines are worth their materials? The <a href="<?php echo esc_url( Stardew_Tools\Tools::url( 'crafting-calculator' ) ); ?>">Crafting Calculator</a> adds up the ore and wood.</li>
</ol>
<?php if ( ! empty( $kj['keg_per_item'] ) ) : ?>
<h2>Which machine for which crop</h2>
<p>For one piece of fruit, the Keg earns more than the jar for <?php echo count( $kj['keg_per_item'] ); ?> crops, including <?php echo esc_html( implode( ', ', array_slice( $kj['keg_per_item'], 0, 5 ) ) ); ?>. The jar earns more for <?php echo count( $kj['jar_per_item'] ); ?> others.<?php if ( ! empty( $kj['tie'] ) ) : ?> <?php echo esc_html( implode( ', ', $kj['tie'] ) ); ?> is a tie.<?php endif; ?></p>
<p>That is the per-item answer. Per machine per day it can flip, because the two machines take different lengths of time to finish. If your harvest is bigger than your machines, the better question is how much each machine earns per day, and the Keg vs Preserves Jar tool shows exactly that.</p>
<?php endif; ?>
<?php if ( ! empty( $ks ) ) : ?>
<h2>How many machines each plant keeps busy</h2>
<p>A machine only helps if it is free when the crop is ready. These are the kegs one plant needs to avoid a backlog, worked out from how often the plant fruits and how long the keg takes:</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Kegs needed per plant</caption>
	<thead><tr><th scope="col">Crop</th><th scope="col">Makes</th><th scope="col">Kegs per plant</th><th scope="col">Kegs per 100 plants</th></tr></thead>
	<tbody>
	<?php foreach ( array_slice( $ks, 0, 6 ) as $r ) : ?>
		<tr><th scope="row"><?php echo esc_html( $r['name'] ); ?></th><td><?php echo esc_html( $r['keg_product'] ); ?></td><td><?php echo esc_html( rtrim( rtrim( number_format( (float) $r['kegs_per_plant'], 2 ), '0' ), '.' ) ); ?></td><td><?php echo (int) $r['kegs_per_100']; ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>Plants that fruit every day, like Hops, need more than one keg each, while slow fruits like Starfruit need less than half a keg. Most farms end up short of machines, not crops, so build for the crops you grow most.</p>
<?php endif; ?>
<?php if ( ! empty( $cs['cellar'] ) ) : ?>
<h2>Casks, the third machine</h2>
<p>Casks age wine, cheese, ale and more to higher quality, and they take a long time. The cellar comes with the third Farmhouse upgrade, starts with <?php echo (int) $cs['cellar']['start']; ?> casks already placed and has room for <?php echo (int) $cs['cellar']['max']; ?> in total. Because casks need space and months of waiting, they pay off slowly, but they earn without any daily work. The <a href="<?php echo esc_url( Stardew_Tools\Guides::guide_url( 'are-casks-worth-it' ) ); ?>">Are Casks Worth It?</a> guide has the gold per cask per day.</p>
<?php endif; ?>
<p>There is a fourth option for fruit: the Dehydrator turns fruit into dried fruit, which can earn more per machine per day than wine. <a href="<?php echo esc_url( Stardew_Tools\Guides::guide_url( 'dehydrator-vs-keg' ) ); ?>">Dehydrator vs Keg</a> compares them.</p>

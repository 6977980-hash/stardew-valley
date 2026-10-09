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

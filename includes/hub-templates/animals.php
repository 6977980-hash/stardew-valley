<?php
/**
 * Hub intro: Animals.
 *
 * @var array $answers
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;
$an = isset( $answers['animals']['raw'] ) ? $answers['animals']['raw'] : array();
$g  = function ( $n ) {
	return number_format( (int) $n ) . 'g';
};
?>
<p class="hub-lead">Animals earn every day without replanting, but only if they are happy and you keep up with feeding and petting. What each one earns depends on its hearts, its mood and your professions, and the gap between the best and worst animal is huge.</p>
<?php if ( count( $an ) >= 3 ) : ?>
<p>At full hearts, selling raw, a <?php echo esc_html( $an[0]['name'] ); ?> earns about <?php echo esc_html( $g( $an[0]['gold_per_day'] ) ); ?> on a day it goes outside, a <?php echo esc_html( $an[1]['name'] ); ?> about <?php echo esc_html( $g( $an[1]['gold_per_day'] ) ); ?>, and a <?php echo esc_html( end( $an )['name'] ); ?> about <?php echo esc_html( $g( end( $an )['gold_per_day'] ) ); ?>. The calculator below shows the same for your own hearts, mood and machines.</p>
<?php endif; ?>
<h2>Start here</h2>
<ol>
	<li>Which animal to buy next? The <a href="<?php echo esc_url( Stardew_Tools\Tools::url( 'animal-profit-calculator' ) ); ?>">Animal Profit Calculator</a> ranks them all with payback days.</li>
	<li>Saving up for a Deluxe Barn? Read <a href="<?php echo esc_url( Stardew_Tools\Guides::guide_url( 'are-pigs-worth-it' ) ); ?>">Are Pigs Worth It?</a></li>
</ol>

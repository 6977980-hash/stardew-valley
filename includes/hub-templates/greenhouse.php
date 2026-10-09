<?php
/**
 * Hub intro: Greenhouse.
 *
 * @var array $answers
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;
$gh = isset( $answers['greenhouse'] ) ? $answers['greenhouse'] : array();
?>
<p class="hub-lead">The greenhouse grows any crop in any season, so it is where long-term money is decided. A good plan needs three things: a sprinkler layout that waters every tile, the right crop, and enough kegs to process what it grows.</p>
<?php if ( $gh ) : ?>
<p>With 6 Iridium Sprinklers you get <?php echo (int) $gh['tiles']; ?> plantable tiles. Planted with Ancient Fruit and sold raw, that is about <?php echo esc_html( number_format( (int) $gh['raw'][0]['total'] ) ); ?>g a year once the plants are grown, and much more with kegs.</p>
<?php endif; ?>
<h2>Start here</h2>
<ol>
	<li>Lay it out and see a year of profit in the <a href="<?php echo esc_url( Stardew_Tools\Tools::url( 'greenhouse-planner' ) ); ?>">Greenhouse Planner</a>.</li>
	<li>Which crop, for the kegs you own? Read <a href="<?php echo esc_url( Stardew_Tools\Guides::guide_url( 'best-greenhouse-setup-for-money' ) ); ?>">Best Greenhouse Setup for Money</a>.</li>
</ol>

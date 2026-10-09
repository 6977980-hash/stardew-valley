<?php
/**
 * Ancient Fruit vs Starfruit.
 *
 * @var array $answers
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;
require_once __DIR__ . '/_controls.php';

$af = isset( $answers['af_vs_starfruit'] ) ? $answers['af_vs_starfruit'] : array();
$g  = function ( $n ) {
	return number_format( (int) $n ) . 'g';
};
?>
<div class="answer">
	<?php if ( $af ) : ?>
	<p class="answer__lead"><strong>Short answer:</strong> Ancient Fruit earns more per tile in almost every setup. As Artisan Wine in the greenhouse, one tile makes <?php echo esc_html( $g( $af['greenhouse_year1']['ancient'] ) ); ?> in the first year against <?php echo esc_html( $g( $af['greenhouse_year1']['starfruit'] ) ); ?> for Starfruit, and <?php echo esc_html( $g( $af['greenhouse_established']['ancient'] ) ); ?> a year once the plant is grown. Starfruit only wins when you count each harvest fresh and have kegs to spare, or need the money within one season outdoors.</p>
	<?php endif; ?>
	<p>Ancient Fruit regrows every 7 days and needs one seed for life; Starfruit sells for more per fruit but must be replanted (400g a seed) every 13 days. Change the setup below.</p>
</div>

<form class="tool-form" id="af-sf-form" novalidate>
	<fieldset>
		<legend>Compare in</legend>
		<div class="field-grid">
			<?php
			stardew_tools_select(
				'where',
				'Where and when',
				array(
					'gh1'    => 'Greenhouse, first year',
					'gh2'    => 'Greenhouse, year 2+ (Ancient Fruit already grown)',
					'summer' => 'Outdoors, planted Summer 1',
					'spring' => 'Outdoors, planted Spring 1',
				),
				'gh1'
			);
			stardew_tools_select(
				'sell',
				'Sell as',
				array(
					'wine'  => 'Wine (Keg)',
					'jelly' => 'Jelly (Preserves Jar)',
					'raw'   => 'Raw fruit',
				),
				'wine'
			);
			stardew_tools_number( 'tiles', 'Tiles', 100, 1, 2000, 'For totals and machines needed.' );
			stardew_tools_select( 'level', 'Farming level', stardew_tools_level_options(), 10 );
			stardew_tools_select( 'fertilizer', 'Fertilizer', stardew_tools_fertilizer_options(), '' );
			?>
		</div>
		<div class="check-row">
			<?php
			stardew_tools_checkbox( 'artisan', 'Artisan (+40% wine, jelly)', true );
			stardew_tools_checkbox( 'tiller', 'Tiller (+10% raw fruit)', true );
			stardew_tools_checkbox( 'agri', 'Agriculturist (10% faster)' );
			?>
		</div>
	</fieldset>
	<?php stardew_tools_form_actions(); ?>
</form>
<?php stardew_tools_noscript(); ?>

<section class="tool-results" aria-labelledby="results-heading">
	<h2 id="results-heading">Results</h2>
	<p class="result-summary" data-summary role="status" aria-live="polite"></p>
	<div class="compare" data-results></div>
</section>

<?php stardew_tools_ad( 'below-result' ); ?>

<section class="tool-explain">
	<h2>Why Ancient Fruit usually wins</h2>
	<ul>
		<li><strong>Growth:</strong> Ancient Fruit takes 28 days, then gives a fruit every 7 days for as long as it lives (all year in the greenhouse; Spring to Fall outdoors). Starfruit takes 13 days and is done.</li>
		<li><strong>Seeds:</strong> Starfruit seeds cost 400g at the Oasis every planting. Ancient Seeds are not sold for gold; you get them from artifacts or a Seed Maker, so their cost is not counted here.</li>
		<li><strong>Machines:</strong> one Ancient Fruit plant fills a keg almost all the time (Wine takes about 6.25 days, the plant regrows in 7). The tool shows how many machines each crop needs to keep up.</li>
	</ul>
	<h3>Assumptions</h3>
	<ul>
		<li>Every harvest goes into a free machine when you choose Wine or Jelly; machine products ignore fruit quality.</li>
		<li>Starfruit is replanted on each harvest day. Greenhouse years are 112 days.</li>
		<li>Outdoors, each crop counts until it dies: Starfruit at the end of Summer, Ancient Fruit at the end of Fall.</li>
	</ul>
</section>

<?php
/**
 * Greenhouse Planner.
 *
 * @var array $answers
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;
require_once __DIR__ . '/_controls.php';

$gh    = isset( $answers['greenhouse'] ) ? $answers['greenhouse'] : array();
$crops = array( '' => '(none)' );
foreach ( Stardew_Tools\Data::crops() as $id => $c ) {
	$crops[ $id ] = $c['name'];
}
asort( $crops );
$g = function ( $n ) {
	return number_format( (int) $n ) . 'g';
};
?>
<div class="answer">
	<?php if ( $gh ) : ?>
	<p class="answer__lead"><strong>Short answer:</strong> with 6 Iridium Sprinklers (two of them on the wooden border) you keep <?php echo esc_html( $gh['tiles'] ); ?> of the 120 soil tiles for crops. Sold raw, Ancient Fruit is the best greenhouse crop at about <?php echo esc_html( $g( $gh['raw'][0]['per_tile'] ) ); ?> per tile a year once the plants are grown, before professions. If you can process everything, <?php echo esc_html( $gh['processed'][0]['name'] ); ?> as <?php echo 'pale-ale' === $gh['processed'][0]['sell_as'] ? 'Pale Ale' : 'Wine'; ?> earns more (<?php echo esc_html( $g( $gh['processed'][0]['per_tile'] ) ); ?> per tile) but a full greenhouse of it needs about <?php echo esc_html( $gh['processed'][0]['machines'] ); ?> kegs; Ancient Fruit Wine needs about <?php echo esc_html( $gh['processed'][1]['machines'] ); ?>.</p>
	<?php endif; ?>
	<p>Pick your sprinklers and up to three crops to see the layout, a year of profit and the machines you need.</p>
</div>

<form class="tool-form" id="greenhouse-form" novalidate>
	<fieldset>
		<legend>Layout</legend>
		<div class="field-grid">
			<?php
			stardew_tools_select(
				'sprinkler',
				'Sprinklers',
				array(
					'iridium' => 'Iridium (6, best)',
					'quality' => 'Quality (16)',
					'none'    => 'None (watering can)',
				),
				'iridium'
			);
			stardew_tools_select(
				'stage',
				'Which year',
				array(
					'first'       => 'First year (plants grow from seed)',
					'established' => 'Year 2+ (regrowing crops already grown)',
				),
				'first'
			);
			?>
		</div>
	</fieldset>
	<fieldset>
		<legend>Crops</legend>
		<div class="plan-rows">
			<?php
			$defaults = array( array( 'ancient-fruit', 116 ), array( '', 0 ), array( '', 0 ) );
			foreach ( $defaults as $i => $row ) {
				$n = $i + 1;
				echo '<div class="plan-row">';
				stardew_tools_select( 'c' . $n, 'Crop ' . $n, $crops, $row[0] );
				stardew_tools_number( 'n' . $n, 'Tiles', $row[1], 0, 120 );
				echo '</div>';
			}
			?>
		</div>
	</fieldset>
	<fieldset>
		<legend>You</legend>
		<div class="field-grid">
			<?php
			stardew_tools_select(
				'sell',
				'Sell as',
				array(
					'raw'  => 'Raw',
					'best' => 'Best of raw, Keg or Jar',
				),
				'raw'
			);
			stardew_tools_select( 'level', 'Farming level', stardew_tools_level_options(), 10 );
			stardew_tools_select( 'fertilizer', 'Fertilizer', stardew_tools_fertilizer_options(), '' );
			?>
		</div>
		<div class="check-row">
			<?php
			stardew_tools_checkbox( 'tiller', 'Tiller', true );
			stardew_tools_checkbox( 'artisan', 'Artisan', true );
			stardew_tools_checkbox( 'agri', 'Agriculturist' );
			?>
		</div>
	</fieldset>
	<?php stardew_tools_form_actions(); ?>
</form>
<?php stardew_tools_noscript(); ?>

<section class="tool-results" aria-labelledby="results-heading">
	<h2 id="results-heading">Results</h2>
	<p class="result-summary" data-summary role="status" aria-live="polite"></p>
	<div data-warnings></div>
	<div class="gh-wrap" data-grid></div>
	<div class="table-wrap" data-results></div>
</section>

<?php stardew_tools_ad( 'below-result' ); ?>

<section class="tool-explain">
	<h2>How the planner works</h2>
	<ul>
		<li><strong>Soil:</strong> the greenhouse has 120 tillable tiles (12 wide, 10 high). Sprinklers placed on soil take a tile; sprinklers on the wooden border around the soil do not.</li>
		<li><strong>Sprinklers:</strong> 6 Iridium Sprinklers water every tile, with 2 standing on the border, so 4 tiles are used. 16 Quality Sprinklers also water everything, with 4 on the border, so 12 tiles are used.</li>
		<li><strong>Profit:</strong> each crop is grown for one 112-day greenhouse year with the same rules as the <a href="<?php echo esc_url( Stardew_Tools\Tools::url( 'crop-profit-calculator' ) ); ?>">Crop Profit Calculator</a>. Seeds are bought at the cheapest shop; seeds without a gold price are not counted.</li>
		<li><strong>Machines:</strong> the number of kegs or jars that can keep up with the harvests, rounded up.</li>
	</ul>
	<h3>Assumptions</h3>
	<ul>
		<li>Crops are replanted the day they are harvested. Regrowing crops in "Year 2+" start already grown.</li>
		<li>Trellis crops (Hops, Grape, Green Bean) block walking, so a full greenhouse of them needs paths you plan yourself.</li>
		<li>Fruit trees around the edge are not counted yet.</li>
	</ul>
</section>

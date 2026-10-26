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
	<p class="answer__lead"><strong>Short answer:</strong> with 6 Iridium Sprinklers (two of them on the wooden border) you keep <?php echo esc_html( $gh['tiles'] ); ?> of the 120 soil tiles for crops. Sold raw, <?php echo esc_html( $gh['raw'][0]['name'] ); ?> is the best greenhouse crop at about <?php echo esc_html( $g( $gh['raw'][0]['per_tile'] ) ); ?> per tile a year once the plants are grown (Year 2+), at Farming level 0 with no professions. If you can process everything (Artisan), <?php echo esc_html( $gh['processed'][0]['name'] ); ?> as <?php echo 'pale-ale' === $gh['processed'][0]['sell_as'] ? 'Pale Ale' : 'Wine'; ?> earns more (<?php echo esc_html( $g( $gh['processed'][0]['per_tile'] ) ); ?> per tile) but a full greenhouse of it needs about <?php echo esc_html( $gh['processed'][0]['machines'] ); ?> kegs; Ancient Fruit Wine needs about <?php echo esc_html( $gh['processed'][1]['machines'] ); ?>.</p>
	<?php endif; ?>
	<p>The planner below opens on a first year from seed at Farming level 10 with Tiller and Artisan, so its total is not the same number; the line above the result says what it assumes. Pick your sprinklers and up to three crops to see the layout, a year of profit and the machines you need.</p>
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
	<p class="result-assumes" data-assumes></p>
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
		<li><strong>Machines:</strong> the number of kegs or jars that keep up with the harvests once the crop is producing steadily (one harvest's items spread over the days between harvests), rounded up. The Ancient Fruit vs Starfruit tool and the keg guide count the same way.</li>
	</ul>
	<h3>Assumptions</h3>
	<ul>
		<li>Crops are replanted the day they are harvested. Regrowing crops in "Year 2+" start already grown.</li>
		<li>Trellis crops (Hops, Grape, Green Bean) block walking, so a full greenhouse of them needs paths you plan yourself.</li>
		<li>Fruit trees around the edge are not counted yet.</li>
	</ul>
</section>
<?php
$ghr  = isset( $answers['tables']['greenhouse'] ) ? $answers['tables']['greenhouse'] : array( 'rows' => array(), 'tiles' => 0 );
$ref  = array();
$sell = array(
	'raw'           => 'raw',
	'wine'          => 'Wine',
	'juice'         => 'Juice',
	'jelly'         => 'Jelly',
	'pickles'       => 'Pickles',
	'pale-ale'      => 'Pale Ale',
	'beer'          => 'Beer',
	'coffee'        => 'Coffee',
	'green-tea'     => 'Green Tea',
);
foreach ( $ghr['rows'] as $row ) {
	$ref[] = array( $row['name'], $row['harvests'], number_format( $row['raw'] ) . 'g', number_format( $row['raw_total'] ) . 'g', number_format( $row['best'] ) . 'g', isset( $sell[ $row['best_as'] ] ) ? $sell[ $row['best_as'] ] : $row['best_as'] );
}
stardew_tools_reference_table(
	'ref-greenhouse',
	'Greenhouse crops ranked for one year',
	'Every crop that fits a greenhouse year, already grown (year 2+), with 6 Iridium Sprinklers leaving ' . (int) $ghr['tiles'] . ' tiles. "Best way" lets each crop go to a Keg or Preserves Jar when that pays more, with Artisan and a free machine for every harvest; the planner above tells you how many machines that takes.',
	'Greenhouse profit per tile for a year, sold raw and the best way',
	array( 'Crop', '#Harvests', '#Raw per tile', '#Raw, full greenhouse', '#Best way per tile', 'Best way' ),
	$ref,
	'Seed costs are counted where seeds have a gold price; Ancient Fruit seeds do not, so its first planting is free here.'
);

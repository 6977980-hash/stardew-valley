<?php
/**
 * What to Plant Today: the decision engine. One recommendation for the player's own day, gold,
 * tiles, machines and skills, with the reasons and a shopping list.
 *
 * @var array $answers
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;
require_once __DIR__ . '/_controls.php';

$ex           = isset( $answers['decision']['new_farm'] ) ? $answers['decision']['new_farm'] : array();
$y1           = Stardew_Tools\Data::get( 'year-one' );
$free         = $y1 && ! empty( $y1['start_seeds'] ) ? $y1['start_seeds'] : array();
$ys           = isset( $answers['guides']['year_one']['start'] ) ? $answers['guides']['year_one']['start'] : array();
$year_one_url = Stardew_Tools\Guides::guide_url( 'how-to-make-money-year-1' );
$ex2 = isset( $answers['decision']['summer_15'] ) ? $answers['decision']['summer_15'] : array();
$g  = function ( $n ) {
	return number_format( (int) $n ) . 'g';
};
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> it depends on the day, your gold and your machines, so enter them below.
	<?php if ( $ex ) : ?>
		On a new farm (Year 1, Spring 1, <?php echo esc_html( $g( $ex['situation']['budget'] ) ); ?>, <?php echo (int) $ex['situation']['tiles']; ?> tiles, farming level 0<?php echo $free ? ', counting your ' . (int) $free['qty'] . ' free ' . esc_html( $free['seed'] ) : ''; ?>) plant <strong><?php echo esc_html( $ex['best']['name'] ); ?></strong>: <?php echo esc_html( $g( $ex['best']['total'] ) ); ?> profit by the end of Spring, against <?php echo esc_html( $g( $ex['runner_up']['total'] ) ); ?> for <?php echo esc_html( $ex['runner_up']['name'] ); ?>.
		<?php if ( $ys && ! empty( $ex['crossover'] ) && 'parsnip' === $ex['crossover']['id'] && 'potato' === $ex['best']['id'] ) : ?>
		The <?php echo $year_one_url ? '<a href="' . esc_url( $year_one_url ) . '">Year 1 money guide</a>' : 'Year 1 money guide'; ?> says <?php echo esc_html( $ex['crossover']['name'] ); ?> because it assumes more empty soil than gold: <?php echo esc_html( $g( $ys['gold'] ) ); ?> buys <?php echo (int) $ys['parsnip_seeds']; ?> Parsnip Seeds but only <?php echo (int) $ys['potato_seeds']; ?> Potato Seeds. Here <?php echo esc_html( $ex['crossover']['name'] ); ?> takes over from <?php echo (int) $ex['crossover']['tiles']; ?> tiles up; with fewer tiles, the higher value of each <?php echo esc_html( $ex['best']['name'] ); ?> wins.
		<?php endif; ?>
	<?php endif; ?>
	<?php if ( $ex2 ) : ?>
		On Summer <?php echo (int) $ex2['situation']['today']; ?> with <?php echo esc_html( $g( $ex2['situation']['budget'] ) ); ?> and <?php echo (int) $ex2['situation']['tiles']; ?> tiles, <?php echo esc_html( $ex2['best']['name'] ); ?> wins: <?php echo esc_html( $ex2['reasons'][0] ); ?>
	<?php endif; ?>
	</p>
</div>

<form class="tool-form" id="what-to-plant-form" novalidate>
	<fieldset>
		<legend>Today</legend>
		<div class="field-grid">
			<?php
			stardew_tools_select(
				'season',
				'Season',
				array(
					'spring'     => 'Spring',
					'summer'     => 'Summer',
					'fall'       => 'Fall',
					'greenhouse' => 'Greenhouse (a full year)',
				),
				'spring'
			);
			stardew_tools_number( 'today', 'Day of the season', 1, 1, 28 );
			stardew_tools_select( 'farmyear', 'Year', array( '1' => 'Year 1', '2' => 'Year 2 or later' ), '1', 'Pierre sells Garlic, Rice, Red Cabbage and Artichoke seeds from Year 2. In Year 1 the Oasis is left out: the desert opens once the bus is repaired.' );
			stardew_tools_number( 'budget', 'Gold to spend on seeds', 500, 0, 10000000, 'Seeds and fertilizer for the first planting. Replanting is paid from your sales. Leave it empty for no limit.', true );
			stardew_tools_number( 'tiles', 'Tiles you can plant', 15, 1, 5000 );
			?>
		</div>
		<?php if ( $free ) : ?>
		<div class="check-row" data-free-seeds>
			<?php stardew_tools_checkbox( 'free', 'I still have my ' . (int) $free['qty'] . ' free ' . $free['seed'], true ); ?>
			<p class="field__hint">Mayor Lewis gives every new farm <?php echo (int) $free['qty']; ?> <?php echo esc_html( $free['seed'] ); ?> (not on the Meadowlands Farm). Counted on a Year 1 spring.</p>
		</div>
		<?php endif; ?>
	</fieldset>
	<fieldset>
		<legend>Your farm</legend>
		<div class="field-grid">
			<?php
			stardew_tools_select( 'level', 'Farming level', stardew_tools_level_options(), 0 );
			stardew_tools_select( 'fertilizer', 'Fertilizer', stardew_tools_fertilizer_options(), '' );
			stardew_tools_number( 'kegs', 'Kegs free for this crop', 0, 0, 10000 );
			stardew_tools_number( 'jars', 'Preserves Jars free', 0, 0, 10000 );
			?>
		</div>
		<div class="check-row">
			<?php
			stardew_tools_checkbox( 'tiller', 'Tiller' );
			stardew_tools_checkbox( 'artisan', 'Artisan' );
			stardew_tools_checkbox( 'agri', 'Agriculturist' );
			?>
		</div>
	</fieldset>
	<?php stardew_tools_form_actions(); ?>
</form>
<?php stardew_tools_noscript(); ?>

<section class="tool-results" aria-labelledby="results-heading">
	<h2 id="results-heading">What to plant</h2>
	<p class="result-assumes" data-assumes></p>
	<p class="result-summary" data-summary role="status" aria-live="polite"></p>
	<div data-pick></div>
	<div class="table-wrap" data-results></div>
</section>

<?php stardew_tools_ad( 'below-result' ); ?>

<section class="tool-explain">
	<h2>How the choice is made</h2>
	<ul>
		<li><strong>Time:</strong> only crops that can still be harvested before they die are considered. Crops that also grow next season keep going into it.</li>
		<li><strong>Gold:</strong> your gold pays for one seed (and fertilizer) per tile today. If it does not cover every tile, the crop is planted on as many tiles as you can afford.</li>
		<li><strong>Machines:</strong> kegs and jars you have free are filled with the harvest when that earns more than selling raw, running from the first harvest to the end of the season (or to the last harvest, for crops that carry on into the next season).</li>
		<li><strong>Total:</strong> the crop with the most profit across all your planted tiles wins. The reasons compare it with the runner-up.</li>
	</ul>
	<h3>Assumptions</h3>
	<ul>
		<li>Seeds come from the cheapest shop that sells them every day (Pierre's, JojaMart or the Oasis).</li>
		<li>Single-harvest crops are replanted on harvest day with seeds paid from sales.</li>
		<li>Machine products ignore crop quality, as in the game.</li>
	</ul>
</section>
<?php
$ref       = array();
$plant_rows = isset( $answers['tables']['what_to_plant'] ) ? array_values( $answers['tables']['what_to_plant'] ) : array();
foreach ( $plant_rows as $row ) {
	$spend = number_format( $row['spend_now'] ) . 'g' . ( ! empty( $row['free_seeds'] ) ? ' (' . (int) $row['free_seeds'] . ' free seeds)' : '' );
	$ref[] = array( $row['name'], $row['tiles'], number_format( $row['seed_price'] ) . 'g', $spend, $row['harvests'], number_format( $row['total'] ) . 'g' );
}
// The first pair in the table where more tiles beat more profit per tile, named from the rows.
$gold_example = '';
foreach ( $plant_rows as $i => $hi ) {
	foreach ( array_slice( $plant_rows, $i + 1 ) as $lo ) {
		if ( $hi['tiles'] > $lo['tiles'] && $lo['total'] / max( 1, $lo['tiles'] ) > $hi['total'] / max( 1, $hi['tiles'] ) ) {
			$gold_example = sprintf( ', which is why %1$s (%2$s seeds) ranks above %3$s even though %3$s makes more per tile', $hi['name'], number_format( $hi['seed_price'] ) . 'g', $lo['name'] );
			break 2;
		}
	}
}
stardew_tools_reference_table(
	'ref-what-to-plant',
	'What to plant on Spring 1 with 500g',
	'The ranking the tool shows as it opens: Year 1, Spring 1, 500g for seeds, 15 tiles, farming level 0, no fertilizer and no machines, with the ' . ( $free ? (int) $free['qty'] . ' free ' . esc_html( $free['seed'] ) : 'free seeds' ) . ' every new farm gets. The gold limits how many tiles each crop can fill on day one' . $gold_example . '.',
	'Crops ranked for a new farm on Spring 1 with 500g and 15 tiles',
	array( 'Crop', '#Tiles you can plant', '#Seed price', '#Spend today', '#Harvests', '#Profit this season' ),
	$ref
);

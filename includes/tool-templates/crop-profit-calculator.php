<?php
/**
 * Crop Profit Calculator.
 *
 * @var array  $tool
 * @var array  $answers
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;
require_once __DIR__ . '/_controls.php';

$best = isset( $answers['crop_profit'] ) ? $answers['crop_profit'] : array();
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> planting on day 1 with seeds from Pierre's, JojaMart or the Oasis, no fertilizer and farming level 0, the most profit per tile comes from
	<?php
	$parts = array();
	foreach ( array( 'spring', 'summer', 'fall' ) as $season ) {
		if ( ! empty( $best[ $season ][0] ) ) {
			$parts[] = sprintf( '%s in %s (%sg)', $best[ $season ][0]['name'], ucfirst( $season ), number_format( $best[ $season ][0]['profit'] ) );
		}
	}
	echo esc_html( implode( ', ', $parts ) );
	?>.
	In Winter only Powdermelon grows outdoors, and its seeds are not sold in shops.</p>
	<p>Your day, fertilizer, professions and machines change the answer. Set them below; the table updates as you type.</p>
</div>

<form class="tool-form" id="crop-profit-form" novalidate>
	<fieldset>
		<legend>Your farm</legend>
		<div class="field-grid">
			<?php
			stardew_tools_select(
				'season',
				'Season',
				array(
					'spring'     => 'Spring',
					'summer'     => 'Summer',
					'fall'       => 'Fall',
					'winter'     => 'Winter',
					'greenhouse' => 'Greenhouse (one year)',
				),
				'spring'
			);
			stardew_tools_number( 'today', 'Today is day', 1, 1, 28, 'Plant today; crops count until the season ends.' );
			stardew_tools_select( 'level', 'Farming level', stardew_tools_level_options(), 0 );
			stardew_tools_select( 'fertilizer', 'Fertilizer', stardew_tools_fertilizer_options(), '' );
			stardew_tools_select(
				'sell',
				'Sell as',
				array(
					'raw'           => 'Sell raw',
					'best'          => 'Best of raw, Keg or Jar',
					'keg'           => 'Keg (wine, juice…)',
					'preserves-jar' => 'Preserves Jar (jelly, pickles)',
				),
				'raw',
				'Keg and jar assume you have enough machines.'
			);
			stardew_tools_select(
				'seeds',
				'Seed price',
				array(
					''         => 'Cheapest shop',
					'pierre'   => "Pierre's",
					'jojamart' => 'JojaMart',
				),
				''
			);
			?>
		</div>
		<div class="check-row">
			<?php
			stardew_tools_checkbox( 'tiller', 'Tiller (+10% crops)' );
			stardew_tools_checkbox( 'artisan', 'Artisan (+40% wine, jelly…)' );
			stardew_tools_checkbox( 'agri', 'Agriculturist (10% faster)' );
			stardew_tools_checkbox( 'noshop', 'Include crops whose seeds are not sold for gold' );
			?>
		</div>
	</fieldset>
	<?php stardew_tools_form_actions(); ?>
</form>
<?php stardew_tools_noscript(); ?>

<section class="tool-results" aria-labelledby="results-heading">
	<h2 id="results-heading">Results</h2>
	<p class="result-summary" data-summary role="status" aria-live="polite"></p>
	<div class="table-wrap" data-results></div>
</section>

<?php stardew_tools_ad( 'below-result' ); ?>

<section class="tool-explain">
	<h2>How the profit is calculated</h2>
	<ol>
		<li>Growth days come from verified stage lengths. Speed-Gro and Agriculturist shorten them the way the game does, including its rounding.</li>
		<li>Harvests are counted from the day you plant until the crop dies at the end of its last season. Single-harvest crops are replanted on harvest day; regrowing crops are bought once.</li>
		<li>Each harvest's value uses the chances of silver, gold and iridium quality for your farming level and fertilizer. Extra items from one harvest (for example the 3 Blueberries) are regular quality.</li>
		<li>Profit = value of all harvests − seeds − fertilizer. Open "Show math" on any row to see every number.</li>
	</ol>
	<h3>Assumptions</h3>
	<ul>
		<li>One tile, watered every day, planted on the day you choose.</li>
		<li>Seeds bought at the cheapest shop unless you choose one. Seeds from festivals, the Traveling Cart or trades have no shop price; those crops are hidden unless you include them, and then their seed cost is not counted.</li>
		<li>Keg and jar results assume a free machine for every harvest. To plan with the machines you own, use the <a href="<?php echo esc_url( Stardew_Tools\Tools::url( 'keg-vs-preserves-jar' ) ); ?>">Keg vs Preserves Jar</a> tool.</li>
		<li>Giant crops, luck and random extra harvests beyond the average are not counted.</li>
	</ul>
</section>

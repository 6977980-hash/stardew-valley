<?php
/**
 * Keg vs Preserves Jar.
 *
 * @var array $answers
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;
require_once __DIR__ . '/_controls.php';

$kj    = isset( $answers['keg_vs_jar'] ) ? $answers['keg_vs_jar'] : array();
$sf    = isset( $kj['starfruit'] ) ? $kj['starfruit'] : array();
$crops = array();
foreach ( Stardew_Tools\Data::crops() as $id => $c ) {
	if ( in_array( $c['category'], array( 'fruit', 'vegetable' ), true ) || 'coffee-bean' === $id ) {
		$crops[ $id ] = $c['name'];
	}
}
asort( $crops );
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> if you are short of crops (more machines than harvest), use the Keg for fruit worth more than 50g and vegetables worth more than 200g, because Wine (3× the fruit price) and Juice (2.25×) are worth more per item than Jelly and Pickles (2× + 50g).<?php
	if ( ! empty( $kj['keg_cheap'] ) ) {
		$cheap = array_map(
			function ( $c ) {
				return $c['name'] . ' (' . $c['product'] . ', ' . number_format( $c['price'] ) . 'g)';
			},
			$kj['keg_cheap']
		);
		echo ' ' . esc_html( implode( ' and ', $cheap ) ) . ' also go in the Keg, whatever the limit.';
	}
	?>
	<?php if ( $sf ) : ?>
	If you are short of machines (more harvest than machines), use Preserves Jars for nearly everything else: a jar finishes in about 2.5 days and a keg takes up to 6.25, so it earns more per machine per day. Starfruit Wine adds <?php echo esc_html( number_format( $sf['wine']['gain_per_machine_day'] ) ); ?>g per keg per day over selling raw without professions (<?php echo esc_html( number_format( $kj['starfruit_artisan']['wine']['gain_per_machine_day'] ) ); ?>g with Tiller and Artisan); Starfruit Jelly adds <?php echo esc_html( number_format( $sf['jelly']['gain_per_machine_day'] ) ); ?>g per jar per day (<?php echo esc_html( number_format( $kj['starfruit_artisan']['jelly']['gain_per_machine_day'] ) ); ?>g with Tiller and Artisan).
	<?php endif; ?>
	</p>
	<p>Enter your crop, how many you have and your machines to get the best split.</p>
</div>

<form class="tool-form" id="keg-jar-form" novalidate>
	<fieldset>
		<legend>Your harvest and machines</legend>
		<div class="field-grid">
			<?php
			stardew_tools_select( 'crop', 'Crop', $crops, 'starfruit' );
			stardew_tools_number( 'items', 'How many you have', 100, 0, 100000 );
			stardew_tools_number( 'days', 'Days until you sell', 28, 1, 336, 'Machines run back to back for this many days.' );
			stardew_tools_number( 'kegs', 'Kegs', 10, 0, 10000 );
			stardew_tools_number( 'jars', 'Preserves Jars', 10, 0, 10000 );
			stardew_tools_select(
				'quality',
				'Quality of the raw crop',
				array(
					'regular' => 'Regular',
					'silver'  => 'Silver',
					'gold'    => 'Gold',
					'iridium' => 'Iridium',
				),
				'regular',
				'Machines ignore quality; this only changes the raw price.'
			);
			?>
		</div>
		<div class="check-row">
			<?php
			stardew_tools_checkbox( 'artisan', 'Artisan (+40% wine, jelly…)' );
			stardew_tools_checkbox( 'tiller', 'Tiller (+10% raw crops)' );
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
	<div data-results></div>
</section>

<?php stardew_tools_ad( 'below-result' ); ?>

<section class="tool-explain">
	<h2>How the split is worked out</h2>
	<ol>
		<li>Each machine makes its best product from your crop: Wine or Juice in the Keg (Beer from Wheat, Pale Ale from Hops, Coffee from 5 Coffee Beans), Jelly or Pickles in the Jar.</li>
		<li>A machine runs back to back for the days you give it. A day counts as 1,600 game minutes, as the wiki uses, so Wine (10,000 minutes) fits 4 runs in 28 days and Jelly (4,000 minutes) fits 11.</li>
		<li>Your crops go first to the machine that adds the most per item over selling raw, until it is full, then to the other machine. Anything left is sold raw.</li>
		<li>"Per machine per day" shows what one machine adds when it never sits empty. If you have more crops than machines can handle, this is the number that tells you which machine to build more of.</li>
	</ol>
	<h3>Assumptions</h3>
	<ul>
		<li>Machine products ignore the quality of the crop you put in (wiki: Artisan Goods), so high-quality crops can be worth selling raw.</li>
		<li>Prices use the wiki's rounding. Artisan does not apply to Coffee.</li>
		<li>Aged wine (casks) is not included yet.</li>
	</ul>
</section>
<?php
$ref  = array();
$best = array(
	'keg' => 'Keg',
	'jar' => 'Preserves Jar',
	'tie' => 'Tie',
);
foreach ( array_slice( isset( $answers['tables']['keg_vs_jar'] ) ? $answers['tables']['keg_vs_jar'] : array(), 0, 20 ) as $row ) {
	$ref[] = array( $row['name'], $row['keg']['product'] . ' ' . number_format( $row['keg']['price'] ) . 'g', $row['jar']['product'] . ' ' . number_format( $row['jar']['price'] ) . 'g', $best[ $row['better'] ], number_format( $row['keg']['per_day'] ) . 'g', number_format( $row['jar']['per_day'] ) . 'g' );
}
stardew_tools_reference_table(
	'ref-keg-jar',
	'Keg or Preserves Jar for each crop',
	'The 20 crops that earn the most per machine per day, with no professions and normal-quality crops. "Better per item" is the machine that adds more gold to each crop you put in; the last two columns are what one busy machine adds a day. When you have more crops than machines, the per-day columns decide.',
	'Keg and Preserves Jar product prices and gold per machine per day, by crop',
	array( 'Crop', 'Keg product', 'Jar product', 'Better per item', '#Keg per day', '#Jar per day' ),
	$ref
);

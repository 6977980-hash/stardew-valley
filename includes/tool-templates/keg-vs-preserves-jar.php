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
	<p class="answer__lead"><strong>Short answer:</strong> per item, the Keg earns more for fruit worth more than 50g and vegetables worth more than 200g; below that the Preserves Jar wins (Wine is 3× the fruit price, Juice 2.25×, Jelly and Pickles 2× + 50g).
	<?php if ( $sf ) : ?>
	But a jar finishes in about 2.5 days and a keg takes up to 6.25, so when your machines are the limit, jars usually earn more per machine: Starfruit Wine adds <?php echo esc_html( number_format( $sf['wine']['gain_per_machine_day'] ) ); ?>g per keg per day over selling raw, Starfruit Jelly <?php echo esc_html( number_format( $sf['jelly']['gain_per_machine_day'] ) ); ?>g per jar per day.
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

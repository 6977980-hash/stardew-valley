<?php
/**
 * Fish Pond Calculator.
 *
 * @var array $answers
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;
require_once __DIR__ . '/_controls.php';

$fp   = isset( $answers['fishpond'] ) ? $answers['fishpond'] : array();
$pond = Stardew_Tools\Data::get( 'fishponds' );
$fish = array();
foreach ( $pond ? $pond['fish'] : array() as $f ) {
	$fish[ $f['id'] ] = $f['name'] . ( 'legendary' === $f['kind'] ? ' (legendary)' : '' );
}
asort( $fish );
$g = function ( $n ) {
	return number_format( (int) $n ) . 'g';
};
?>
<div class="answer">
	<?php if ( $fp ) : ?>
	<p class="answer__lead"><strong>Short answer:</strong> for a full pond of 10 fish, <strong><?php echo esc_html( $fp['raw'][0]['name'] ); ?></strong> earns the most if you sell what it makes as it comes (about <?php echo esc_html( $g( $fp['raw'][0]['gold_per_day'] ) ); ?> a day), followed by <?php echo esc_html( $fp['raw'][1]['name'] ); ?> (<?php echo esc_html( $g( $fp['raw'][1]['gold_per_day'] ) ); ?>). If you turn the roe into Aged Roe or Caviar with Artisan, <?php echo esc_html( $fp['processed'][0]['name'] ); ?> leads at about <?php echo esc_html( $g( $fp['processed'][0]['gold_per_day'] ) ); ?> a day with <?php echo (int) $fp['processed'][0]['jars']; ?> Preserves Jars, and <?php echo esc_html( $fp['processed'][2]['name'] ); ?> Caviar makes <?php echo esc_html( $g( $fp['processed'][2]['gold_per_day'] ) ); ?>. Legendary fish earn more but you can only keep one of each.</p>
	<?php endif; ?>
	<p>Pick a fish and how many live in the pond to see what it produces each day.</p>
</div>

<form class="tool-form" id="fish-pond-form" novalidate>
	<fieldset>
		<legend>Your pond</legend>
		<div class="field-grid">
			<?php
			stardew_tools_select( 'fish', 'Fish', $fish, 'sturgeon' );
			stardew_tools_number( 'pop', 'Fish in the pond', 10, 1, 10, 'Ponds start at 3 fish; quests raise the limit to 10.' );
			stardew_tools_number( 'days', 'Days', 28, 1, 336 );
			stardew_tools_select(
				'roe',
				'Roe',
				array(
					'raw'       => 'Sell roe as it is',
					'processed' => 'Aged Roe / Caviar (Preserves Jar)',
				),
				'raw'
			);
			?>
		</div>
		<div class="check-row">
			<?php stardew_tools_checkbox( 'artisan', 'Artisan (+40% Aged Roe, Caviar)' ); ?>
		</div>
	</fieldset>
	<?php stardew_tools_form_actions(); ?>
</form>
<?php stardew_tools_noscript(); ?>

<section class="tool-results" aria-labelledby="results-heading">
	<h2 id="results-heading">Results</h2>
	<p class="result-summary" data-summary role="status" aria-live="polite"></p>
	<div class="table-wrap" data-results></div>
	<h2>Best fish for ponds</h2>
	<p>Full pond, with your roe and Artisan settings above.</p>
	<div class="table-wrap" data-ranking></div>
</section>

<?php stardew_tools_ad( 'below-result' ); ?>

<section class="tool-explain">
	<h2>How a fish pond produces</h2>
	<ul>
		<li><strong>Daily chance:</strong> each day a pond has a base chance to make something: 8% per fish plus 15% (23% with one fish, 95% with ten). Legendary fish ponds have 50%.</li>
		<li><strong>Which item:</strong> each fish has its own list of items and shares by population, taken from the fish's page on the wiki. The chance for an item is the base chance times its share.</li>
		<li><strong>Extra roe:</strong> when a pond makes roe there is a 20% chance of one more, which can repeat; that adds a quarter of a roe on average.</li>
		<li><strong>Prices:</strong> roe sells for 30g plus half the fish's price. Aged Roe is worth twice the roe; Sturgeon roe becomes Caviar instead. Fisher and Angler do not change roe prices.</li>
	</ul>
	<h3>Assumptions</h3>
	<ul>
		<li>The population stays the same for the days you enter, and you collect the pond every day (an uncollected item is replaced by the next one).</li>
		<li>Items without a sell price (such as Golden Coconut) count as 0g.</li>
		<li>Building a pond costs <?php echo esc_html( $pond ? $g( $pond['building']['cost'] ) : '' ); ?> plus materials at Robin's.</li>
	</ul>
</section>

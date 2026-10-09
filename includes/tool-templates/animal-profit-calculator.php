<?php
/**
 * Animal Profit Calculator.
 *
 * @var array $answers
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;
require_once __DIR__ . '/_controls.php';

$an      = isset( $answers['animals'] ) ? $answers['animals'] : array();
$adata   = Stardew_Tools\Data::get( 'animals' );
$animals = array();
foreach ( $adata ? $adata['animals'] : array() as $a ) {
	$animals[ $a['id'] ] = $a['name'];
}
$g    = function ( $n ) {
	return number_format( (int) $n ) . 'g';
};
$find = function ( $list, $id ) {
	foreach ( $list as $row ) {
		if ( $row['id'] === $id ) {
			return $row;
		}
	}
	return null;
};
?>
<div class="answer">
	<?php if ( $an ) : ?>
		<?php
		$pig   = $find( $an['raw'], 'pig' );
		$cow   = $find( $an['raw'], 'cow' );
		$best2 = $an['processed'][1];
		?>
	<p class="answer__lead"><strong>Short answer:</strong> the Pig earns the most by far: about <?php echo esc_html( $g( $pig['gold_per_day'] ) ); ?> a day in Truffles on days it can go outside (not in Winter or rain), and more as Truffle Oil. Among animals that work every day, <?php echo esc_html( $best2['name'] ); ?> is best when you process the products with Artisan (<?php echo esc_html( $g( $best2['gold_per_day'] ) ); ?> a day), while a Cow earns <?php echo esc_html( $g( $cow['gold_per_day'] ) ); ?> a day selling milk and pays for itself fastest. All at full hearts and mood, without professions unless stated.</p>
	<?php endif; ?>
	<p>Pick an animal and your farm's situation to see what it makes per day.</p>
</div>

<form class="tool-form" id="animals-form" novalidate>
	<fieldset>
		<legend>Your animals</legend>
		<div class="field-grid">
			<?php
			stardew_tools_select( 'animal', 'Animal', $animals, 'cow' );
			stardew_tools_number( 'count', 'How many', 1, 1, 200 );
			stardew_tools_select(
				'hearts',
				'Hearts (friendship)',
				array(
					'5' => '5 hearts (1,000)',
					'4' => '4 hearts (800)',
					'3' => '3 hearts (600)',
					'2' => '2 hearts (400)',
					'1' => '1 heart (200)',
					'0' => '0 hearts',
				),
				'5'
			);
			stardew_tools_select(
				'mood',
				'Mood',
				array(
					'255' => 'Very happy (255, max)',
					'200' => 'Happy (200)',
					'150' => 'Fine (150)',
					'100' => 'Unhappy (100)',
				),
				'255'
			);
			stardew_tools_number( 'days', 'Days', 28, 1, 336 );
			stardew_tools_number( 'hay', 'Days on bought hay', 0, 0, 336, 'Animals eat 1 hay a day when there is no grass (Winter, rain). 50g at Marnie\'s.' );
			?>
		</div>
		<div class="check-row">
			<?php
			stardew_tools_checkbox( 'process', 'Use machines (Mayonnaise, Cheese, Loom, Oil Maker)' );
			stardew_tools_checkbox( 'rancher', 'Rancher (+20% animal products)' );
			stardew_tools_checkbox( 'artisan', 'Artisan (+40% artisan goods)' );
			stardew_tools_checkbox( 'coopmaster', 'Coopmaster' );
			stardew_tools_checkbox( 'shepherd', 'Shepherd' );
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
	<h2>Every animal compared</h2>
	<p>One animal each, with your hearts, mood, machines and professions above.</p>
	<div class="table-wrap" data-ranking></div>
</section>

<?php stardew_tools_ad( 'below-result' ); ?>

<section class="tool-explain">
	<h2>How the numbers are worked out</h2>
	<ul>
		<li><strong>Quality:</strong> score = hearts ÷ 1000 − (1 − mood ÷ 225), plus 0.333 with Coopmaster (coop animals) or Shepherd (barn animals). Iridium needs a score of 0.95 or more; then gold and silver are rolled, as the wiki describes.</li>
		<li><strong>Large and Deluxe products:</strong> Large Eggs and Milk need 200+ friendship; the chance is (friendship + mood × mood modifier) ÷ 1200. Duck Feathers use ÷ 4750 and Rabbit's Feet ÷ 5000, plus daily luck (taken as 0).</li>
		<li><strong>Pigs:</strong> one Truffle a day outside, plus extra Truffles with a chance of friendship ÷ 1500 each time (about 3 a day at full hearts). Truffle quality comes from your Foraging skill, so it is counted as regular.</li>
		<li><strong>Machines:</strong> a product goes into its machine only when that is worth more. Large Eggs and Milk make gold-quality Mayonnaise and Cheese; good Wool can make a second Cloth.</li>
		<li><strong>Professions:</strong> Rancher raises raw animal products and Artisan raises artisan goods. Truffles get neither (Truffle Oil gets Artisan).</li>
	</ul>
	<h3>Assumptions</h3>
	<ul>
		<li>Hearts and mood stay the same for the days you enter. Mood depends on feeding, petting and the heater.</li>
		<li>Animals are already grown, and their house and the animal's price are not counted in the daily gold.</li>
	</ul>
</section>

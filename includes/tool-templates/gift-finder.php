<?php
/**
 * Gift Finder: villager to gifts, or item to villagers.
 *
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;
require_once __DIR__ . '/_controls.php';

$gifts     = Stardew_Tools\Data::get( 'gifts' );
$villagers = array();
$items     = array();
foreach ( $gifts ? $gifts['villagers'] : array() as $v ) {
	$villagers[ $v['id'] ] = $v['name'];
}
foreach ( $gifts ? $gifts['items'] : array() as $i ) {
	$items[ $i['id'] ] = $i['name'];
}
asort( $villagers );
asort( $items );
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> choose a villager to see what they love and like, or choose an item to see who loves it. A loved gift is worth 80 friendship points and a liked one 45; a heart is 250 points. On a birthday the points are multiplied by 8.</p>
	<p>Covers all <?php echo (int) count( $villagers ); ?> villagers. Items that only fit a whole category, such as "All Fruit", are listed as categories because the wiki doesn't name every member.</p>
</div>

<form class="tool-form" id="gift-form" novalidate>
	<fieldset>
		<legend>Look up</legend>
		<div class="field-grid">
			<?php
			stardew_tools_select(
				'mode',
				'I want to find',
				array(
					'villager' => 'Gifts for a villager',
					'item'     => 'Who likes an item',
				),
				'villager'
			);
			stardew_tools_select( 'villager', 'Villager', $villagers, 'abigail' );
			stardew_tools_select( 'item', 'Item', $items, 'pearl' );
			?>
		</div>
	</fieldset>
	<fieldset>
		<legend>What a gift is worth</legend>
		<div class="field-grid">
			<?php
			stardew_tools_select(
				'quality',
				'Item quality',
				array(
					'normal'  => 'Normal',
					'silver'  => 'Silver',
					'gold'    => 'Gold',
					'iridium' => 'Iridium',
				),
				'normal',
				'Quality only changes loved and liked gifts.'
			);
			stardew_tools_select(
				'event',
				'When',
				array(
					'none'        => 'Any day',
					'birthday'    => 'Their birthday (x8)',
					'winter_star' => 'Winter Star gift (x5)',
				),
				'none'
			);
			?>
		</div>
		<div class="check-row">
			<?php stardew_tools_checkbox( 'friendship101', 'I have read Friendship 101 (+10%)' ); ?>
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
	<h2>How gift tastes work</h2>
	<ul>
		<li><strong>Points:</strong> loved +80, liked +45, neutral +20, disliked -20, hated -40. Quality multiplies loved and liked gifts only: silver x1.1, gold x1.25, iridium x1.5.</li>
		<li><strong>Events:</strong> a birthday gift counts 8 times and your Winter Star gift 5 times. The biggest single gift is an iridium loved gift on a birthday, 960 points.</li>
		<li><strong>Universal tastes:</strong> everyone loves things like Pearl and Golden Pumpkin unless the villager has their own opinion, and a villager's own list always wins.</li>
	</ul>
	<h3>Assumptions</h3>
	<ul>
		<li>Hearts are points divided by 250, the 250 points the wiki gives for Stardrop Tea as one heart.</li>
		<li>Points are rounded to whole numbers.</li>
	</ul>
</section>

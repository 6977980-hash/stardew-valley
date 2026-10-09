<?php
/**
 * XP Calculator: Farming and Fishing.
 *
 * @var array $answers
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;
require_once __DIR__ . '/_controls.php';

$xp     = isset( $answers['xp'] ) ? $answers['xp'] : array();
$skills = Stardew_Tools\Data::get( 'skills' );
$crops  = array();
$fish   = array();
foreach ( $skills ? $skills['farming']['crops'] : array() as $c ) {
	$crops[ $c['id'] ] = $c['name'] . ' (' . $c['xp'] . ' XP)';
}
foreach ( $skills ? $skills['fishing']['fish'] : array() as $f ) {
	$fish[ $f['id'] ] = $f['name'];
}
asort( $crops );
asort( $fish );
$levels = array();
for ( $i = 0; $i <= 9; $i++ ) {
	$levels[ $i ] = (string) $i;
}
$targets = array();
for ( $i = 1; $i <= 10; $i++ ) {
	$targets[ $i ] = (string) $i;
}
$n = function ( $v ) {
	return number_format( (int) $v );
};
?>
<div class="answer">
	<?php if ( $xp ) : ?>
	<p class="answer__lead"><strong>Short answer:</strong> every skill needs <?php echo esc_html( $n( $xp['level_10'] ) ); ?> XP to reach level 10. In Farming that is <?php echo esc_html( $n( $xp['parsnip']['harvests_to_10'] ) ); ?> Parsnip harvests, or <?php echo esc_html( $n( $xp['farming_per_day'][0]['harvests_to_10'] ) ); ?> Hops harvests. Per tile, <?php echo esc_html( $xp['farming_per_day'][0]['name'] ); ?> gives the most farming XP a day. In Fishing, a normal Sardine gives <?php echo (int) $xp['sardine']['xp']; ?> XP and an <?php echo esc_html( $xp['fishing_top'][0]['name'] ); ?> <?php echo (int) $xp['fishing_top'][0]['xp']; ?> XP (<?php echo (int) $xp['fishing_top'][0]['perfect']; ?> with a perfect catch). Crab pots give <?php echo (int) $xp['crab_pot']; ?> XP each time you empty one.</p>
	<?php endif; ?>
	<p>Pick a skill, where you are now and the level you want. It counts the XP left and how many harvests or catches that takes.</p>
</div>

<form class="tool-form" id="xp-form" novalidate>
	<fieldset>
		<legend>Your skill</legend>
		<div class="field-grid">
			<?php
			stardew_tools_select(
				'skill',
				'Skill',
				array(
					'farming' => 'Farming',
					'fishing' => 'Fishing',
				),
				'farming'
			);
			stardew_tools_select( 'level', 'Current level', $levels, 0 );
			stardew_tools_number( 'xp', 'XP into this level', 0, 0, 5000, 'Shown on the skills page as the bar toward the next level; leave 0 if unsure.' );
			stardew_tools_select( 'target', 'Target level', $targets, 10 );
			?>
		</div>
	</fieldset>
	<fieldset data-skill="farming">
		<legend>Farming</legend>
		<div class="field-grid">
			<?php stardew_tools_select( 'crop', 'Crop you harvest', $crops, 'parsnip', 'XP comes once per harvest, whatever the quality or number of items.' ); ?>
		</div>
	</fieldset>
	<fieldset data-skill="fishing">
		<legend>Fishing</legend>
		<div class="field-grid">
			<?php
			stardew_tools_select( 'fish', 'Fish you catch', $fish, 'sardine' );
			stardew_tools_select(
				'quality',
				'Fish quality',
				array(
					'normal' => 'Normal',
					'silver' => 'Silver',
					'gold'   => 'Gold',
				),
				'normal',
				'The quality before a perfect catch raises it.'
			);
			?>
		</div>
		<div class="check-row">
			<?php
			stardew_tools_checkbox( 'perfect', 'Perfect catch (x2.4)' );
			stardew_tools_checkbox( 'treasure', 'Treasure chest (x2.2)' );
			?>
		</div>
	</fieldset>
	<?php stardew_tools_form_actions(); ?>
</form>
<?php stardew_tools_noscript(); ?>

<section class="tool-results" aria-labelledby="results-heading">
	<h2 id="results-heading">Results</h2>
	<p class="result-summary" data-summary role="status" aria-live="polite"></p>
	<div class="table-wrap" tabindex="0" role="region" aria-label="Results table" data-results></div>
</section>

<?php stardew_tools_ad( 'below-result' ); ?>

<section class="tool-explain">
	<h2>How skill XP works</h2>
	<ul>
		<li><strong>Levels:</strong> all five skills use the same table. Level 1 needs 100 XP and level 10 needs <?php echo esc_html( $xp ? $n( $xp['level_10'] ) : '15,000' ); ?> XP in total.</li>
		<li><strong>Farming:</strong> each harvest gives XP based on the crop's base price. Quality doesn't change it, and crops that drop several items (Blueberries, Potatoes) only give XP for the first one. Regrowing crops give XP on every harvest. Petting, milking and collecting animal products give 5 XP each.</li>
		<li><strong>Fishing:</strong> a catch gives (quality + 1) x 3 plus a third of the fish's difficulty, rounded down. A treasure chest multiplies it by 2.2 and a perfect catch by 2.4. Legendary fish give 5 times as much. Crab pots give <?php echo (int) ( $xp ? $xp['crab_pot'] : 5 ); ?> XP each time you collect one.</li>
	</ul>
	<h3>Assumptions</h3>
	<ul>
		<li>XP per day for crops is for one tile once it is producing: one harvest per regrow for regrowing crops, one per growing cycle for the rest. It doesn't count fertilizer or Agriculturist.</li>
		<li>The wiki's own fishing examples disagree on the value used for gold fish; we use gold = 2, as in its Sardine example.</li>
	</ul>
</section>

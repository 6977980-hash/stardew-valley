<?php
/**
 * Crafting Calculator with shopping list.
 *
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;
require_once __DIR__ . '/_controls.php';

$crafting = Stardew_Tools\Data::get( 'crafting' );
$recipes  = array();
foreach ( $crafting ? $crafting['recipes'] : array() as $r ) {
	$recipes[ $r['id'] ] = $r['name'];
}
asort( $recipes );
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> pick what you want to craft and how many. The calculator breaks bars and other made ingredients down to the ore, wood and stone you need to gather, and prices the parts the shops sell. There are <?php echo (int) count( $recipes ); ?> recipes.</p>
	<p>Add several things to build one shopping list. Your list is saved in this browser.</p>
</div>

<form class="tool-form" id="craft-form" novalidate>
	<fieldset>
		<legend>What to craft</legend>
		<div class="field-grid">
			<?php
			stardew_tools_select( 'recipe', 'Recipe', $recipes, 'crab-pot' );
			stardew_tools_number( 'qty', 'How many', 1, 1, 999 );
			?>
		</div>
		<div class="form-actions">
			<button type="button" class="button" data-add>Add to list</button>
		</div>
	</fieldset>
	<fieldset>
		<legend>Your game</legend>
		<div class="check-row">
			<?php
			stardew_tools_checkbox( 'trapper', 'Trapper profession (cheaper Crab Pots)' );
			stardew_tools_checkbox( 'year2', 'Year 2 or later (shop prices)', true );
			?>
		</div>
	</fieldset>
	<?php stardew_tools_form_actions(); ?>
</form>
<?php stardew_tools_noscript(); ?>

<section class="tool-results" aria-labelledby="results-heading">
	<h2 id="results-heading">Shopping list</h2>
	<div data-list></div>
	<p class="result-summary" data-summary role="status" aria-live="polite"></p>
	<div class="table-wrap" tabindex="0" role="region" aria-label="Results table" data-results></div>
	<div class="table-wrap" tabindex="0" role="region" aria-label="Made ingredients" data-made></div>
</section>

<?php stardew_tools_ad( 'below-result' ); ?>

<section class="tool-explain">
	<h2>How the list is worked out</h2>
	<ul>
		<li><strong>Made ingredients:</strong> an Iron Bar is five Iron Ore and a Coal from a furnace, so a Crab Pot's three bars turn into 15 ore and 3 coal. Where one craft makes several items (Fertilizer, Fences), crafts are rounded up.</li>
		<li><strong>Prices:</strong> only items a shop always sells get a price. Wood, Stone, Copper Ore, Iron Ore, Gold Ore, Coal and a few more are priced; things you find or catch aren't, so the total is what you would pay if you bought everything on offer.</li>
		<li><strong>Coal:</strong> every smelting run uses one Coal, whatever the metal.</li>
	</ul>
	<h3>Assumptions</h3>
	<ul>
		<li>Furnace time and fuel aren't counted. Smelting takes 30 minutes for copper up to 4 hours for iridium.</li>
		<li>Refined Quartz is smelted from Quartz. Recycling a Broken CD or Broken Glasses also works but isn't used here.</li>
	</ul>
</section>

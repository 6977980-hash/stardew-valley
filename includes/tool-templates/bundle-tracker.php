<?php
/**
 * Bundle Tracker: tick off Community Center bundle items. Saved in this browser.
 *
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;
require_once __DIR__ . '/_controls.php';

$bundles  = Stardew_Tools\Data::get( 'bundles' );
$standard = 0;
$remixed  = 0;
foreach ( $bundles ? $bundles['bundles'] : array() as $b ) {
	if ( 'standard' === $b['set'] ) {
		++$standard;
	} else {
		++$remixed;
	}
}
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> tick each item as you put it in or collect it. The tracker shows how far each room is and a list of what you still need to find. It covers the <?php echo (int) $standard; ?> standard bundles and the <?php echo (int) $remixed; ?> Remixed Bundles variants.</p>
	<p>Nothing is sent anywhere. Your ticks are saved in this browser only, so clearing site data or switching browsers starts you over.</p>
</div>

<form class="tool-form" id="bundle-form" novalidate>
	<fieldset class="bundle-controls">
		<legend>Which bundles does your save use?</legend>
		<div class="check-row">
			<label><input type="radio" name="bundle-set" value="standard" checked> Standard bundles</label>
			<label><input type="radio" name="bundle-set" value="remixed"> Remixed bundles</label>
		</div>
		<p class="field__hint" data-remix-hint hidden>Remixed saves pick some bundles at random. Tick “In my game” on the ones you actually have in each room.</p>
	</fieldset>
	<div class="tool-actions">
		<button type="button" class="button button--ghost" data-reset>Clear my ticks</button>
	</div>
</form>
<noscript><p class="notice">The tracker needs JavaScript. The bundle list below is shown without ticks.</p></noscript>

<section class="tool-results" aria-labelledby="results-heading">
	<h2 id="results-heading">Your progress</h2>
	<p class="result-summary" data-summary role="status" aria-live="polite"></p>
	<div data-rooms></div>
	<h2 id="needed-heading">Still to find</h2>
	<div class="table-wrap" tabindex="0" role="region" aria-label="Results table" data-results></div>
</section>

<?php stardew_tools_ad( 'below-result' ); ?>

<section class="tool-explain">
	<h2>How the tracker works</h2>
	<ul>
		<li><strong>Slots:</strong> many bundles show more items than you need. A bundle is finished when you have filled as many slots as it asks for, with any of the items shown.</li>
		<li><strong>Quality:</strong> a bundle that names a quality accepts that quality or better. Bundles that don't name one take any quality.</li>
		<li><strong>Alternatives:</strong> in some Remixed bundles two items are alternatives for the same slot. Ticking one fills the slot, and a second from the same pair doesn't count twice.</li>
		<li><strong>Season:</strong> the list of what's left shows the seasons each item can be found in, so you can plan around the calendar.</li>
	</ul>
	<h3>Assumptions</h3>
	<ul>
		<li>Which Remixed bundles are in your save is random in the game and can't be read from here, so you choose them.</li>
		<li>Gold bundles in the Vault are ticked once you've paid them.</li>
	</ul>
</section>

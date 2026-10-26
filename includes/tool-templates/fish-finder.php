<?php
/**
 * Fish Finder: which fish bite for a season, weather, hour and place.
 *
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;
require_once __DIR__ . '/_controls.php';

$fish  = Stardew_Tools\Data::get( 'fish' );
$rows  = isset( $answers['tables']['fish'] ) ? $answers['tables']['fish'] : array();
$count = $fish ? count( $fish['fish'] ) : 0;
$kinds = array();
foreach ( $fish ? $fish['fish'] : array() as $f ) {
	$kinds[ $f['kind'] ] = isset( $kinds[ $f['kind'] ] ) ? $kinds[ $f['kind'] ] + 1 : 1;
}
// Most valuable fish a fishing rod catches on an ordinary day (not legendary, not Night Market).
$best = null;
foreach ( $rows as $r ) {
	if ( 'pole' === $r['kind'] ) {
		$best = $r;
		break;
	}
}
$hours = array( 'any' => 'Any time' );
for ( $h = 6; $h < 26; $h++ ) {
	$n            = $h % 24;
	$hours[ $h ]  = 0 === $n ? '12am (midnight)' : ( 12 === $n ? '12pm (noon)' : ( $n < 12 ? $n . 'am' : ( $n - 12 ) . 'pm' ) );
}
$nm = $fish ? $fish['rules']['night_market']['days'] : null;
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> pick the season, weather, time and place you are fishing and the table shows every fish that can bite there, most valuable first. Leave a box on "Any" to see all of them, or type a name to look up one fish.</p>
	<p>Covers all <?php echo (int) $count; ?> fish: <?php echo (int) ( isset( $kinds['pole'] ) ? $kinds['pole'] : 0 ); ?> caught with a rod, <?php echo (int) ( isset( $kinds['night-market'] ) ? $kinds['night-market'] : 0 ); ?> from the Night Market submarine<?php echo $nm ? ' (Winter ' . (int) $nm['from'] . '–' . (int) $nm['to'] . ')' : ''; ?>, <?php echo (int) ( isset( $kinds['legendary'] ) ? $kinds['legendary'] : 0 ); ?> legendary fish and <?php echo (int) ( isset( $kinds['crab-pot'] ) ? $kinds['crab-pot'] : 0 ); ?> from Crab Pots.<?php if ( $best ) : ?> The most valuable everyday rod catch is the <?php echo esc_html( $best['name'] ); ?> (<?php echo esc_html( number_format( (int) $best['price'] ) ); ?>g): <?php echo esc_html( $best['where'] ); ?>, <?php echo esc_html( lcfirst( $best['time'] ) ); ?>, <?php echo esc_html( 'All seasons' === $best['season'] ? 'all seasons' : $best['season'] ); ?>, <?php echo esc_html( strtolower( $best['weather'] ) ); ?> weather.<?php endif; ?></p>
</div>

<form class="tool-form" id="fish-form" novalidate>
	<fieldset>
		<legend>When and where</legend>
		<div class="field-grid">
			<?php
			stardew_tools_select(
				'season',
				'Season',
				array(
					'any'    => 'Any season',
					'spring' => 'Spring',
					'summer' => 'Summer',
					'fall'   => 'Fall',
					'winter' => 'Winter',
				),
				'any'
			);
			stardew_tools_select(
				'weather',
				'Weather',
				array(
					'any'  => 'Any weather',
					'sun'  => 'Sunny (or windy)',
					'rain' => 'Rain or storm',
				),
				'any',
				'Rain in Winter needs a Rain Totem.'
			);
			stardew_tools_select( 'hour', 'Time of day', $hours, 'any' );
			$areas = array( 'any' => 'Anywhere' );
			foreach ( array(
				'ocean'        => 'Ocean (the Beach)',
				'river'        => 'Rivers (Town, Forest)',
				'lake'         => 'Mountain Lake and ponds',
				'secret-woods' => 'Secret Woods',
				'swamp'        => "Witch's Swamp",
				'sewers'       => 'Sewers and Mutant Bug Lair',
				'mines'        => 'The Mines',
				'desert'       => 'Calico Desert',
				'island'       => 'Ginger Island',
				'night-market' => 'Night Market submarine',
				'crab-pot'     => 'Crab Pots',
			) as $k => $label ) {
				$areas[ $k ] = $label;
			}
			stardew_tools_select( 'area', 'Place', $areas, 'any' );
			?>
		</div>
	</fieldset>
	<fieldset>
		<legend>Show</legend>
		<div class="field-grid">
			<div class="field"><label for="st-q">Fish name</label><input id="st-q" name="q" type="search" autocomplete="off" placeholder="e.g. Catfish" value=""></div>
			<?php
			stardew_tools_select(
				'sort',
				'Sort by',
				array(
					'price'      => 'Price, highest first',
					'name'       => 'Name',
					'difficulty' => 'Difficulty, easiest first',
				),
				'price'
			);
			?>
		</div>
		<div class="check-row">
			<?php
			stardew_tools_checkbox( 'legendary', 'Include legendary fish', true );
			stardew_tools_checkbox( 'crabpots', 'Include Crab Pot catches', true );
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
	<h2>How fish times, seasons and weather work</h2>
	<ul>
		<li><strong>Time:</strong> a fish only bites inside its hours. The fishing day runs from 6am to 2am, so "6pm–2am" means until you pass out. "Any time" fish bite all day.</li>
		<li><strong>Weather:</strong> "Sun" fish bite on sunny and windy days, "Rain" fish on rainy and stormy days. It never rains in Winter, so Winter rain fish need a Rain Totem used the day before.</li>
		<li><strong>Place:</strong> rivers, the Mountain Lake and the ocean have different fish even in the same season. Ginger Island has its own weather, and some ocean fish bite there all year.</li>
		<li><strong>Magic Bait</strong> ignores season, time and weather: with it, any fish of the place can bite.</li>
		<li><strong>Crab Pots</strong> catch the same creatures in every season and weather; the table only says whether they need ocean or fresh water.</li>
	</ul>
	<h3>Assumptions</h3>
	<ul>
		<li>Prices are base prices at normal quality, before the Fisher (+25%) and Angler (+50%) professions.</li>
		<li>Legendary fish can be caught once per save, and each needs a minimum Fishing level, shown under its location.</li>
	</ul>
</section>
<?php
$ref = array();
foreach ( $rows as $r ) {
	$ref[] = array( $r['name'] . ( 'legendary' === $r['kind'] ? ' (legendary)' : '' ), $r['where'] . ( $r['level'] ? ' (Fishing level ' . (int) $r['level'] . '+)' : '' ), $r['time'], $r['season'], $r['weather'], number_format( (int) $r['price'] ) . 'g' );
}
stardew_tools_reference_table(
	'ref-fish',
	'Every fish: where, when and what weather',
	'All ' . (int) $count . ' fish in Stardew Valley ' . esc_html( Stardew_Tools\Config::get( 'game_version' ) ) . ', most valuable first. The filters above narrow this list to your day.',
	'Where and when to catch every fish',
	array( 'Fish', 'Where', 'Time', 'Season', 'Weather', '#Price' ),
	$ref,
	'Locations, hours, seasons and weather come from the wiki\'s Fish page and each fish\'s own page, which agree for every fish listed.'
);

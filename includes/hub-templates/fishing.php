<?php
/**
 * Hub intro: Fishing and Fish Ponds.
 *
 * @var array $answers
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;
$fp = isset( $answers['guides']['fishponds'] ) ? $answers['guides']['fishponds'] : array();
$xp = isset( $answers['xp'] ) ? $answers['xp'] : array();
$g  = function ( $n ) {
	return number_format( (int) $n ) . 'g';
};
?>
<p class="hub-lead">Fish ponds turn one good catch into steady income: roe, Aged Roe and Caviar every day, plus the odd rare item. Which fish to put in them is the big decision, and the answer depends on whether you run Preserves Jars and how full the pond is.</p>
<p>Fishing itself pays off through levels: higher Fishing makes the bar bigger, unlocks better rods and tackle, and leads to the Fisher and Angler professions that raise fish prices.</p>
<h2>Start here</h2>
<ol>
	<li>Which fish to put in a pond? Read <a href="<?php echo esc_url( Stardew_Tools\Guides::guide_url( 'best-fish-for-fish-ponds' ) ); ?>">Best Fish for Fish Ponds</a>.</li>
	<li>Check any fish at your pond's population with the <a href="<?php echo esc_url( Stardew_Tools\Tools::url( 'fish-pond-calculator' ) ); ?>">Fish Pond Calculator</a>.</li>
	<li>Wondering how long until level 10? The <a href="<?php echo esc_url( Stardew_Tools\Tools::url( 'xp-calculator' ) ); ?>">XP Calculator</a> counts the catches.</li>
</ol>
<?php if ( count( $fp['raw'] ) >= 3 && count( $fp['processed'] ) >= 3 ) : ?>
<h2>What a full pond earns</h2>
<p>We worked out the daily income of all <?php echo (int) $fp['count']; ?> fish that can live in a pond, using the game's own rules for how often a pond produces something and what it makes. The numbers below are for a full pond of 10 fish, averaged over the lucky and unlucky days.</p>
<ul>
	<li><strong>Selling straight from the pond:</strong> <?php echo esc_html( $fp['raw'][0]['name'] ); ?> earns about <?php echo esc_html( $g( $fp['raw'][0]['gold_per_day'] ) ); ?> a day and <?php echo esc_html( $fp['raw'][1]['name'] ); ?> about <?php echo esc_html( $g( $fp['raw'][1]['gold_per_day'] ) ); ?>. Everything below them is under <?php echo esc_html( $g( $fp['raw'][2]['gold_per_day'] ) ); ?>.</li>
	<li><strong>With roe turned into Aged Roe or Caviar (and the Artisan profession):</strong> <?php echo esc_html( $fp['processed'][0]['name'] ); ?> earns about <?php echo esc_html( $g( $fp['processed'][0]['gold_per_day'] ) ); ?> a day and <?php echo esc_html( $fp['processed'][1]['name'] ); ?> about <?php echo esc_html( $g( $fp['processed'][1]['gold_per_day'] ) ); ?>, with <?php echo esc_html( $fp['processed'][2]['name'] ); ?> third at <?php echo esc_html( $g( $fp['processed'][2]['gold_per_day'] ) ); ?>.</li>
</ul>
<p>Put another way, processing the roe more than doubles what the best fish earns, but only if you own enough Preserves Jars to keep up. The best processed pond needs <?php echo (int) $fp['processed'][0]['jars']; ?> jars working on it, and the third needs <?php echo (int) $fp['processed'][2]['jars']; ?>, so count your jars before you count your fish.</p>
<?php endif; ?>
<?php
$raw_by_id = array();
foreach ( $fp['raw'] as $r ) {
	$raw_by_id[ $r['id'] ] = $r['gold_per_day'];
}
?>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Best processed ponds, gold per day at 10 fish</caption>
	<thead><tr><th scope="col">Fish</th><th scope="col">Processed</th><th scope="col">Jars to keep up</th><th scope="col">Sold raw</th></tr></thead>
	<tbody>
	<?php foreach ( array_slice( $fp['processed'], 0, 5 ) as $r ) : ?>
		<tr><th scope="row"><?php echo esc_html( $r['name'] ); ?></th><td><?php echo esc_html( $g( $r['gold_per_day'] ) ); ?></td><td><?php echo (int) $r['jars']; ?></td><td><?php echo isset( $raw_by_id[ $r['id'] ] ) ? esc_html( $g( $raw_by_id[ $r['id'] ] ) ) : 'lower'; ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<?php if ( ! empty( $fp['ramp'][0] ) ) : ?>
<h2>A pond takes weeks to fill</h2>
<p>Most pond fish start with room for only one and need quest items from you at each step to grow. <?php echo esc_html( $fp['ramp'][0]['name'] ); ?> adds a new fish every <?php echo (int) $fp['ramp'][0]['spawn_days']; ?> days, and filling the pond to 10 takes at least <?php echo (int) $fp['ramp'][0]['days_to_fill']; ?> days if you hand over each quest item the day it is asked for. <?php echo esc_html( $fp['ramp'][1]['name'] ); ?> takes about <?php echo (int) $fp['ramp'][1]['days_to_fill']; ?>. That is why a pond should be built early in a season, not the week before you need the money.</p>
<p>The first quest for <?php echo esc_html( $fp['ramp'][0]['name'] ); ?> asks for one of <?php echo esc_html( implode( ', ', $fp['ramp'][0]['quests'][0]['options'] ) ); ?>, and the last asks for one of <?php echo esc_html( implode( ', ', $fp['ramp'][0]['quests'][3]['options'] ) ); ?>. The Fish Pond Calculator lists the quest items for every fish.</p>
<?php endif; ?>
<h2>Three questions before you build</h2>
<ol>
	<li><strong>Raw or processed?</strong> The best fish changes with the answer, so decide how many Preserves Jars you will run first.</li>
	<li><strong>Can you catch it?</strong> Some top fish are rare or live in one place. A slightly lower earner you can catch ten of beats a better one you cannot.</li>
	<li><strong>How soon do you need the income?</strong> Ponds fill slowly, so fish that start with a larger population, or that you can restock from a catch, pay off sooner.</li>
</ol>
<?php if ( ! empty( $xp['fishing_top'][0] ) && ! empty( $xp['level_10'] ) ) : ?>
<h2>Fishing levels</h2>
<p>Fishing level 10 takes <?php echo esc_html( number_format( (int) $xp['level_10'] ) ); ?> XP in total. A single <?php echo esc_html( $xp['fishing_top'][0]['name'] ); ?> gives <?php echo (int) $xp['fishing_top'][0]['xp']; ?> XP, or <?php echo (int) $xp['fishing_top'][0]['perfect']; ?> with a perfect catch, which is among the best of any fish.</p>
<?php endif; ?>

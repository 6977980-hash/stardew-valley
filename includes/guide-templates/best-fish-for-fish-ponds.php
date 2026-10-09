<?php
/**
 * Guide: Best fish for fish ponds.
 *
 * @var array    $g        data/answers.json "guides".
 * @var callable $gold     Formats gold.
 * @var callable $tool_url Tool permalink.
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

$fp = isset( $g['fishponds'] ) ? $g['fishponds'] : null;
if ( ! $fp ) {
	return;
}
$raw  = $fp['raw'];
$proc = $fp['processed'];
$leg  = $fp['legendary'];
$by   = array();
foreach ( $raw as $r ) {
	$by[ $r['id'] ] = $r;
}
$pond_url = $tool_url( 'fish-pond-calculator' );
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> for gold, the best pond fish are <strong><?php echo esc_html( $proc[0]['name'] ); ?></strong> and <strong><?php echo esc_html( $proc[1]['name'] ); ?></strong>. With the roe turned into Aged Roe and the Artisan profession, a full pond of 10 earns about <?php echo esc_html( $gold( $proc[0]['gold_per_day'] ) ); ?> and <?php echo esc_html( $gold( $proc[1]['gold_per_day'] ) ); ?> a day. <?php echo esc_html( $proc[2]['name'] ); ?> is third at <?php echo esc_html( $gold( $proc[2]['gold_per_day'] ) ); ?> as Caviar. If you'd rather not run Preserves Jars, <?php echo esc_html( $raw[0]['name'] ); ?> is the best pond to sell straight from.</p>
</div>

<p>We ranked all <?php echo (int) $fp['count']; ?> fish that can live in a pond with the same rules the game uses: the chance a pond produces something each day grows with the number of fish, and each fish has its own list of items and their odds. Roe also has a chance of dropping extra roe. Numbers are for a full pond of 10 and average out the random days.</p>

<h2>If you process the roe</h2>
<p>Roe from most fish goes into a Preserves Jar and comes out as Aged Roe. Sturgeon roe becomes Caviar. Prices below include the Artisan profession (+40% on Aged Roe and Caviar). The last column is how many jars it takes to keep up with one pond.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Gold per day, full pond, roe as Aged Roe or Caviar, with Artisan</caption>
	<thead><tr><th scope="col">#</th><th scope="col">Fish</th><th scope="col">Gold per day</th><th scope="col">Jars to keep up</th></tr></thead>
	<tbody>
	<?php foreach ( $proc as $i => $r ) : ?>
		<tr><td><?php echo (int) $i + 1; ?></td><th scope="row"><?php echo esc_html( $r['name'] ); ?></th><td><?php echo esc_html( $gold( $r['gold_per_day'] ) ); ?></td><td><?php echo (int) $r['jars']; ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>

<h2>If you sell everything as it comes</h2>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Gold per day, full pond, everything sold raw</caption>
	<thead><tr><th scope="col">#</th><th scope="col">Fish</th><th scope="col">Gold per day</th></tr></thead>
	<tbody>
	<?php foreach ( $raw as $i => $r ) : ?>
		<tr><td><?php echo (int) $i + 1; ?></td><th scope="row"><?php echo esc_html( $r['name'] ); ?></th><td><?php echo esc_html( $gold( $r['gold_per_day'] ) ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>Selling raw, two fish are far ahead of the rest: <?php echo esc_html( $raw[0]['name'] ); ?> and <?php echo esc_html( $raw[1]['name'] ); ?> make more than twice what number three does. Below them, the ranking is close enough that what you can catch matters more than the table.</p>

<h2>The catch: how long a pond takes to fill</h2>
<p>A pond starts with room for 3 fish, and you raise that to 10 by finishing the quests the fish give you. The best money fish start smaller. The wiki's Fish Pond page lists Blobfish, Lava Eel, Sturgeon, Void Salmon and Ice Pip among the fish that start with room for just one. Each quest raises the limit one step, so these ponds take weeks to reach 10, and they earn far less until then. Open the <a href="<?php echo esc_url( $pond_url ); ?>">Fish Pond Calculator</a> and set the population to what you have now to see what a half-full pond really earns.</p>
<p>Tiger Trout is the opposite: it starts with room for all 10. It sits at #<?php echo (int) ( array_search( 'tiger-trout', array_column( $raw, 'id' ), true ) + 1 ); ?> raw and #<?php echo (int) ( array_search( 'tiger-trout', array_column( $proc, 'id' ), true ) + 1 ); ?> processed, and it is a river fish you can catch in fall and winter, so it is the easiest strong pond to set up early.</p>

<h2>Where to catch the top fish</h2>
<ul>
	<li><strong>Blobfish:</strong> the submarine at the Night Market in winter.</li>
	<li><strong>Lava Eel:</strong> floor 100 of the Mines, or the Volcano Caldera.</li>
	<li><strong>Sturgeon:</strong> the Mountain Lake, in summer and winter.</li>
	<li><strong>Tiger Trout:</strong> rivers, in fall and winter.</li>
	<li><strong>Lionfish:</strong> Ginger Island, any season.</li>
</ul>

<h2>Legendary fish</h2>
<p>A legendary fish pond holds only one fish, but it has a 50% chance to produce something every day, and what it makes is valuable. Selling raw, <?php echo esc_html( $leg[0]['name'] ); ?> earns about <?php echo esc_html( $gold( $leg[0]['gold_per_day'] ) ); ?> a day and <?php echo esc_html( $leg[2]['name'] ); ?> about <?php echo esc_html( $gold( $leg[2]['gold_per_day'] ) ); ?>, more than any regular fish sold raw. You can only catch each legendary fish once (the Legend II versions come from the Extended Family quest), so they are a bonus pond, not a plan.</p>

<h2>What to do next</h2>
<ul>
	<li>Check any fish at your current population in the <a href="<?php echo esc_url( $pond_url ); ?>">Fish Pond Calculator</a>.</li>
	<li>Short on jars? <a href="<?php echo esc_url( Stardew_Tools\Guides::guide_url( 'how-many-kegs-do-i-need' ) ); ?>">How many kegs do I need?</a> explains the same keep-up math for kegs and jars.</li>
</ul>

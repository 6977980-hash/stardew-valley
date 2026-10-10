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

<h2>Why the last fish pays the most</h2>
<p>The rankings above are for a full pond of 10. A half-full pond earns far less than half as much, because the daily chance of producing anything and the best items both improve with population. Here is what the top processed ponds earn at 1, 3, 5 and 10 fish, with Artisan:</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Gold per day by number of fish, roe processed, with Artisan</caption>
	<thead><tr><th scope="col">Fish</th><th scope="col">Starts with room for</th><th scope="col">1 fish</th><th scope="col">3 fish</th><th scope="col">5 fish</th><th scope="col">10 fish</th></tr></thead>
	<tbody>
	<?php foreach ( $fp['ramp'] as $r ) : ?>
		<tr>
			<th scope="row"><?php echo esc_html( $r['name'] ); ?></th>
			<td><?php echo (int) $r['initial_capacity']; ?></td>
			<td><?php echo esc_html( $gold( $r['gold']['1'] ) ); ?></td>
			<td><?php echo esc_html( $gold( $r['gold']['3'] ) ); ?></td>
			<td><?php echo esc_html( $gold( $r['gold']['5'] ) ); ?></td>
			<td class="is-best"><?php echo esc_html( $gold( $r['gold']['10'] ) ); ?></td>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>Look at <?php echo esc_html( $fp['ramp'][0]['name'] ); ?>. Five fish make <?php echo esc_html( $gold( $fp['ramp'][0]['gold']['5'] ) ); ?> a day and ten make <?php echo esc_html( $gold( $fp['ramp'][0]['gold']['10'] ) ); ?>. Doubling the fish nearly triples the income. The same is true of Sturgeon, which earns <?php echo esc_html( $gold( $fp['ramp'][2]['gold']['3'] ) ); ?> a day with three fish and over <?php echo esc_html( $gold( floor( $fp['ramp'][2]['gold']['10'] / 100 ) * 100 ) ); ?> with ten. Don't judge a pond by its first month. The payoff comes late.</p>

<h2>How long it takes to fill</h2>
<p>Fish in a pond reproduce on a timer that depends on the species. A new fish arrives every few days until the pond reaches its capacity, then a quest asks you for items, and finishing it raises the capacity. After a quest the timer starts over. Starting from a single fish, the fastest possible route to ten is nine spawns. At a spawn time of <?php echo (int) $fp['ramp'][0]['spawn_days']; ?> days, Blobfish and Sturgeon take at least <?php echo (int) $fp['ramp'][0]['days_to_fill']; ?> days, which is more than a season. Lava Eel spawns every <?php echo (int) $fp['ramp'][1]['spawn_days']; ?> days and needs at least <?php echo (int) $fp['ramp'][1]['days_to_fill']; ?>. Those are minimums that assume you hand in each quest the moment it appears. If you put in more fish by hand, you skip some of the wait.</p>
<p><strong>Tiger Trout is the exception.</strong> It does not reproduce at all. A Tiger Trout pond starts with room for ten fish, but it only ever holds the ones you catch and put in. That's why it earns <?php echo esc_html( $gold( $fp['ramp'][3]['gold']['10'] ) ); ?> a day when full and nothing extra while you are still fishing for more.</p>

<h2>What the quests ask for</h2>
<p>Each time a pond reaches its limit, the fish ask for one of a few items. These are the requests for the three best ponds:</p>
<?php foreach ( array_slice( $fp['ramp'], 0, 3 ) as $r ) : ?>
<h3><?php echo esc_html( $r['name'] ); ?></h3>
<ul>
	<?php foreach ( $r['quests'] as $q ) : ?>
	<li>At <?php echo (int) $q['population']; ?> fish (room for <?php echo (int) $q['to']; ?> after): <?php echo esc_html( implode( ', or ', $q['options'] ) ); ?>.</li>
	<?php endforeach; ?>
</ul>
<?php endforeach; ?>
<p>Some of these are not things you have lying around. Sturgeon's first request is a Diamond with no alternative, and its last is a Nautilus Shell. Read the list before you commit a pond, and save the item when you find it. Several of them (Rainbow Shell, Omni Geode, Frozen Tear) can be collected months before you need them.</p>

<h2>Which pond to build first</h2>
<ul>
	<li><strong>Early game, few jars:</strong> Tiger Trout if you can catch ten, since it needs no waiting and no quests.</li>
	<li><strong>Mid game, jars running:</strong> Sturgeon. It makes Caviar, which is worth more than Aged Roe, and the pond fills in about <?php echo (int) $fp['ramp'][2]['days_to_fill']; ?> days at the earliest.</li>
	<li><strong>Late game, everything unlocked:</strong> Blobfish or Lava Eel. They earn the most, but they start with a single fish and need the longest runway.</li>
	<li><strong>Several ponds:</strong> mix species. Jars are the real limit, so check how many jars your chosen fish need (the tables above show it) before you add a second pond.</li>
</ul>

<h2>Common mistakes</h2>
<ul>
	<li><strong>Comparing ponds by the full-pond number only.</strong> A pond that takes 36 days to fill earns very little for those 36 days.</li>
	<li><strong>Selling roe raw when you own jars.</strong> Aged Roe is worth double the roe for most fish.</li>
	<li><strong>Letting roe pile up with no jars.</strong> A pond makes roe every day. Without jars it either sits in the pond or goes to the shipping bin at the raw price.</li>
	<li><strong>Overlooking the quest items.</strong> A pond can sit at capacity for weeks waiting on one Diamond.</li>
</ul>

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

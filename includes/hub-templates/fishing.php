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
	<li>Where and when does a fish bite? The <a href="<?php echo esc_url( Stardew_Tools\Tools::url( 'fish-finder' ) ); ?>">Fish Finder</a> lists every fish by season, weather, time and place.</li>
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
$raw_by_id = isset( $fp['raw_by_id'] ) ? $fp['raw_by_id'] : array();
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
		<tr><th scope="row"><?php echo esc_html( $r['name'] ); ?></th><td><?php echo esc_html( $g( $r['gold_per_day'] ) ); ?></td><td><?php echo (int) $r['jars']; ?></td><td><?php echo isset( $raw_by_id[ $r['id'] ] ) ? esc_html( $g( $raw_by_id[ $r['id'] ] ) ) : '—'; ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<?php if ( ! empty( $fp['ramp'][0] ) ) : ?>
<h2>A pond takes weeks to fill</h2>
<?php
$sc   = isset( $fp['start_capacity'] ) ? $fp['start_capacity'] : array();
$cap3 = isset( $sc['3'] ) ? (int) $sc['3'] : 0;
$cap1 = isset( $sc['1'] ) ? (int) $sc['1'] : 0;
?>
<p><?php if ( $cap3 && $cap1 ) : ?>Most pond fish (<?php echo (int) $cap3; ?> of <?php echo (int) array_sum( $sc ); ?>, not counting legendaries) start with room for three, but <?php echo (int) $cap1; ?>, including the best money fish, start with room for only one.<?php endif; ?> Every pond needs quest items from you at each step to grow, and finishing a quest restarts the spawn timer. <?php echo esc_html( $fp['ramp'][0]['name'] ); ?> adds a new fish every <?php echo (int) $fp['ramp'][0]['spawn_days']; ?> days, and filling the pond from one fish to 10 takes at least <?php echo (int) $fp['ramp'][0]['days_to_fill']; ?> days if you hand over each quest item the day it is asked for. <?php echo esc_html( $fp['ramp'][1]['name'] ); ?> takes about <?php echo (int) $fp['ramp'][1]['days_to_fill']; ?>. That is why a pond should be built early in a season, not the week before you need the money.</p>
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
<?php
$craft = Stardew_Tools\Data::get( 'crafting' );
$rec   = array();
foreach ( $craft ? $craft['recipes'] : array() as $r ) {
	$rec[ $r['id'] ] = $r;
}
$mats  = function ( $id ) use ( $rec ) {
	return isset( $rec[ $id ] ) ? implode( ', ', array_map( function ( $i ) { return $i['qty'] . ' ' . $i['name']; }, $rec[ $id ]['ingredients'] ) ) : '';
};
$pond  = Stardew_Tools\Data::get( 'fishponds' );
$legs  = array();
foreach ( $pond ? $pond['fish'] : array() as $f ) {
	if ( 'legendary' === $f['kind'] ) {
		$legs[ $f['id'] ] = $f;
	}
}
$where = array(
	'crimsonfish' => array( 'Summer', 'the far end of the eastern pier on the beach', 5 ),
	'angler'      => array( 'Fall', 'the wooden bridge north of JojaMart in Pelican Town', 3 ),
	'legend'      => array( 'Spring, on rainy days', 'the mountain lake near the Carpenter\'s Shop', 10 ),
	'glacierfish' => array( 'Winter', 'the south tip of the river island in Cindersap Forest', 6 ),
	'mutant-carp' => array( 'Any season', 'the Sewers', 0 ),
);
?>
<h2>Catching more fish</h2>
<p>The fishing minigame gets easier in three ways: a higher Fishing level makes the green bar bigger, better rods let you use bait and tackle, and the right bait and tackle change the fish's behaviour. Willy sells the Fiberglass Rod (bait) from Fishing level 2 and the Iridium Rod (bait and tackle) from level 6. Until then, fish where the fish are easy: the Town river and the ocean in Spring give plenty of cheap catches that still give XP.</p>
<?php if ( $rec ) : ?>
<p>You can craft your own bait and tackle once you reach the levels below. One craft of bait makes five.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="<?php echo esc_attr( Stardew_Tools\Entities::TABLE_LABEL ); ?>">
<table class="results-table">
	<caption>Fishing items you can craft, with materials and how you learn the recipe</caption>
	<thead><tr><th scope="col">Item</th><th scope="col">Materials</th><th scope="col">Recipe from</th></tr></thead>
	<tbody>
	<?php foreach ( array( 'bait', 'deluxe-bait', 'wild-bait', 'magic-bait', 'crab-pot', 'spinner', 'trap-bobber', 'cork-bobber', 'treasure-hunter', 'barbed-hook', 'magnet' ) as $id ) : ?>
		<?php
		if ( ! isset( $rec[ $id ] ) ) {
			continue;
		}
		?>
		<tr><th scope="row"><?php echo esc_html( $rec[ $id ]['name'] ); ?></th><td><?php echo esc_html( $mats( $id ) ); ?></td><td><?php echo esc_html( $rec[ $id ]['obtained'] ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>The Trap Bobber makes the catch meter drop more slowly when the fish is outside the bar, which helps most while learning. The Cork Bobber makes the bar bigger. The Barbed Hook makes the bar follow the fish, and Treasure Hunter lets you collect treasure without the fish getting away. Most players move to the Cork Bobber or Trap Bobber for hard fish and to Deluxe Bait for everyday fishing.</p>
<?php endif; ?>

<?php if ( isset( $rec['crab-pot'] ) ) : ?>
<h2>Crab pots: fishing without the minigame</h2>
<p>A Crab Pot (<?php echo esc_html( $mats( 'crab-pot' ) ); ?>, recipe at Fishing level 3) sits in any water and catches something every day if it has bait in it. In the ocean it catches crabs, lobsters, clams, cockles, mussels, oysters and shrimp; in rivers and lakes, crayfish, snails and periwinkles. The Fish Tank bundles need several of these, so a few pots early in the game fill the Crab Pot Bundle without effort.</p>
<p>At Fishing level 10 the Luremaster profession makes crab pots work without bait, and the Mariner profession stops them catching trash. Pots are slow money on their own, but a row of them along the beach adds steady Fishing XP every day you empty them.</p>
<?php endif; ?>

<?php if ( $legs ) : ?>
<h2>Legendary fish</h2>
<p>Five legendary fish can each be caught once per save. They are hard catches, so bring your best rod, Deluxe Bait and a Trap or Cork Bobber, and eat a food that raises Fishing before you try.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="<?php echo esc_attr( Stardew_Tools\Entities::TABLE_LABEL ); ?>">
<table class="results-table">
	<caption>Legendary fish: season, place and the Fishing level they need</caption>
	<thead><tr><th scope="col">Fish</th><th scope="col">Season</th><th scope="col">Where</th><th scope="col">Fishing level</th><th scope="col" class="num">Sells for</th></tr></thead>
	<tbody>
	<?php foreach ( $where as $id => $w ) : ?>
		<?php
		if ( ! isset( $legs[ $id ] ) ) {
			continue;
		}
		?>
		<tr><th scope="row"><?php echo esc_html( $legs[ $id ]['name'] ); ?></th><td><?php echo esc_html( $w[0] ); ?></td><td><?php echo esc_html( $w[1] ); ?></td><td><?php echo $w[2] ? (int) $w[2] : 'Any'; ?></td><td class="num"><?php echo esc_html( $g( $legs[ $id ]['base_price'] ) ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>Each one can go in a fish pond on its own, where it produces something about every other day. Selling the fish once is rarely the best use: a legendary pond keeps earning, and the Extended Family quest from Mr. Qi lets you catch their relatives (Son of Crimsonfish, Ms. Angler and others) for a second chance.</p>
<?php endif; ?>

<?php if ( isset( $rec['fish-smoker'] ) ) : ?>
<h2>Fish Smoker</h2>
<p>Version 1.6 added the Fish Smoker. Willy sells the recipe for <?php echo esc_html( $g( (int) preg_replace( '/\D/', '', $rec['fish-smoker']['obtained'] ) ) ); ?>, and it needs <?php echo esc_html( $mats( 'fish-smoker' ) ); ?>. It turns a fish and a piece of Coal into Smoked Fish, worth twice the fish and keeping its quality. It is the only machine for fish that are not good in a pond, and it is where gold-star catches from a day of fishing go best.</p>
<?php endif; ?>

<?php
Stardew_Tools\Guides::quick_questions(
	array(
		'What is the best fish for a fish pond?' => count( $fp['raw'] ) && count( $fp['processed'] ) ? esc_html( $fp['raw'][0]['name'] ) . ' if you sell everything raw (about ' . esc_html( $g( $fp['raw'][0]['gold_per_day'] ) ) . ' a day), and ' . esc_html( $fp['processed'][0]['name'] ) . ' if you turn the roe into Aged Roe or Caviar (about ' . esc_html( $g( $fp['processed'][0]['gold_per_day'] ) ) . ').' : '',
		'How do I make fishing easier?'          => 'Level up on easy fish first, then use a Trap Bobber or Cork Bobber on the Iridium Rod. Food that raises Fishing, like a Trout Soup, helps on hard catches.',
		'Do crab pots need bait?'                => 'Yes, every day, unless you take the Luremaster profession at Fishing level 10.',
		'How much XP do I need for Fishing level 10?' => ! empty( $xp['level_10'] ) ? esc_html( number_format( (int) $xp['level_10'] ) ) . ' XP in total, the same as every other skill. The XP Calculator counts how many catches that is.' : '',
		'Can I catch a legendary fish twice?'    => 'No, each one only once per save. The Extended Family quest gives you a second set of relatives to catch.',
	)
);

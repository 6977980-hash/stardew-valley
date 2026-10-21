<?php
/**
 * Machines index.
 *
 * @var array    $all
 * @var callable $tool_url
 * @var callable $guide_url
 * @var callable $gold
 * @var callable $link
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> the two machines that turn a crop harvest into real money are the Keg and the Preserves Jar. Each page ranks every crop it accepts by extra gold per machine per day, which is the right measure when machines, not crops, are your limit.</p>
</div>

<h2>The machines</h2>
<ul class="related-list">
	<?php foreach ( $all['machines'] as $id => $m ) : ?>
		<?php
		$lead = null;
		foreach ( $m['crops'] as $r ) {
			if ( 1 === (int) $r['input'] ) {
				$lead = $r;
				break;
			}
		}
		?>
	<li><?php echo $link( 'machines', $id, $m['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?><span>Accepts <?php echo (int) $m['accepted']; ?> crops. <?php if ( $lead ) : ?>Best crop you can grow in volume: <?php echo esc_html( $lead['name'] ); ?> at <?php echo esc_html( $gold( $lead['gain_per_machine_day'] ) ); ?> per machine per day (Artisan prices).<?php endif; ?></span></li>
	<?php endforeach; ?>
</ul>

<h2>Which one first?</h2>
<p>Wine from a Keg takes far longer than jelly from a Preserves Jar, but it sells for more, so the Keg wins on gold per item and the Jar wins on gold per machine per day for almost every crop, Starfruit and Ancient Fruit included. The rule: if you are short of fruit, use Kegs; if you are short of machines, use Jars. Hops and Wheat are the exceptions, because Pale Ale and Beer beat Pickles either way. Put your own numbers into <a href="<?php echo esc_url( $tool_url( 'keg-vs-preserves-jar' ) ); ?>">Keg vs Preserves Jar</a>, and read <a href="<?php echo esc_url( $guide_url( 'how-many-kegs-do-i-need' ) ); ?>">How many kegs do I need?</a> to size the setup.</p>

<?php
$craft = Stardew_Tools\Data::get( 'crafting' );
$uses  = array(
	'mayonnaise-machine' => array( 'Eggs into Mayonnaise, Duck Eggs into Duck Mayonnaise.', 'guide:coop-or-barn-first' ),
	'bee-house'          => array( 'Honey every few days, worth more next to a flower. Outdoors only, and not in winter.', '' ),
	'preserves-jar'      => array( 'Fruit into Jelly, vegetables into Pickles, roe into Aged Roe.', 'tool:keg-vs-preserves-jar' ),
	'cheese-press'       => array( 'Milk into Cheese, Goat Milk into Goat Cheese.', 'guide:coop-or-barn-first' ),
	'loom'               => array( 'Wool into Cloth.', '' ),
	'keg'                => array( 'Fruit into Wine, vegetables into Juice, Hops into Pale Ale, Wheat into Beer, Honey into Mead.', 'guide:how-many-kegs-do-i-need' ),
	'oil-maker'          => array( 'Truffles into Truffle Oil, and Corn, Sunflower or Sunflower Seeds into Oil.', 'guide:are-pigs-worth-it' ),
	'cask'               => array( 'Ages Wine, Cheese, Goat Cheese, Pale Ale, Beer and Mead to a higher quality, in the cellar.', 'guide:are-casks-worth-it' ),
	'fish-smoker'        => array( 'A fish and one Coal into Smoked Fish, worth twice the fish.', 'hub:fishing' ),
	'dehydrator'         => array( 'Five fruit into Dried Fruit, five mushrooms into Dried Mushrooms, five Grapes into Raisins.', 'guide:dehydrator-vs-keg' ),
);
$names = array(
	'guide:coop-or-barn-first'       => 'Coop or Barn First?',
	'tool:keg-vs-preserves-jar'      => 'Keg vs Preserves Jar',
	'guide:how-many-kegs-do-i-need'  => 'How Many Kegs Do I Need?',
	'guide:are-pigs-worth-it'        => 'Are Pigs Worth It?',
	'guide:are-casks-worth-it'       => 'Are Casks Worth It?',
	'hub:fishing'                    => 'Fishing and Fish Ponds',
	'guide:dehydrator-vs-keg'        => 'Dehydrator vs Keg',
);
$ref_url = function ( $ref ) use ( $tool_url, $guide_url ) {
	list( $kind, $id ) = explode( ':', $ref );
	if ( 'tool' === $kind ) {
		return $tool_url( $id );
	}
	return 'hub' === $kind ? Stardew_Tools\Guides::hub_url( $id ) : $guide_url( $id );
};
$rows  = array();
foreach ( $craft ? $craft['recipes'] : array() as $r ) {
	if ( 'Artisan Equipment' === $r['category'] && isset( $uses[ $r['id'] ] ) ) {
		$rows[] = $r;
	}
}
?>
<?php if ( $rows ) : ?>
<h2>Every artisan machine</h2>
<p>The Keg and the Preserves Jar have their own pages above because they take almost any crop. This table covers every machine that turns farm goods into artisan goods: what each one makes, what it costs to craft and where the recipe comes from. With the Artisan profession, everything they make sells for 40% more.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="<?php echo esc_attr( Stardew_Tools\Entities::TABLE_LABEL ); ?>">
<table class="results-table">
	<caption>Artisan machines: what they make, crafting materials and recipe source</caption>
	<thead><tr><th scope="col">Machine</th><th scope="col">What it makes</th><th scope="col">Materials</th><th scope="col">Recipe from</th></tr></thead>
	<tbody>
	<?php foreach ( $rows as $r ) : ?>
		<?php
		$use = $uses[ $r['id'] ];
		$url = $use[1] ? $ref_url( $use[1] ) : '';
		?>
		<tr>
			<th scope="row"><?php echo isset( $all['machines'][ $r['id'] ] ) ? $link( 'machines', $r['id'], $r['name'] ) : esc_html( $r['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?></th>
			<td><?php echo esc_html( $use[0] ); ?><?php if ( $url ) : ?> <a href="<?php echo esc_url( $url ); ?>"><?php echo esc_html( $names[ $use[1] ] ); ?></a><?php endif; ?></td>
			<td><?php echo esc_html( implode( ', ', array_map( function ( $i ) { return $i['qty'] . ' ' . $i['name']; }, $r['ingredients'] ) ) ); ?></td>
			<td><?php echo esc_html( $r['obtained'] ); ?></td>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<?php if ( $tool_url( 'crafting-calculator' ) ) : ?>
<p>To build several at once, the <a href="<?php echo esc_url( $tool_url( 'crafting-calculator' ) ); ?>">Crafting Calculator</a> adds up the materials and turns bars back into ore and coal.</p>
<?php endif; ?>
<?php endif; ?>

<h2>Which machines to build first</h2>
<p>Machines follow your Farming level, and the order most farms build them in is the order the recipes arrive:</p>
<ol>
	<li><strong>Mayonnaise Machine and Preserves Jars</strong> (Farming 2 and 4). Cheap to make, and jars take any crop, so they are the first way to raise what a harvest is worth.</li>
	<li><strong>Cheese Press</strong> (Farming 6) once you have a Cow or Goat. One press keeps up with several animals.</li>
	<li><strong>Kegs</strong> (Farming 8). Each needs an Oak Resin, so put Tappers on Oak Trees early. Kegs are worth it for your best fruit and for Hops.</li>
	<li><strong>Oil Maker</strong> (Farming 8) if you keep Pigs.</li>
	<li><strong>Casks</strong> once the cellar is built, for the goods you will not sell right away.</li>
</ol>
<p>The Dehydrator and Fish Smoker are bought, not unlocked by level, so they come when you have the gold. Neither needs metal bars, which makes them easy to build in numbers once you own the recipe.</p>

<p><a href="<?php echo esc_url( Stardew_Tools\Entities::csv_url( 'stardew-machine-rankings.csv' ) ); ?>" download>Download this table as CSV</a>, or see all <a href="<?php echo esc_url( home_url( '/data/' ) ); ?>">data downloads</a>.</p>

<h2>Related</h2>
<ul class="related-list">
	<li><a href="<?php echo esc_url( $tool_url( 'keg-vs-preserves-jar' ) ); ?>">Keg vs Preserves Jar</a><span>Split a harvest across your machines.</span></li>
	<li><a href="<?php echo esc_url( $tool_url( 'greenhouse-planner' ) ); ?>">Greenhouse Planner</a><span>Best greenhouse crop for your machines.</span></li>
</ul>

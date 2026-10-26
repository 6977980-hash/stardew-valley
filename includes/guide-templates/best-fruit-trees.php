<?php
/**
 * Guide: Best fruit trees.
 *
 * @var array    $g        data/answers.json "guides".
 * @var callable $gold     Formats gold.
 * @var callable $tool_url Tool permalink.
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

$f = isset( $g['fruit_trees'] ) ? $g['fruit_trees'] : null;
if ( ! $f ) {
	return;
}
$trees = array();
foreach ( $f['trees'] as $t ) {
	$trees[ $t['id'] ] = $t;
}
$season = function ( $s ) {
	return ucfirst( $s );
};
$sapling = function ( $t ) use ( $gold ) {
	if ( $t['pierre'] ) {
		return $gold( $t['pierre'] );
	}
	return $t['trade'] ? $t['trade']['item'] . ' × ' . $t['trade']['qty'] : '';
};
$best    = $trees[ $f['by_four_year_raw'][0] ];
// Trees tied with the leader (same fruit price), and the next pair down, named from the data.
$order   = array_map(
	function ( $id ) use ( $trees ) {
		return $trees[ $id ];
	},
	$f['by_four_year_raw']
);
$tied    = array_values(
	array_filter(
		$order,
		function ( $t ) use ( $best ) {
			return $t['four_year']['raw'] === $best['four_year']['raw'];
		}
	)
);
$rest    = array_slice( $order, count( $tied ) );
$next    = $rest ? array_values(
	array_filter(
		$rest,
		function ( $t ) use ( $rest ) {
			return $t['four_year']['raw'] === $rest[0]['four_year']['raw'];
		}
	)
) : array();
$names   = function ( $list ) {
	return implode( ' and ', wp_list_pluck( $list, 'name' ) );
};
$top_or  = implode( ' or a ', wp_list_pluck( $tied, 'name' ) );
$cheap   = $trees[ $f['by_payback'][0] ];
$bought  = array_filter( $f['trees'], function ( $t ) {
	return $t['pierre'];
} );
// The weakest and best deal per gold of sapling: regular fruit price for each gold spent.
$per_gold = function ( $t ) {
	return $t['prices']['regular'] / $t['pierre'];
};
$by_gold  = array_values( $bought );
usort(
	$by_gold,
	function ( $a, $b ) use ( $per_gold ) {
		return $per_gold( $a ) <=> $per_gold( $b );
	}
);
$weakest = $by_gold[0];
$strong  = end( $by_gold );
$pay_min = min( array_map( function ( $t ) {
	return $t['payback']['raw_fruit'];
}, $bought ) );
$pay_max = max( array_map( function ( $t ) {
	return $t['payback']['raw_fruit'];
}, $bought ) );
$keg_min = min( array_map( function ( $t ) {
	return $t['payback']['wine_fruit'];
}, $bought ) );
$keg_max = max( array_map( function ( $t ) {
	return $t['payback']['wine_fruit'];
}, $bought ) );
$q        = $f['quality_years'];
$profit   = $tool_url( 'crop-profit-calculator' );
$kegjar   = $tool_url( 'keg-vs-preserves-jar' );
$planner  = $tool_url( 'greenhouse-planner' );
$bundles  = Stardew_Tools\Entities::url( 'bundles', '' );
$year_one = Stardew_Tools\Guides::guide_url( 'how-to-make-money-year-1' );
$casks    = Stardew_Tools\Guides::guide_url( 'are-casks-worth-it' );
$deh      = Stardew_Tools\Guides::guide_url( 'dehydrator-vs-keg' );
$kegs     = Stardew_Tools\Guides::guide_url( 'how-many-kegs-do-i-need' );
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> for the most gold per tree, plant a <?php echo esc_html( $top_or ); ?>. <?php echo count( $tied ) > 1 ? 'Each costs' : 'It costs'; ?> <?php echo esc_html( $gold( $best['pierre'] ) ); ?> at Pierre's and earns <?php echo esc_html( $gold( $best['raw'][0] ) ); ?> in its first fruiting season sold raw, rising to <?php echo esc_html( $gold( $best['raw'][3] ) ); ?> a season once the fruit reaches iridium quality. Every sapling Pierre sells pays for itself in its second season sold raw (after <?php echo (int) $pay_min; ?> to <?php echo (int) $pay_max; ?> fruit), or inside the first season if you make the fruit into Wine (<?php echo (int) $keg_min; ?> to <?php echo (int) $keg_max; ?> fruit).</p>
	<p>Plant each sapling 28 days before its season starts so the first season is not wasted, and if gold is tight, start with the <?php echo esc_html( $cheap['name'] ); ?> (<?php echo esc_html( $gold( $cheap['pierre'] ) ); ?>): it pays back as fast as the expensive trees, it just earns less once it has.</p>
</div>

<h2>Every fruit tree at a glance</h2>
<p>There are <?php echo (int) $f['count']; ?> fruit trees. Six saplings are sold at Pierre's General Store (and sometimes at the Traveling Cart); the Banana and Mango saplings are traded for items on Ginger Island. A mature tree grows one fruit a day in its season, <?php echo (int) $f['fruit_per_season']; ?> fruit a year on the farm. The first-season column is what those <?php echo (int) $f['fruit_per_season']; ?> regular-quality fruit sell for with no professions.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Fruit trees in Stardew Valley: sapling cost, season and first-season income</caption>
	<thead><tr><th scope="col">Tree</th><th scope="col">Season</th><th scope="col">Sapling</th><th scope="col">Fruit (regular)</th><th scope="col">First season, raw</th><th scope="col">Pays back after</th></tr></thead>
	<tbody>
	<?php foreach ( $f['trees'] as $t ) : ?>
		<tr><th scope="row"><?php echo esc_html( $t['tree'] ); ?></th><td><?php echo esc_html( $season( $t['season'] ) ); ?></td><td><?php echo esc_html( $sapling( $t ) ); ?></td><td><?php echo esc_html( $gold( $t['prices']['regular'] ) ); ?></td><td><?php echo esc_html( $gold( $t['raw'][0] ) ); ?></td><td><?php echo $t['payback']['raw_fruit'] ? (int) $t['payback']['raw_fruit'] . ' fruit' : 'traded, not bought'; ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p class="table-note">Pays back: fruit sold raw, counting the yearly quality rise, until the total covers Pierre's sapling price. The Traveling Cart sells the same saplings for <?php echo esc_html( $gold( $cheap['cart']['min'] ) ); ?> to <?php echo esc_html( $gold( $cheap['cart']['max'] ) ); ?> (<?php echo esc_html( $cheap['name'] ); ?>) up to <?php echo esc_html( $gold( $best['cart']['max'] ) ); ?> (<?php echo esc_html( $best['name'] ); ?>), so it is only a bargain on a lucky day. All six of Pierre's saplings together cost <?php echo esc_html( $gold( $f['all_six'] ) ); ?>.</p>
<p>The pattern is simple: every sapling costs about forty times what one regular fruit sells for, so they all take about the same number of fruit to repay. What changes between trees is how much they earn after that. A <?php echo esc_html( $best['name'] ); ?> tree makes almost three times as much a season as an Apricot tree, so once you can afford it, the expensive sapling is the better tree.</p>

<h2>How fruit trees work</h2>
<p>Fruit trees are a long-term investment that needs almost no work once planted. These are the rules that matter, as the Stardew Valley Wiki states them:</p>
<ul>
	<li><strong><?php echo (int) $f['days_to_mature']; ?> days to grow.</strong> A sapling takes <?php echo (int) $f['days_to_mature']; ?> days to become a tree, and it grows in any season, winter included.</li>
	<li><strong>No watering, no dying.</strong> Fruit trees never need water and do not die when the season changes. Outside their season they just stop fruiting.</li>
	<li><strong>One fruit a day in season.</strong> The fruit waits on the tree, up to <?php echo (int) $f['max_on_tree']; ?> at a time. Visit at least every <?php echo (int) $f['max_on_tree']; ?> days or the tree stops adding fruit until you pick it.</li>
	<li><strong>A clear 3x3 space while it grows.</strong> The sapling must sit in the middle of an empty 3x3 area, and the 3x3 areas of two trees cannot overlap. Debris or anything you place next to a young sapling stops it growing that night. Once the tree is mature, you can put paths and objects right next to it.</li>
	<li><strong>Weather does not matter, except lightning.</strong> Rain or sun, the tree keeps fruiting. A lightning strike in a storm burns it for <?php echo (int) $f['lightning_days']; ?> days, and it grows coal instead of fruit until it recovers.</li>
	<li><strong>Quality climbs with age.</strong> The fruit is silver quality after one year, gold after two and iridium after three.</li>
</ul>

<h2>When to plant each sapling</h2>
<p>Because a sapling needs <?php echo (int) $f['days_to_mature']; ?> days, planting it on the first day of its own season means the tree matures on day 1 of the next season and you get no fruit that year. Plant it one season early instead. These are the latest days to plant on the farm and still get the full first season:</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Latest planting day for a full first season</caption>
	<thead><tr><th scope="col">Tree</th><th scope="col">Fruits in</th><th scope="col">Plant by</th><th scope="col">Fruit in the first year if planted on Spring 1</th></tr></thead>
	<tbody>
	<?php foreach ( $f['trees'] as $t ) : ?>
		<tr><th scope="row"><?php echo esc_html( $t['tree'] ); ?></th><td><?php echo esc_html( $season( $t['season'] ) ); ?></td><td><?php echo esc_html( $season( $t['plant_by']['season'] ) . ' ' . $t['plant_by']['day'] ); ?></td><td><?php echo (int) $t['first_year_spring1']; ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>So spring trees (Apricot, Cherry) go in during winter, summer trees during spring and fall trees during summer. A spring tree planted on Spring 1 of your first year gives nothing until the next spring, which is why the cheap Apricot is a poor first purchase if you buy it in spring. A summer tree bought on Spring 1 gives a full summer of fruit in the same year.</p>
<p>Planting later than the "plant by" day still works, you just lose the days the tree was not ready. A Fall tree planted on Summer 8, for example, matures on Fall 8 and gives 21 fruit that fall instead of 28.</p>

<h2>Fruit quality goes up every year</h2>
<p>A tree's fruit starts at regular quality and gains a star a year: silver after <?php echo (int) $q['silver']; ?> year, gold after <?php echo (int) $q['gold']; ?>, iridium after <?php echo (int) $q['iridium']; ?>. An iridium fruit sells for twice the regular price, so the same tree earns twice as much in its fourth season as in its first. This is income from one tree on the farm, per season, sold raw:</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>One tree, one season of fruit, sold raw</caption>
	<thead><tr><th scope="col">Tree</th><th scope="col">Year 1 (regular)</th><th scope="col">Year 2 (silver)</th><th scope="col">Year 3 (gold)</th><th scope="col">Year 4+ (iridium)</th></tr></thead>
	<tbody>
	<?php foreach ( $f['trees'] as $t ) : ?>
		<tr><th scope="row"><?php echo esc_html( $t['tree'] ); ?></th>
		<?php foreach ( $t['raw'] as $v ) : ?>
			<td><?php echo esc_html( $gold( $v ) ); ?></td>
		<?php endforeach; ?>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p class="table-note">Years count from the season the tree first fruits. With the Tiller profession, fruit tree fruit sells for 10% more: an iridium <?php echo esc_html( $best['name'] ); ?> season becomes <?php echo esc_html( $gold( $best['raw_tiller_y4'] ) ); ?>.</p>
<p>The quality comes from the tree's age, not from your Farming level or fertilizer, so there is nothing to speed it up except starting early. That is the strongest reason to plant fruit trees in your first year even though they pay back slowly: the clock on iridium fruit starts the day the tree matures.</p>

<h2>Sell raw, or make Jelly, Wine or Dried Fruit?</h2>
<p>All eight fruits count as fruit, so they go into the Preserves Jar (Jelly), the Keg (Wine) and the Dehydrator (Dried Fruit, five fruit at a time). These machines ignore the quality of what goes in. That matters for fruit trees, because your fruit becomes iridium in year four and the machines do not pay extra for it. Gold per fruit, no professions:</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Gold per fruit: raw, Jelly, Wine and Dried Fruit</caption>
	<thead><tr><th scope="col">Fruit</th><th scope="col">Raw (regular)</th><th scope="col">Raw (iridium)</th><th scope="col">Jelly</th><th scope="col">Wine</th><th scope="col">Dried Fruit, per fruit</th><th scope="col">Wine with Artisan</th></tr></thead>
	<tbody>
	<?php foreach ( $f['trees'] as $t ) : ?>
		<tr><th scope="row"><?php echo esc_html( $t['name'] ); ?></th><td><?php echo esc_html( $gold( $t['prices']['regular'] ) ); ?></td><td><?php echo esc_html( $gold( $t['prices']['iridium'] ) ); ?></td><td><?php echo esc_html( $gold( $t['each']['jelly'] ) ); ?></td><td><?php echo esc_html( $gold( $t['each']['wine'] ) ); ?></td><td><?php echo esc_html( $gold( $t['each']['dried'] ) ); ?></td><td><?php echo esc_html( $gold( $t['each']['wine_artisan'] ) ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p class="table-note">Wine is three times the fruit's base price, Jelly twice the price plus 50g, Dried Fruit is made from five fruit. Artisan adds 40% to all three.</p>
<p>What the table says:</p>
<ul>
	<li><strong>Wine earns the most per fruit</strong> for every tree (Apricot Jelly ties it), even after the fruit turns iridium. An iridium <?php echo esc_html( $best['name'] ); ?> sells for <?php echo esc_html( $gold( $best['prices']['iridium'] ) ); ?>; the same fruit as Wine is <?php echo esc_html( $gold( $best['each']['wine'] ) ); ?>, and <?php echo esc_html( $gold( $best['each']['wine_artisan'] ) ); ?> with Artisan.</li>
	<li><strong>For the Apricot, Jelly ties Wine</strong> (<?php echo esc_html( $gold( $trees['apricot']['each']['jelly'] ) ); ?> each) and a Preserves Jar finishes much sooner than a Keg, so Apricots belong in jars.</li>
	<li><strong>Raw iridium never beats Jelly.</strong> Jelly is worth more than twice the base price, iridium fruit exactly twice, so even old trees earn more in a jar.</li>
	<li><strong>Dried Fruit earns less per fruit than Wine or Jelly</strong> but turns five fruit into one item a day per machine. It is the answer when you have more fruit than kegs, as <?php echo $deh ? '<a href="' . esc_url( $deh ) . '">Dehydrator vs Keg</a>' : 'Dehydrator vs Keg'; ?> explains.</li>
</ul>
<p>Plan the machines before the fruit piles up. A tree gives one fruit a day, a Preserves Jar takes <?php echo esc_html( $f['machines_per_tree']['jar'] ); ?> days per Jelly and a Keg <?php echo esc_html( $f['machines_per_tree']['keg'] ); ?> days per Wine, so turning all of one tree's fruit into Jelly as it comes in needs about <?php echo esc_html( $f['machines_per_tree']['jar'] ); ?> jars, and into Wine about <?php echo esc_html( $f['machines_per_tree']['keg'] ); ?> kegs. Fruit keeps, so you can also store it and process it through the season. Check how your machines compare for each fruit in the <a href="<?php echo esc_url( $kegjar ); ?>">Keg vs Preserves Jar calculator</a><?php echo $kegs ? ', and how many machines a whole orchard needs in <a href="' . esc_url( $kegs ) . '">How Many Kegs Do I Need?</a>' : ''; ?>.</p>
<p>Fruit Wine also ages in a Cask. An iridium-quality <?php echo esc_html( $best['name'] ); ?> Wine is worth <?php echo esc_html( $gold( $best['aged_wine_iridium'] ) ); ?> with no professions, twice the fresh Wine<?php echo $casks ? ', and <a href="' . esc_url( $casks ) . '">Are Casks Worth It?</a> works out whether the wait pays' : ''; ?>.</p>

<h2>What one tree earns over four years</h2>
<p>Here is the whole investment for each tree you can buy: four fruiting seasons on the farm, with the yearly quality rise, minus Pierre's sapling price.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Four seasons of fruit after the sapling is paid for</caption>
	<thead><tr><th scope="col">Tree</th><th scope="col">Sapling</th><th scope="col">Sold raw</th><th scope="col">As Wine</th><th scope="col">As Wine, Artisan</th></tr></thead>
	<tbody>
	<?php
	foreach ( $f['by_four_year_raw'] as $id ) :
		$t = $trees[ $id ];
		?>
		<tr><th scope="row"><?php echo esc_html( $t['tree'] ); ?></th><td><?php echo esc_html( $gold( $t['pierre'] ) ); ?></td><td><?php echo esc_html( $gold( $t['four_year']['raw'] ) ); ?></td><td><?php echo esc_html( $gold( $t['four_year']['wine'] ) ); ?></td><td><?php echo esc_html( $gold( $t['four_year']['wine_artisan'] ) ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p><?php echo esc_html( $names( $tied ) ); ?> <?php echo count( $tied ) > 1 ? 'trees earn the same (their fruit has the same price) and come out on top' : 'comes out on top'; ?>.<?php if ( $next ) : ?> <?php echo esc_html( $names( $next ) ); ?> <?php echo count( $next ) > 1 ? 'are next, also tied' : 'is next'; ?>.<?php endif; ?> Per gold of sapling the trees are close: the <?php echo esc_html( $weakest['name'] ); ?> is the weakest deal (<?php echo esc_html( $gold( $weakest['pierre'] ) ); ?> for a <?php echo esc_html( $gold( $weakest['prices']['regular'] ) ); ?> fruit) and the <?php echo esc_html( $strong['name'] ); ?> the best (<?php echo esc_html( $gold( $strong['pierre'] ) ); ?> for a <?php echo esc_html( $gold( $strong['prices']['regular'] ) ); ?> fruit). Every tree gives one fruit a day on one tile, so the pricier fruit still earns more in total once the sapling is paid off. If you are choosing where your next few thousand gold goes, buy the tree that earns most in total and that fits the season you can plant for.</p>
<p>A tree also uses its season's fruit slot in your bundles, quests and cooking, so it is common to plant one of each for the collection and more of the best ones for money.</p>

<h2>Fruit trees in the Greenhouse</h2>
<p>A fruit tree in the Greenhouse fruits every day of the year: <?php echo (int) $f['fruit_per_year_greenhouse']; ?> fruit instead of <?php echo (int) $f['fruit_per_season']; ?>. Trees can be planted on the soil in the middle or on the border tiles around it, and planting them on the border leaves every soil tile free for crops. That makes Greenhouse border trees close to free money.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>One tree in the Greenhouse, per year</caption>
	<thead><tr><th scope="col">Tree</th><th scope="col">Year 1, raw</th><th scope="col">Year 4+, raw</th><th scope="col">Year 1, Wine with Artisan</th></tr></thead>
	<tbody>
	<?php foreach ( $f['trees'] as $t ) : ?>
		<tr><th scope="row"><?php echo esc_html( $t['tree'] ); ?></th><td><?php echo esc_html( $gold( $t['greenhouse']['raw_y1'] ) ); ?></td><td><?php echo esc_html( $gold( $t['greenhouse']['raw_y4'] ) ); ?></td><td><?php echo esc_html( $gold( $t['greenhouse']['wine_artisan'] ) ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>In the Greenhouse a <?php echo esc_html( $best['name'] ); ?> sapling pays for itself after <?php echo (int) $best['payback']['greenhouse_raw_days']; ?> days of fruit, inside its first year. The Banana is the best Greenhouse tree of all, but its sapling comes from Ginger Island. Plan the soil and sprinklers around your trees with the <a href="<?php echo esc_url( $planner ); ?>">Greenhouse Planner</a>.</p>

<h2>Banana and Mango trees</h2>
<p>The Banana and Mango are the two most valuable fruits from trees (<?php echo esc_html( $gold( $trees['banana']['prices']['regular'] ) ); ?> and <?php echo esc_html( $gold( $trees['mango']['prices']['regular'] ) ); ?> regular), but you cannot buy their saplings with gold. The Island Trader on Ginger Island trades a Banana Sapling for <?php echo (int) $trees['banana']['trade']['qty']; ?> of the item <?php echo esc_html( $trees['banana']['trade']['item'] ); ?> and a Mango Sapling for <?php echo (int) $trees['mango']['trade']['qty']; ?> of the item <?php echo esc_html( $trees['mango']['trade']['item'] ); ?>. In the valley they fruit only in summer, like the Orange and Peach. On Ginger Island and in the Greenhouse they fruit every day.</p>
<p>A Banana tree on the farm makes <?php echo esc_html( $gold( $trees['banana']['raw'][0] ) ); ?> in its first summer and <?php echo esc_html( $gold( $trees['banana']['wine_artisan_year'] ) ); ?> as Wine with Artisan. Bananas and Mangos are not treated as "fruit tree fruit" for gifts, so villagers react to them as ordinary fruit.</p>

<h2>Quality saplings: chop and replant</h2>
<p>Chopping a fruit tree down gives you its sapling back, at the quality of the fruit it was growing. A higher-quality sapling grows faster: silver <?php echo (int) $f['sapling_speed']['silver']; ?> times, gold <?php echo (int) $f['sapling_speed']['gold']; ?> times and iridium <?php echo (int) $f['sapling_speed']['iridium']; ?> times as fast, and its fruit starts at a higher quality. Players use this to move or multiply an old orchard: a tree that already grows iridium fruit gives an iridium sapling that is ready in days instead of four weeks. Chopping a tree that is still a sapling just returns the sapling.</p>

<h2>Are fruit trees worth it in Year 1?</h2>
<p>Only as a long-term buy. In your first year, the same gold in seeds turns over many times in one season, while a tree takes a full season to start and another to pay back. The cheapest sapling, an Apricot at <?php echo esc_html( $gold( $trees['apricot']['pierre'] ) ); ?>, makes <?php echo esc_html( $gold( $trees['apricot']['raw'][0] ) ); ?> in its first spring sold raw and is paid off in its second. Buy trees once your crops are running and you have gold you will not need for seeds, and plant them early so the years of quality start counting. <?php echo $year_one ? 'The <a href="' . esc_url( $year_one ) . '">Year 1 money guide</a> shows where your first-year gold goes further.' : ''; ?></p>

<h2>Fruit trees and the Community Center</h2>
<?php if ( $f['bundles'] ) : ?>
<p>Fruit tree fruit fills these Community Center bundles:</p>
<ul>
	<?php foreach ( $f['bundles'] as $b ) : ?>
	<li><strong><?php echo esc_html( $b['name'] ); ?></strong>: <?php echo esc_html( implode( ', ', $b['fruit'] ) ); ?> (<?php echo (int) $b['slots'] === (int) $b['items'] ? 'needs all ' . (int) $b['items'] . ' of its items' : 'any ' . (int) $b['slots'] . ' of its ' . (int) $b['items'] . ' items'; ?>).</li>
	<?php endforeach; ?>
</ul>
<p>The Artisan Bundle takes any six of its twelve items, and six of them are fruit tree fruit, so a few trees can fill most of it on their own. Track it in the <a href="<?php echo esc_url( $tool_url( 'bundle-tracker' ) ); ?>">Bundle Tracker</a><?php echo $bundles ? ' or see every <a href="' . esc_url( $bundles ) . '">bundle</a>' : ''; ?>.</p>
<?php endif; ?>
<?php
Stardew_Tools\Guides::quick_questions(
	array(
		'What is the best fruit tree in Stardew Valley?'  => 'For gold, ' . esc_html( $names( $tied ) ) . ': ' . esc_html( $gold( $best['raw'][0] ) ) . ' in their first season sold raw and ' . esc_html( $gold( $best['raw'][3] ) ) . ' once the fruit is iridium. Banana is better still but its sapling is traded on Ginger Island.',
		'How long do fruit trees take to grow?'           => esc_html( $f['days_to_mature'] ) . ' days, in any season. Plant a sapling 28 days before its season so it fruits from day 1.',
		'Do fruit trees need watering?'                   => 'No. Fruit trees never need water and do not die in winter.',
		'Can you plant fruit trees in the Greenhouse?'    => 'Yes, on the soil or on the border tiles. In the Greenhouse they fruit every day of the year.',
		'When do fruit trees give iridium fruit?'         => 'Three years after the tree matures. Fruit is silver after one year and gold after two.',
		'Is it better to sell fruit or make Wine?'        => 'Wine. The Keg ignores fruit quality, but even iridium fruit sells for less than Wine made from it.',
	)
);

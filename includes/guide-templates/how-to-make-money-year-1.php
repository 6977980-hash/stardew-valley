<?php
/**
 * Guide: How to make money in Year 1.
 *
 * @var array    $g        data/answers.json "guides".
 * @var callable $gold     Formats gold.
 * @var callable $tool_url Tool permalink.
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

$y = isset( $g['year_one'] ) ? $g['year_one'] : null;
if ( ! $y ) {
	return;
}
$num = function ( $n ) {
	return rtrim( rtrim( number_format( $n, 2 ), '0' ), '.' );
};
$row = function ( $list, $id ) {
	foreach ( $list as $r ) {
		if ( $r['id'] === $id ) {
			return $r;
		}
	}
	return null;
};
$names = function ( $list ) {
	return implode( ', ', array_map( function ( $r ) {
		return $r['name'];
	}, $list ) );
};
$crop_table = function ( $rows, $caption ) use ( $gold, $num ) {
	?>
	<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
	<table class="results-table">
		<caption><?php echo esc_html( $caption ); ?></caption>
		<thead><tr><th scope="col">Crop</th><th scope="col">Seed</th><th scope="col">Days to grow</th><th scope="col">Harvests</th><th scope="col">Profit per tile</th><th scope="col">Seed paid back after</th><th scope="col">Gold back per 1g of seed</th></tr></thead>
		<tbody>
		<?php foreach ( $rows as $r ) : ?>
			<tr><th scope="row"><?php echo esc_html( $r['name'] ); ?></th><td><?php echo esc_html( $gold( $r['seed_price'] ) ); ?></td><td><?php echo (int) $r['growth']; ?><?php echo $r['regrows'] ? ', then every ' . (int) $r['regrows'] : ''; ?></td><td><?php echo (int) $r['harvests']; ?></td><td><?php echo esc_html( $gold( $r['profit'] ) ); ?><?php echo $r['continues'] ? ' <small>(into ' . esc_html( implode( ', ', $r['continues'] ) ) . ')</small>' : ''; ?></td><td><?php echo null === $r['payback_days'] ? 'not this season' : (int) $r['payback_days'] . ' days'; ?></td><td><?php echo esc_html( $num( $r['per_gold'] ) ); ?>g</td></tr>
		<?php endforeach; ?>
		</tbody>
	</table>
	</div>
	<?php
};
$s       = $y['start'];
$potato  = $row( $y['spring'], 'potato' );
$parsnip = $row( $y['spring'], 'parsnip' );
$cauli   = $row( $y['spring'], 'cauliflower' );
$blue    = $row( $y['summer'], 'blueberry' );
$melon   = $row( $y['summer'], 'melon' );
$hops    = $row( $y['summer'], 'hops' );
$corn    = $row( $y['summer'], 'corn' );
$cran    = $row( $y['fall'], 'cranberries' );
$pump    = $row( $y['fall'], 'pumpkin' );
$egg     = $row( $y['fall'], 'eggplant' );
$sb      = $y['strawberry'];
$jar     = $y['levels']['jar'];
$keg     = $y['levels']['keg'];
$coop    = $y['coop'];
$what    = $tool_url( 'what-to-plant' );
$profit  = $tool_url( 'crop-profit-calculator' );
$tracker = $tool_url( 'bundle-tracker' );
$trees   = Stardew_Tools\Guides::guide_url( 'best-fruit-trees' );
$coopg   = Stardew_Tools\Guides::guide_url( 'coop-or-barn-first' );
$speed   = Stardew_Tools\Guides::guide_url( 'speed-gro-vs-fertilizer' );
$kegs    = Stardew_Tools\Guides::guide_url( 'how-many-kegs-do-i-need' );
$mats    = function ( $list ) {
	return implode( ', ', array_map( function ( $m ) {
		return $m['qty'] . ' ' . $m['name'];
	}, $list ) );
};
$d1 = $s['day_one'];
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> in Year 1 your gold, not your land, is the limit, so put every gold into crops that pay their seed back fast and replant. Plant the <?php echo (int) $s['seeds']; ?> free Parsnip Seeds on day 1 and spend your <?php echo esc_html( $gold( $s['gold'] ) ); ?> on Parsnips or Potatoes. In summer plant Blueberries (<?php echo esc_html( $gold( $blue['profit'] ) ); ?> a tile, the best summer crop you can buy that year) and a few Melons; in fall, Cranberries and Pumpkins. Push Farming to level <?php echo (int) $jar['level']; ?> for Preserves Jars and finish the Pantry bundles for the Greenhouse.</p>
	<p>Every number below comes from the same engine as our calculators: planted on day 1 of the season, farming level 0, no fertilizer, sold raw and replanted until the season ends.</p>
</div>

<h2>Spring 1: what to do with <?php echo esc_html( $gold( $s['gold'] ) ); ?></h2>
<p>You start with <?php echo esc_html( $gold( $s['gold'] ) ); ?> and <?php echo (int) $s['seeds']; ?> <?php echo esc_html( $s['seed_name'] ); ?> from Mayor Lewis (on every farm map except the Meadowlands Farm). Plant the free seeds first: <?php echo (int) $s['seeds']; ?> Parsnips sell for <?php echo esc_html( $gold( $s['parsnip_value'] ) ); ?> and give <?php echo (int) $s['parsnip_xp']; ?> Farming XP. Then buy seeds with the gold. <?php echo esc_html( $gold( $s['gold'] ) ); ?> buys <?php echo (int) $s['parsnip_seeds']; ?> Parsnip Seeds, <?php echo (int) $s['potato_seeds']; ?> Potato Seeds or <?php echo (int) $s['cauliflower_seeds']; ?> Cauliflower Seeds.</p>
<p>Which one? It depends on whether gold or space runs out first. Spending exactly <?php echo esc_html( $gold( $s['gold'] ) ); ?> on day 1, with room for up to 40 tiles and every harvest's gold put back into the same seed, the season ends like this:</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Spring 1 with <?php echo esc_html( $gold( $s['gold'] ) ); ?>: profit by Spring 28</caption>
	<thead><tr><th scope="col">Crop</th><th scope="col">Tiles you can plant on day 1</th><th scope="col">Profit by the end of spring</th></tr></thead>
	<tbody>
	<?php foreach ( $d1 as $r ) : ?>
		<tr><th scope="row"><?php echo esc_html( $r['name'] ); ?></th><td><?php echo (int) $r['tiles']; ?></td><td><?php echo esc_html( $gold( $r['total'] ) ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p class="table-note">The free Parsnip Seeds come on top. Worked out by the <a href="<?php echo esc_url( $what ); ?>">What to Plant Today</a> engine with a <?php echo esc_html( $gold( $s['gold'] ) ); ?> budget.</p>
<p><?php echo esc_html( $d1[0]['name'] ); ?> comes out ahead because the gold buys more of them and each one repays its seed in <?php echo (int) $row( $y['spring'], $d1[0]['id'] )['payback_days']; ?> days. Potatoes earn more per tile, so once you have more gold than empty soil, switch to Potatoes, and to Cauliflower if you have even more gold than time to water. The point of spring is to grow the pile of gold, not to fill the farm.</p>

<h2>Every spring crop you can buy in Year 1</h2>
<?php $crop_table( $y['spring'], 'Spring crops in Year 1, planted on Spring 1' ); ?>
<p>How to read it: "Profit per tile" is the whole season on one tile with replanting. "Seed paid back after" is how long the seed's cost is tied up before it comes back. "Gold back per 1g of seed" is everything the tile sells for over the season divided by everything spent on its seeds.</p>
<ul>
	<li><strong>Potato</strong> is the best spring crop per tile (<?php echo esc_html( $gold( $potato['profit'] ) ); ?>) and pays its seed back in <?php echo (int) $potato['payback_days']; ?> days. It beats Kale, which grows just as fast, because its seed is cheaper and a plant sometimes gives an extra potato.</li>
	<li><strong>Parsnip</strong> earns the least per tile of the main crops but repays the seed fastest (<?php echo (int) $parsnip['payback_days']; ?> days). It is the right crop for your first few days, not for the whole season.</li>
	<li><strong>Cauliflower</strong> (<?php echo esc_html( $gold( $cauli['profit'] ) ); ?> a tile) has the best single harvest, but your gold is locked up for <?php echo (int) $cauli['growth']; ?> days. Plant it once you have spare gold, and it can grow into a giant crop.</li>
	<li><strong>Green Bean</strong> returns the most per gold of seed over the season because it keeps producing, but the first harvest takes <?php echo (int) $row( $y['spring'], 'green-bean' )['growth']; ?> days and each harvest is small, so it is slow to get going.</li>
</ul>

<h2>Strawberries at the Egg Festival</h2>
<p>The Egg Festival on Spring <?php echo (int) $sb['day']; ?> sells Strawberry Seeds for <?php echo esc_html( $gold( $sb['seed_price'] ) ); ?> each. Planted the next morning, Spring <?php echo (int) $sb['plant_day']; ?>, a Strawberry gives <?php echo (int) $sb['harvests']; ?> harvests before the season ends (on days <?php echo esc_html( implode( ' and ', $sb['harvest_days'] ) ); ?>) and makes <?php echo esc_html( $gold( $sb['profit'] ) ); ?> a tile. A Potato planted the same day makes <?php echo esc_html( $gold( $sb['potato'] ) ); ?>, so this year's Strawberries are worth it, just not by much.</p>
<p>The bigger win is next year. Buy extra seeds at the festival and keep them in a chest: planted on Spring 1 of Year 2, a Strawberry gives <?php echo (int) $sb['next_spring_harvests']; ?> harvests and <?php echo esc_html( $gold( $sb['next_spring'] ) ); ?> a tile, the best spring crop you can buy. Spend what the festival leaves you on as many seeds as you can afford to keep.</p>

<h2>Crops you cannot buy in Year 1</h2>
<p>Some seeds on crop lists are not for sale in your first year, and planning around them wastes a season:</p>
<ul>
	<?php
	$labels = array( 'spring' => 'Spring', 'summer' => 'Summer', 'fall' => 'Fall' );
	foreach ( $labels as $k => $label ) :
		$y2  = array_filter( $y['not_year_one'][ $k ], function ( $r ) {
			return 'year2' === $r['why'];
		} );
		$des = array_filter( $y['not_year_one'][ $k ], function ( $r ) {
			return 'desert' === $r['why'];
		} );
		?>
	<li><strong><?php echo esc_html( $label ); ?>:</strong> <?php echo $y2 ? esc_html( $names( $y2 ) ) . ' (Pierre sells the seeds from Year 2)' : ''; ?><?php echo $y2 && $des ? '; ' : ''; ?><?php echo $des ? esc_html( $names( $des ) ) . ' (seeds from the Oasis in the desert)' : ''; ?>.</li>
	<?php endforeach; ?>
</ul>
<p>The desert opens when the bus is repaired, by finishing the Vault bundles (<?php echo esc_html( $gold( $y['desert']['vault'] ) ); ?> in total, as bundles of <?php echo esc_html( implode( ', ', array_map( $gold, $y['desert']['vault_bundles'] ) ) ); ?>) or by paying Joja <?php echo esc_html( $gold( $y['desert']['joja'] ) ); ?>. Either way it costs at least <?php echo esc_html( $gold( min( $y['desert']['joja'], $y['desert']['vault'] ) ) ); ?>, so don't build your first spring and summer around Starfruit or Rhubarb.</p>

<h2>Summer: Blueberries first</h2>
<?php $crop_table( $y['summer'], 'Summer crops in Year 1, planted on Summer 1' ); ?>
<p><strong>Blueberries</strong> are the best summer crop you can buy in Year 1: <?php echo esc_html( $gold( $blue['profit'] ) ); ?> a tile and <?php echo esc_html( $num( $blue['per_gold'] ) ); ?>g back for every gold of seed. They take <?php echo (int) $blue['growth']; ?> days for the first harvest, then give several berries every <?php echo (int) $blue['regrows']; ?> days until the end of summer, so one purchase covers the season. Plant as many as you can on Summer 1.</p>
<p><strong>Melons</strong> earn less per tile (<?php echo esc_html( $gold( $melon['profit'] ) ); ?>) but each harvest is worth <?php echo esc_html( $gold( $melon['per_harvest'] ) ); ?> and repays its seed in <?php echo (int) $melon['payback_days']; ?> days. Plant some anyway: the Summer Crops bundle needs one, and the Quality Crops bundle can take five gold-quality Melons. They also give <?php echo (int) $melon['xp']; ?> Farming XP per harvest, the most of any summer crop, which gets you to Preserves Jars sooner.</p>
<p><strong>Hops</strong> are a trap in Year 1 if you sell them raw: <?php echo esc_html( $gold( $hops['per_harvest'] ) ); ?> a harvest. They only pay once you have Kegs to make Pale Ale, at Farming level <?php echo (int) $keg['level']; ?>. <strong>Corn</strong> grows through summer and fall from one seed but repays it slowly (<?php echo (int) $corn['payback_days']; ?> days); if you only want one for the Fall Crops bundle, plant a few seeds in fall.</p>

<h2>Fall: Cranberries and Pumpkins</h2>
<?php $crop_table( $y['fall'], 'Fall crops in Year 1, planted on Fall 1' ); ?>
<p><strong>Cranberries</strong> make the most per tile in fall (<?php echo esc_html( $gold( $cran['profit'] ) ); ?>), but at <?php echo esc_html( $gold( $cran['seed_price'] ) ); ?> a seed they need gold up front, and the seed is paid back only after <?php echo (int) $cran['payback_days']; ?> days. If summer went well, plant Cranberries on Fall 1. If gold is short, <strong>Pumpkins</strong> (<?php echo esc_html( $gold( $pump['profit'] ) ); ?> a tile, <?php echo esc_html( $gold( $pump['per_harvest'] ) ); ?> a harvest) or <strong>Eggplant</strong> (<?php echo esc_html( $gold( $egg['seed_price'] ) ); ?> seeds that regrow, <?php echo esc_html( $num( $egg['per_gold'] ) ); ?>g back per gold) are cheaper ways in. Pumpkins can grow into giant crops, and they give <?php echo (int) $pump['xp']; ?> Farming XP a harvest.</p>
<p>Whatever you plant, check it finishes before Fall 28. Crops die when winter starts, and <?php echo 0 === (int) $y['winter_shop_crops'] ? 'no crop seed sold by Pierre or JojaMart grows outdoors in winter' : 'only a few crops grow outdoors in winter'; ?>, so fall is the last field income of the year. For a mid-season planting, the <a href="<?php echo esc_url( $what ); ?>">What to Plant Today</a> tool counts the days that are left.</p>

<h2>Get to Farming level <?php echo (int) $jar['level']; ?> for Preserves Jars</h2>
<p>The Preserves Jar recipe comes at <?php echo esc_html( $y['jar']['obtained'] ); ?> (<?php echo esc_html( number_format( $jar['xp'] ) ); ?> XP) and the Keg at <?php echo esc_html( $y['keg']['obtained'] ); ?> (<?php echo esc_html( number_format( $keg['xp'] ) ); ?> XP). Farming XP comes from harvests, and bigger crops give more, so the crop you pick changes how soon machines arrive:</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Harvests of one crop to reach each level from zero</caption>
	<thead><tr><th scope="col">Crop</th><th scope="col">Level <?php echo (int) $jar['level']; ?> (Preserves Jar)</th><th scope="col">Level <?php echo (int) $keg['level']; ?> (Keg)</th></tr></thead>
	<tbody>
	<?php
	$crop_names = array( 'parsnip' => 'Parsnip', 'potato' => 'Potato', 'cauliflower' => 'Cauliflower', 'blueberry' => 'Blueberry', 'melon' => 'Melon', 'cranberries' => 'Cranberries', 'pumpkin' => 'Pumpkin' );
	foreach ( $crop_names as $id => $label ) :
		?>
		<tr><th scope="row"><?php echo esc_html( $label ); ?></th><td><?php echo esc_html( number_format( $jar['harvests'][ $id ] ) ); ?></td><td><?php echo esc_html( number_format( $keg['harvests'][ $id ] ) ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p class="table-note">A harvest is one picked crop; extra items from the same plant give no extra XP. Mixed crops add up the same way.</p>
<p>Forty tiles of Potatoes harvested <?php echo (int) $potato['harvests']; ?> times in spring is <?php echo (int) ( 40 * $potato['harvests'] ); ?> harvests, past the <?php echo (int) $jar['harvests']['potato']; ?> needed for level <?php echo (int) $jar['level']; ?>, so a busy spring gets you Preserves Jars by summer. Level <?php echo (int) $keg['level']; ?> takes far longer. A Preserves Jar costs <?php echo esc_html( $mats( $y['jar']['materials'] ) ); ?>, all from chopping trees, breaking rocks and the first floors of the mines, so start collecting wood and coal before you reach the level. A Keg needs <?php echo esc_html( $mats( $y['keg']['materials'] ) ); ?> once the bars are smelted.</p>
<p>Here is what a jar or keg does to the Year 1 crops (no professions):</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Raw price against Preserves Jar and Keg products</caption>
	<thead><tr><th scope="col">Crop</th><th scope="col">Raw</th><th scope="col">Preserves Jar</th><th scope="col">Keg</th></tr></thead>
	<tbody>
	<?php foreach ( $y['processed'] as $p ) : ?>
		<tr><th scope="row"><?php echo esc_html( $p['name'] ); ?></th><td><?php echo esc_html( $gold( $p['raw'] ) ); ?></td><td><?php echo esc_html( $p['jar'] . ' ' . $gold( $p['jar_price'] ) ); ?> <small>(<?php echo esc_html( $num( $p['jar_days'] ) ); ?> days)</small></td><td><?php echo esc_html( $p['keg'] . ' ' . $gold( $p['keg_price'] ) ); ?> <small>(<?php echo esc_html( $num( $p['keg_days'] ) ); ?> days)</small></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>A jar triples a Blueberry and more than doubles a Melon or Pumpkin, and it finishes in <?php echo esc_html( $num( $y['processed'][0]['jar_days'] ) ); ?> days, so each jar you build turns crops you already grow into two or three times the gold, over and over. When you have more fruit than machines, put your most valuable crop in the Keg and the cheap fruit in jars<?php echo $kegs ? '; <a href="' . esc_url( $kegs ) . '">How Many Kegs Do I Need?</a> works out the numbers per crop' : ''; ?>.</p>

<h2>Finish the Pantry for the Greenhouse</h2>
<p>The Community Center's Pantry gives you the <?php echo esc_html( $y['pantry_reward'] ); ?>, which grows any crop all year and is the biggest step up for Year 2. Most of it is Year 1 crops, so plant at least one of each of these as you go:</p>
<ul>
	<?php foreach ( $y['pantry'] as $b ) : ?>
	<li><strong><?php echo esc_html( $b['name'] ); ?></strong> (<?php echo count( $b['items'] ) === (int) $b['slots'] ? 'all ' . (int) $b['slots'] : 'any ' . (int) $b['slots'] . ' of ' . count( $b['items'] ); ?>): <?php echo esc_html( implode( ', ', array_map( function ( $i ) {
		return ( $i['qty'] > 1 ? $i['qty'] . ' ' : '' ) . ( 'normal' !== $i['quality'] ? $i['quality'] . ' ' : '' ) . $i['name'];
	}, $b['items'] ) ) ); ?></li>
	<?php endforeach; ?>
</ul>
<p>A bundle item you miss in its season waits a whole year, so keep one of each crop in a chest. The Quality Crops bundle wants gold-quality crops, which come easier with Quality Fertilizer<?php echo $speed ? ' (see <a href="' . esc_url( $speed ) . '">Speed-Gro vs Fertilizer</a>)' : ''; ?>. Tick off what you have in the <a href="<?php echo esc_url( $tracker ); ?>">Bundle Tracker</a>.</p>

<h2>Animals and fruit trees in Year 1</h2>
<p>A Coop costs <?php echo esc_html( $gold( $coop['level']['gold'] ) ); ?> plus <?php echo (int) $coop['level']['wood']; ?> Wood and <?php echo (int) $coop['level']['stone']; ?> Stone, and a Chicken <?php echo esc_html( $gold( $coop['chicken']['price'] ) ); ?>. A new Chicken earns about <?php echo esc_html( $gold( $coop['chicken']['hearts0'] ) ); ?> a day and one at full hearts about <?php echo esc_html( $gold( $coop['chicken']['hearts5'] ) ); ?>, so animals are a slow start, but they keep producing in winter when the fields are empty. Build the coop once your summer crops are paying<?php echo $coopg ? '; <a href="' . esc_url( $coopg ) . '">Coop or Barn First?</a> compares every animal' : ''; ?>.</p>
<?php if ( $y['apricot'] ) : ?>
<p>Fruit trees are a poor first-year buy. The cheapest sapling, an Apricot, costs <?php echo esc_html( $gold( $y['apricot']['sapling'] ) ); ?>, earns <?php echo esc_html( $gold( $y['apricot']['first_year_raw'] ) ); ?> in its first season sold raw and pays back in its second. The same gold in seeds turns over many times in one season. Buy trees with gold you will not need for seeds<?php echo $trees ? ', and see <a href="' . esc_url( $trees ) . '">Best Fruit Trees</a> for which ones and when to plant them' : ''; ?>.</p>
<?php endif; ?>

<h2>Your Year 1 plan</h2>
<ol>
	<li><strong>Spring 1:</strong> plant the free Parsnips and spend your <?php echo esc_html( $gold( $s['gold'] ) ); ?> on <?php echo esc_html( $d1[0]['name'] ); ?> seeds. Reinvest every sale.</li>
	<li><strong>Spring, second week on:</strong> move to Potatoes and Cauliflower as your gold grows. Keep one Parsnip, Green Bean, Cauliflower and Potato for the bundle.</li>
	<li><strong>Spring <?php echo (int) $sb['day']; ?>:</strong> buy Strawberry Seeds at the Egg Festival, some to plant and some for next spring.</li>
	<li><strong>Summer 1:</strong> Blueberries on most of your soil, a few Melons, Tomatoes and Hot Peppers for the bundle.</li>
	<li><strong>Farming <?php echo (int) $jar['level']; ?>:</strong> craft Preserves Jars and start turning Blueberries into Jelly.</li>
	<li><strong>Fall 1:</strong> Cranberries if you can afford them, Pumpkins otherwise, plus Corn, Eggplant and Yam for the bundle.</li>
	<li><strong>Before winter:</strong> a Coop, and saplings planted where you want your orchard.</li>
</ol>
<p>Try your own day, gold and tiles in <a href="<?php echo esc_url( $what ); ?>">What to Plant Today</a>, or compare crops for a whole season in the <a href="<?php echo esc_url( $profit ); ?>">Crop Profit Calculator</a>.</p>
<?php
Stardew_Tools\Guides::quick_questions(
	array(
		'What is the fastest way to make money in Year 1?' => 'Reinvest every harvest in fast crops in spring (Parsnips, then Potatoes), plant Blueberries on Summer 1, and turn crops into Jelly once you reach Farming level ' . (int) $jar['level'] . '.',
		'What should I plant on Spring 1?'                 => 'The ' . (int) $s['seeds'] . ' free Parsnip Seeds, and ' . esc_html( $d1[0]['name'] ) . ' seeds with your ' . esc_html( $gold( $s['gold'] ) ) . '. Switch to Potatoes once you have more gold than empty soil.',
		'What is the best crop in Summer of Year 1?'       => 'Blueberries: ' . esc_html( $gold( $blue['profit'] ) ) . ' a tile planted on Summer 1. Starfruit needs the desert, which most players do not reach in Year 1.',
		'Can I buy Red Cabbage or Garlic in Year 1?'       => 'Not from Pierre: their seeds go on sale in Year 2.',
		'Are Strawberries worth it in Year 1?'             => 'A little: ' . esc_html( $gold( $sb['profit'] ) ) . ' a tile from the Egg Festival against ' . esc_html( $gold( $sb['potato'] ) ) . ' for Potatoes. Keep extra seeds for Spring 1 of Year 2, when they make ' . esc_html( $gold( $sb['next_spring'] ) ) . ' a tile.',
	)
);

<?php
/**
 * Guide: Dehydrator vs Keg.
 *
 * @var array    $g        data/answers.json "guides".
 * @var callable $gold     Formats gold.
 * @var callable $tool_url Tool permalink.
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

$d = isset( $g['dehydrator'] ) ? $g['dehydrator'] : null;
if ( ! $d ) {
	return;
}
$num  = function ( $n ) {
	return rtrim( rtrim( number_format( $n, 1 ), '0' ), '.' );
};
$f    = array();
foreach ( $d['fruit'] as $row ) {
	$f[ $row['id'] ] = $row;
}
$star = $f['starfruit'];
$rais = $d['raisins'];
$rec  = $d['recipe'];
$mats = function ( $list ) {
	return implode( ', ', array_map( function ( $m ) {
		return $m['qty'] . ' ' . $m['name'];
	}, $list ) );
};
$ratio = $star['per_dehydrator_day'] / max( 1, $star['per_keg_day'] );
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> it depends on what you are short of. Per fruit, the Keg wins: five Starfruit made into wine sell for <?php echo esc_html( $gold( $star['wine5'] ) ); ?> with Artisan, while the same five in a Dehydrator make one Dried Fruit worth <?php echo esc_html( $gold( $star['dried'] ) ); ?>. Per machine per day, the Dehydrator wins by a lot: it turns five fruit into Dried Fruit in about a day, while the same five fruit would tie up Kegs for over 31 keg-days. Use Kegs for your best fruit and the Dehydrator when you have more fruit than Kegs.</p>
</div>

<h2>How each machine works</h2>
<p>The two machines take the same fruit and give very different results:</p>
<ul>
	<li><strong>Keg:</strong> one fruit makes one wine, worth three times the fruit's price, and takes 6.25 days (10,000 game minutes).</li>
	<li><strong>Dehydrator:</strong> five fruit of the same type and quality make one Dried Fruit worth 7.5 times the fruit's price plus 25g, ready the next morning. The output is always normal quality. It cannot take Grapes, which give Raisins, or a Red Mushroom or Truffle.</li>
</ul>
<p>With the Artisan profession both products get a 40% bonus, and the figures on this page all include it. All prices here use normal-quality fruit.</p>
<p>The wiki gives the Dehydrator's time as one day, ready the next morning, while the Dried Fruit item page lists <?php echo (int) $d['minutes']; ?> game minutes, a little over one day. The two pages don't agree, so the per-day numbers here use one day. If the true time is the longer one, the Dehydrator's per-day figures are about 9% lower, and the conclusion does not change.</p>

<h2>Gold per fruit: the Keg wins</h2>
<p>The first limit most farms hit is fruit, not machines. If every fruit you grow already has a machine waiting for it, you want the most gold from each one. Here is what five fruit become in each machine:</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Five fruit, with Artisan</caption>
	<thead><tr><th scope="col">Fruit</th><th scope="col">Price each</th><th scope="col">Sold raw</th><th scope="col">As wine (Keg)</th><th scope="col">As Dried Fruit (Dehydrator)</th><th scope="col">Wine is better by</th></tr></thead>
	<tbody>
		<?php foreach ( $d['fruit'] as $row ) : ?>
		<tr<?php echo 'starfruit' === $row['id'] ? ' class="is-best"' : ''; ?>><th scope="row"><?php echo esc_html( $row['name'] ); ?></th><td><?php echo esc_html( $gold( $row['base'] ) ); ?></td><td><?php echo esc_html( $gold( $row['raw5'] ) ); ?></td><td><?php echo esc_html( $gold( $row['wine5'] ) ); ?></td><td><?php echo esc_html( $gold( $row['dried'] ) ); ?></td><td><?php echo esc_html( $gold( $row['wine5'] - $row['dried'] ) ); ?></td></tr>
		<?php endforeach; ?>
	</tbody>
</table>
</div>
<p class="table-note">Wine column is five bottles. Dried Fruit is one item from five fruit.</p>
<p>Wine is worth about <?php echo esc_html( $num( $star['wine5'] / $star['dried'] ) ); ?> times as much as Dried Fruit for the same Starfruit. The pattern is the same for every fruit, because wine pays 15 times the fruit price for five fruit and dried pays 10.5 times plus 35. So if you ever have to choose where a fruit goes and a Keg is free, the Keg is right.</p>
<p>The Dehydrator is not worse than selling raw, though. Starfruit sold raw bring in <?php echo esc_html( $gold( $star['raw5'] ) ); ?> for five, so Dried Fruit at <?php echo esc_html( $gold( $star['dried'] ) ); ?> is more than double. Even Strawberry, a cheap fruit, goes from <?php echo esc_html( $gold( $f['strawberry']['raw5'] ) ); ?> raw to <?php echo esc_html( $gold( $f['strawberry']['dried'] ) ); ?> dried.</p>

<h2>Gold per machine per day: the Dehydrator wins</h2>
<p>The second limit is machines. A Keg is busy for 6.25 days with one fruit, so a farm that harvests 100 fruit at once needs 100 Kegs to keep up (see <a href="<?php echo esc_url( home_url( '/artisan-goods/how-many-kegs-do-i-need/' ) ); ?>">How many kegs do I need?</a>). A Dehydrator handles five fruit in a day. Measured as sale price per machine per day:</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Gross gold per machine per day, with Artisan</caption>
	<thead><tr><th scope="col">Fruit</th><th scope="col">One Keg</th><th scope="col">One Dehydrator</th><th scope="col">Dehydrator is better by</th></tr></thead>
	<tbody>
		<?php foreach ( $d['fruit'] as $row ) : ?>
		<tr><th scope="row"><?php echo esc_html( $row['name'] ); ?></th><td><?php echo esc_html( $gold( $row['per_keg_day'] ) ); ?></td><td><?php echo esc_html( $gold( $row['per_dehydrator_day'] ) ); ?></td><td><?php echo esc_html( $num( $row['per_dehydrator_day'] / max( 1, $row['per_keg_day'] ) ) ); ?> times</td></tr>
		<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>For Starfruit a Dehydrator takes in <?php echo esc_html( $gold( $star['per_dehydrator_day'] ) ); ?> a day against <?php echo esc_html( $gold( $star['per_keg_day'] ) ); ?> for a Keg, about <?php echo esc_html( $num( $ratio ) ); ?> times as much. These are gross sale prices, not extra gold over selling raw, but the comparison is the same either way, since the gap is far bigger than the raw price.</p>
<p>In practice one Dehydrator out-earns about <?php echo (int) round( $ratio ); ?> Kegs a day when fruit is plentiful, though each fruit is worth less. The Dehydrator recipe is <?php echo esc_html( $mats( $rec['dehydrator'] ) ); ?>, and Pierre sells the recipe for <?php echo esc_html( $gold( $rec['dehydrator_shop']['price'] ) ); ?>. See <a href="<?php echo esc_url( $tool_url( 'crafting-calculator' ) ); ?>">the Crafting Calculator</a> for the cost of several.</p>

<h2>A worked harvest: 100 Starfruit</h2>
<p>Numbers per machine are easy to misread, so here is one concrete harvest. You have <?php echo (int) $d['scenario']['harvest']; ?> <?php echo esc_html( $d['scenario']['fruit'] ); ?> to deal with and one Keg cycle of <?php echo esc_html( rtrim( number_format( $d['scenario']['window_days'], 2 ), '0' ) ); ?> days to do it in. Each Keg takes one fruit. Each Dehydrator takes five fruit a day, so it finishes up to six batches in the window. Fruit nobody has time for is sold raw at <?php echo esc_html( $gold( $d['scenario']['raw_each'] ) ); ?>. All prices use Artisan.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>What 100 Starfruit earn with different machines</caption>
	<thead><tr><th scope="col">Kegs</th><th scope="col">Dehydrators</th><th scope="col">Made into wine</th><th scope="col">Dried Fruit batches</th><th scope="col">Sold raw</th><th scope="col">Total gold</th></tr></thead>
	<tbody>
		<?php foreach ( $d['scenario']['setups'] as $row ) : ?>
		<tr><th scope="row"><?php echo (int) $row['kegs']; ?></th><td><?php echo (int) $row['dehydrators']; ?></td><td><?php echo (int) $row['wine']; ?></td><td><?php echo (int) $row['batches']; ?></td><td><?php echo (int) $row['raw']; ?></td><td><?php echo esc_html( $gold( $row['total'] ) ); ?></td></tr>
		<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>Four Dehydrators on their own earn more than twenty Kegs on their own, because they can process every fruit in the window while the Kegs can only take one fruit each and the rest is sold raw. Adding Dehydrators to an existing Keg setup lifts the total further, and the last row, where nothing is sold raw, shows what the best mix looks like. Each Dehydrator you add earns the most when there is still fruit waiting. Once every fruit has a machine, extra Dehydrators add nothing, and your best fruit is better off in Kegs.</p>

<h2>The rule of thumb</h2>
<p>Put your fruit through this order:</p>
<ol>
	<li><strong>Fruit left over after your Kegs are all busy goes in the Dehydrator,</strong> not in a chest. Dried Fruit is worth a little over twice the raw price for every fruit in the table, and it needs only a day of machine time.</li>
	<li><strong>Your most valuable fruit goes in Kegs first,</strong> for example Starfruit and Ancient Fruit, where each fruit is worth the most as wine.</li>
	<li><strong>Cheap fruit such as Strawberry, Cranberries or Blueberry can skip the Keg,</strong> because a Keg held 6.25 days for a <?php echo esc_html( $gold( $f['blueberry']['wine'] ) ); ?> Blueberry wine is a poor use of a Keg.</li>
	<li><strong>Keep casks in mind.</strong> Wine can be aged to iridium, which doubles its price, and dried fruit cannot. <a href="<?php echo esc_url( home_url( '/artisan-goods/are-casks-worth-it/' ) ); ?>">Are casks worth it?</a> has the numbers.</li>
</ol>

<h2>Raisins and Dried Mushrooms</h2>
<p>Grapes are the exception. In a Dehydrator, five Grapes make Raisins, a fixed <?php echo esc_html( $gold( $rais['raisins_plain'] ) ); ?>, or <?php echo esc_html( $gold( $rais['raisins'] ) ); ?> with Artisan. Five Grapes made into wine in Kegs sell for <?php echo esc_html( $gold( $rais['wine5'] ) ); ?> and raw for <?php echo esc_html( $gold( $rais['raw5'] ) ); ?>. So Raisins are worth about half of the wine and about <?php echo esc_html( $num( $rais['raisins'] / $rais['raw5'] ) ); ?> times the raw price, and again the Dehydrator wins on machine time.</p>
<p>Mushrooms (not Red Mushrooms or Truffles) also go in the Dehydrator, five at a time, and the result is Dried Mushrooms, worth 7.5 times the mushroom price plus 25g, or 10.5 times plus 35 with Artisan. The wiki gives the formula but no worked example, so this guide does not print mushroom prices. A free Dehydrator also comes with the mushroom option in the Farm Cave.</p>

<h2>The Fish Smoker</h2>
<p>The Fish Smoker is a close relative. It takes one fish and one Coal and makes Smoked Fish in <?php echo (int) $d['smoker_minutes']; ?> minutes. Smoked Fish sells for twice the fish's price, or 2.8 times with Artisan, and keeps the fish's quality. For a fish worth:</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Smoked Fish prices</caption>
	<thead><tr><th scope="col">Fish price</th><th scope="col">Smoked</th><th scope="col">Smoked, Artisan</th></tr></thead>
	<tbody>
		<?php foreach ( $d['smoker'] as $s ) : ?>
		<tr><th scope="row"><?php echo esc_html( $gold( $s['fish'] ) ); ?></th><td><?php echo esc_html( $gold( $s['plain'] ) ); ?></td><td><?php echo esc_html( $gold( $s['artisan'] ) ); ?></td></tr>
		<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>Each fish uses one Coal, so smoke only fish that sell for clearly more than the Coal you spend. The Fish Smoker recipe is <?php echo esc_html( $mats( $rec['smoker'] ) ); ?>, and the Fish Shop sells the recipe for <?php echo esc_html( $gold( $rec['smoker_shop']['price'] ) ); ?>. Fish ponds make roe rather than fish, so for those see <a href="<?php echo esc_url( home_url( '/fishing/best-fish-for-fish-ponds/' ) ); ?>">Best fish for fish ponds</a>.</p>

<?php
$craft = array();
foreach ( isset( $answers['tables']['crafting'] ) ? $answers['tables']['crafting'] : array() as $row ) {
	$craft[ $row['id'] ] = $row;
}
$keg_from   = isset( $craft['keg'] ) ? $craft['keg']['obtained'] : '';
$irid_raw5  = $star['base'] * 2 * 5;
?>
<h2>Year 1 or later: which machine to build first</h2>
<p>The two machines unlock in different ways, and that often decides the order more than the gold per day does. The Keg recipe comes with <?php echo esc_html( $keg_from ); ?> and needs <?php echo esc_html( isset( $craft['keg'] ) ? implode( ', ', $craft['keg']['ingredients'] ) : '' ); ?>. The Dehydrator recipe is bought from Pierre for <?php echo esc_html( $gold( $rec['dehydrator_shop']['price'] ) ); ?> and needs <?php echo esc_html( $mats( $rec['dehydrator'] ) ); ?>; Fire Quartz comes from the lower floors of the Mines and from Magma Geodes.</p>
<ul>
	<li><strong>Year 1, few fruit:</strong> neither machine pays for itself quickly on a handful of Blueberries or Cranberries. Sell raw, save for Kegs, and buy the Dehydrator recipe only once you have more fruit than you can carry to the shipping bin.</li>
	<li><strong>Your first fruit field (Year 1 Fall or Year 2):</strong> build Kegs for the expensive fruit as soon as Farming level 8 arrives, and add one or two Dehydrators for everything the Kegs cannot take. A Dehydrator needs only one batch of five fruit a day, so it is the cheapest way to stop fruit piling up in chests.</li>
	<li><strong>Late game, a full greenhouse or Ginger Island farm:</strong> Kegs on Starfruit and Ancient Fruit, casks in the cellar for the wine, and a row of Dehydrators for berries and any overflow. At this stage you have more fruit than machines, which is exactly when the per-day table above matters most.</li>
</ul>

<h2>Iridium fruit: sell it, do not dry it</h2>
<p>A Dehydrator ignores quality: five iridium Starfruit make the same Dried Fruit as five normal ones. Iridium fruit sells for twice the normal price, so five iridium Starfruit sold raw bring <?php echo esc_html( $gold( $irid_raw5 ) ); ?> before Tiller, more than the <?php echo esc_html( $gold( $star['dried'] ) ); ?> Dried Fruit they would make even with Artisan. Kegs also ignore quality, so the same logic applies there, but wine can be aged in a cask. Dry your normal and silver fruit, and sell or keg the best ones.</p>

<h2>The mushroom cave and Dried Mushrooms</h2>
<p>If you picked mushrooms for the Farm Cave, you get a Dehydrator early, long before most farms can buy one. The mushroom boxes give a few mushrooms at a time, and the Dehydrator needs five of the same kind and quality, so let them collect in a chest and dry them in batches. Red Mushrooms cannot be dried; keep them for the bundles and recipes that need them. With bats instead of mushrooms, the cave gives fruit, and those go through the same rules as the fruit on this page.</p>

<?php
Stardew_Tools\Guides::quick_questions(
	array(
		'Can you put Grapes in a Dehydrator?'     => 'Yes. Five Grapes make Raisins, a fixed ' . esc_html( $gold( $rais['raisins_plain'] ) ) . ' (' . esc_html( $gold( $rais['raisins'] ) ) . ' with Artisan) instead of Dried Fruit. Wine from the same five Grapes is worth more.',
		'Does fruit quality matter in a Dehydrator?' => 'No. The five fruit must be the same type and quality, but the Dried Fruit is always normal quality and its price only depends on the fruit type.',
		'How long does a Dehydrator take?'         => 'It is ready the next morning, about one day. One wiki page lists ' . (int) $d['minutes'] . ' minutes instead, which is a little over a day; this guide uses one day.',
		'Does Artisan increase Dried Fruit?'       => 'Yes. Dried Fruit, Raisins and Dried Mushrooms are artisan goods, so Artisan adds 40%. All prices on this page include it.',
		'How many Dehydrators equal one Keg?'      => 'For Starfruit, one Dehydrator brings in about ' . esc_html( $num( $ratio ) ) . ' times the gold of one Keg per day, because it handles five fruit a day. Per fruit, the Keg is still worth about ' . esc_html( $num( $star['wine5'] / $star['dried'] ) ) . ' times as much.',
		'Can you dry Truffles or Red Mushrooms?'   => 'No. The Dehydrator takes other mushrooms, but not Red Mushrooms or Truffles. Truffles go in the Oil Maker.',
	)
);
?>

<h2>Related</h2>
<p>For the Keg's own numbers, see <a href="<?php echo esc_url( $tool_url( 'keg-vs-preserves-jar' ) ); ?>">Keg vs Preserves Jar</a>. For a greenhouse that makes this much fruit, see <a href="<?php echo esc_url( home_url( '/greenhouse/best-greenhouse-setup-for-money/' ) ); ?>">Best Greenhouse Setup for Money</a>.</p>

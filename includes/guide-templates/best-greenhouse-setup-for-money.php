<?php
/**
 * Guide: Best greenhouse setup for money.
 *
 * @var array    $g        data/answers.json "guides".
 * @var callable $gold     Formats gold.
 * @var callable $tool_url Tool permalink.
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

$gh = isset( $g['greenhouse'] ) ? $g['greenhouse'] : null;
if ( ! $gh ) {
	return;
}
$at = array();
foreach ( $gh['by_kegs'] as $row ) {
	$at[ $row['kegs'] ] = $row['top'];
}
$k = array();
foreach ( $g['kegs'] as $r ) {
	$k[ $r['id'] ] = $r;
}
$hops_kegs = (int) ceil( $k['hops']['kegs_per_plant'] * $gh['tiles'] );
$af_kegs   = (int) ceil( $k['ancient-fruit']['kegs_per_plant'] * $gh['tiles'] );
$planner   = $tool_url( 'greenhouse-planner' );
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> fill the greenhouse with <strong>Ancient Fruit</strong> unless you own well over 100 kegs. Ancient Fruit is the best crop to sell raw, and it stays the best as you add kegs up to about 100. Hops only take over when you have enough kegs to turn every cone into Pale Ale, about <?php echo (int) $hops_kegs; ?> of them. Then a Hops greenhouse makes around <?php echo esc_html( $gold( $at[170][0]['total'] ) ); ?> a year.</p>
</div>

<p>Most "best greenhouse crop" lists rank crops per tile as if you could process every harvest. You can't, unless you have built a lot of kegs. So we asked a different question: with the kegs you actually own, which single crop makes the most in a year? Everything is for an established greenhouse (year 2 onward) with 6 Iridium Sprinklers, which leaves <?php echo (int) $gh['tiles']; ?> tiles. It counts 112 days, all four seasons, with the Artisan profession. Kegs get the most valuable fruit first and everything else is sold raw.</p>

<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Best single greenhouse crop by number of kegs (gold per year)</caption>
	<thead><tr><th scope="col">Kegs you own</th><th scope="col">1st</th><th scope="col">2nd</th><th scope="col">3rd</th></tr></thead>
	<tbody>
	<?php foreach ( $gh['by_kegs'] as $row ) : ?>
		<tr>
			<th scope="row"><?php echo 0 === (int) $row['kegs'] ? 'None' : (int) $row['kegs']; ?></th>
			<?php foreach ( $row['top'] as $i => $c ) : ?>
			<td<?php echo 0 === $i ? ' class="is-best"' : ''; ?>><?php echo esc_html( $c['name'] ); ?><br><small><?php echo esc_html( $gold( $c['total'] ) ); ?></small></td>
			<?php endforeach; ?>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>

<h2>Why Ancient Fruit wins for most farms</h2>
<p>Ancient Fruit gives one fruit a week from every plant, all year, and you never replant. Each fruit sells for 550g raw, so whatever your kegs can't take is still worth a lot. With <?php echo (int) $af_kegs; ?> kegs you can turn the whole greenhouse into wine, and nothing but Hops beats that.</p>

<h2>Starfruit: best per keg, not per greenhouse</h2>
<p>Per day of keg time, Starfruit Wine earns the most of any greenhouse crop: about <?php echo esc_html( $gold( $gh['per_keg_day'][0]['gain'] ) ); ?> more than selling the fruit, against <?php echo esc_html( $gold( $gh['per_keg_day'][1]['gain'] ) ); ?> for <?php echo esc_html( $gh['per_keg_day'][1]['name'] ); ?> <?php echo esc_html( $gh['per_keg_day'][1]['product'] ); ?> and <?php echo esc_html( $gold( $gh['per_keg_day'][2]['gain'] ) ); ?> for <?php echo esc_html( $gh['per_keg_day'][2]['name'] ); ?> <?php echo esc_html( $gh['per_keg_day'][2]['product'] ); ?>. But a Starfruit only ripens every 13 days and has to be replanted, so a full greenhouse of it gives too few fruit to beat Ancient Fruit. If you have a few kegs and a big field of Ancient Fruit, a row of Starfruit to feed those kegs is a good mix. Try it in the <a href="<?php echo esc_url( $planner ); ?>">Greenhouse Planner</a>.</p>

<h2>Hops: only with a shed full of kegs</h2>
<p>A Hops vine gives a cone every day, and Pale Ale sells for far more than the cone. The problem is volume. <?php echo (int) $gh['tiles']; ?> vines make <?php echo (int) $gh['tiles']; ?> cones a day, and each Pale Ale takes <?php echo esc_html( $k['hops']['keg_days'] ); ?> days in a keg. Below about 100 kegs most cones are sold raw for 25g each, and Hops falls behind. If you are building toward a keg shed, start with Ancient Fruit and switch when the kegs are ready. <a href="<?php echo esc_url( Stardew_Tools\Guides::guide_url( 'how-many-kegs-do-i-need' ) ); ?>">How many kegs do I need?</a> has the numbers for every crop.</p>

<h2>Without any kegs</h2>
<p>Sold raw, Ancient Fruit makes about <?php echo esc_html( $gold( $at[0][0]['total'] ) ); ?> a year, ahead of <?php echo esc_html( $at[0][1]['name'] ); ?> (<?php echo esc_html( $gold( $at[0][1]['total'] ) ); ?>) and <?php echo esc_html( $at[0][2]['name'] ); ?> (<?php echo esc_html( $gold( $at[0][2]['total'] ) ); ?>). Sweet Gem Berry seeds come only from Rare Seeds, so for most players Ancient Fruit is the answer here too. The <a href="<?php echo esc_url( $tool_url( 'ancient-fruit-vs-starfruit' ) ); ?>">Ancient Fruit vs Starfruit</a> page compares the two in your first greenhouse year, when Ancient Fruit is still growing.</p>

<h2>The per-tile list, and why it misleads</h2>
<p>If you've seen a "best greenhouse crops" list before, it probably ranked crops by gold per tile. There are two versions of that list, and they give different answers.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Gold per tile for a year, two ways</caption>
	<thead><tr><th scope="col">#</th><th scope="col">Sold raw</th><th scope="col">Per tile</th><th scope="col">With unlimited machines</th><th scope="col">Per tile</th><th scope="col">Machines needed</th></tr></thead>
	<tbody>
	<?php foreach ( $gh['raw_top'] as $i => $r ) : $u = $gh['unlimited'][ $i ]; ?>
		<tr>
			<td><?php echo (int) $i + 1; ?></td>
			<th scope="row"><?php echo esc_html( $r['name'] ); ?></th>
			<td><?php echo esc_html( $gold( $r['per_tile'] ) ); ?></td>
			<td><?php echo esc_html( $u['name'] ); ?> <small>(<?php echo esc_html( $u['sell_as'] ); ?>)</small></td>
			<td><?php echo esc_html( $gold( $u['per_tile'] ) ); ?></td>
			<td><?php echo (int) $u['machines']; ?></td>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>The right-hand list is the one most guides show, and it looks dramatic: a Hops greenhouse at <?php echo esc_html( $gold( $gh['unlimited'][0]['per_tile'] ) ); ?> a tile. But look at the last column. It assumes <?php echo (int) $gh['unlimited'][0]['machines']; ?> machines working all year. The left-hand list is what the same greenhouse makes if you sell everything as it comes. The table at the top of this guide fills the gap between the two, one keg count at a time.</p>

<h2>How we counted</h2>
<ul>
	<li><strong>One crop per greenhouse.</strong> Mixed plantings are possible, but a single crop makes the comparison clean.</li>
	<li><strong>A year is 112 days.</strong> The greenhouse has no seasons, so all four count, 28 days each.</li>
	<li><strong>Established means year two.</strong> Ancient Fruit and similar plants are already growing at the start of the year.</li>
	<li><strong>Kegs take the most valuable fruit first</strong> and everything left over is sold raw.</li>
	<li><strong>Artisan profession, raw quality at level 0.</strong> Higher levels and the Tiller profession change the totals, so treat the gold figures as a comparison, not a forecast.</li>
</ul>

<h2>Sprinklers: how many tiles you really get</h2>
<p>The greenhouse has 120 soil tiles, but sprinklers sit on soil and take tiles away from crops. The layout decides how many are left to plant, and how much of your day goes to watering.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Greenhouse layouts, with Ancient Fruit sold raw for a year</caption>
	<thead><tr><th scope="col">Layout</th><th scope="col">Sprinklers</th><th scope="col">Plantable tiles</th><th scope="col">Ancient Fruit a year</th></tr></thead>
	<tbody>
	<?php foreach ( $gh['layouts'] as $r ) : ?>
		<tr<?php echo 'iridium' === $r['id'] ? ' class="is-best"' : ''; ?>><th scope="row"><?php echo esc_html( $r['name'] ); ?></th><td><?php echo (int) $r['sprinklers']; ?></td><td><?php echo (int) $r['tiles']; ?></td><td><?php echo esc_html( $gold( $r['ancient_fruit_raw'] ) ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>Without sprinklers you get every tile, <?php echo (int) $gh['layouts'][0]['tiles']; ?>, but you water all of them by hand every day. Sixteen Quality Sprinklers cover everything and leave <?php echo (int) $gh['layouts'][1]['tiles']; ?> tiles. Six Iridium Sprinklers also cover everything and leave <?php echo (int) $gh['layouts'][2]['tiles']; ?>, so Iridium is worth about <?php echo esc_html( $gold( $gh['layouts'][2]['ancient_fruit_raw'] - $gh['layouts'][1]['ancient_fruit_raw'] ) ); ?> a year more than Quality in Ancient Fruit alone, and takes far fewer sprinklers to build.</p>
<p>The materials: six Iridium Sprinklers are <?php echo esc_html( implode( ', ', array_map( function ( $m ) { return number_format( $m['qty'] ) . ' ' . $m['name']; }, $g['costs']['iridium_6']['materials'] ) ) ); ?>. Sixteen Quality Sprinklers are <?php echo esc_html( implode( ', ', array_map( function ( $m ) { return number_format( $m['qty'] ) . ' ' . $m['name']; }, $g['costs']['quality_16']['materials'] ) ) ); ?>. Iridium needs <?php echo esc_html( $g['costs']['iridium-sprinkler']['obtained'] ); ?>, and Quality needs <?php echo esc_html( $g['costs']['quality-sprinkler']['obtained'] ); ?>, so build Quality first if you are earlier in the game and replace them when you can. The <a href="<?php echo esc_url( $planner ); ?>">Greenhouse Planner</a> shows the exact placement.</p>

<h2>Your first year is slower</h2>
<p>All the numbers above are for an established greenhouse. In the first year, crops with a long first growth lose days to growing. Ancient Fruit takes <?php echo (int) $gh['first_year'][0]['growth']; ?> days to give its first fruit, which is a whole season with nothing to pick.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Raw profit per tile over 112 days, first year against established</caption>
	<thead><tr><th scope="col">Crop</th><th scope="col">Days to first harvest</th><th scope="col">First year</th><th scope="col">Established</th></tr></thead>
	<tbody>
	<?php foreach ( $gh['first_year'] as $r ) : ?>
		<tr><th scope="row"><?php echo esc_html( $r['name'] ); ?></th><td><?php echo (int) $r['growth']; ?></td><td><?php echo esc_html( $gold( $r['first_profit'] ) ); ?> <small>(<?php echo (int) $r['first_harvests']; ?> harvests)</small></td><td><?php echo esc_html( $gold( $r['established_profit'] ) ); ?> <small>(<?php echo (int) $r['established_harvests']; ?> harvests)</small></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>Ancient Fruit still wins the first year with <?php echo esc_html( $gold( $gh['first_year'][0]['first_profit'] ) ); ?> a tile, against <?php echo esc_html( $gold( $gh['first_year'][1]['first_profit'] ) ); ?> for Starfruit. It makes about a quarter less in year one because of that 28-day wait. Starfruit has no difference, because it is replanted every cycle anyway. If you want gold in your first greenhouse season, plant a few Starfruit alongside, and let the Ancient Fruit catch up.</p>

<h2>What to do at each stage</h2>
<ol>
	<li><strong>No kegs yet:</strong> plant Ancient Fruit and sell it raw. It makes the most gold of any crop with no machines at all.</li>
	<li><strong>Some kegs (about 20 to 50):</strong> keep the Ancient Fruit, and send the fruit that the kegs can take to wine. Pick the table row nearest to your keg count.</li>
	<li><strong>Around 100 kegs:</strong> Ancient Fruit is still the best single crop. There's nothing to change until you can process nearly every cone.</li>
	<li><strong>170 kegs or more:</strong> consider Hops. At that point a Hops greenhouse makes more than Ancient Fruit.</li>
</ol>

<h2>Mistakes to avoid</h2>
<ul>
	<li><strong>Copying a per-tile list.</strong> The best crop per tile is only the best crop if you can process all of it.</li>
	<li><strong>Covering every tile with sprinklers.</strong> Each sprinkler gives up a tile. Count what you need to water, not what you can.</li>
	<li><strong>Replanting Ancient Fruit.</strong> It keeps producing. Digging it up to replant only throws away the 28-day wait.</li>
	<li><strong>Ignoring the first year.</strong> Judge the greenhouse over two years, not one.</li>
</ul>

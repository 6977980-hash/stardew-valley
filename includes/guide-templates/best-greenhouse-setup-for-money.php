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

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
	<li><?php echo $link( 'machines', $id, $m['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?><span>Accepts <?php echo (int) $m['accepted']; ?> crops. Best: <?php echo esc_html( $m['crops'][0]['name'] ); ?> at <?php echo esc_html( $gold( $m['crops'][0]['gain_per_machine_day'] ) ); ?> per machine per day.</span></li>
	<?php endforeach; ?>
</ul>

<h2>Which one first?</h2>
<p>Wine from a Keg takes far longer than jam from a Preserves Jar, but it sells for more, so the Keg wins on gold per item and the Jar wins on gold per machine per day for most cheap crops. Start with Jars if you have few machines and many crops, and add Kegs for high-value fruit like Starfruit or Ancient Fruit. Put your own numbers into <a href="<?php echo esc_url( $tool_url( 'keg-vs-preserves-jar' ) ); ?>">Keg vs Preserves Jar</a>, and read <a href="<?php echo esc_url( $guide_url( 'how-many-kegs-do-i-need' ) ); ?>">How many kegs do I need?</a> to size the setup.</p>

<p><a href="<?php echo esc_url( Stardew_Tools\Entities::csv_url( 'stardew-machine-rankings.csv' ) ); ?>" download>Download this table as CSV</a>, or see all <a href="<?php echo esc_url( home_url( '/data/' ) ); ?>">data downloads</a>.</p>

<h2>Related</h2>
<ul class="related-list">
	<li><a href="<?php echo esc_url( $tool_url( 'keg-vs-preserves-jar' ) ); ?>">Keg vs Preserves Jar</a><span>Split a harvest across your machines.</span></li>
	<li><a href="<?php echo esc_url( $tool_url( 'greenhouse-planner' ) ); ?>">Greenhouse Planner</a><span>Best greenhouse crop for your machines.</span></li>
</ul>

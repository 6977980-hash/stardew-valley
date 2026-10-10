<?php
/**
 * Hub intro: Animals.
 *
 * @var array $answers
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;
$an = isset( $answers['animals']['raw'] ) ? $answers['animals']['raw'] : array();
$ap = isset( $answers['animals']['processed'] ) ? $answers['animals']['processed'] : array();
$pg = isset( $answers['guides']['pigs'] ) ? $answers['guides']['pigs'] : array();
$g  = function ( $n ) {
	return number_format( (int) $n ) . 'g';
};
?>
<p class="hub-lead">Animals earn every day without replanting, but only if they are happy and you keep up with feeding and petting. What each one earns depends on its hearts, its mood and your professions, and the gap between the best and worst animal is huge.</p>
<?php if ( count( $an ) >= 3 ) : ?>
<p>At full hearts, selling raw, a <?php echo esc_html( $an[0]['name'] ); ?> earns about <?php echo esc_html( $g( $an[0]['gold_per_day'] ) ); ?> on a day it goes outside, a <?php echo esc_html( $an[1]['name'] ); ?> about <?php echo esc_html( $g( $an[1]['gold_per_day'] ) ); ?>, and a <?php echo esc_html( end( $an )['name'] ); ?> about <?php echo esc_html( $g( end( $an )['gold_per_day'] ) ); ?>. The calculator below shows the same for your own hearts, mood and machines.</p>
<?php endif; ?>
<h2>Start here</h2>
<ol>
	<li>Which animal to buy next? The <a href="<?php echo esc_url( Stardew_Tools\Tools::url( 'animal-profit-calculator' ) ); ?>">Animal Profit Calculator</a> ranks them all with payback days.</li>
	<li>Saving up for a Deluxe Barn? Read <a href="<?php echo esc_url( Stardew_Tools\Guides::guide_url( 'are-pigs-worth-it' ) ); ?>">Are Pigs Worth It?</a></li>
	<li>Building your first barn or coop? <a href="<?php echo esc_url( Stardew_Tools\Guides::guide_url( 'coop-or-barn-first' ) ); ?>">Coop or Barn First?</a> compares them.</li>
</ol>
<?php if ( ! empty( $pg['compare'] ) ) : ?>
<h2>Every animal at full hearts</h2>
<p>This is the whole ranking in one table. "Processed" means the products are turned into artisan goods (cheese, mayonnaise, cloth, oil) by a player with the Artisan profession. Payback is how many days of processed production it takes to earn back the animal's price.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Gold per day at full hearts</caption>
	<thead><tr><th scope="col">Animal</th><th scope="col">Lives in</th><th scope="col">Price</th><th scope="col">Raw</th><th scope="col">Processed</th><th scope="col">Payback (days, processed)</th></tr></thead>
	<tbody>
	<?php foreach ( $pg['compare'] as $r ) : ?>
		<tr><th scope="row"><?php echo esc_html( $r['name'] ); ?></th><td><?php echo esc_html( $r['building'] ); ?></td><td><?php echo esc_html( $g( $r['price'] ) ); ?></td><td><?php echo esc_html( $g( $r['raw'] ) ); ?></td><td><?php echo esc_html( $g( $r['processed'] ) ); ?></td><td><?php echo esc_html( number_format( (float) $r['payback'], 1 ) ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>Two things stand out. The Pig is far ahead, but it only finds truffles on days it can go outside, so it earns nothing in winter or on rainy days. Chickens and Cows are the opposite: they pay for themselves fastest and earn every day, which makes them the safe first purchase.</p>
<?php endif; ?>
<?php if ( ! empty( $pg['by_friendship'] ) ) : ?>
<h2>Hearts change the Pig the most</h2>
<p>A Pig's truffles per day depend heavily on how well you have treated it, from about <?php echo esc_html( number_format( (float) $pg['by_friendship'][0]['truffles'], 2 ) ); ?> at no hearts to <?php echo esc_html( number_format( (float) end( $pg['by_friendship'] )['truffles'], 1 ) ); ?> at five. Sold raw, that is the difference between <?php echo esc_html( $g( $pg['by_friendship'][0]['raw'] ) ); ?> and <?php echo esc_html( $g( end( $pg['by_friendship'] )['raw'] ) ); ?> a day, so a new Pig is a slow investment and a loved Pig is a very good one. Feed it, pet it, and let it outside whenever the weather allows.</p>
<?php endif; ?>
<h2>What decides the number</h2>
<ul>
	<li><strong>Hearts.</strong> An animal earns far less when you first buy it than at full friendship, so the first weeks are slower than any table shows. Petting and feeding every day is how it rises.</li>
	<li><strong>Selling raw or processing.</strong> Processing needs machines (a Cheese Press, Mayonnaise Machine, Loom or Oil Maker) and the Artisan profession to reach the "Processed" column.</li>
	<li><strong>Weather and season.</strong> Only truffle-finding animals depend on it, but for a Pig it is the biggest factor.</li>
	<li><strong>Space.</strong> Each building holds a fixed number of animals, so the real question is often which animal fills a slot best.</li>
</ul>

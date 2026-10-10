<?php
/**
 * Guide: Coop or barn first?
 *
 * @var array    $g        data/answers.json "guides".
 * @var callable $gold     Formats gold.
 * @var callable $tool_url Tool permalink.
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

if ( empty( $g['buildings'] ) ) {
	return;
}
$num  = function ( $n ) {
	return rtrim( rtrim( number_format( $n, 1 ), '0' ), '.' );
};
$by   = array();
foreach ( $g['buildings'] as $b ) {
	foreach ( $b['animals'] as $a ) {
		$by[ $a['id'] ] = $a;
	}
}
$chicken = $by['chicken'];
$cow     = $by['cow'];
$duck    = $by['duck'];
$goat    = $by['goat'];
$pig     = $by['pig'];
$rabbit  = $by['rabbit'];
$sheep   = $by['sheep'];
$eggs    = array();
foreach ( $g['egg_animals'] as $e ) {
	$eggs[ $e['id'] ] = $e;
}
$raw_pay = function ( $a ) {
	return $a['price'] / max( 1, $a['hearts5'] );
};
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> start with a coop if gold is tight, and with a barn if you can afford a cow. A <?php echo esc_html( $chicken['name'] ); ?> costs <?php echo esc_html( $gold( $chicken['price'] ) ); ?> and earns <?php echo esc_html( $gold( $chicken['hearts5'] ) ); ?> a day at full friendship, paying itself back in about <?php echo esc_html( $num( $raw_pay( $chicken ) ) ); ?> days of production. A <?php echo esc_html( $cow['name'] ); ?> costs <?php echo esc_html( $gold( $cow['price'] ) ); ?> and earns <?php echo esc_html( $gold( $cow['hearts5'] ) ); ?> a day, paying back in about <?php echo esc_html( $num( $raw_pay( $cow ) ) ); ?> days. Per animal the cow is the better buy from the first week, and the chicken is the cheaper way in.</p>
</div>

<h2>Which building does each animal need?</h2>
<p>Marnie sells every farm animal except the ones you hatch from special eggs, but an animal only fits a building of the right level. The first level of each building takes the basic animal. The Big versions take more, and the Deluxe versions take the rest, including the animals with the highest earnings:</p>
<ul>
	<li><strong>Coop:</strong> <?php echo esc_html( $chicken['name'] ); ?> (<?php echo esc_html( $gold( $chicken['price'] ) ); ?>).</li>
	<li><strong>Big Coop:</strong> <?php echo esc_html( $duck['name'] ); ?> (<?php echo esc_html( $gold( $duck['price'] ) ); ?>), and the Void Chicken, Golden Chicken and Dinosaur you hatch yourself.</li>
	<li><strong>Deluxe Coop:</strong> <?php echo esc_html( $rabbit['name'] ); ?> (<?php echo esc_html( $gold( $rabbit['price'] ) ); ?>).</li>
	<li><strong>Barn:</strong> <?php echo esc_html( $cow['name'] ); ?> (<?php echo esc_html( $gold( $cow['price'] ) ); ?>), and the Ostrich you hatch.</li>
	<li><strong>Big Barn:</strong> <?php echo esc_html( $goat['name'] ); ?> (<?php echo esc_html( $gold( $goat['price'] ) ); ?>).</li>
	<li><strong>Deluxe Barn:</strong> <?php echo esc_html( $sheep['name'] ); ?> (<?php echo esc_html( $gold( $sheep['price'] ) ); ?>) and <?php echo esc_html( $pig['name'] ); ?> (<?php echo esc_html( $gold( $pig['price'] ) ); ?>).</li>
</ul>
<p>That means the first-level choice is only two animals: the chicken or the cow. The building prices and the number of animals each holds aren't in our verified data, so check Robin's list in the game before you commit your gold. The rest of this guide compares the animals themselves.</p>

<h2>The coop: chickens, ducks and rabbits</h2>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Coop animals, gold per day at three friendship levels</caption>
	<thead><tr><th scope="col">Animal</th><th scope="col">Needs</th><th scope="col">Price</th><th scope="col">Days to mature</th><th scope="col">0 hearts</th><th scope="col">3 hearts</th><th scope="col">5 hearts</th><th scope="col">5 hearts, artisan goods</th><th scope="col">Pays back in (raw)</th></tr></thead>
	<tbody>
		<?php foreach ( $g['buildings'][0]['animals'] as $a ) : ?>
		<tr><th scope="row"><?php echo esc_html( $a['name'] ); ?></th><td><?php echo esc_html( $a['building_name'] ); ?></td><td><?php echo esc_html( $gold( $a['price'] ) ); ?></td><td><?php echo (int) $a['mature']; ?></td><td><?php echo esc_html( $gold( $a['hearts0'] ) ); ?></td><td><?php echo esc_html( $gold( $a['hearts3'] ) ); ?></td><td><?php echo esc_html( $gold( $a['hearts5'] ) ); ?></td><td><?php echo esc_html( $gold( $a['processed5'] ) ); ?></td><td><?php echo esc_html( $num( $raw_pay( $a ) ) ); ?> days</td></tr>
		<?php endforeach; ?>
	</tbody>
</table>
</div>
<p class="table-note">Average daily luck, maximum happiness, no hay cost. Artisan goods assume the Artisan profession and a machine for every animal.</p>
<p>The Chicken is the cheapest animal in the game and the best value in the coop. It is mature in <?php echo (int) $chicken['mature']; ?> days and its eggs sell for <?php echo esc_html( $gold( $chicken['hearts5'] ) ); ?> a day at full hearts once you have petted it for a while. With Mayonnaise Machines and the Artisan profession that rises to <?php echo esc_html( $gold( $chicken['processed5'] ) ); ?>. The Duck costs <?php echo esc_html( $num( $duck['price'] / $chicken['price'] ) ); ?> times as much and earns less (<?php echo esc_html( $gold( $duck['hearts5'] ) ); ?> a day), so it is not a first choice. Its one perk, according to the wiki, is that it does not need hay or grass when it can swim on water. The Rabbit is expensive at <?php echo esc_html( $gold( $rabbit['price'] ) ); ?> and pays back slowly, in about <?php echo esc_html( $num( $raw_pay( $rabbit ) ) ); ?> days raw.</p>

<h2>The barn: cows, goats, sheep and pigs</h2>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Barn animals, gold per day at three friendship levels</caption>
	<thead><tr><th scope="col">Animal</th><th scope="col">Needs</th><th scope="col">Price</th><th scope="col">Days to mature</th><th scope="col">0 hearts</th><th scope="col">3 hearts</th><th scope="col">5 hearts</th><th scope="col">5 hearts, artisan goods</th><th scope="col">Pays back in (raw)</th></tr></thead>
	<tbody>
		<?php foreach ( $g['buildings'][1]['animals'] as $a ) : ?>
		<tr><th scope="row"><?php echo esc_html( $a['name'] ); ?></th><td><?php echo esc_html( $a['building_name'] ); ?></td><td><?php echo esc_html( $gold( $a['price'] ) ); ?></td><td><?php echo (int) $a['mature']; ?></td><td><?php echo esc_html( $gold( $a['hearts0'] ) ); ?></td><td><?php echo esc_html( $gold( $a['hearts3'] ) ); ?></td><td><?php echo esc_html( $gold( $a['hearts5'] ) ); ?></td><td><?php echo esc_html( $gold( $a['processed5'] ) ); ?></td><td><?php echo esc_html( $num( $raw_pay( $a ) ) ); ?> days</td></tr>
		<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>The Cow earns <?php echo esc_html( $num( $cow['hearts5'] / $chicken['hearts5'] ) ); ?> times what a Chicken does at full hearts, at <?php echo esc_html( $num( $cow['price'] / $chicken['price'] ) ); ?> times the price. Even at zero hearts a cow brings in <?php echo esc_html( $gold( $cow['hearts0'] ) ); ?> a day, more than twice a chicken at that stage. Goats and Sheep need a bigger building and a bigger price for a lower income than the Cow, so they are not first purchases. The Pig is the outlier: it pays back fastest of the expensive animals because of truffles, but only on dry days outside winter and only from a Deluxe Barn. <a href="<?php echo esc_url( home_url( '/animals/are-pigs-worth-it/' ) ); ?>">Are pigs worth it?</a> has the details.</p>

<h2>Friendship matters more than price</h2>
<p>The three hearts columns show how income grows as an animal gets fond of you. A Cow goes from <?php echo esc_html( $gold( $cow['hearts0'] ) ); ?> a day at no hearts to <?php echo esc_html( $gold( $cow['hearts5'] ) ); ?> at five, which is <?php echo esc_html( $num( $cow['hearts5'] / $cow['hearts0'] ) ); ?> times as much. A Chicken goes from <?php echo esc_html( $gold( $chicken['hearts0'] ) ); ?> to <?php echo esc_html( $gold( $chicken['hearts5'] ) ); ?>, about <?php echo esc_html( $num( $chicken['hearts5'] / $chicken['hearts0'] ) ); ?> times. The reason is quality: more affection means more silver, gold and iridium products, and a better chance of Large eggs and milk. Petting every animal daily and keeping them fed are the cheapest ways to raise income, and they cost nothing.</p>
<p>So the payback numbers above are best-case. In the first couple of weeks an animal earns closer to its zero-heart figure, and the choice between buildings is closer than the full-heart table suggests: a Chicken at no hearts earns <?php echo esc_html( $gold( $chicken['hearts0'] ) ); ?> a day against <?php echo esc_html( $gold( $cow['hearts0'] ) ); ?> for a Cow. Check your own mix in the <a href="<?php echo esc_url( $tool_url( 'animal-profit-calculator' ) ); ?>">Animal Profit Calculator</a>, which lets you set hearts, mood and professions.</p>

<h2>Income per 1,000g spent</h2>
<p>Another way to compare is to ask what each animal earns for every 1,000g you spend on it. This ignores the building, but it shows which purchase does the most for a small budget:</p>
<?php
$all_animals = array_merge( $g['buildings'][0]['animals'], $g['buildings'][1]['animals'] );
usort(
	$all_animals,
	function ( $a, $b ) {
		return ( $b['hearts5'] / $b['price'] ) <=> ( $a['hearts5'] / $a['price'] );
	}
);
?>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Gold per day for every 1,000g spent on the animal</caption>
	<thead><tr><th scope="col">Animal</th><th scope="col">Price</th><th scope="col">At 0 hearts</th><th scope="col">At 5 hearts</th><th scope="col">At 5 hearts, artisan goods</th></tr></thead>
	<tbody>
		<?php foreach ( $all_animals as $a ) : ?>
		<tr><th scope="row"><?php echo esc_html( $a['name'] ); ?></th><td><?php echo esc_html( $gold( $a['price'] ) ); ?></td><td><?php echo esc_html( $num( $a['hearts0'] * 1000 / $a['price'] ) ); ?></td><td><?php echo esc_html( $num( $a['hearts5'] * 1000 / $a['price'] ) ); ?></td><td><?php echo esc_html( $num( $a['processed5'] * 1000 / $a['price'] ) ); ?></td></tr>
		<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>Selling raw, the Cow beats the Chicken on this measure at every friendship level: <?php echo esc_html( $num( $cow['hearts0'] * 1000 / $cow['price'] ) ); ?> against <?php echo esc_html( $num( $chicken['hearts0'] * 1000 / $chicken['price'] ) ); ?> a day per 1,000g at zero hearts, and <?php echo esc_html( $num( $cow['hearts5'] * 1000 / $cow['price'] ) ); ?> against <?php echo esc_html( $num( $chicken['hearts5'] * 1000 / $chicken['price'] ) ); ?> at five. The Chicken is attractive only because it is cheap. If you have 1,500g, a cow is a better use of it than one or two chickens, as long as you have a barn. The Rabbit, Sheep and Goat are the worst value for money. Once the goods are processed with Artisan the order changes: the Chicken leads at <?php echo esc_html( $num( $chicken['processed5'] * 1000 / $chicken['price'] ) ); ?> a day per 1,000g, ahead of the Cow at <?php echo esc_html( $num( $cow['processed5'] * 1000 / $cow['price'] ) ); ?>, because mayonnaise lifts the Chicken's income so much. So buy the Chicken first if you will process, and the Cow first if you will sell raw.</p>

<h2>How many machines does each animal keep busy?</h2>
<p>If you plan to process products, this is how much machine time one animal at full friendship uses. A number below one means a machine can serve several animals:</p>
<ul>
	<?php foreach ( $all_animals as $a ) : ?>
		<?php if ( ! empty( $a['machines'] ) ) : ?>
	<li><strong><?php echo esc_html( $a['name'] ); ?>:</strong>
			<?php
			echo esc_html(
				implode(
					', ',
					array_map(
						function ( $m ) use ( $num ) {
							return rtrim( rtrim( number_format( $m['per_animal'], 2 ), '0' ), '.' ) . ' ' . $m['name'];
						},
						$a['machines']
					)
				)
			);
			?>
	.</li>
		<?php endif; ?>
	<?php endforeach; ?>
</ul>
<p>One Mayonnaise Machine can look after about <?php echo esc_html( $num( 1 / max( 0.01, $chicken['machines'][0]['per_animal'] ) ) ); ?> chickens, which is why a coop of chickens needs only a few machines. A Cheese Press serves about as many cows or goats. The Pig is the exception, because truffle oil is slow and one pig keeps about two thirds of an Oil Maker busy. Planning the machines before the animals avoids eggs and milk piling up in chests.</p>

<h2>Animals you hatch yourself</h2>
<p>Four animals can't be bought. You hatch them from eggs, and the wiki says each has no other source:</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Hatched animals at five hearts</caption>
	<thead><tr><th scope="col">Animal</th><th scope="col">Needs</th><th scope="col">Raw gold per day</th><th scope="col">With artisan goods</th></tr></thead>
	<tbody>
		<?php foreach ( $g['egg_animals'] as $e ) : ?>
		<tr><th scope="row"><?php echo esc_html( $e['name'] ); ?></th><td><?php echo esc_html( $e['building_name'] ); ?></td><td><?php echo esc_html( $gold( $e['hearts5'] ) ); ?></td><td><?php echo esc_html( $gold( $e['processed5'] ) ); ?></td></tr>
		<?php endforeach; ?>
	</tbody>
</table>
</div>
<p>The Golden Chicken is the standout, earning <?php echo esc_html( $gold( $eggs['golden-chicken']['hearts5'] ) ); ?> a day raw, five times a regular chicken. You get it by hatching a Golden Egg in an Incubator, and it needs a Big Coop. The Ostrich is the other one worth a look when its goods are processed (<?php echo esc_html( $gold( $eggs['ostrich']['processed5'] ) ); ?> a day), while the Void Chicken and Dinosaur earn little. None of them is a reason to pick a building.</p>

<h2>A simple order to follow</h2>
<ol>
	<li><strong>Under about 1,500g:</strong> a Chicken in a Coop. It is the cheapest animal, and at full hearts it pays itself back in under a week.</li>
	<li><strong>Once you can afford a Barn and <?php echo esc_html( $gold( $cow['price'] ) ); ?>:</strong> add a Cow. Per day it out-earns a Chicken from the start, and it too pays itself back in under a week of full-heart production.</li>
	<li><strong>Build up friendship before buying more.</strong> Every animal's income climbs steeply from zero to five hearts, so petted animals beat extra animals.</li>
	<li><strong>Machines before more animals.</strong> Mayonnaise and cheese machines raise income per animal by a lot (a Chicken from <?php echo esc_html( $gold( $chicken['hearts5'] ) ); ?> to <?php echo esc_html( $gold( $chicken['processed5'] ) ); ?>), which can add more than another animal at low hearts would.</li>
	<li><strong>Save for the Deluxe Barn and a Pig</strong> if you have the Artisan profession and an Oil Maker: <?php echo esc_html( $gold( $pig['processed5'] ) ); ?> a day at full hearts is far above everything else.</li>
</ol>

<h2>What these numbers leave out</h2>
<ul>
	<li><strong>Building prices.</strong> Our data doesn't include what Robin charges, so the "pays back" columns count only the animal.</li>
	<li><strong>Hay.</strong> Feeding costs are not included. Animals can eat grass outside instead.</li>
	<li><strong>Time to full hearts.</strong> The full-heart figures take weeks to reach.</li>
	<li><strong>Bundles.</strong> White and brown eggs, and large versions, matter for some Community Center bundles. See <a href="<?php echo esc_url( $tool_url( 'bundle-tracker' ) ); ?>">the Bundle Tracker</a>.</li>
</ul>

<h2>Related</h2>
<p>For every animal ranked in one table see <a href="<?php echo esc_url( home_url( '/farm-animals/' ) ); ?>">all farm animals</a>, and for the other way to earn from a building, <a href="<?php echo esc_url( home_url( '/fishing/best-fish-for-fish-ponds/' ) ); ?>">Best fish for fish ponds</a>.</p>

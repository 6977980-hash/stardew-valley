<?php
/**
 * Homepage: question-first navigation into the tools.
 *
 * Tools are listed as "Coming soon" until their phase ships; they become links then.
 *
 * @package Stardew_Tools_Theme
 */

defined( 'ABSPATH' ) || exit;

get_header();

$questions = array(
	array( 'Make money', 'Find the most profitable crops, animals and artisan goods for your farm.', 'coin' ),
	array( 'What should I plant?', 'Get a crop pick for your season, days left, budget and goal.', 'sprout' ),
	array( 'Keg or Preserves Jar?', 'See which machine earns more for your crops and how many machines you have.', 'jar' ),
	array( 'Plan my greenhouse', 'Lay out crops, fruit trees and sprinklers and see the profit.', 'house' ),
	array( 'Find a fish', 'See what you can catch by season, weather, time and location.', 'fish' ),
	array( 'Find a gift', 'Look up loved and liked gifts for every villager.', 'gift' ),
);

$categories = array(
	'Decision tools' => array( 'Crop Decision Engine', 'Keg vs Preserves Jar', 'Greenhouse Planner' ),
	'Calculators'    => array( 'Crop Profit Calculator', 'Fish Pond Calculator', 'Animal Profit Calculator', 'Crafting Calculator', 'Farming & Fishing XP' ),
	'Finders'        => array( 'Fish Finder', 'Gift Finder' ),
	'Trackers'       => array( 'Bundle Tracker' ),
);

$icons = array(
	'coin'   => '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.6c0 2.4-5 1.2-5 3.6 0 1 1 1.8 2.5 1.8s2.5-.6 2.5-1.5"/>',
	'sprout' => '<path d="M12 20v-8"/><path d="M12 12c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M12 14c0-3-2-5-6-5 0 3 2 5 6 5z"/>',
	'jar'    => '<path d="M8 4h8M9 4v3l-2 2v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9l-2-2V4"/><path d="M7 13h10"/>',
	'house'  => '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
	'fish'   => '<path d="M3 12c3-5 9-6 13-3l4-3v12l-4-3c-4 3-10 2-13-3z"/><circle cx="8" cy="11" r="1"/>',
	'gift'   => '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M3 9h18M12 9v11M12 9c-2-4-6-4-6-1s6 1 6 1zm0 0c2-4 6-4 6-1s-6 1-6 1z"/>',
);
?>
<section class="hero">
	<div class="container">
		<p class="hero__eyebrow"><?php echo esc_html( st_theme_brand( 'brand_name' ) ); ?></p>
		<h1 class="hero__title"><?php echo esc_html( st_theme_brand( 'primary_h1', get_bloginfo( 'name' ) ) ); ?></h1>
		<p class="hero__tagline"><?php echo esc_html( st_theme_brand( 'tagline' ) ); ?></p>
		<p class="hero__lead"><?php echo esc_html( st_theme_brand( 'short_desc' ) ); ?></p>
	</div>
</section>

<section class="section" aria-labelledby="ask-heading">
	<div class="container">
		<h2 id="ask-heading">What do you want to do?</h2>
		<ul class="card-grid" role="list">
			<?php foreach ( $questions as $q ) : ?>
			<li class="card card--soon">
				<svg class="card__icon" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><?php echo $icons[ $q[2] ]; // phpcs:ignore WordPress.Security.EscapeOutput -- static SVG. ?></svg>
				<h3 class="card__title"><?php echo esc_html( $q[0] ); ?></h3>
				<p class="card__text"><?php echo esc_html( $q[1] ); ?></p>
				<span class="badge">Coming soon</span>
			</li>
			<?php endforeach; ?>
		</ul>
	</div>
</section>

<div class="container"><?php st_theme_ad( 'home-mid' ); ?></div>

<section class="section section--alt" aria-labelledby="how-heading">
	<div class="container">
		<h2 id="how-heading">How Stardew Tools works</h2>
		<ol class="steps">
			<li><strong>Verified data.</strong> Values checked for Stardew Valley <?php echo esc_html( st_theme_brand( 'game_version' ) ); ?>, with sources.</li>
			<li><strong>Your situation.</strong> Season, days left, budget, professions and machines.</li>
			<li><strong>A clear answer.</strong> The best option for you, and the runner-up.</li>
			<li><strong>The why.</strong> "Explain the Math" shows every number behind the answer.</li>
		</ol>
	</div>
</section>

<section class="section" aria-labelledby="tools-heading">
	<div class="container">
		<h2 id="tools-heading">Tools on the way</h2>
		<div class="category-grid">
			<?php foreach ( $categories as $name => $tools ) : ?>
			<div class="category">
				<h3><?php echo esc_html( $name ); ?></h3>
				<ul>
					<?php foreach ( $tools as $tool ) : ?>
					<li><?php echo esc_html( $tool ); ?></li>
					<?php endforeach; ?>
				</ul>
			</div>
			<?php endforeach; ?>
		</div>
		<p class="note">Free, no account needed. Want a tool we do not have yet? <a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>">Tell us</a>.</p>
	</div>
</section>
<?php
get_footer();

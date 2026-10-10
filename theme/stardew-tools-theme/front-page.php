<?php
/**
 * Homepage: question-first navigation into the tools.
 *
 * Tools link to their pages once live; the rest are listed as "Coming soon".
 *
 * @package Stardew_Tools_Theme
 */

defined( 'ABSPATH' ) || exit;

get_header();

// Live tools come from the plugin (question, blurb, icon, URL); the rest are still on the way.
$live = function_exists( 'stardew_tools_live_tools' ) ? stardew_tools_live_tools() : array();

// Pixel icon per tool; anything not listed falls back to the plugin's icon name.
$tool_icons = array(
	'crop-profit-calculator'     => 'coin',
	'ancient-fruit-vs-starfruit' => 'star',
	'greenhouse-planner'         => 'greenhouse',
	'animal-profit-calculator'   => 'pig',
	'xp-calculator'              => 'scroll',
);
$questions  = array();
foreach ( $live as $t ) {
	if ( ! empty( $t['question'] ) ) {
		$icon        = isset( $tool_icons[ $t['id'] ] ) ? $tool_icons[ $t['id'] ] : $t['icon'];
		$questions[] = array( $t['question'], $t['blurb'], $icon, $t['url'] );
	}
}
$soon = array(
	array( 'Find a fish', 'See what you can catch by season, weather, time and location.', 'fish', '' ),
);
$questions = array_merge( $questions, array_slice( $soon, 0, max( 0, 6 - count( $questions ) ) ) );

$live_names = wp_list_pluck( $live, 'short' );
$categories = array(
	'Decision tools' => array( 'What to Plant Today', 'Keg vs Preserves Jar', 'Ancient Fruit vs Starfruit', 'Greenhouse Planner' ),
	'Calculators'    => array( 'Crop Profit Calculator', 'Fish Pond Calculator', 'Animal Profit Calculator', 'Crafting Calculator', 'XP Calculator' ),
	'Best crops'     => array( 'Best Spring Crops', 'Best Summer Crops', 'Best Fall Crops', 'Best Greenhouse Crops' ),
	'Finders'        => array( 'Fish Finder', 'Gift Finder' ),
	'Trackers'       => array( 'Bundle Tracker' ),
);

// Seasons strip: each season links to its Best Crops page once live (winter grows in the greenhouse).
$tool_url  = function ( $short ) use ( $live, $live_names ) {
	$hit = array_search( $short, $live_names, true );
	return false !== $hit ? $live[ $hit ]['url'] : '';
};
$seasons   = array(
	array( 'spring', 'Spring', 'Best Spring Crops' ),
	array( 'summer', 'Summer', 'Best Summer Crops' ),
	array( 'fall', 'Fall', 'Best Fall Crops' ),
	array( 'winter', 'Greenhouse', 'Best Greenhouse Crops' ),
);
$plant_url = $tool_url( 'What to Plant Today' );
?>
<section class="hero" aria-labelledby="hero-title">
	<img class="hero__scene" src="<?php echo esc_url( get_template_directory_uri() . '/assets/img/hero-farm.svg' ); ?>" width="1440" height="600" alt="" fetchpriority="high">
	<div class="container hero__inner">
		<div class="hero__panel panel">
			<p class="hero__eyebrow"><?php st_theme_pixel_icon( 'sprout', 20 ); ?><span>Free Stardew Valley planner</span></p>
			<h1 class="hero__title" id="hero-title"><?php echo esc_html( st_theme_brand( 'primary_h1', get_bloginfo( 'name' ) ) ); ?></h1>
			<p class="hero__tagline"><?php echo esc_html( st_theme_brand( 'tagline' ) ); ?></p>
			<p class="hero__lead"><?php echo esc_html( st_theme_brand( 'short_desc' ) ); ?></p>
			<div class="hero__actions">
				<?php if ( $plant_url ) : ?>
				<a class="btn btn--primary" href="<?php echo esc_url( $plant_url ); ?>">What should I plant today?</a>
				<?php endif; ?>
				<a class="btn btn--wood" href="#tools-heading">Browse all tools</a>
			</div>
			<ul class="hero__facts" role="list">
				<li>Verified for <?php echo esc_html( st_theme_brand( 'game_version' ) ); ?></li>
				<li><?php echo (int) count( $live ); ?> free tools</li>
				<li>No sign-up</li>
			</ul>
		</div>
	</div>
</section>

<nav class="season-strip" aria-label="Best crops by season">
	<div class="container season-strip__inner">
		<span class="season-strip__label">Best crops for</span>
		<ul role="list">
			<?php foreach ( $seasons as $s ) : ?>
				<?php $url = $tool_url( $s[2] ); ?>
			<li>
				<?php if ( $url ) : ?>
				<a class="season season--<?php echo esc_attr( $s[0] ); ?>" href="<?php echo esc_url( $url ); ?>"><span class="season__dot" aria-hidden="true"></span><?php echo esc_html( $s[1] ); ?></a>
				<?php else : ?>
				<span class="season season--<?php echo esc_attr( $s[0] ); ?>"><span class="season__dot" aria-hidden="true"></span><?php echo esc_html( $s[1] ); ?></span>
				<?php endif; ?>
			</li>
			<?php endforeach; ?>
		</ul>
	</div>
</nav>

<section class="section" aria-labelledby="ask-heading">
	<div class="container">
		<p class="section__kicker">Ask a question</p>
		<h2 id="ask-heading">What do you want to do?</h2>
		<ul class="card-grid" role="list">
			<?php foreach ( $questions as $q ) : ?>
			<li class="card<?php echo $q[3] ? ' card--live' : ' card--soon'; ?>">
				<span class="slot card__slot"><?php st_theme_pixel_icon( $q[2], 32 ); ?></span>
				<h3 class="card__title">
					<?php if ( $q[3] ) : ?>
					<a class="card__link" href="<?php echo esc_url( $q[3] ); ?>"><?php echo esc_html( $q[0] ); ?></a>
					<?php else : ?>
						<?php echo esc_html( $q[0] ); ?>
					<?php endif; ?>
				</h3>
				<p class="card__text"><?php echo esc_html( $q[1] ); ?></p>
				<?php if ( ! $q[3] ) : ?>
				<span class="badge">Coming soon</span>
				<?php endif; ?>
			</li>
			<?php endforeach; ?>
		</ul>
	</div>
</section>

<?php if ( class_exists( 'Stardew_Tools\\Guides' ) ) : ?>
<section class="section" aria-labelledby="guides-heading">
	<div class="container">
		<p class="section__kicker">Read up</p>
		<h2 id="guides-heading">Guides by topic</h2>
		<ul class="card-grid" role="list">
			<?php foreach ( Stardew_Tools\Guides::hubs() as $hub_id => $hub ) : ?>
			<li class="card card--live card--hub">
				<span class="slot card__slot"><?php st_theme_pixel_icon( st_theme_hub_icon( $hub_id ), 32 ); ?></span>
				<h3 class="card__title"><a class="card__link" href="<?php echo esc_url( Stardew_Tools\Guides::hub_url( $hub_id ) ); ?>"><?php echo esc_html( $hub['short'] ); ?></a></h3>
				<p class="card__text"><?php echo esc_html( $hub['blurb'] ); ?></p>
			</li>
			<?php endforeach; ?>
		</ul>
	</div>
</section>
<?php endif; ?>

<div class="container"><?php st_theme_ad( 'home-mid' ); ?></div>

<section class="section section--field" aria-labelledby="how-heading">
	<div class="container">
		<p class="section__kicker">No guesswork</p>
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
		<p class="section__kicker">Toolbox</p>
		<h2 id="tools-heading">All tools</h2>
		<div class="category-grid">
			<?php foreach ( $categories as $name => $tools ) : ?>
			<div class="category">
				<h3><?php echo esc_html( $name ); ?></h3>
				<ul>
					<?php foreach ( $tools as $tool ) : ?>
						<?php $hit = array_search( $tool, $live_names, true ); ?>
					<li>
						<?php if ( false !== $hit ) : ?>
						<a href="<?php echo esc_url( $live[ $hit ]['url'] ); ?>"><?php echo esc_html( $tool ); ?></a>
						<?php else : ?>
							<?php echo esc_html( $tool ); ?> <span class="soon">(soon)</span>
						<?php endif; ?>
					</li>
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

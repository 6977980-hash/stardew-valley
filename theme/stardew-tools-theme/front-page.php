<?php
/**
 * Homepage: question-first navigation into the tools.
 *
 * Only live tools are shown; nothing is listed as "coming soon".
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
// The six questions most visitors ask, in this order; every other tool is in the toolbox below.
$home_order = array( 'what-to-plant', 'crop-profit-calculator', 'keg-vs-preserves-jar', 'greenhouse-planner', 'fish-pond-calculator', 'animal-profit-calculator' );
$by_id      = array();
foreach ( $live as $t ) {
	$by_id[ $t['id'] ] = $t;
}
foreach ( $home_order as $tid ) {
	$t = isset( $by_id[ $tid ] ) ? $by_id[ $tid ] : null;
	if ( $t && ! empty( $t['question'] ) ) {
		$icon        = isset( $tool_icons[ $t['id'] ] ) ? $tool_icons[ $t['id'] ] : $t['icon'];
		$questions[] = array( $t['question'], $t['blurb'], $icon, $t['url'] );
	}
}
$total_tools = count( $live );

$live_names = wp_list_pluck( $live, 'short' );
$categories = array();
foreach ( class_exists( 'Stardew_Tools\\Tools' ) ? Stardew_Tools\Tools::categories() : array() as $heading => $ids ) {
	foreach ( $ids as $cid ) {
		if ( isset( $by_id[ $cid ] ) ) {
			$categories[ $heading ][] = $by_id[ $cid ]['short'];
		}
	}
}

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
			<?php if ( $plant_url ) : ?>
			<form class="quick-plan" action="<?php echo esc_url( $plant_url ); ?>" method="get" aria-labelledby="quick-plan-title">
				<p class="quick-plan__title" id="quick-plan-title">What should I plant today?</p>
				<div class="quick-plan__fields">
					<label>Season
						<select name="season">
							<option value="spring">Spring</option>
							<option value="summer">Summer</option>
							<option value="fall">Fall</option>
							<option value="greenhouse">Greenhouse</option>
						</select>
					</label>
					<label>Day
						<input type="number" name="today" min="1" max="28" value="1" inputmode="numeric">
					</label>
					<label>Gold
						<input type="number" name="budget" min="0" value="500" inputmode="numeric">
					</label>
				</div>
				<button class="btn btn--primary" type="submit">Show my best crop</button>
				<a class="quick-plan__all" href="#tools-heading">Browse all tools</a>
			</form>
			<?php else : ?>
			<div class="hero__actions"><a class="btn btn--wood" href="#tools-heading">Browse all tools</a></div>
			<?php endif; ?>
			<ul class="hero__facts" role="list">
				<li>Verified for <?php echo esc_html( st_theme_brand( 'game_version' ) ); ?></li>
				<li><?php echo (int) $total_tools; ?> free tools</li>
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
		<p class="section__kicker">Start here</p>
		<h2 id="ask-heading">What do you want to do?</h2>
		<?php $featured = array_slice( $questions, 0, 3 ); $more = array_slice( $questions, 3 ); ?>
		<ul class="card-grid card-grid--featured" role="list">
			<?php foreach ( $featured as $q ) : ?>
			<li class="card card--live card--featured">
				<span class="slot card__slot"><?php st_theme_pixel_icon( $q[2], 32 ); ?></span>
				<h3 class="card__title"><a class="card__link" href="<?php echo esc_url( $q[3] ); ?>"><?php echo esc_html( $q[0] ); ?></a></h3>
				<p class="card__text"><?php echo esc_html( $q[1] ); ?></p>
			</li>
			<?php endforeach; ?>
		</ul>
		<?php if ( $more ) : ?>
		<h3 class="section__sub">More questions</h3>
		<ul class="card-grid" role="list">
			<?php foreach ( $more as $q ) : ?>
			<li class="card card--live">
				<span class="slot card__slot"><?php st_theme_pixel_icon( $q[2], 32 ); ?></span>
				<h3 class="card__title"><a class="card__link" href="<?php echo esc_url( $q[3] ); ?>"><?php echo esc_html( $q[0] ); ?></a></h3>
				<p class="card__text"><?php echo esc_html( $q[1] ); ?></p>
			</li>
			<?php endforeach; ?>
		</ul>
		<?php endif; ?>
		<p class="section__more"><a href="<?php echo esc_url( home_url( '/tools/' ) ); ?>">See all <?php echo (int) $total_tools; ?> tools</a></p>
	</div>
</section>

<?php if ( class_exists( 'Stardew_Tools\\Guides' ) ) : ?>
<section class="section" aria-labelledby="guides-heading">
	<div class="container">
		<p class="section__kicker">Read up</p>
		<h2 id="guides-heading">Guides by topic</h2>
		<?php
		$newest = array();
		$all_guides = Stardew_Tools\Guides::guides();
		$latest     = max( array_column( $all_guides, 'published' ) );
		foreach ( array_slice( array_filter( $all_guides, function ( $g ) use ( $latest ) {
			return $g['published'] === $latest;
		} ), 0, 3, true ) as $gid => $guide ) {
			$gurl = Stardew_Tools\Guides::guide_url( $gid );
			if ( $gurl ) {
				$newest[] = '<a href="' . esc_url( $gurl ) . '">' . esc_html( $guide['short'] ) . '</a>';
			}
		}
		?>
		<?php if ( $newest ) : ?>
		<p class="newest"><span class="badge">New</span> <?php echo implode( ' · ', $newest ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped above. ?></p>
		<?php endif; ?>
		<ul class="card-grid" role="list">
			<?php foreach ( Stardew_Tools\Guides::hubs() as $hub_id => $hub ) : ?>
			<li class="card card--live card--hub">
				<span class="slot card__slot"><?php st_theme_pixel_icon( st_theme_hub_icon( $hub_id ), 32 ); ?></span>
				<h3 class="card__title"><a class="card__link" href="<?php echo esc_url( Stardew_Tools\Guides::hub_url( $hub_id ) ); ?>"><?php echo esc_html( $hub['short'] ); ?></a></h3>
				<p class="card__text"><?php echo esc_html( $hub['blurb'] ); ?></p>
			</li>
			<?php endforeach; ?>
		</ul>
		<p class="section__more"><a href="<?php echo esc_url( home_url( '/guides/' ) ); ?>">See all guides</a></p>
	</div>
</section>
<?php endif; ?>

<?php if ( class_exists( 'Stardew_Tools\\Entities' ) ) : ?>
<section class="section" aria-labelledby="ref-heading">
	<div class="container">
		<p class="section__kicker">New</p>
		<h2 id="ref-heading">Reference tables</h2>
		<ul class="card-grid" role="list">
			<?php foreach ( Stardew_Tools\Entities::types() as $type => $t ) : ?>
				<?php $ref_url = Stardew_Tools\Entities::url( $type, '' ); ?>
				<?php if ( $ref_url ) : ?>
			<li class="card card--live">
				<h3 class="card__title"><a class="card__link" href="<?php echo esc_url( $ref_url ); ?>"><?php echo esc_html( $t['short'] ); ?></a> <span class="badge">New</span></h3>
				<p class="card__text"><?php echo esc_html( $t['blurb'] ); ?></p>
			</li>
				<?php endif; ?>
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
						<?php if ( false !== $hit ) : ?>
					<li><a href="<?php echo esc_url( $live[ $hit ]['url'] ); ?>"><?php echo esc_html( $tool ); ?></a></li>
						<?php endif; ?>
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

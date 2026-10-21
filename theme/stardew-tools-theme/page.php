<?php
/**
 * Single page. Guides and topic hubs get an article header with their topic, reading time and
 * an "On this page" list built from the rendered headings.
 *
 * @package Stardew_Tools_Theme
 */

defined( 'ABSPATH' ) || exit;

get_header();
while ( have_posts() ) :
	the_post();
	$context = st_theme_guide_context();

	if ( ! $context ) :
		?>
	<article <?php post_class( 'container content' ); ?>>
		<?php st_theme_breadcrumbs(); ?>
		<h1 class="entry-title"><?php the_title(); ?></h1>
		<div class="entry-content">
			<?php the_content(); ?>
		</div>
		<?php st_theme_ad( 'below-content' ); ?>
	</article>
		<?php
		continue;
	endif;

	list( $kind, $id ) = $context;
	$hubs              = Stardew_Tools\Guides::hubs();
	$hub_id            = 'hub' === $kind ? $id : Stardew_Tools\Guides::guides()[ $id ]['hub'];
	$hub               = $hubs[ $hub_id ];

	ob_start();
	the_content();
	list( $html, $toc ) = st_theme_toc( ob_get_clean() );
	$minutes            = st_theme_reading_minutes( $html );
	$has_toc            = count( $toc ) > 2;
	// With a TOC, the byline and short answer sit above it on phones (see .article-intro in main.css).
	list( $intro, $html ) = $has_toc ? st_theme_split_intro( $html ) : array( '', $html );
	?>
	<article <?php post_class( 'article article--' . $kind ); ?>>
		<header class="article-hero">
			<div class="container article-hero__inner">
				<?php st_theme_breadcrumbs(); ?>
				<div class="article-hero__row">
					<span class="slot slot--lg article-hero__slot"><?php st_theme_pixel_icon( st_theme_hub_icon( $hub_id ), 48 ); ?></span>
					<div>
						<p class="article-hero__kicker">
							<?php if ( 'guide' === $kind ) : ?>
							<a class="chip" href="<?php echo esc_url( Stardew_Tools\Guides::hub_url( $hub_id ) ); ?>"><?php echo esc_html( $hub['short'] ); ?></a>
							<span class="article-hero__time"><?php echo esc_html( $minutes ); ?> min read</span>
							<?php else : ?>
							<span class="chip">Topic hub</span>
							<?php endif; ?>
						</p>
						<h1 class="entry-title"><?php the_title(); ?></h1>
					</div>
				</div>
			</div>
		</header>
		<div class="container article-layout<?php echo $has_toc ? ' has-toc' : ''; ?><?php echo '' !== $intro ? ' has-intro' : ''; ?>">
			<?php if ( '' !== $intro ) : ?>
			<div class="entry-content article-intro">
				<?php echo $intro; // phpcs:ignore WordPress.Security.EscapeOutput -- the_content() output. ?>
			</div>
			<?php endif; ?>
			<?php if ( $has_toc ) : ?>
			<nav class="article-toc" aria-label="On this page">
				<details class="toc panel">
					<summary class="toc__title">On this page</summary>
					<ol class="toc__list">
						<?php foreach ( $toc as $item ) : ?>
						<li><a href="#<?php echo esc_attr( $item[0] ); ?>"><?php echo esc_html( $item[1] ); ?></a></li>
						<?php endforeach; ?>
					</ol>
				</details>
				<?php // Sent closed, so phones never shift. Wide screens open it before first paint; there it has its own column. ?>
				<script>if(window.matchMedia('(min-width: 1040px)').matches)document.currentScript.previousElementSibling.open=true;</script>
			</nav>
			<?php endif; ?>
			<div class="entry-content">
				<?php echo $html; // phpcs:ignore WordPress.Security.EscapeOutput -- the_content() output, only heading ids added. ?>
				<?php st_theme_ad( 'below-content' ); ?>
			</div>
		</div>
	</article>
	<?php
endwhile;
get_footer();

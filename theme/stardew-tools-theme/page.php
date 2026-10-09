<?php
/**
 * Single page.
 *
 * @package Stardew_Tools_Theme
 */

defined( 'ABSPATH' ) || exit;

get_header();
while ( have_posts() ) :
	the_post();
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
endwhile;
get_footer();

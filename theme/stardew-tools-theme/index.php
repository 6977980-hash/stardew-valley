<?php
/**
 * Fallback template for posts and archives.
 *
 * @package Stardew_Tools_Theme
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<div class="container content">
	<?php if ( is_singular() ) : ?>
		<?php
		while ( have_posts() ) :
			the_post();
			st_theme_breadcrumbs();
			?>
			<article <?php post_class(); ?>>
				<h1 class="entry-title"><?php the_title(); ?></h1>
				<p class="entry-meta"><time datetime="<?php echo esc_attr( get_the_date( 'c' ) ); ?>"><?php echo esc_html( get_the_date() ); ?></time></p>
				<div class="entry-content"><?php the_content(); ?></div>
				<?php st_theme_ad( 'below-content' ); ?>
			</article>
		<?php endwhile; ?>
	<?php else : ?>
		<h1 class="entry-title"><?php echo is_home() ? 'Guides' : esc_html( wp_strip_all_tags( get_the_archive_title() ) ); ?></h1>
		<?php if ( have_posts() ) : ?>
			<ul class="post-list">
			<?php
			while ( have_posts() ) :
				the_post();
				?>
				<li><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></li>
			<?php endwhile; ?>
			</ul>
			<?php the_posts_pagination(); ?>
		<?php else : ?>
			<p>Nothing here yet.</p>
		<?php endif; ?>
	<?php endif; ?>
</div>
<?php
get_footer();

<?php
/**
 * Site footer.
 *
 * @package Stardew_Tools_Theme
 */

defined( 'ABSPATH' ) || exit;
?>
</main>
<div class="container"><?php st_theme_ad( 'before-footer' ); ?></div>
<footer class="site-footer">
	<div class="container">
		<div class="site-footer__top">
			<a class="brand brand--footer" href="<?php echo esc_url( home_url( '/' ) ); ?>">
				<?php st_theme_mark( 28 ); ?>
				<span class="brand__name"><?php echo esc_html( st_theme_brand( 'brand_name', get_bloginfo( 'name' ) ) ); ?></span>
			</a>
			<p class="site-footer__tagline"><?php echo esc_html( st_theme_brand( 'tagline' ) ); ?></p>
		</div>
		<nav class="footer-nav" aria-label="Footer">
			<?php
			wp_nav_menu(
				array(
					'theme_location' => 'footer',
					'container'      => false,
					'fallback_cb'    => 'st_theme_footer_fallback',
					'depth'          => 1,
				)
			);
			?>
		</nav>
		<p class="site-footer__notice"><?php echo esc_html( st_theme_brand( 'disclaimer' ) ); ?></p>
		<p class="site-footer__copy">&copy; <?php echo esc_html( gmdate( 'Y' ) ); ?> <?php echo esc_html( st_theme_brand( 'brand_name', get_bloginfo( 'name' ) ) ); ?> · <a href="mailto:<?php echo esc_attr( st_theme_brand( 'contact_email' ) ); ?>"><?php echo esc_html( st_theme_brand( 'contact_email' ) ); ?></a></p>
	</div>
</footer>
<?php wp_footer(); ?>
</body>
</html>

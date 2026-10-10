<?php
/**
 * Site header.
 *
 * @package Stardew_Tools_Theme
 */

defined( 'ABSPATH' ) || exit;
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
	<div class="container site-header__inner">
		<a class="brand" href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home">
			<?php st_theme_mark( 36 ); ?>
			<span class="brand__name"><?php echo esc_html( st_theme_brand( 'brand_name', get_bloginfo( 'name' ) ) ); ?></span>
		</a>
		<?php do_action( 'stardew_tools_header_search' ); ?>
		<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav">
			<span class="nav-toggle__bars" aria-hidden="true"></span>
			<span class="nav-toggle__label">Menu</span>
		</button>
		<nav id="primary-nav" class="primary-nav" aria-label="Main">
			<?php
			wp_nav_menu(
				array(
					'theme_location' => 'primary',
					'container'      => false,
					'fallback_cb'    => 'st_theme_primary_fallback',
					'depth'          => 1,
				)
			);
			?>
		</nav>
	</div>
</header>
<main id="main" class="site-main" tabindex="-1">

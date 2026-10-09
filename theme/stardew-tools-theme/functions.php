<?php
/**
 * Stardew Tools Theme setup. Presentation only; brand values and business logic come from
 * the Stardew Tools plugin.
 *
 * @package Stardew_Tools_Theme
 */

defined( 'ABSPATH' ) || exit;

define( 'STARDEW_THEME_VERSION', '0.2.0' );

/**
 * Brand value with a fallback, so the theme never fatals if the plugin is missing.
 */
function st_theme_brand( $key, $fallback = '' ) {
	if ( function_exists( 'stardew_tools_brand' ) ) {
		$value = stardew_tools_brand( $key );
		if ( null !== $value && '' !== $value ) {
			return $value;
		}
	}
	return $fallback;
}

/** Echo an ad slot through the plugin (prints nothing while ads are off). */
function st_theme_ad( $placement ) {
	if ( function_exists( 'stardew_tools_ad' ) ) {
		stardew_tools_ad( $placement );
	}
}

add_action(
	'after_setup_theme',
	function () {
		add_theme_support( 'title-tag' );
		add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script', 'navigation-widgets' ) );
		add_theme_support( 'responsive-embeds' );
		add_theme_support( 'automatic-feed-links' );
		register_nav_menus(
			array(
				'primary' => 'Primary menu',
				'footer'  => 'Footer menu',
			)
		);
	}
);

add_action(
	'wp_enqueue_scripts',
	function () {
		$dir = get_template_directory();
		$uri = get_template_directory_uri();
		wp_enqueue_style( 'stardew-tools-theme', $uri . '/assets/css/main.css', array(), STARDEW_THEME_VERSION . '.' . filemtime( $dir . '/assets/css/main.css' ) );
		wp_enqueue_script( 'stardew-tools-nav', $uri . '/assets/js/nav.js', array(), STARDEW_THEME_VERSION . '.' . filemtime( $dir . '/assets/js/nav.js' ), array( 'strategy' => 'defer', 'in_footer' => true ) );

		if ( ! st_theme_uses_blocks() ) {
			wp_dequeue_style( 'wp-block-library' );
			wp_dequeue_style( 'classic-theme-styles' );
		}
	},
	20
);

/** Block styles are only needed on content that contains blocks. */
function st_theme_uses_blocks() {
	return is_singular() && has_blocks( get_queried_object_id() );
}

// Skip the ~10 KB global-styles block on pages without blocks.
add_action(
	'wp',
	function () {
		if ( ! st_theme_uses_blocks() ) {
			remove_action( 'wp_enqueue_scripts', 'wp_enqueue_global_styles' );
			remove_action( 'wp_footer', 'wp_enqueue_global_styles', 1 );
		}
	}
);

/** Fallback menus until the owner builds them in Appearance > Menus. */
function st_theme_fallback_menu( $slugs ) {
	echo '<ul class="menu">';
	foreach ( $slugs as $slug => $label ) {
		$url = '' === $slug ? home_url( '/' ) : home_url( '/' . $slug . '/' );
		if ( '' !== $slug && ! get_page_by_path( $slug ) ) {
			continue;
		}
		printf( '<li><a href="%s">%s</a></li>', esc_url( $url ), esc_html( $label ) );
	}
	echo '</ul>';
}

function st_theme_primary_fallback() {
	st_theme_fallback_menu(
		array(
			''            => 'Home',
			'methodology' => 'Methodology',
			'about'       => 'About',
			'contact'     => 'Contact',
		)
	);
}

function st_theme_footer_fallback() {
	st_theme_fallback_menu(
		array(
			'about'          => 'About',
			'methodology'    => 'Methodology',
			'changelog'      => 'Changelog',
			'contact'        => 'Contact',
			'privacy-policy' => 'Privacy Policy',
			'terms'          => 'Terms',
			'disclaimer'     => 'Disclaimer',
		)
	);
}

/** Visible breadcrumbs that match the BreadcrumbList schema printed by the plugin. */
function st_theme_breadcrumbs() {
	if ( is_front_page() || ! is_singular() || ! class_exists( 'Stardew_Tools\Seo' ) ) {
		return;
	}
	$trail = Stardew_Tools\Seo::breadcrumb_trail( get_queried_object_id() );
	$last  = count( $trail ) - 1;
	echo '<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>';
	foreach ( $trail as $i => $crumb ) {
		if ( $i === $last ) {
			printf( '<li><span aria-current="page">%s</span></li>', esc_html( $crumb['name'] ) );
		} else {
			printf( '<li><a href="%s">%s</a></li>', esc_url( $crumb['url'] ), esc_html( $crumb['name'] ) );
		}
	}
	echo '</ol></nav>';
}

/** Inline brand mark (same drawing as assets/brand/icon.svg in the plugin). */
function st_theme_mark( $size = 36 ) {
	printf(
		'<svg class="brand-mark" width="%1$d" height="%1$d" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect width="64" height="64" rx="14" fill="#2F6B34"/><rect x="12" y="38" width="10" height="14" rx="2.5" fill="#FBF7EC"/><rect x="27" y="30" width="10" height="22" rx="2.5" fill="#FBF7EC"/><rect x="42" y="22" width="10" height="30" rx="2.5" fill="#FBF7EC"/><path d="M47 22c0-5 1-9 5-12" fill="none" stroke="#E3A72F" stroke-width="3" stroke-linecap="round"/><path d="M51.5 11.5c4.5-1.5 7.5 0 8.5 2.5-3.5 2-7 1.5-8.5-2.5z" fill="#E3A72F"/><path d="M48.5 15c-3.5-3-7-3-9-1.5 2 3.5 5.5 4 9 1.5z" fill="#E3A72F"/></svg>',
		(int) $size
	);
}

/** Mark JS support before first paint so the mobile menu does not flash open. */
add_action(
	'wp_head',
	function () {
		echo "<script>document.documentElement.classList.add('js')</script>\n";
	},
	0
);

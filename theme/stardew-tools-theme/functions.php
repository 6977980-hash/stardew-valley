<?php
/**
 * Stardew Tools Theme setup. Presentation only; brand values and business logic come from
 * the Stardew Tools plugin.
 *
 * @package Stardew_Tools_Theme
 */

defined( 'ABSPATH' ) || exit;

define( 'STARDEW_THEME_VERSION', '0.8.1' );

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
			'tools'       => 'Tools',
			'guides'      => 'Guides',
			'methodology' => 'Methodology',
			'about'       => 'About',
			'contact'     => 'Contact',
		)
	);
}

function st_theme_footer_fallback() {
	st_theme_fallback_menu(
		array(
			'tools'          => 'Tools',
			'guides'         => 'Guides',
			'about'          => 'About',
			'methodology'    => 'Methodology',
			'data'           => 'Data',
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

/** Inline 16x16 pixel icon (see inc/pixel-icons.php). Prints nothing for an unknown name. */
function st_theme_pixel_icon( $name, $size = 32, $class = 'px-icon' ) {
	static $icons = null;
	if ( null === $icons ) {
		$icons = require __DIR__ . '/inc/pixel-icons.php';
	}
	if ( ! isset( $icons[ $name ] ) ) {
		return;
	}
	printf(
		'<svg class="%1$s" width="%2$d" height="%2$d" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true" focusable="false">%3$s</svg>',
		esc_attr( $class ),
		(int) $size,
		$icons[ $name ] // phpcs:ignore WordPress.Security.EscapeOutput -- static generated SVG.
	);
}

/** Pixel icon for each topic hub. */
function st_theme_hub_icon( $hub_id ) {
	$map = array(
		'crops-and-farming' => 'sprout',
		'artisan-goods'     => 'keg',
		'animals'           => 'pig',
		'fishing'           => 'fish',
		'greenhouse'        => 'greenhouse',
	);
	return isset( $map[ $hub_id ] ) ? $map[ $hub_id ] : 'scroll';
}

/** ['hub'|'guide', id] for a guide or hub page, or null. */
function st_theme_guide_context() {
	return class_exists( 'Stardew_Tools\Guides' ) ? Stardew_Tools\Guides::current() : null;
}

/**
 * Adds ids to the <h2>s of rendered article HTML and returns [html, toc] where toc is a list
 * of [id, text]. Headings that already carry an id keep it.
 */
function st_theme_toc( $html ) {
	$toc  = array();
	$used = array();
	$html = preg_replace_callback(
		'#<h2([^>]*)>(.*?)</h2>#is',
		function ( $m ) use ( &$toc, &$used ) {
			$text = trim( wp_strip_all_tags( $m[2] ) );
			if ( preg_match( '/\sid=["\']([^"\']+)["\']/', $m[1], $id ) ) {
				$id = $id[1];
				$tag = $m[0];
			} else {
				$base = sanitize_title( $text );
				$base = $base ? $base : 'section';
				$id   = $base;
				for ( $i = 2; isset( $used[ $id ] ); $i++ ) {
					$id = $base . '-' . $i;
				}
				$tag = '<h2' . $m[1] . ' id="' . esc_attr( $id ) . '">' . $m[2] . '</h2>';
			}
			$used[ $id ] = true;
			if ( '' !== $text ) {
				$toc[] = array( $id, $text );
			}
			return $tag;
		},
		$html
	);
	return array( $html, $toc );
}

/** Minutes to read rendered HTML, at 220 words a minute. */
function st_theme_reading_minutes( $html ) {
	$words = str_word_count( wp_strip_all_tags( $html ) );
	return max( 1, (int) round( $words / 220 ) );
}

/** Preload the pixel display font so headings do not swap late. */
add_action(
	'wp_head',
	function () {
		printf( '<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n", esc_url( get_template_directory_uri() . '/assets/fonts/pixelify-sans-latin.woff2' ) );
	},
	1
);

/** Mark JS support before first paint so the mobile menu does not flash open. */
add_action(
	'wp_head',
	function () {
		echo "<script>document.documentElement.classList.add('js')</script>\n";
	},
	0
);

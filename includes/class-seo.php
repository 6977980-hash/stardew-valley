<?php
/**
 * SEO foundation: titles, meta descriptions, canonical, robots, Open Graph, Twitter cards,
 * JSON-LD and sitemap/robots.txt tweaks. Steps aside when Yoast or Rank Math is active so
 * tags are never printed twice.
 *
 * @package Stardew_Tools
 */

namespace Stardew_Tools;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Seo {

	const META_DESCRIPTION = '_stardew_tools_description';
	const META_NOINDEX     = '_stardew_tools_noindex';

	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_meta' ) );
		add_filter( 'wp_sitemaps_add_provider', array( __CLASS__, 'sitemap_providers' ), 10, 2 );
		add_filter( 'wp_sitemaps_posts_query_args', array( __CLASS__, 'sitemap_exclude_noindex' ) );
		add_filter( 'robots_txt', array( __CLASS__, 'robots_txt' ), 10, 2 );
		add_action( 'template_redirect', array( __CLASS__, 'block_author_enumeration' ) );

		if ( self::other_seo_plugin_active() ) {
			return;
		}
		add_filter( 'pre_get_document_title', array( __CLASS__, 'document_title' ), 20 );
		add_filter( 'document_title_separator', array( __CLASS__, 'separator' ) );
		add_filter( 'document_title_parts', array( __CLASS__, 'title_parts' ) );
		add_filter( 'wp_robots', array( __CLASS__, 'robots' ) );
		add_action( 'wp_head', array( __CLASS__, 'meta_tags' ), 3 );
		add_action( 'wp_head', array( __CLASS__, 'json_ld' ), 30 );
	}

	public static function other_seo_plugin_active() {
		return defined( 'WPSEO_VERSION' ) || defined( 'RANK_MATH_VERSION' ) || defined( 'AIOSEO_VERSION' );
	}

	public static function register_meta() {
		foreach ( array( 'page', 'post' ) as $type ) {
			register_post_meta(
				$type,
				self::META_DESCRIPTION,
				array(
					'type'              => 'string',
					'single'            => true,
					'show_in_rest'      => true,
					'sanitize_callback' => 'sanitize_text_field',
					'auth_callback'     => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);
			register_post_meta(
				$type,
				self::META_NOINDEX,
				array(
					'type'          => 'boolean',
					'single'        => true,
					'show_in_rest'  => true,
					'auth_callback' => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);
		}
	}

	/* ---------- Titles ---------- */

	public static function document_title( $title ) {
		if ( is_front_page() ) {
			return Config::get( 'home_title' );
		}
		return $title;
	}

	public static function separator() {
		return '|';
	}

	public static function title_parts( $parts ) {
		unset( $parts['tagline'] );
		if ( is_404() ) {
			$parts['title'] = 'Page Not Found';
		}
		$parts['site'] = Config::get( 'brand_name' );
		return $parts;
	}

	/* ---------- Description, canonical, social ---------- */

	public static function description() {
		if ( is_front_page() ) {
			$custom = is_page() ? get_post_meta( get_queried_object_id(), self::META_DESCRIPTION, true ) : '';
			return $custom ? $custom : Config::get( 'meta_description' );
		}
		if ( is_singular() ) {
			$id     = get_queried_object_id();
			$custom = get_post_meta( $id, self::META_DESCRIPTION, true );
			if ( $custom ) {
				return $custom;
			}
			$post = get_post( $id );
			$text = has_excerpt( $id ) ? $post->post_excerpt : $post->post_content;
			$text = trim( preg_replace( '/\s+/', ' ', wp_strip_all_tags( strip_shortcodes( $text ) ) ) );
			if ( '' !== $text ) {
				return self::trim_words( $text, 155 );
			}
		}
		return Config::get( 'meta_description' );
	}

	/** Cut at a word boundary to at most $max characters, adding an ellipsis when cut. */
	public static function trim_words( $text, $max ) {
		if ( mb_strlen( $text ) <= $max ) {
			return $text;
		}
		$cut   = mb_substr( $text, 0, $max - 1 );
		$space = mb_strrpos( $cut, ' ' );
		if ( false !== $space && $space > $max * 0.6 ) {
			$cut = mb_substr( $cut, 0, $space );
		}
		return rtrim( $cut, " ,.;:-" ) . '…';
	}

	public static function canonical_url() {
		if ( is_front_page() ) {
			return home_url( '/' );
		}
		if ( is_singular() ) {
			return wp_get_canonical_url();
		}
		return '';
	}

	public static function meta_tags() {
		if ( is_404() ) {
			return;
		}
		$desc  = self::description();
		$url   = self::canonical_url();
		$title = wp_get_document_title();
		$image = Config::asset( Config::get( 'og_image' ) );
		$type  = is_front_page() ? 'website' : ( is_singular( 'post' ) ? 'article' : 'website' );

		printf( "<meta name=\"description\" content=\"%s\">\n", esc_attr( $desc ) );
		// Core prints rel=canonical for singular content; add it where core does not.
		if ( $url && is_front_page() && ! is_page() ) {
			printf( "<link rel=\"canonical\" href=\"%s\">\n", esc_url( $url ) );
		}
		$og = array(
			'og:locale'       => 'en_US',
			'og:site_name'    => Config::get( 'brand_name' ),
			'og:type'         => $type,
			'og:title'        => is_front_page() ? Config::get( 'primary_h1' ) : $title,
			'og:description'  => $desc,
			'og:url'          => $url,
			'og:image'        => $image,
			'og:image:width'  => '1200',
			'og:image:height' => '630',
			'og:image:alt'    => Config::get( 'brand_name' ) . ' — ' . Config::get( 'primary_h1' ),
		);
		foreach ( $og as $property => $content ) {
			if ( '' === $content ) {
				continue;
			}
			printf( "<meta property=\"%s\" content=\"%s\">\n", esc_attr( $property ), esc_attr( $content ) );
		}
		printf( "<meta name=\"twitter:card\" content=\"summary_large_image\">\n" );
	}

	/* ---------- Robots ---------- */

	public static function robots( $robots ) {
		$noindex = is_404() || is_search() || is_author() || is_date() || is_attachment() || is_category() || is_tag() || is_tax();
		if ( is_singular() && get_post_meta( get_queried_object_id(), self::META_NOINDEX, true ) ) {
			$noindex = true;
		}
		if ( $noindex ) {
			$robots['noindex'] = true;
			$robots['follow']  = true;
		}
		return $robots;
	}

	public static function robots_txt( $output, $public ) {
		if ( ! $public ) {
			return $output;
		}
		$rules = "Disallow: /?s=\nDisallow: /search/\n";
		// Keep the rules inside the "User-agent: *" group, before any Sitemap line.
		$pos = strpos( $output, "\nSitemap:" );
		if ( false !== $pos ) {
			return rtrim( substr( $output, 0, $pos ) ) . "\n" . $rules . "\n" . substr( $output, $pos + 1 );
		}
		return $output . $rules . "\nSitemap: " . esc_url_raw( home_url( '/wp-sitemap.xml' ) ) . "\n";
	}

	/** Author archives add nothing for a one-author site and leak usernames. */
	public static function block_author_enumeration() {
		if ( is_admin() ) {
			return;
		}
		if ( is_author() || isset( $_GET['author'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			wp_safe_redirect( home_url( '/' ), 301 );
			exit;
		}
	}

	/* ---------- Sitemap ---------- */

	public static function sitemap_providers( $provider, $name ) {
		// No author or category pages in the sitemap: one author, and no blog.
		return in_array( $name, array( 'users', 'taxonomies' ), true ) ? false : $provider;
	}

	public static function sitemap_exclude_noindex( $args ) {
		$args['meta_query'] = array( // phpcs:ignore WordPress.DB.SlowDBQuery
			'relation' => 'OR',
			array(
				'key'     => self::META_NOINDEX,
				'compare' => 'NOT EXISTS',
			),
			array(
				'key'   => self::META_NOINDEX,
				'value' => '',
			),
		);
		return $args;
	}

	/* ---------- Structured data ---------- */

	/** @return array[] Schema.org nodes for the current request. */
	public static function schema_graph() {
		$home  = home_url( '/' );
		$brand = Config::get( 'brand_name' );
		$graph = array();

		if ( is_front_page() ) {
			$graph[] = array(
				'@type'       => 'WebSite',
				'@id'         => $home . '#website',
				'url'         => $home,
				'name'        => $brand,
				'description' => Config::get( 'short_desc' ),
				'inLanguage'  => 'en',
				'publisher'   => array( '@id' => $home . '#organization' ),
			);
			$graph[] = array(
				'@type' => 'Organization',
				'@id'   => $home . '#organization',
				'name'  => $brand,
				'url'   => $home,
				'logo'  => Config::asset( 'assets/brand/icon-512.png' ),
				'email' => Config::get( 'contact_email' ),
			);
		} elseif ( is_singular() && ! is_404() ) {
			$graph[] = self::breadcrumb_schema( get_queried_object_id() );
		}
		return apply_filters( 'stardew_tools_schema_graph', $graph );
	}

	/** BreadcrumbList for a page, following its parent pages. */
	public static function breadcrumb_schema( $post_id ) {
		$items = array();
		foreach ( self::breadcrumb_trail( $post_id ) as $i => $crumb ) {
			$items[] = array(
				'@type'    => 'ListItem',
				'position' => $i + 1,
				'name'     => $crumb['name'],
				'item'     => $crumb['url'],
			);
		}
		return array(
			'@type'           => 'BreadcrumbList',
			'itemListElement' => $items,
		);
	}

	/** @return array[] List of ['name' => ..., 'url' => ...] from Home to the post. */
	public static function breadcrumb_trail( $post_id ) {
		$trail = array(
			array(
				'name' => 'Home',
				'url'  => home_url( '/' ),
			),
		);
		$ancestors = array_reverse( get_post_ancestors( $post_id ) );
		foreach ( array_merge( $ancestors, array( $post_id ) ) as $id ) {
			$trail[] = array(
				'name' => wp_strip_all_tags( get_the_title( $id ) ),
				'url'  => get_permalink( $id ),
			);
		}
		return $trail;
	}

	public static function json_ld() {
		$graph = self::schema_graph();
		if ( empty( $graph ) ) {
			return;
		}
		$data = array(
			'@context' => 'https://schema.org',
			'@graph'   => $graph,
		);
		echo '<script type="application/ld+json">' . wp_json_encode( $data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . "</script>\n";
	}
}

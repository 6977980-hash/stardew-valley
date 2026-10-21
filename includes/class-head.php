<?php
/**
 * Favicons, web app manifest and small <head> clean-ups.
 *
 * @package Stardew_Tools
 */

namespace Stardew_Tools;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Head {

	public static function init() {
		add_action( 'wp_head', array( __CLASS__, 'icons' ), 2 );
		add_action( 'admin_head', array( __CLASS__, 'icons' ) );
		add_action( 'init', array( __CLASS__, 'cleanup' ) );
		// Hardening: no WordPress version in feeds or elsewhere, no XML-RPC and no pingbacks.
		add_filter( 'the_generator', '__return_empty_string' );
		add_filter( 'xmlrpc_enabled', '__return_false' );
		add_filter( 'xmlrpc_methods', '__return_empty_array' ); // xmlrpc_enabled leaves pingback.ping on.
		add_filter( 'pings_open', '__return_false' );
		add_filter( 'wp_headers', array( __CLASS__, 'headers' ) );
	}

	/** Drops the X-Pingback header, which only advertises the XML-RPC endpoint. */
	public static function headers( $headers ) {
		unset( $headers['X-Pingback'] );
		return $headers;
	}

	/**
	 * Brand icons. A Site Icon set in WP Admin (Appearance > Customize) wins over these.
	 */
	public static function icons() {
		$colors = Config::get( 'colors' );
		printf( "<meta name=\"theme-color\" content=\"%s\">\n", esc_attr( $colors['primary'] ) );
		// Google Search Console ownership check (home page only, as Google asks).
		if ( is_front_page() ) {
			printf( "<meta name=\"google-site-verification\" content=\"%s\" />\n", esc_attr( '3PqbKf6_cJTo0tBsr3j8MzMLajjafIwrBca6GNgrvrE' ) );
		}

		if ( function_exists( 'has_site_icon' ) && has_site_icon() ) {
			return;
		}
		$b = 'assets/brand/';
		printf( "<link rel=\"icon\" href=\"%s\" sizes=\"48x48\">\n", esc_url( Config::asset( $b . 'favicon.ico' ) ) );
		printf( "<link rel=\"icon\" href=\"%s\" type=\"image/svg+xml\">\n", esc_url( Config::asset( $b . 'icon.svg' ) ) );
		printf( "<link rel=\"icon\" href=\"%s\" sizes=\"32x32\" type=\"image/png\">\n", esc_url( Config::asset( $b . 'icon-32.png' ) ) );
		printf( "<link rel=\"icon\" href=\"%s\" sizes=\"16x16\" type=\"image/png\">\n", esc_url( Config::asset( $b . 'icon-16.png' ) ) );
		printf( "<link rel=\"apple-touch-icon\" href=\"%s\">\n", esc_url( Config::asset( $b . 'apple-touch-icon.png' ) ) );
		printf( "<link rel=\"manifest\" href=\"%s\">\n", esc_url( Config::asset( $b . 'site.webmanifest' ) ) );
	}

	/** Drop emoji scripts, generator noise and links to feeds (the site has no blog, so they are empty). */
	public static function cleanup() {
		remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
		remove_action( 'wp_print_styles', 'print_emoji_styles' );
		remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
		remove_action( 'admin_print_styles', 'print_emoji_styles' );
		remove_action( 'wp_head', 'wp_generator' );
		remove_action( 'wp_head', 'wlwmanifest_link' );
		remove_action( 'wp_head', 'rsd_link' );
		remove_action( 'wp_head', 'feed_links', 2 );
		remove_action( 'wp_head', 'feed_links_extra', 3 );
	}
}

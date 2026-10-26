<?php
/**
 * Runs the page installers once per deploy. Git deploys do not fire the activation hook, so after
 * new code lands this creates missing pages, refreshes generated titles and descriptions, takes
 * pages whose tool, guide or entry was removed out of the index, and purges the page cache. "New
 * code" is the plugin version plus the newest file time of the templates, data and scripts, so a
 * deploy that changes them without a version bump is caught too. A visitor's request only notices
 * the new code and schedules the install; wp-cron, an admin page or WP-CLI runs it. An atomic
 * lock keeps two requests that arrive together from installing twice.
 *
 * @package Stardew_Tools
 */

namespace Stardew_Tools;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Release {

	const OPTION      = 'stardew_tools_release';
	const DATE_OPTION = 'stardew_tools_release_date';
	const LOCK        = 'stardew_tools_release_lock';
	const LOCK_TTL    = 300;

	/** The wp-cron event that runs the install. */
	const HOOK = 'stardew_tools_release';

	/** Transient that keeps the file-time fingerprint between requests. */
	const FINGERPRINT_CACHE = 'stardew_tools_fingerprint';
	const FINGERPRINT_TTL   = 300;

	/** A scheduled install that has not run after this many seconds runs in a visitor's request (cron is off or blocked). */
	const CRON_GRACE = 600;

	/** Per page: hash of the rendered text, and when that hash last changed (the sitemap lastmod). */
	const HASH_META    = '_stardew_tools_content_hash';
	const LASTMOD_META = '_stardew_tools_lastmod';

	/** Folders whose files change what visitors see. */
	const WATCHED = array( 'includes', 'data', 'assets/js', 'assets/css', 'theme' );

	public static function init() {
		add_action( 'init', array( __CLASS__, 'maybe_run' ), 20 );
		add_action( self::HOOK, array( __CLASS__, 'run_locked' ) );
	}

	/**
	 * Plugin version plus the newest modification time of the watched files. Walking the folders
	 * stats every plugin file, so outside admin, cron and WP-CLI the result is reused for five
	 * minutes; a new version number is always seen at once.
	 *
	 * @param bool $fresh Walk the folders even when a recent result is cached.
	 */
	public static function fingerprint( $fresh = true ) {
		if ( ! $fresh ) {
			$hit = get_transient( self::FINGERPRINT_CACHE );
			if ( is_string( $hit ) && 0 === strpos( $hit, STARDEW_TOOLS_VERSION . ':' ) ) {
				return $hit;
			}
		}
		$newest = 0;
		foreach ( self::WATCHED as $dir ) {
			$path = STARDEW_TOOLS_DIR . $dir;
			if ( ! is_dir( $path ) ) {
				continue;
			}
			$files = new \RecursiveIteratorIterator( new \RecursiveDirectoryIterator( $path, \FilesystemIterator::SKIP_DOTS ) );
			foreach ( $files as $file ) {
				$newest = max( $newest, (int) $file->getMTime() );
			}
		}
		$fingerprint = STARDEW_TOOLS_VERSION . ':' . $newest;
		set_transient( self::FINGERPRINT_CACHE, $fingerprint, self::FINGERPRINT_TTL );
		return $fingerprint;
	}

	/** Admin pages, wp-cron and WP-CLI may do the install's slow work; a visitor's page view may not. */
	private static function trusted() {
		return is_admin() || wp_doing_cron() || ( defined( 'WP_CLI' ) && WP_CLI );
	}

	public static function maybe_run() {
		$trusted = self::trusted();
		$stored  = get_option( self::OPTION );
		if ( $stored === self::fingerprint( $trusted ) ) {
			return;
		}
		if ( $trusted ) {
			self::run_locked();
		} else {
			self::defer();
		}
	}

	/** In a visitor's request: schedule the install, or run it if the scheduled one never ran. */
	public static function defer() {
		$next = wp_next_scheduled( self::HOOK );
		if ( ! $next ) {
			wp_schedule_single_event( time(), self::HOOK );
		} elseif ( $next < time() - self::CRON_GRACE ) {
			self::run_locked();
		}
	}

	/** Runs the install unless another request holds the lock or has already installed this code. */
	public static function run_locked() {
		if ( ! self::lock() ) {
			return;
		}
		$fingerprint = self::fingerprint();
		wp_cache_delete( 'alloptions', 'options' ); // Another request may have finished the install meanwhile.
		if ( get_option( self::OPTION ) !== $fingerprint ) {
			self::run( $fingerprint );
		}
		wp_clear_scheduled_hook( self::HOOK );
		self::unlock();
	}

	public static function run( $fingerprint = null ) {
		// The installers save the plugin's own page text. In a cron or visitor request nobody may
		// post unfiltered HTML, so kses would rewrite that text on save.
		$kses = false !== has_filter( 'content_save_pre', 'wp_filter_post_kses' );
		kses_remove_filters();
		Pages::flush_urls();
		Pages::install();
		Tools::install();
		Guides::install();
		Entities::install();
		self::retire_orphans();
		if ( $kses ) {
			kses_init_filters();
		}
		Pages::flush_urls();
		Search::flush(); // Fish and recipe names in the index come from data files.
		self::stamp_pages();
		self::root_favicon();
		update_option( self::OPTION, is_string( $fingerprint ) ? $fingerprint : self::fingerprint() );
		update_option( self::DATE_OPTION, gmdate( 'c' ) );
		// Cached pages still point at the old scripts and data; drop them so the new version shows at once.
		do_action( 'litespeed_purge_all' );
	}

	/**
	 * Browsers and crawlers ask for /favicon.ico whatever the page says, and the server answers
	 * that path itself, without WordPress. Put the brand icon there once if the site has none.
	 */
	public static function root_favicon() {
		$target = ABSPATH . 'favicon.ico';
		$source = STARDEW_TOOLS_DIR . 'assets/brand/favicon.ico';
		if ( ! file_exists( $target ) && is_readable( $source ) && wp_is_writable( ABSPATH ) ) {
			copy( $source, $target ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		}
	}

	/**
	 * Page text comes from templates and data, so post_modified does not move when it changes.
	 * Render each published page, and move its lastmod only when the rendered title, description
	 * and content differ from the last deploy, so a release that changes one tool does not tell
	 * search engines that every page changed. Pages seen for the first time get the current time.
	 *
	 * @return int[] Ids of the pages whose lastmod moved.
	 */
	public static function stamp_pages() {
		global $post;
		$now     = gmdate( 'c' );
		$changed = array();
		$saved   = $post;
		$pages   = get_posts(
			array(
				'post_type'      => 'page',
				'post_status'    => 'publish',
				'posts_per_page' => -1,
			)
		);
		foreach ( $pages as $page ) {
			$post = $page; // phpcs:ignore WordPress.WP.GlobalVariablesOverride
			setup_postdata( $page );
			$html = apply_filters( 'the_content', $page->post_content );
			// Table caption ids count up through the request, so they depend on page order.
			$html = preg_replace( '/table-cap-\d+/', 'table-cap', $html );
			$hash = md5( $page->post_title . "\n" . get_post_meta( $page->ID, Seo::META_DESCRIPTION, true ) . "\n" . $html );
			if ( get_post_meta( $page->ID, self::HASH_META, true ) !== $hash ) {
				update_post_meta( $page->ID, self::HASH_META, $hash );
				update_post_meta( $page->ID, self::LASTMOD_META, $now );
				$changed[] = $page->ID;
			}
		}
		$post = $saved; // phpcs:ignore WordPress.WP.GlobalVariablesOverride
		if ( $saved ) {
			setup_postdata( $saved );
		}
		return $changed;
	}

	/**
	 * INSERT IGNORE adds the lock row only when it is missing, and the database decides that, so
	 * two requests cannot both get it. A lock older than LOCK_TTL was left by a request that died;
	 * one UPDATE takes it over. Timestamps are compared as text, which holds while they have 10 digits.
	 */
	private static function lock() {
		global $wpdb;
		$now = (string) time();
		if ( $wpdb->query( $wpdb->prepare( "INSERT IGNORE INTO {$wpdb->options} (option_name, option_value, autoload) VALUES (%s, %s, 'no')", self::LOCK, $now ) ) ) { // phpcs:ignore WordPress.DB.DirectDatabaseQuery
			return true;
		}
		return (bool) $wpdb->query( $wpdb->prepare( "UPDATE {$wpdb->options} SET option_value = %s WHERE option_name = %s AND option_value < %s", $now, self::LOCK, (string) ( time() - self::LOCK_TTL ) ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
	}

	private static function unlock() {
		global $wpdb;
		$wpdb->delete( $wpdb->options, array( 'option_name' => self::LOCK ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
		// A lock row made by add_option (older versions) may sit in the autoloaded options cache too.
		wp_cache_delete( self::LOCK, 'options' );
		wp_cache_delete( 'alloptions', 'options' );
	}

	/**
	 * A page whose tool, guide or entry no longer exists would render empty but stay published
	 * and in the sitemap. Such pages go back to draft, marked so the installers may publish them
	 * again if the entry comes back. A class is skipped when it knows no ids at
	 * all, so a data file that fails to load never unpublishes every page.
	 *
	 * @return int[] Ids of the pages moved to draft.
	 */
	public static function retire_orphans() {
		$known = array(
			Tools::META    => array( 'Stardew_Tools\Tools', 'knows' ),
			Guides::META   => array( 'Stardew_Tools\Guides', 'knows' ),
			Entities::META => array( 'Stardew_Tools\Entities', 'knows' ),
		);
		$retired = array();
		foreach ( $known as $key => $knows ) {
			if ( ! call_user_func( $knows, null ) ) {
				continue;
			}
			$pages = get_posts(
				array(
					'post_type'      => 'page',
					'post_status'    => 'publish',
					'posts_per_page' => -1,
					'fields'         => 'ids',
					'meta_key'       => $key, // phpcs:ignore WordPress.DB.SlowDBQuery
				)
			);
			foreach ( $pages as $page_id ) {
				if ( ! call_user_func( $knows, (string) get_post_meta( $page_id, $key, true ) ) ) {
					wp_update_post(
						array(
							'ID'          => $page_id,
							'post_status' => 'draft',
						)
					);
					update_post_meta( $page_id, Pages::RETIRED_META, gmdate( 'c' ) );
					$retired[] = $page_id;
				}
			}
		}
		return $retired;
	}
}

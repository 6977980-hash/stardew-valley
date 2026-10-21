<?php
/**
 * Runs the page installers once per deploy. Git deploys do not fire the activation hook, so on the
 * first request after new code lands this creates missing pages, refreshes generated titles and
 * descriptions, takes pages whose tool, guide or entry was removed out of the index, and purges
 * the page cache. "New code" is the plugin version plus the newest file time of the templates,
 * data and scripts, so a deploy that changes them without a version bump is caught too. A short
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

	/** Folders whose files change what visitors see. */
	const WATCHED = array( 'includes', 'data', 'assets/js', 'assets/css', 'theme' );

	public static function init() {
		add_action( 'init', array( __CLASS__, 'maybe_run' ), 20 );
	}

	/** Plugin version plus the newest modification time of the watched files. */
	public static function fingerprint() {
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
		return STARDEW_TOOLS_VERSION . ':' . $newest;
	}

	public static function maybe_run() {
		$fingerprint = self::fingerprint();
		if ( get_option( self::OPTION ) === $fingerprint || ! self::lock() ) {
			return;
		}
		self::run( $fingerprint );
		delete_option( self::LOCK );
	}

	public static function run( $fingerprint = null ) {
		Pages::install();
		Tools::install();
		Guides::install();
		Entities::install();
		self::retire_orphans();
		update_option( self::OPTION, is_string( $fingerprint ) ? $fingerprint : self::fingerprint() );
		update_option( self::DATE_OPTION, gmdate( 'c' ) );
		// Cached pages still point at the old scripts and data; drop them so the new version shows at once.
		do_action( 'litespeed_purge_all' );
	}

	/** add_option fails when the row exists, so only one request gets the lock; a stale lock is taken over. */
	private static function lock() {
		if ( add_option( self::LOCK, time(), '', 'no' ) ) {
			return true;
		}
		if ( time() - (int) get_option( self::LOCK ) > self::LOCK_TTL ) {
			delete_option( self::LOCK );
			return add_option( self::LOCK, time(), '', 'no' );
		}
		return false;
	}

	/**
	 * A page whose tool, guide or entry no longer exists would render empty but stay published
	 * and in the sitemap. Such pages go back to draft. A class is skipped when it knows no ids at
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
					$retired[] = $page_id;
				}
			}
		}
		return $retired;
	}
}

<?php
/**
 * Creates the trust and legal pages (About, Contact, Privacy, Terms, Disclaimer, Methodology,
 * Changelog). Runs on activation and once after each plugin update, because Git deploys do
 * not trigger the activation hook. Pages that already exist are never overwritten, except a
 * still-unpublished draft (WordPress ships an unpublished "Privacy Policy" draft).
 *
 * @package Stardew_Tools
 */

namespace Stardew_Tools;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Pages {

	const VERSION_OPTION = 'stardew_tools_installed_version';

	public static function init() {
		add_action( 'init', array( __CLASS__, 'maybe_install' ), 20 );
	}

	public static function maybe_install() {
		if ( get_option( self::VERSION_OPTION ) !== STARDEW_TOOLS_VERSION ) {
			self::install();
		}
	}

	/** slug => [title, template file, meta description]. */
	public static function definitions() {
		return array(
			'about'          => array( 'About Stardew Tools', 'about', 'Stardew Tools is an independent, fan-made Stardew Valley planning site with free calculators and decision tools built on verified game data.' ),
			'contact'        => array( 'Contact', 'contact', 'Contact Stardew Tools to report a data error, suggest a tool or ask a question.' ),
			'privacy-policy' => array( 'Privacy Policy', 'privacy', 'How Stardew Tools handles data: no accounts, tool settings stay in your browser, and how advertising cookies work.' ),
			'terms'          => array( 'Terms of Use', 'terms', 'Terms of use for Stardew Tools, an independent fan-made Stardew Valley website.' ),
			'disclaimer'     => array( 'Disclaimer', 'disclaimer', 'Stardew Tools is fan-made and not affiliated with ConcernedApe. How we handle accuracy, advertising and external links.' ),
			'methodology'    => array( 'Methodology & Data Verification', 'methodology', 'Where Stardew Tools gets its game data, how each value is verified, and how calculations and assumptions are shown.' ),
			'changelog'      => array( 'Changelog', 'changelog', 'What changed on Stardew Tools and when, including data updates for new Stardew Valley versions.' ),
		);
	}

	public static function install() {
		$author = self::author_id();
		foreach ( self::definitions() as $slug => $def ) {
			$content  = self::render_template( $def[1] );
			$existing = get_page_by_path( $slug, OBJECT, 'page' );

			if ( $existing && 'draft' !== $existing->post_status ) {
				continue;
			}
			$postarr = array(
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_title'   => $def[0],
				'post_name'    => $slug,
				'post_content' => $content,
				'post_author'  => $author,
			);
			if ( $existing ) {
				$postarr['ID'] = $existing->ID;
				$id            = wp_update_post( $postarr );
			} else {
				$id = wp_insert_post( $postarr );
			}
			if ( $id && ! is_wp_error( $id ) ) {
				update_post_meta( $id, Seo::META_DESCRIPTION, $def[2] );
				if ( 'privacy-policy' === $slug ) {
					update_option( 'wp_page_for_privacy_policy', $id );
				}
			}
		}
		update_option( self::VERSION_OPTION, STARDEW_TOOLS_VERSION );
	}

	private static function author_id() {
		$admins = get_users(
			array(
				'role'    => 'administrator',
				'number'  => 1,
				'orderby' => 'ID',
				'fields'  => 'ID',
			)
		);
		return $admins ? (int) $admins[0] : 0;
	}

	/** Renders includes/page-templates/{name}.php with brand values in scope. */
	public static function render_template( $name ) {
		$file = STARDEW_TOOLS_DIR . 'includes/page-templates/' . $name . '.php';
		if ( ! file_exists( $file ) ) {
			return '';
		}
		$brand    = Config::get( 'brand_name' );
		$email    = Config::get( 'contact_email' );
		$author   = Config::get( 'author' );
		$version  = Config::get( 'game_version' );
		$notice   = Config::get( 'disclaimer' );
		$domain   = Config::get( 'site_domain' );
		$updated  = gmdate( 'F j, Y' );
		$home_url = home_url( '/' );
		ob_start();
		include $file;
		return trim( ob_get_clean() );
	}
}

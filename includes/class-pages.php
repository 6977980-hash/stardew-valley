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
			'tools'          => array( 'Stardew Valley Tools and Calculators', 'tools', 'All free Stardew Valley tools in one place: what to plant, crop profit, kegs vs jars, greenhouse, fish ponds, animals, gifts and bundles, with verified 1.6 data.' ),
			'guides'         => array( 'Stardew Valley Guides by Topic', 'guides', 'Stardew Valley guides built on verified 1.6 data: crops, artisan goods, animals, fishing and the greenhouse, each linked to a calculator.' ),
			'contact'        => array( 'Contact', 'contact', 'Contact Stardew Tools to report a data error, suggest a tool or ask a question.' ),
			'privacy-policy' => array( 'Privacy Policy', 'privacy', 'How Stardew Tools handles data: no accounts, tool settings stay in your browser, and how advertising cookies work.' ),
			'terms'          => array( 'Terms of Use', 'terms', 'Terms of use for Stardew Tools, an independent fan-made Stardew Valley website.' ),
			'disclaimer'     => array( 'Disclaimer', 'disclaimer', 'Stardew Tools is fan-made and not affiliated with ConcernedApe. How we handle accuracy, advertising and external links.' ),
			'methodology'    => array( 'Methodology & Data Verification', 'methodology', 'Where Stardew Tools gets its game data, how each value is verified, and how calculations and assumptions are shown.' ),
			'changelog'      => array( 'Changelog', 'changelog', 'What changed on Stardew Tools and when, including data updates for new Stardew Valley versions.' ),
		);
	}

	const GENERATED_META = '_stardew_tools_generated';

	/**
	 * Brings a plugin-made page up to date with what the plugin now generates, without touching
	 * text the owner has edited. A field is refreshed when it still equals what the plugin wrote
	 * last time (a hash is kept in post meta). Pages made before hashes were kept are refreshed
	 * when they are titles or descriptions (the owner never sets those here), and for page text
	 * only when the page was never edited since it was created.
	 *
	 * @param int         $post_id     Page.
	 * @param string|null $title       New generated title, or null to leave it.
	 * @param string|null $description New generated meta description, or null.
	 * @param string|null $content     New generated page text, or null.
	 */
	public static function sync_generated( $post_id, $title = null, $description = null, $content = null ) {
		$post = get_post( $post_id );
		if ( ! $post ) {
			return;
		}
		$hashes = get_post_meta( $post_id, self::GENERATED_META, true );
		$hashes = is_array( $hashes ) ? $hashes : array();
		$update = array( 'ID' => $post_id );

		$edited = strtotime( $post->post_modified_gmt ) > strtotime( $post->post_date_gmt ) + 120;
		$fresh  = function ( $key, $current, $new, $legacy_ok ) use ( &$hashes ) {
			if ( null === $new ) {
				return false;
			}
			if ( isset( $hashes[ $key ] ) ) {
				return md5( (string) $current ) === $hashes[ $key ] && (string) $current !== (string) $new;
			}
			return $legacy_ok && (string) $current !== (string) $new;
		};

		if ( $fresh( 'title', $post->post_title, $title, true ) ) {
			$update['post_title'] = $title;
		}
		if ( $fresh( 'content', $post->post_content, $content, ! $edited ) ) {
			$update['post_content'] = $content;
		}
		$old_description = get_post_meta( $post_id, Seo::META_DESCRIPTION, true );
		if ( $fresh( 'description', $old_description, $description, true ) ) {
			update_post_meta( $post_id, Seo::META_DESCRIPTION, $description );
		}
		if ( count( $update ) > 1 ) {
			wp_update_post( $update );
		}
		// Remember what the plugin generated, so the next refresh can tell whether the owner changed it.
		foreach ( array(
			'title'       => array( $title, isset( $update['post_title'] ) ? $title : $post->post_title ),
			'content'     => array( $content, isset( $update['post_content'] ) ? $content : $post->post_content ),
			'description' => array( $description, get_post_meta( $post_id, Seo::META_DESCRIPTION, true ) ),
		) as $key => $pair ) {
			if ( null !== $pair[0] && (string) $pair[1] === (string) $pair[0] ) {
				$hashes[ $key ] = md5( (string) $pair[0] );
			}
		}
		update_post_meta( $post_id, self::GENERATED_META, $hashes );
	}

	public static function install() {
		$author = self::author_id();
		foreach ( self::definitions() as $slug => $def ) {
			$content  = self::render_template( $def[1] );
			$existing = get_page_by_path( $slug, OBJECT, 'page' );

			if ( $existing && 'draft' !== $existing->post_status ) {
				// Page text is refreshed only where the plugin keeps it current (not the legal pages, which show a date).
				self::sync_generated( $existing->ID, $def[0], $def[2], in_array( $slug, array( 'about', 'methodology', 'changelog' ), true ) ? $content : null );
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
		$linkedin = Config::get( 'author_linkedin' );
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

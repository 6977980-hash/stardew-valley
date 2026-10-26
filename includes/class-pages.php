<?php
/**
 * Creates the trust and legal pages (About, Contact, Privacy, Terms, Disclaimer, Methodology,
 * Changelog). Runs on activation and, through Release, once after each deploy, because Git
 * deploys do not trigger the activation hook. Pages that already exist are never overwritten, except a
 * still-unpublished draft (WordPress ships an unpublished "Privacy Policy" draft). Also holds the
 * path => address map that every link to a plugin page is looked up in.
 *
 * @package Stardew_Tools
 */

namespace Stardew_Tools;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Pages {

	const VERSION_OPTION = 'stardew_tools_installed_version';

	/** Set on a page Release::retire_orphans drafted, so it may be published again when its entry returns. */
	const RETIRED_META = '_stardew_tools_retired';

	/** Transient with the path => address map of published pages. */
	const URLS_CACHE = 'stardew_tools_page_urls';

	/** @var string[]|null The map for this request. */
	private static $urls = null;

	public static function init() {
		foreach ( array( 'save_post_page', 'deleted_post', 'trashed_post', 'update_option_permalink_structure', 'update_option_home', 'update_option_page_on_front', 'update_option_show_on_front' ) as $hook ) {
			add_action( $hook, array( __CLASS__, 'flush_urls' ) );
		}
	}

	/**
	 * Address of a published page by its path ('crops/parsnip'), or ''. Pages link to dozens of
	 * other pages, and one get_page_by_path query per link added up to 100+ queries on a cache
	 * miss, so one query builds the map for every page and a transient keeps it between requests.
	 */
	public static function url( $path ) {
		if ( null === self::$urls ) {
			$hit        = get_transient( self::URLS_CACHE );
			self::$urls = is_array( $hit ) ? $hit : self::build_urls();
		}
		$path = trim( (string) $path, '/' );
		return isset( self::$urls[ $path ] ) ? self::$urls[ $path ] : '';
	}

	private static function build_urls() {
		$map   = array();
		$pages = get_posts(
			array(
				'post_type'              => 'page',
				'post_status'            => 'publish',
				'posts_per_page'         => -1,
				'orderby'                => 'ID',
				'order'                  => 'ASC',
				'no_found_rows'          => true,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
			)
		);
		foreach ( $pages as $page ) {
			$path = get_page_uri( $page );
			if ( $path && ! isset( $map[ $path ] ) ) {
				$map[ $path ] = get_permalink( $page );
			}
		}
		set_transient( self::URLS_CACHE, $map, DAY_IN_SECONDS );
		return $map;
	}

	/** Pages were added, moved or removed, or the address scheme changed. */
	public static function flush_urls() {
		self::$urls = null;
		delete_transient( self::URLS_CACHE );
	}

	/**
	 * Whether the installers may publish a page that is a draft. Yes for a page this plugin never
	 * made (WordPress's own Privacy Policy draft) and for one retire_orphans drafted; no for a page
	 * the owner unpublished by hand, which would otherwise come back on every deploy.
	 */
	public static function may_republish( $page ) {
		if ( get_post_meta( $page->ID, self::RETIRED_META, true ) ) {
			return true;
		}
		foreach ( array( Seo::META_DESCRIPTION, self::GENERATED_META, Tools::META, Guides::META, Entities::META ) as $key ) {
			if ( '' !== get_post_meta( $page->ID, $key, true ) ) {
				return false;
			}
		}
		return true;
	}

	/** slug => [title, template file, meta description]. */
	public static function definitions() {
		return array(
			'about'          => array( 'About Stardew Tools', 'about', 'Stardew Tools is an independent, fan-made Stardew Valley planning site with free calculators and decision tools built on verified game data.' ),
			'tools'          => array( 'Stardew Valley Tools and Calculators', 'tools', 'All free Stardew Valley tools in one place: what to plant, crop profit, kegs vs jars, greenhouse, fish ponds, animals, gifts and bundles, verified for 1.6.' ),
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
		$old_description   = get_post_meta( $post_id, Seo::META_DESCRIPTION, true );
		$wrote_description = false;
		if ( $fresh( 'description', $old_description, $description, true ) ) {
			update_post_meta( $post_id, Seo::META_DESCRIPTION, $description );
			$wrote_description = true;
		}
		if ( count( $update ) > 1 ) {
			wp_update_post( $update );
			$post = get_post( $post_id );
		}
		// Remember what the plugin saved, so the next refresh can tell whether the owner changed it.
		// The hash is of the saved text: a save filter may change it, and a hash of the text we
		// sent would then never match again and the page would stop refreshing.
		foreach ( array(
			'title'       => array( $title, $post->post_title, isset( $update['post_title'] ) ),
			'content'     => array( $content, $post->post_content, isset( $update['post_content'] ) ),
			'description' => array( $description, get_post_meta( $post_id, Seo::META_DESCRIPTION, true ), $wrote_description ),
		) as $key => $row ) {
			list( $new, $saved, $wrote ) = $row;
			if ( null !== $new && ( $wrote || (string) $saved === (string) $new ) ) {
				$hashes[ $key ] = md5( (string) $saved );
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
				self::sync_generated( $existing->ID, $def[0], $def[2], in_array( $slug, array( 'about', 'methodology', 'changelog', 'contact' ), true ) ? $content : null );
				continue;
			}
			if ( $existing && ! self::may_republish( $existing ) ) {
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
				delete_post_meta( $id, self::RETIRED_META );
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

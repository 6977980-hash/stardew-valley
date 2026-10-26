<?php
/**
 * Site search: a Ctrl+K dialog that filters a small index of every tool, guide and reference
 * page in the browser. The index is built from the same definitions that create the pages, plus
 * villagers, pond fish and crafting recipes that open the matching tool already set to them.
 * It is cached and served as JSON from a versioned URL, fetched the first time search opens.
 *
 * @package Stardew_Tools
 */

namespace Stardew_Tools;

defined( 'ABSPATH' ) || exit;

class Search {

	const CACHE = 'stardew_tools_search_index';

	public static function init() {
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue' ), 31 );
		add_action( 'stardew_tools_header_search', array( __CLASS__, 'button' ) );
		add_action( 'wp_footer', array( __CLASS__, 'dialog' ), 5 );
		add_shortcode( 'stardew_search_form', array( __CLASS__, 'form_shortcode' ) );
		add_action( 'rest_api_init', array( __CLASS__, 'route' ) );
		// Page titles and addresses are in the index, so any page change rebuilds it.
		foreach ( array( 'save_post_page', 'deleted_post', 'trashed_post' ) as $hook ) {
			add_action( $hook, array( __CLASS__, 'flush' ) );
		}
	}

	public static function flush() {
		delete_transient( self::CACHE );
	}

	/** The index and a short hash of it, built once and kept until a page or the plugin changes. */
	public static function cached() {
		$hit = get_transient( self::CACHE );
		if ( is_array( $hit ) && isset( $hit['v'], $hit['items'], $hit['hash'] ) && STARDEW_TOOLS_VERSION === $hit['v'] ) {
			return $hit;
		}
		$items = self::index();
		$hit   = array(
			'v'     => STARDEW_TOOLS_VERSION,
			'hash'  => substr( md5( wp_json_encode( $items ) ), 0, 10 ),
			'items' => $items,
		);
		set_transient( self::CACHE, $hit, DAY_IN_SECONDS );
		return $hit;
	}

	/** GET /wp-json/stardew-tools/v1/search?v=<hash>: the index. The URL changes when it does. */
	public static function route() {
		register_rest_route(
			'stardew-tools/v1',
			'/search',
			array(
				'methods'             => 'GET',
				'permission_callback' => '__return_true',
				'callback'            => function () {
					$res = new \WP_REST_Response( self::cached()['items'] );
					$res->header( 'Cache-Control', 'public, max-age=604800' );
					return $res;
				},
			)
		);
	}

	public static function index_url() {
		return add_query_arg( 'v', self::cached()['hash'], rest_url( 'stardew-tools/v1/search' ) );
	}

	/** @return array[] Each ['t' title, 'u' url, 'k' kind label, 'x' extra words to match, 'd' short description]. */
	public static function index() {
		$items = array();
		$add   = function ( $title, $url, $kind, $desc, $extra = '' ) use ( &$items ) {
			if ( $url ) {
				$items[] = array(
					't' => $title,
					'u' => $url,
					'k' => $kind,
					'd' => $desc,
					'x' => $extra,
				);
			}
		};
		foreach ( Tools::definitions() as $id => $t ) {
			$add( $t['short'], Tools::url( $id ), 'Tool', $t['blurb'], isset( $t['question'] ) ? $t['question'] : '' );
		}
		foreach ( Guides::hubs() as $id => $h ) {
			$add( $h['short'], Guides::hub_url( $id ), 'Hub', $h['blurb'] );
		}
		foreach ( Guides::guides() as $id => $g ) {
			$add( isset( $g['short'] ) ? $g['short'] : $g['title'], Guides::guide_url( $id ), 'Guide', isset( $g['blurb'] ) ? $g['blurb'] : '' );
		}
		$data = Entities::data();
		foreach ( Entities::types() as $type => $t ) {
			$add( $t['short'], Entities::url( $type, '' ), 'List', $t['blurb'] );
			foreach ( $data[ $type ] as $id => $e ) {
				if ( ! Entities::has_page( $type, $id ) ) {
					continue;
				}
				$add( $e['name'], Entities::url( $type, $id ), $t['label'], Entities::search_text( $type, $e ) );
			}
		}
		$add( 'Animal Prices', Entities::prices_url(), 'List', 'Every farm animal: price, building, upgrade cost and payback.' );
		$add( 'Data Downloads', Entities::url( 'data', '' ) ?: self::page_url( 'data' ), 'Data', 'CSV files for crops, animals and machines.' );

		// Names people search for that live inside a tool: open the tool already set to them.
		$deep = array(
			array( 'fishponds', 'fish', 'fish-pond-calculator', 'fish', 'Fish pond', 'What a pond of them makes, in the Fish Pond Calculator' ),
			array( 'crafting', 'recipes', 'crafting-calculator', 'recipe', 'Recipe', 'Materials to craft it, in the Crafting Calculator' ),
		);
		foreach ( $deep as $d ) {
			list( $set, $key, $tool, $param, $kind, $desc ) = $d;
			$base = Tools::url( $tool );
			$data = Data::get( $set );
			if ( ! $base || ! $data || empty( $data[ $key ] ) ) {
				continue;
			}
			foreach ( $data[ $key ] as $row ) {
				$add( $row['name'], add_query_arg( $param, $row['id'], $base ), $kind, $desc );
			}
		}
		return $items;
	}

	private static function page_url( $path ) {
		$page = get_page_by_path( $path, OBJECT, 'page' );
		return $page && 'publish' === $page->post_status ? get_permalink( $page ) : '';
	}

	public static function enqueue() {
		$js  = 'assets/js/search.js';
		$css = 'assets/css/search.css';
		$ver = STARDEW_TOOLS_VERSION . '.' . filemtime( STARDEW_TOOLS_DIR . $js );
		wp_enqueue_style( 'stardew-tools-search', STARDEW_TOOLS_URL . $css, array(), STARDEW_TOOLS_VERSION . '.' . filemtime( STARDEW_TOOLS_DIR . $css ) );
		wp_enqueue_script( 'stardew-tools-search', STARDEW_TOOLS_URL . $js, array(), $ver, array( 'strategy' => 'defer', 'in_footer' => true ) );
	}

	public static function button() {
		echo '<button class="search-open" type="button" aria-haspopup="dialog" aria-label="Search the site" data-search-open><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><span class="search-open__label">Search</span><kbd class="search-open__key" aria-hidden="true">Ctrl K</kbd></button>';
	}

	public static function dialog() {
		?>
<dialog class="search-dialog" id="site-search" aria-labelledby="site-search-title" data-index-url="<?php echo esc_url( self::index_url() ); ?>">
	<form method="dialog" class="search-dialog__box" role="search">
		<h2 id="site-search-title" class="search-dialog__title">Search tools, guides and data</h2>
		<div class="search-dialog__field">
			<label for="site-search-input" class="search-sr">Search</label>
			<input id="site-search-input" type="search" role="combobox" aria-expanded="false" aria-controls="site-search-results" aria-autocomplete="list" autocomplete="off" placeholder="Try Pig, Keg or Speed-Gro" data-search-input>
			<button type="submit" class="search-dialog__close" aria-label="Close search">Esc</button>
		</div>
		<ul id="site-search-results" class="search-dialog__results" role="listbox" aria-label="Results" data-search-results></ul>
		<p class="search-dialog__status" role="status" data-search-status></p>
	</form>
</dialog>
		<?php
	}

	public static function form_shortcode() {
		return '<p><button class="btn" type="button" data-search-open>Search the site</button></p>';
	}
}

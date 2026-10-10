<?php
/**
 * Site search: a Ctrl+K dialog that filters a small index of every tool, guide and reference
 * page in the browser. The index is built from the same definitions that create the pages.
 *
 * @package Stardew_Tools
 */

namespace Stardew_Tools;

defined( 'ABSPATH' ) || exit;

class Search {

	public static function init() {
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue' ), 31 );
		add_action( 'stardew_tools_header_search', array( __CLASS__, 'button' ) );
		add_action( 'wp_footer', array( __CLASS__, 'dialog' ), 5 );
		add_shortcode( 'stardew_search_form', array( __CLASS__, 'form_shortcode' ) );
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
				$def   = Entities::def( $type, $id );
				$desc  = 'crops' === $type ? ucfirst( $e['category'] ) . ', ' . implode( ' / ', array_map( 'ucfirst', $e['seasons'] ) ) : ( 'animals' === $type ? ucfirst( $e['building'] ) : 'Artisan machine' );
				$add( $e['name'], Entities::url( $type, $id ), 'crops' === $type ? 'Crop' : ( 'animals' === $type ? 'Animal' : 'Machine' ), $desc );
			}
		}
		$add( 'Data Downloads', Entities::url( 'data', '' ) ?: self::page_url( 'data' ), 'Data', 'CSV files for crops, animals and machines.' );
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
<dialog class="search-dialog" id="site-search" aria-labelledby="site-search-title">
	<form method="dialog" class="search-dialog__box" role="search">
		<h2 id="site-search-title" class="search-dialog__title">Search tools, guides and data</h2>
		<div class="search-dialog__field">
			<label for="site-search-input" class="search-sr">Search</label>
			<input id="site-search-input" type="search" role="combobox" aria-expanded="true" aria-controls="site-search-results" aria-autocomplete="list" autocomplete="off" placeholder="Try Pig, Keg or Speed-Gro" data-search-input>
			<button type="submit" class="search-dialog__close" aria-label="Close search">Esc</button>
		</div>
		<ul id="site-search-results" class="search-dialog__results" role="listbox" aria-label="Results" data-search-results></ul>
		<p class="search-dialog__status" role="status" data-search-status></p>
	</form>
</dialog>
<script type="application/json" id="site-search-index"><?php echo wp_json_encode( self::index(), JSON_HEX_TAG | JSON_HEX_AMP ); ?></script>
		<?php
	}

	public static function form_shortcode() {
		return '<p><button class="btn" type="button" data-search-open>Search the site</button></p>';
	}
}

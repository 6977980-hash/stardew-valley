<?php
/**
 * Integration tests that run inside a real WordPress install:
 *   wp eval-file wp-content/plugins/stardew-tools/tests/integration/run.php
 * Exits non-zero on failure.
 *
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

use Stardew_Tools\Ads;
use Stardew_Tools\Config;
use Stardew_Tools\Data;
use Stardew_Tools\Pages;
use Stardew_Tools\Seo;
use Stardew_Tools\Tools;

global $st_failures, $st_passes;
$st_failures = 0;
$st_passes   = 0;

function st_assert( $cond, $label ) {
	global $st_failures, $st_passes;
	if ( $cond ) {
		$st_passes++;
		echo "  ok   {$label}\n";
	} else {
		$st_failures++;
		echo "  FAIL {$label}\n";
	}
}

echo "Config\n";
st_assert( 'Stardew Tools' === Config::get( 'brand_name' ), 'brand name' );
st_assert( 'Calculate. Compare. Decide. Plan.' === Config::get( 'tagline' ), 'tagline' );
st_assert( 'Stardew Valley Tools & Planning Hub' === Config::get( 'primary_h1' ), 'primary H1' );
st_assert( is_array( Config::get() ) && null === Config::get( 'no-such-key' ), 'missing key returns null' );
add_filter(
	'stardew_tools_config',
	function ( $c ) {
		$c['tagline'] = 'Filtered';
		return $c;
	}
);
Config::reset();
st_assert( 'Filtered' === Config::get( 'tagline' ), 'config is filterable' );
remove_all_filters( 'stardew_tools_config' );
Config::reset();
foreach ( array( 'logo', 'icon', 'og_image' ) as $key ) {
	st_assert( file_exists( STARDEW_TOOLS_DIR . Config::get( $key ) ), "brand file exists: {$key}" );
}
foreach ( array( 'favicon.ico', 'icon-16.png', 'icon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'logo.png', 'site.webmanifest' ) as $file ) {
	st_assert( file_exists( STARDEW_TOOLS_DIR . 'assets/brand/' . $file ), "brand file exists: {$file}" );
}
$manifest = json_decode( file_get_contents( STARDEW_TOOLS_DIR . 'assets/brand/site.webmanifest' ), true ); // phpcs:ignore
st_assert( is_array( $manifest ) && 'Stardew Tools' === $manifest['name'] && count( $manifest['icons'] ) >= 2, 'manifest is valid JSON with icons' );

echo "Ads\n";
delete_option( Ads::OPTION );
st_assert( '' === Ads::render( 'below-content' ), 'default: slots render nothing' );
st_assert( '' === Ads::ads_txt(), 'default: no ads.txt' );

$clean = Ads::sanitize(
	array(
		'client'      => 'pub-1234567890123456',
		'load_script' => '1',
		'show_slots'  => '1',
		'slots'       => array(
			'below-content' => '1234567890',
			'home-mid'      => 'abc',
			'unknown'       => '999999',
		),
	)
);
st_assert( 'ca-pub-1234567890123456' === $clean['client'], 'sanitize: pub- prefix normalised to ca-pub-' );
st_assert( $clean['load_script'] && $clean['show_slots'], 'sanitize: switches kept with valid client' );
st_assert( array( 'below-content' => '1234567890' ) === $clean['slots'], 'sanitize: invalid and unknown slots dropped' );

$bad = Ads::sanitize(
	array(
		'client'      => 'ca-pub-12<script>',
		'load_script' => '1',
		'show_slots'  => '1',
	)
);
st_assert( '' === $bad['client'] && ! $bad['load_script'] && ! $bad['show_slots'], 'sanitize: bad client disables everything' );

update_option( Ads::OPTION, $clean );
$html = Ads::render( 'below-content' );
st_assert( false !== strpos( $html, 'data-ad-slot="1234567890"' ) && false !== strpos( $html, 'Advertisement' ), 'enabled: slot renders with label' );
st_assert( '' === Ads::render( 'home-mid' ), 'enabled: slot without an ID renders nothing' );
st_assert( "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n" === Ads::ads_txt(), 'ads.txt line' );

$off               = $clean;
$off['show_slots'] = false;
update_option( Ads::OPTION, $off );
st_assert( '' === Ads::render( 'below-content' ), 'slots off: nothing rendered even with IDs' );
delete_option( Ads::OPTION );

echo "Pages\n";
Pages::install();
foreach ( Pages::definitions() as $slug => $def ) {
	$page = get_page_by_path( $slug );
	st_assert( $page && 'publish' === $page->post_status, "page published: {$slug}" );
	st_assert( $page && '' !== get_post_meta( $page->ID, Seo::META_DESCRIPTION, true ), "meta description set: {$slug}" );
	st_assert( $page && false === strpos( $page->post_content, '<?php' ), "content rendered: {$slug}" );
}
$privacy = get_page_by_path( 'privacy-policy' );
st_assert( $privacy && (int) get_option( 'wp_page_for_privacy_policy' ) === $privacy->ID, 'privacy policy page registered with WordPress' );
$about = get_page_by_path( 'about' );
wp_update_post(
	array(
		'ID'           => $about->ID,
		'post_content' => 'Owner edit',
	)
);
Pages::install();
st_assert( 'Owner edit' === get_post_field( 'post_content', $about->ID ), 're-install never overwrites published pages' );
wp_update_post(
	array(
		'ID'           => $about->ID,
		'post_content' => Pages::render_template( 'about' ),
	)
);
st_assert( STARDEW_TOOLS_VERSION === get_option( Pages::VERSION_OPTION ), 'installed version recorded' );

echo "SEO helpers\n";
st_assert( 'short text' === Seo::trim_words( 'short text', 155 ), 'trim_words keeps short text' );
$long = str_repeat( 'crop profit ', 30 );
$cut  = Seo::trim_words( $long, 155 );
st_assert( mb_strlen( $cut ) <= 155 && '…' === mb_substr( $cut, -1 ), 'trim_words cuts at 155 with ellipsis' );
$trail = Seo::breadcrumb_trail( $about->ID );
st_assert( 2 === count( $trail ) && 'Home' === $trail[0]['name'], 'breadcrumb trail Home > page' );
$schema = Seo::breadcrumb_schema( $about->ID );
st_assert( 'BreadcrumbList' === $schema['@type'] && 2 === $schema['itemListElement'][1]['position'], 'breadcrumb schema positions' );
$robots = apply_filters( 'robots_txt', "User-agent: *\nDisallow: /wp-admin/\n\nSitemap: https://example.com/wp-sitemap.xml\n", true );
st_assert( false === strpos( $robots, '/?s=' ) && false !== strpos( $robots, 'Sitemap:' ), 'robots.txt does not block noindexed search pages' );
st_assert( 1 === has_action( 'template_redirect', array( 'Stardew_Tools\Seo', 'block_author_enumeration' ) ), 'author block runs before core canonical redirects' );
wp_set_current_user( 0 );
$routes = rest_get_server()->get_routes();
st_assert( ! isset( $routes['/wp/v2/users'] ) && ! isset( $routes['/wp/v2/users/(?P<id>[\d]+)'] ), 'REST users endpoints hidden from visitors' );
st_assert( isset( $routes['/wp/v2/pages'] ), 'other REST endpoints still work' );
st_assert( '' === apply_filters( 'the_generator', '<generator>x</generator>', 'rss2' ), 'no WordPress version in feeds' );
st_assert( false === apply_filters( 'xmlrpc_enabled', true ) && array() === apply_filters( 'xmlrpc_methods', array( 'pingback.ping' => 'x' ) ), 'XML-RPC and pingbacks off' );
st_assert( false === has_action( 'wp_head', 'feed_links' ) && false === has_action( 'wp_head', 'feed_links_extra' ), 'no feed links in the head' );
st_assert( ! isset( apply_filters( 'wp_headers', array( 'X-Pingback' => 'x' ) )['X-Pingback'] ), 'no X-Pingback header' );
ob_start();
Stardew_Tools\Analytics::head();
$ga = ob_get_clean();
st_assert( 1 === has_action( 'wp_head', array( 'Stardew_Tools\Analytics', 'head' ) ) && false !== strpos( $ga, 'googletagmanager.com/gtag/js?id=G-ZYXVVT76GG' ) && false !== strpos( $ga, "gtag('config','G-ZYXVVT76GG')" ), 'GA4 tag printed first in the head for visitors' );
$admins = get_users( array( 'role' => 'administrator', 'number' => 1, 'fields' => 'ID' ) );
wp_set_current_user( (int) $admins[0] );
ob_start();
Stardew_Tools\Analytics::head();
st_assert( '' === ob_get_clean(), 'GA4 tag not printed for logged-in admins' );
wp_set_current_user( 0 );
$org = Seo::organization();
st_assert( 'Organization' === $org['@type'] && ! empty( $org['logo']['url'] ) && ! empty( $org['sameAs'] ), 'Organization node has name, logo and sameAs' );
ob_start();
add_filter( 'stardew_tools_schema_graph', $st_probe = function ( $g ) { $g[] = array( 'name' => '</script><b>&' ); return $g; } );
Seo::json_ld();
remove_filter( 'stardew_tools_schema_graph', $st_probe );
$ld = ob_get_clean();
st_assert( 1 === substr_count( $ld, '</script>' ) && false !== strpos( $ld, '\u003C/script\u003E' ), 'JSON-LD escapes </script>' );

echo "Game data\n";
Data::reset();
foreach ( Data::SETS as $set ) {
	$d = Data::get( $set );
	st_assert( is_array( $d ) && '1.6.15' === $d['game_version'], "data loads: {$set}" );
}
st_assert( null === Data::get( '../wp-config' ), 'unknown data set is refused' );
$crops = Data::crops();
st_assert( count( $crops ) >= 40 && isset( $crops['parsnip'] ), 'crops keyed by id' );
st_assert( array( 1, 1, 1, 1 ) === $crops['parsnip']['phase_days'] && 35 === $crops['parsnip']['base_price'], 'parsnip record' );
$summary = Data::summary();
st_assert( $summary['ok'] && $summary['crops'] === $summary['verified'], 'summary: every crop cross-checked' );

echo "Tools\n";
Tools::install();
foreach ( array_keys( Tools::definitions() ) as $tool_id ) {
	$page = get_page_by_path( $tool_id, OBJECT, 'page' );
	st_assert( $page && 'publish' === $page->post_status && $tool_id === get_post_meta( $page->ID, Tools::META, true ), "tool page exists: {$tool_id}" );
	st_assert( $page && '' !== get_post_meta( $page->ID, Seo::META_DESCRIPTION, true ), "tool meta description: {$tool_id}" );
	$html = do_shortcode( '[stardew_tool id="' . $tool_id . '"]' );
	st_assert( false !== strpos( $html, 'class="answer"' ) && false !== strpos( $html, '<form class="tool-form"' ), "tool renders answer and form: {$tool_id}" );
	st_assert( false !== strpos( $html, 'Verified for Stardew Valley 1.6.15' ), "tool shows verified badge: {$tool_id}" );
	st_assert( file_exists( STARDEW_TOOLS_DIR . 'assets/js/tools/' . Tools::definitions()[ $tool_id ]['script'] . '.js' ), "tool script exists: {$tool_id}" );
}
st_assert( '' === do_shortcode( '[stardew_tool id="nope"]' ), 'unknown tool renders nothing' );
$edited = get_page_by_path( 'greenhouse-planner', OBJECT, 'page' );
wp_update_post( array( 'ID' => $edited->ID, 'post_title' => 'My planner' ) );
Tools::install();
st_assert( 'My planner' === get_post( $edited->ID )->post_title, 'published tool page is not overwritten' );
wp_update_post( array( 'ID' => $edited->ID, 'post_title' => Tools::definitions()['greenhouse-planner']['title'] ) );
$best = do_shortcode( '[stardew_tool id="best-spring-crops"]' );
st_assert( false !== strpos( $best, '<tbody>' ) && false !== strpos( $best, 'Rhubarb' ), 'best crops table is rendered on the server' );
$answers = Data::get( 'answers' );
st_assert( isset( $answers['best_crops']['greenhouse'] ) && isset( $answers['decision']['new_farm']['best']['name'] ), 'answers: best crops and decision examples' );
st_assert( 'Rhubarb' === $answers['crop_profit']['spring'][0]['name'], 'answers: Spring 1 best is Rhubarb' );
$purged = 0;
add_action( 'litespeed_purge_all', function () use ( &$purged ) { $purged++; } );
use Stardew_Tools\Release;
delete_option( Release::OPTION );
Release::maybe_run();
Release::maybe_run();
st_assert( 1 === $purged, 'page cache purged once after a deploy' );
update_option( Release::OPTION, 'old' );
add_option( Release::LOCK, time() );
Release::maybe_run();
st_assert( 1 === $purged && 'old' === get_option( Release::OPTION ), 'a second request waits while another installs' );
update_option( Release::LOCK, time() - 3600 );
Release::maybe_run();
st_assert( 2 === $purged && Release::fingerprint() === get_option( Release::OPTION ) && false === get_option( Release::LOCK ), 'a stale lock is taken over and released' );
st_assert( 0 === strpos( Release::fingerprint(), STARDEW_TOOLS_VERSION . ':' ), 'fingerprint starts with the version' );
$other = get_page_by_path( 'crafting-calculator', OBJECT, 'page' );
st_assert( '' !== get_post_meta( $edited->ID, Release::LASTMOD_META, true ) && '' !== get_post_meta( $other->ID, Release::LASTMOD_META, true ), 'deploy stamps a lastmod on each page' );
st_assert( array() === Release::stamp_pages(), 'an unchanged deploy moves no lastmod' );
update_post_meta( $edited->ID, Release::LASTMOD_META, '2026-01-02T00:00:00+00:00' );
update_post_meta( $other->ID, Release::LASTMOD_META, '2026-01-02T00:00:00+00:00' );
wp_update_post( array( 'ID' => $edited->ID, 'post_title' => 'My planner' ) );
st_assert( array( $edited->ID ) === Release::stamp_pages(), 'a change to one page moves only that page' );
st_assert( '2026-01-02T00:00:00+00:00' === get_post_meta( $other->ID, Release::LASTMOD_META, true ), 'other pages keep their lastmod' );
wp_update_post( array( 'ID' => $edited->ID, 'post_title' => Tools::definitions()['greenhouse-planner']['title'] ) );
Release::stamp_pages();
$entry = function ( $page ) {
	return apply_filters( 'wp_sitemaps_posts_entry', array( 'loc' => 'x', 'lastmod' => '2026-01-01T00:00:00+00:00' ), $page, 'page' )['lastmod'];
};
st_assert( '2026-01-02T00:00:00+00:00' === $entry( $other ), 'sitemap lastmod is the page stamp, not the release date' );
st_assert( strtotime( $entry( get_post( $edited->ID ) ) ) > strtotime( '2026-10-01' ), 'sitemap lastmod of the changed page is recent' );
$map = Tools::module_versions();
$key = STARDEW_TOOLS_URL . 'assets/js/engine/index.js';
st_assert( isset( $map[ $key ] ) && false !== strpos( $map[ $key ], '?ver=' . STARDEW_TOOLS_VERSION . '.' ), 'import map versions engine modules' );
$slim = Tools::slim_crops();
st_assert( ! isset( $slim['parsnip']['problems'] ) && 1 === count( $slim['parsnip']['sources'] ), 'inline crops are slimmed' );

echo "Guides and hubs\n";
use Stardew_Tools\Guides;
Guides::install();
foreach ( Guides::hubs() as $hub_id => $hub ) {
	$page = get_page_by_path( $hub_id, OBJECT, 'page' );
	st_assert( $page && 'publish' === $page->post_status && 0 === (int) $page->post_parent, "hub page exists: {$hub_id}" );
	$html = do_shortcode( '[stardew_hub id="' . $hub_id . '"]' );
	st_assert( false !== strpos( $html, '<h2' ) && false !== strpos( $html, '/' . $hub_id . '/' ), "hub renders: {$hub_id}" );
}
$g_answers = Data::get( 'answers' )['guides'];
foreach ( Guides::guides() as $guide_id => $guide ) {
	$page = get_page_by_path( $guide['hub'] . '/' . $guide_id, OBJECT, 'page' );
	st_assert( $page && 'publish' === $page->post_status && get_page_by_path( $guide['hub'] )->ID === (int) $page->post_parent, "guide is a child of its hub: {$guide_id}" );
	st_assert( $page && '' !== get_post_meta( $page->ID, Seo::META_DESCRIPTION, true ), "guide meta description: {$guide_id}" );
	$html = do_shortcode( '[stardew_guide id="' . $guide_id . '"]' );
	st_assert( false !== strpos( $html, 'Work it out for your farm' ) && false !== strpos( $html, 'class="results-table"' ), "guide renders with a table and a tool link: {$guide_id}" );
	st_assert( 0 === preg_match( '/\b(delve|tapestry|in conclusion|it\'s worth noting)\b/i', $html ), "guide has no stock AI phrases: {$guide_id}" );
}
st_assert( ! empty( $g_answers['kegs'] ) && ! empty( $g_answers['fertilizer']['rows'] ) && ! empty( $g_answers['pigs']['payback_raw'] ), 'answers carry the guide numbers' );
$kegs_html = do_shortcode( '[stardew_guide id="how-many-kegs-do-i-need"]' );
st_assert( false !== strpos( $kegs_html, (string) $g_answers['kegs'][0]['name'] ), 'kegs guide prints the engine numbers' );
st_assert( count( Guides::for_tool( 'keg-vs-preserves-jar' ) ) >= 1, 'tools list the guides that mention them' );
foreach ( array_keys( Tools::definitions() ) as $tool_id ) {
	if ( count( Tools::learn_more( $tool_id ) ) < 2 ) {
		st_assert( false, "tool has at least two Learn more links: {$tool_id}" );
	}
}
st_assert( true, 'every tool has a Learn more row' );
$guide_page = get_page_by_path( 'artisan-goods/how-many-kegs-do-i-need', OBJECT, 'page' );
$crumbs     = wp_list_pluck( Seo::breadcrumb_trail( $guide_page->ID ), 'name' );
st_assert( array( 'Home', 'Artisan Goods', 'How Many Kegs Do I Need?' ) === $crumbs, 'breadcrumbs use short names' );
$meth = get_page_by_path( 'methodology', OBJECT, 'page' );
st_assert( false === strpos( Seo::breadcrumb_trail( $meth->ID )[1]['name'], '&amp;' ), 'breadcrumb names are plain text' );
$long = array();
foreach ( array_merge( Tools::definitions(), Guides::hubs(), Guides::guides() ) as $did => $d ) {
	if ( mb_strlen( $d['description'] ) > 155 ) {
		$long[] = $did;
	}
}
foreach ( Pages::definitions() as $did => $d ) {
	if ( mb_strlen( $d[2] ) > 155 ) {
		$long[] = $did;
	}
}
st_assert( ! $long, 'meta descriptions are 155 characters or less: ' . implode( ', ', $long ) );

echo "Reference pages, data downloads and search\n";
use Stardew_Tools\Entities;
use Stardew_Tools\Search;
Entities::install();
$ent = Entities::data();
st_assert( count( $ent['crops'] ) >= 40 && count( $ent['animals'] ) >= 10 && 2 === count( $ent['machines'] ), 'entities.json has crops, animals and both machines' );
foreach ( Entities::types() as $type => $t ) {
	$index = get_page_by_path( $t['slug'], OBJECT, 'page' );
	st_assert( $index && 'publish' === $index->post_status && '' !== get_post_meta( $index->ID, Seo::META_DESCRIPTION, true ), "index page published with a description: {$type}" );
	foreach ( array_keys( $ent[ $type ] ) as $id ) {
		if ( ! Entities::has_page( $type, $id ) ) {
			continue;
		}
		$page = get_page_by_path( $t['slug'] . '/' . $id, OBJECT, 'page' );
		if ( ! $page || 'publish' !== $page->post_status || (int) $page->post_parent !== $index->ID ) {
			st_assert( false, "entity page is a published child of its index: {$type}/{$id}" );
			continue;
		}
		$html  = do_shortcode( '[stardew_entity type="' . $type . '" id="' . $id . '"]' );
		$words = str_word_count( wp_strip_all_tags( $html ) );
		if ( $words < 350 || false === strpos( $html, 'results-table' ) || false !== strpos( $html, 'NaN' ) || false !== strpos( $html, 'Warning:' ) ) {
			st_assert( false, "entity page is not thin and renders cleanly ({$words} words): {$type}/{$id}" );
		}
	}
}
st_assert( true, 'every entity page published, not thin, no NaN or PHP warnings' );
$parsnip_html = do_shortcode( '[stardew_entity type="crops" id="parsnip"]' );
st_assert( false !== strpos( $parsnip_html, 'More Spring crops' ) && false !== strpos( $parsnip_html, '/crops/cauliflower/' ), 'crop pages link every crop of their season' );
$duck_html = do_shortcode( '[stardew_entity type="animals" id="duck"]' );
st_assert( false !== strpos( $duck_html, 'Barn animals' ) && false !== strpos( $duck_html, '/farm-animals/goat/' ), 'animal pages link every other animal' );
st_assert( false !== strpos( do_shortcode( '[stardew_tool id="best-summer-crops"]' ), '/crops/blueberry/' ), 'best crops tables link each crop' );
// An owner's title on an entity page survives the next deploy; an untouched one follows the data.
$melon = get_page_by_path( 'crops/melon', OBJECT, 'page' );
wp_update_post( array( 'ID' => $melon->ID, 'post_title' => 'Melon, my notes' ) );
Entities::install();
st_assert( 'Melon, my notes' === get_post( $melon->ID )->post_title, 'an entity title edited by the owner is kept' );
$melon_def = Entities::def( 'crops', 'melon' );
wp_update_post( array( 'ID' => $melon->ID, 'post_title' => $melon_def['title'] ) );
// A page whose entry is gone goes back to draft; the others stay published.
$ghost = wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Ghost crop', 'post_content' => '[stardew_entity type="crops" id="ghost"]' ) );
update_post_meta( $ghost, Entities::META, 'entity:crops:ghost' );
$retired = Release::retire_orphans();
st_assert( array( $ghost ) === $retired && 'draft' === get_post_status( $ghost ), 'orphaned pages are moved to draft, nothing else' );
wp_delete_post( $ghost, true );
$data_page = get_page_by_path( 'data', OBJECT, 'page' );
st_assert( $data_page && 'publish' === $data_page->post_status, 'data page is published' );
foreach ( array_keys( Entities::csv_files() ) as $csv ) {
	$path = STARDEW_TOOLS_DIR . 'assets/data/' . $csv;
	st_assert( is_readable( $path ) && substr_count( (string) file_get_contents( $path ), "\n" ) > 10, "CSV exists: {$csv}" ); // phpcs:ignore WordPress.WP.AlternativeFunctions
}
$index_items = Search::index();
$kinds       = array_count_values( array_column( $index_items, 'k' ) );
st_assert( count( $index_items ) > 80 && ! empty( $kinds['Tool'] ) && ! empty( $kinds['Guide'] ) && ! empty( $kinds['Crop'] ) && ! empty( $kinds['Animal'] ), 'search index covers tools, guides, crops and animals' );
st_assert( 0 === count( array_filter( $index_items, function ( $i ) { return '' === $i['u'] || '' === $i['t']; } ) ), 'every search entry has a title and a url' );
$find = function ( $title, $kind ) use ( $index_items ) {
	foreach ( $index_items as $i ) {
		if ( $title === $i['t'] && $kind === $i['k'] ) {
			return $i['u'];
		}
	}
	return '';
};
st_assert( false !== strpos( $find( 'Abigail', 'Villager' ), '/villagers/abigail/' ) && false !== strpos( $find( 'Sturgeon', 'Fish pond' ), '/fish-pond-calculator/?fish=sturgeon' ) && false !== strpos( $find( 'Keg', 'Recipe' ), '/crafting-calculator/?recipe=keg' ), 'search finds villager pages, pond fish and recipes (tools open set to them)' );
Search::flush();
$cached = Search::cached();
st_assert( Search::cached()['hash'] === $cached['hash'] && false !== strpos( Search::index_url(), 'stardew-tools/v1/search' ) && false !== strpos( Search::index_url(), 'v=' . $cached['hash'] ), 'search index is cached and served from a versioned URL' );
$req = new WP_REST_Request( 'GET', '/stardew-tools/v1/search' );
$res = rest_do_request( $req );
st_assert( 200 === $res->get_status() && count( $res->get_data() ) === count( $index_items ), 'search index REST route returns the index' );
ob_start();
Search::dialog();
$dialog_html = ob_get_clean();
st_assert( false === strpos( $dialog_html, 'site-search-index' ) && false !== strpos( $dialog_html, 'data-index-url=' ), 'search index is no longer inlined in every page' );

echo "Page refresh, llms.txt, dates, LinkedIn\n";
$llms = Stardew_Tools\Llms::build();
st_assert( false !== strpos( $llms, '# Stardew Tools' ) && false !== strpos( $llms, '/crop-profit-calculator/' ) && false !== strpos( $llms, '/are-casks-worth-it/' ) && false === stripos( $llms, 'hello world' ), 'llms.txt lists real tools and guides, not the sample post' );
st_assert( Data::modified( '2099-01-01' ) === '2099-01-01' && Data::modified( '2000-01-01' ) === Data::summary()['checked'], 'modified date is never earlier than the page was published' );
$about = get_page_by_path( 'about', OBJECT, 'page' );
$meth  = get_page_by_path( 'methodology', OBJECT, 'page' );
st_assert( $about && $meth && false !== strpos( Pages::render_template( 'about' ), 'linkedin.com/in/' ) && false !== strpos( Pages::render_template( 'methodology' ), 'linkedin.com/in/' ), 'About and Methodology templates link the founder LinkedIn' );
// An edited title is left alone; an untouched one is refreshed.
$probe = wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'draft', 'post_title' => 'Probe old', 'post_content' => 'x' ) );
Pages::sync_generated( $probe, 'Probe new' );
st_assert( 'Probe new' === get_post( $probe )->post_title, 'legacy generated title is refreshed' );
wp_update_post( array( 'ID' => $probe, 'post_title' => 'Owner edit' ) );
Pages::sync_generated( $probe, 'Probe newer' );
st_assert( 'Owner edit' === get_post( $probe )->post_title, 'a title edited by the owner is kept' );
wp_delete_post( $probe, true );

echo "Tools and Guides index pages\n";
$tools_page  = get_page_by_path( 'tools', OBJECT, 'page' );
$guides_page = get_page_by_path( 'guides', OBJECT, 'page' );
st_assert( $tools_page && $guides_page && 'publish' === $tools_page->post_status && 'publish' === $guides_page->post_status, 'Tools and Guides pages are created' );
$tools_html  = do_shortcode( $tools_page->post_content );
$guides_html = do_shortcode( $guides_page->post_content );
st_assert( substr_count( $tools_html, 'related-list' ) >= 4 && false !== strpos( $tools_html, '/crop-profit-calculator/' ) && false !== strpos( $tools_html, '/best-spring-crops/' ), 'Tools page groups and links every live tool' );
st_assert( false !== strpos( $guides_html, '/are-casks-worth-it/' ) && false !== strpos( $guides_html, '/crops-and-farming/' ), 'Guides page links each topic and its guides' );
$every_tool = true;
foreach ( Tools::definitions() as $tid => $tdef ) {
	if ( Tools::url( $tid ) && false === strpos( $tools_html, Tools::url( $tid ) ) ) {
		$every_tool = false;
	}
}
st_assert( $every_tool, 'no live tool is missing from the Tools page' );

echo "Topic hubs\n";
foreach ( array( 'crops-and-farming', 'artisan-goods', 'animals', 'fishing', 'greenhouse' ) as $hub_id ) {
	$hub_html = do_shortcode( '[stardew_hub id="' . $hub_id . '"]' );
	$hub_words = str_word_count( wp_strip_all_tags( $hub_html ) );
	st_assert( $hub_words >= 500 && false !== strpos( $hub_html, '<table' ) && false === strpos( $hub_html, 'Warning' ) && false === strpos( $hub_html, 'Notice' ), "hub $hub_id has substantive text and a data table ($hub_words words)" );
}

echo "Phase 6 content: tables, villagers, bundles, share images, llms.txt\n";
foreach ( array( 'crop-profit-calculator', 'what-to-plant', 'keg-vs-preserves-jar', 'ancient-fruit-vs-starfruit', 'greenhouse-planner', 'fish-pond-calculator', 'animal-profit-calculator', 'xp-calculator', 'gift-finder', 'bundle-tracker', 'crafting-calculator' ) as $tid ) {
	$tool_html = do_shortcode( '[stardew_tool id="' . $tid . '"]' );
	st_assert( false !== strpos( $tool_html, 'tool-reference' ) && substr_count( $tool_html, '<tr' ) >= 3, "tool $tid sends a filled reference table in the HTML" );
}
$ent = Stardew_Tools\Data::get( 'entities' );
st_assert( count( $ent['villagers'] ) >= 30 && isset( $ent['villagers']['haley'] ), 'entities.json has the villagers' );
$haley = get_page_by_path( 'villagers/haley', OBJECT, 'page' );
st_assert( $haley && 'publish' === $haley->post_status, 'villager page /villagers/haley/ is published' );
$haley_html = $haley ? do_shortcode( $haley->post_content ) : '';
st_assert( false !== strpos( $haley_html, 'Sunflower' ) && false !== strpos( $haley_html, 'Spring 14' ), 'Haley page names a loved gift and her birthday' );
$pantry = get_page_by_path( 'bundles/pantry', OBJECT, 'page' );
st_assert( $pantry && false !== strpos( do_shortcode( $pantry->post_content ), 'Greenhouse' ), 'Pantry bundle page is published and names its reward' );
st_assert( ! get_page_by_path( 'bundles/vault', OBJECT, 'page' ), 'Vault has no thin page of its own' );
st_assert( file_exists( STARDEW_TOOLS_DIR . 'assets/og/crop-starfruit.jpg' ) && file_exists( STARDEW_TOOLS_DIR . 'assets/og/villager-haley.jpg' ), 'share images exist for entity pages' );
st_assert( file_exists( STARDEW_TOOLS_DIR . 'assets/data/datapackage.json' ), 'datapackage.json is written' );
$llms = Stardew_Tools\Llms::build();
st_assert( false === strpos( $llms, 'in-game check' ) && false !== strpos( $llms, 'datapackage.json' ) && false !== strpos( $llms, '/fishing/' ), 'llms.txt lists hubs and data without the in-game claim' );
foreach ( array( 'crops-and-farming', 'artisan-goods', 'animals', 'fishing', 'greenhouse' ) as $hub_id ) {
	st_assert( false !== strpos( do_shortcode( '[stardew_hub id="' . $hub_id . '"]' ), 'quick-questions' ), "hub $hub_id has Quick questions" );
}
$faq = false;
foreach ( glob( STARDEW_TOOLS_DIR . 'includes/*.php' ) as $php_file ) {
	$faq = $faq || false !== strpos( file_get_contents( $php_file ), '"FAQPage"' ) || false !== strpos( file_get_contents( $php_file ), "'FAQPage'" );
}
st_assert( ! $faq, 'Quick questions add no FAQPage schema' );

echo "Phase 2 (2026-10-26) technical SEO\n";
$parts = Seo::title_parts( array( 'title' => 'Sweet Gem Berry in Stardew Valley: Price, Uses and Profit' ) );
st_assert( ! isset( $parts['site'] ), 'a long title drops the brand suffix' );
$parts = Seo::title_parts( array( 'title' => 'Gift Finder' ) );
st_assert( 'Stardew Tools' === $parts['site'], 'a short title keeps the brand suffix' );
$embed = Seo::oembed_data( array( 'title' => 'x', 'author_name' => 'admin', 'author_url' => 'https://example.com/author/admin/' ) );
st_assert( ! isset( $embed['author_name'] ) && ! isset( $embed['author_url'] ) && 'x' === $embed['title'], 'oEmbed leaves out the author' );
$tool_defs = Tools::definitions();
st_assert( Data::checked( $tool_defs['what-to-plant']['data'] ) === Tools::checked( $tool_defs['what-to-plant'] ), 'tool date comes from its own data files' );
st_assert( Data::checked( array( 'gifts' ) ) === Tools::checked( $tool_defs['gift-finder'] ), 'Gift Finder date is the gifts data date' );
$pantry = Stardew_Tools\Entities::url( 'bundles', 'pantry' );
st_assert( $pantry && false !== strpos( do_shortcode( '[stardew_entity type="crops" id="parsnip"]' ), 'href="' . $pantry . '"' ), 'crop page links its bundle room' );
$tracker = do_shortcode( '[stardew_tool id="bundle-tracker"]' );
st_assert( substr_count( $tracker, 'href="' . Stardew_Tools\Entities::url( 'bundles', 'crafts-room' ) . '"' ) >= 1 && false !== strpos( $tracker, 'data-room-urls="{' ), 'Bundle Tracker links each room page' );
st_assert( false !== strpos( do_shortcode( '[stardew_guide id="how-to-make-money-year-1"]' ), 'href="' . $pantry . '">Pantry</a>' ), 'Year 1 guide links the Pantry page' );
st_assert( '' !== Stardew_Tools\Entities::og_file( 'tool-best-spring-crops' ), 'best crops pages have a share image' );
st_assert( ! current_theme_supports( 'automatic-feed-links' ), 'theme prints no feed links' );

echo "Speed, security and ops (audit 2026-10-26 Phase 5)\n";
global $wpdb;
$headers = apply_filters( 'wp_headers', array() );
st_assert( 'nosniff' === $headers['X-Content-Type-Options'] && 'SAMEORIGIN' === $headers['X-Frame-Options'] && 'strict-origin-when-cross-origin' === $headers['Referrer-Policy'] && isset( $headers['Permissions-Policy'] ), 'security headers are sent' );
st_assert( ! isset( $headers['Strict-Transport-Security'] ), 'no HSTS on an http site' );
$parsnip_page = get_page_by_path( 'crops/parsnip', OBJECT, 'page' );
Pages::flush_urls();
st_assert( get_permalink( $parsnip_page ) === Entities::url( 'crops', 'parsnip' ), 'page map gives the same address as get_permalink' );
Pages::flush_urls();
$queries = $wpdb->num_queries;
Entities::url( 'crops', 'melon' );
st_assert( $wpdb->num_queries - $queries <= 10, 'building the page map costs a handful of queries (' . ( $wpdb->num_queries - $queries ) . ')' );
$queries = $wpdb->num_queries;
foreach ( array_keys( Entities::data()['crops'] ) as $crop_id ) {
	Entities::url( 'crops', $crop_id );
}
Tools::url( 'crop-profit-calculator' );
Guides::hub_url( 'crops-and-farming' );
st_assert( $wpdb->num_queries === $queries, 'every later crop, tool and hub link costs no query' );
wp_update_post( array( 'ID' => $parsnip_page->ID, 'post_status' => 'draft' ) );
st_assert( '' === Entities::url( 'crops', 'parsnip' ), 'a drafted page drops out of the map' );
st_assert( ! Pages::may_republish( get_post( $parsnip_page->ID ) ), 'a page the owner drafted is not republished' );
Entities::install();
st_assert( 'draft' === get_post_status( $parsnip_page->ID ), 'the next deploy keeps the owner draft' );
update_post_meta( $parsnip_page->ID, Pages::RETIRED_META, gmdate( 'c' ) );
Entities::install();
st_assert( 'publish' === get_post_status( $parsnip_page->ID ) && '' === get_post_meta( $parsnip_page->ID, Pages::RETIRED_META, true ), 'a retired page whose entry is back is republished' );
st_assert( get_permalink( $parsnip_page->ID ) === Entities::url( 'crops', 'parsnip' ), 'a republished page is back in the map' );
$ghost = wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Ghost tool', 'post_content' => '[stardew_tool id="ghost"]' ) );
update_post_meta( $ghost, Tools::META, 'ghost' );
Release::retire_orphans();
st_assert( '' !== get_post_meta( $ghost, Pages::RETIRED_META, true ), 'retire_orphans marks the pages it drafts' );
wp_delete_post( $ghost, true );
// A save filter that changes the text must not stop the page from refreshing later.
$about = get_page_by_path( 'about', OBJECT, 'page' );
$mark  = function ( $c ) {
	return $c . ' ';
};
add_filter( 'content_save_pre', $mark );
Pages::sync_generated( $about->ID, null, null, 'Generated about text' );
remove_filter( 'content_save_pre', $mark );
$hashes = get_post_meta( $about->ID, Pages::GENERATED_META, true );
st_assert( md5( get_post_field( 'post_content', $about->ID, 'raw' ) ) === $hashes['content'], 'generated text hash is of the saved text' );
Pages::sync_generated( $about->ID, null, null, 'Generated about text' );
st_assert( 'Generated about text' === get_post_field( 'post_content', $about->ID, 'raw' ), 'a filtered page still refreshes on the next deploy' );
Pages::install();
// Release: visitors only schedule the install; cron runs it, or a visitor after the grace time.
st_assert( Release::fingerprint( false ) === Release::fingerprint(), 'cached fingerprint matches a fresh one' );
$before = $purged;
set_transient( Search::CACHE, array( 'v' => 'stale' ) );
update_option( Release::OPTION, 'old' );
wp_clear_scheduled_hook( Release::HOOK );
Release::defer();
st_assert( false !== wp_next_scheduled( Release::HOOK ) && $before === $purged && 'old' === get_option( Release::OPTION ), 'a visitor request schedules the install instead of running it' );
Release::defer();
st_assert( $before === $purged, 'a second visitor does not run it while it is scheduled' );
wp_clear_scheduled_hook( Release::HOOK );
wp_schedule_single_event( time() - 3600, Release::HOOK );
Release::defer();
st_assert( $before + 1 === $purged && Release::fingerprint() === get_option( Release::OPTION ) && false === wp_next_scheduled( Release::HOOK ), 'an install cron never ran runs in the visitor request' );
do_action( Release::HOOK );
st_assert( $before + 1 === $purged, 'the cron event does nothing once installed' );
$search_cache = get_transient( Search::CACHE );
st_assert( ! is_array( $search_cache ) || 'stale' !== $search_cache['v'], 'a deploy clears the search index cache' );
@unlink( ABSPATH . 'favicon.ico' ); // phpcs:ignore
Release::root_favicon();
st_assert( ! wp_is_writable( ABSPATH ) || file_get_contents( ABSPATH . 'favicon.ico' ) === file_get_contents( STARDEW_TOOLS_DIR . 'assets/brand/favicon.ico' ), 'site root gets favicon.ico' ); // phpcs:ignore
foreach ( array( 'engine', 'tools' ) as $dir ) {
	st_assert( false !== strpos( (string) file_get_contents( STARDEW_TOOLS_DIR . "assets/js/{$dir}/.htaccess" ), 'must-revalidate' ), "{$dir} modules are not cached as immutable" ); // phpcs:ignore
}

echo "Theme\n";
$theme = wp_get_theme( 'stardew-tools-theme' );
st_assert( $theme->exists() && ! $theme->errors(), 'bundled theme is registered and valid' );

echo "\n{$st_passes} passed, {$st_failures} failed\n";
if ( $st_failures ) {
	exit( 1 );
}

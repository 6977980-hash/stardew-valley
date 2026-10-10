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
st_assert( preg_match( "/Disallow: \\/wp-admin\\/\nDisallow: \\/\\?s=\nDisallow: \\/search\\/\n\nSitemap:/", $robots ), 'robots.txt rules stay in the user-agent group' );

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
delete_option( Tools::VERSION_OPTION );
Tools::maybe_install();
Tools::maybe_install();
st_assert( 1 === $purged, 'page cache purged once after a version change' );
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

echo "Theme\n";
$theme = wp_get_theme( 'stardew-tools-theme' );
st_assert( $theme->exists() && ! $theme->errors(), 'bundled theme is registered and valid' );

echo "\n{$st_passes} passed, {$st_failures} failed\n";
if ( $st_failures ) {
	exit( 1 );
}

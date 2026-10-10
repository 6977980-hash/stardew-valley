<?php
/**
 * Plugin Name:       Stardew Tools
 * Plugin URI:        https://stardewtools.net/
 * Description:       Core of StardewTools.net: brand identity, SEO foundation, ad slots, site pages, verified game data, calculators and the Stardew Tools theme.
 * Version:           0.8.1
 * Requires at least: 6.4
 * Requires PHP:      7.4
 * Author:            Ali Ahmad
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       stardew-tools
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'STARDEW_TOOLS_VERSION', '0.8.1' );
define( 'STARDEW_TOOLS_FILE', __FILE__ );
define( 'STARDEW_TOOLS_DIR', plugin_dir_path( __FILE__ ) );
define( 'STARDEW_TOOLS_URL', plugin_dir_url( __FILE__ ) );

require_once STARDEW_TOOLS_DIR . 'includes/class-config.php';
require_once STARDEW_TOOLS_DIR . 'includes/class-head.php';
require_once STARDEW_TOOLS_DIR . 'includes/class-seo.php';
require_once STARDEW_TOOLS_DIR . 'includes/class-ads.php';
require_once STARDEW_TOOLS_DIR . 'includes/class-pages.php';
require_once STARDEW_TOOLS_DIR . 'includes/class-data.php';
require_once STARDEW_TOOLS_DIR . 'includes/class-tools.php';
require_once STARDEW_TOOLS_DIR . 'includes/class-guides.php';
require_once STARDEW_TOOLS_DIR . 'includes/class-entities.php';
require_once STARDEW_TOOLS_DIR . 'includes/class-search.php';
require_once STARDEW_TOOLS_DIR . 'includes/class-llms.php';
require_once STARDEW_TOOLS_DIR . 'includes/class-admin.php';

/**
 * The Stardew Tools theme ships inside this plugin (theme/stardew-tools-theme) so one
 * GitHub repo and one Hostinger deployment cover both. It appears under Appearance > Themes
 * while this plugin is active.
 */
register_theme_directory( STARDEW_TOOLS_DIR . 'theme' );

/**
 * Brand value accessor for themes and templates.
 *
 * @param string $key Config key, e.g. 'brand_name', 'tagline'. Empty returns the whole config.
 * @return mixed
 */
function stardew_tools_brand( $key = '' ) {
	return Stardew_Tools\Config::get( $key );
}

/**
 * Echo an ad slot. Prints nothing while ads are switched off or the slot has no ID.
 *
 * @param string $placement One of Stardew_Tools\Ads::PLACEMENTS keys.
 */
function stardew_tools_ad( $placement ) {
	echo Stardew_Tools\Ads::render( $placement ); // phpcs:ignore WordPress.Security.EscapeOutput -- built from escaped parts.
}

/**
 * Published tools for the theme: id, short name, question, blurb, icon and URL.
 *
 * @return array[]
 */
function stardew_tools_live_tools() {
	$out = array();
	foreach ( Stardew_Tools\Tools::definitions() as $id => $def ) {
		$url = Stardew_Tools\Tools::url( $id );
		if ( $url ) {
			$out[] = array_merge( array( 'id' => $id, 'url' => $url ), $def );
		}
	}
	return $out;
}

Stardew_Tools\Head::init();
Stardew_Tools\Seo::init();
Stardew_Tools\Ads::init();
Stardew_Tools\Pages::init();
Stardew_Tools\Tools::init();
Stardew_Tools\Guides::init();
Stardew_Tools\Entities::init();
Stardew_Tools\Search::init();
Stardew_Tools\Llms::init();
Stardew_Tools\Admin::init();

register_activation_hook( __FILE__, array( 'Stardew_Tools\Pages', 'install' ) );

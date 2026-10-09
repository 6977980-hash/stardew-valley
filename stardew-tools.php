<?php
/**
 * Plugin Name:       Stardew Tools
 * Plugin URI:        https://stardewtools.net
 * Description:       Tools and calculators for Stardew Valley players on stardewtools.net.
 * Version:           0.1.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Ali Ahmad
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       stardew-tools
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'STARDEW_TOOLS_VERSION', '0.1.0' );
define( 'STARDEW_TOOLS_URL', plugin_dir_url( __FILE__ ) );

/**
 * Register front-end styles; they are enqueued only when a shortcode is used.
 */
function stardew_tools_register_assets() {
	wp_register_style(
		'stardew-tools',
		STARDEW_TOOLS_URL . 'assets/stardew-tools.css',
		array(),
		STARDEW_TOOLS_VERSION
	);
}
add_action( 'wp_enqueue_scripts', 'stardew_tools_register_assets' );

/**
 * [stardew_tools] shortcode: placeholder block confirming the plugin works.
 */
function stardew_tools_shortcode() {
	wp_enqueue_style( 'stardew-tools' );

	return '<div class="stardew-tools"><h3>' . esc_html__( 'Stardew Tools', 'stardew-tools' ) . '</h3><p>'
		. esc_html__( 'Stardew Tools plugin is active. Calculators coming soon.', 'stardew-tools' )
		. '</p></div>';
}
add_shortcode( 'stardew_tools', 'stardew_tools_shortcode' );

/**
 * Admin page under Tools > Stardew Tools.
 */
function stardew_tools_admin_menu() {
	add_management_page(
		__( 'Stardew Tools', 'stardew-tools' ),
		__( 'Stardew Tools', 'stardew-tools' ),
		'manage_options',
		'stardew-tools',
		'stardew_tools_admin_page'
	);
}
add_action( 'admin_menu', 'stardew_tools_admin_menu' );

function stardew_tools_admin_page() {
	echo '<div class="wrap"><h1>' . esc_html__( 'Stardew Tools', 'stardew-tools' ) . '</h1>';
	echo '<p>' . esc_html( sprintf( __( 'Version %s is installed and deployed from GitHub.', 'stardew-tools' ), STARDEW_TOOLS_VERSION ) ) . '</p>';
	echo '<p>' . esc_html__( 'Add the [stardew_tools] shortcode to any page to test it.', 'stardew-tools' ) . '</p></div>';
}

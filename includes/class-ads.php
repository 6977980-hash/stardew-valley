<?php
/**
 * Ad slots that stay invisible until switched on.
 *
 * With "Show ad slots" off (the default) render() returns an empty string: no box, no gap,
 * no label. After AdSense approval the owner pastes the publisher ID and slot IDs under
 * Settings > Stardew Tools and turns slots on. Each slot then reserves its height (no layout
 * shift), carries an "Advertisement" label, and collapses if Google leaves it unfilled.
 *
 * @package Stardew_Tools
 */

namespace Stardew_Tools;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Ads {

	const OPTION = 'stardew_tools_ads';

	/** Placement key => [label, reserved min-height on mobile, desktop]. */
	const PLACEMENTS = array(
		'home-mid'      => array( 'Homepage, between sections', 250, 100 ),
		'below-content' => array( 'Below page content', 250, 100 ),
		'below-result'  => array( 'Below a tool result', 250, 100 ),
		'sidebar'       => array( 'Desktop sidebar (hidden on phones)', 0, 600 ),
		'before-footer' => array( 'Above the footer', 100, 100 ),
	);

	public static function init() {
		add_action( 'wp_head', array( __CLASS__, 'head' ), 5 );
		add_action( 'init', array( __CLASS__, 'maybe_serve_ads_txt' ), 1 );
	}

	public static function defaults() {
		return array(
			'load_script' => false,
			'show_slots'  => false,
			'client'      => '',
			'slots'       => array(),
		);
	}

	public static function settings() {
		$saved = get_option( self::OPTION, array() );
		return wp_parse_args( is_array( $saved ) ? $saved : array(), self::defaults() );
	}

	/** Validate settings from the admin form. Invalid IDs are dropped, never stored. */
	public static function sanitize( $input ) {
		$out    = self::defaults();
		$input  = is_array( $input ) ? $input : array();
		$client = isset( $input['client'] ) ? trim( (string) $input['client'] ) : '';
		if ( preg_match( '/^pub-\d{10,20}$/', $client ) ) {
			$client = 'ca-' . $client;
		}
		$out['client']      = preg_match( '/^ca-pub-\d{10,20}$/', $client ) ? $client : '';
		$out['load_script'] = ! empty( $input['load_script'] ) && '' !== $out['client'];
		$out['show_slots']  = ! empty( $input['show_slots'] ) && $out['load_script'];
		if ( isset( $input['slots'] ) && is_array( $input['slots'] ) ) {
			foreach ( array_keys( self::PLACEMENTS ) as $key ) {
				$id = isset( $input['slots'][ $key ] ) ? trim( (string) $input['slots'][ $key ] ) : '';
				if ( preg_match( '/^\d{6,20}$/', $id ) ) {
					$out['slots'][ $key ] = $id;
				}
			}
		}
		return $out;
	}

	/** Whether ads may appear on the current request (never on 404s or search results). */
	public static function allowed_here() {
		if ( is_admin() || is_feed() || is_404() || is_search() ) {
			return false;
		}
		return (bool) apply_filters( 'stardew_tools_ads_allowed', true );
	}

	/** @return string Slot HTML, or '' when slots are off, unconfigured or not allowed here. */
	public static function render( $placement ) {
		$s = self::settings();
		if ( ! $s['show_slots'] || '' === $s['client'] || empty( $s['slots'][ $placement ] ) || ! isset( self::PLACEMENTS[ $placement ] ) ) {
			return '';
		}
		if ( ! self::allowed_here() ) {
			return '';
		}
		return sprintf(
			'<div class="st-ad st-ad--%1$s" data-placement="%1$s"><span class="st-ad__label">Advertisement</span>' .
			'<ins class="adsbygoogle" style="display:block" data-ad-client="%2$s" data-ad-slot="%3$s" data-ad-format="auto" data-full-width-responsive="true"></ins>' .
			'<script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>',
			esc_attr( $placement ),
			esc_attr( $s['client'] ),
			esc_attr( $s['slots'][ $placement ] )
		);
	}

	/** AdSense loader (needed for site approval) and slot styles, only when configured. */
	public static function head() {
		$s = self::settings();
		if ( ! $s['load_script'] || ! self::allowed_here() ) {
			return;
		}
		printf(
			"<script async src=\"%s\" crossorigin=\"anonymous\"></script>\n",
			esc_url( 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' . rawurlencode( $s['client'] ) )
		);
		if ( ! $s['show_slots'] ) {
			return;
		}
		$css = '.st-ad{margin:2rem auto;text-align:center;max-width:100%;overflow:hidden}' .
			'.st-ad__label{display:block;font-size:.75rem;letter-spacing:.04em;text-transform:uppercase;opacity:.65;margin-bottom:.25rem}' .
			'.st-ad:has(ins[data-ad-status="unfilled"]){display:none}';
		foreach ( self::PLACEMENTS as $key => $p ) {
			$css .= sprintf( '.st-ad--%1$s ins{min-height:%2$dpx}', $key, $p[1] );
			$css .= sprintf( '@media (min-width:900px){.st-ad--%1$s ins{min-height:%2$dpx}}', $key, $p[2] );
		}
		$css .= '@media (max-width:899px){.st-ad--sidebar{display:none}}';
		echo '<style id="stardew-tools-ads">' . $css . "</style>\n"; // phpcs:ignore WordPress.Security.EscapeOutput -- static CSS.
	}

	/** ads.txt line for the configured publisher, e.g. "google.com, pub-123, DIRECT, f08c47fec0942fa0". */
	public static function ads_txt() {
		$s = self::settings();
		if ( '' === $s['client'] ) {
			return '';
		}
		return 'google.com, ' . substr( $s['client'], 3 ) . ", DIRECT, f08c47fec0942fa0\n";
	}

	public static function maybe_serve_ads_txt() {
		$path = isset( $_SERVER['REQUEST_URI'] ) ? wp_parse_url( wp_unslash( $_SERVER['REQUEST_URI'] ), PHP_URL_PATH ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
		$home = wp_parse_url( home_url( '/ads.txt' ), PHP_URL_PATH );
		if ( $path !== $home ) {
			return;
		}
		$body = self::ads_txt();
		if ( '' === $body ) {
			return;
		}
		header( 'Content-Type: text/plain; charset=utf-8' );
		echo $body; // phpcs:ignore WordPress.Security.EscapeOutput -- validated publisher ID.
		exit;
	}
}

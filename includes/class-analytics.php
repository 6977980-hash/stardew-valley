<?php
/**
 * Google Analytics 4 (gtag.js) on every public page.
 *
 * Printed first in <head>, as Google asks. The loader is async, so it never blocks rendering.
 * Both tags carry data-no-optimize / data-no-defer so LiteSpeed Cache does not combine, defer
 * or delay them (a deferred inline gtag() would run after the loader and lose the page view).
 * Logged-in editors and admins are not tracked, so the owner's own visits stay out of reports.
 *
 * @package Stardew_Tools
 */

namespace Stardew_Tools;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Analytics {

	const MEASUREMENT_ID = 'G-ZYXVVT76GG';

	public static function init() {
		add_action( 'wp_head', array( __CLASS__, 'head' ), 1 );
	}

	/** Measurement ID, or '' to switch tracking off (filter stardew_tools_ga_id). */
	public static function id() {
		$id = (string) apply_filters( 'stardew_tools_ga_id', self::MEASUREMENT_ID );
		return preg_match( '/^G-[A-Z0-9]{4,20}$/', $id ) ? $id : '';
	}

	/** Whether this request is tracked: not admin screens, previews, feeds or editors' own visits. */
	public static function allowed_here() {
		if ( is_admin() || is_feed() || is_preview() || is_customize_preview() ) {
			return false;
		}
		if ( current_user_can( 'edit_posts' ) ) {
			return false;
		}
		return (bool) apply_filters( 'stardew_tools_ga_allowed', true );
	}

	public static function head() {
		$id = self::id();
		if ( '' === $id || ! self::allowed_here() ) {
			return;
		}
		printf(
			"<script async src=\"%s\" data-no-optimize=\"1\" data-no-defer=\"1\"></script>\n",
			esc_url( 'https://www.googletagmanager.com/gtag/js?id=' . rawurlencode( $id ) )
		);
		printf(
			"<script data-no-optimize=\"1\" data-no-defer=\"1\">window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','%s');</script>\n",
			esc_js( $id )
		);
	}
}

<?php
/**
 * Central site identity. Every brand string, color and default SEO value lives here so
 * nothing is hard-coded across templates. Override with the `stardew_tools_config` filter.
 *
 * @package Stardew_Tools
 */

namespace Stardew_Tools;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Config {

	/** @var array|null */
	private static $config = null;

	public static function defaults() {
		return array(
			'site_domain'      => 'stardewtools.net',
			'site_url'         => 'https://stardewtools.net/',
			'brand_name'       => 'Stardew Tools',
			'tagline'          => 'Calculate. Compare. Decide. Plan.',
			'primary_h1'       => 'Stardew Valley Tools & Planning Hub',
			'short_desc'       => 'Free Stardew Valley calculators, planners, finders, trackers and decision tools to help you make better farm decisions.',
			'home_title'       => 'Stardew Valley Tools, Calculators & Planning Hub | Stardew Tools',
			'meta_description' => 'Free Stardew Valley calculators, planners, finders, trackers and decision tools for crops, profits, fishing, gifts, bundles, greenhouse planning and more.',
			'author'           => 'Ali Ahmad',
			'author_linkedin'  => 'https://www.linkedin.com/in/ali-ahmad-chaudhry-12777486/',
			'contact_email'    => 'contact@stardewtools.net',
			'game_version'     => '1.6.15',
			'disclaimer'       => 'Stardew Valley is a trademark of ConcernedApe. This is a fan-made website and is not affiliated with or endorsed by ConcernedApe.',
			'colors'           => array(
				'primary'      => '#2F6B34',
				'primary_dark' => '#24532A',
				'accent'       => '#E3A72F',
				'soil'         => '#6B4A2B',
				'ink'          => '#1F2A1F',
				'cream'        => '#FBF7EC',
			),
			'og_image'         => 'assets/brand/og-default.png',
			'logo'             => 'assets/brand/logo.svg',
			'icon'             => 'assets/brand/icon.svg',
		);
	}

	/**
	 * @param string $key Key to read; empty for the full array.
	 * @return mixed Null when the key does not exist.
	 */
	public static function get( $key = '' ) {
		if ( null === self::$config ) {
			self::$config = apply_filters( 'stardew_tools_config', self::defaults() );
		}
		if ( '' === $key ) {
			return self::$config;
		}
		return isset( self::$config[ $key ] ) ? self::$config[ $key ] : null;
	}

	/** Absolute URL to a file in the plugin, e.g. Config::asset( 'assets/brand/logo.svg' ). */
	public static function asset( $relative ) {
		return STARDEW_TOOLS_URL . ltrim( $relative, '/' );
	}

	/** Clears the cached config (used by tests after adding a filter). */
	public static function reset() {
		self::$config = null;
	}
}

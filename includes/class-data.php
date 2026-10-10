<?php
/**
 * Read-only access to the verified game data in data/*.json (built by tools/data/*). Tools
 * use it to print their data inline, so a calculator needs no extra request.
 *
 * @package Stardew_Tools
 */

namespace Stardew_Tools;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Data {

	const SETS = array( 'crops', 'fertilizers', 'machines', 'professions', 'seasons', 'greenhouse', 'fishponds', 'animals', 'skills', 'crafting', 'gifts', 'bundles', 'answers', 'entities' );

	private static $cache = array();

	/**
	 * @param string $set One of self::SETS.
	 * @return array|null Decoded data, or null if the set is unknown or unreadable.
	 */
	public static function get( $set ) {
		if ( ! in_array( $set, self::SETS, true ) ) {
			return null;
		}
		if ( ! array_key_exists( $set, self::$cache ) ) {
			$file = STARDEW_TOOLS_DIR . 'data/' . $set . '.json';
			$json = is_readable( $file ) ? file_get_contents( $file ) : false; // phpcs:ignore WordPress.WP.AlternativeFunctions
			$data = false === $json ? null : json_decode( $json, true );
			self::$cache[ $set ] = is_array( $data ) ? $data : null;
		}
		return self::$cache[ $set ];
	}

	/** Crop records keyed by id. Only cross-checked crops unless $include_unverified. */
	public static function crops( $include_unverified = false ) {
		$data = self::get( 'crops' );
		$out  = array();
		foreach ( $data ? $data['crops'] : array() as $crop ) {
			if ( $include_unverified || 'cross-checked' === $crop['verification_status'] ) {
				$out[ $crop['id'] ] = $crop;
			}
		}
		return $out;
	}

	/** Summary for the admin status panel. */
	public static function summary() {
		$data = self::get( 'crops' );
		if ( ! $data ) {
			return array(
				'ok'       => false,
				'crops'    => 0,
				'verified' => 0,
				'version'  => '',
				'checked'  => '',
			);
		}
		return array(
			'ok'       => true,
			'crops'    => count( $data['crops'] ),
			'verified' => count( self::crops() ),
			'version'  => $data['game_version'],
			'checked'  => $data['generated'],
		);
	}

	public static function reset() {
		self::$cache = array();
	}
}

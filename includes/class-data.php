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

	const SETS = array( 'crops', 'fertilizers', 'machines', 'professions', 'seasons', 'greenhouse', 'fishponds', 'animals', 'skills', 'crafting', 'gifts', 'bundles', 'casks', 'dehydrator', 'buildings', 'fruittrees', 'year-one', 'answers', 'entities' );

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

	/** Latest date the given data sets were checked against the wiki (Y-m-d, or ''). */
	public static function checked( $sets = array( 'crops' ) ) {
		$latest = '';
		foreach ( (array) $sets as $set ) {
			$d = self::get( $set );
			foreach ( array( 'last_verified', 'generated' ) as $key ) {
				if ( $d && ! empty( $d[ $key ] ) && strtotime( $d[ $key ] ) > strtotime( $latest ? $latest : '1970-01-01' ) ) {
					$latest = $d[ $key ];
				}
			}
		}
		return $latest;
	}

	/**
	 * Date a page was last updated: the latest of the day it was published, the day its text was
	 * last changed and the day the data it uses was checked.
	 */
	public static function modified( $published = '', $sets = array( 'crops' ), $updated = '' ) {
		$out = self::checked( $sets );
		foreach ( array( $published, $updated ) as $d ) {
			if ( $d && ( ! $out || strtotime( $d ) > strtotime( $out ) ) ) {
				$out = $d;
			}
		}
		return $out;
	}

	public static function reset() {
		self::$cache = array();
	}
}

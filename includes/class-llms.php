<?php
/**
 * Serves /llms.txt: a plain-text map of the site for AI assistants and search tools, built from
 * the same definitions as the pages, so it never lists a page that does not exist. Answers the
 * request before WordPress (or another plugin) can serve an older file.
 *
 * @package Stardew_Tools
 */

namespace Stardew_Tools;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Llms {

	public static function init() {
		add_action( 'parse_request', array( __CLASS__, 'maybe_serve' ), 0 );
	}

	public static function maybe_serve() {
		$path = isset( $_SERVER['REQUEST_URI'] ) ? wp_parse_url( wp_unslash( $_SERVER['REQUEST_URI'] ), PHP_URL_PATH ) : ''; // phpcs:ignore WordPress.Security
		if ( '/llms.txt' !== untrailingslashit( (string) $path ) ) {
			return;
		}
		nocache_headers();
		header( 'Content-Type: text/plain; charset=utf-8' );
		header( 'X-Robots-Tag: noindex' );
		echo self::build(); // phpcs:ignore WordPress.Security.EscapeOutput -- plain text.
		exit;
	}

	/** The file contents. */
	public static function build() {
		$brand = Config::get( 'brand_name' );
		$lines = array(
			'# ' . $brand,
			'',
			'> ' . Config::get( 'short_desc' ) . ' Every number is calculated from game data taken from the Stardew Valley Wiki (version ' . Config::get( 'game_version' ) . '), and every page says when it was last checked. Independent fan site, not affiliated with ConcernedApe.',
			'',
			'Maintained by ' . Config::get( 'author' ) . ' (' . Config::get( 'author_linkedin' ) . ').',
			'',
			'## Calculators and tools',
			'',
		);
		foreach ( Tools::definitions() as $id => $def ) {
			$url = Tools::url( $id );
			if ( $url ) {
				$lines[] = '- [' . $def['short'] . '](' . $url . '): ' . $def['description'];
			}
		}
		$lines[] = '';
		$lines[] = '## Guides';
		$lines[] = '';
		foreach ( Guides::guides() as $id => $def ) {
			$url = Guides::guide_url( $id );
			if ( $url ) {
				$lines[] = '- [' . $def['short'] . '](' . $url . '): ' . $def['description'];
			}
		}
		$lines[] = '';
		$lines[] = '## Reference tables and data';
		$lines[] = '';
		foreach ( Entities::types() as $type => $def ) {
			$url = Entities::url( $type, '' );
			if ( $url ) {
				$lines[] = '- [' . $def['short'] . '](' . $url . '): ' . $def['blurb'];
			}
		}
		$data = get_page_by_path( 'data', OBJECT, 'page' );
		if ( $data && 'publish' === $data->post_status ) {
			$lines[] = '- [Data downloads](' . get_permalink( $data ) . '): The same tables as CSV files, with credit to the Stardew Valley Wiki (CC BY-NC-SA 3.0).';
		}
		$lines[] = '';
		$lines[] = '## About';
		$lines[] = '';
		foreach ( array( 'methodology' => 'Methodology: where the data comes from and how it is verified', 'about' => 'About', 'changelog' => 'Changelog' ) as $slug => $label ) {
			$page = get_page_by_path( $slug, OBJECT, 'page' );
			if ( $page && 'publish' === $page->post_status ) {
				$lines[] = '- [' . $label . '](' . get_permalink( $page ) . ')';
			}
		}
		return implode( "\n", $lines ) . "\n";
	}
}

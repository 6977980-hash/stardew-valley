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
			'> ' . Config::get( 'short_desc' ) . ' Every number is calculated by one engine from game data taken from the Stardew Valley Wiki (version ' . Config::get( 'game_version' ) . ') and kept only when two wiki pages agree. Tool, guide and reference pages show the date their data was last checked. Independent fan site, not affiliated with ConcernedApe.',
			'',
			'Maintained by ' . Config::get( 'author' ) . ' (' . Config::get( 'author_linkedin' ) . '). Corrections: ' . Config::get( 'contact_email' ) . '; every change is logged on the changelog page.',
			'',
		);
		$facts = self::facts();
		if ( $facts ) {
			$lines[] = '## Key facts (Stardew Valley ' . Config::get( 'game_version' ) . ', from our calculations)';
			$lines[] = '';
			foreach ( $facts as $f ) {
				$lines[] = '- ' . $f;
			}
			$lines[] = '';
		}
		$lines[] = '## Calculators and tools';
		$lines[] = '';
		$tools = Pages::url( 'tools' );
		if ( $tools ) {
			$lines[] = '- [All tools](' . $tools . '): every calculator on one page.';
		}
		foreach ( Tools::definitions() as $id => $def ) {
			$url = Tools::url( $id );
			if ( $url ) {
				$lines[] = '- [' . $def['short'] . '](' . $url . '): ' . $def['description'];
			}
		}
		$lines[] = '';
		$lines[] = '## Topic hubs';
		$lines[] = '';
		foreach ( Guides::hubs() as $id => $def ) {
			$url = Guides::hub_url( $id );
			if ( $url ) {
				$lines[] = '- [' . $def['short'] . '](' . $url . '): ' . $def['description'];
			}
		}
		$lines[] = '';
		$lines[] = '## Guides';
		$lines[] = '';
		$guides = Pages::url( 'guides' );
		if ( $guides ) {
			$lines[] = '- [All guides](' . $guides . '): every guide, by topic and by game stage.';
		}
		foreach ( Guides::guides() as $id => $def ) {
			$url = Guides::guide_url( $id );
			if ( $url ) {
				$lines[] = '- [' . $def['short'] . '](' . $url . '): ' . $def['description'];
			}
		}
		$lines[] = '';
		$lines[] = '## Reference pages';
		$lines[] = '';
		foreach ( Entities::types() as $type => $def ) {
			$url = Entities::url( $type, '' );
			if ( $url ) {
				$lines[] = '- [' . $def['short'] . '](' . $url . '): ' . $def['blurb'] . ' One page per ' . $def['noun'] . ' at ' . $url . '{id}/ (for example ' . $url . self::example( $type ) . '/).';
			}
		}
		if ( Entities::chart_url() ) {
			$lines[] = '- [Gift chart](' . Entities::chart_url() . '): Every villager in birthday order with their own loved gifts and hates, the cheapest crop to grow for each Year 1 birthday, the crops most villagers like each season and the fish villagers love.';
		}
		if ( Entities::prices_url() ) {
			$lines[] = '- [Animal prices](' . Entities::prices_url() . '): Every farm animal with its price, the Coop or Barn it needs and that building\'s cost, gold per day and payback days.';
		}
		$lines[] = '';
		$lines[] = '## Data downloads';
		$lines[] = '';
		$data = Pages::url( 'data' );
		if ( $data ) {
			$lines[] = '- [Data downloads](' . $data . '): what each file and column means, and how to cite them.';
		}
		foreach ( Entities::csv_files() as $file => $f ) {
			$lines[] = '- [' . $file . '](' . Entities::csv_url( $file ) . '): ' . $f[2] . '. Fixed copy for this game version: ' . Entities::csv_url( str_replace( '.csv', '-' . Config::get( 'game_version' ) . '.csv', $file ) );
		}
		$lines[] = '- [datapackage.json](' . Entities::csv_url( 'datapackage.json' ) . '): source, licence, version and column definitions for the CSVs.';
		$lines[] = '- Licence: the game facts come from the Stardew Valley Wiki under CC BY-NC-SA 3.0; credit the wiki and Stardew Tools when you reuse them.';
		$lines[] = '';
		$lines[] = '## About';
		$lines[] = '';
		foreach ( array( 'methodology' => 'Methodology: where the data comes from, how it is checked and corrected', 'about' => 'About', 'contact' => 'Contact and corrections', 'changelog' => 'Changelog' ) as $slug => $label ) {
			$page = Pages::url( $slug );
			if ( $page ) {
				$lines[] = '- [' . $label . '](' . $page . ')';
			}
		}
		return implode( "\n", $lines ) . "\n";
	}

	/** First entry id of a reference type, for the URL pattern example. */
	private static function example( $type ) {
		$ids = array_keys( Entities::data()[ $type ] );
		return $ids ? $ids[0] : '';
	}

	/** Short, quotable answers built from data/answers.json, so they match the pages. */
	public static function facts() {
		$a = Data::get( 'answers' );
		if ( ! $a ) {
			return array();
		}
		$g     = function ( $n ) {
			return number_format( (float) $n ) . 'g';
		};
		$out   = array();
		$parts = array();
		foreach ( array( 'spring', 'summer', 'fall' ) as $s ) {
			if ( ! empty( $a['crop_profit'][ $s ][0] ) ) {
				$parts[] = $a['crop_profit'][ $s ][0]['name'] . ' in ' . ucfirst( $s ) . ' (' . $g( $a['crop_profit'][ $s ][0]['profit'] ) . ' per tile)';
			}
		}
		if ( $parts ) {
			$out[] = 'Most profitable crop per tile from shop seeds, planted on day 1 at Farming level 0 and sold raw: ' . implode( ', ', $parts ) . '.';
		}
		if ( ! empty( $a['greenhouse']['raw'][0] ) ) {
			$gh    = $a['greenhouse'];
			$out[] = 'Best greenhouse crop sold raw (year 2+, 6 Iridium Sprinklers, ' . (int) $gh['tiles'] . ' tiles, before professions): ' . $gh['raw'][0]['name'] . ' at about ' . $g( $gh['raw'][0]['per_tile'] ) . ' per tile a year. Processed with Artisan: ' . $gh['processed'][0]['name'] . ' (' . $g( $gh['processed'][0]['per_tile'] ) . ' per tile), which needs about ' . (int) $gh['processed'][0]['machines'] . ' kegs for a full greenhouse.';
		}
		foreach ( isset( $a['guides']['kegs'] ) ? $a['guides']['kegs'] : array() as $k ) {
			if ( in_array( $k['id'], array( 'ancient-fruit', 'starfruit', 'hops' ), true ) ) {
				$out[] = 'Kegs needed to keep up with 100 ' . $k['name'] . ' plants: ' . (int) $k['kegs_per_100'] . ' (' . $k['keg_product'] . ' takes ' . $k['keg_days'] . ' days).';
			}
		}
		if ( ! empty( $a['guides']['pigs'] ) ) {
			$p     = $a['guides']['pigs'];
			$out[] = 'A pig costs ' . $g( $p['price'] ) . ', needs a ' . $p['building'] . ', and finds up to ' . $p['truffles_per_day_max'] . ' truffles a day outdoors at full friendship (about ' . $g( $p['raw_per_day'] ) . ' a day raw, ' . $g( $p['oil_artisan_per_day'] ) . ' as Truffle Oil with Artisan). Pigs find no truffles in Winter or when it rains.';
		}
		if ( ! empty( $a['fishpond']['raw'][0] ) ) {
			$out[] = 'Best fish pond (full pond, products sold raw): ' . $a['fishpond']['raw'][0]['name'] . ' at about ' . $g( $a['fishpond']['raw'][0]['gold_per_day'] ) . ' a day.';
		}
		if ( ! empty( $a['guides']['casks']['wine'] ) ) {
			foreach ( $a['guides']['casks']['wine'] as $w ) {
				if ( 'starfruit' === $w['id'] ) {
					$out[] = 'Starfruit Wine with Artisan: ' . $g( $w['wine'] ) . ', and ' . $g( $w['iridium'] ) . ' at iridium quality after ' . (int) $a['guides']['casks']['cellar']['wine_days']['iridium'] . ' days in a cask. Casks only age items in the cellar.';
				}
			}
		}
		if ( ! empty( $a['xp']['level_10'] ) ) {
			$out[] = 'Every skill needs ' . number_format( $a['xp']['level_10'] ) . ' XP for level 10.';
		}
		$gifts = Data::get( 'gifts' );
		if ( $gifts ) {
			$fr    = $gifts['friendship'];
			$out[] = 'Gift friendship points: loved +' . (int) $fr['points']['love'] . ', liked +' . (int) $fr['points']['like'] . ', neutral +' . (int) $fr['points']['neutral'] . ', disliked ' . (int) $fr['points']['dislike'] . ', hated ' . (int) $fr['points']['hate'] . '; ×' . (int) $fr['multipliers']['birthday'] . ' on a birthday; one heart is 250 points.';
		}
		return $out;
	}
}

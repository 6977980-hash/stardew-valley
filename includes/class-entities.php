<?php
/**
 * Entity pages: one page per crop, farm animal and artisan machine, plus an index page for each.
 * Like tools and guides, each page holds only a shortcode; the text and numbers are rendered from
 * includes/entity-templates/ and data/entities.json, which is built by the same engine as the
 * calculators (tools/build/entities.mjs), so a page cannot disagree with its tool.
 *
 * @package Stardew_Tools
 */

namespace Stardew_Tools;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Entities {

	const META           = '_stardew_tools_entity';
	const VERSION_OPTION = 'stardew_tools_entities_version';

	/** Type => index page definition (slug, titles, section of the entities.json file). */
	public static function types() {
		return array(
			'crops'    => array(
				'slug'        => 'crops',
				'noun'        => 'crop',
				'title'       => 'Stardew Valley Crops: Prices, Growth Times and Profit per Tile',
				'short'       => 'All Crops',
				'blurb'       => 'Every crop with its price, growth time and profit per tile.',
				'description' => 'Every Stardew Valley 1.6 crop in one table: season, days to grow, regrow time, sell price and profit per tile, with a page and CSV download.',
				'tools'       => array( 'crop-profit-calculator', 'what-to-plant', 'xp-calculator' ),
			),
			'animals'  => array(
				'slug'        => 'farm-animals',
				'noun'        => 'animal',
				'title'       => 'Stardew Valley Farm Animals: Prices, Products and Gold per Day',
				'short'       => 'All Farm Animals',
				'blurb'       => 'Every farm animal with its price, products and income per day.',
				'description' => 'Every Stardew Valley 1.6 farm animal ranked: price, building, products and gold per day at full friendship, with a page for each and a CSV download.',
				'tools'       => array( 'animal-profit-calculator' ),
			),
			'machines' => array(
				'slug'        => 'machines',
				'noun'        => 'machine',
				'title'       => 'Stardew Valley Artisan Machines: Best Crops for Each',
				'short'       => 'Artisan Machines',
				'blurb'       => 'Kegs and Preserves Jars: which crop earns the most in each.',
				'description' => 'Stardew Valley 1.6 artisan machines ranked by gold per machine per day: which crops to put in Kegs and Preserves Jars, with times and prices.',
				'tools'       => array( 'keg-vs-preserves-jar', 'greenhouse-planner' ),
			),
		);
	}

	public static function data() {
		static $d = null;
		if ( null === $d ) {
			$d = Data::get( 'entities' );
		}
		return $d ? $d : array(
			'crops'    => array(),
			'animals'  => array(),
			'machines' => array(),
		);
	}

	/** Page definition for one entity (title, short name, meta description). */
	public static function def( $type, $id ) {
		$d = self::data();
		if ( ! isset( $d[ $type ][ $id ] ) ) {
			return null;
		}
		$e = $d[ $type ][ $id ];
		if ( 'crops' === $type ) {
			$seasons = implode( ' and ', array_map( 'ucfirst', $e['seasons'] ) );
			$title   = $e['name'] . ' in Stardew Valley: Profit and Best Use';
			$desc    = sprintf(
				'%1$s grows in %2$d days and sells for %3$dg. Profit per tile by level and fertilizer, best machine and when to plant (Stardew Valley 1.6, %4$s).',
				$e['name'],
				$e['growth_days'],
				$e['base_price'],
				$seasons
			);
		} elseif ( 'animals' === $type ) {
			$title = $e['name'] . ' in Stardew Valley: Income and Price';
			$desc  = sprintf(
				'%1$s in Stardew Valley 1.6: %2$s, earns about %3$dg a day at full friendship (%4$dg with artisan goods). Income by hearts, compared.',
				$e['name'],
				$e['price'] ? 'costs ' . number_format( $e['price'] ) . 'g in the ' . $e['building'] : 'lives in the ' . $e['building'],
				$e['full']['raw'],
				$e['full']['processed']
			);
		} else {
			$title = $e['name'] . ': Best Crops per Day in Stardew Valley';
			$desc  = sprintf( 'Which crops earn the most in a %1$s in Stardew Valley 1.6: all %2$d crops it accepts ranked by gold per machine per day, with times and prices.', $e['name'], $e['accepted'] );
		}
		// Keep meta descriptions where search results will not cut them off.
		if ( strlen( $desc ) > 158 ) {
			$desc = rtrim( substr( $desc, 0, strrpos( substr( $desc, 0, 157 ), ' ' ) ), ' ,.;:' ) . '…';
		}
		return array(
			'title'       => $title,
			'short'       => $e['name'],
			'description' => $desc,
		);
	}

	public static function init() {
		add_shortcode( 'stardew_entity', array( __CLASS__, 'entity_shortcode' ) );
		add_shortcode( 'stardew_entity_index', array( __CLASS__, 'index_shortcode' ) );
		add_shortcode( 'stardew_data_page', array( __CLASS__, 'data_shortcode' ) );
		add_action( 'init', array( __CLASS__, 'maybe_install' ), 24 );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue' ), 30 );
		add_filter( 'body_class', array( __CLASS__, 'body_class' ) );
		add_filter( 'the_content', array( __CLASS__, 'autolink' ), 20 );
		add_filter( 'stardew_tools_schema_graph', array( __CLASS__, 'schema' ) );
	}

	/* ---------- Pages ---------- */

	public static function maybe_install() {
		if ( get_option( self::VERSION_OPTION ) !== STARDEW_TOOLS_VERSION ) {
			self::install();
		}
	}

	public static function install() {
		$d = self::data();
		foreach ( self::types() as $type => $t ) {
			$index = self::ensure_page( $t['slug'], $t, '[stardew_entity_index type="' . $type . '"]', 0, 'index:' . $type );
			if ( ! $index ) {
				continue;
			}
			foreach ( array_keys( $d[ $type ] ) as $id ) {
				$def = self::def( $type, $id );
				self::ensure_page( $t['slug'] . '/' . $id, $def, '[stardew_entity type="' . $type . '" id="' . $id . '"]', $index, 'entity:' . $type . ':' . $id );
			}
		}
		self::ensure_page( 'data', self::data_def(), '[stardew_data_page]', 0, 'data' );
		update_option( self::VERSION_OPTION, STARDEW_TOOLS_VERSION );
	}

	/** The CSV downloads: file => [label, entity type it comes from, columns described]. */
	public static function csv_files() {
		return array(
			'stardew-crops.csv'             => array( 'Crops', 'crops', 'one row per crop: seasons, growth and regrow days, sell prices by quality, and profit per tile at Farming levels 0, 6 and 10' ),
			'stardew-farm-animals.csv'      => array( 'Farm animals', 'animals', 'one row per animal: building, price, days to mature, gold per day raw and as artisan goods at five hearts, and payback days' ),
			'stardew-machine-rankings.csv'  => array( 'Machine rankings', 'machines', 'one row per crop per machine: the product, its price, the days it takes and extra gold per machine per day' ),
		);
	}

	public static function csv_url( $file ) {
		return STARDEW_TOOLS_URL . 'assets/data/' . $file;
	}

	public static function data_def() {
		return array(
			'title'       => 'Stardew Valley Data Downloads: Crops, Animals and Machines as CSV',
			'short'       => 'Data Downloads',
			'description' => 'Free CSV downloads of Stardew Valley 1.6 crop, farm animal and machine data, cross-checked against the wiki and calculated by the same engine as our tools.',
		);
	}

	public static function data_shortcode() {
		$file = STARDEW_TOOLS_DIR . 'includes/entity-templates/data.php';
		return file_exists( $file ) ? self::render( $file, 'data', '', self::data() ) : '';
	}

	/** Creates a missing page, refreshes our meta on existing ones; published page text is never overwritten. */
	private static function ensure_page( $path, $def, $content, $parent, $meta ) {
		$existing = get_page_by_path( $path, OBJECT, 'page' );
		if ( $existing && 'draft' !== $existing->post_status ) {
			update_post_meta( $existing->ID, self::META, $meta );
			if ( '' === (string) get_post_meta( $existing->ID, Seo::META_DESCRIPTION, true ) || get_post_meta( $existing->ID, self::META . '_auto', true ) ) {
				update_post_meta( $existing->ID, Seo::META_DESCRIPTION, $def['description'] );
				update_post_meta( $existing->ID, self::META . '_auto', 1 );
				// Pages we generated follow our current title; a title the owner edited by hand is flagged by removing _auto.
				if ( $existing->post_title !== $def['title'] ) {
					wp_update_post(
						array(
							'ID'         => $existing->ID,
							'post_title' => $def['title'],
						)
					);
				}
			}
			return $existing->ID;
		}
		$admins   = get_users(
			array(
				'role'    => 'administrator',
				'number'  => 1,
				'orderby' => 'ID',
				'fields'  => 'ID',
			)
		);
		$postarr  = array(
			'post_type'    => 'page',
			'post_status'  => 'publish',
			'post_title'   => $def['title'],
			'post_name'    => basename( $path ),
			'post_content' => $content,
			'post_parent'  => $parent,
			'post_author'  => $admins ? (int) $admins[0] : 0,
		);
		if ( $existing ) {
			$postarr['ID'] = $existing->ID;
		}
		$page_id = $existing ? wp_update_post( $postarr ) : wp_insert_post( $postarr );
		if ( ! $page_id || is_wp_error( $page_id ) ) {
			return 0;
		}
		update_post_meta( $page_id, self::META, $meta );
		update_post_meta( $page_id, Seo::META_DESCRIPTION, $def['description'] );
		update_post_meta( $page_id, self::META . '_auto', 1 );
		return $page_id;
	}

	/** ['index'|'entity', type, id?] for the current page, or null. */
	public static function current() {
		if ( ! is_page() ) {
			return null;
		}
		$part = explode( ':', (string) get_post_meta( get_queried_object_id(), self::META, true ) );
		if ( 'data' === $part[0] ) {
			return array( 'data' );
		}
		if ( 'index' === $part[0] && isset( $part[1], self::types()[ $part[1] ] ) ) {
			return array( 'index', $part[1] );
		}
		if ( 'entity' === $part[0] && isset( $part[1], $part[2], self::data()[ $part[1] ][ $part[2] ] ) ) {
			return array( 'entity', $part[1], $part[2] );
		}
		return null;
	}

	/** Permalink of an entity page, or '' when it isn't published. */
	public static function url( $type, $id ) {
		$types = self::types();
		if ( ! isset( $types[ $type ] ) ) {
			return '';
		}
		$page = get_page_by_path( $types[ $type ]['slug'] . ( $id ? '/' . $id : '' ), OBJECT, 'page' );
		return $page && 'publish' === $page->post_status ? get_permalink( $page ) : '';
	}

	/* ---------- Rendering ---------- */

	public static function entity_shortcode( $atts ) {
		$atts  = shortcode_atts( array( 'type' => '', 'id' => '' ), $atts, 'stardew_entity' );
		$type  = $atts['type'];
		$id    = $atts['id'];
		$data  = self::data();
		$file  = STARDEW_TOOLS_DIR . 'includes/entity-templates/' . ( 'crops' === $type ? 'crop' : ( 'animals' === $type ? 'animal' : 'machine' ) ) . '.php';
		if ( ! isset( $data[ $type ][ $id ] ) || ! file_exists( $file ) ) {
			return '';
		}
		return self::render( $file, $type, $id, $data );
	}

	public static function index_shortcode( $atts ) {
		$atts  = shortcode_atts( array( 'type' => '' ), $atts, 'stardew_entity_index' );
		$type  = $atts['type'];
		$file  = STARDEW_TOOLS_DIR . 'includes/entity-templates/index-' . $type . '.php';
		if ( ! isset( self::types()[ $type ] ) || ! file_exists( $file ) ) {
			return '';
		}
		return self::render( $file, $type, '', self::data() );
	}

	private static function render( $file, $type, $id, $data ) {
		$e        = $id ? $data[ $type ][ $id ] : null;
		$all      = $data;
		$version  = Config::get( 'game_version' );
		$checked  = Data::summary()['checked'];
		$tool_url = function ( $tool ) {
			return Tools::url( $tool );
		};
		$ent_url  = function ( $t, $i ) {
			return self::url( $t, $i );
		};
		$guide_url = function ( $gid ) {
			return Guides::guide_url( $gid );
		};
		$gold     = function ( $n ) {
			return number_format( (float) $n ) . 'g';
		};
		$link     = function ( $t, $i, $text ) {
			$url = self::url( $t, $i );
			return $url ? '<a href="' . esc_url( $url ) . '">' . esc_html( $text ) . '</a>' : esc_html( $text );
		};
		ob_start();
		echo '<div class="entity" data-entity="' . esc_attr( $type . ( $id ? ':' . $id : '' ) ) . '">';
		?>
		<p class="guide-byline">By <a href="<?php echo esc_url( home_url( '/about/' ) ); ?>" rel="author"><?php echo esc_html( Config::get( 'author' ) ); ?></a> · Updated <time datetime="<?php echo esc_attr( $checked ); ?>"><?php echo esc_html( gmdate( 'F j, Y', strtotime( $checked ) ) ); ?></time> · <span class="badge badge--ok">Verified for Stardew Valley <?php echo esc_html( $version ); ?></span></p>
		<?php
		include $file;
		if ( $id ) {
			$index = self::url( $type, '' );
			?>
		<section class="tool-meta" aria-labelledby="entity-sources">
			<h2 id="entity-sources">Where these numbers come from</h2>
			<p>Game data comes from the <a href="https://stardewvalleywiki.com/" rel="noopener">Stardew Valley Wiki</a>, cross-checked between at least two of its pages (last checked <?php echo esc_html( $checked ); ?>). Profit figures are calculated by the same engine as our calculators. See the <a href="<?php echo esc_url( home_url( '/methodology/' ) ); ?>">methodology</a>, and <a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>">tell us</a> if something looks wrong in your game.<?php echo $index ? ' All entries: <a href="' . esc_url( $index ) . '">' . esc_html( self::types()[ $type ]['short'] ) . '</a>.' : ''; ?></p>
		</section>
			<?php
		}
		echo '</div>';
		return ob_get_clean();
	}

	/* ---------- Internal links ---------- */

	/** Hub id => entity type whose reference pages belong on it. */
	const HUB_TYPES = array(
		'crops-and-farming' => 'crops',
		'artisan-goods'     => 'machines',
		'animals'           => 'animals',
	);

	/** Prints a "Reference pages" section on a hub: the index plus a link to every entry. */
	public static function hub_section( $hub_id ) {
		if ( ! isset( self::HUB_TYPES[ $hub_id ] ) ) {
			return;
		}
		$type  = self::HUB_TYPES[ $hub_id ];
		$index = self::url( $type, '' );
		if ( ! $index ) {
			return;
		}
		$links = array();
		foreach ( self::data()[ $type ] as $id => $e ) {
			$url = self::url( $type, $id );
			if ( $url ) {
				$links[] = '<a href="' . esc_url( $url ) . '">' . esc_html( $e['name'] ) . '</a>';
			}
		}
		echo '<section aria-labelledby="hub-ref"><h2 id="hub-ref">Reference pages</h2>';
		echo '<p><a href="' . esc_url( $index ) . '">' . esc_html( self::types()[ $type ]['title'] ) . '</a>: ' . esc_html( self::types()[ $type ]['blurb'] ) . '</p>';
		echo '<p class="entity-links">' . implode( ' · ', $links ) . '</p>'; // phpcs:ignore WordPress.Security.EscapeOutput -- built from escaped parts.
		echo '</section>';
	}

	const AUTOLINK_MAX = 14;

	/**
	 * Links the first mention of each crop, animal and machine name in guide and entity page text
	 * to its page. Headings, tables, existing links and the page's own subject are left alone.
	 */
	public static function autolink( $html ) {
		if ( ! is_page() || ! in_the_loop() || ! is_main_query() || false === strpos( $html, '<' ) ) {
			return $html;
		}
		$post_id = get_queried_object_id();
		$cur     = self::current();
		if ( $cur && 'entity' !== $cur[0] ) {
			return $html;
		}
		if ( ! $cur && '' === (string) get_post_meta( $post_id, Guides::META, true ) ) {
			return $html;
		}
		$names = array();
		foreach ( self::data() as $type => $items ) {
			foreach ( $items as $id => $e ) {
				if ( $cur && $cur[1] === $type && $cur[2] === $id ) {
					continue;
				}
				$url = self::url( $type, $id );
				if ( $url ) {
					$names[ $e['name'] ] = $url;
				}
			}
		}
		if ( ! $names ) {
			return $html;
		}
		uksort(
			$names,
			function ( $a, $b ) {
				return strlen( $b ) - strlen( $a );
			}
		);
		$pattern = '/\b(' . implode( '|', array_map( 'preg_quote', array_keys( $names ) ) ) . ')(s|es)?\b/i';
		$lookup  = array_change_key_case( $names );

		$prev = libxml_use_internal_errors( true );
		$doc  = new \DOMDocument();
		$doc->loadHTML( '<?xml encoding="utf-8"?><div id="st-root">' . $html . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD );
		libxml_clear_errors();
		libxml_use_internal_errors( $prev );
		$root = $doc->getElementById( 'st-root' );
		if ( ! $root ) {
			return $html;
		}
		$skip   = array( 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'caption', 'button', 'script', 'style', 'code', 'select', 'label', 'summary' );
		$done   = array();
		$walk   = function ( $node ) use ( &$walk, $skip, $pattern, $lookup, &$done, $doc ) {
			foreach ( iterator_to_array( $node->childNodes ) as $child ) {
				if ( XML_ELEMENT_NODE === $child->nodeType ) {
					if ( ! in_array( strtolower( $child->nodeName ), $skip, true ) && 'entity-links' !== $child->getAttribute( 'class' ) ) {
						$walk( $child );
					}
					continue;
				}
				if ( XML_TEXT_NODE !== $child->nodeType || count( $done ) >= self::AUTOLINK_MAX ) {
					continue;
				}
				$text = $child->nodeValue;
				if ( ! preg_match_all( $pattern, $text, $m, PREG_OFFSET_CAPTURE ) ) {
					continue;
				}
				$frag = $doc->createDocumentFragment();
				$pos  = 0;
				foreach ( $m[0] as $i => $hit ) {
					$key = strtolower( $m[1][ $i ][0] );
					if ( isset( $done[ $key ] ) || ! isset( $lookup[ $key ] ) || count( $done ) >= self::AUTOLINK_MAX ) {
						continue;
					}
					$done[ $key ] = true;
					if ( $hit[1] > $pos ) {
						$frag->appendChild( $doc->createTextNode( substr( $text, $pos, $hit[1] - $pos ) ) );
					}
					$a = $doc->createElement( 'a' );
					$a->setAttribute( 'href', $lookup[ $key ] );
					$a->appendChild( $doc->createTextNode( $hit[0] ) );
					$frag->appendChild( $a );
					$pos = $hit[1] + strlen( $hit[0] );
				}
				if ( $pos > 0 ) {
					if ( $pos < strlen( $text ) ) {
						$frag->appendChild( $doc->createTextNode( substr( $text, $pos ) ) );
					}
					$node->replaceChild( $frag, $child );
				}
			}
		};
		$walk( $root );
		$out = '';
		foreach ( $root->childNodes as $c ) {
			$out .= $doc->saveHTML( $c );
		}
		return $out;
	}

	/* ---------- Assets and structured data ---------- */

	public static function enqueue() {
		if ( ! self::current() ) {
			return;
		}
		$css = 'assets/css/tools.css';
		wp_enqueue_style( 'stardew-tools-tools', STARDEW_TOOLS_URL . $css, array(), STARDEW_TOOLS_VERSION . '.' . filemtime( STARDEW_TOOLS_DIR . $css ) );
	}

	public static function body_class( $classes ) {
		$cur = self::current();
		if ( $cur ) {
			$classes[] = 'is-entity';
			$classes[] = 'is-guide';
		}
		return $classes;
	}

	public static function schema( $graph ) {
		$cur = self::current();
		if ( ! $cur ) {
			return $graph;
		}
		$url = get_permalink( get_queried_object_id() );
		if ( 'data' === $cur[0] ) {
			$def      = self::data_def();
			$graph[]  = array(
				'@type'       => 'Dataset',
				'name'        => $def['title'],
				'description' => $def['description'],
				'url'         => $url,
				'creator'     => array(
					'@type' => 'Person',
					'name'  => Config::get( 'author' ),
				),
				'distribution' => array_map(
					function ( $f ) {
						return array(
							'@type'          => 'DataDownload',
							'encodingFormat' => 'text/csv',
							'contentUrl'     => self::csv_url( $f ),
						);
					},
					array_keys( self::csv_files() )
				),
			);
			return $graph;
		}
		if ( 'entity' === $cur[0] ) {
			$def     = self::def( $cur[1], $cur[2] );
			$graph[] = array(
				'@type'            => 'Article',
				'headline'         => $def['title'],
				'description'      => $def['description'],
				'url'              => $url,
				'mainEntityOfPage' => $url,
				'datePublished'    => '2026-10-10',
				'dateModified'     => Data::summary()['checked'],
				'author'           => array(
					'@type' => 'Person',
					'name'  => Config::get( 'author' ),
					'url'   => home_url( '/about/' ),
				),
				'publisher'        => array( '@id' => home_url( '/' ) . '#organization' ),
				'about'            => array(
					'@type' => 'VideoGame',
					'name'  => 'Stardew Valley',
				),
				'inLanguage'       => 'en',
			);
			return $graph;
		}
		$def   = self::types()[ $cur[1] ];
		$items = array();
		foreach ( array_keys( self::data()[ $cur[1] ] ) as $id ) {
			$u = self::url( $cur[1], $id );
			if ( $u ) {
				$items[] = array(
					'@type'    => 'ListItem',
					'position' => count( $items ) + 1,
					'url'      => $u,
				);
			}
		}
		$graph[] = array(
			'@type'       => 'CollectionPage',
			'name'        => $def['title'],
			'description' => $def['description'],
			'url'         => $url,
			'inLanguage'  => 'en',
			'mainEntity'  => array(
				'@type'           => 'ItemList',
				'itemListElement' => $items,
			),
		);
		return $graph;
	}
}

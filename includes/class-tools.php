<?php
/**
 * Tool pages. Each tool is a WordPress page whose content is the shortcode
 * [stardew_tool id="..."]; the shortcode renders includes/tool-templates/{id}.php, so tool
 * updates ship with the plugin and never touch the page itself. Pages are created once, like
 * the trust pages, and are never overwritten after that.
 *
 * On a tool page the plugin adds the tool CSS, its ES module, the game data inline (no extra
 * request) and WebApplication structured data.
 *
 * @package Stardew_Tools
 */

namespace Stardew_Tools;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Tools {

	const META           = '_stardew_tools_tool';
	const VERSION_OPTION = 'stardew_tools_tools_version';

	/** Tool id (also page slug) => definition. Order is the order on the homepage and in menus. */
	public static function definitions() {
		$tools = array(
			'what-to-plant'              => array(
				'title'       => 'What Should I Plant Today? Stardew Valley Crop Planner',
				'short'       => 'What to Plant Today',
				'question'    => 'What should I plant today?',
				'blurb'       => 'Tell it the day, your gold, tiles and machines; get one crop, why it wins, and a shopping list.',
				'description' => 'What should I plant in Stardew Valley today? Enter the day, your gold, tiles, kegs and skills; get the best crop, the reasons and a seed shopping list (1.6).',
				'icon'        => 'sprout',
				'script'      => 'what-to-plant',
				'related'     => array( 'crop-profit-calculator', 'best-spring-crops', 'keg-vs-preserves-jar' ),
			),
			'crop-profit-calculator'     => array(
				'title'       => 'Stardew Valley Crop Profit Calculator',
				'short'       => 'Crop Profit Calculator',
				'question'    => 'Which crop earns the most?',
				'blurb'       => 'Profit for every crop from today until the season ends, with your fertilizer, professions and sell method.',
				'description' => 'Free Stardew Valley crop profit calculator for 1.6: pick your season and day, fertilizer and professions, and see profit per tile with the math shown.',
				'icon'        => 'sprout',
				'script'      => 'crop-profit',
				'related'     => array( 'keg-vs-preserves-jar', 'greenhouse-planner', 'ancient-fruit-vs-starfruit' ),
			),
			'keg-vs-preserves-jar'       => array(
				'title'       => 'Keg vs Preserves Jar: Which Is Better?',
				'short'       => 'Keg vs Preserves Jar',
				'question'    => 'Keg or Preserves Jar?',
				'blurb'       => 'Which machine earns more for your crop, and how to split your harvest between the kegs and jars you own.',
				'description' => 'Keg or Preserves Jar in Stardew Valley 1.6? Compare wine, juice, jelly and pickles for any crop, and split your harvest across the machines you own.',
				'icon'        => 'jar',
				'script'      => 'keg-vs-jar',
				'related'     => array( 'crop-profit-calculator', 'ancient-fruit-vs-starfruit', 'greenhouse-planner' ),
			),
			'ancient-fruit-vs-starfruit' => array(
				'title'       => 'Ancient Fruit vs Starfruit: Which Earns More?',
				'short'       => 'Ancient Fruit vs Starfruit',
				'question'    => 'Ancient Fruit or Starfruit?',
				'blurb'       => 'Side by side in the greenhouse and outdoors, raw or as wine, with your professions.',
				'description' => 'Ancient Fruit vs Starfruit in Stardew Valley 1.6: profit per tile in the greenhouse and in summer, raw or as wine, with and without Artisan.',
				'icon'        => 'coin',
				'script'      => 'af-vs-starfruit',
				'related'     => array( 'greenhouse-planner', 'keg-vs-preserves-jar', 'crop-profit-calculator' ),
			),
			'greenhouse-planner'         => array(
				'title'       => 'Stardew Valley Greenhouse Planner',
				'short'       => 'Greenhouse Planner',
				'question'    => 'Plan my greenhouse',
				'blurb'       => 'Choose sprinklers and crops, see the layout and a year of profit, and how many kegs you need.',
				'description' => 'Plan your Stardew Valley greenhouse: sprinkler layouts that water all 120 tiles, crops per tile, yearly profit and how many kegs or jars you need.',
				'icon'        => 'house',
				'script'      => 'greenhouse',
				'related'     => array( 'ancient-fruit-vs-starfruit', 'crop-profit-calculator', 'keg-vs-preserves-jar' ),
			),
			'fish-pond-calculator'       => array(
				'title'       => 'Stardew Valley Fish Pond Calculator: Best Fish',
				'short'       => 'Fish Pond Calculator',
				'question'    => 'Which fish for my pond?',
				'blurb'       => 'Daily roe and items for any fish, gold per day, and which fish earns the most in a pond.',
				'description' => 'Stardew Valley fish pond calculator (1.6): roe and item chances by population, gold per day raw or as Aged Roe and Caviar, and the best fish for ponds.',
				'icon'        => 'fish',
				'script'      => 'fish-pond',
				'data'        => array( 'fishponds' ),
				'related'     => array( 'keg-vs-preserves-jar', 'what-to-plant', 'crop-profit-calculator' ),
			),
			'animal-profit-calculator'   => array(
				'title'       => 'Stardew Valley Animal Profit Calculator',
				'short'       => 'Animal Profit Calculator',
				'question'    => 'Which animal earns the most?',
				'blurb'       => 'Gold per day for every farm animal, raw or through machines, with hearts, mood and professions.',
				'description' => 'Stardew Valley animal profit calculator (1.6): gold per day for cows, goats, sheep, pigs, chickens and more, with quality, Large products, machines and payback time.',
				'icon'        => 'coin',
				'script'      => 'animals',
				'data'        => array( 'animals' ),
				'related'     => array( 'fish-pond-calculator', 'keg-vs-preserves-jar', 'what-to-plant' ),
			),
			'xp-calculator'              => array(
				'title'       => 'Stardew Valley XP Calculator (Farming, Fishing)',
				'short'       => 'XP Calculator',
				'question'    => 'How long to level 10?',
				'blurb'       => 'XP to your next Farming or Fishing level, and how many harvests or catches that takes.',
				'description' => 'Stardew Valley XP calculator for 1.6: XP needed for each Farming and Fishing level, how many harvests or fish to reach level 10, and the fastest crops and fish for XP.',
				'icon'        => 'sprout',
				'script'      => 'xp',
				'data'        => array( 'skills', 'crops' ),
				'related'     => array( 'what-to-plant', 'fish-pond-calculator', 'crop-profit-calculator' ),
			),
			'gift-finder'                => array(
				'title'       => 'Stardew Valley Gift Finder: Loved and Liked Gifts',
				'short'       => 'Gift Finder',
				'question'    => 'What should I give them?',
				'blurb'       => 'Loved and liked gifts for every villager, and who loves any item. Includes how many hearts a gift is worth.',
				'description' => 'Stardew Valley gift finder for 1.6: loved, liked, disliked and hated gifts for every villager, who loves a given item, and how many friendship points a gift is worth.',
				'icon'        => 'gift',
				'script'      => 'gifts',
				'data'        => array( 'gifts' ),
				'related'     => array( 'crafting-calculator', 'what-to-plant', 'xp-calculator' ),
			),
			'bundle-tracker'             => array(
				'title'       => 'Stardew Valley Bundle Tracker (Standard, Remixed)',
				'short'       => 'Bundle Tracker',
				'question'    => 'Which bundle items are left?',
				'blurb'       => 'Tick off Community Center bundle items and see what is left to find, by season. Saved in your browser.',
				'description' => 'Stardew Valley Community Center bundle tracker for 1.6: every standard and Remixed bundle, tick off items as you collect them and see what is missing. Saves in your browser.',
				'icon'        => 'check',
				'script'      => 'bundles',
				'data'        => array( 'bundles' ),
				'related'     => array( 'gift-finder', 'what-to-plant', 'crafting-calculator' ),
			),
			'crafting-calculator'        => array(
				'title'       => 'Stardew Valley Crafting Calculator and Shopping List',
				'short'       => 'Crafting Calculator',
				'question'    => 'What do I need to craft it?',
				'blurb'       => 'Pick recipes and get one shopping list of ore, wood and stone, with shop prices.',
				'description' => 'Stardew Valley crafting calculator for 1.6: choose recipes and quantities and get the raw materials, bars and coal you need, with shop prices for the parts you can buy.',
				'icon'        => 'hammer',
				'script'      => 'crafting',
				'data'        => array( 'crafting' ),
				'related'     => array( 'what-to-plant', 'xp-calculator', 'crop-profit-calculator' ),
			),
		);
		// Best crops by season: one shared template, a server-rendered table per season.
		$seasons = array(
			'spring'     => 'Spring',
			'summer'     => 'Summer',
			'fall'       => 'Fall',
			'greenhouse' => 'Greenhouse',
		);
		foreach ( $seasons as $key => $name ) {
			$others = array_values( array_diff( array( 'best-spring-crops', 'best-summer-crops', 'best-fall-crops', 'best-greenhouse-crops' ), array( 'best-' . $key . '-crops' ) ) );
			$tools[ 'best-' . $key . '-crops' ] = array(
				'title'       => 'Best ' . $name . ' Crops in Stardew Valley (1.6)',
				'short'       => 'Best ' . $name . ' Crops',
				'blurb'       => 'greenhouse' === $key ? 'Every crop ranked by profit per tile over a full greenhouse year.' : 'Every ' . strtolower( $name ) . ' crop ranked by profit per tile, with the math.',
				'description' => 'greenhouse' === $key
					? 'The best crops for the Stardew Valley greenhouse in 1.6, ranked by profit per tile over a year, with seed prices, harvests and gold per day.'
					: 'The best ' . strtolower( $name ) . ' crops in Stardew Valley 1.6, ranked by profit per tile, with seed prices, harvests, gold per day and the math.',
				'icon'        => 'sprout',
				'script'      => 'best-crops',
				'template'    => 'best-crops',
				'season'      => $key,
				'related'     => array_merge( array( 'what-to-plant' ), array_slice( $others, 0, 3 ) ),
			);
		}
		return $tools;
	}

	public static function init() {
		add_shortcode( 'stardew_tool', array( __CLASS__, 'shortcode' ) );
		add_action( 'init', array( __CLASS__, 'maybe_install' ), 21 );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue' ), 30 );
		add_action( 'wp_footer', array( __CLASS__, 'footer' ), 20 );
		add_filter( 'body_class', array( __CLASS__, 'body_class' ) );
		add_filter( 'stardew_tools_schema_graph', array( __CLASS__, 'schema' ) );
	}

	/* ---------- Pages ---------- */

	public static function maybe_install() {
		if ( get_option( self::VERSION_OPTION ) !== STARDEW_TOOLS_VERSION ) {
			self::install();
			// Cached pages still point at the old scripts; drop them so the new version shows at once.
			do_action( 'litespeed_purge_all' );
		}
	}

	public static function install() {
		foreach ( self::definitions() as $id => $def ) {
			$existing = get_page_by_path( $id, OBJECT, 'page' );
			if ( $existing && 'draft' !== $existing->post_status ) {
				update_post_meta( $existing->ID, self::META, $id );
				Pages::sync_generated( $existing->ID, $def['title'], $def['description'] );
				continue;
			}
			$postarr = array(
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_title'   => $def['title'],
				'post_name'    => $id,
				'post_content' => '[stardew_tool id="' . $id . '"]',
			);
			if ( $existing ) {
				$postarr['ID'] = $existing->ID;
			}
			$page_id = $existing ? wp_update_post( $postarr ) : wp_insert_post( $postarr );
			if ( $page_id && ! is_wp_error( $page_id ) ) {
				update_post_meta( $page_id, self::META, $id );
				update_post_meta( $page_id, Seo::META_DESCRIPTION, $def['description'] );
			}
		}
		update_option( self::VERSION_OPTION, STARDEW_TOOLS_VERSION );
	}

	/** Tool id of the current page, or ''. */
	public static function current() {
		if ( ! is_page() ) {
			return '';
		}
		$id = get_post_meta( get_queried_object_id(), self::META, true );
		return isset( self::definitions()[ $id ] ) ? $id : '';
	}

	/** Permalink of a tool page, or '' if the page does not exist. */
	public static function url( $id ) {
		$page = get_page_by_path( $id, OBJECT, 'page' );
		return $page && 'publish' === $page->post_status ? get_permalink( $page ) : '';
	}

	/* ---------- Rendering ---------- */

	public static function shortcode( $atts ) {
		$atts = shortcode_atts( array( 'id' => '' ), $atts, 'stardew_tool' );
		$defs = self::definitions();
		if ( ! isset( $defs[ $atts['id'] ] ) ) {
			return '';
		}
		$template = isset( $defs[ $atts['id'] ]['template'] ) ? $defs[ $atts['id'] ]['template'] : $atts['id'];
		$file     = STARDEW_TOOLS_DIR . 'includes/tool-templates/' . $template . '.php';
		if ( ! file_exists( $file ) ) {
			return '';
		}
		$tool    = $defs[ $atts['id'] ];
		$tool_id = $atts['id'];
		$answers = Data::get( 'answers' );
		$version = Config::get( 'game_version' );
		$checked = Data::summary()['checked'];
		ob_start();
		echo '<div class="tool" data-tool="' . esc_attr( $tool_id ) . '">';
		if ( $checked ) {
			?>
		<p class="guide-byline">Updated <time datetime="<?php echo esc_attr( $checked ); ?>"><?php echo esc_html( gmdate( 'F j, Y', strtotime( $checked ) ) ); ?></time> · <span class="badge badge--ok">Verified for Stardew Valley <?php echo esc_html( $version ); ?></span></p>
			<?php
		}
		include $file;
		self::render_footer_blocks( $tool_id, $version, $checked );
		echo '</div>';
		return ob_get_clean();
	}

	/** Verified badge, sources and related tools, shared by every tool. */
	private static function render_footer_blocks( $tool_id, $version, $checked ) {
		$defs = self::definitions();
		?>
		<section class="tool-meta" aria-labelledby="sources-<?php echo esc_attr( $tool_id ); ?>">
			<h2 id="sources-<?php echo esc_attr( $tool_id ); ?>">Sources and accuracy</h2>
			<p><span class="badge badge--ok">Verified for Stardew Valley <?php echo esc_html( $version ); ?></span> Data last checked <?php echo esc_html( $checked ); ?>.</p>
			<p>Every value comes from the <a href="https://stardewvalleywiki.com/" rel="noopener">Stardew Valley Wiki</a> and is cross-checked between at least two of its pages; the formulas are tested against the wiki's own tables. See the <a href="<?php echo esc_url( home_url( '/methodology/' ) ); ?>">methodology</a>. Found a wrong number? <a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>">Tell us</a>.</p>
		</section>
		<?php
		$links = array();
		foreach ( $defs[ $tool_id ]['related'] as $rel ) {
			$url = self::url( $rel );
			if ( $url ) {
				$links[] = array( $url, $defs[ $rel ]['short'], $defs[ $rel ]['blurb'] );
			}
		}
		$guides = Guides::for_tool( $tool_id );
		if ( $guides ) :
			?>
		<section class="tool-related" aria-labelledby="guides-<?php echo esc_attr( $tool_id ); ?>">
			<h2 id="guides-<?php echo esc_attr( $tool_id ); ?>">Guides</h2>
			<ul class="related-list">
				<?php foreach ( $guides as $l ) : ?>
				<li><a href="<?php echo esc_url( $l[0] ); ?>"><?php echo esc_html( $l[1] ); ?></a><span><?php echo esc_html( $l[2] ); ?></span></li>
				<?php endforeach; ?>
			</ul>
		</section>
			<?php
		endif;
		if ( $links ) :
			?>
		<section class="tool-related" aria-labelledby="related-<?php echo esc_attr( $tool_id ); ?>">
			<h2 id="related-<?php echo esc_attr( $tool_id ); ?>">Related tools</h2>
			<ul class="related-list">
				<?php foreach ( $links as $l ) : ?>
				<li><a href="<?php echo esc_url( $l[0] ); ?>"><?php echo esc_html( $l[1] ); ?></a><span><?php echo esc_html( $l[2] ); ?></span></li>
				<?php endforeach; ?>
			</ul>
		</section>
			<?php
		endif;
	}

	/* ---------- Assets ---------- */

	public static function enqueue() {
		if ( ! self::current() ) {
			return;
		}
		$css = 'assets/css/tools.css';
		wp_enqueue_style( 'stardew-tools-tools', STARDEW_TOOLS_URL . $css, array(), STARDEW_TOOLS_VERSION . '.' . filemtime( STARDEW_TOOLS_DIR . $css ) );
	}

	/** Game data inline plus the tool module (type="module" needs no WordPress 6.5 API). */
	public static function footer() {
		$id = self::current();
		if ( ! $id ) {
			return;
		}
		$def  = self::definitions()[ $id ];
		$sets = isset( $def['data'] ) ? $def['data'] : array( 'crops', 'fertilizers', 'machines', 'seasons', 'greenhouse' );
		$data = array();
		foreach ( $sets as $set ) {
			if ( 'crops' === $set ) {
				$data[ $set ] = array_values( self::slim_crops() );
			} elseif ( 'animals' === $set ) {
				$data[ $set ] = self::slim_animals();
			} elseif ( 'skills' === $set ) {
				$data[ $set ] = self::slim_skills();
			} elseif ( 'fishponds' === $set ) {
				$data[ $set ] = self::slim_fishponds();
			} elseif ( 'crafting' === $set ) {
				$data[ $set ] = self::slim_crafting();
			} elseif ( 'gifts' === $set ) {
				$data[ $set ] = self::slim_gifts();
			} elseif ( 'bundles' === $set ) {
				$data[ $set ] = self::slim_bundles();
			} else {
				$data[ $set ] = Data::get( $set );
			}
		}
		echo '<script type="application/json" id="st-data">' . wp_json_encode( $data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG ) . "</script>\n";
		echo '<script type="importmap">' . wp_json_encode( array( 'imports' => self::module_versions() ), JSON_UNESCAPED_SLASHES ) . "</script>\n";
		$file = 'assets/js/tools/' . self::definitions()[ $id ]['script'] . '.js';
		$ver  = STARDEW_TOOLS_VERSION . '.' . filemtime( STARDEW_TOOLS_DIR . $file );
		printf( "<script type=\"module\" src=\"%s\"></script>\n", esc_url( add_query_arg( 'ver', $ver, STARDEW_TOOLS_URL . $file ) ) );
	}

	/**
	 * Versioned URL for every engine and tool module. Relative imports inside the modules have no
	 * ?ver=, so without this map a CDN or browser cache can serve an old engine file next to a new
	 * tool file and the import fails. The import map rewrites each module URL to its versioned one.
	 */
	public static function module_versions() {
		$map = array();
		foreach ( array( 'assets/js/engine', 'assets/js/tools' ) as $dir ) {
			foreach ( glob( STARDEW_TOOLS_DIR . $dir . '/*.js' ) as $path ) {
				$url         = STARDEW_TOOLS_URL . $dir . '/' . basename( $path );
				$map[ $url ] = add_query_arg( 'ver', STARDEW_TOOLS_VERSION . '.' . filemtime( $path ), $url );
			}
		}
		return $map;
	}

	/** Animal data without wiki evidence text, sources lists and verification notes. */
	public static function slim_animals() {
		$d = Data::get( 'animals' );
		if ( ! $d ) {
			return null;
		}
		$strip = function ( $rows ) {
			return array_map(
				function ( $r ) {
					return array_diff_key( $r, array_flip( array( 'sources', 'verified', 'notes', 'problems', 'single_source', 'evidence', 'last_verified', 'game_version', 'verification_status' ) ) );
				},
				$rows
			);
		};
		$animals = $strip( $d['animals'] );
		foreach ( $animals as $i => $a ) {
			$animals[ $i ]['url'] = $d['animals'][ $i ]['sources'][0]['url'];
		}
		return array(
			'animals'      => $animals,
			'products'     => $strip( $d['products'] ),
			'artisan'      => array(
				'machines' => $strip( $d['artisan']['machines'] ),
				'goods'    => $strip( $d['artisan']['goods'] ),
			),
			'quality'      => array_intersect_key( $d['quality'], array_flip( array( 'friendship_divisor', 'mood_divisor', 'profession_bonus', 'iridium_min_score' ) ) ),
			'deluxe_rules' => array( 'rules' => $d['deluxe_rules']['rules'] ),
			'feeding'      => array( 'hay' => $d['feeding']['hay'] ),
		);
	}

	/** Fish pond data with only what the calculator reads (the full file is over 500 KB). */
	public static function slim_fishponds() {
		$d = Data::get( 'fishponds' );
		if ( ! $d ) {
			return null;
		}
		$fish = array();
		foreach ( $d['fish'] as $f ) {
			$rows = array();
			foreach ( $f['produce'] as $r ) {
				$rows[] = array_intersect_key( $r, array_flip( array( 'item', 'item_id', 'wiki_name', 'quantity', 'population', 'share', 'item_price' ) ) );
			}
			$fish[] = array(
				'id'             => $f['id'],
				'name'           => $f['name'],
				'kind'           => $f['kind'],
				'base_price'     => $f['base_price'],
				'roe'            => $f['roe'],
				'max_population' => $f['max_population'],
				'reproduces'     => $f['reproduces'],
				'spawn_days'     => isset( $f['spawn_days'] ) ? $f['spawn_days'] : null,
				'produce'        => $rows,
				'url'            => $f['sources'][0]['url'],
			);
		}
		return array(
			'rules'    => array( 'produce' => array_intersect_key( $d['rules']['produce'], array_flip( array( 'base_chance', 'extra_roe' ) ) ) ),
			'products' => array(
				'aged_roe' => array( 'minutes' => $d['products']['aged_roe']['minutes'] ),
				'caviar'   => array( 'minutes' => $d['products']['caviar']['minutes'] ),
			),
			'fish'     => $fish,
		);
	}

	/** Villager tastes with item names, without wiki evidence. */
	public static function slim_gifts() {
		$d = Data::get( 'gifts' );
		if ( ! $d ) {
			return null;
		}
		$levels = array( 'love', 'like', 'neutral', 'dislike', 'hate' );
		$cats   = function ( $rows ) {
			return array_values( array_map( function ( $c ) { return $c['text']; }, $rows ) );
		};
		$names = array();
		foreach ( $d['items'] as $i ) {
			$names[ $i['id'] ] = $i['name'];
		}
		$villagers = array();
		foreach ( $d['villagers'] as $v ) {
			$tastes = array();
			foreach ( $levels as $l ) {
				$t            = $v['tastes'][ $l ];
				$tastes[ $l ] = array(
					'items'            => $t['items'],
					'categories'       => $cats( $t['categories'] ),
					'universal'        => $t['universal'],
					'universal_except' => $t['universal_except'],
				);
			}
			$villagers[] = array(
				'id'       => $v['id'],
				'name'     => $v['name'],
				'birthday' => $v['birthday'],
				'marry'    => $v['marriage_candidate'],
				'tastes'   => $tastes,
			);
		}
		$universal = array();
		foreach ( $levels as $l ) {
			$universal[ $l ] = array(
				'items'      => $d['universal'][ $l ]['items'],
				'categories' => $cats( $d['universal'][ $l ]['categories'] ),
			);
		}
		$universal['exceptions'] = array_values(
			array_map(
				function ( $e ) {
					return array_intersect_key( $e, array_flip( array( 'villager', 'item', 'taste' ) ) );
				},
				array_filter(
					$d['universal']['exceptions'],
					function ( $e ) {
						return ! empty( $e['item'] );
					}
				)
			)
		);
		$fr = $d['friendship'];
		return array(
			'villagers'  => $villagers,
			'universal'  => $universal,
			'names'      => $names,
			'friendship' => array(
				'points'              => $fr['points'],
				'multipliers'         => $fr['multipliers'],
				'quality_multipliers' => $fr['quality_multipliers'],
				'quality_applies_to'  => $fr['quality_applies_to'],
			),
		);
	}

	/** Bundles without wiki evidence. */
	public static function slim_bundles() {
		$d = Data::get( 'bundles' );
		if ( ! $d ) {
			return null;
		}
		$bundles = array();
		foreach ( $d['bundles'] as $b ) {
			$bundles[] = array_intersect_key( $b, array_flip( array( 'id', 'name', 'set', 'room', 'slots', 'items', 'gold', 'random_items', 'remix', 'reward' ) ) );
		}
		$items = array();
		foreach ( $d['items'] as $i ) {
			$items[] = array_intersect_key( $i, array_flip( array( 'id', 'name', 'seasons', 'obtain' ) ) );
		}
		$rooms = array();
		foreach ( $d['rooms'] as $r ) {
			$rooms[] = array_intersect_key( $r, array_flip( array( 'id', 'name', 'reward', 'unlock', 'effect' ) ) );
		}
		return array(
			'rooms'   => $rooms,
			'bundles' => $bundles,
			'items'   => $items,
		);
	}

	/** Recipes, furnace conversions and shop prices, without wiki evidence. */
	public static function slim_crafting() {
		$d = Data::get( 'crafting' );
		if ( ! $d ) {
			return null;
		}
		$ing   = function ( $rows ) {
			return array_map(
				function ( $i ) {
					return array_intersect_key( $i, array_flip( array( 'id', 'name', 'qty', 'raw', 'via' ) ) );
				},
				$rows
			);
		};
		$recipes = array();
		foreach ( $d['recipes'] as $r ) {
			$row = array(
				'id'          => $r['id'],
				'name'        => $r['name'],
				'yield'       => $r['yield'],
				'ingredients' => $ing( $r['ingredients'] ),
			);
			if ( ! empty( $r['alt_ingredients'] ) ) {
				$row['alt_ingredients'] = array( 'ingredients' => $ing( $r['alt_ingredients']['ingredients'] ) );
			}
			$recipes[] = $row;
		}
		$conv = array();
		foreach ( $d['conversions'] as $c ) {
			$conv[] = array(
				'id'     => $c['id'],
				'yield'  => $c['yield'],
				'inputs' => $ing( $c['inputs'] ),
			);
		}
		$prices = array();
		foreach ( $d['shop_prices'] as $p ) {
			$prices[] = array_intersect_key( $p, array_flip( array( 'id', 'price', 'price_year2', 'shop' ) ) );
		}
		return array(
			'recipes'     => $recipes,
			'conversions' => $conv,
			'shop_prices' => $prices,
		);
	}

	/** Skill thresholds, crop and fish XP, without wiki evidence. */
	public static function slim_skills() {
		$d = Data::get( 'skills' );
		if ( ! $d ) {
			return null;
		}
		$legendary_ponds = array();
		$ponds           = Data::get( 'fishponds' );
		foreach ( $ponds ? $ponds['fish'] : array() as $f ) {
			if ( 'legendary' === $f['kind'] ) {
				$legendary_ponds[] = $f['id'];
			}
		}
		$crops = array();
		foreach ( $d['farming']['crops'] as $c ) {
			$crops[] = array_intersect_key( $c, array_flip( array( 'id', 'name', 'xp' ) ) );
		}
		$fish = array();
		foreach ( $d['fishing']['fish'] as $f ) {
			$row           = array_intersect_key( $f, array_flip( array( 'id', 'name', 'difficulty', 'legendary', 'base_xp' ) ) );
			$row['family'] = ! $f['legendary'] && in_array( $f['id'], $legendary_ponds, true );
			$fish[]        = $row;
		}
		$crab = 5;
		foreach ( $d['fishing']['other'] as $o ) {
			if ( 'crab-pot' === $o['id'] ) {
				$crab = $o['xp'];
			}
		}
		return array(
			'thresholds' => $d['levels']['thresholds'],
			'farming'    => array( 'crops' => $crops ),
			'fishing'    => array(
				'formula'  => array( 'quality_values' => $d['fishing']['formula']['quality_values'] ),
				'fish'     => $fish,
				'crab_pot' => $crab,
			),
		);
	}

	/** Cross-checked crops without the fields the tools never read. */
	public static function slim_crops() {
		$out = array();
		foreach ( Data::crops() as $id => $crop ) {
			unset( $crop['problems'], $crop['last_verified'], $crop['game_version'] );
			$crop['sources'] = array_slice( $crop['sources'], 1, 1 ); // The crop's own wiki page.
			$out[ $id ]      = $crop;
		}
		return $out;
	}

	public static function body_class( $classes ) {
		if ( self::current() ) {
			$classes[] = 'is-tool';
		}
		return $classes;
	}

	/* ---------- Structured data ---------- */

	public static function schema( $graph ) {
		$id = self::current();
		if ( ! $id ) {
			return $graph;
		}
		$def = self::definitions()[ $id ];
		if ( isset( $def['season'] ) ) {
			// Ranked guide pages are articles; the table on them is the content.
			$graph[] = array(
				'@type'         => 'Article',
				'headline'      => $def['title'],
				'description'   => $def['description'],
				'url'           => get_permalink( get_queried_object_id() ),
				'dateModified'  => Data::summary()['checked'],
				'author'        => array(
					'@type' => 'Person',
					'name'  => Config::get( 'author' ),
				),
				'publisher'     => array( '@id' => home_url( '/' ) . '#organization' ),
				'about'         => array(
					'@type' => 'VideoGame',
					'name'  => 'Stardew Valley',
				),
				'inLanguage'    => 'en',
			);
			return $graph;
		}
		$graph[] = array(
			'@type'               => 'WebApplication',
			'name'                => $def['short'],
			'url'                 => get_permalink( get_queried_object_id() ),
			'description'         => $def['description'],
			'applicationCategory' => 'GameApplication',
			'dateModified'        => Data::summary()['checked'],
			'operatingSystem'     => 'Any (web browser)',
			'isAccessibleForFree' => true,
			'offers'              => array(
				'@type'         => 'Offer',
				'price'         => '0',
				'priceCurrency' => 'USD',
			),
			'about'               => array(
				'@type' => 'VideoGame',
				'name'  => 'Stardew Valley',
			),
		);
		return $graph;
	}
}

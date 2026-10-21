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
				'description' => 'What should you plant today in Stardew Valley? Enter the day, gold and tiles; get the best crop, why it wins and a seed shopping list (1.6).',
				'icon'        => 'sprout',
				'script'      => 'what-to-plant',
				'data'        => array( 'crops', 'fertilizers', 'machines', 'seasons', 'greenhouse', 'year-one' ),
				'related'     => array( 'crop-profit-calculator', 'best-spring-crops', 'keg-vs-preserves-jar' ),
				'learn'       => array( 'speed-gro-vs-fertilizer', 'how-many-kegs-do-i-need', 'best-greenhouse-setup-for-money' ),
			),
			'crop-profit-calculator'     => array(
				'title'       => 'Stardew Valley Crop Profit Calculator',
				'short'       => 'Crop Profit Calculator',
				'question'    => 'Which crop earns the most?',
				'blurb'       => 'Profit for every crop from today until the season ends, with your fertilizer, professions and sell method.',
				'description' => self::answer_desc( 'crop-profit-calculator', 'Free Stardew Valley crop profit calculator for 1.6: pick your season and day, fertilizer and professions, and see profit per tile with the math shown.' ),
				'icon'        => 'sprout',
				'script'      => 'crop-profit',
				'related'     => array( 'keg-vs-preserves-jar', 'greenhouse-planner', 'ancient-fruit-vs-starfruit' ),
				'learn'       => array( 'speed-gro-vs-fertilizer', 'how-many-kegs-do-i-need', 'best-greenhouse-setup-for-money' ),
			),
			'keg-vs-preserves-jar'       => array(
				'title'       => 'Keg vs Preserves Jar: Which Is Better?',
				'short'       => 'Keg vs Preserves Jar',
				'question'    => 'Keg or Preserves Jar?',
				'blurb'       => 'Which machine earns more for your crop, and how to split your harvest between the kegs and jars you own.',
				'description' => self::answer_desc( 'keg-vs-preserves-jar', 'Keg or Preserves Jar in Stardew Valley 1.6? Compare wine, juice, jelly and pickles for any crop, and split your harvest across the machines you own.' ),
				'icon'        => 'jar',
				'script'      => 'keg-vs-jar',
				'related'     => array( 'crop-profit-calculator', 'ancient-fruit-vs-starfruit', 'greenhouse-planner' ),
			),
			'ancient-fruit-vs-starfruit' => array(
				'title'       => 'Ancient Fruit vs Starfruit: Which Earns More?',
				'short'       => 'Ancient Fruit vs Starfruit',
				'question'    => 'Ancient Fruit or Starfruit?',
				'blurb'       => 'Side by side in the greenhouse and outdoors, raw or as wine, with your professions.',
				'description' => self::answer_desc( 'ancient-fruit-vs-starfruit', 'Ancient Fruit vs Starfruit in Stardew Valley 1.6: profit per tile in the greenhouse and in summer, raw or as wine, with and without Artisan.' ),
				'icon'        => 'coin',
				'script'      => 'af-vs-starfruit',
				'related'     => array( 'greenhouse-planner', 'keg-vs-preserves-jar', 'crop-profit-calculator' ),
				'learn'       => array( 'best-greenhouse-setup-for-money', 'how-many-kegs-do-i-need', 'dehydrator-vs-keg' ),
			),
			'greenhouse-planner'         => array(
				'title'       => 'Stardew Valley Greenhouse Planner',
				'short'       => 'Greenhouse Planner',
				'question'    => 'Plan my greenhouse',
				'blurb'       => 'Choose sprinklers and crops, see the layout and a year of profit, and how many kegs you need.',
				'description' => self::answer_desc( 'greenhouse-planner', 'Plan your Stardew Valley greenhouse: sprinkler layouts for the 120 soil tiles, yearly profit per crop and how many kegs or jars you need.' ),
				'icon'        => 'house',
				'script'      => 'greenhouse',
				'related'     => array( 'ancient-fruit-vs-starfruit', 'crop-profit-calculator', 'keg-vs-preserves-jar' ),
			),
			'fish-pond-calculator'       => array(
				'title'       => 'Stardew Valley Fish Pond Calculator: Best Fish',
				'short'       => 'Fish Pond Calculator',
				'question'    => 'Which fish for my pond?',
				'blurb'       => 'Daily roe and items for any fish, gold per day, and which fish earns the most in a pond.',
				'description' => self::answer_desc( 'fish-pond-calculator', 'Stardew Valley fish pond calculator (1.6): roe and item chances by population, gold per day raw or as Aged Roe and Caviar, and the best fish.' ),
				'icon'        => 'fish',
				'script'      => 'fish-pond',
				'data'        => array( 'fishponds' ),
				'related'     => array( 'keg-vs-preserves-jar', 'what-to-plant', 'crop-profit-calculator' ),
				'learn'       => array( 'best-fish-for-fish-ponds', 'dehydrator-vs-keg' ),
			),
			'animal-profit-calculator'   => array(
				'title'       => 'Stardew Valley Animal Profit Calculator',
				'short'       => 'Animal Profit Calculator',
				'question'    => 'Which animal earns the most?',
				'blurb'       => 'Gold per day for every farm animal, raw or through machines, with hearts, mood and professions.',
				'description' => self::answer_desc( 'animal-profit-calculator', 'Stardew Valley animal profit calculator (1.6): gold per day for every animal by hearts, raw or as artisan goods, with payback time.' ),
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
				'description' => self::answer_desc( 'xp-calculator', 'Stardew Valley XP calculator for 1.6: XP for each Farming and Fishing level, harvests or fish to level 10, and the fastest crops and fish.' ),
				'icon'        => 'sprout',
				'script'      => 'xp',
				'data'        => array( 'skills', 'crops' ),
				'related'     => array( 'what-to-plant', 'fish-pond-calculator', 'crop-profit-calculator' ),
				'learn'       => array( 'speed-gro-vs-fertilizer', 'best-fish-for-fish-ponds' ),
			),
			'gift-finder'                => array(
				'title'       => 'Stardew Valley Gift Finder: Loved and Liked Gifts',
				'short'       => 'Gift Finder',
				'question'    => 'What should I give them?',
				'blurb'       => 'Loved and liked gifts for every villager, and who loves any item. Includes how many hearts a gift is worth.',
				'description' => 'Who loves what in Stardew Valley 1.6: loved and liked gifts for every villager, who loves a given item, and the friendship points each gift is worth.',
				'icon'        => 'gift',
				'script'      => 'gifts',
				'data'        => array( 'gifts' ),
				'related'     => array( 'crafting-calculator', 'what-to-plant', 'xp-calculator' ),
				'learn'       => array( 'villagers', 'crops', 'hub:crops-and-farming' ),
			),
			'bundle-tracker'             => array(
				'title'       => 'Stardew Valley Bundle Tracker (Standard, Remixed)',
				'short'       => 'Bundle Tracker',
				'question'    => 'Which bundle items are left?',
				'blurb'       => 'Tick off Community Center bundle items and see what is left to find, by season. Saved in your browser.',
				'description' => 'Every Community Center bundle, standard and Remixed (1.6): tick off items as you collect them and see what is still missing. Saves in your browser.',
				'icon'        => 'check',
				'script'      => 'bundles',
				'data'        => array( 'bundles' ),
				'related'     => array( 'gift-finder', 'what-to-plant', 'crafting-calculator' ),
				'learn'       => array( 'bundles', 'crops', 'hub:crops-and-farming' ),
			),
			'crafting-calculator'        => array(
				'title'       => 'Stardew Valley Crafting Calculator and Shopping List',
				'short'       => 'Crafting Calculator',
				'question'    => 'What do I need to craft it?',
				'blurb'       => 'Pick recipes and get one shopping list of ore, wood and stone, with shop prices.',
				'description' => 'Stardew Valley crafting calculator (1.6): pick recipes and get every raw material, bar and coal you need, with shop prices for the parts you can buy.',
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
				'description' => self::answer_desc(
					'best-' . $key . '-crops',
					'greenhouse' === $key
						? 'The best crops for the Stardew Valley greenhouse in 1.6, ranked by profit per tile over a year, with seed prices, harvests and gold per day.'
						: 'The best ' . strtolower( $name ) . ' crops in Stardew Valley 1.6, ranked by profit per tile, with seed prices, harvests, gold per day and the math.'
				),
				'icon'        => 'sprout',
				'script'      => 'best-crops',
				'template'    => 'best-crops',
				'season'      => $key,
				'related'     => array_merge( array( 'what-to-plant' ), array_slice( $others, 0, 3 ) ),
				'learn'       => 'greenhouse' === $key ? array( 'best-greenhouse-setup-for-money', 'how-many-kegs-do-i-need', 'crops' ) : array( 'speed-gro-vs-fertilizer', 'how-many-kegs-do-i-need', 'crops' ),
			);
		}
		return $tools;
	}

	/**
	 * Meta description that opens with the tool's answer, from data/answers.json, then says what the
	 * page adds; $fallback is used when the numbers are missing. Kept under 156 characters.
	 */
	private static function answer_desc( $id, $fallback ) {
		$a = Data::get( 'answers' );
		$g = function ( $n ) {
			return number_format( (float) $n ) . 'g';
		};
		$d = '';
		if ( $a ) {
			if ( 'crop-profit-calculator' === $id && ! empty( $a['crop_profit']['spring'] ) ) {
				$d = sprintf( 'Best crop per tile in 1.6: %1$s in spring, %2$s in summer, %3$s in fall. Check any crop for your day, fertilizer and professions.', $a['crop_profit']['spring'][0]['name'], $a['crop_profit']['summer'][0]['name'], $a['crop_profit']['fall'][0]['name'] );
			} elseif ( 'keg-vs-preserves-jar' === $id && isset( $a['keg_vs_jar']['starfruit_artisan']['wine'], $a['keg_vs_jar']['starfruit_artisan']['jelly'] ) ) {
				$sf = $a['keg_vs_jar']['starfruit_artisan'];
				// The sentence only holds while Wine sells for more but Jelly earns more per machine-day.
				$d  = $sf['wine']['price'] <= $sf['jelly']['price'] || $sf['jelly']['gain_per_machine_day'] <= $sf['wine']['gain_per_machine_day'] ? '' : sprintf( 'Starfruit Wine sells for %1$s, Jelly %2$s, yet a Jar earns more per day (%3$s vs %4$s). Compare any crop and split your harvest.', $g( $sf['wine']['price'] ), $g( $sf['jelly']['price'] ), $g( $sf['jelly']['gain_per_machine_day'] ), $g( $sf['wine']['gain_per_machine_day'] ) );
			} elseif ( 'ancient-fruit-vs-starfruit' === $id && isset( $a['af_vs_starfruit']['greenhouse_established'] ) ) {
				$x = $a['af_vs_starfruit']['greenhouse_established'];
				$d = sprintf( '%1$s wins in the greenhouse: %2$s vs %3$s per tile a year as wine with Artisan. Compare raw, summer and first-year numbers too.', $x['ancient'] >= $x['starfruit'] ? 'Ancient Fruit' : 'Starfruit', $g( max( $x['ancient'], $x['starfruit'] ) ), $g( min( $x['ancient'], $x['starfruit'] ) ) );
			} elseif ( 'greenhouse-planner' === $id && ! empty( $a['greenhouse']['raw'] ) ) {
				$d = sprintf( 'Best greenhouse crop sold raw: %1$s, about %2$s a tile a year. Plan sprinkler layouts, yearly profit and the kegs or jars you need.', $a['greenhouse']['raw'][0]['name'], $g( $a['greenhouse']['raw'][0]['per_tile'] ) );
			} elseif ( 'fish-pond-calculator' === $id && ! empty( $a['fishpond']['raw'] ) ) {
				$d = sprintf( 'Best fish pond: %1$s, %2$s a day when full (sold raw). Roe and item chances by population for every fish, raw or as Aged Roe (1.6).', $a['fishpond']['raw'][0]['name'], $g( $a['fishpond']['raw'][0]['gold_per_day'] ) );
			} elseif ( 'animal-profit-calculator' === $id && ! empty( $a['animals']['raw'] ) ) {
				$d = sprintf( 'Best farm animal: the %1$s, about %2$s a day at five hearts. Gold per day for every animal by hearts, raw or as artisan goods, with payback.', $a['animals']['raw'][0]['name'], $g( $a['animals']['raw'][0]['gold_per_day'] ) );
			} elseif ( 'xp-calculator' === $id && ! empty( $a['xp']['level_10'] ) ) {
				$d = sprintf( 'Level 10 takes %1$s XP. See the XP for every Farming and Fishing level, how many harvests or fish you need, and the fastest crops (1.6).', number_format( $a['xp']['level_10'] ) );
			} elseif ( preg_match( '/^best-(spring|summer|fall|greenhouse)-crops$/', $id, $m ) && ! empty( $a['best_crops'][ $m[1] ] ) ) {
				$top = $a['best_crops'][ $m[1] ][0];
				$d   = 'greenhouse' === $m[1]
					? sprintf( 'Best greenhouse crop you can buy seeds for: %1$s, %2$s a tile a year. Every crop ranked, with seed prices, harvests and gold per day (1.6).', $top['name'], $g( $top['profit'] ) )
					: sprintf( 'Best %1$s crop in Stardew Valley 1.6: %2$s, %3$s a tile from day 1. Every %1$s crop ranked, with seed prices, harvests and gold per day.', $m[1], $top['name'], $g( $top['profit'] ) );
			}
		}
		return '' !== $d && strlen( $d ) <= 155 ? $d : $fallback;
	}

	public static function init() {
		add_shortcode( 'stardew_tool', array( __CLASS__, 'shortcode' ) );
		add_shortcode( 'stardew_tools_index', array( __CLASS__, 'index_shortcode' ) );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue' ), 30 );
		add_action( 'wp_head', array( __CLASS__, 'module_preload' ), 3 );
		add_action( 'wp_footer', array( __CLASS__, 'footer' ), 20 );
		add_filter( 'body_class', array( __CLASS__, 'body_class' ) );
		add_filter( 'stardew_tools_schema_graph', array( __CLASS__, 'schema' ) );
		add_filter( 'stardew_tools_breadcrumb_label', array( __CLASS__, 'breadcrumb_label' ), 10, 2 );
	}

	/** Breadcrumb name for a tool page: its short name, not the full SEO title. */
	public static function breadcrumb_label( $label, $post_id ) {
		$id = (string) get_post_meta( $post_id, self::META, true );
		return '' === $label && self::knows( $id ) ? self::definitions()[ $id ]['short'] : $label;
	}

	/* ---------- Pages ---------- */

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

	/** Whether a page's tool id still exists; with null, whether any tool is defined. */
	public static function knows( $meta ) {
		return null === $meta ? (bool) self::definitions() : isset( self::definitions()[ $meta ] );
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

	/** Group heading => tool ids, for the homepage toolbox and the /tools/ page. */
	public static function categories() {
		return array(
			'Decision tools' => array( 'what-to-plant', 'keg-vs-preserves-jar', 'ancient-fruit-vs-starfruit', 'greenhouse-planner' ),
			'Calculators'    => array( 'crop-profit-calculator', 'fish-pond-calculator', 'animal-profit-calculator', 'crafting-calculator', 'xp-calculator' ),
			'Best crops'     => array( 'best-spring-crops', 'best-summer-crops', 'best-fall-crops', 'best-greenhouse-crops' ),
			'Finders'        => array( 'gift-finder' ),
			'Trackers'       => array( 'bundle-tracker' ),
		);
	}

	/* ---------- Rendering ---------- */

	/** The /tools/ page: every live tool, grouped, with what each one answers. */
	public static function index_shortcode() {
		$defs = self::definitions();
		ob_start();
		echo '<div class="hub">';
		echo '<p>Every tool is free, needs no account and shows the math behind its answer. Numbers come from the Stardew Valley Wiki for version ' . esc_html( Config::get( 'game_version' ) ) . ', and each page says when it was last checked. Not sure where to start? Try <a href="' . esc_url( self::url( 'what-to-plant' ) ) . '">What to Plant Today</a>.</p>';
		foreach ( self::categories() as $heading => $ids ) {
			$rows = array();
			foreach ( $ids as $id ) {
				$url = isset( $defs[ $id ] ) ? self::url( $id ) : '';
				if ( $url ) {
					$rows[] = '<li><a href="' . esc_url( $url ) . '">' . esc_html( $defs[ $id ]['short'] ) . '</a><span>' . esc_html( $defs[ $id ]['blurb'] ) . '</span></li>';
				}
			}
			if ( $rows ) {
				echo '<section><h2>' . esc_html( $heading ) . '</h2><ul class="related-list">' . implode( '', $rows ) . '</ul></section>'; // phpcs:ignore WordPress.Security.EscapeOutput -- escaped above.
			}
		}
		// Not sure which tool fits? A guide explains the decision first, then points to its tool.
		$starts = array();
		foreach ( array( 'how-to-make-money-year-1', 'speed-gro-vs-fertilizer', 'how-many-kegs-do-i-need', 'best-greenhouse-setup-for-money', 'coop-or-barn-first' ) as $gid ) {
			$gurl = Guides::guide_url( $gid );
			if ( $gurl ) {
				$starts[] = '<li><a href="' . esc_url( $gurl ) . '">' . esc_html( Guides::guides()[ $gid ]['short'] ) . '</a><span>' . esc_html( Guides::guides()[ $gid ]['blurb'] ) . '</span></li>';
			}
		}
		if ( $starts ) {
			echo '<section><h2>Not sure which tool? Start with a guide</h2><ul class="related-list">' . implode( '', $starts ) . '</ul></section>'; // phpcs:ignore WordPress.Security.EscapeOutput -- escaped above.
		}
		echo '<p>Looking for something we do not have yet? <a href="' . esc_url( home_url( '/contact/' ) ) . '">Tell us</a>, or read all the <a href="' . esc_url( home_url( '/guides/' ) ) . '">guides</a>.</p>';
		echo '</div>';
		return ob_get_clean();
	}

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
		<p class="guide-byline"><span>Updated <time datetime="<?php echo esc_attr( $checked ); ?>"><?php echo esc_html( gmdate( 'F j, Y', strtotime( $checked ) ) ); ?></time></span> <span class="badge badge--ok">Verified for Stardew Valley <?php echo esc_html( $version ); ?></span></p>
			<?php
		}
		ob_start();
		include $file;
		echo self::mobile_extras( ob_get_clean() ); // phpcs:ignore WordPress.Security.EscapeOutput -- template output.
		self::render_footer_blocks( $tool_id, $version, $checked );
		echo '</div>';
		return ob_get_clean();
	}

	/**
	 * Two hooks for the result-first layout: id="result" on the results (the home page planner
	 * links to #result), and a "Read the full answer" button in the short answer box, which CSS
	 * clamps to a few lines on phones so the form and result come sooner. The button is in the
	 * HTML from the start so nothing moves when the script loads.
	 */
	private static function mobile_extras( $html ) {
		$html  = preg_replace( '/<section class="tool-results"/', '<section class="tool-results" id="result"', $html, 1 );
		$start = strpos( $html, '<div class="answer">' );
		$end   = false === $start ? false : strpos( $html, '</div>', $start );
		if ( false !== $end ) {
			$html = substr( $html, 0, $end ) . '<button type="button" class="answer__more" aria-expanded="false">Read the full answer</button>' . substr( $html, $end );
		}
		return $html;
	}

	/**
	 * Up to three pages to read after using a tool, as [url, name, blurb]: the guides that use it,
	 * then the ones in its 'learn' list ('crops' is the crop reference, where each crop's page
	 * lists its gifts and bundles; 'hub:<id>' a topic page).
	 */
	public static function learn_more( $tool_id ) {
		$def   = self::definitions()[ $tool_id ];
		$rows  = Guides::for_tool( $tool_id );
		$names = array_column( $rows, 1 );
		$all   = Guides::guides();
		foreach ( isset( $def['learn'] ) ? $def['learn'] : array() as $ref ) {
			if ( 'crops' === $ref ) {
				$url  = Entities::url( 'crops', '' );
				$name = 'All crops';
				$text = "Every crop's page: price, profit, who loves it and which bundles need it.";
			} elseif ( isset( Entities::types()[ $ref ] ) ) {
				$url  = Entities::url( $ref, '' );
				$name = Entities::types()[ $ref ]['short'];
				$text = Entities::types()[ $ref ]['blurb'];
			} elseif ( 0 === strpos( $ref, 'hub:' ) ) {
				$hub  = substr( $ref, 4 );
				$url  = Guides::hub_url( $hub );
				$name = $url ? Guides::hubs()[ $hub ]['short'] : '';
				$text = $url ? Guides::hubs()[ $hub ]['blurb'] : '';
			} else {
				$url  = isset( $all[ $ref ] ) ? Guides::guide_url( $ref ) : '';
				$name = $url ? $all[ $ref ]['short'] : '';
				$text = $url ? $all[ $ref ]['blurb'] : '';
			}
			if ( $url && ! in_array( $name, $names, true ) ) {
				$rows[]  = array( $url, $name, $text );
				$names[] = $name;
			}
		}
		return array_slice( $rows, 0, 3 );
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
		$guides = self::learn_more( $tool_id );
		if ( $guides ) :
			?>
		<section class="tool-related" aria-labelledby="guides-<?php echo esc_attr( $tool_id ); ?>">
			<h2 id="guides-<?php echo esc_attr( $tool_id ); ?>">Learn more</h2>
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
		if ( ! self::current() && ! is_page( array( 'tools', 'guides' ) ) ) {
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
			} elseif ( 'year-one' === $set ) {
				// Only what the decision engine reads: which Pierre seeds wait for Year 2.
				$y1                = Data::get( 'year-one' );
				$data['yearOne'] = array(
					'pierre_year2_seeds' => array_map(
						function ( $s ) {
							return array( 'crop' => $s['crop'] );
						},
						$y1 ? $y1['pierre_year2_seeds'] : array()
					),
				);
			} else {
				$data[ $set ] = Data::get( $set );
			}
		}
		echo '<script type="application/json" id="st-data">' . wp_json_encode( $data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG ) . "</script>\n";
		$file = self::module_file( $id );
		$ver  = STARDEW_TOOLS_VERSION . '.' . filemtime( STARDEW_TOOLS_DIR . $file );
		printf( "<script type=\"module\" src=\"%s\"></script>\n", esc_url( add_query_arg( 'ver', $ver, STARDEW_TOOLS_URL . $file ) ) );
	}

	/** The tool's own ES module, relative to the plugin folder. */
	private static function module_file( $id ) {
		return 'assets/js/tools/' . self::definitions()[ $id ]['script'] . '.js';
	}

	/**
	 * Import map plus a modulepreload for every file the tool module imports, printed early in <head>.
	 * Without the preloads the browser finds the imports one level at a time (tool, then common.js
	 * and the engine files, then their imports). The map comes first: it has to be in place before
	 * any module starts loading.
	 */
	public static function module_preload() {
		$id = self::current();
		if ( ! $id ) {
			return;
		}
		$versions = self::module_versions();
		echo '<script type="importmap">' . wp_json_encode( array( 'imports' => $versions ), JSON_UNESCAPED_SLASHES ) . "</script>\n";
		foreach ( self::module_graph( self::module_file( $id ) ) as $file ) {
			$url = STARDEW_TOOLS_URL . $file;
			printf( "<link rel=\"modulepreload\" href=\"%s\">\n", esc_url( isset( $versions[ $url ] ) ? $versions[ $url ] : $url ) );
		}
	}

	/** A module and every file it imports, directly or through other imports (relative paths only). */
	public static function module_graph( $file ) {
		$seen  = array();
		$queue = array( $file );
		while ( $queue ) {
			$f = array_shift( $queue );
			if ( isset( $seen[ $f ] ) || ! is_readable( STARDEW_TOOLS_DIR . $f ) ) {
				continue;
			}
			$seen[ $f ] = true;
			preg_match_all( '#^\s*import\s[^;]*?from\s*[\'"](\.{1,2}/[^\'"]+)[\'"]#m', (string) file_get_contents( STARDEW_TOOLS_DIR . $f ), $m );
			foreach ( $m[1] as $rel ) {
				$parts = explode( '/', dirname( $f ) . '/' . $rel );
				$path  = array();
				foreach ( $parts as $part ) {
					if ( '..' === $part ) {
						array_pop( $path );
					} elseif ( '.' !== $part && '' !== $part ) {
						$path[] = $part;
					}
				}
				$queue[] = implode( '/', $path );
			}
		}
		return array_keys( $seen );
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
		$def      = self::definitions()[ $id ];
		$url      = get_permalink( get_queried_object_id() );
		$modified = Data::summary()['checked'];
		if ( isset( $def['season'] ) ) {
			// Ranked guide pages are articles; the table on them is the content.
			$graph[] = array(
				'@type'            => 'Article',
				'headline'         => $def['title'],
				'description'      => $def['description'],
				'url'              => $url,
				'mainEntityOfPage' => $url,
				'image'            => Config::asset( Config::get( 'og_image' ) ),
				'datePublished'    => get_the_date( 'Y-m-d', get_queried_object_id() ),
				'dateModified'     => Data::modified( get_the_date( 'Y-m-d', get_queried_object_id() ) ),
				'author'           => Seo::author(),
				'publisher'        => array( '@id' => home_url( '/' ) . '#organization' ),
				'about'            => array(
					'@type' => 'VideoGame',
					'name'  => 'Stardew Valley',
				),
				'inLanguage'       => 'en',
			);
			return $graph;
		}
		$graph[] = array(
			'@type'               => 'WebApplication',
			'name'                => $def['short'],
			'url'                 => $url,
			'description'         => $def['description'],
			'applicationCategory' => 'UtilitiesApplication',
			'dateModified'        => $modified,
			'operatingSystem'     => 'Any (web browser)',
			'isAccessibleForFree' => true,
			'offers'              => array(
				'@type'         => 'Offer',
				'price'         => '0',
				'priceCurrency' => 'USD',
			),
			'author'              => Seo::author(),
			'publisher'           => array( '@id' => home_url( '/' ) . '#organization' ),
			'about'               => array(
				'@type' => 'VideoGame',
				'name'  => 'Stardew Valley',
			),
		);
		return $graph;
	}
}

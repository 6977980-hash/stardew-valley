<?php
/**
 * Topic hubs and guides. A hub is a top-level page for one topic cluster (Crops and Farming,
 * Artisan Goods, ...) that links every tool and guide in it; a guide is a child page of its hub,
 * so its URL and breadcrumb read Home > Hub > Guide. Like the tool pages, each page holds only a
 * shortcode and is rendered from includes/hub-templates/ and includes/guide-templates/, so text
 * and numbers ship with the plugin. Every number in a guide comes from data/answers.json, which
 * is built by the same engine the calculators use.
 *
 * @package Stardew_Tools
 */

namespace Stardew_Tools;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Guides {

	const META           = '_stardew_tools_guide';
	const VERSION_OPTION = 'stardew_tools_guides_version';

	/** Hub id (also page slug) => definition. Order is the order on the homepage. */
	public static function hubs() {
		return array(
			'crops-and-farming' => array(
				'title'       => 'Stardew Valley Crops and Farming: Tools and Guides',
				'short'       => 'Crops and Farming',
				'blurb'       => 'What to plant, which crops pay, and when fertilizer is worth buying.',
				'description' => 'Everything for Stardew Valley crops in 1.6: what to plant today, crop profit by season, the best crops, fertilizer and Speed-Gro, with verified numbers.',
				'tools'       => array( 'what-to-plant', 'crop-profit-calculator', 'best-spring-crops', 'best-summer-crops', 'best-fall-crops', 'xp-calculator' ),
			),
			'artisan-goods'     => array(
				'title'       => 'Stardew Valley Artisan Goods: Kegs, Jars and Machines',
				'short'       => 'Artisan Goods',
				'blurb'       => 'Kegs or jars, how many machines you need, and what to craft.',
				'description' => 'Stardew Valley artisan goods in 1.6: Keg vs Preserves Jar, how many kegs you need for each crop, and the crafting materials for every machine.',
				'tools'       => array( 'keg-vs-preserves-jar', 'crafting-calculator', 'greenhouse-planner' ),
			),
			'animals'           => array(
				'title'       => 'Stardew Valley Animals: Profit, Products and Upgrades',
				'short'       => 'Animals',
				'blurb'       => 'Which animal earns the most, and whether to sell raw or process.',
				'description' => 'Stardew Valley farm animals in 1.6: gold per day for every animal, truffles and Truffle Oil, cheese and mayonnaise, with hearts, mood and professions.',
				'tools'       => array( 'animal-profit-calculator' ),
			),
			'fishing'           => array(
				'title'       => 'Stardew Valley Fishing and Fish Ponds: Tools and Guides',
				'short'       => 'Fishing and Fish Ponds',
				'blurb'       => 'Which fish to put in a pond, roe and caviar, and fishing XP.',
				'description' => 'Stardew Valley fishing and fish ponds in 1.6: the best fish for ponds, roe, Aged Roe and Caviar, and how much fishing XP you need.',
				'tools'       => array( 'fish-pond-calculator', 'xp-calculator' ),
			),
			'greenhouse'        => array(
				'title'       => 'Stardew Valley Greenhouse: Layouts, Crops and Profit',
				'short'       => 'Greenhouse',
				'blurb'       => 'Sprinkler layouts, the best greenhouse crops, and how kegs change the answer.',
				'description' => 'Stardew Valley greenhouse planning for 1.6: sprinkler layouts, the best greenhouse crops, Ancient Fruit vs Starfruit, and how many kegs a full greenhouse needs.',
				'tools'       => array( 'greenhouse-planner', 'ancient-fruit-vs-starfruit', 'best-greenhouse-crops' ),
			),
		);
	}

	/** Guide id (also page slug) => definition. */
	public static function guides() {
		return array(
			'speed-gro-vs-fertilizer'    => array(
				'hub'         => 'crops-and-farming',
				'title'       => 'Speed-Gro vs Fertilizer: Which Is Worth Buying?',
				'short'       => 'Speed-Gro vs Fertilizer',
				'blurb'       => 'Crop by crop: when Speed-Gro adds a harvest, and when fertilizer just costs you gold.',
				'description' => 'Is Speed-Gro or fertilizer worth it in Stardew Valley 1.6? Profit per tile for 11 crops with Basic and Quality Fertilizer, Speed-Gro and Deluxe Speed-Gro.',
				'published'   => '2026-10-09',
				'tools'       => array( 'crop-profit-calculator', 'what-to-plant' ),
			),
			'how-many-kegs-do-i-need'    => array(
				'hub'         => 'artisan-goods',
				'title'       => 'How Many Kegs Do I Need? Kegs per Plant for Every Keg Crop',
				'short'       => 'How Many Kegs Do I Need?',
				'blurb'       => 'Kegs per plant for Hops, Ancient Fruit, Starfruit and more, so no fruit waits in a chest.',
				'description' => 'How many kegs do you need in Stardew Valley? Kegs per plant for Hops, Ancient Fruit, Starfruit, Melon and berries, worked out from keg times in 1.6.',
				'published'   => '2026-10-09',
				'tools'       => array( 'keg-vs-preserves-jar', 'greenhouse-planner' ),
			),
			'are-pigs-worth-it'          => array(
				'hub'         => 'animals',
				'title'       => 'Are Pigs Worth It? Truffles vs Truffle Oil',
				'short'       => 'Are Pigs Worth It?',
				'blurb'       => 'How fast a 16,000g pig pays for itself, and when Truffle Oil beats selling truffles.',
				'description' => 'Are pigs worth 16,000g in Stardew Valley 1.6? Truffles per day, Truffle Oil vs raw truffles with and without Artisan, and how many days a pig takes to pay back.',
				'published'   => '2026-10-09',
				'tools'       => array( 'animal-profit-calculator' ),
			),
			'best-fish-for-fish-ponds'   => array(
				'hub'         => 'fishing',
				'title'       => 'Best Fish for Fish Ponds in Stardew Valley (1.6)',
				'short'       => 'Best Fish for Fish Ponds',
				'blurb'       => 'The ponds that earn the most gold a day, raw or as Aged Roe and Caviar.',
				'description' => 'The best fish for fish ponds in Stardew Valley 1.6, ranked by gold per day: roe sold raw or as Aged Roe and Caviar, how many jars each pond needs, and legendary fish.',
				'published'   => '2026-10-09',
				'tools'       => array( 'fish-pond-calculator' ),
			),
			'are-casks-worth-it'         => array(
				'hub'         => 'artisan-goods',
				'title'       => 'Are Casks Worth It? What Aging Adds to Wine, Cheese and Ale',
				'short'       => 'Are Casks Worth It?',
				'blurb'       => 'Gold per cask per day for wine, cheese and ale, and what a full cellar costs.',
				'description' => 'Are casks worth it in Stardew Valley 1.6? Aged prices for wine, cheese, goat cheese, beer, mead and pale ale, gold per cask per day, and the wood to fill a 189-cask cellar.',
				'published'   => '2026-10-10',
				'tools'       => array( 'keg-vs-preserves-jar', 'crafting-calculator' ),
			),
			'dehydrator-vs-keg'          => array(
				'hub'         => 'artisan-goods',
				'title'       => 'Dehydrator vs Keg: Which Uses Your Fruit Better?',
				'short'       => 'Dehydrator vs Keg',
				'blurb'       => 'Dried fruit earns far more per machine per day, wine earns more per fruit. Which limit are you at?',
				'description' => 'Dehydrator vs Keg in Stardew Valley 1.6: dried fruit, raisins and wine compared per fruit and per machine per day, with prices for nine fruits, plus the Fish Smoker.',
				'published'   => '2026-10-10',
				'tools'       => array( 'keg-vs-preserves-jar', 'crafting-calculator' ),
			),
			'coop-or-barn-first'         => array(
				'hub'         => 'animals',
				'title'       => 'Coop or Barn First? Every Animal You Can Buy, Compared',
				'short'       => 'Coop or Barn First?',
				'blurb'       => 'Which building starts earning sooner, and which animals pay themselves back fastest.',
				'description' => 'Coop or barn first in Stardew Valley 1.6? Price, gold per day at 0, 3 and 5 hearts and payback days for chickens, ducks, rabbits, cows, goats, sheep and pigs.',
				'published'   => '2026-10-10',
				'tools'       => array( 'animal-profit-calculator' ),
			),
			'best-greenhouse-setup-for-money' => array(
				'hub'         => 'greenhouse',
				'title'       => 'Best Greenhouse Setup for Money: Kegs Decide the Crop',
				'short'       => 'Best Greenhouse Setup for Money',
				'blurb'       => 'Ancient Fruit, Starfruit or Hops: the answer changes with how many kegs you own.',
				'description' => 'The most profitable Stardew Valley greenhouse in 1.6 depends on your kegs: yearly profit for Ancient Fruit, Starfruit and Hops with 0 to 170 kegs.',
				'published'   => '2026-10-09',
				'tools'       => array( 'greenhouse-planner', 'ancient-fruit-vs-starfruit', 'keg-vs-preserves-jar' ),
			),
		);
	}

	public static function init() {
		add_shortcode( 'stardew_hub', array( __CLASS__, 'hub_shortcode' ) );
		add_shortcode( 'stardew_guide', array( __CLASS__, 'guide_shortcode' ) );
		add_action( 'init', array( __CLASS__, 'maybe_install' ), 22 );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue' ), 30 );
		add_filter( 'body_class', array( __CLASS__, 'body_class' ) );
		add_filter( 'stardew_tools_schema_graph', array( __CLASS__, 'schema' ) );
	}

	/* ---------- Pages ---------- */

	public static function maybe_install() {
		if ( get_option( self::VERSION_OPTION ) !== STARDEW_TOOLS_VERSION ) {
			self::install();
		}
	}

	/** Creates missing hub and guide pages. Existing published pages are never overwritten. */
	public static function install() {
		foreach ( self::hubs() as $id => $def ) {
			self::ensure_page( $id, $def, '[stardew_hub id="' . $id . '"]', 0, 'hub:' . $id );
		}
		foreach ( self::guides() as $id => $def ) {
			$hub = get_page_by_path( $def['hub'], OBJECT, 'page' );
			if ( $hub ) {
				self::ensure_page( $def['hub'] . '/' . $id, $def, '[stardew_guide id="' . $id . '"]', $hub->ID, 'guide:' . $id );
			}
		}
		update_option( self::VERSION_OPTION, STARDEW_TOOLS_VERSION );
	}

	private static function ensure_page( $path, $def, $content, $parent, $meta ) {
		$existing = get_page_by_path( $path, OBJECT, 'page' );
		if ( $existing && 'draft' !== $existing->post_status ) {
			update_post_meta( $existing->ID, self::META, $meta );
			return;
		}
		$postarr = array(
			'post_type'    => 'page',
			'post_status'  => 'publish',
			'post_title'   => $def['title'],
			'post_name'    => basename( $path ),
			'post_content' => $content,
			'post_parent'  => $parent,
			'post_author'  => self::author_id(),
		);
		// Back-date to the publication day, but never into the future or WordPress schedules the page.
		if ( isset( $def['published'] ) && strtotime( $def['published'] . ' 09:00:00' ) <= current_time( 'timestamp' ) ) { // phpcs:ignore WordPress.DateTime.CurrentTimeTimestamp
			$postarr['post_date'] = $def['published'] . ' 09:00:00';
		}
		if ( $existing ) {
			$postarr['ID'] = $existing->ID;
		}
		$page_id = $existing ? wp_update_post( $postarr ) : wp_insert_post( $postarr );
		if ( $page_id && ! is_wp_error( $page_id ) ) {
			update_post_meta( $page_id, self::META, $meta );
			update_post_meta( $page_id, Seo::META_DESCRIPTION, $def['description'] );
		}
	}

	private static function author_id() {
		$admins = get_users(
			array(
				'role'    => 'administrator',
				'number'  => 1,
				'orderby' => 'ID',
				'fields'  => 'ID',
			)
		);
		return $admins ? (int) $admins[0] : 0;
	}

	/** ['hub'|'guide', id] for the current page, or null. */
	public static function current() {
		if ( ! is_page() ) {
			return null;
		}
		$meta = (string) get_post_meta( get_queried_object_id(), self::META, true );
		$part = explode( ':', $meta, 2 );
		if ( 2 !== count( $part ) ) {
			return null;
		}
		$defs = 'hub' === $part[0] ? self::hubs() : ( 'guide' === $part[0] ? self::guides() : array() );
		return isset( $defs[ $part[1] ] ) ? $part : null;
	}

	public static function hub_url( $id ) {
		$page = get_page_by_path( $id, OBJECT, 'page' );
		return $page && 'publish' === $page->post_status ? get_permalink( $page ) : '';
	}

	public static function guide_url( $id ) {
		$guides = self::guides();
		if ( ! isset( $guides[ $id ] ) ) {
			return '';
		}
		$page = get_page_by_path( $guides[ $id ]['hub'] . '/' . $id, OBJECT, 'page' );
		return $page && 'publish' === $page->post_status ? get_permalink( $page ) : '';
	}

	/** Published guides that use a tool, for the "Guides" block on tool pages. */
	public static function for_tool( $tool_id ) {
		$out = array();
		foreach ( self::guides() as $id => $def ) {
			$url = in_array( $tool_id, $def['tools'], true ) ? self::guide_url( $id ) : '';
			if ( $url ) {
				$out[] = array( $url, $def['short'], $def['blurb'] );
			}
		}
		return $out;
	}

	/** Published tools of a list, as [url, short, blurb]. */
	private static function tool_links( $ids ) {
		$defs = Tools::definitions();
		$out  = array();
		foreach ( $ids as $id ) {
			$url = isset( $defs[ $id ] ) ? Tools::url( $id ) : '';
			if ( $url ) {
				$out[] = array( $url, $defs[ $id ]['short'], $defs[ $id ]['blurb'] );
			}
		}
		return $out;
	}

	/* ---------- Rendering ---------- */

	public static function hub_shortcode( $atts ) {
		$atts = shortcode_atts( array( 'id' => '' ), $atts, 'stardew_hub' );
		$hubs = self::hubs();
		if ( ! isset( $hubs[ $atts['id'] ] ) ) {
			return '';
		}
		$hub_id  = $atts['id'];
		$hub     = $hubs[ $hub_id ];
		$answers = Data::get( 'answers' );
		$tools   = self::tool_links( $hub['tools'] );
		$guides  = array();
		foreach ( self::guides() as $gid => $g ) {
			$url = $g['hub'] === $hub_id ? self::guide_url( $gid ) : '';
			if ( $url ) {
				$guides[] = array( $url, $g['short'], $g['blurb'] );
			}
		}
		ob_start();
		echo '<div class="hub" data-hub="' . esc_attr( $hub_id ) . '">';
		$file = STARDEW_TOOLS_DIR . 'includes/hub-templates/' . $hub_id . '.php';
		if ( file_exists( $file ) ) {
			include $file;
		}
		if ( $tools ) {
			echo '<section aria-labelledby="hub-tools"><h2 id="hub-tools">Tools</h2>';
			self::link_list( $tools );
			echo '</section>';
		}
		if ( $guides ) {
			echo '<section aria-labelledby="hub-guides"><h2 id="hub-guides">Guides</h2>';
			self::link_list( $guides );
			echo '</section>';
		}
		Entities::hub_section( $hub_id );
		self::other_hubs( $hub_id );
		echo '</div>';
		return ob_get_clean();
	}

	public static function guide_shortcode( $atts ) {
		$atts   = shortcode_atts( array( 'id' => '' ), $atts, 'stardew_guide' );
		$guides = self::guides();
		if ( ! isset( $guides[ $atts['id'] ] ) ) {
			return '';
		}
		$file = STARDEW_TOOLS_DIR . 'includes/guide-templates/' . $atts['id'] . '.php';
		if ( ! file_exists( $file ) ) {
			return '';
		}
		$guide_id = $atts['id'];
		$guide    = $guides[ $guide_id ];
		$answers  = Data::get( 'answers' );
		$g        = isset( $answers['guides'] ) ? $answers['guides'] : array();
		$version  = Config::get( 'game_version' );
		$checked  = Data::summary()['checked'];
		$tool_url = function ( $id ) {
			return Tools::url( $id );
		};
		$gold     = function ( $n ) {
			return number_format( (float) $n ) . 'g';
		};
		ob_start();
		echo '<div class="guide" data-guide="' . esc_attr( $guide_id ) . '">';
		?>
		<p class="guide-byline">By <a href="<?php echo esc_url( home_url( '/about/' ) ); ?>" rel="author"><?php echo esc_html( Config::get( 'author' ) ); ?></a> · Updated <time datetime="<?php echo esc_attr( $checked ); ?>"><?php echo esc_html( gmdate( 'F j, Y', strtotime( $checked ) ) ); ?></time> · <span class="badge badge--ok">Verified for Stardew Valley <?php echo esc_html( $version ); ?></span></p>
		<?php
		include $file;
		$tools = self::tool_links( $guide['tools'] );
		if ( $tools ) {
			echo '<section class="guide-tools" aria-labelledby="guide-tools"><h2 id="guide-tools">Work it out for your farm</h2>';
			self::link_list( $tools );
			echo '</section>';
		}
		?>
		<section class="tool-meta" aria-labelledby="guide-sources">
			<h2 id="guide-sources">Where these numbers come from</h2>
			<p>Every number on this page is calculated by the same engine as our calculators, from game data taken from the <a href="https://stardewvalleywiki.com/" rel="noopener">Stardew Valley Wiki</a> and cross-checked between at least two of its pages (last checked <?php echo esc_html( $checked ); ?>). See the <a href="<?php echo esc_url( home_url( '/methodology/' ) ); ?>">methodology</a>, and <a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>">tell us</a> if something looks wrong in your game.</p>
		</section>
		<?php
		$more = array();
		foreach ( $guides as $gid => $other ) {
			$url = $gid !== $guide_id ? self::guide_url( $gid ) : '';
			if ( $url ) {
				$more[] = array( $url, $other['short'], $other['blurb'] );
			}
		}
		$hub_url = self::hub_url( $guide['hub'] );
		if ( $more || $hub_url ) {
			echo '<section aria-labelledby="guide-more"><h2 id="guide-more">More guides</h2>';
			if ( $hub_url ) {
				echo '<p>All tools and guides on this topic: <a href="' . esc_url( $hub_url ) . '">' . esc_html( self::hubs()[ $guide['hub'] ]['short'] ) . '</a>.</p>';
			}
			self::link_list( array_slice( $more, 0, 4 ) );
			echo '</section>';
		}
		echo '</div>';
		return ob_get_clean();
	}

	private static function link_list( $links ) {
		if ( ! $links ) {
			return;
		}
		echo '<ul class="related-list">';
		foreach ( $links as $l ) {
			echo '<li><a href="' . esc_url( $l[0] ) . '">' . esc_html( $l[1] ) . '</a><span>' . esc_html( $l[2] ) . '</span></li>';
		}
		echo '</ul>';
	}

	private static function other_hubs( $hub_id ) {
		$links = array();
		foreach ( self::hubs() as $id => $hub ) {
			$url = $id !== $hub_id ? self::hub_url( $id ) : '';
			if ( $url ) {
				$links[] = array( $url, $hub['short'], $hub['blurb'] );
			}
		}
		if ( $links ) {
			echo '<section aria-labelledby="hub-more"><h2 id="hub-more">Other topics</h2>';
			self::link_list( $links );
			echo '</section>';
		}
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
			$classes[] = 'is-' . $cur[0];
		}
		return $classes;
	}

	public static function schema( $graph ) {
		$cur = self::current();
		if ( ! $cur ) {
			return $graph;
		}
		$url = get_permalink( get_queried_object_id() );
		if ( 'guide' === $cur[0] ) {
			$def     = self::guides()[ $cur[1] ];
			$graph[] = array(
				'@type'            => 'Article',
				'headline'         => $def['title'],
				'description'      => $def['description'],
				'url'              => $url,
				'mainEntityOfPage' => $url,
				'datePublished'    => $def['published'],
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
		$def   = self::hubs()[ $cur[1] ];
		$items = array();
		foreach ( self::tool_links( $def['tools'] ) as $l ) {
			$items[] = $l[0];
		}
		foreach ( self::guides() as $gid => $g ) {
			$gurl = $g['hub'] === $cur[1] ? self::guide_url( $gid ) : '';
			if ( $gurl ) {
				$items[] = $gurl;
			}
		}
		$list = array();
		foreach ( $items as $i => $item ) {
			$list[] = array(
				'@type'    => 'ListItem',
				'position' => $i + 1,
				'url'      => $item,
			);
		}
		$graph[] = array(
			'@type'       => 'CollectionPage',
			'name'        => $def['title'],
			'description' => $def['description'],
			'url'         => $url,
			'inLanguage'  => 'en',
			'mainEntity'  => array(
				'@type'           => 'ItemList',
				'itemListElement' => $list,
			),
		);
		return $graph;
	}
}

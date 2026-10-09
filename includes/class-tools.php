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
		return array(
			'crop-profit-calculator'     => array(
				'title'       => 'Stardew Valley Crop Profit Calculator',
				'short'       => 'Crop Profit Calculator',
				'question'    => 'What should I plant?',
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
		);
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
		}
	}

	public static function install() {
		foreach ( self::definitions() as $id => $def ) {
			$existing = get_page_by_path( $id, OBJECT, 'page' );
			if ( $existing && 'draft' !== $existing->post_status ) {
				update_post_meta( $existing->ID, self::META, $id );
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
		$file = STARDEW_TOOLS_DIR . 'includes/tool-templates/' . $atts['id'] . '.php';
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
		$data = array(
			'crops'       => array_values( self::slim_crops() ),
			'fertilizers' => Data::get( 'fertilizers' ),
			'machines'    => Data::get( 'machines' ),
			'seasons'     => Data::get( 'seasons' ),
			'greenhouse'  => Data::get( 'greenhouse' ),
		);
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
		$def     = self::definitions()[ $id ];
		$graph[] = array(
			'@type'               => 'WebApplication',
			'name'                => $def['short'],
			'url'                 => get_permalink( get_queried_object_id() ),
			'description'         => $def['description'],
			'applicationCategory' => 'GameApplication',
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

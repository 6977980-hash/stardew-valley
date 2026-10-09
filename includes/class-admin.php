<?php
/**
 * Settings > Stardew Tools: ad switches and IDs, plus a short status panel.
 *
 * @package Stardew_Tools
 */

namespace Stardew_Tools;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Admin {

	const SLUG = 'stardew-tools';

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_init', array( __CLASS__, 'register' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( STARDEW_TOOLS_FILE ), array( __CLASS__, 'action_links' ) );
	}

	public static function menu() {
		add_options_page( 'Stardew Tools', 'Stardew Tools', 'manage_options', self::SLUG, array( __CLASS__, 'page' ) );
	}

	public static function action_links( $links ) {
		array_unshift( $links, '<a href="' . esc_url( admin_url( 'options-general.php?page=' . self::SLUG ) ) . '">Settings</a>' );
		return $links;
	}

	public static function register() {
		register_setting(
			'stardew_tools',
			Ads::OPTION,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( 'Stardew_Tools\Ads', 'sanitize' ),
				'default'           => Ads::defaults(),
			)
		);
	}

	public static function page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$s     = Ads::settings();
		$name  = Ads::OPTION;
		$theme = wp_get_theme();
		?>
		<div class="wrap">
			<h1>Stardew Tools</h1>

			<h2>Status</h2>
			<table class="widefat striped" style="max-width:720px">
				<tbody>
					<tr><td>Plugin version</td><td><?php echo esc_html( STARDEW_TOOLS_VERSION ); ?></td></tr>
					<tr><td>Active theme</td><td><?php echo esc_html( $theme->get( 'Name' ) ); ?><?php echo 'stardew-tools-theme' === get_stylesheet() ? '' : ' — activate <strong>Stardew Tools Theme</strong> under Appearance &gt; Themes'; ?></td></tr>
					<tr><td>Game data version</td><td><?php echo esc_html( Config::get( 'game_version' ) ); ?></td></tr>
					<tr><td>Search engines</td><td><?php echo get_option( 'blog_public' ) ? 'Allowed' : '<strong>Blocked</strong> (Settings &gt; Reading)'; ?></td></tr>
					<tr><td>Ad slots</td><td><?php echo $s['show_slots'] ? 'On' : 'Off (nothing ad-related is shown on the site)'; ?></td></tr>
				</tbody>
			</table>

			<h2>Advertising (Google AdSense)</h2>
			<p style="max-width:720px">Leave everything off until you are ready to apply. To apply: paste your publisher ID and tick the first box, which adds the AdSense code Google needs to review the site. After approval, create ad units in AdSense, paste their slot IDs below, and tick the second box.</p>
			<form method="post" action="options.php">
				<?php settings_fields( 'stardew_tools' ); ?>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="st-client">Publisher ID</label></th>
						<td><input id="st-client" class="regular-text" name="<?php echo esc_attr( $name ); ?>[client]" value="<?php echo esc_attr( $s['client'] ); ?>" placeholder="ca-pub-0000000000000000">
						<p class="description">Also publishes /ads.txt automatically.</p></td>
					</tr>
					<tr>
						<th scope="row">AdSense code</th>
						<td><label><input type="checkbox" name="<?php echo esc_attr( $name ); ?>[load_script]" value="1" <?php checked( $s['load_script'] ); ?>> Add the AdSense code to the site (needed for review)</label></td>
					</tr>
					<tr>
						<th scope="row">Ad slots</th>
						<td><label><input type="checkbox" name="<?php echo esc_attr( $name ); ?>[show_slots]" value="1" <?php checked( $s['show_slots'] ); ?>> Show ad slots (only after AdSense approval)</label></td>
					</tr>
					<?php foreach ( Ads::PLACEMENTS as $key => $p ) : ?>
					<tr>
						<th scope="row"><label for="st-slot-<?php echo esc_attr( $key ); ?>"><?php echo esc_html( $p[0] ); ?></label></th>
						<td><input id="st-slot-<?php echo esc_attr( $key ); ?>" name="<?php echo esc_attr( $name ); ?>[slots][<?php echo esc_attr( $key ); ?>]" value="<?php echo esc_attr( isset( $s['slots'][ $key ] ) ? $s['slots'][ $key ] : '' ); ?>" placeholder="Slot ID, e.g. 1234567890"></td>
					</tr>
					<?php endforeach; ?>
				</table>
				<?php submit_button(); ?>
			</form>
		</div>
		<?php
	}
}

<?php
/**
 * Plugin Name:       Reading Tracker
 * Plugin URI:        https://reading-tracker.app/
 * Description:       Adds a reading guide to your site: visitors can dim the page and keep a reading band that follows the pointer.
 * Version:           0.1.0
 * Requires at least: 6.3
 * Requires PHP:      7.4
 * Author:            MT-planning, Ltd.
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       reading-tracker
 * Domain Path:       /languages
 *
 * @package Reading_Tracker
 */

defined( 'ABSPATH' ) || exit;

define( 'MTP_RT_LIB_VERSION', '0.1.1' ); // Bundled library version; also the script's "ver".
define( 'MTP_RT_FILE', __FILE__ );
define( 'MTP_RT_DIR', plugin_dir_path( __FILE__ ) );

require_once MTP_RT_DIR . 'includes/class-mtp-rt-options.php';
require_once MTP_RT_DIR . 'includes/class-mtp-rt-frontend.php';

/**
 * Load the translations bundled in languages/ (currently Japanese).
 */
function mtp_rt_load_textdomain() {
	load_plugin_textdomain( 'reading-tracker', false, dirname( plugin_basename( MTP_RT_FILE ) ) . '/languages' );
}
add_action( 'init', 'mtp_rt_load_textdomain' );

MTP_RT_Frontend::init();

if ( is_admin() ) {
	require_once MTP_RT_DIR . 'includes/class-mtp-rt-admin.php';
	require_once MTP_RT_DIR . 'includes/class-mtp-rt-meta-box.php';
	MTP_RT_Admin::init();
	MTP_RT_Meta_Box::init();
}

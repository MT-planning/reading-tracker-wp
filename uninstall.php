<?php
/**
 * Removes the plugin's data when it is deleted from the Plugins screen.
 *
 * @package Reading_Tracker
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

/**
 * Delete the option and post meta of the current site.
 */
function mtp_rt_uninstall_site() {
	delete_option( 'mtp_rt_settings' );
	delete_post_meta_by_key( '_mtp_rt_visibility' );
}

if ( is_multisite() ) {
	foreach ( get_sites( array( 'fields' => 'ids', 'number' => 0 ) ) as $mtp_rt_site_id ) {
		switch_to_blog( $mtp_rt_site_id );
		mtp_rt_uninstall_site();
		restore_current_blog();
	}
} else {
	mtp_rt_uninstall_site();
}

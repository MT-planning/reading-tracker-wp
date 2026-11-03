<?php
/**
 * Front end: loads the bundled library and initializes it.
 *
 * @package Reading_Tracker
 */

defined( 'ABSPATH' ) || exit;

/**
 * Enqueues the library on pages where the guide is enabled.
 */
class MTP_RT_Frontend {

	const HANDLE = 'mtp-reading-tracker';

	/**
	 * Post meta key for the per-post override: '' (site setting), 'show', 'hide'.
	 */
	const META_KEY = '_mtp_rt_visibility';

	/**
	 * Register hooks.
	 */
	public static function init() {
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue' ) );
	}

	/**
	 * Whether the guide should be available on the current request.
	 *
	 * @return bool
	 */
	public static function is_enabled() {
		if ( is_feed() || is_embed() ) {
			$enabled = false;
		} else {
			$o       = MTP_RT_Options::get();
			$enabled = 'everywhere' === $o['display']
				|| ( is_singular() && in_array( get_post_type(), (array) $o['post_types'], true ) );

			if ( is_singular() ) {
				$override = get_post_meta( get_queried_object_id(), self::META_KEY, true );
				if ( 'show' === $override ) {
					$enabled = true;
				} elseif ( 'hide' === $override ) {
					$enabled = false;
				}
			}
		}

		/**
		 * Filters whether the reading guide is loaded on the current page.
		 *
		 * @param bool $enabled Whether the guide is enabled.
		 */
		return (bool) apply_filters( 'mtp_rt_enabled', $enabled );
	}

	/**
	 * Enqueue the library and the init call.
	 */
	public static function enqueue() {
		if ( ! self::is_enabled() ) {
			return;
		}

		$min = ( defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ) ? '' : '.min';

		wp_enqueue_script(
			self::HANDLE,
			plugins_url( "assets/js/reading-tracker{$min}.js", MTP_RT_FILE ),
			array(),
			MTP_RT_LIB_VERSION,
			array(
				'in_footer' => true,
				'strategy'  => 'defer',
			)
		);

		/**
		 * Filters the options passed to ReadingTracker.init().
		 *
		 * @param array $options Library options.
		 */
		$options = apply_filters( 'mtp_rt_library_options', MTP_RT_Options::to_library_options() );

		// JSON_HEX_TAG / JSON_HEX_AMP: no "<", ">" or "&" can appear literally
		// inside the inline <script>, whatever the filter returns.
		wp_add_inline_script(
			self::HANDLE,
			'window.ReadingTracker&&ReadingTracker.init(' . wp_json_encode( $options, JSON_HEX_TAG | JSON_HEX_AMP ) . ');',
			'after'
		);
	}
}

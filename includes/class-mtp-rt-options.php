<?php
/**
 * Plugin settings: defaults, sanitizing, and conversion to library options.
 *
 * @package Reading_Tracker
 */

defined( 'ABSPATH' ) || exit;

/**
 * Stores all settings in a single option (MTP_RT_Options::OPTION).
 */
class MTP_RT_Options {

	const OPTION = 'mtp_rt_settings';

	const POSITIONS    = array( 'bottom-right', 'bottom-left', 'top-right', 'top-left' );
	const FONT_SIZES   = array( 100, 150, 200 );
	const LINE_HEIGHTS = array( 100, 200, 400 );
	const GAP_MIN      = 24;
	const GAP_MAX      = 400;

	/**
	 * Library options that are plain on/off switches.
	 */
	const SWITCHES = array( 'closeButton', 'shortcuts', 'persist', 'resume', 'fontPicker' );

	/**
	 * Default settings. Guide values match the library's defaults.
	 *
	 * @return array
	 */
	public static function defaults() {
		return array(
			// Where the guide is available.
			'display'          => 'everywhere', // 'everywhere' | 'post_types'.
			'post_types'       => array( 'post', 'page' ),
			// Library options.
			'position'         => 'bottom-right',
			'closeButton'      => true,
			'shortcuts'        => true,
			'persist'          => true,
			'resume'           => true,
			'fontPicker'       => true,
			'contentSelector'  => '.entry-content, .wp-block-post-content',
			// Initial guide settings (visitors' saved settings take precedence).
			'gapPx'            => 120,
			'gapColor'         => '#8fb89a',
			'gapOpacity'       => 25,
			'overlayColor'     => '#0f172a',
			'overlayOpacity'   => 82,
			'blendMultiply'    => false,
			'verticalWriting'  => false,
			'fontSizePercent'  => 100,
			'lineHeightPercent' => 100,
			'fontFamily'       => '',
		);
	}

	/**
	 * Saved settings merged over the defaults.
	 *
	 * @return array
	 */
	public static function get() {
		$saved = get_option( self::OPTION, array() );
		if ( ! is_array( $saved ) ) {
			$saved = array();
		}
		return array_merge( self::defaults(), $saved );
	}

	/**
	 * Sanitize callback for register_setting(). Checkboxes that are absent
	 * from the submitted form are treated as off.
	 *
	 * @param mixed $input Submitted values.
	 * @return array
	 */
	public static function sanitize( $input ) {
		$d     = self::defaults();
		$input = is_array( $input ) ? $input : array();
		$out   = array();

		$out['display'] = 'post_types' === self::str( $input, 'display' ) ? 'post_types' : 'everywhere';

		$out['post_types'] = array();
		if ( isset( $input['post_types'] ) && is_array( $input['post_types'] ) ) {
			$allowed = array_keys( self::selectable_post_types() );
			foreach ( $input['post_types'] as $pt ) {
				$pt = is_string( $pt ) ? sanitize_key( $pt ) : '';
				if ( in_array( $pt, $allowed, true ) ) {
					$out['post_types'][] = $pt;
				}
			}
		} elseif ( 'everywhere' === $out['display'] ) {
			// The checkboxes are disabled (not submitted) while "All pages" is selected: keep the saved choice.
			$saved = get_option( self::OPTION );
			if ( is_array( $saved ) && isset( $saved['post_types'] ) && is_array( $saved['post_types'] ) ) {
				$out['post_types'] = array_values( array_intersect( $saved['post_types'], array_keys( self::selectable_post_types() ) ) );
			} else {
				$out['post_types'] = $d['post_types'];
			}
		}

		$position        = self::str( $input, 'position' );
		$out['position'] = in_array( $position, self::POSITIONS, true ) ? $position : $d['position'];

		foreach ( self::SWITCHES as $key ) {
			$out[ $key ] = ! empty( $input[ $key ] );
		}
		$out['blendMultiply']   = ! empty( $input['blendMultiply'] );
		$out['verticalWriting'] = ! empty( $input['verticalWriting'] );

		$out['contentSelector'] = isset( $input['contentSelector'] )
			? self::sanitize_selector( self::str( $input, 'contentSelector' ) )
			: $d['contentSelector'];

		$out['gapPx'] = isset( $input['gapPx'] ) && is_numeric( $input['gapPx'] )
			? min( self::GAP_MAX, max( self::GAP_MIN, (int) round( (float) $input['gapPx'] ) ) )
			: $d['gapPx'];

		foreach ( array( 'gapColor', 'overlayColor' ) as $key ) {
			$color       = sanitize_hex_color( self::str( $input, $key ) );
			$out[ $key ] = $color ? self::hex6( $color ) : $d[ $key ];
		}
		foreach ( array( 'gapOpacity', 'overlayOpacity' ) as $key ) {
			$out[ $key ] = isset( $input[ $key ] ) && is_numeric( $input[ $key ] )
				? min( 100, max( 0, (int) $input[ $key ] ) )
				: $d[ $key ];
		}

		$size                   = (int) self::str( $input, 'fontSizePercent' );
		$out['fontSizePercent'] = in_array( $size, self::FONT_SIZES, true ) ? $size : $d['fontSizePercent'];

		$line                     = (int) self::str( $input, 'lineHeightPercent' );
		$out['lineHeightPercent'] = in_array( $line, self::LINE_HEIGHTS, true ) ? $line : $d['lineHeightPercent'];

		$out['fontFamily'] = self::sanitize_font_family( self::str( $input, 'fontFamily' ) );

		return $out;
	}

	/**
	 * A submitted value as a string ('' when missing or not a scalar, e.g. an array).
	 *
	 * @param array  $input Submitted values.
	 * @param string $key   Key.
	 * @return string
	 */
	private static function str( $input, $key ) {
		return isset( $input[ $key ] ) && is_scalar( $input[ $key ] ) ? (string) $input[ $key ] : '';
	}

	/**
	 * CSS selector list. Characters that could break out of a selector are removed.
	 *
	 * @param string $value Raw value.
	 * @return string
	 */
	public static function sanitize_selector( $value ) {
		$value = sanitize_text_field( $value );
		$value = preg_replace( '/[{};<>\\\\@]/', '', $value );
		return trim( substr( $value, 0, 500 ) );
	}

	/**
	 * Font family name or list. Characters that could break out of a CSS value are removed.
	 *
	 * @param string $value Raw value.
	 * @return string
	 */
	public static function sanitize_font_family( $value ) {
		$value = sanitize_text_field( $value );
		$value = preg_replace( '/[{};<>\\\\()]/', '', $value );
		return trim( substr( $value, 0, 200 ) );
	}

	/**
	 * Post types the guide can be limited to: public ones except attachments.
	 *
	 * @return array<string, string> Slug => label.
	 */
	public static function selectable_post_types() {
		$types = get_post_types( array( 'public' => true ), 'objects' );
		unset( $types['attachment'] );
		$out = array();
		foreach ( $types as $slug => $obj ) {
			$out[ $slug ] = $obj->labels->singular_name;
		}
		return $out;
	}

	/**
	 * #rgb / #rrggbb → lowercase #rrggbb (the form <input type="color"> accepts).
	 *
	 * @param string $hex Valid hex color.
	 * @return string
	 */
	private static function hex6( $hex ) {
		$h = strtolower( ltrim( $hex, '#' ) );
		if ( 3 === strlen( $h ) ) {
			$h = $h[0] . $h[0] . $h[1] . $h[1] . $h[2] . $h[2];
		}
		return '#' . $h;
	}

	/**
	 * Hex color + opacity percent → rgba() string the library accepts.
	 *
	 * @param string $hex     #rrggbb or #rgb.
	 * @param int    $percent 0–100.
	 * @return string
	 */
	public static function rgba( $hex, $percent ) {
		$n = hexdec( substr( self::hex6( $hex ), 1 ) );
		$a = round( max( 0, min( 100, (int) $percent ) ) / 100, 2 );
		return sprintf( 'rgba(%d, %d, %d, %s)', ( $n >> 16 ) & 255, ( $n >> 8 ) & 255, $n & 255, $a );
	}

	/**
	 * Options object passed to ReadingTracker.init().
	 *
	 * @return array
	 */
	public static function to_library_options() {
		$o = self::get();

		$lib = array(
			'position'        => $o['position'],
			'contentSelector' => '' !== $o['contentSelector'] ? $o['contentSelector'] : 'body',
			'settings'        => array(
				'gapPx'                 => (int) $o['gapPx'],
				'gapColor'              => self::rgba( $o['gapColor'], $o['gapOpacity'] ),
				'overlayColor'          => self::rgba( $o['overlayColor'], $o['overlayOpacity'] ),
				'blendMultiply'         => (bool) $o['blendMultiply'],
				'verticalWriting'       => (bool) $o['verticalWriting'],
				'pageFontSizePercent'   => (int) $o['fontSizePercent'],
				'pageLineHeightPercent' => (int) $o['lineHeightPercent'],
				'pageFontFamily'        => (string) $o['fontFamily'],
			),
		);
		foreach ( self::SWITCHES as $key ) {
			$lib[ $key ] = (bool) $o[ $key ];
		}

		// The library has Japanese and English built in. For other locales,
		// pass the plugin's translations (falls back to English). The library
		// (0.1.1 and later) displays them as plain text, not HTML.
		$locale = get_locale();
		if ( 0 === strpos( $locale, 'ja' ) ) {
			$lib['lang'] = 'ja';
		} else {
			$lib['lang'] = 'en';
			if ( 0 !== strpos( $locale, 'en' ) ) {
				$lib['messages'] = self::messages();
			}
		}

		return $lib;
	}

	/**
	 * Translatable UI strings of the library (keys as in the library's src/i18n.js).
	 *
	 * @return array<string, string>
	 */
	public static function messages() {
		return array(
			'launcher'        => __( 'Open reading guide settings', 'reading-tracker' ),
			'panelTitle'      => __( 'Reading Tracker', 'reading-tracker' ),
			'closePanel'      => __( 'Close settings', 'reading-tracker' ),
			'start'           => __( 'Show guide', 'reading-tracker' ),
			'stop'            => __( 'Hide guide', 'reading-tracker' ),
			'fitOn'           => __( 'Expand guide to full screen', 'reading-tracker' ),
			'fitOff'          => __( 'Restore guide size', 'reading-tracker' ),
			'closeGuide'      => __( '✕ Hide guide', 'reading-tracker' ),
			'gap'             => __( 'Guide height (px) and color', 'reading-tracker' ),
			'gapVertical'     => __( 'Guide width (px) and color', 'reading-tracker' ),
			'mask'            => __( 'Mask color', 'reading-tracker' ),
			'opacity'         => __( 'Opacity', 'reading-tracker' ),
			'blend'           => __( 'Sharper text', 'reading-tracker' ),
			'writing'         => __( 'Writing mode', 'reading-tracker' ),
			'horizontal'      => __( 'Horizontal', 'reading-tracker' ),
			'vertical'        => __( 'Vertical', 'reading-tracker' ),
			'fontSize'        => __( 'Text size', 'reading-tracker' ),
			'lineHeight'      => __( 'Line spacing', 'reading-tracker' ),
			'layoutNote'      => __( '* Some sites may not display correctly.', 'reading-tracker' ),
			'font'            => __( 'Font', 'reading-tracker' ),
			'fontPlaceholder' => __( 'e.g. Verdana', 'reading-tracker' ),
			'loadFonts'       => __( 'Choose from installed fonts', 'reading-tracker' ),
			'loadingFonts'    => __( 'Loading fonts… (allow access if your browser asks)', 'reading-tracker' ),
			'fontsFailed'     => __( 'Could not load the font list. Please type a font name.', 'reading-tracker' ),
			'fontsEmpty'      => __( 'No fonts were found.', 'reading-tracker' ),
			'fontFilter'      => __( 'Filter fonts', 'reading-tracker' ),
			'fontRecommended' => __( 'Recommended (UD fonts)', 'reading-tracker' ),
			'fontAll'         => __( 'All fonts', 'reading-tracker' ),
			'fontDefault'     => __( "(Use the site's font)", 'reading-tracker' ),
			'reset'           => __( 'Reset to defaults', 'reading-tracker' ),
			'shortcuts'       => __( 'Shortcuts', 'reading-tracker' ),
			'shortcutGuide'   => __( 'Show / hide guide', 'reading-tracker' ),
			'shortcutFit'     => __( 'Expand / restore guide', 'reading-tracker' ),
			'shortcutEsc'     => __( 'Hide guide', 'reading-tracker' ),
			'scaleNormal'     => __( '1x (default)', 'reading-tracker' ),
		);
	}
}

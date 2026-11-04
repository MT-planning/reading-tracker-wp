<?php
/**
 * Settings screen (Settings > Reading Tracker).
 *
 * @package Reading_Tracker
 */

defined( 'ABSPATH' ) || exit;

/**
 * Settings API registration and rendering.
 */
class MTP_RT_Admin {

	const PAGE  = 'mtp-reading-tracker';
	const GROUP = 'mtp_rt_settings_group';

	/**
	 * Register hooks.
	 */
	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'add_page' ) );
		add_action( 'admin_init', array( __CLASS__, 'register' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( MTP_RT_FILE ), array( __CLASS__, 'action_links' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue' ) );
	}

	/**
	 * On the settings page, disable the post type checkboxes while "All pages" is selected.
	 *
	 * @param string $hook_suffix Current admin page.
	 */
	public static function enqueue( $hook_suffix ) {
		if ( 'settings_page_' . self::PAGE !== $hook_suffix ) {
			return;
		}
		$handle = 'mtp-rt-admin';
		wp_register_script( $handle, false, array(), MTP_RT_LIB_VERSION, true );
		wp_enqueue_script( $handle );
		wp_add_inline_script(
			$handle,
			'(function(){'
			. 'var radios=document.querySelectorAll(\'input[name="' . esc_js( self::name( 'display' ) ) . '"]\'),'
			. 'boxes=document.querySelectorAll("#mtp_rt_post_types input");'
			. 'function sync(){var all=false;radios.forEach(function(r){if(r.checked&&r.value==="everywhere"){all=true;}});'
			. 'boxes.forEach(function(b){b.disabled=all;});}'
			. 'radios.forEach(function(r){r.addEventListener("change",sync);});sync();'
			. '})();'
		);
	}

	/**
	 * Add the page under Settings.
	 */
	public static function add_page() {
		add_options_page(
			__( 'Reading Tracker', 'reading-tracker' ),
			__( 'Reading Tracker', 'reading-tracker' ),
			'manage_options',
			self::PAGE,
			array( __CLASS__, 'render_page' )
		);
	}

	/**
	 * "Settings" link on the Plugins screen.
	 *
	 * @param array $links Existing links.
	 * @return array
	 */
	public static function action_links( $links ) {
		$url = admin_url( 'options-general.php?page=' . self::PAGE );
		array_unshift( $links, '<a href="' . esc_url( $url ) . '">' . esc_html__( 'Settings', 'reading-tracker' ) . '</a>' );
		return $links;
	}

	/**
	 * Register the setting, sections and fields.
	 */
	public static function register() {
		register_setting(
			self::GROUP,
			MTP_RT_Options::OPTION,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( 'MTP_RT_Options', 'sanitize' ),
				'default'           => MTP_RT_Options::defaults(),
			)
		);

		add_settings_section(
			'mtp_rt_display',
			__( 'Display', 'reading-tracker' ),
			'__return_false',
			self::PAGE
		);
		add_settings_field( 'display', __( 'Where to show', 'reading-tracker' ), array( __CLASS__, 'field_display' ), self::PAGE, 'mtp_rt_display' );
		add_settings_field(
			'position',
			__( 'Button position', 'reading-tracker' ),
			array( __CLASS__, 'field_position' ),
			self::PAGE,
			'mtp_rt_display',
			array( 'label_for' => 'mtp_rt_position' )
		);
		add_settings_field( 'features', __( 'Features', 'reading-tracker' ), array( __CLASS__, 'field_features' ), self::PAGE, 'mtp_rt_display' );
		add_settings_field(
			'contentSelector',
			__( 'Content area', 'reading-tracker' ),
			array( __CLASS__, 'field_selector' ),
			self::PAGE,
			'mtp_rt_display',
			array( 'label_for' => 'mtp_rt_contentSelector' )
		);

		add_settings_section(
			'mtp_rt_defaults',
			__( 'Initial guide settings', 'reading-tracker' ),
			array( __CLASS__, 'section_defaults' ),
			self::PAGE
		);
		add_settings_field(
			'gapPx',
			__( 'Reading band size', 'reading-tracker' ),
			array( __CLASS__, 'field_gap' ),
			self::PAGE,
			'mtp_rt_defaults',
			array( 'label_for' => 'mtp_rt_gapPx' )
		);
		add_settings_field(
			'gapColor',
			__( 'Reading band color', 'reading-tracker' ),
			array( __CLASS__, 'field_color' ),
			self::PAGE,
			'mtp_rt_defaults',
			array(
				'label_for' => 'mtp_rt_gapColor',
				'color'     => 'gapColor',
				'opacity'   => 'gapOpacity',
			)
		);
		add_settings_field(
			'overlayColor',
			__( 'Mask color', 'reading-tracker' ),
			array( __CLASS__, 'field_color' ),
			self::PAGE,
			'mtp_rt_defaults',
			array(
				'label_for' => 'mtp_rt_overlayColor',
				'color'     => 'overlayColor',
				'opacity'   => 'overlayOpacity',
			)
		);
		add_settings_field( 'modes', __( 'Options', 'reading-tracker' ), array( __CLASS__, 'field_modes' ), self::PAGE, 'mtp_rt_defaults' );
		add_settings_field(
			'fontSizePercent',
			__( 'Text size', 'reading-tracker' ),
			array( __CLASS__, 'field_select' ),
			self::PAGE,
			'mtp_rt_defaults',
			array(
				'label_for' => 'mtp_rt_fontSizePercent',
				'key'       => 'fontSizePercent',
				'choices'   => MTP_RT_Options::FONT_SIZES,
			)
		);
		add_settings_field(
			'lineHeightPercent',
			__( 'Line spacing', 'reading-tracker' ),
			array( __CLASS__, 'field_select' ),
			self::PAGE,
			'mtp_rt_defaults',
			array(
				'label_for' => 'mtp_rt_lineHeightPercent',
				'key'       => 'lineHeightPercent',
				'choices'   => MTP_RT_Options::LINE_HEIGHTS,
			)
		);
		add_settings_field(
			'fontFamily',
			__( 'Font', 'reading-tracker' ),
			array( __CLASS__, 'field_font' ),
			self::PAGE,
			'mtp_rt_defaults',
			array( 'label_for' => 'mtp_rt_fontFamily' )
		);
	}

	/**
	 * Field name attribute for a setting key.
	 *
	 * @param string $key Setting key.
	 * @return string
	 */
	private static function name( $key ) {
		return MTP_RT_Options::OPTION . '[' . $key . ']';
	}

	/**
	 * Render the page.
	 */
	public static function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap">
			<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
			<form action="options.php" method="post">
				<?php
				settings_fields( self::GROUP );
				do_settings_sections( self::PAGE );
				submit_button();
				?>
			</form>
		</div>
		<?php
	}

	/**
	 * Description of the initial-settings section.
	 */
	public static function section_defaults() {
		echo '<p>' . esc_html__( 'These are the values visitors see first. Each visitor can change them in the guide panel, and their own settings are saved in their browser.', 'reading-tracker' ) . '</p>';
	}

	/**
	 * Where to show.
	 */
	public static function field_display() {
		$o = MTP_RT_Options::get();
		?>
		<fieldset>
			<legend class="screen-reader-text"><?php esc_html_e( 'Where to show', 'reading-tracker' ); ?></legend>
			<label>
				<input type="radio" name="<?php echo esc_attr( self::name( 'display' ) ); ?>" value="everywhere" <?php checked( $o['display'], 'everywhere' ); ?>>
				<?php esc_html_e( 'All pages', 'reading-tracker' ); ?>
			</label><br>
			<label>
				<input type="radio" name="<?php echo esc_attr( self::name( 'display' ) ); ?>" value="post_types" <?php checked( $o['display'], 'post_types' ); ?>>
				<?php esc_html_e( 'Only on single pages of these content types:', 'reading-tracker' ); ?>
			</label>
			<p id="mtp_rt_post_types" style="margin-left:1.8em">
				<?php foreach ( MTP_RT_Options::selectable_post_types() as $slug => $label ) : ?>
					<label style="margin-right:1em">
						<input type="checkbox" name="<?php echo esc_attr( self::name( 'post_types' ) ); ?>[]" value="<?php echo esc_attr( $slug ); ?>" <?php checked( in_array( $slug, (array) $o['post_types'], true ) ); ?> <?php disabled( $o['display'], 'everywhere' ); ?>>
						<?php echo esc_html( $label ); ?>
					</label>
				<?php endforeach; ?>
			</p>
			<p class="description"><?php esc_html_e( 'You can also show or hide the guide on an individual post or page from its edit screen.', 'reading-tracker' ); ?></p>
		</fieldset>
		<?php
	}

	/**
	 * Launcher position.
	 */
	public static function field_position() {
		$o      = MTP_RT_Options::get();
		$labels = array(
			'bottom-right' => __( 'Bottom right', 'reading-tracker' ),
			'bottom-left'  => __( 'Bottom left', 'reading-tracker' ),
			'top-right'    => __( 'Top right', 'reading-tracker' ),
			'top-left'     => __( 'Top left', 'reading-tracker' ),
		);
		echo '<select id="mtp_rt_position" name="' . esc_attr( self::name( 'position' ) ) . '">';
		foreach ( $labels as $value => $label ) {
			echo '<option value="' . esc_attr( $value ) . '"' . selected( $o['position'], $value, false ) . '>' . esc_html( $label ) . '</option>';
		}
		echo '</select>';
		echo '<p class="description">' . esc_html__( 'Corner of the screen where the guide button appears.', 'reading-tracker' ) . '</p>';
	}

	/**
	 * Checkboxes for the library switches.
	 */
	public static function field_features() {
		$o      = MTP_RT_Options::get();
		$labels = array(
			'closeButton' => __( 'Show a "Hide guide" button at the top of the screen while the guide is on', 'reading-tracker' ),
			'shortcuts'   => __( 'Enable keyboard shortcuts (Alt + Shift + G / F, Esc)', 'reading-tracker' ),
			'persist'     => __( "Remember each visitor's settings in their browser", 'reading-tracker' ),
			'resume'      => __( 'Keep the guide on when the visitor moves to another page in the same tab', 'reading-tracker' ),
			'fontPicker'  => __( 'Let visitors choose from fonts installed on their device (supported browsers only)', 'reading-tracker' ),
		);
		echo '<fieldset><legend class="screen-reader-text">' . esc_html__( 'Features', 'reading-tracker' ) . '</legend>';
		foreach ( $labels as $key => $label ) {
			printf(
				'<label><input type="checkbox" name="%1$s" value="1" %2$s> %3$s</label><br>',
				esc_attr( self::name( $key ) ),
				checked( ! empty( $o[ $key ] ), true, false ),
				esc_html( $label )
			);
		}
		echo '</fieldset>';
	}

	/**
	 * Content selector.
	 */
	public static function field_selector() {
		$o = MTP_RT_Options::get();
		printf(
			'<input type="text" class="regular-text code" id="mtp_rt_contentSelector" name="%1$s" value="%2$s">',
			esc_attr( self::name( 'contentSelector' ) ),
			esc_attr( $o['contentSelector'] )
		);
		echo '<p class="description">' . esc_html__( 'CSS selector of the area where line spacing and font changes apply. Limiting it to the post content keeps the layout from breaking. Leave empty to apply to the whole page.', 'reading-tracker' ) . '</p>';
	}

	/**
	 * Reading band size.
	 */
	public static function field_gap() {
		$o = MTP_RT_Options::get();
		printf(
			'<input type="number" class="small-text" id="mtp_rt_gapPx" name="%1$s" value="%2$d" min="%3$d" max="%4$d" step="1"> px',
			esc_attr( self::name( 'gapPx' ) ),
			(int) $o['gapPx'],
			(int) MTP_RT_Options::GAP_MIN,
			(int) MTP_RT_Options::GAP_MAX
		);
		echo '<p class="description">' . esc_html(
			sprintf(
				/* translators: 1: minimum, 2: maximum (pixels). */
				__( 'Height of the band (width in vertical writing mode). %1$d–%2$d px.', 'reading-tracker' ),
				MTP_RT_Options::GAP_MIN,
				MTP_RT_Options::GAP_MAX
			)
		) . '</p>';
	}

	/**
	 * Color + opacity.
	 *
	 * @param array $args Field args (color, opacity keys).
	 */
	public static function field_color( $args ) {
		$o = MTP_RT_Options::get();
		printf(
			'<input type="color" id="mtp_rt_%1$s" name="%2$s" value="%3$s"> ',
			esc_attr( $args['color'] ),
			esc_attr( self::name( $args['color'] ) ),
			esc_attr( $o[ $args['color'] ] )
		);
		printf(
			'<label>%1$s <input type="number" class="small-text" name="%2$s" value="%3$d" min="0" max="100" step="1"> %%</label>',
			esc_html__( 'Opacity', 'reading-tracker' ),
			esc_attr( self::name( $args['opacity'] ) ),
			(int) $o[ $args['opacity'] ]
		);
	}

	/**
	 * Sharper text / vertical writing.
	 */
	public static function field_modes() {
		$o      = MTP_RT_Options::get();
		$labels = array(
			'blendMultiply'   => __( 'Sharper text (overlay the guide with multiply blending)', 'reading-tracker' ),
			'verticalWriting' => __( 'Vertical writing mode', 'reading-tracker' ),
		);
		echo '<fieldset><legend class="screen-reader-text">' . esc_html__( 'Options', 'reading-tracker' ) . '</legend>';
		foreach ( $labels as $key => $label ) {
			printf(
				'<label><input type="checkbox" name="%1$s" value="1" %2$s> %3$s</label><br>',
				esc_attr( self::name( $key ) ),
				checked( ! empty( $o[ $key ] ), true, false ),
				esc_html( $label )
			);
		}
		echo '</fieldset>';
	}

	/**
	 * Percent select (text size / line spacing).
	 *
	 * @param array $args Field args (key, choices).
	 */
	public static function field_select( $args ) {
		$o = MTP_RT_Options::get();
		printf( '<select id="mtp_rt_%1$s" name="%2$s">', esc_attr( $args['key'] ), esc_attr( self::name( $args['key'] ) ) );
		foreach ( $args['choices'] as $pct ) {
			if ( 100 === $pct ) {
				$label = __( '1x (default)', 'reading-tracker' );
			} else {
				/* translators: %s: scale factor such as 1.5 or 2. */
				$label = sprintf( __( '%sx', 'reading-tracker' ), number_format_i18n( $pct / 100, 0 === $pct % 100 ? 0 : 1 ) );
			}
			printf(
				'<option value="%1$d"%2$s>%3$s</option>',
				(int) $pct,
				selected( (int) $o[ $args['key'] ], $pct, false ),
				esc_html( $label )
			);
		}
		echo '</select>';
	}

	/**
	 * Font family.
	 */
	public static function field_font() {
		$o = MTP_RT_Options::get();
		printf(
			'<input type="text" class="regular-text" id="mtp_rt_fontFamily" name="%1$s" value="%2$s" placeholder="%3$s">',
			esc_attr( self::name( 'fontFamily' ) ),
			esc_attr( $o['fontFamily'] ),
			esc_attr__( 'e.g. BIZ UDPGothic', 'reading-tracker' )
		);
		echo '<p class="description">' . esc_html__( "Leave empty to keep the site's font. The font must be installed on the visitor's device or loaded by your theme.", 'reading-tracker' ) . '</p>';
	}
}

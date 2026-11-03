<?php
/**
 * Per-post override (show / hide the guide) on the edit screen.
 *
 * @package Reading_Tracker
 */

defined( 'ABSPATH' ) || exit;

/**
 * Meta box with a three-way choice, stored in MTP_RT_Frontend::META_KEY.
 */
class MTP_RT_Meta_Box {

	const NONCE = 'mtp_rt_meta_nonce';

	/**
	 * Register hooks.
	 */
	public static function init() {
		add_action( 'add_meta_boxes', array( __CLASS__, 'add' ) );
		add_action( 'save_post', array( __CLASS__, 'save' ) );
	}

	/**
	 * Add the box to every selectable post type.
	 */
	public static function add() {
		foreach ( array_keys( MTP_RT_Options::selectable_post_types() ) as $pt ) {
			add_meta_box(
				'mtp-reading-tracker',
				__( 'Reading Tracker', 'reading-tracker' ),
				array( __CLASS__, 'render' ),
				$pt,
				'side',
				'low'
			);
		}
	}

	/**
	 * Render the box.
	 *
	 * @param WP_Post $post Current post.
	 */
	public static function render( $post ) {
		$value   = get_post_meta( $post->ID, MTP_RT_Frontend::META_KEY, true );
		$choices = array(
			''     => __( 'Follow the site setting', 'reading-tracker' ),
			'show' => __( 'Show the reading guide', 'reading-tracker' ),
			'hide' => __( 'Hide the reading guide', 'reading-tracker' ),
		);
		wp_nonce_field( 'mtp_rt_save_' . $post->ID, self::NONCE );
		echo '<fieldset><legend class="screen-reader-text">' . esc_html__( 'Reading guide on this page', 'reading-tracker' ) . '</legend>';
		foreach ( $choices as $v => $label ) {
			printf(
				'<label style="display:block;margin:.3em 0"><input type="radio" name="mtp_rt_visibility" value="%1$s" %2$s> %3$s</label>',
				esc_attr( $v ),
				checked( $value, $v, false ),
				esc_html( $label )
			);
		}
		echo '</fieldset>';
	}

	/**
	 * Save the choice.
	 *
	 * @param int $post_id Post ID.
	 */
	public static function save( $post_id ) {
		if ( ! isset( $_POST[ self::NONCE ] ) ) {
			return;
		}
		$nonce = sanitize_text_field( wp_unslash( $_POST[ self::NONCE ] ) );
		if ( ! wp_verify_nonce( $nonce, 'mtp_rt_save_' . $post_id ) ) {
			return;
		}
		if ( ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) || wp_is_post_revision( $post_id ) ) {
			return;
		}
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		$value = isset( $_POST['mtp_rt_visibility'] ) ? sanitize_key( wp_unslash( $_POST['mtp_rt_visibility'] ) ) : '';
		if ( 'show' === $value || 'hide' === $value ) {
			update_post_meta( $post_id, MTP_RT_Frontend::META_KEY, $value );
		} else {
			delete_post_meta( $post_id, MTP_RT_Frontend::META_KEY );
		}
	}
}

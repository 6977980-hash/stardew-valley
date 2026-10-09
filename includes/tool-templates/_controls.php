<?php
/**
 * Small form-control helpers shared by the tool templates.
 *
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'stardew_tools_select' ) ) {
	/** <label> + <select>. $options: value => label. */
	function stardew_tools_select( $name, $label, $options, $selected, $hint = '' ) {
		$id = 'st-' . $name;
		echo '<div class="field"><label for="' . esc_attr( $id ) . '">' . esc_html( $label ) . '</label>';
		echo '<select id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '"' . ( $hint ? ' aria-describedby="' . esc_attr( $id ) . '-hint"' : '' ) . '>';
		foreach ( $options as $value => $text ) {
			echo '<option value="' . esc_attr( $value ) . '"' . selected( (string) $value, (string) $selected, false ) . '>' . esc_html( $text ) . '</option>';
		}
		echo '</select>';
		if ( $hint ) {
			echo '<p class="field__hint" id="' . esc_attr( $id ) . '-hint">' . esc_html( $hint ) . '</p>';
		}
		echo '</div>';
	}

	/** <label> + number input. */
	function stardew_tools_number( $name, $label, $value, $min, $max, $hint = '' ) {
		$id = 'st-' . $name;
		printf(
			'<div class="field"><label for="%1$s">%2$s</label><input id="%1$s" name="%3$s" type="number" inputmode="numeric" min="%4$d" max="%5$d" step="1" value="%6$d"%7$s>%8$s</div>',
			esc_attr( $id ),
			esc_html( $label ),
			esc_attr( $name ),
			(int) $min,
			(int) $max,
			(int) $value,
			$hint ? ' aria-describedby="' . esc_attr( $id ) . '-hint"' : '',
			$hint ? '<p class="field__hint" id="' . esc_attr( $id ) . '-hint">' . esc_html( $hint ) . '</p>' : ''
		);
	}

	/** Checkbox with label. */
	function stardew_tools_checkbox( $name, $label, $checked = false ) {
		printf(
			'<label class="check"><input type="checkbox" name="%1$s" value="1"%2$s> %3$s</label>',
			esc_attr( $name ),
			checked( $checked, true, false ),
			esc_html( $label )
		);
	}

	/** Option lists used by several tools. */
	function stardew_tools_fertilizer_options() {
		$out = array( '' => 'None' );
		$fert = Stardew_Tools\Data::get( 'fertilizers' );
		foreach ( $fert ? $fert['fertilizers'] : array() as $f ) {
			$out[ $f['id'] ] = $f['name'];
		}
		return $out;
	}

	function stardew_tools_level_options() {
		$out = array();
		for ( $i = 0; $i <= 14; $i++ ) {
			$out[ $i ] = $i > 10 ? $i . ' (with food buffs)' : (string) $i;
		}
		return $out;
	}

	/** Buttons shown under each tool form. */
	function stardew_tools_form_actions() {
		echo '<div class="tool-actions"><button type="button" class="button button--ghost" data-reset>Reset</button><button type="button" class="button" data-share>Copy link to this result</button><span class="tool-actions__status" data-copy-status role="status" aria-live="polite"></span></div>';
	}

	function stardew_tools_noscript() {
		echo '<noscript><p class="notice">This calculator needs JavaScript. The summary above shows results for the default settings.</p></noscript>';
	}
}

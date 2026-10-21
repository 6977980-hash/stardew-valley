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

	/** <label> + number input. $blank_ok: an empty box is a valid answer (e.g. "no limit"). */
	function stardew_tools_number( $name, $label, $value, $min, $max, $hint = '', $blank_ok = false ) {
		$id = 'st-' . $name;
		printf(
			'<div class="field"><label for="%1$s">%2$s</label><input id="%1$s" name="%3$s" type="number" inputmode="numeric" min="%4$d" max="%5$d" step="1" value="%6$d"%7$s%9$s>%8$s</div>',
			esc_attr( $id ),
			esc_html( $label ),
			esc_attr( $name ),
			(int) $min,
			(int) $max,
			(int) $value,
			$hint ? ' aria-describedby="' . esc_attr( $id ) . '-hint"' : '',
			$hint ? '<p class="field__hint" id="' . esc_attr( $id ) . '-hint">' . esc_html( $hint ) . '</p>' : '',
			$blank_ok ? ' data-blank="none"' : ''
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

	/**
	 * A server-rendered table of the tool's results at its default settings, after the explanation,
	 * so readers without JavaScript, search engines and answer engines get real rows to read and cite.
	 * $head: list of column labels; a label starting with '#' is a number column. $rows: lists of
	 * cells, the first being the row header. A cell is plain text, or array( 'html' => ... ) for
	 * markup the template already escaped.
	 */
	function stardew_tools_reference_table( $id, $title, $intro, $caption, $head, $rows, $note = '' ) {
		if ( ! $rows ) {
			return;
		}
		$num  = array();
		$cell = function ( $c ) {
			return is_array( $c ) ? $c['html'] : esc_html( (string) $c );
		};
		echo '<section class="tool-reference" aria-labelledby="' . esc_attr( $id ) . '"><h2 id="' . esc_attr( $id ) . '">' . esc_html( $title ) . '</h2>';
		if ( $intro ) {
			echo '<p>' . wp_kses_post( $intro ) . '</p>';
		}
		echo '<div class="table-wrap" tabindex="0" role="region" aria-label="' . esc_attr( Stardew_Tools\Entities::TABLE_LABEL ) . '"><table class="results-table"><caption>' . esc_html( $caption ) . '</caption><thead><tr>';
		foreach ( $head as $i => $h ) {
			$num[ $i ] = '#' === substr( $h, 0, 1 );
			echo '<th scope="col"' . ( $num[ $i ] ? ' class="num"' : '' ) . '>' . esc_html( ltrim( $h, '#' ) ) . '</th>';
		}
		echo '</tr></thead><tbody>';
		foreach ( $rows as $row ) {
			echo '<tr>';
			foreach ( array_values( $row ) as $i => $c ) {
				echo 0 === $i ? '<th scope="row">' . $cell( $c ) . '</th>' : '<td' . ( ! empty( $num[ $i ] ) ? ' class="num"' : '' ) . '>' . $cell( $c ) . '</td>'; // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $cell.
			}
			echo '</tr>';
		}
		echo '</tbody></table></div>';
		if ( $note ) {
			echo '<p class="table-note">' . wp_kses_post( $note ) . '</p>';
		}
		echo '</section>';
	}

	/** Buttons shown under each tool form. */
	function stardew_tools_form_actions() {
		echo '<div class="tool-actions"><button type="button" class="button button--ghost" data-reset>Reset</button><button type="button" class="button" data-share>Copy link to this result</button><span class="tool-actions__status" data-copy-status role="status" aria-live="polite"></span></div>';
	}

	function stardew_tools_noscript() {
		echo '<noscript><p class="notice">This calculator needs JavaScript. The summary above and the table at the end of the page show results for the default settings.</p></noscript>';
		stardew_tools_load_check();
	}

	/**
	 * With JavaScript on but the tool module blocked or broken, the results would stay empty with
	 * no word why. A classic inline script shows this notice if the tool has not started 3 seconds
	 * after the page loaded.
	 */
	function stardew_tools_load_check() {
		echo '<p class="notice tool-failed" data-tool-failed role="alert" hidden>The calculator could not load. Reload the page. If it still does not work, try another browser or turn off extensions that block scripts.</p>';
		echo "<script>window.addEventListener('load',function(){setTimeout(function(){if(!document.documentElement.classList.contains('tool-ready')){var n=document.querySelector('[data-tool-failed]');if(n)n.hidden=false}},3000)})</script>";
	}
}

<?php
/** Contact page content. @package Stardew_Tools */
defined( 'ABSPATH' ) || exit;
?>
<p>The fastest way to reach us is by email: <a href="mailto:<?php echo esc_attr( $email ); ?>"><strong><?php echo esc_html( $email ); ?></strong></a></p>

<h2>Useful things to include</h2>
<ul>
<li><strong>Data error:</strong> the page link, the value you think is wrong, the correct value, and your game version and platform (PC, console or mobile).</li>
<li><strong>Tool idea:</strong> the question you were trying to answer and what you could not find elsewhere.</li>
<li><strong>Bug:</strong> your device and browser, and the steps to see the problem.</li>
</ul>
<p>We read every message. Corrections to game data are checked and, when confirmed, listed in the <a href="<?php echo esc_url( $home_url . 'changelog/' ); ?>">changelog</a>.</p>
<p>We cannot help with account, purchase or technical support for the game itself. For those, please contact the game's official support.</p>

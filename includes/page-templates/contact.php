<?php
/** Contact page content. @package Stardew_Tools */
defined( 'ABSPATH' ) || exit;
?>
<p>The fastest way to reach us is by email: <a href="mailto:<?php echo esc_attr( $email ); ?>"><strong><?php echo esc_html( $email ); ?></strong></a></p>

<h2>Useful things to include</h2>
<ul>
<li><strong>Data error:</strong> the page link, the value you think is wrong, the correct value, and your game version and platform (PC, console or mobile). A screenshot from your game helps a lot.</li>
<li><strong>Tool idea:</strong> the question you were trying to answer and what you could not find elsewhere.</li>
<li><strong>Bug:</strong> your device and browser, and the steps to see the problem.</li>
</ul>

<h2>What happens after you write</h2>
<p>We read every message. A reported data error is checked against the Stardew Valley Wiki and the calculation engine. If it is confirmed, the data or the engine is fixed, so every page that uses the value changes together, and the fix is listed with its date in the <a href="<?php echo esc_url( $home_url . 'changelog/' ); ?>">changelog</a>. If your report leads to a fix, we can credit you there; tell us the name to use. If the value turns out to be right, we reply with where it comes from. How values are checked is explained on the <a href="<?php echo esc_url( $home_url . 'methodology/' ); ?>">methodology</a> page.</p>
<p>Before you write, the "Explain the Math" section under each calculator shows every number behind a result, and many questions are answered by changing a setting such as professions or fertilizer.</p>

<h2>What we cannot help with</h2>
<p>We cannot help with account, purchase or technical support for the game itself. For those, please contact the game's official support. <?php echo esc_html( $brand ); ?> is a fan site and is not affiliated with ConcernedApe.</p>

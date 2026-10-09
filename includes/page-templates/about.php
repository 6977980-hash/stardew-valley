<?php
/** About page content. @package Stardew_Tools */
defined( 'ABSPATH' ) || exit;
?>
<p><strong><?php echo esc_html( $brand ); ?></strong> is a free Stardew Valley planning site. It helps you answer practical farm questions: what to plant, which crop earns more, whether to use a Keg or a Preserves Jar, what to do with your greenhouse, and what to do next.</p>

<h2>What makes it different</h2>
<ul>
<li><strong>Decisions, not just numbers.</strong> Each tool tells you which option is better for your situation and why.</li>
<li><strong>Assumptions you can see.</strong> Professions, fertilizer, crop quality and days left in the season are shown next to every result, so you know exactly what a number means.</li>
<li><strong>Verified data.</strong> Values are checked against the game and the community wiki, and every page says which game version it was checked for. See our <a href="<?php echo esc_url( $home_url . 'methodology/' ); ?>">methodology</a>.</li>
<li><strong>Free, with no account.</strong> Your saved plans stay in your own browser.</li>
</ul>

<h2>Who runs it</h2>
<p><?php echo esc_html( $brand ); ?> is built and maintained by <?php echo esc_html( $author ); ?>. It is an independent project with no connection to the game's developer or publisher.</p>

<h2>Get in touch</h2>
<p>Found a wrong number, or want a tool we do not have yet? Email <a href="mailto:<?php echo esc_attr( $email ); ?>"><?php echo esc_html( $email ); ?></a>.</p>

<p><em><?php echo esc_html( $notice ); ?></em></p>

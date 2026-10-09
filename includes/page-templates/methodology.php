<?php
/** Methodology page content. @package Stardew_Tools */
defined( 'ABSPATH' ) || exit;
?>
<p>Every number on <?php echo esc_html( $brand ); ?> comes from verified game data or from an assumption that is written next to it. This page explains how.</p>

<h2>Where the data comes from</h2>
<ul>
<li>The official <a href="https://stardewvalleywiki.com/" rel="noopener">Stardew Valley Wiki</a>, which documents values from the game files.</li>
<li>In-game checks for values that matter most to our calculations.</li>
<li>Reports from players, which are confirmed before any value is changed.</li>
</ul>

<h2>Verification status</h2>
<p>Each record in our data has a status:</p>
<ul>
<li><strong>Verified:</strong> confirmed against the source for the current game version.</li>
<li><strong>Cross-checked:</strong> confirmed in two independent sources.</li>
<li><strong>Needs verification:</strong> collected but not yet confirmed. These values are never used as calculation inputs.</li>
<li><strong>Deprecated:</strong> no longer true in the current game version.</li>
</ul>
<p>When two sources disagree, we do not pick one quietly. The value stays out of calculations until it is resolved.</p>

<h2>Game version</h2>
<p>Data is checked for Stardew Valley <?php echo esc_html( $version ); ?>. When a new version is released, affected tools are re-checked and the changes are listed in the <a href="<?php echo esc_url( $home_url . 'changelog/' ); ?>">changelog</a>.</p>

<h2>How calculations work</h2>
<p>All tools use one shared calculation engine, so the same crop gives the same result everywhere on the site. Each tool shows an "Explain the Math" section with the actual numbers from your inputs, and lists its assumptions, such as professions, fertilizer, crop quality and days left in the season.</p>

<h2>Report a mistake</h2>
<p>If a value looks wrong, email <a href="mailto:<?php echo esc_attr( $email ); ?>"><?php echo esc_html( $email ); ?></a> with the page and your game version.</p>

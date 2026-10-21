<?php
/** Methodology page content. @package Stardew_Tools */
defined( 'ABSPATH' ) || exit;
?>
<p>Every number on <?php echo esc_html( $brand ); ?> comes from checked game data or from an assumption that is written next to it. This page explains where the data comes from, how it is checked, how the calculations work and how mistakes are corrected.</p>

<h2>Where the data comes from</h2>
<ul>
<li>The <a href="https://stardewvalleywiki.com/" rel="noopener">Stardew Valley Wiki</a>, which documents values from the game files. Our import scripts read its pages and keep the page and revision each value came from.</li>
<li>The wiki's own worked examples (crop prices by quality, growth calendars with Speed-Gro, quality chances, fishing XP, fish pond prices). The calculation engine's automated tests must reproduce them exactly before a change goes live.</li>
<li>Reports from players, which are checked against the wiki before any value is changed.</li>
</ul>
<p>We have not yet published our own in-game test records (screenshots or save files). Until we do, no page claims a value was tested in the game; the source of each value is the wiki.</p>

<h2>Verification status</h2>
<p>Each record in our data has a status:</p>
<ul>
<li><strong>Verified:</strong> stated on its wiki page for the current game version.</li>
<li><strong>Cross-checked:</strong> the same value is stated on two separate wiki pages.</li>
<li><strong>Needs verification:</strong> collected but not yet confirmed, for example a value only one page states. These values are never used as calculation inputs.</li>
<li><strong>Deprecated:</strong> no longer true in the current game version.</li>
</ul>
<p>When two sources disagree, we do not pick one quietly. The value is either left out of the calculations until it is resolved, or used with a note on every page that shows it (for example the Dehydrator's processing time and three fish pond spawn rates).</p>

<h2>Game version</h2>
<p>Data is checked for Stardew Valley <?php echo esc_html( $version ); ?>. A script compares this with the wiki's version history, and when a new version is released, affected tools are re-checked and the changes are listed in the <a href="<?php echo esc_url( $home_url . 'changelog/' ); ?>">changelog</a>.</p>

<h2>How calculations work</h2>
<p>All tools, guides and reference pages use one shared calculation engine, so the same crop gives the same result everywhere on the site. The short answers on tool pages, the numbers in guides and the CSV downloads are generated from that engine, and a test fails if any of them goes stale. Each tool shows an "Explain the Math" section with the actual numbers from your inputs, and lists its assumptions, such as professions, fertilizer, crop quality and days left in the season.</p>

<h2>How we write and correct</h2>
<ul>
<li><strong>Who writes:</strong> <?php echo esc_html( $author ); ?> decides what each page covers and what goes live. The code and first drafts of the text are written with help from AI tools (Claude). Figures are never typed in by hand or by the AI: they are filled in from the engine and the data.</li>
<li><strong>Corrections:</strong> when a number is wrong, we fix the data or the engine, not just the page, so every page that uses it changes together. Each fix is listed with its date in the <a href="<?php echo esc_url( $home_url . 'changelog/' ); ?>">changelog</a>.</li>
<li><strong>Reader reports:</strong> if your report leads to a fix, we can credit you in the changelog; tell us the name to use.</li>
<li><strong>Dates:</strong> "Updated" on a page is the later of the day its text changed and the day its data was last checked.</li>
</ul>

<h2>Who maintains the data</h2>
<p>The data, the calculation engine and these pages are maintained by <?php echo esc_html( $author ); ?>, founder of <?php echo esc_html( $brand ); ?> (<a href="<?php echo esc_url( $linkedin ); ?>" rel="me noopener">LinkedIn</a>). Every record keeps its source and the date it was last checked.</p>

<h2>Report a mistake</h2>
<p>If a value looks wrong, email <a href="mailto:<?php echo esc_attr( $email ); ?>"><?php echo esc_html( $email ); ?></a> with the page and your game version, or see the <a href="<?php echo esc_url( $home_url . 'contact/' ); ?>">contact page</a>.</p>

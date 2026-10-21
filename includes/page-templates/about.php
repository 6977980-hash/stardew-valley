<?php
/** About page content. @package Stardew_Tools */
defined( 'ABSPATH' ) || exit;

$ent    = Stardew_Tools\Data::get( 'entities' );
$counts = array(
	'tools'  => count( Stardew_Tools\Tools::definitions() ),
	'guides' => count( Stardew_Tools\Guides::guides() ),
);
foreach ( array( 'crops', 'animals', 'villagers', 'bundles' ) as $type ) {
	$counts[ $type ] = $ent && isset( $ent[ $type ] ) ? count( $ent[ $type ] ) : 0;
}
?>
<p><strong><?php echo esc_html( $brand ); ?></strong> is a free Stardew Valley planning site. It helps you answer practical farm questions: what to plant today, which crop earns more, whether to use a Keg or a Preserves Jar, what to grow in the greenhouse, which villager loves which gift, and what to do next.</p>

<h2>What is on the site</h2>
<ul>
<li><strong><?php echo (int) $counts['tools']; ?> tools and calculators</strong>, from What to Plant Today to the Greenhouse Planner, Fish Pond Calculator, Gift Finder and Bundle Tracker. Each one opens with a short answer and a table for the default settings, then lets you enter your own farm.</li>
<li><strong><?php echo (int) $counts['guides']; ?> guides</strong> that answer one question each, such as whether pigs or casks are worth it, with every number worked out by the same engine as the tools.</li>
<li><strong>Reference pages</strong> for <?php echo (int) $counts['crops']; ?> crops, <?php echo (int) $counts['animals']; ?> farm animals, the Keg and Preserves Jar, <?php echo (int) $counts['villagers']; ?> villagers and the Community Center rooms, plus free <a href="<?php echo esc_url( $home_url . 'data/' ); ?>">CSV downloads</a>.</li>
</ul>

<h2>What makes it different</h2>
<ul>
<li><strong>Decisions, not just numbers.</strong> Each tool tells you which option is better for your situation and why.</li>
<li><strong>Assumptions you can see.</strong> Professions, fertilizer, crop quality and days left in the season are shown next to every result, so you know exactly what a number means.</li>
<li><strong>Checked data.</strong> Game values are read from the Stardew Valley Wiki and kept only when two of its pages agree, and the engine is tested against the wiki's own worked examples. Every page says which game version it was checked for. See our <a href="<?php echo esc_url( $home_url . 'methodology/' ); ?>">methodology</a>.</li>
<li><strong>Free, with no account.</strong> Your saved plans stay in your own browser.</li>
</ul>

<h2>About the creator</h2>
<p>Hi, I'm <?php echo esc_html( $author ); ?>, the creator of <?php echo esc_html( $brand ); ?>. I've been playing Stardew Valley for about two years across PlayStation, mobile and Xbox, exploring the farming systems, resource management and everyday decisions that make each farm unique.</p>
<p>I created <?php echo esc_html( $brand ); ?> to help players make more informed decisions without spending hours comparing numbers or searching through multiple guides. From choosing profitable crops and comparing Kegs versus Preserves Jars to planning a greenhouse or tracking Community Center bundles, the goal is to turn complicated in-game choices into clear, practical answers.</p>
<p><?php echo esc_html( $brand ); ?> combines structured game data, transparent calculations and practical planning tools to help players understand their options and choose what works best for their farm. Whether you're starting your first season or optimizing an established farm, I want it to be a useful companion throughout your Stardew Valley journey.</p>
<p>I decide what the site covers, which questions each page must answer and what goes live. You can find me on <a href="<?php echo esc_url( $linkedin ); ?>" rel="me noopener">LinkedIn</a>. <?php echo esc_html( $brand ); ?> is an independent project with no connection to the game's developer or publisher.</p>
<p>The game data is taken from the Stardew Valley Wiki, and every calculation uses one shared, tested engine. The <a href="<?php echo esc_url( $home_url . 'methodology/' ); ?>">methodology</a> page explains how a value gets onto the site, how it is checked and how mistakes are corrected.</p>

<h2>How the site is made</h2>
<p>The site's code and first drafts of its text are written with help from AI tools. The numbers are not: every figure comes from the calculation engine and the checked game data, and the automated tests fail if a page and its calculator disagree. Changes are listed with their date in the <a href="<?php echo esc_url( $home_url . 'changelog/' ); ?>">changelog</a>.</p>

<h2>Get in touch</h2>
<p>Found a wrong number, or want a tool we do not have yet? Email <a href="mailto:<?php echo esc_attr( $email ); ?>"><?php echo esc_html( $email ); ?></a> or see the <a href="<?php echo esc_url( $home_url . 'contact/' ); ?>">contact page</a>.</p>

<p><em><?php echo esc_html( $notice ); ?></em></p>

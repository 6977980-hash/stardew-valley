<?php
/**
 * Not found.
 *
 * @package Stardew_Tools_Theme
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<div class="container content not-found">
	<h1 class="entry-title">This page wandered off</h1>
	<p>We could not find that page. It may have moved, or the tool may not be ready yet.</p>
	<p><button class="btn btn--primary" type="button" data-search-open>Search tools, guides and data</button></p>
	<ul>
		<li><a href="<?php echo esc_url( home_url( '/tools/' ) ); ?>">Browse all tools</a></li>
		<li><a href="<?php echo esc_url( home_url( '/guides/' ) ); ?>">Browse all guides</a></li>
		<li><a href="<?php echo esc_url( home_url( '/' ) ); ?>">Go to the homepage</a></li>
		<li><a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>">Tell us what you were looking for</a></li>
	</ul>
</div>
<?php
get_footer();

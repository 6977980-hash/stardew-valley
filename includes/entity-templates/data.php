<?php
/**
 * Data downloads page.
 *
 * @var array    $all
 * @var callable $tool_url
 * @var callable $guide_url
 * @var callable $link
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

$files = Stardew_Tools\Entities::csv_files();
$rows  = array(
	'stardew-crops.csv'            => count( $all['crops'] ),
	'stardew-farm-animals.csv'     => count( $all['animals'] ),
	'stardew-machine-rankings.csv' => array_sum( array_map( 'count', array_column( $all['machines'], 'crops' ) ) ),
);
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> three plain CSV files you can open in Excel, Google Sheets or any script: <?php echo (int) $rows['stardew-crops.csv']; ?> crops, <?php echo (int) $rows['stardew-farm-animals.csv']; ?> farm animals and <?php echo (int) $rows['stardew-machine-rankings.csv']; ?> machine rankings. They contain the same numbers as the pages on this site, for Stardew Valley <?php echo esc_html( Stardew_Tools\Config::get( 'game_version' ) ); ?>.</p>
</div>

<h2>Downloads</h2>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>CSV files</caption>
	<thead><tr><th scope="col">File</th><th scope="col">Rows</th><th scope="col">What is in it</th><th scope="col">Page</th></tr></thead>
	<tbody>
	<?php foreach ( $files as $file => $f ) : ?>
		<tr>
			<th scope="row"><a href="<?php echo esc_url( Stardew_Tools\Entities::csv_url( $file ) ); ?>" download><?php echo esc_html( $file ); ?></a></th>
			<td><?php echo (int) $rows[ $file ]; ?></td>
			<td><?php echo esc_html( ucfirst( $f[2] ) ); ?>.</td>
			<td><?php echo $link( $f[1], '', $f[0] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?></td>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>

<h2>How the numbers are made</h2>
<p>Prices, growth times and rules are read from the Stardew Valley Wiki and kept only when two separate pages agree. Profit per tile, gold per day and the machine rankings are calculated from them by the same code that powers our calculators, so a number in a CSV matches the number on the page. Profit assumes seeds bought at the shop, no fertilizer and regular-quality mixing at the stated Farming level. Empty cells mean the value does not exist, for example a crop with no regrow time or a seed that no shop sells.</p>
<p>The game facts come from the wiki, whose text is licensed CC BY-NC-SA 3.0, so please credit the <a href="https://stardewvalleywiki.com/" rel="noopener">Stardew Valley Wiki</a> if you republish them. The calculated columns are ours; a link back to this site is appreciated. Read the <a href="<?php echo esc_url( home_url( '/methodology/' ) ); ?>">methodology</a> for the checking rules.</p>

<h2>Related</h2>
<ul class="related-list">
	<li><a href="<?php echo esc_url( $tool_url( 'crop-profit-calculator' ) ); ?>">Crop Profit Calculator</a><span>Change level, fertilizer and professions.</span></li>
	<li><a href="<?php echo esc_url( $tool_url( 'animal-profit-calculator' ) ); ?>">Animal Profit Calculator</a><span>Hearts, mood and professions.</span></li>
</ul>

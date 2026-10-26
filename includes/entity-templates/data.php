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
$ver   = Stardew_Tools\Config::get( 'game_version' );
$pkg   = json_decode( (string) file_get_contents( STARDEW_TOOLS_DIR . 'assets/data/datapackage.json' ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions
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
	<thead><tr><th scope="col">File</th><th scope="col">Rows</th><th scope="col">What is in it</th><th scope="col">Page</th><th scope="col">Copy for <?php echo esc_html( $ver ); ?></th></tr></thead>
	<tbody>
	<?php foreach ( $files as $file => $f ) : ?>
		<tr>
			<th scope="row"><a href="<?php echo esc_url( Stardew_Tools\Entities::csv_url( $file ) ); ?>" download><?php echo esc_html( $file ); ?></a></th>
			<td><?php echo (int) $rows[ $file ]; ?></td>
			<td><?php echo esc_html( ucfirst( $f[2] ) ); ?>.</td>
			<td><?php echo $link( $f[1], '', $f[0] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?></td>
			<?php $versioned = str_replace( '.csv', '-' . $ver . '.csv', $file ); ?>
			<td><a href="<?php echo esc_url( Stardew_Tools\Entities::csv_url( $versioned ) ); ?>" download><?php echo esc_html( $versioned ); ?></a></td>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>

<p>The file names without a version always hold the latest data. The copies named with the game version (for example <code><?php echo esc_html( 'stardew-crops-' . $ver . '.csv' ); ?></code>) never change once that version is published, so link to those when you cite a number. <a href="<?php echo esc_url( Stardew_Tools\Entities::csv_url( 'datapackage.json' ) ); ?>">datapackage.json</a> describes all three files in the <a href="https://datapackage.org/" rel="noopener">Data Package</a> format: source, licence, version and every column.</p>

<?php if ( $pkg ) : ?>
<h2>What each column means</h2>
	<?php foreach ( $pkg['resources'] as $res ) : ?>
<h3><?php echo esc_html( $res['title'] ); ?> (<?php echo esc_html( $res['name'] ); ?>.csv)</h3>
<div class="table-wrap" tabindex="0" role="region" aria-label="<?php echo esc_attr( Stardew_Tools\Entities::TABLE_LABEL ); ?>">
<table class="results-table">
	<caption>Columns of <?php echo esc_html( $res['name'] ); ?>.csv</caption>
	<thead><tr><th scope="col">Column</th><th scope="col">Type</th><th scope="col">Meaning</th></tr></thead>
	<tbody>
		<?php foreach ( $res['schema']['fields'] as $field ) : ?>
		<tr><th scope="row"><code><?php echo esc_html( $field['name'] ); ?></code></th><td><?php echo esc_html( $field['type'] ); ?></td><td><?php echo esc_html( $field['description'] ); ?></td></tr>
		<?php endforeach; ?>
	</tbody>
</table>
</div>
	<?php endforeach; ?>
<?php endif; ?>

<h2>How the numbers are made</h2>
<p>Prices, growth times and rules are read from the Stardew Valley Wiki and kept only when two separate pages agree. Profit per tile, gold per day and the machine rankings are calculated from them by the same code that powers our calculators, so a number in a CSV matches the number on the page. Profit counts seeds at the cheapest place that sells them for gold: a shop where one does, otherwise the one-off seller (Strawberry Seeds at the Egg Festival for 100g, Rare Seeds for Sweet Gem Berry at the Traveling Cart for 1,000g). Ancient Fruit and Coffee Bean have no gold seed price, since you replant your own seeds or beans, so their seed cost is 0. It assumes no fertilizer and the quality mix of the stated Farming level. Artisan figures use the Tiller raw price, since Artisan comes after Tiller. Empty cells mean the value does not exist, for example a crop with no regrow time or a seed that no shop sells.</p>
<p>The game facts come from the wiki, whose text is licensed CC BY-NC-SA 3.0, so please credit the <a href="https://stardewvalleywiki.com/" rel="noopener">Stardew Valley Wiki</a> if you republish them. The calculated columns are ours; a link back to this site is appreciated. A citation that works: <em>Stardew Tools, "<?php echo esc_html( 'stardew-crops-' . $ver . '.csv' ); ?>", stardewtools.net/data/, data from the Stardew Valley Wiki (CC BY-NC-SA 3.0)</em>. Read the <a href="<?php echo esc_url( home_url( '/methodology/' ) ); ?>">methodology</a> for the checking rules.</p>

<h2>Related</h2>
<ul class="related-list">
	<li><a href="<?php echo esc_url( $tool_url( 'crop-profit-calculator' ) ); ?>">Crop Profit Calculator</a><span>Change level, fertilizer and professions.</span></li>
	<li><a href="<?php echo esc_url( $tool_url( 'animal-profit-calculator' ) ); ?>">Animal Profit Calculator</a><span>Hearts, mood and professions.</span></li>
</ul>

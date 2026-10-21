<?php
/**
 * Best crops by season: a ranked, server-rendered table (works without JavaScript and is what
 * search engines read). The form re-ranks it for your farming level, fertilizer and Tiller.
 *
 * @var array $tool
 * @var array $answers
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;
require_once __DIR__ . '/_controls.php';

$season = $tool['season'];
$rows   = isset( $answers['best_crops'][ $season ] ) ? $answers['best_crops'][ $season ] : array();
$label  = 'greenhouse' === $season ? 'greenhouse' : ucfirst( $season );
$g      = function ( $n ) {
	return number_format( (int) round( $n ) ) . 'g';
};
$shops  = array(
	'pierre'   => "Pierre's",
	'jojamart' => 'JojaMart',
	'oasis'    => 'Oasis',
);
$top    = array_slice( $rows, 0, 3 );
?>
<div class="answer">
	<?php
	$gh_best = 'greenhouse' === $season && ! empty( $answers['greenhouse']['raw'][0] ) ? $answers['greenhouse']['raw'][0] : null;
	if ( $gh_best && count( $top ) >= 3 ) :
		$gh_url = Stardew_Tools\Entities::url( 'crops', $gh_best['id'] );
		?>
	<p class="answer__lead"><strong>Short answer:</strong> <?php echo $gh_url ? '<a href="' . esc_url( $gh_url ) . '">' . esc_html( $gh_best['name'] ) . '</a>' : esc_html( $gh_best['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped here. ?> is the best greenhouse crop overall: about <?php echo esc_html( $g( $gh_best['per_tile'] ) ); ?> per tile a year sold raw once the plants are grown, but no shop sells its seeds (you make them in a Seed Maker). Among seeds you can buy every day, the most profitable per tile, planted on day 1 and replanted all year, are <strong><?php echo esc_html( $top[0]['name'] ); ?></strong> (<?php echo esc_html( $g( $top[0]['profit'] ) ); ?>), <?php echo esc_html( $top[1]['name'] ); ?> (<?php echo esc_html( $g( $top[1]['profit'] ) ); ?>) and <?php echo esc_html( $top[2]['name'] ); ?> (<?php echo esc_html( $g( $top[2]['profit'] ) ); ?>), sold raw with no professions or fertilizer.</p>
	<?php elseif ( count( $top ) >= 3 ) : ?>
	<p class="answer__lead"><strong>Short answer:</strong> planted on day 1<?php echo 'greenhouse' === $season ? ' and replanted all year' : ''; ?>, the most profitable <?php echo esc_html( 'greenhouse' === $season ? 'greenhouse' : strtolower( $label ) ); ?> crops per tile are <strong><?php echo esc_html( $top[0]['name'] ); ?></strong> (<?php echo esc_html( $g( $top[0]['profit'] ) ); ?>), <?php echo esc_html( $top[1]['name'] ); ?> (<?php echo esc_html( $g( $top[1]['profit'] ) ); ?>) and <?php echo esc_html( $top[2]['name'] ); ?> (<?php echo esc_html( $g( $top[2]['profit'] ) ); ?>), sold raw with no professions or fertilizer.</p>
	<?php endif; ?>
	<?php
	// Availability: Oasis seeds need the bus repaired, so name the best crop without it.
	if ( $top && 'oasis' === $top[0]['seed_source'] ) {
		$no_bus = null;
		foreach ( $rows as $r ) {
			if ( 'oasis' !== $r['seed_source'] ) {
				$no_bus = $r;
				break;
			}
		}
		if ( $no_bus ) {
			echo '<p><strong>Year 1 note:</strong> ' . esc_html( $top[0]['name'] ) . ' seeds are sold only at the Oasis, which you can reach once the bus is repaired. Without it, the best is ' . esc_html( $no_bus['name'] ) . ' (' . esc_html( $g( $no_bus['profit'] ) ) . ').</p>';
		}
	}
	if ( 'spring' === $season ) {
		$sb     = isset( $answers['best_crops_festival']['strawberry'] ) ? $answers['best_crops_festival']['strawberry'] : null;
		$sb_url = Stardew_Tools\Entities::url( 'crops', 'strawberry' );
		echo '<p>Strawberry is not in this list because its seeds are sold only at the Egg Festival (Spring 13)' . ( $sb ? ': bought there and planted on Spring 13, a tile makes about ' . esc_html( $g( $sb['profit'] ) ) . ' by the end of Spring' : '' ) . '.' . ( $sb_url ? ' See <a href="' . esc_url( $sb_url ) . '">Strawberry</a> for a full-season planting in Year 2.' : '' ) . '</p>';
	}
	?>
	<p>Profit is sale value minus seeds over the <?php echo 'greenhouse' === $season ? 'greenhouse year (112 days)' : 'season'; ?>, with seeds bought on day 1 at the cheapest shop that sells them every day. Change your farming level, fertilizer or Tiller below and the ranking updates.<?php if ( 'greenhouse' !== $season ) : ?> Planting later in the season? Use <a href="<?php echo esc_url( Stardew_Tools\Tools::url( 'what-to-plant' ) ); ?>">What to Plant Today</a>.<?php endif; ?></p>
</div>

<form class="tool-form" id="best-crops-form" data-season="<?php echo esc_attr( $season ); ?>" novalidate>
	<fieldset>
		<legend>Your farm</legend>
		<div class="field-grid">
			<?php
			stardew_tools_select( 'level', 'Farming level', stardew_tools_level_options(), 0 );
			stardew_tools_select( 'fertilizer', 'Fertilizer', stardew_tools_fertilizer_options(), '' );
			?>
		</div>
		<div class="check-row">
			<?php stardew_tools_checkbox( 'tiller', 'Tiller (+10% crop price)' ); ?>
		</div>
	</fieldset>
	<?php stardew_tools_form_actions(); ?>
</form>

<section class="tool-results" aria-labelledby="results-heading">
	<h2 id="results-heading"><?php echo esc_html( 'greenhouse' === $season ? 'Greenhouse crops ranked' : $label . ' crops ranked' ); ?></h2>
	<p class="result-summary" data-summary role="status" aria-live="polite">Ranked for farming level 0, no fertilizer, no professions.</p>
	<div class="table-wrap" data-results>
		<table class="results-table">
			<caption class="visually-hidden">Profit per tile for each crop, best first</caption>
			<thead><tr><th scope="col">#</th><th scope="col">Crop</th><th scope="col" class="num">Profit / tile</th><th scope="col" class="num">Per day</th><th scope="col" class="num col-hide-sm">Harvests</th><th scope="col" class="col-hide-sm">Seeds</th></tr></thead>
			<tbody>
			<?php foreach ( $rows as $i => $r ) : ?>
				<tr<?php echo 0 === $i ? ' class="is-best"' : ''; ?>>
					<td><?php echo (int) $i + 1; ?></td>
					<th scope="row"><?php echo esc_html( $r['name'] ); ?>
						<?php if ( $r['regrows'] ) : ?>
						<span class="tag">regrows</span>
						<?php endif; ?>
						<?php if ( $r['continues'] ) : ?>
						<span class="tag">into <?php echo esc_html( implode( ', ', $r['continues'] ) ); ?></span>
						<?php endif; ?>
					</th>
					<td class="num"><strong><?php echo esc_html( $g( $r['profit'] ) ); ?></strong></td>
					<td class="num"><?php echo esc_html( number_format( $r['per_day'], 1 ) ); ?>g</td>
					<td class="num col-hide-sm"><?php echo (int) $r['harvests']; ?></td>
					<td class="col-hide-sm"><?php echo esc_html( $g( $r['seed_price'] ) . ' (' . ( isset( $shops[ $r['seed_source'] ] ) ? $shops[ $r['seed_source'] ] : $r['seed_source'] ) . ')' ); ?></td>
				</tr>
			<?php endforeach; ?>
			</tbody>
		</table>
	</div>
</section>

<?php stardew_tools_ad( 'below-result' ); ?>

<section class="tool-explain">
	<h2>How this list is made</h2>
	<ul>
		<li>Each crop is planted on day 1 <?php echo 'greenhouse' === $season ? 'in the greenhouse and grown for 112 days' : 'and grown until it dies at the end of its last season'; ?>. Single-harvest crops are replanted the day they are harvested; seeds for every planting are paid.</li>
		<li>Only crops whose seeds are sold every day for gold (Pierre's, JojaMart, the Oasis) are listed. Festival and Traveling Cart seeds are left out<?php echo 'greenhouse' === $season ? '. Ancient Fruit and other crops without a gold seed price are compared on the <a href="' . esc_url( Stardew_Tools\Tools::url( 'ancient-fruit-vs-starfruit' ) ) . '">Ancient Fruit vs Starfruit</a> page' : ''; ?>.</li>
		<li>Crops marked <em>into …</em> also grow in the next season, so their total covers both seasons. Gold per day divides the profit by the days from planting to the last harvest.</li>
		<li>Prices are for selling raw. Kegs and Preserves Jars change the order a lot: see <a href="<?php echo esc_url( Stardew_Tools\Tools::url( 'keg-vs-preserves-jar' ) ); ?>">Keg vs Preserves Jar</a>.</li>
	</ul>
	<?php if ( 'fall' === $season ) : ?>
	<p>Nothing grows outdoors in Winter except Winter Seeds (foraged). For Winter, use the <a href="<?php echo esc_url( Stardew_Tools\Tools::url( 'best-greenhouse-crops' ) ); ?>">greenhouse</a>.</p>
	<?php endif; ?>
</section>

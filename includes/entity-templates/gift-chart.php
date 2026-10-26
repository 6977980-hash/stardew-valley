<?php
/**
 * Gift Chart page: every villager on one printable page (birthday, own loves and hates, a cheap
 * crop for the Year 1 birthday), the Year 1 crops most villagers like each season, and the fish
 * villagers love. Numbers come from data/answers.json "gift_chart" (tools/build/gift-chart.mjs).
 *
 * @var array    $all       The whole entities file.
 * @var callable $tool_url  Tool permalink.
 * @var callable $ent_url   Entity permalink.
 * @var callable $gold      Formats gold.
 * @var callable $link      Link to an entity page.
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

$answers = Stardew_Tools\Data::get( 'answers' );
$chart   = $answers && isset( $answers['gift_chart'] ) ? $answers['gift_chart'] : null;
if ( ! $chart ) {
	return;
}
$rows    = $chart['villagers'];
$total   = count( $rows );
$first   = reset( $all['villagers'] );
$p       = $first['points'];
$shop    = array(
	'pierre'   => "Pierre's",
	'jojamart' => 'JojaMart',
);
$cap     = function ( $s ) {
	return ucfirst( $s );
};
$list    = function ( $names ) {
	if ( count( $names ) < 2 ) {
		return implode( '', $names );
	}
	$last = array_pop( $names );
	return implode( ', ', $names ) . ' and ' . $last;
};
$taste   = array(
	'love' => 'loved',
	'like' => 'liked',
);
$spring  = $chart['seasons']['spring'];
$top     = $spring ? $spring[0] : null;
// The first vegetable in the spring list: vegetables and flowers are skipped by different villagers.
$veg     = null;
foreach ( $spring as $c ) {
	if ( $top && $c['avoid'] !== $top['avoid'] ) {
		$veg = $c;
		break;
	}
}
$none    = array_values(
	array_filter(
		$rows,
		function ( $v ) {
			return ! $v['birthday_crop'];
		}
	)
);
$loved_b = count(
	array_filter(
		$rows,
		function ( $v ) {
			return $v['birthday_crop'] && 'love' === $v['birthday_crop']['taste'];
		}
	)
);
$finder  = $tool_url( 'gift-finder' );
$fishf   = $tool_url( 'fish-finder' );
$index   = $ent_url( 'villagers', '' );
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> this chart puts all <?php echo (int) $total; ?> villagers on one page in birthday order, with the gifts each one loves, the gifts to never give, and a cheap crop you can grow in Year 1 for every birthday.<?php if ( $top ) : ?> The cheapest gift that pleases almost everyone is a flower such as the <?php echo esc_html( $top['name'] ); ?> (<?php echo esc_html( $gold( $top['seed_price'] ) ); ?> seed, liked or loved by <?php echo (int) $top['pleased']; ?> of <?php echo (int) $total; ?>; skip <?php echo esc_html( $list( $top['avoid'] ) ); ?>)<?php echo $veg ? ', or a vegetable such as the ' . esc_html( $veg['name'] ) . ' (' . (int) $veg['pleased'] . ' of ' . (int) $total . '; skip ' . esc_html( $list( $veg['avoid'] ) ) . ')' : ''; ?>.<?php endif; ?> A loved gift is +<?php echo (int) $p['love']; ?> friendship and a liked one +<?php echo (int) $p['like']; ?>, both × <?php echo (int) $p['birthday']; ?> on a birthday.</p>
</div>
<p class="no-print"><button type="button" class="btn" onclick="window.print()">Print this chart</button> It prints on a few pages without the site menu, so you can keep it next to the game.</p>

<h2 id="chart">The gift chart: every villager in birthday order</h2>
<div class="table-wrap gift-chart" tabindex="0" role="region" aria-label="<?php echo esc_attr( Stardew_Tools\Entities::TABLE_LABEL ); ?>">
<table class="results-table">
	<caption>All <?php echo (int) $total; ?> villagers: birthday, own loved gifts, a Year 1 birthday crop and what they hate</caption>
	<thead><tr><th scope="col">Villager</th><th scope="col">Birthday</th><th scope="col">Loves (own list)</th><th scope="col">Year 1 birthday crop</th><th scope="col">Hates (own list)</th></tr></thead>
	<tbody>
	<?php foreach ( $rows as $v ) : ?>
		<?php $b = $v['birthday_crop']; ?>
		<tr>
			<th scope="row"><?php echo $link( 'villagers', $v['id'], $v['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?><?php echo $v['marriage_candidate'] ? '<span class="cell-sub">Marriage candidate</span>' : ''; ?></th>
			<td><?php echo esc_html( $cap( $v['birthday']['season'] ) . ' ' . (int) $v['birthday']['day'] ); ?></td>
			<td><?php echo esc_html( $v['loves'] ? implode( ', ', $v['loves'] ) : 'Universal loves only' ); ?></td>
			<td>
			<?php if ( $b ) : ?>
				<?php echo $link( 'crops', $b['id'], $b['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?> (<?php echo esc_html( $taste[ $b['taste'] ] ); ?>)
				<span class="cell-sub"><?php echo null !== $b['plant_by'] ? esc_html( 'Plant by ' . $cap( $b['grown_in'] ) . ' ' . (int) $b['plant_by'] ) : esc_html( 'Grow in ' . $cap( $b['grown_in'] ) . ', keep in a chest' ); ?>; seed <?php echo esc_html( $gold( $b['seed_price'] ) . ' at ' . $shop[ $b['shop'] ] ); ?></span>
			<?php else : ?>
				No crop is ready in time in Year 1
				<span class="cell-sub">Give a universal love or a liked item from the villager's page</span>
			<?php endif; ?>
			</td>
			<td><?php echo esc_html( $v['hates'] ? implode( ', ', $v['hates'] ) : 'Universal hates only' ); ?></td>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p class="table-note">"Own list" is what the villager's own wiki entry names; the universal loves (<?php echo esc_html( implode( ', ', $chart['universal_love'] ) ); ?>) apply to almost everyone on top of it. The birthday crop is the cheapest loved crop, or liked when no loved crop is ready, from seeds Pierre's or JojaMart sell in Year 1, planted at normal speed.</p>

<h2 id="birthday-crops">How the Year 1 birthday crop is picked</h2>
<p>A birthday gift is worth eight times a normal one, so a liked crop on the day (<?php echo (int) ( $p['like'] * $p['birthday'] ); ?> points) beats a loved gift on any other day (<?php echo (int) $p['love']; ?> points). The chart looks for the cheapest crop the villager loves, then the cheapest they like, that a first-year farm can actually have on the day: either one that grows in the birthday season and is ready by the date if you plant it by the day shown, or one from an earlier season this year that you harvest and keep in a chest. Crops do not spoil, so a Fall crop kept until a Winter birthday is as good as fresh.</p>
<p><?php echo (int) $loved_b; ?> of the <?php echo (int) $total; ?> villagers get a loved crop this way. For the rest it is a liked one, usually a cheap vegetable or flower, because their loved items are cooked dishes, gems or things from later in the game.<?php if ( $none ) : ?> <?php echo esc_html( $list( array_column( $none, 'name' ) ) ); ?> <?php echo count( $none ) > 1 ? 'have birthdays' : 'has a birthday'; ?> too early in Spring for any crop to be ready, so bring a foraged or mined gift from the villager's page instead.<?php endif; ?> Seed prices are the cheapest of Pierre's and JojaMart; Pierre's Year 2 seeds and the Oasis (which needs the bus repaired) are left out because most first-year farms cannot buy them.</p>
<p>Each villager page has the longer birthday plan, with the other crops that are ready in time and what each costs you in lost sales.</p>

<h2 id="by-season">Year 1 crops that please almost everyone, by season</h2>
<p>Every villager likes vegetables, flowers, fruit tree fruit, gems, artisan goods and cooked dishes unless their own list says otherwise, so a stack of one cheap crop covers most of your weekly gifts. These are the crops a Year 1 farm can buy seeds for that please the most villagers, with the people who dislike or hate them. Give those few something else.</p>
<?php foreach ( array( 'spring', 'summer', 'fall' ) as $s ) : ?>
	<?php if ( empty( $chart['seasons'][ $s ] ) ) { continue; } ?>
<h3><?php echo esc_html( $cap( $s ) ); ?></h3>
<div class="table-wrap" tabindex="0" role="region" aria-label="<?php echo esc_attr( Stardew_Tools\Entities::TABLE_LABEL ); ?>">
<table class="results-table">
	<caption><?php echo esc_html( $cap( $s ) ); ?> Year 1 crops by how many villagers love or like them</caption>
	<thead><tr><th scope="col">Crop</th><th scope="col" class="num">Seed</th><th scope="col" class="num">Days</th><th scope="col" class="num">Love or like it</th><th scope="col">Loved by</th><th scope="col">Don't give to</th></tr></thead>
	<tbody>
	<?php foreach ( $chart['seasons'][ $s ] as $c ) : ?>
		<tr>
			<th scope="row"><?php echo $link( 'crops', $c['id'], $c['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?></th>
			<td class="num"><?php echo esc_html( $gold( $c['seed_price'] ) ); ?></td>
			<td class="num"><?php echo (int) $c['growth_days']; ?></td>
			<td class="num"><?php echo (int) $c['pleased']; ?> of <?php echo (int) $total; ?></td>
			<td><?php echo esc_html( $c['love'] ? implode( ', ', $c['love'] ) : '—' ); ?></td>
			<td><?php echo esc_html( $c['avoid'] ? implode( ', ', $c['avoid'] ) : '—' ); ?></td>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<?php endforeach; ?>
<p>Nothing grows outside from shop seeds in Winter, so keep a chest of Fall crops for Winter gifts and birthdays. Flowers and vegetables are skipped by different people: a few villagers dislike flowers and a few others dislike vegetables, so carrying one of each covers everyone in the tables. Quality raises a liked or loved gift: a gold-star crop is worth × <?php echo esc_html( $p['quality']['gold'] ); ?> and an iridium one × <?php echo esc_html( $p['quality']['iridium'] ); ?>.</p>

<?php if ( $chart['fish'] ) : ?>
<h2 id="fish">Fish villagers love or like</h2>
<p>Most villagers do not care for fish, and some hate all of it, but a few love a particular catch. Fish not listed here are best sold or kept for bundles.<?php echo $fishf ? ' The <a href="' . esc_url( $fishf ) . '">Fish Finder</a> shows when each one bites.' : ''; ?></p>
<div class="table-wrap" tabindex="0" role="region" aria-label="<?php echo esc_attr( Stardew_Tools\Entities::TABLE_LABEL ); ?>">
<table class="results-table">
	<caption>Fish that a villager loves or likes, and where to catch them</caption>
	<thead><tr><th scope="col">Fish</th><th scope="col">Loved by</th><th scope="col">Liked by</th><th scope="col">Where</th><th scope="col">Season</th></tr></thead>
	<tbody>
	<?php foreach ( $chart['fish'] as $f ) : ?>
		<tr>
			<th scope="row"><?php echo esc_html( $f['name'] ); ?></th>
			<td><?php echo esc_html( $f['love'] ? implode( ', ', $f['love'] ) : '—' ); ?></td>
			<td><?php echo esc_html( $f['like'] ? implode( ', ', $f['like'] ) : '—' ); ?></td>
			<td><?php echo esc_html( $f['where'] ); ?></td>
			<td><?php echo esc_html( $f['season'] ); ?></td>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<?php endif; ?>

<h2 id="how-to-use">How to use the chart</h2>
<ul>
	<li><strong>Two gifts a week</strong> per villager, plus one on the birthday.</li>
	<li><strong>Check the season's birthdays</strong> on day 1 and plant the birthday crops then: the "plant by" day is the last day that still works.</li>
	<li><strong>Loved beats liked</strong> (+<?php echo (int) $p['love']; ?> against +<?php echo (int) $p['like']; ?>), but a liked crop you have beats a loved dish you cannot make yet. Ten hearts is <?php echo (int) $p['loves_for_10_hearts']; ?> loved gifts on normal days.</li>
	<li><strong>Hated gifts cost <?php echo (int) abs( $p['hate'] ); ?> points.</strong> The last column lists each villager's own hates; everyone also hates the universal hates such as trash and bait.</li>
	<li><strong>Not sure about one item?</strong><?php echo $finder ? ' Type it into the <a href="' . esc_url( $finder ) . '">Gift Finder</a> to see how every villager feels about it.' : ' Check the villager pages.'; ?><?php echo $index ? ' The rules every villager shares are on <a href="' . esc_url( $index . '#universal-gifts' ) . '">All Villagers</a>.' : ''; ?></li>
</ul>

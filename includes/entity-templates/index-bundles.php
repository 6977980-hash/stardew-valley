<?php
/**
 * Community Center index: every room, its bundles and what finishing it unlocks.
 *
 * @var array    $all
 * @var callable $tool_url
 * @var callable $gold
 * @var callable $link
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

$rooms   = $all['bundles'];
$total   = 0;
$tracker = $tool_url( 'bundle-tracker' );
foreach ( $rooms as $r ) {
	$total += count( $r['bundles'] );
}
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> the standard Community Center has <?php echo (int) $total; ?> bundles in <?php echo (int) count( $rooms ); ?> rooms. Each room you finish repairs something in the valley, and finishing them all restores the Community Center. The Pantry is the one most farms rush, because it unlocks the Greenhouse.</p>
</div>

<h2>Rooms and rewards</h2>
<div class="table-wrap" tabindex="0" role="region" aria-label="<?php echo esc_attr( Stardew_Tools\Entities::TABLE_LABEL ); ?>">
<table class="results-table">
	<caption>Community Center rooms, their bundles and what each room unlocks</caption>
	<thead><tr><th scope="col">Room</th><th scope="col">Bundles</th><th scope="col">Unlocks</th></tr></thead>
	<tbody>
	<?php foreach ( $rooms as $id => $r ) : ?>
		<tr>
			<th scope="row"><?php echo $link( 'bundles', $id, $r['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?></th>
			<td><?php echo esc_html( implode( ', ', array_column( $r['bundles'], 'name' ) ) ); ?></td>
			<td><?php echo esc_html( $r['reward'] ); ?></td>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>

<?php foreach ( $rooms as $id => $r ) : ?>
	<?php
	if ( ! empty( $r['page'] ) ) {
		continue;
	}
	?>
<h2><?php echo esc_html( $r['name'] ); ?></h2>
<p><?php echo esc_html( $r['unlock'] ); ?> Finishing it gives you: <?php echo esc_html( $r['reward'] ); ?>.</p>
<ul>
	<?php foreach ( $r['bundles'] as $b ) : ?>
	<li><strong><?php echo esc_html( $b['name'] ); ?>:</strong> <?php echo $b['gold'] ? 'pay ' . esc_html( $gold( $b['gold'] ) ) : esc_html( implode( ', ', array_map( function ( $i ) { return ( $i['qty'] > 1 ? $i['qty'] . ' ' : '' ) . $i['name'] . ( 'normal' !== $i['quality'] ? ' (' . $i['quality'] . ')' : '' ); }, $b['items'] ) ) ); ?>. Reward: <?php echo esc_html( ( $b['reward'] && $b['reward']['qty'] > 1 ? $b['reward']['qty'] . ' ' : '' ) . ( $b['reward'] ? $b['reward']['name'] : '' ) ); ?>.</li>
	<?php endforeach; ?>
</ul>
<?php endforeach; ?>

<h2>Where to start</h2>
<p>Most bundles fill themselves over the first year if you keep one of everything you find. The ones that need planning are seasonal: crops and fish that only appear in one season, and quality items. Each room page lists every item with its season and where to get it, and a short list of the items you can only get in one season, so you can plan them before the season ends.</p>
<p>A simple order that works on most farms:</p>
<ol>
	<li><strong>Crafts Room first.</strong> It is open from the start and the foraging bundles fill as you walk around.</li>
	<li><strong>Pantry in Spring and Summer of Year 1.</strong> Keep one of each crop and a few gold-quality ones for the Quality Crops Bundle. Finishing it gives you the Greenhouse.</li>
	<li><strong>Fish Tank and Boiler Room alongside.</strong> Fish come from the right place and season; minerals and Boiler Room items come from the Mines.</li>
	<li><strong>Bulletin Board</strong> needs cooked dishes, dyes and animal products. It rewards friendship with the whole town.</li>
	<li><strong>Vault last.</strong> The four gold bundles are easy once your farm earns well.</li>
</ol>
<?php if ( $tracker ) : ?>
<p>The <a href="<?php echo esc_url( $tracker ); ?>">Bundle Tracker</a> keeps your ticks in your browser and shows what is still missing by season. It also covers Remixed bundles.</p>
<?php endif; ?>

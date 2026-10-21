<?php
/**
 * Community Center room page: each standard bundle with where to find every item, and the
 * Remixed bundles that can replace them. From data/bundles.json via data/entities.json.
 *
 * @var array    $e        Room record from data/entities.json.
 * @var array    $all      The whole entities file.
 * @var callable $tool_url Tool permalink.
 * @var callable $ent_url  Entity permalink.
 * @var callable $gold     Formats gold.
 * @var callable $link     Link to an entity page.
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

$tracker = $tool_url( 'bundle-tracker' );
$item_n  = 0;
$gold_n  = 0;
$crop_n  = array();
$seasons = array();
foreach ( $e['bundles'] as $b ) {
	$item_n += $b['slots'] ? $b['slots'] : count( $b['items'] );
	$gold_n += $b['gold'];
	foreach ( $b['items'] as $i ) {
		if ( ! empty( $i['crop'] ) ) {
			$crop_n[ $i['id'] ] = $i['name'];
		}
		if ( 1 === count( $i['seasons'] ) ) {
			$seasons[ $i['seasons'][0] ][] = $i['name'];
		}
	}
}
$qual   = array(
	'normal'  => '',
	'silver'  => 'silver or better',
	'gold'    => 'gold or better',
	'iridium' => 'iridium',
);
$reward = function ( $r ) {
	return $r ? ( $r['qty'] > 1 ? $r['qty'] . ' ' : '' ) . $r['name'] : '';
};
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> the <?php echo esc_html( $e['name'] ); ?> has <?php echo (int) count( $e['bundles'] ); ?> standard bundles<?php echo $gold_n ? ' that cost ' . esc_html( $gold( $gold_n ) ) . ' in total' : ', which need ' . (int) $item_n . ' items in total'; ?>. Finishing all of them gives you: <strong><?php echo esc_html( $e['reward'] ); ?></strong>. <?php echo esc_html( $e['unlock'] ); ?><?php echo $e['remixed'] ? ' With Remixed Bundles turned on, some bundles below can be swapped for one of ' . (int) count( $e['remixed'] ) . ' other bundles.' : ''; ?></p>
</div>

<?php if ( $e['effect'] ) : ?>
<p><?php echo esc_html( $e['effect'] ); ?></p>
<?php endif; ?>

<?php foreach ( $e['bundles'] as $b ) : ?>
<h2 id="<?php echo esc_attr( $b['id'] ); ?>"><?php echo esc_html( $b['name'] ); ?></h2>
	<?php if ( $b['gold'] ) : ?>
<p>Pay <?php echo esc_html( $gold( $b['gold'] ) ); ?> into the bundle. Reward: <?php echo esc_html( $reward( $b['reward'] ) ); ?>.</p>
	<?php else : ?>
<p><?php echo $b['slots'] && $b['slots'] < count( $b['items'] ) ? 'Bring any ' . (int) $b['slots'] . ' of these ' . (int) count( $b['items'] ) . ' items.' : 'Bring all ' . (int) count( $b['items'] ) . ' items.'; ?> Reward: <?php echo esc_html( $reward( $b['reward'] ) ); ?>.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="<?php echo esc_attr( Stardew_Tools\Entities::TABLE_LABEL ); ?>">
<table class="results-table">
	<caption><?php echo esc_html( $b['name'] ); ?>: items and where to find them</caption>
	<thead><tr><th scope="col">Item</th><th scope="col">Needed</th><th scope="col">Season</th><th scope="col">Where to get it</th></tr></thead>
	<tbody>
		<?php foreach ( $b['items'] as $i ) : ?>
		<tr>
			<th scope="row"><?php echo ! empty( $i['crop'] ) ? $link( 'crops', $i['id'], $i['name'] ) : esc_html( $i['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?></th>
			<td><?php echo (int) $i['qty'] . ( $qual[ $i['quality'] ] ? ', ' . esc_html( $qual[ $i['quality'] ] ) : '' ); ?></td>
			<td><?php echo esc_html( count( $i['seasons'] ) >= 4 ? 'Any' : ( $i['seasons'] ? implode( ', ', $i['seasons'] ) : '—' ) ); ?></td>
			<td><?php echo esc_html( $i['obtain'] ? $i['obtain'] : '—' ); ?></td>
		</tr>
		<?php endforeach; ?>
	</tbody>
</table>
</div>
	<?php endif; ?>
<?php endforeach; ?>

<?php if ( $seasons ) : ?>
<h2>Items you can only get in one season</h2>
<p>Miss these and the bundle waits a whole year. Plan them first:</p>
<ul>
	<?php foreach ( array( 'Spring', 'Summer', 'Fall', 'Winter' ) as $s ) : ?>
		<?php if ( ! empty( $seasons[ $s ] ) ) : ?>
	<li><strong><?php echo esc_html( $s ); ?>:</strong> <?php echo esc_html( implode( ', ', array_unique( $seasons[ $s ] ) ) ); ?>.</li>
		<?php endif; ?>
	<?php endforeach; ?>
</ul>
<?php endif; ?>

<?php if ( $crop_n ) : ?>
<p>Crops in this room: <?php echo implode( ', ', array_map( function ( $id ) use ( $link, $crop_n ) { return $link( 'crops', $id, $crop_n[ $id ] ); }, array_keys( $crop_n ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $link. ?>. Each crop page shows when to plant it and what else it is good for. Keep one of each harvest in a chest until the bundle is done; quality bundles need gold-star crops, which fertilizer and a higher Farming level make more likely.</p>
<?php endif; ?>

<?php if ( $e['remixed'] ) : ?>
<h2>Remixed bundles in this room</h2>
<p>If you chose Remixed Bundles when you started the farm, the game can use these instead of some of the bundles above. Which ones you get is random per save, so check the room in your game.</p>
<ul>
	<?php foreach ( $e['remixed'] as $b ) : ?>
	<li><strong><?php echo esc_html( $b['name'] ); ?>:</strong> <?php echo $b['gold'] ? esc_html( $gold( $b['gold'] ) ) : esc_html( implode( ', ', array_map( function ( $i ) { return ( $i['qty'] > 1 ? $i['qty'] . ' ' : '' ) . $i['name']; }, $b['items'] ) ) ) . ( $b['slots'] && $b['slots'] < count( $b['items'] ) ? ' (any ' . (int) $b['slots'] . ')' : '' ); ?>. Reward: <?php echo esc_html( $reward( $b['reward'] ) ); ?>.</li>
	<?php endforeach; ?>
</ul>
<?php endif; ?>

<h2>Related</h2>
<ul class="related-list">
	<?php if ( $tracker ) : ?>
	<li><a href="<?php echo esc_url( $tracker ); ?>">Bundle Tracker</a><span>Tick off what you have and see what is left, saved in your browser.</span></li>
	<?php endif; ?>
	<?php if ( $ent_url( 'bundles', '' ) ) : ?>
	<li><a href="<?php echo esc_url( $ent_url( 'bundles', '' ) ); ?>">All Community Center rooms</a><span>Every bundle and reward on one page.</span></li>
	<?php endif; ?>
	<?php if ( $tool_url( 'what-to-plant' ) ) : ?>
	<li><a href="<?php echo esc_url( $tool_url( 'what-to-plant' ) ); ?>">What to Plant Today</a><span>Fit the bundle crops into a profitable season.</span></li>
	<?php endif; ?>
</ul>

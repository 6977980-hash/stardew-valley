<?php
/**
 * Guide (news): the Stardew Valley 1.7 update, what is confirmed, what is only hinted, and the
 * 1.6.16 patch. Statements about the update come from the sources listed in the guide definition;
 * Clint's and Sandy's gifts and birthdays come from data/gifts.json.
 *
 * @var callable $tool_url Tool permalink.
 * @package Stardew_Tools
 */

defined( 'ABSPATH' ) || exit;

use Stardew_Tools\Data;
use Stardew_Tools\Entities;

$gifts = Data::get( 'gifts' );
$names = array();
foreach ( $gifts ? $gifts['items'] : array() as $it ) {
	$names[ $it['id'] ] = $it['name'];
}
$people = array();
foreach ( $gifts ? $gifts['villagers'] : array() as $v ) {
	if ( in_array( $v['id'], array( 'clint', 'sandy' ), true ) ) {
		$people[ $v['id'] ] = $v;
	}
}
$item_list = function ( $ids ) use ( $names ) {
	return implode( ', ', array_map( function ( $id ) use ( $names ) { return isset( $names[ $id ] ) ? $names[ $id ] : ucwords( str_replace( '-', ' ', $id ) ); }, $ids ) );
};
$universal_loves = $gifts ? $item_list( $gifts['universal']['love']['items'] ) : '';
$villager_link   = function ( $id, $name ) {
	$url = Entities::url( 'villagers', $id );
	return $url ? '<a href="' . esc_url( $url ) . '">' . esc_html( $name ) . '</a>' : esc_html( $name );
};
$gift_url  = $tool_url( 'gift-finder' );
$chart_url = Entities::chart_url();
?>
<div class="answer">
	<p class="answer__lead"><strong>Short answer:</strong> Stardew Valley 1.7 is real and in development, but it has <strong>no release date and no estimate</strong> as of November 2026. ConcernedApe has confirmed two new marriage candidates, <strong>Clint and Sandy</strong>, and a <strong>new farm type</strong>. He has also said he is trying to make children more interesting, and that a farm map editor is an idea he may or may not add. The newest version you can play is still <strong>1.6.15</strong> (20 December 2024). A small bug-fix patch, 1.6.16, is planned but also has no date.</p>
	<p>Below: every confirmed fact with its date and source, what is only a hint or a rumour, how to get Clint and Sandy's friendship started now, and what will change on this site when 1.7 arrives.</p>
</div>

<h2>Where 1.7 stands: the timeline so far</h2>
<p>ConcernedApe (Eric Barone, who makes the game) shares news about 1.7 a little at a time, on X, on his Discord, in interviews and in a few videos. That makes it easy to mix up what he said with what fans guessed. This table lists only the things he said or showed himself, with the date and where it was reported.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Stardew Valley 1.7 news, oldest first</caption>
	<thead><tr><th scope="col">When</th><th scope="col">What happened</th><th scope="col">Where</th></tr></thead>
	<tbody>
		<tr><th scope="row">30 August 2025</th><td>1.7 announced: "There will be a Stardew Valley 1.7 update. No release date, no estimate. But it's happening."</td><td>Post on X after a Symphony of Seasons concert</td></tr>
		<tr><th scope="row">September 2025</th><td>More news will come, but "it will be a while before the update is ready". He also said he did not want too much hype yet.</td><td>Posts on X</td></tr>
		<tr><th scope="row">Late 2025</th><td>First hints: "new character/social stuff" and a new farm type.</td><td>Posts on X</td></tr>
		<tr><th scope="row">3 February 2026</th><td>Two more marriage candidates are coming, names kept secret until the 10th anniversary. He is "trying to make the children a little more interesting". A farm map editor is something he has thought about, but "I don't know if this will happen or not". He has expanded his team to help with Stardew updates.</td><td>IGN interview</td></tr>
		<tr><th scope="row">26 February 2026</th><td>The two new marriage candidates are revealed at the end of the 10th anniversary video: Clint the blacksmith and Sandy from the Oasis.</td><td>Official anniversary video</td></tr>
		<tr><th scope="row">12 May 2026</th><td>He works on Stardew Valley two days a week and Haunted Chocolatier five. He would like to revisit festivals, is interested in the Quest Board and Special Orders, and wants more interaction between married characters.</td><td>Game Informer interview</td></tr>
		<tr><th scope="row">Early October 2026</th><td>A riddle: "two paths will be extended, three will become four, the mermaid's fruit will go free." He has not explained it.</td><td>Official Stardew Valley Discord</td></tr>
	</tbody>
</table>
</div>
<p class="table-note">Dates are the day of the post or interview where known, otherwise the month it was reported. Links to the reports are under Sources at the end of this page.</p>
<p>Fourteen months after the announcement, there is still no date, no trailer and no patch notes. That is normal for this game. ConcernedApe has always said a version is done when it is done, and he is building 1.7 alongside a whole new game.</p>

<h2>Confirmed, hinted or rumour?</h2>
<p>Most "1.7 features" you see in videos and on social media are guesses. Here is the honest status of each one that comes up often.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>What 1.7 will and might include</caption>
	<thead><tr><th scope="col">Feature</th><th scope="col">Status</th><th scope="col">What we actually know</th></tr></thead>
	<tbody>
		<tr class="is-best"><th scope="row">Clint as a marriage candidate</th><td>Confirmed</td><td>Shown in the 10th anniversary video. No details on his events, dialogue or where you would live.</td></tr>
		<tr class="is-best"><th scope="row">Sandy as a marriage candidate</th><td>Confirmed</td><td>Shown in the same video. That brings the marriage candidates from 12 to 14.</td></tr>
		<tr class="is-best"><th scope="row">A new farm type</th><td>Confirmed</td><td>Stated by ConcernedApe. No name, layout or bonus has been shown.</td></tr>
		<tr><th scope="row">More interesting children</th><td>Being worked on</td><td>He said he is "trying to make the children a little more interesting". No details.</td></tr>
		<tr><th scope="row">"Character/social stuff"</th><td>Confirmed, vague</td><td>His own words from late 2025. The new marriage candidates are part of it; the rest is unknown.</td></tr>
		<tr><th scope="row">Farm map editor</th><td>Maybe</td><td>An idea he has considered, possibly with a way to share maps. He said he doesn't know if it will happen.</td></tr>
		<tr><th scope="row">Festival changes, Quest Board, Special Orders</th><td>Ideas only</td><td>Things he said he is interested in revisiting, not promised features.</td></tr>
		<tr><th scope="row">Marrying already-married villagers</th><td>No</td><td>He has said he won't make married characters such as Robin or Caroline available.</td></tr>
		<tr><th scope="row">Release date</th><td>None</td><td>No date, window or estimate.</td></tr>
	</tbody>
</table>
</div>
<p class="table-note">"Confirmed" means ConcernedApe said or showed it himself. Anything else is labelled for what it is.</p>

<h2>Clint and Sandy: get their friendship started now</h2>
<p>Right now, in 1.6.15, neither Clint nor Sandy can be dated, but both can be befriended up to 10 hearts like any other villager. Nobody outside the studio knows yet how 1.7 will handle the friendship you already have with them, or what heart level dating will start at. Still, friendship is stored for every villager in your save, and updates so far have not reset it. Getting to know them now costs you little and can only help.</p>
<?php if ( $people ) : ?>
<div class="table-wrap" tabindex="0" role="region" aria-label="Table: scrolls sideways on small screens">
<table class="results-table">
	<caption>Clint and Sandy in Stardew Valley 1.6.15</caption>
	<thead><tr><th scope="col">Villager</th><th scope="col">Birthday</th><th scope="col">Loved gifts</th><th scope="col">Hated gifts</th></tr></thead>
	<tbody>
	<?php foreach ( array( 'clint', 'sandy' ) as $vid ) : ?>
		<?php
		if ( empty( $people[ $vid ] ) ) {
			continue;
		}
		$v = $people[ $vid ];
		?>
		<tr><th scope="row"><?php echo $villager_link( $vid, $v['name'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in the closure. ?></th><td><?php echo esc_html( ucfirst( $v['birthday']['season'] ) . ' ' . (int) $v['birthday']['day'] ); ?></td><td><?php echo esc_html( $item_list( $v['tastes']['love']['items'] ) ); ?></td><td><?php echo esc_html( $item_list( $v['tastes']['hate']['items'] ) ); ?></td></tr>
	<?php endforeach; ?>
	</tbody>
</table>
</div>
<p class="table-note">Plus the universal loves that every villager loves: <?php echo esc_html( $universal_loves ); ?>. A loved gift on a villager's birthday counts eight times.</p>
<?php endif; ?>
<p><strong>Clint</strong> is the easy one to start with. He runs the Blacksmith in Pelican Town and loves most gems and the better metal bars, which you collect anyway in the Mines. A Gold Bar or an Amethyst twice a week moves him along fast, and his shop is on the way to the Mines. Hold back one gem for his birthday in late winter.</p>
<p><strong>Sandy</strong> takes more planning, because she lives at the Oasis in the Calico Desert and you can only get there once the bus is fixed. That needs the Vault bundles at the Community Center (42,500g in total) or the 40,000g Bus Repair from the Joja route. Her loved gifts are easy to gather once you know the season: Daffodil is a spring forage item, Sweet Pea grows wild in summer and Crocus turns up in winter. Keep a few in a chest so you have one ready on your desert days, and plan a trip for her birthday in mid fall.</p>
<p>The <a href="<?php echo esc_url( $gift_url ); ?>">Gift Finder</a> lists every gift each villager loves and likes and what you can give them today, and the <?php echo $chart_url ? '<a href="' . esc_url( $chart_url ) . '">printable Gift Chart</a>' : 'Gift Chart'; // phpcs:ignore WordPress.Security.EscapeOutput -- built from escaped parts. ?> puts every villager on one page. When 1.7 adds new gift preferences or heart events for Clint and Sandy, both will be updated.</p>

<h2>The new farm type and the map editor</h2>
<p>1.6 added the Meadowlands Farm, so 1.7's new farm will be the ninth layout if nothing else changes. ConcernedApe has confirmed it is coming but has not shown it, named it or said what it is built around. Every "leaked" layout you may have seen so far is fan-made.</p>
<p>The farm map editor is a different idea. In his February 2026 interview he described letting players build their own farm map instead of choosing a preset, and possibly sharing their designs with each other, as a way to make the game more replayable without using AI. He was clear that he had not decided whether it will make it into the update. Treat it as a possibility, not a feature.</p>
<p>For planning tools like ours, a new farm type matters less than it sounds. Crops, machines, animals and fish behave the same on every farm. What changes is space, soil and forage, so a new layout mostly changes how many tiles you can plant, not what each tile earns.</p>

<h2>Children, festivals and the riddle</h2>
<p>Children are the most requested change in the community. In 1.6.15 a child grows into a toddler and then stops: they follow you around the house and little else. ConcernedApe has said he is trying to do something with that. He has given no details, so any list of "child features" is a guess.</p>
<p>In May 2026 he also talked about revisiting the festivals, so they stay fun for players who have seen each one many times, and about the Quest Board and the Special Orders board. He said he would like married characters to have more interactions too. These are directions he is interested in, not promises.</p>
<p>Then there is the riddle he posted on the official Discord in early October 2026: <em>"two paths will be extended, three will become four, the mermaid's fruit will go free."</em> Fans have guessed at the Community Center and Joja routes getting longer, a fourth child or a fourth of something else, and a fruit linked to the mermaid. None of these guesses has been confirmed, and he has not explained the riddle.</p>

<h2>What is 1.6.16?</h2>
<p>1.6.16 is a smaller patch planned before 1.7, mainly to fix bugs. The Stardew Valley Wiki's page for mod authors describes it as a potential patch with no planned release date, so it isn't out yet either. Most of what that page lists is under the hood: data fields for modders, sprite options and fixes to a few stats. It does not list any change to crop, fish, animal or machine prices, so none of the numbers on this site are affected by it.</p>
<p>Two notes in it are worth knowing. The hard cap of 10 on a fish pond's maximum population is lifted in the game's code, so mods can allow bigger ponds; a normal pond in the base game still holds 10 fish. And gold coin stacks are no longer capped at 999. If either one changes something you can see in an unmodded game when 1.6.16 ships, our <a href="<?php echo esc_url( $tool_url( 'fish-pond-calculator' ) ); ?>">Fish Pond Calculator</a> and the data behind it will be updated.</p>

<h2>When will 1.7 come out?</h2>
<p>Nobody knows, and ConcernedApe has said so himself: "no release date, no estimate". Three things suggest it is not close:</p>
<ul>
	<li><strong>His time is split.</strong> In May 2026 he said he spends two days a week on Stardew Valley and five on Haunted Chocolatier. He has a bigger team helping with Stardew updates now, but the work still moves at his pace.</li>
	<li><strong>No patch notes or trailer yet.</strong> Before 1.6 came out he showed more and more of it in the last months. Nothing like that has started for 1.7.</li>
	<li><strong>The 1.6.16 patch comes first.</strong> The wiki asks mod authors to update for 1.6.16 before thinking about 1.7, and 1.6.16 isn't out yet.</li>
</ul>
<p>When it does arrive, expect PC first. 1.6 came out on PC on 19 March 2024 and took about eight more months to reach consoles and phones. ConcernedApe has said he wants that gap to be shorter this time, but he has not promised a shared launch day.</p>

<h2>Will 1.7 be free, and will my save work?</h2>
<ul>
	<li><strong>Price:</strong> every Stardew Valley update so far has been free, and ConcernedApe has said he doesn't plan to charge for them. 1.7 is expected to be free too, though the price has not been formally announced.</li>
	<li><strong>Saves:</strong> 1.6 loaded saves from older versions and converted them, and patches through 1.6.15 kept fixing old-save edge cases. Nothing has been said about 1.7 yet. If your farm matters to you, back up your save folder the day 1.7 lands, before you load it.</li>
	<li><strong>Mods:</strong> big updates break mods. SMAPI and popular mods usually need updates in the days after a release, and the wiki already has a migration page for mod authors. If you play with mods, wait for SMAPI to update before loading a modded save.</li>
	<li><strong>Multiplayer:</strong> everyone on a shared farm needs the same version, so wait until every player has updated before you host.</li>
</ul>

<h2>Haunted Chocolatier is a separate game</h2>
<p>Haunted Chocolatier is ConcernedApe's next game, announced in 2021, with no release date. It has a similar pixel-art look, but it is a different game written from scratch on a different engine, not a part of 1.7 and not coming into Stardew Valley. In May 2026 he said it is much bigger than Stardew Valley in maps, monsters and item depth. In October 2026 he described it as a "town game". Follow his blog for its news; this site only covers Stardew Valley.</p>
<p>One more piece of side news: official Stardew Valley arcade cabinets with a two-player "Junimo Kart Race" mode were shown at the Symphony of Seasons concert at Red Rocks on 25 October 2026. They are physical machines for concerts, not part of the game update.</p>

<h2>What changes on Stardew Tools when 1.7 lands</h2>
<p>Every calculator and guide here is built from verified game data, and each page says which version it was checked against. Right now that is <?php echo esc_html( $gifts ? $gifts['game_version'] : '1.6.15' ); ?>. A script checks the wiki's version history against our data, so we know the day a new version appears. When 1.7 (or 1.6.16) is released we will:</p>
<ol>
	<li>Re-import crops, fish, animals, machines, gifts and bundles from the wiki and compare every price and growth time with the current data.</li>
	<li>Update the <a href="<?php echo esc_url( $gift_url ); ?>">Gift Finder</a>, the Gift Chart and the villager pages first, since 1.7 is mostly about villagers.</li>
	<li>Add the new farm type to anything that depends on the farm, and re-run every guide's numbers.</li>
	<li>Change the "Verified for" label only once each page has been checked, and note every change on the Changelog page.</li>
</ol>
<p>Until then, everything on the site matches the game you can actually play today, 1.6.15.</p>

<?php
\Stardew_Tools\Guides::quick_questions(
	array(
		'Is Stardew Valley 1.7 out?'                 => 'No. As of November 2026 the newest version is 1.6.15, released on 20 December 2024. 1.7 has been announced but has no release date.',
		'What is the 1.7 release date?'              => 'There isn\'t one. ConcernedApe announced 1.7 in August 2025 with "no release date, no estimate", and he hasn\'t given one since.',
		'Who are the new marriage candidates in 1.7?' => 'Clint, the blacksmith, and Sandy, who runs the Oasis in the Calico Desert. They were revealed in the 10th anniversary video on 26 February 2026.',
		'Is there a new farm in 1.7?'                => 'Yes, ConcernedApe has confirmed a new farm type, but it has not been shown or named yet.',
		'Is 1.6.16 out?'                             => 'No. It is a planned bug-fix patch before 1.7 with no release date. It doesn\'t change any prices.',
		'Will 1.7 be free?'                          => 'Every Stardew Valley update so far has been free, and 1.7 is expected to be free as well.',
	)
);

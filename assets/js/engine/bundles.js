// Community Center bundles: which are done, what is left. State is plain data so a page can keep it
// in the browser: { ticked: { bundleId: [itemKey] }, mine: [bundleId] }.

/** Stable key for each item slot of a bundle (the same item can appear twice, e.g. Wood). */
export function itemKeys(bundle) {
  const seen = new Map();
  return (bundle.items || []).map((it) => {
    const n = (seen.get(it.id) || 0) + 1;
    seen.set(it.id, n);
    return n === 1 ? it.id : `${it.id}#${n}`;
  });
}

/** Remixed bundles that share a group are alternatives: the save holds only `pick` of the `of`. */
export const isChoice = (bundle) => !!(bundle.remix && bundle.remix.pick < bundle.remix.of);

/** Slots filled so far. Items sharing a group number are alternatives and fill one slot between them. */
export function filled(bundle, ticked = []) {
  if (!bundle.items) return ticked.length ? 1 : 0; // gold bundle
  const keys = itemKeys(bundle);
  const groups = new Set();
  let n = 0;
  bundle.items.forEach((it, i) => {
    if (!ticked.includes(keys[i])) return;
    if (it.group != null) {
      if (groups.has(it.group)) return;
      groups.add(it.group);
    }
    n += 1;
  });
  return n;
}

export const slotsOf = (bundle) => (bundle.items ? bundle.slots : 1);
export const isDone = (bundle, ticked) => filled(bundle, ticked) >= slotsOf(bundle);

/** Bundles in play for one set: standard ones, or the remixed ones the player says are in their save. */
export function activeBundles(data, set, mine = []) {
  return data.bundles.filter((b) => b.set === set && (set === 'standard' || !isChoice(b) || mine.includes(b.id)));
}

/** Progress per room: bundles done of bundles in play, plus whether the room is finished. */
export function roomProgress(data, set, state) {
  const active = activeBundles(data, set, state.mine);
  return data.rooms
    .map((room) => {
      const bundles = active.filter((b) => b.room === room.id);
      const all = data.bundles.filter((b) => b.set === set && b.room === room.id);
      const done = bundles.filter((b) => isDone(b, state.ticked[b.id] || [])).length;
      const undecided = all.some((b) => isChoice(b)) && !all.filter(isChoice).some((b) => bundles.includes(b));
      return { room, total: bundles.length, done, complete: bundles.length > 0 && done === bundles.length && !undecided, undecided, any: all.length > 0 };
    })
    .filter((r) => r.any);
}

/** Slots a bundle offers: items, with alternatives sharing a group number counted once. */
const optionsOf = (bundle) => new Set((bundle.items || []).map((it, i) => (it.group != null ? `g${it.group}` : `i${i}`))).size;

/**
 * Items still to find, merged across unfinished bundles and grouped by item. In a "pick N of M"
 * bundle (fewer slots than items, such as the Artisan Bundle's 6 of 12) no single item is
 * required, so its amounts go to `optional` instead of `qty` and the bundle is named
 * "Artisan Bundle (any 4 of 10)" with the slots still open.
 */
export function stillNeeded(data, set, state) {
  const byId = new Map();
  const info = new Map(data.items.map((i) => [i.id, i]));
  for (const b of activeBundles(data, set, state.mine)) {
    const ticked = state.ticked[b.id] || [];
    if (isDone(b, ticked) || !b.items) continue;
    const keys = itemKeys(b);
    const choose = slotsOf(b) < optionsOf(b);
    const label = choose ? `${b.name} (any ${slotsOf(b) - filled(b, ticked)} of ${optionsOf(b) - filled(b, ticked)})` : b.name;
    // Donated items are used up, so amounts add up across slots and bundles (Parsnip: 1 for Spring
    // Crops + 5 gold for Quality Crops = 6). Quality is kept per part: "5 gold + 1 any".
    b.items.forEach((it, i) => {
      if (ticked.includes(keys[i])) return;
      const row = byId.get(it.id) || { id: it.id, name: it.name, seasons: (info.get(it.id) || {}).seasons || null, obtain: (info.get(it.id) || {}).obtain || '', bundles: [], qty: 0, optional: 0, parts: {} };
      if (!row.bundles.includes(label)) row.bundles.push(label);
      const q = it.quality && it.quality !== 'normal' ? it.quality : 'any';
      if (choose) {
        row.optional += it.qty || 1;
        (row.optionalParts ||= {})[q] = (row.optionalParts[q] || 0) + (it.qty || 1);
      } else {
        row.qty += it.qty || 1;
        row.parts[q] = (row.parts[q] || 0) + (it.qty || 1);
      }
      byId.set(it.id, row);
    });
  }
  for (const row of byId.values()) {
    const parts = Object.entries(row.parts);
    const notes = [];
    if (parts.length > 1 || (parts[0] && parts[0][0] !== 'any')) notes.push(parts.map(([q, n]) => `${n} ${q}`).join(' + '));
    if (row.optional) notes.push(`${Object.entries(row.optionalParts).map(([q, n]) => (q === 'any' ? `${n}` : `${n} ${q}`)).join(' + ')} more if you pick it`);
    row.qtyNote = notes.join('; ');
  }
  return [...byId.values()].sort((a, b) => b.bundles.length - a.bundles.length || a.name.localeCompare(b.name));
}

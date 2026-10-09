// Greenhouse soil grid and sprinkler coverage. Coordinates: x 0..width-1, y 0..height-1 is
// soil; one step outside is the wooden border, where sprinklers may also stand.

export function sprinklerCoverage(layout, { width, height }) {
  const key = (x, y) => `${x},${y}`;
  const onSoil = (x, y) => x >= 0 && x < width && y >= 0 && y < height;
  const sprinklers = new Set(layout.positions.map(([x, y]) => key(x, y)));
  const watered = new Set();
  for (const [sx, sy] of layout.positions) {
    for (let dx = -layout.radius; dx <= layout.radius; dx++) {
      for (let dy = -layout.radius; dy <= layout.radius; dy++) {
        if (onSoil(sx + dx, sy + dy)) watered.add(key(sx + dx, sy + dy));
      }
    }
  }
  const tiles = [];
  let soilUsed = 0;
  let unwatered = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const k = key(x, y);
      const kind = sprinklers.has(k) ? 'sprinkler' : 'soil';
      if (kind === 'sprinkler') soilUsed++;
      else if (layout.radius > 0 && !watered.has(k)) unwatered++;
      tiles.push({ x, y, kind });
    }
  }
  return { tiles, soilUsed, plantable: width * height - soilUsed, unwatered, border: layout.positions.filter(([x, y]) => !onSoil(x, y)).length };
}

/**
 * Fill plantable tiles with crops in order, row by row: [{ id, tiles }] -> tile list with
 * each soil tile tagged with a crop id (or null when left empty).
 */
export function paintGrid(coverage, plan) {
  const queue = [];
  for (const p of plan) for (let i = 0; i < p.tiles; i++) queue.push(p.id);
  let i = 0;
  return coverage.tiles.map((t) => (t.kind === 'soil' ? { ...t, crop: queue[i++] ?? null } : { ...t, crop: null }));
}

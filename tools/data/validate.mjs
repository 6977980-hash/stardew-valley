#!/usr/bin/env node
// Validates data/*.json: required fields, ID uniqueness, number ranges, sources and
// cross-references. Exits non-zero with a list of problems. Run by `npm test`.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const load = (f) => JSON.parse(readFileSync(join(ROOT, 'data', f), 'utf8'));

export function validate({ crops, fertilizers, machines, professions, seasons }) {
  const errors = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);
  const isInt = (n, min = 0) => Number.isInteger(n) && n >= min;
  const seasonNames = new Set(seasons.seasons);

  const checkSources = (where, sources) => {
    if (!Array.isArray(sources) || !sources.length) return err(where, 'no sources');
    for (const s of sources) {
      if (!/^https:\/\/stardewvalleywiki\.com\//.test(s.url || '')) err(where, `source url invalid: ${s.url}`);
      if (!isInt(s.revid, 1)) err(where, `source ${s.title} has no revision id`);
    }
  };

  for (const [file, d] of Object.entries({ crops, fertilizers, machines, professions, seasons })) {
    if (!/^stardew-tools\/\w+@\d+$/.test(d.schema || '')) err(file, 'missing schema tag');
    if (!/^\d+\.\d+(\.\d+)?$/.test(d.game_version || '')) err(file, 'missing game_version');
  }
  if (seasons.days_per_season !== 28 || seasons.seasons.length !== 4) err('seasons', 'expected 4 seasons of 28 days');
  checkSources('seasons', seasons.sources);

  const ids = new Set();
  for (const c of crops.crops) {
    const w = `crop ${c.id || c.name}`;
    if (!/^[a-z0-9-]+$/.test(c.id || '')) err(w, 'invalid id');
    if (ids.has(c.id)) err(w, 'duplicate id');
    ids.add(c.id);
    if (!c.name) err(w, 'missing name');
    if (!['fruit', 'vegetable', 'flower', 'other'].includes(c.category)) err(w, `invalid category ${c.category}`);
    if (!c.seasons.length || c.seasons.some((s) => !seasonNames.has(s.toLowerCase()))) err(w, `invalid seasons ${c.seasons}`);
    if (!c.phase_days.length || c.phase_days.some((d) => !isInt(d, 1))) err(w, 'invalid phase_days');
    if (c.phase_days.reduce((s, d) => s + d, 0) !== c.growth_days) err(w, 'phase_days do not add up to growth_days');
    if (c.regrow_days !== null && !isInt(c.regrow_days, 1)) err(w, 'invalid regrow_days');
    if (!isInt(c.base_price, 1)) err(w, 'invalid base_price');
    const y = c.yield || {};
    if (!isInt(y.min, 1) || !isInt(y.max, y.min) || !(y.extra_chance >= 0 && y.extra_chance < 1) || !(y.max_per_level >= 0)) err(w, 'invalid yield');
    for (const [k, v] of Object.entries(c.seed_prices || {})) if (!isInt(v, 0)) err(w, `invalid seed price ${k}`);
    if (!['cross-checked', 'needs-verification'].includes(c.verification_status)) err(w, 'invalid verification_status');
    if (c.verification_status === 'cross-checked' && c.problems.length) err(w, 'marked cross-checked but has problems');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.last_verified || '')) err(w, 'missing last_verified');
    if (c.game_version !== crops.game_version) err(w, 'game_version differs from file');
    checkSources(w, c.sources);
    if ((c.sources || []).length < 2) err(w, 'needs at least two sources');
  }

  const fertIds = new Set();
  for (const f of fertilizers.fertilizers) {
    const w = `fertilizer ${f.id}`;
    if (fertIds.has(f.id)) err(w, 'duplicate id');
    fertIds.add(f.id);
    if (f.kind === 'quality' && ![1, 2, 3].includes(f.quality_level)) err(w, 'invalid quality_level');
    if (f.kind === 'speed' && !(f.speed > 0 && f.speed < 1)) err(w, 'invalid speed');
    if (!['quality', 'speed'].includes(f.kind)) err(w, 'invalid kind');
    checkSources(w, f.sources);
  }

  const profIds = new Set(professions.professions.map((p) => p.id));
  for (const p of professions.professions) {
    if (p.requires && !profIds.has(p.requires)) err(`profession ${p.id}`, `requires unknown ${p.requires}`);
    checkSources(`profession ${p.id}`, p.sources);
  }

  if (machines.minutes_per_day !== 1600) err('machines', 'minutes_per_day should be 1600');
  const productIds = new Set();
  for (const m of machines.machines) {
    checkSources(`machine ${m.id}`, m.sources);
    for (const p of m.products) {
      const w = `product ${m.id}/${p.id}`;
      if (productIds.has(p.id)) err(w, 'duplicate product id');
      productIds.add(p.id);
      if (p.input.item && !ids.has(p.input.item)) err(w, `input item ${p.input.item} is not a crop`);
      if (p.input.category && !['fruit', 'vegetable'].includes(p.input.category)) err(w, 'invalid input category');
      if (!isInt(p.input.count, 1)) err(w, 'invalid input count');
      if (!isInt(p.minutes, 1)) err(w, 'invalid minutes');
      const pr = p.price;
      if (!(pr.fixed > 0 || (pr.multiplier > 0 && pr.add >= 0))) err(w, 'invalid price rule');
      checkSources(w, p.sources);
    }
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = validate({
    crops: load('crops.json'),
    fertilizers: load('fertilizers.json'),
    machines: load('machines.json'),
    professions: load('professions.json'),
    seasons: load('seasons.json'),
  });
  if (errors.length) {
    console.error(`Data validation failed (${errors.length}):\n  ` + errors.join('\n  '));
    process.exit(1);
  }
  console.log('Data valid: crops, fertilizers, machines, professions, seasons');
}

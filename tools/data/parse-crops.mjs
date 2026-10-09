// Parsers for the wiki "Crops" overview page and individual crop pages.

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];

export const slug = (name) => name.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Split the Crops page into per-crop sections with the season heading they sit under. */
export function splitCropsPage(wikitext) {
  const out = [];
  let group = null;
  let current = null;
  for (const line of wikitext.split('\n')) {
    const g = line.match(/^==([^=].*?)==\s*$/);
    if (g) {
      group = g[1].trim();
      current = null;
      continue;
    }
    const h = line.match(/^===\[\[File:[^\]]+\]\]\s*\[\[([^\]|]+)(?:\|[^\]]*)?\]\]===\s*$/);
    if (h) {
      current = { name: h[1].trim(), group, lines: [] };
      out.push(current);
      continue;
    }
    if (/^===/.test(line)) current = null;
    else if (current) current.lines.push(line);
  }
  return out;
}

/** Extract growth phases, regrowth, seed sources and base price from one Crops-page section. */
export function parseCropSection(section) {
  const text = section.lines.join('\n');
  const desc = (text.match(/<p>([\s\S]*?)<\/p>/) || [])[1] || '';
  const seedMatch = text.match(/\|rowspan="2"\|<br \/>\[\[File:[^\]]+\]\]\[\[([^\]|]+)/);
  const sources = {};
  const div = (text.match(/<div class="no-wrap"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '';
  for (const m of div.matchAll(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]:\s*(?:\{\{Price\|([\d,]+)\}\}|Free)/g)) {
    sources[m[1].trim()] = m[2] ? Number(m[2].replace(/,/g, '')) : 0;
  }
  const basePrice = Number((text.match(/\{\{Qualityprice\|[^|]+\|(\d+)/) || [])[1]);
  const phases = [];
  let total = null;
  let regrow = null;
  for (const raw of section.lines) {
    // Variant cells look like: |class="no-wrap"|1 day <sup>1</sup><br /> 1 day <sup>2</sup>
    // The first variant is the default (e.g. unirrigated / not next to water).
    const line = raw.replace(/^\|\s*class="no-wrap"\s*\|/, '|').replace(/\s*<sup>.*$/i, '');
    const t = line.match(/^\|\s*Total:\s*(\d+)\s*days?/i);
    if (t) {
      total = Number(t[1]);
      continue;
    }
    const r = line.match(/^\|\s*Regrowth:(?:<br \/>)?\s*(\d+)\s*days?/i);
    if (r) {
      regrow = Number(r[1]);
      continue;
    }
    const p = line.match(/^\|\s*(\d+)\s*days?\b/i);
    if (p && total === null) phases.push(Number(p[1]));
  }
  return {
    name: section.name,
    group: section.group,
    description: desc.replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1').replace(/<[^>]+>/g, '').trim(),
    seed: seedMatch ? seedMatch[1].trim() : null,
    sources,
    basePrice,
    phases,
    total,
    regrow,
  };
}

/** Stage lengths from the first table under ==Stages== on a crop page ("|1 Day" … "|Total: 4 Days"). */
export function parsePageStages(wikitext) {
  const at = wikitext.indexOf('==Stages==');
  if (at < 0) return { phases: [], total: null };
  const table = wikitext.slice(at, wikitext.indexOf('|}', at));
  const phases = [];
  let total = null;
  for (const raw of table.split('\n')) {
    const line = raw.replace(/^\|\s*class="no-wrap"\s*\|/, '|').replace(/<sup>.*$/i, '').replace(/<br \/>.*$/i, '');
    const t = line.match(/^\|\s*Total:\s*(\d+)\s*days?/i);
    if (t) {
      total = Number(t[1]);
      break;
    }
    const p = line.match(/^\|\s*(\d+)\s*days?\s*$/i);
    if (p) phases.push(Number(p[1]));
  }
  return { phases, total };
}

/**
 * Read the {{Infobox}} of an individual crop page. Some infoboxes list several sources on
 * separate lines (Grape: "7 days (Summer Seeds)<br />10 days (Grape Starter)"); then the
 * line naming the given seed is used.
 */
export function parseCropPage(wikitext, seed = null) {
  const box = (wikitext.match(/\{\{Infobox([\s\S]*?)\n\}\}/) || [])[1] || '';
  const field = (k) => {
    const raw = ((box.match(new RegExp(`\\|\\s*${k}\\s*=\\s*([^\\n]*)`)) || [])[1] || '').trim();
    const parts = raw.split(/<br\s*\/?>/i);
    if (parts.length > 1 && seed) {
      const hit = parts.find((part) => part.includes(seed));
      if (hit) return hit;
    }
    return raw;
  };
  const seasonsRaw = field('season');
  const seasons = /^\s*All\s*$/i.test(seasonsRaw) ? [...SEASONS] : SEASONS.filter((s) => new RegExp(`\\b${s}\\b`).test(seasonsRaw));
  const intro = introText(wikitext);
  // Category comes from the first sentence only ("The Parsnip is a [[Vegetables|vegetable]] crop").
  const first = intro.split(/\.\s/)[0];
  let category = 'other';
  if (/\[\[Fruits?\|fruits?\]\]|\[\[fruits?\]\]/i.test(first)) category = 'fruit';
  else if (/\[\[Vegetables?\|vegetables?\]\]|\[\[vegetables?\]\]/i.test(first)) category = 'vegetable';
  else if (/\[\[Flowers?\|flowers?\]\]|\[\[flowers?\]\]/i.test(first)) category = 'flower';
  return {
    growth: Number((field('growth').match(/(\d+)/) || [])[1]) || null,
    sellprice: Number((field('sellprice').match(/(\d+)/) || [])[1]) || null,
    seasons,
    seasonsRaw,
    category,
    intro,
  };
}

/** Prose that describes the crop: the lead section plus any text between ==Stages== and its table. */
export function introText(wikitext) {
  const start = wikitext.search(/'''/);
  if (start < 0) return '';
  const lead = wikitext.slice(start, wikitext.indexOf('\n==', start) >>> 0);
  const at = wikitext.indexOf('==Stages==');
  const stages = at >= 0 ? wikitext.slice(at + 10, wikitext.indexOf('{|', at)) : '';
  return `${lead}\n${stages}`.trim();
}

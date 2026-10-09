#!/usr/bin/env node
// Builds tests/fixtures/wiki-prices.json: the sell prices the wiki itself computes (with its
// Module:Calcsellprice) on the Fruits, Vegetables and Flowers pages, for every quality, with
// Tiller, and for Wine/Jelly/Juice/Pickles with and without Artisan. The engine tests compare
// every one of these numbers with our own price functions.
//
//   node tools/data/import-price-oracle.mjs [--cached]
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchPage, fetchRendered, sleep } from './wiki.mjs';
import { slug } from './parse-crops.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = join(ROOT, 'tools', 'data', '.cache');
const useCache = process.argv.includes('--cached');

async function cached(key, fn) {
  const file = join(CACHE, `${key}.json`);
  if (useCache && existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  const v = await fn();
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(file, JSON.stringify(v));
  await sleep(400);
  return v;
}

const PRODUCTS = ['Dried Fruit', 'Pale Ale', 'Green Tea', 'Wine', 'Jelly', 'Juice', 'Pickles', 'Beer', 'Oil', 'Honey'];
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function main() {
  const crops = JSON.parse(readFileSync(join(ROOT, 'data', 'crops.json'), 'utf8')).crops;
  const out = {};
  const sources = [];
  for (const title of ['Fruits', 'Vegetables', 'Flowers']) {
    const src = await cached(slug(title), () => fetchPage(title));
    const html = await cached(`${slug(title)}-html`, () => fetchRendered(title));
    sources.push({ title, url: src.url, revid: src.revid, rendered_revid: html.revid });
    const rows = src.wikitext.split(/\n\|-\n/);
    for (const crop of crops) {
      const row = rows.find((r) => new RegExp(`^\\|\\[\\[${esc(crop.name)}\\]\\]\\s*$`, 'm').test(r));
      if (!row) continue;
      // Templates in row order. Each renders four prices (regular..iridium) unless it is marked
      // quality=0 or is an item without quality (Honey, Oil).
      const templates = [...row.matchAll(/\{\{Qualityprice\|([^|}]+)\|(\d+)([^}]*)\}\}/g)].map((m) => ({
        item: m[1].trim(),
        base: Number(m[2]),
        pm: Number((m[3].match(/pm=([\d.]+)/) || [])[1] || 1),
        count: /quality=0/.test(m[3]) || ['Honey', 'Oil'].includes(m[1].trim()) ? 1 : 4,
      }));
      // Slice the rendered HTML from this crop's name link up to the next row.
      const at = html.html.search(new RegExp(`<td><a href="/${esc(crop.name.replace(/ /g, '_'))}" title="${esc(crop.name)}">`));
      if (at < 0) continue;
      // A row ends where the next row's image cell starts (the last row: where its table ends).
      let end = html.html.indexOf('<td><div class="center"><div class="floatnone">', at);
      if (end < 0) end = html.html.indexOf('</td></tr></tbody></table>', html.html.lastIndexOf('<td>', html.html.indexOf('</td></tr></tbody></table>', at)));
      const numbers = [...html.html.slice(at, end).matchAll(/<td>([\d,]+)g\s*<\/td>/g)].map((m) => Number(m[1].replace(/,/g, '')));
      const need = templates.reduce((s, t) => s + t.count, 0);
      if (numbers.length !== need) {
        console.warn(`${title}/${crop.name}: expected ${need} prices, found ${numbers.length}; skipped`);
        continue;
      }
      const entry = (out[crop.id] ||= { name: crop.name, page: title, base: null, raw: {}, products: {} });
      let i = 0;
      for (const t of templates) {
        const vals = numbers.slice(i, i + t.count);
        i += t.count;
        // Coloured product names ("Yellow Wine") are reduced to the product ("wine").
        const product = t.item === crop.name ? null : slug(PRODUCTS.find((p) => t.item.endsWith(p)) || t.item);
        if (!product) {
          entry.base = t.base;
          entry.raw[t.pm === 1 ? 'none' : 'tiller'] = vals;
        } else {
          (entry.products[product] ||= {})[t.pm === 1 ? 'none' : 'artisan'] = vals[0];
        }
      }
    }
  }
  mkdirSync(join(ROOT, 'tests', 'fixtures'), { recursive: true });
  writeFileSync(join(ROOT, 'tests', 'fixtures', 'wiki-prices.json'), JSON.stringify({ sources, crops: out }, null, 1) + '\n');
  console.log(`${Object.keys(out).length} crops with wiki-computed prices`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

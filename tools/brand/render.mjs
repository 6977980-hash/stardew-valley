// Renders brand PNGs from the SVG/HTML sources with headless Chromium.
// Usage: node tools/brand/render.mjs   (needs the playwright package installed)
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { readFileSync } from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const brand = path.join(root, 'assets/brand');
const browser = await chromium.launch();
const page = await browser.newPage();

async function svgToPng(svg, out, w, h) {
  await page.setViewportSize({ width: w, height: h });
  const markup = readFileSync(path.join(brand, svg), 'utf8').replace('<svg ', `<svg width="${w}" height="${h}" `);
  await page.setContent(`<html><body style="margin:0;background:transparent">${markup}</body></html>`);
  await page.screenshot({ path: path.join(brand, out), omitBackground: true });
}

for (const s of [16, 32, 48, 180, 192, 512]) {
  await svgToPng('icon.svg', s === 180 ? 'apple-touch-icon.png' : `icon-${s}.png`, s, s);
}
await svgToPng('logo.svg', 'logo.png', 600, 128);

await page.setViewportSize({ width: 1200, height: 630 });
await page.goto(pathToFileURL(path.join(root, 'tools/brand/og.html')).href);
await page.waitForLoadState('networkidle');
await page.screenshot({ path: path.join(brand, 'og-default.png') });

await browser.close();

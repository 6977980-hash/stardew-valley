// Audit 2026-10-21, phase 5: layout shift on guides and hubs, landmarks and table names, module loading.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HUBS = ['/crops-and-farming/', '/artisan-goods/', '/animals/', '/fishing/', '/greenhouse/'];
const GUIDES = ['/crops-and-farming/speed-gro-vs-fertilizer/', '/artisan-goods/how-many-kegs-do-i-need/', '/animals/are-pigs-worth-it/', '/fishing/best-fish-for-fish-ponds/', '/greenhouse/best-greenhouse-setup-for-money/', '/artisan-goods/are-casks-worth-it/', '/artisan-goods/dehydrator-vs-keg/', '/animals/coop-or-barn-first/', '/crops-and-farming/best-fruit-trees/', '/crops-and-farming/how-to-make-money-year-1/'];

// Layout shift not caused by input, summed over the load, on a phone with a slowed CPU.
async function cls(page, path) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(path, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  return page.evaluate(() => window.__cls);
}

test.describe('phase 5 speed and accessibility @live', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const path of [...HUBS, ...GUIDES]) {
    test(`no layout shift on a phone: ${path}`, async ({ browser }) => {
      for (let i = 0; i < 3; i++) {
        const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
        const page = await context.newPage();
        expect(await cls(page, path), `${path} load ${i + 1}`).toBeLessThan(0.1);
        await context.close();
      }
    });
  }

  test('short answer comes before "On this page" on a phone; the list opens on a laptop', async ({ page }) => {
    await page.goto('/artisan-goods/how-many-kegs-do-i-need/');
    const answer = await page.locator('.answer').first().boundingBox();
    const toc = await page.locator('.article-toc').boundingBox();
    expect(answer.y).toBeLessThan(toc.y);
    await expect(page.locator('.article-toc details')).not.toHaveAttribute('open', '');
    await page.setViewportSize({ width: 1366, height: 800 });
    await page.goto('/artisan-goods/how-many-kegs-do-i-need/');
    await expect(page.locator('.article-toc details')).toHaveAttribute('open', '');
  });

  for (const path of ['/artisan-goods/how-many-kegs-do-i-need/', '/crops-and-farming/', '/greenhouse/', '/crops/strawberry/', '/crops/', '/animal-prices/']) {
    test(`axe incl. best practices, unique table names: ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'best-practice']).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes[0].html.slice(0, 80)}`)).toEqual([]);
      const names = await page.locator('.table-wrap[role="region"]').evaluateAll((els) =>
        els.map((e) => e.getAttribute('aria-label') || document.getElementById(e.getAttribute('aria-labelledby'))?.textContent.trim()),
      );
      expect(names.length).toBeGreaterThan(0);
      expect(names.every(Boolean)).toBe(true);
      expect(new Set(names).size).toBe(names.length);
    });
  }

  test('a tool page preloads only the modules it uses', async ({ page }) => {
    const js = [];
    page.on('request', (r) => r.url().includes('/assets/js/engine/') && js.push(new URL(r.url()).pathname.split('/').pop()));
    await page.goto('/crop-profit-calculator/');
    await expect(page.locator('[data-results] table')).toBeVisible();
    const preloads = await page.locator('link[rel="modulepreload"]').count();
    expect(preloads).toBeGreaterThan(3);
    expect(js).not.toContain('index.js');
    expect(js).not.toContain('fishpond.js');
    expect(new Set(js).size).toBeLessThanOrEqual(8);
  });

  test('crops table: profit is the second column', async ({ page }) => {
    await page.goto('/crops/');
    await expect(page.locator('.table-wrap--sticky thead th').nth(1)).toHaveText('Best profit per tile');
  });
});

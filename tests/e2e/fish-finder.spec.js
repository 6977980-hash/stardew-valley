// Audit 2026-10-26 suggestion S-4: Fish Finder.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('fish finder @live', () => {
  test('renders cleanly with no axe violations', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    for (const width of [360, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      expect((await page.goto('/fish-finder/')).status()).toBe(200);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await expect(page.locator('.answer__lead')).toContainText('Short answer');
    await expect(page.locator('[data-summary]')).toContainText('66 fish');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes[0].html.slice(0, 80)}`)).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('filters by season, weather and place', async ({ page }) => {
    await page.goto('/fish-finder/?season=spring&weather=rain&area=river&share=1');
    await expect(page.locator('[data-summary]')).toContainText('in Spring on a rainy day');
    const names = await page.locator('[data-results] tbody th').allTextContents();
    expect(names.some((n) => n.startsWith('Catfish'))).toBe(true);
    expect(names.some((n) => n.startsWith('Sunfish'))).toBe(false);
    await page.selectOption('#st-season', 'winter');
    await page.selectOption('#st-weather', 'sun');
    await expect(page.locator('[data-results]')).not.toContainText('Catfish');
  });

  test('reference table lists every fish in the first HTML', async ({ request }) => {
    const html = await (await request.get('/fish-finder/')).text();
    const ref = html.slice(html.search(/id="?ref-fish/));
    expect((ref.match(/<tr/g) || []).length).toBeGreaterThanOrEqual(66);
    expect(ref).toContain('Lava Eel');
  });
});

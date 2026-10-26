// Audit 2026-10-26 suggestion S-3: printable Gift Chart.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('gift chart @live', () => {
  test('renders cleanly with no axe violations', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    for (const width of [360, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      expect((await page.goto('/gift-chart/')).status()).toBe(200);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await expect(page.locator('h1')).toHaveCount(1);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes[0].html.slice(0, 80)}`)).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('every villager with a birthday and a Year 1 crop', async ({ page }) => {
    await page.goto('/gift-chart/');
    const rows = page.locator('#chart ~ .gift-chart tbody tr');
    await expect(rows).toHaveCount(34);
    await expect(rows.filter({ hasText: 'Pam' })).toContainText('Spring 18');
    await expect(rows.filter({ hasText: 'Pam' })).toContainText('Parsnip (loved)');
    await expect(rows.filter({ hasText: 'Krobus' })).toContainText('Grow in Fall, keep in a chest');
  });

  test('print hides the site chrome and shows the full table', async ({ page }) => {
    await page.goto('/gift-chart/');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.site-header')).toBeHidden();
    await expect(page.locator('.no-print')).toBeHidden();
    await expect(page.locator('.gift-chart')).toBeVisible();
  });

  test('linked from All Villagers and the Gift Finder', async ({ request }) => {
    for (const path of ['/villagers/', '/gift-finder/']) {
      expect(await (await request.get(path)).text(), path).toMatch(/href="?[^" >]*\/gift-chart\//);
    }
  });
});

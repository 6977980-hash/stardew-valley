// Phase 7: UX fixes from the review (home page, mobile header, next-step block).
import { test, expect } from '@playwright/test';

test.describe('phase 7 UX @live', () => {
  test('home page lists no unfinished tools', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).not.toContainText('Coming soon');
    await expect(page.locator('body')).not.toContainText('(soon)');
    await expect(page.locator('body')).not.toContainText('Fish Finder');
  });

  test('hero mini planner opens What to Plant with the answer filled in', async ({ page }) => {
    await page.goto('/');
    await page.selectOption('.quick-plan [name=season]', 'summer');
    await page.fill('.quick-plan [name=today]', '15');
    await page.fill('.quick-plan [name=budget]', '2000');
    await Promise.all([page.waitForURL(/what-to-plant/), page.click('.quick-plan button[type=submit]')]);
    await expect(page.locator('[data-summary]')).toContainText('Summer 15');
  });

  test('home page is shorter on phones than before (under 5,800px) with no sideways scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const m = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, ok: document.documentElement.scrollWidth <= window.innerWidth }));
    expect(m.ok).toBe(true);
    expect(m.h).toBeLessThan(5800);
  });

  test('phone header is one row', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/crops/');
    const h = await page.locator('.site-header').evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeLessThan(90);
    await page.click('.nav-toggle');
    await expect(page.locator('#primary-nav')).toBeVisible();
  });

  test('guides end with a next step that points to a tool', async ({ page }) => {
    await page.goto('/animals/coop-or-barn-first/');
    const next = page.locator('.next-step');
    await expect(next).toBeVisible();
    await expect(next.locator('a.btn')).toHaveAttribute('href', /animal-profit-calculator/);
  });

  test('article headings use the plain font, the page title keeps the pixel font', async ({ page }) => {
    await page.goto('/artisan-goods/dehydrator-vs-keg/');
    const h1 = await page.locator('h1').evaluate((e) => getComputedStyle(e).fontFamily);
    const h2 = await page.locator('.entry-content h2').first().evaluate((e) => getComputedStyle(e).fontFamily);
    expect(h1).toContain('Pixelify');
    expect(h2).not.toContain('Pixelify');
  });
  test('planner button stays on screen on a short laptop window', async ({ page }) => {
    await page.setViewportSize({ width: 1351, height: 600 });
    await page.goto('/');
    const box = await page.locator('.quick-plan button[type=submit]').boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(600);
  });
  test('tool pages show when the data was checked at the top', async ({ page }) => {
    await page.goto('/keg-vs-preserves-jar/');
    await expect(page.locator('.tool > .guide-byline').first()).toContainText(/Updated .*2026.*Verified for Stardew Valley/);
  });
  test('level and professions carry over between tools, a shared link does not overwrite them', async ({ page }) => {
    await page.goto('/best-crops-by-season/');
    await page.goto('/crop-profit-calculator/');
    await page.selectOption('#st-level', '7');
    await page.check('input[name=tiller]');
    await page.goto('/keg-vs-preserves-jar/');
    await expect(page.locator('input[name=tiller]')).toBeChecked();
    await expect(page.locator('.farm-note')).toContainText('remembered in this browser');
    // Someone else's link shows their values but keeps my saved farm.
    await page.goto('/crop-profit-calculator/?level=2');
    await expect(page.locator('#st-level')).toHaveValue('2');
    await page.goto('/crop-profit-calculator/');
    await expect(page.locator('#st-level')).toHaveValue('7');
    // Forgetting resets it.
    await page.click('[data-forget-farm]');
    await expect(page.locator('input[name=tiller]')).not.toBeChecked();
  });
});

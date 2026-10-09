// Phase 3: the four tool pages calculate, keep their state in the URL and this browser, fit
// small screens and pass axe in light and dark mode.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TOOLS = ['/crop-profit-calculator/', '/keg-vs-preserves-jar/', '/ancient-fruit-vs-starfruit/', '/greenhouse-planner/'];
const summary = (page) => page.locator('[data-summary]');

test.describe('tool pages @live', () => {
  for (const path of TOOLS) {
    test(`renders with no errors: ${path}`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const res = await page.goto(path);
      expect(res.status()).toBe(200);
      await expect(summary(page)).not.toBeEmpty();
      await expect(page.locator('.answer__lead')).toContainText('Short answer');
      await expect(page.locator('.tool-meta')).toContainText('Verified for Stardew Valley');
      const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(ld.join('')).toContain('"WebApplication"');
      const map = JSON.parse(await page.locator('script[type="importmap"]').textContent());
      expect(Object.values(map.imports).every((u) => u.includes('?ver='))).toBe(true);
      expect(errors).toEqual([]);
    });
  }

  test('homepage links to the live tools', async ({ page }) => {
    await page.goto('/');
    for (const path of TOOLS) await expect(page.locator(`a[href$="${path}"]`).first()).toBeVisible();
  });
});

test.describe('calculations @live', () => {
  test('crop profit: Spring 1 best crop', async ({ page }) => {
    await page.goto('/crop-profit-calculator/?season=spring&today=1&level=0&sell=raw');
    await expect(summary(page)).toContainText('Rhubarb');
    await expect(summary(page)).toContainText('244g');
  });

  test('crop profit: late in the season fewer crops fit', async ({ page }) => {
    await page.goto('/crop-profit-calculator/?season=spring&today=27');
    await expect(summary(page)).toContainText('No crop can be harvested');
  });

  test('crop profit: show math toggles', async ({ page }) => {
    await page.goto('/crop-profit-calculator/');
    const btn = page.locator('[data-results] button[aria-controls]').first();
    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.math-row').first()).toBeVisible();
  });

  test('keg vs jar: best split for 100 Starfruit', async ({ page }) => {
    await page.goto('/keg-vs-preserves-jar/');
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(summary(page)).toContainText('183,000g');
  });

  test('ancient fruit vs starfruit: greenhouse year 1 and year 2', async ({ page }) => {
    await page.goto('/ancient-fruit-vs-starfruit/?where=gh1&sell=wine&artisan=1&level=0');
    await expect(summary(page)).toContainText('27,720g vs 22,000g');
    await page.selectOption('#st-where', 'gh2');
    await expect(summary(page)).toContainText('36,960g vs 22,000g');
  });

  test('greenhouse: full Ancient Fruit, year 2+, raw', async ({ page }) => {
    await page.goto('/greenhouse-planner/?stage=established&level=0&c1=ancient-fruit&n1=116');
    await expect(summary(page)).toContainText('1,030,939g');
    await expect(page.locator('.gh-grid .gh-cell--sprinkler')).toHaveCount(6);
    await expect(page.locator('.gh-grid')).toHaveAttribute('role', 'img');
  });

  test('greenhouse: too many tiles gives a warning', async ({ page }) => {
    await page.goto('/greenhouse-planner/?c1=ancient-fruit&n1=100&c2=starfruit&n2=50&sprinkler=quality');
    await expect(page.locator('[data-warnings]')).toContainText('Only 108 tiles are plantable');
  });
});

test.describe('state', () => {
  test('changes go into the URL and are remembered', async ({ page }) => {
    await page.goto('/crop-profit-calculator/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/crop-profit-calculator/');
    await page.selectOption('#st-season', 'fall');
    await expect(page).toHaveURL(/season=fall/);
    await page.goto('/crop-profit-calculator/');
    await expect(page.locator('#st-season')).toHaveValue('fall');
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.locator('#st-season')).toHaveValue('spring');
  });

  test('a shared link wins over saved settings', async ({ page }) => {
    await page.goto('/keg-vs-preserves-jar/?crop=ancient-fruit&items=10');
    await expect(page.locator('#st-crop')).toHaveValue('ancient-fruit');
    await expect(page.locator('#st-items')).toHaveValue('10');
  });
});

test.describe('responsive and accessible', () => {
  for (const width of [360, 390, 768, 1280]) {
    test(`no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      for (const path of TOOLS) {
        await page.goto(path);
        await expect(summary(page)).not.toBeEmpty();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, path).toBeLessThanOrEqual(0);
      }
    });
  }

  for (const scheme of ['light', 'dark']) {
    test(`axe on tools: no WCAG A/AA violations (${scheme})`, async ({ browser }) => {
      const context = await browser.newContext({ colorScheme: scheme });
      const page = await context.newPage();
      for (const path of TOOLS) {
        await page.goto(path);
        await expect(summary(page)).not.toBeEmpty();
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        expect(results.violations.map((v) => `${path} ${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);
      }
      await context.close();
    });
  }
});

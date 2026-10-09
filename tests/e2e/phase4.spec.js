// Phase 4: decision engine pages. Each page calculates, works on phones and passes axe.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = ['/what-to-plant/', '/best-spring-crops/', '/best-summer-crops/', '/best-fall-crops/', '/best-greenhouse-crops/'];
const summary = (page) => page.locator('[data-summary]');

test.describe('phase 4 pages @live', () => {
  for (const path of PAGES) {
    test(`renders with no errors: ${path}`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      expect((await page.goto(path)).status()).toBe(200);
      await expect(summary(page)).not.toBeEmpty();
      await expect(page.locator('.answer__lead')).toContainText('Short answer');
      expect(errors).toEqual([]);
    });
  }

  test('best crops tables are in the HTML without JavaScript', async ({ request }) => {
    const html = await (await request.get('/best-spring-crops/')).text();
    expect(html).toContain('Rhubarb');
    expect(html).toMatch(/"@type":"Article"/);
  });
});

test.describe('decisions @live', () => {
  test('new farm: Spring 1, 500g, 15 tiles', async ({ page }) => {
    await page.goto('/what-to-plant/?season=spring&today=1&budget=500&tiles=15&level=0');
    await expect(summary(page)).toContainText('Plant Potato on Spring 1');
    await expect(page.locator('.pick')).toContainText('Shopping list');
    await expect(page.locator('.pick')).toContainText('10 Potato Seeds');
  });

  test('too late in the season: says so', async ({ page }) => {
    await page.goto('/what-to-plant/?season=spring&today=28');
    await expect(summary(page)).toContainText('Nothing can be harvested');
  });

  test('kegs change the plan', async ({ page }) => {
    await page.goto('/what-to-plant/?season=summer&today=15&budget=2000&tiles=40&kegs=10&artisan=1&level=4');
    await expect(page.locator('.pick')).toContainText('into Kegs');
  });

  test('best crops re-rank with Tiller', async ({ page }) => {
    await page.goto('/best-summer-crops/');
    await expect(page.locator('[data-results] tbody tr').first()).toContainText('Starfruit');
    await page.getByLabel('Tiller (+10% crop price)').check();
    await expect(summary(page)).toContainText('Tiller');
  });
});

test.describe('phase 4 responsive and accessible', () => {
  for (const width of [360, 390, 1280]) {
    test(`no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      for (const path of PAGES) {
        await page.goto(path);
        await expect(summary(page)).not.toBeEmpty();
        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), path).toBeLessThanOrEqual(0);
      }
    });
  }
  for (const scheme of ['light', 'dark']) {
    test(`axe (${scheme})`, async ({ browser }) => {
      const context = await browser.newContext({ colorScheme: scheme });
      const page = await context.newPage();
      for (const path of PAGES) {
        await page.goto(path);
        await expect(summary(page)).not.toBeEmpty();
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        expect(r.violations.map((v) => `${path} ${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);
      }
      await context.close();
    });
  }
});

// Audit 2026-10-21 phase 6: tables in the first HTML, villager and bundle pages, share images,
// Quick questions, llms.txt and the data package.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TOOLS = ['/crop-profit-calculator/', '/what-to-plant/', '/keg-vs-preserves-jar/', '/ancient-fruit-vs-starfruit/', '/greenhouse-planner/', '/fish-pond-calculator/', '/animal-profit-calculator/', '/xp-calculator/', '/gift-finder/', '/bundle-tracker/', '/crafting-calculator/'];
const NEW_PAGES = ['/villagers/', '/villagers/haley/', '/bundles/', '/bundles/pantry/', '/machines/', '/fishing/'];
const HUBS = ['/crops-and-farming/', '/artisan-goods/', '/animals/', '/fishing/', '/greenhouse/'];

test.describe('content and answers @live', () => {
  test('every tool sends a filled reference table before any script runs', async ({ request }) => {
    for (const path of TOOLS) {
      const html = await (await request.get(path)).text();
      const ref = html.slice(html.search(/class="?tool-reference/));
      expect(html, path).toMatch(/class="?tool-reference/);
      expect((ref.match(/<tr/g) || []).length, path).toBeGreaterThanOrEqual(3);
    }
  });

  for (const path of NEW_PAGES) {
    test(`new page renders cleanly with no axe violations: ${path}`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      for (const width of [360, 1280]) {
        await page.setViewportSize({ width, height: 800 });
        expect((await page.goto(path)).status()).toBe(200);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      }
      await expect(page.locator('h1')).toHaveCount(1);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes[0].html.slice(0, 80)}`)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }

  test('villager page: birthday, loved gifts and its own share image', async ({ page }) => {
    await page.goto('/villagers/haley/');
    await expect(page.locator('.answer__lead')).toContainText('Spring 14');
    await expect(page.locator('.entry-content')).toContainText('Sunflower');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og\/villager-haley\.jpg/);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  });

  test('bundle room page lists items with seasons and the reward', async ({ page }) => {
    await page.goto('/bundles/pantry/');
    await expect(page.locator('.answer__lead')).toContainText('Greenhouse');
    expect(await page.locator('.entry-content table').count()).toBeGreaterThanOrEqual(5);
  });

  test('hubs have visible Quick questions and no FAQPage schema', async ({ page }) => {
    for (const path of HUBS) {
      await page.goto(path);
      expect(await page.locator('.quick-questions h3').count(), path).toBeGreaterThanOrEqual(4);
      const ld = await page.locator('script[type="application/ld+json"]').allInnerTexts();
      expect(ld.join(' ')).not.toContain('FAQPage');
    }
  });

  test('About page has ProfilePage schema and no in-game test claim on Methodology', async ({ page }) => {
    await page.goto('/about/');
    const ld = await page.locator('script[type="application/ld+json"]').allInnerTexts();
    expect(ld.join(' ')).toContain('ProfilePage');
    await page.goto('/methodology/');
    await expect(page.locator('.entry-content')).not.toContainText('In-game checks');
  });

  test('llms.txt lists hubs, data and contact', async ({ request }) => {
    const text = await (await request.get('/llms.txt')).text();
    for (const s of ['/fishing/', '/villagers/', 'datapackage.json', 'Key facts']) expect(text).toContain(s);
  });

  test('data package describes the CSVs', async ({ request }) => {
    const res = await request.get('/wp-content/plugins/stardew-tools/assets/data/datapackage.json');
    expect(res.status()).toBe(200);
    const pkg = await res.json();
    expect(pkg.resources.length).toBeGreaterThanOrEqual(3);
    expect(pkg.licenses[0].name).toContain('CC-BY-NC-SA');
  });
});

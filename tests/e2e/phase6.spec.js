// Phase 6: reference pages (crops, animals, machines), data downloads, new guides, site search, linking.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const INDEXES = ['/crops/', '/farm-animals/', '/machines/', '/data/'];
const ENTITIES = ['/crops/strawberry/', '/crops/starfruit/', '/farm-animals/pig/', '/farm-animals/chicken/', '/machines/keg/', '/machines/preserves-jar/'];
const GUIDES = ['/artisan-goods/are-casks-worth-it/', '/artisan-goods/dehydrator-vs-keg/', '/animals/coop-or-barn-first/', '/crops-and-farming/speed-gro-vs-fertilizer/', '/artisan-goods/how-many-kegs-do-i-need/', '/animals/are-pigs-worth-it/', '/fishing/best-fish-for-fish-ponds/', '/greenhouse/best-greenhouse-setup-for-money/'];
const words = async (page) => (await page.locator('.entry-content').innerText()).split(/\s+/).filter(Boolean).length;

test.describe('phase 6 pages @live', () => {
  for (const path of [...INDEXES, ...ENTITIES, ...GUIDES]) {
    test(`renders cleanly, no sideways scroll, no axe violations: ${path}`, async ({ page }) => {
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

  test('guides all have 1,500+ words', async ({ page }) => {
    for (const path of GUIDES) {
      await page.goto(path);
      expect(await words(page), path).toBeGreaterThanOrEqual(1500);
    }
  });

  test('reference pages are not thin and carry schema and breadcrumbs', async ({ page }) => {
    for (const path of ['/crops/strawberry/', '/farm-animals/pig/', '/machines/keg/']) {
      await page.goto(path);
      expect(await words(page), path).toBeGreaterThanOrEqual(450);
      const ld = await page.locator('script[type="application/ld+json"]').allInnerTexts();
      expect(ld.join(' ')).toContain('BreadcrumbList');
      expect(ld.join(' ')).toContain('"Article"');
      await expect(page.locator('.breadcrumbs')).toBeVisible();
    }
  });

  test('crop page numbers match the data: Strawberry sells for 120g', async ({ page }) => {
    await page.goto('/crops/strawberry/');
    await expect(page.locator('.answer__lead')).toContainText('Short answer');
    await expect(page.locator('.entry-content')).toContainText('120g');
  });

  test('every internal link on the new pages resolves', async ({ page, request }) => {
    const seen = new Set();
    for (const path of [...INDEXES, ...ENTITIES.slice(0, 3), ...GUIDES.slice(0, 3)]) {
      await page.goto(path);
      const hrefs = await page.locator('main a[href]').evaluateAll((as) => as.map((a) => a.href));
      for (const href of hrefs) {
        const u = new URL(href);
        if (u.origin !== new URL(page.url()).origin || seen.has(u.pathname) || /\.(csv|png|svg)$/.test(u.pathname)) continue;
        seen.add(u.pathname);
        expect((await request.get(u.pathname)).status(), `${path} -> ${u.pathname}`).toBe(200);
      }
    }
  });

  test('CSV downloads exist and have the right header', async ({ page, request }) => {
    await page.goto('/data/');
    const links = await page.locator('a[download]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect(links.length).toBe(3);
    for (const href of links) {
      const res = await request.get(href);
      expect(res.status()).toBe(200);
      const text = await res.text();
      expect(text.split('\n')[0]).toContain(',');
      expect(text.split('\n').length).toBeGreaterThan(10);
    }
  });
});

test.describe('site search @live', () => {
  test('Ctrl+K opens, filters, and Enter opens the first result', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+k');
    await expect(page.locator('#site-search')).toBeVisible();
    await expect(page.locator('[data-search-input]')).toBeFocused();
    await page.fill('[data-search-input]', 'pig');
    await expect(page.locator('#site-search-results li').first()).toContainText('Pig');
    await Promise.all([page.waitForURL(/farm-animals\/pig/), page.keyboard.press('Enter')]);
  });

  test('Escape closes it and focus returns to the button', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-search-open]');
    await expect(page.locator('#site-search')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#site-search')).toBeHidden();
    await expect(page.locator('[data-search-open]').first()).toBeFocused();
  });

  test('no match shows a message, and it works at phone width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/');
    await page.click('[data-search-open]');
    await page.fill('[data-search-input]', 'zzzzzz');
    await expect(page.locator('[data-search-status]')).toContainText('No results');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('search dialog has no axe violations when open', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+k');
    await page.fill('[data-search-input]', 'keg');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes[0].html.slice(0, 80)}`)).toEqual([]);
  });
});

test.describe('internal linking @live', () => {
  test('guides link to entity pages, and hubs list reference pages', async ({ page }) => {
    await page.goto('/artisan-goods/how-many-kegs-do-i-need/');
    expect(await page.locator('.entry-content a[href*="/crops/"]').count()).toBeGreaterThan(2);
    await page.goto('/crops-and-farming/');
    await expect(page.locator('#hub-ref')).toBeVisible();
    await page.goto('/');
    await expect(page.locator('#ref-heading')).toBeVisible();
  });
});

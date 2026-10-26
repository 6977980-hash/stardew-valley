// Audit 2026-10-26, phase 2: per-page sitemap lastmod, tool dates, title length, bundle room
// links, schema dates, share images, oEmbed and feed links. Raw-HTML checks allow unquoted
// attributes, because the live site's HTML is minified.
import { test, expect } from '@playwright/test';

test.describe('phase 2 technical SEO @live', () => {
  // Which pages move on a deploy is covered by the integration tests (Release::stamp_pages).
  // WordPress lists the home page (latest-posts front page) without a lastmod.
  test('sitemap has a lastmod for every page', async ({ request }) => {
    const xml = await (await request.get('/wp-sitemap-posts-page-1.xml')).text();
    const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(100);
    const missing = urls.filter((u) => !u.includes('<lastmod>')).map((u) => u.match(/<loc>([^<]+)/)[1]);
    expect(missing.filter((loc) => new URL(loc).pathname !== '/')).toEqual([]);
  });

  for (const path of ['/crops/sweet-gem-berry/', '/bundles/bulletin-board/', '/crops-and-farming/best-fruit-trees/', '/what-to-plant/']) {
    test(`title fits in 60 characters: ${path}`, async ({ page }) => {
      await page.goto(path);
      expect((await page.title()).length).toBeLessThanOrEqual(60);
    });
  }

  test('a short title keeps the brand', async ({ page }) => {
    await page.goto('/about/');
    await expect(page).toHaveTitle(/\| Stardew Tools$/);
  });

  test('Gift Finder shows the gifts data date', async ({ page }) => {
    await page.goto('/gift-finder/');
    await expect(page.locator('.guide-byline time')).toHaveAttribute('datetime', '2026-10-09');
  });

  test('Bundle Tracker links each room page', async ({ page }) => {
    await page.goto('/bundle-tracker/');
    for (const room of ['crafts-room', 'pantry', 'fish-tank', 'boiler-room', 'bulletin-board']) {
      await expect(page.locator(`.answer a[href$="/bundles/${room}/"]`)).toHaveCount(1);
      await expect(page.locator(`details.room .table-note a[href$="/bundles/${room}/"]`)).toHaveCount(1);
    }
  });

  test('crop page links its bundle room', async ({ page }) => {
    await page.goto('/crops/parsnip/');
    await expect(page.locator('a[href$="/bundles/pantry/"]').first()).toBeVisible();
  });

  test('Year 1 guide links the Pantry page', async ({ page }) => {
    await page.goto('/crops-and-farming/how-to-make-money-year-1/');
    await expect(page.locator('main a[href$="/bundles/pantry/"]', { hasText: 'Pantry' }).first()).toBeVisible();
  });

  test('best crops page uses its own share image in og:image and the Article', async ({ page }) => {
    await page.goto('/best-spring-crops/');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /tool-best-spring-crops\.jpg/);
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.join('')).toContain('tool-best-spring-crops.jpg');
  });

  test('entity index has dateModified', async ({ page }) => {
    await page.goto('/crops/');
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.join('')).toMatch(/"CollectionPage"[\s\S]*"dateModified"/);
  });

  test('no feed links on pages', async ({ request }) => {
    const html = await (await request.get('/crops/parsnip/')).text();
    expect(html).not.toMatch(/application\/rss\+xml/);
  });

  test('oEmbed has no author', async ({ request }) => {
    const res = await request.get('/wp-json/oembed/1.0/embed?url=' + encodeURIComponent(new URL('/about/', process.env.BASE_URL || 'http://localhost:8089').href));
    if (res.status() !== 200) return; // oEmbed off is fine too.
    const body = await res.json();
    expect(body.author_name).toBeUndefined();
    expect(body.author_url).toBeUndefined();
  });
});

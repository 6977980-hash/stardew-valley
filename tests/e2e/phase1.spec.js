// Phase 1: foundation, branding, SEO base, accessibility and ad slots (off).
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = ['/', '/about/', '/contact/', '/privacy-policy/', '/terms/', '/disclaimer/', '/methodology/', '/changelog/'];
const WIDTHS = [360, 390, 414, 768, 1280];

test.describe('homepage @live', () => {
  test('title, H1, tagline and meta', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Stardew Valley Tools, Calculators & Planning Hub | Stardew Tools');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Stardew Valley Tools & Planning Hub');
    await expect(page.locator('.hero__tagline')).toHaveText('Calculate. Compare. Decide. Plan.');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Free Stardew Valley calculators/);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og-default\.png$/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  });

  test('JSON-LD is valid and describes the site', async ({ page }) => {
    await page.goto('/');
    const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(raw);
    const types = data['@graph'].map((n) => n['@type']);
    expect(types).toEqual(expect.arrayContaining(['WebSite', 'Organization']));
  });

  test('question-first navigation is present', async ({ page }) => {
    await page.goto('/');
    for (const q of ['What should I plant?', 'Keg or Preserves Jar?', 'Find a fish', 'Find a gift', 'Plan my greenhouse']) {
      await expect(page.getByRole('heading', { name: q })).toBeVisible();
    }
  });

  test('fan disclaimer in footer', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.site-footer__notice')).toContainText('not affiliated with or endorsed by ConcernedApe');
  });
});

test.describe('pages @live', () => {
  for (const path of PAGES) {
    test(`${path} loads with one H1 and a description`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      const desc = await page.locator('meta[name="description"]').getAttribute('content');
      expect(desc.length).toBeGreaterThan(40);
      expect(desc.length).toBeLessThanOrEqual(160);
    });
  }

  test('content pages have breadcrumbs with matching schema', async ({ page }) => {
    await page.goto('/about/');
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Home');
    const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(raw)['@graph'][0]['@type']).toBe('BreadcrumbList');
  });

  test('page titles are unique', async ({ page }) => {
    const titles = new Set();
    for (const path of PAGES) {
      await page.goto(path);
      titles.add(await page.title());
    }
    expect(titles.size).toBe(PAGES.length);
  });

  test('404 returns 404, noindex and helpful links', async ({ page }) => {
    const res = await page.goto('/this-page-does-not-exist/');
    expect(res.status()).toBe(404);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.getByRole('link', { name: 'Go to the homepage' })).toBeVisible();
  });
});

test.describe('assets and crawl files @live', () => {
  test('brand assets load', async ({ request }) => {
    const base = '/wp-content/plugins/stardew-tools/assets/brand/';
    for (const f of ['favicon.ico', 'icon.svg', 'icon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'og-default.png', 'site.webmanifest']) {
      const res = await request.get(base + f);
      expect(res.status(), f).toBe(200);
    }
  });

  test('robots.txt and sitemap', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Sitemap:');
    expect(robots).toContain('Disallow: /?s=');
    const sitemap = await request.get('/wp-sitemap.xml');
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).not.toContain('wp-sitemap-users');
  });

  test('author enumeration redirects home', async ({ request }) => {
    const res = await request.get('/?author=1', { maxRedirects: 0 });
    expect(res.status()).toBe(301);
  });
});

test.describe('ads switched off @live', () => {
  test('no ad markup, script or empty space anywhere', async ({ page, request }) => {
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.locator('.st-ad, ins.adsbygoogle')).toHaveCount(0);
      expect(await page.content()).not.toContain('adsbygoogle.js');
    }
    expect((await request.get('/ads.txt')).status()).toBe(404);
  });
});

test.describe('responsive and accessible', () => {
  for (const width of WIDTHS) {
    test(`no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      for (const path of ['/', '/privacy-policy/']) {
        await page.goto(path);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, path).toBeLessThanOrEqual(0);
      }
    });
  }

  test('mobile menu toggles with aria-expanded and Escape', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/');
    const toggle = page.locator('.nav-toggle');
    const nav = page.locator('#primary-nav');
    await expect(nav).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(nav).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
  });

  test('skip link is the first focusable element', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
  });

  for (const scheme of ['light', 'dark']) {
    test(`axe: no WCAG A/AA violations (${scheme})`, async ({ browser }) => {
      const context = await browser.newContext({ colorScheme: scheme });
      const page = await context.newPage();
      for (const path of ['/', '/about/', '/privacy-policy/', '/this-page-does-not-exist/']) {
        await page.goto(path);
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        expect(results.violations.map((v) => `${path} ${v.id}: ${v.nodes.length}`)).toEqual([]);
      }
      await context.close();
    });
  }
});

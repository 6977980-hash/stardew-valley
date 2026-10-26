// Audit 2026-10-26, phase 5: security headers, /favicon.ico, cache rules for the JS modules.
// Server work per request (file walk, page lookups) is covered by the integration tests.
import { test, expect } from '@playwright/test';

test.describe('phase 5 speed, security and ops @live', () => {
  for (const path of ['/', '/crops/parsnip/', '/what-to-plant/']) {
    test(`security headers: ${path}`, async ({ request, baseURL }) => {
      const h = (await request.get(path)).headers();
      expect(h['x-content-type-options']).toBe('nosniff');
      expect(h['x-frame-options']).toBe('SAMEORIGIN');
      expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(h['permissions-policy']).toContain('camera=()');
      if (baseURL.startsWith('https://')) expect(h['strict-transport-security']).toContain('max-age=31536000');
    });
  }

  test('/favicon.ico is served', async ({ request }) => {
    const res = await request.get('/favicon.ico', { maxRedirects: 2 });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/icon/);
  });

  test('engine and tool modules revalidate instead of immutable', async ({ request }) => {
    for (const file of ['engine/profit.js', 'tools/common.js']) {
      const cc = (await request.get(`/wp-content/plugins/stardew-tools/assets/js/${file}`)).headers()['cache-control'] || '';
      expect(cc).not.toContain('immutable');
      expect(cc).toContain('max-age=86400');
    }
  });

  test('other scripts keep the long cache', async ({ request }) => {
    const cc = (await request.get('/wp-content/plugins/stardew-tools/assets/js/search.js')).headers()['cache-control'] || '';
    expect(cc).toContain('immutable');
  });
});

// Phase 2: the data files and the calculation engine are deployed and work in a real browser.
import { test, expect } from '@playwright/test';

const BASE = '/wp-content/plugins/stardew-tools';

test.describe('game data and engine @live', () => {
  test('data files are served as JSON', async ({ request }) => {
    for (const set of ['crops', 'fertilizers', 'machines', 'professions', 'seasons']) {
      const res = await request.get(`${BASE}/data/${set}.json`);
      expect(res.status(), set).toBe(200);
      const body = await res.json();
      expect(body.game_version).toBe('1.6.15');
    }
  });

  test('engine runs in the browser with the deployed data', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async (base) => {
      const engine = await import(`${base}/assets/js/engine/index.js`);
      const load = (s) => fetch(`${base}/data/${s}.json`).then((r) => r.json());
      const [crops, fertilizers, machines, seasons] = await Promise.all(['crops', 'fertilizers', 'machines', 'seasons'].map(load));
      const starfruit = crops.crops.find((c) => c.id === 'starfruit');
      const r = engine.cropProfit(starfruit, { fertilizers, machines, seasons }, { sellAs: 'wine', artisan: true });
      return { days: r.harvestDays, perHarvest: r.perHarvest, profit: r.profit };
    }, BASE);
    expect(result).toEqual({ days: [14, 27], perHarvest: 3150, profit: 5500 });
  });
});

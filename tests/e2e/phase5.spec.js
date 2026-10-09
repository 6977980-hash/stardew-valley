// Phase 5: XP, crafting, gifts, bundles, plus the hub pages and first guides.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TOOLS = ['/xp-calculator/', '/crafting-calculator/', '/gift-finder/', '/bundle-tracker/'];
const HUBS = ['/crops-and-farming/', '/artisan-goods/', '/animals/', '/fishing/', '/greenhouse/'];
const GUIDES = ['/crops-and-farming/speed-gro-vs-fertilizer/', '/artisan-goods/how-many-kegs-do-i-need/', '/animals/are-pigs-worth-it/', '/fishing/best-fish-for-fish-ponds/', '/greenhouse/best-greenhouse-setup-for-money/'];
const summary = (page) => page.locator('[data-summary]');

test.describe('phase 5 tools @live', () => {
  for (const path of TOOLS) {
    test(`renders with no errors: ${path}`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      expect((await page.goto(path)).status()).toBe(200);
      await expect(summary(page)).not.toBeEmpty();
      await expect(page.locator('.answer__lead')).toContainText('Short answer');
      expect(errors).toEqual([]);
    });
  }

  test('xp: level 0 to 10 needs 15,000 XP, and fishing switches the fields', async ({ page }) => {
    await page.goto('/xp-calculator/?skill=farming&level=0&target=10&crop=parsnip');
    await expect(summary(page)).toContainText('15,000 XP');
    await expect(summary(page)).toContainText('1,875 Parsnip');
    await page.selectOption('#st-skill', 'fishing');
    await expect(page.locator('fieldset[data-skill=fishing]')).toBeVisible();
    await expect(page.locator('fieldset[data-skill=farming]')).toBeHidden();
    await expect(summary(page)).toContainText('XP each');
  });

  test('crafting: a Crab Pot is 15 iron ore, and the list is kept', async ({ page }) => {
    await page.goto('/crafting-calculator/?recipe=crab-pot&qty=1&year2=1');
    await expect(page.locator('[data-results]')).toContainText('Iron Ore');
    await expect(page.locator('[data-results] tr', { hasText: 'Iron Ore' })).toContainText('15');
    await page.click('[data-add]');
    await expect(page.locator('[data-list]')).toContainText('1 × Crab Pot');
    await page.reload();
    await expect(page.locator('[data-list]')).toContainText('1 × Crab Pot');
    await page.click('[data-remove="0"]');
    await expect(page.locator('[data-list]')).toContainText('Nothing on the list yet');
  });

  test('gifts: villager lists and item lookup agree on the Prismatic Shard', async ({ page }) => {
    await page.goto('/gift-finder/?mode=villager&villager=haley');
    await expect(page.locator('[data-results]')).toContainText('Coconut');
    await expect(page.locator('[data-results]')).not.toContainText('Prismatic Shard Loves');
    await page.goto('/gift-finder/?mode=item&item=prismatic-shard');
    await expect(page.locator('[data-results] tr', { hasText: 'Hates' })).toContainText('Haley');
    await page.goto('/gift-finder/?mode=villager&villager=abigail&quality=iridium&event=birthday');
    await expect(page.locator('[data-results] tr', { hasText: 'Loved' })).toContainText('+960');
  });

  test('bundles: ticks are saved and fill a bundle', async ({ page }) => {
    await page.goto('/bundle-tracker/');
    await expect(summary(page)).toContainText('0 of 31');
    await page.locator('details.bundle summary', { hasText: 'Spring Foraging' }).click();
    for (const name of ['Wild Horseradish', 'Daffodil', 'Leek', 'Dandelion']) await page.getByLabel(name, { exact: false }).first().check();
    await expect(summary(page)).toContainText('1 of 31');
    await page.reload();
    await expect(summary(page)).toContainText('1 of 31');
    await page.check('[name=bundle-set][value=remixed]');
    await expect(page.locator('[data-remix-hint]')).toBeVisible();
  });
});

test.describe('phase 5 content @live', () => {
  for (const path of [...HUBS, ...GUIDES]) {
    test(`renders: ${path}`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      const html = await res.text();
      expect(html).toMatch(/"@type":"(Article|CollectionPage)"/);
      expect(html).toContain('BreadcrumbList');
    });
  }

  test('guide numbers come from the calculator data', async ({ request }) => {
    const html = await (await request.get('/artisan-goods/how-many-kegs-do-i-need/')).text();
    expect(html).toMatch(/Ancient Fruit/);
    expect(html).toContain('/keg-vs-preserves-jar/');
  });
});

test.describe('phase 5 on phones', () => {
  for (const width of [360, 390]) {
    for (const path of [...TOOLS, ...HUBS, ...GUIDES]) {
      test(`${path} at ${width}px: no sideways scroll, no axe violations`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(path);
        await page.waitForTimeout(400);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes[0].target}`)).toEqual([]);
      });
    }
  }
});

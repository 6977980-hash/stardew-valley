// Audit 2026-10-26, phase 4: stated assumptions, crafting recipe links, free Parsnip Seeds,
// search matching and ARIA.
import { test, expect } from '@playwright/test';

const ASSUMES = {
  '/greenhouse-planner/': /Assumes: first year from seed, Farming level 10, no fertilizer, Tiller, Artisan, sold raw\./,
  '/ancient-fruit-vs-starfruit/': /Assumes: in the greenhouse, first year, Farming level 10, no fertilizer, Tiller, Artisan\./,
  '/crafting-calculator/': /Assumes: Year 1 shop prices, no professions\./,
  '/what-to-plant/': /Assumes: Year 1, Farming level 0, no fertilizer, no professions, no Kegs or Jars, your 15 free Parsnip Seeds\./,
  '/crop-profit-calculator/': /Assumes: Farming level 0, no fertilizer, no professions\./,
  '/keg-vs-preserves-jar/': /Assumes: normal quality crops, no professions\./,
  '/animal-profit-calculator/': /Assumes: 5 hearts, mood 255 of 255, products sold raw, no professions\./,
  '/fish-pond-calculator/': /Assumes: roe sold as it is, no professions\./,
  '/gift-finder/': /Assumes: Friendship 101 not read\./,
};

test.describe('phase 4 tools UX @live', () => {
  for (const [path, re] of Object.entries(ASSUMES)) {
    test(`assumptions shown above the result: ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('[data-assumes]')).toHaveText(re);
    });
  }

  test('the Assumes line follows the form', async ({ page }) => {
    await page.goto('/greenhouse-planner/');
    await page.locator('[name="tiller"]').uncheck();
    await page.selectOption('[name="level"]', '3');
    await expect(page.locator('[data-assumes]')).toContainText('Farming level 3, no fertilizer, Artisan,');
  });

  test('What to Plant counts the free Parsnip Seeds and explains Potato vs Parsnip', async ({ page }) => {
    await page.goto('/what-to-plant/');
    await expect(page.locator('.answer__lead')).toContainText('takes over from');
    await expect(page.locator('[data-pick]')).toContainText('Plant your 15 free Parsnip Seeds too');
    await page.fill('[name="tiles"]', '40');
    await page.locator('[name="tiles"]').blur();
    await expect(page.locator('[data-summary]')).toContainText('Plant Parsnip');
    await expect(page.locator('[data-pick]')).toContainText('15 of the seeds are your free ones');
    // Not a Year 1 spring: the box is hidden and not counted.
    await page.selectOption('[name="season"]', 'summer');
    await expect(page.locator('[data-free-seeds]')).toBeHidden();
    await expect(page.locator('[data-assumes]')).not.toContainText('free');
  });

  test('a ?recipe= link shows that recipe and keeps the saved list', async ({ page }) => {
    await page.goto('/crafting-calculator/');
    await page.evaluate(() => localStorage.setItem('st:craft-list', JSON.stringify([{ id: 'crab-pot', qty: 5 }])));
    await page.goto('/crafting-calculator/?recipe=keg');
    await expect(page.locator('[name="recipe"]')).toHaveValue('keg');
    await expect(page.locator('[data-list]')).toContainText('Your saved list (1 item) is kept');
    await page.getByRole('button', { name: 'Show my list' }).click();
    await expect(page.locator('[data-list]')).toContainText('5 × Crab Pot');
    expect(await page.evaluate(() => localStorage.getItem('st:craft-list'))).toContain('crab-pot');
  });

  test('search: word starts, typos, synonyms and aria-expanded', async ({ page }) => {
    await page.goto('/');
    const input = page.locator('[data-search-input]');
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await page.locator('[data-search-open]').first().click();
    const first = page.locator('[data-search-results] li').first();
    await input.fill('tea');
    await expect(page.locator('[data-search-results]')).not.toContainText('Bug Steak');
    await input.fill('strawbery');
    await expect(first).toContainText('Strawberry');
    await expect(input).toHaveAttribute('aria-expanded', 'true');
    await input.fill('af');
    await expect(first).toContainText('Ancient Fruit');
    await input.fill('zzzzqqq');
    await expect(page.locator('[data-search-status]')).toContainText('No results');
    await expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  test('greenhouse grid reads as one label', async ({ page }) => {
    await page.goto('/greenhouse-planner/');
    const grid = page.locator('.gh-grid');
    await expect(grid).toHaveAttribute('aria-label', /116 tiles of Ancient Fruit/);
    expect(await grid.locator('.gh-cell:not([aria-hidden="true"])').count()).toBe(0);
  });
});

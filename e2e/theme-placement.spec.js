import { test, expect } from './fixture.js';

for (const width of [1440, 320]) {
  test(`theme is a usable header setting at ${width}px, persists, and preserves playback`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const theme = page.getByRole('combobox', { name: 'Theme' });
    await expect(page.locator('header').getByRole('combobox', { name: 'Theme' })).toBeVisible();
    await expect(page.locator('.controls').getByRole('combobox', { name: 'Theme' })).toHaveCount(0);
    const box = await theme.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await theme.selectOption('salmon');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'salmon');
    await page.reload();
    await expect(theme).toHaveValue('salmon');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'salmon');
    await page.keyboard.down('1');
    await expect(page.locator('.screen strong')).toHaveText('C');
    await page.keyboard.up('1');
    await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
  });
}

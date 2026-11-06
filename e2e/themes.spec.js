import { test, expect } from './fixture.js';

test('defaults to mint and switches distinct palettes while preserving playback', async ({ page }) => {
  await page.goto('/');
  const theme = page.getByLabel('Theme');
  await expect(theme).toHaveValue('mint');
  const colors = new Set();
  for (const value of ['mint', 'salmon', 'orange', 'lavender', 'sky']) {
    await theme.selectOption(value);
    await expect(page.locator('html')).toHaveAttribute('data-theme', value);
    colors.add(await page.locator('.instrument').evaluate(el => getComputedStyle(el).backgroundColor));
  }
  expect(colors.size).toBe(5);
  await page.keyboard.down('1');
  await expect(page.locator('.screen strong')).toHaveText('C');
  await page.keyboard.up('1');
  await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
});

test('persists the selected theme after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Theme').selectOption('salmon');
  expect(await page.evaluate(() => localStorage.getItem('chord-theme'))).toBe('salmon');
  await page.reload();
  await expect(page.getByLabel('Theme')).toHaveValue('salmon');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'salmon');
});

test('falls back to mint for invalid or unavailable storage', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('chord-theme', 'invalid'));
  await page.goto('/');
  await expect(page.getByLabel('Theme')).toHaveValue('mint');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'mint');
});

test('switching works when storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('unavailable'); } }));
  await page.goto('/');
  await page.getByRole('dialog', { name: 'Guided tour' }).getByRole('button', { name: 'Close' }).click();
  await expect(page.getByLabel('Theme')).toHaveValue('mint');
  await page.getByLabel('Theme').selectOption('orange');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'orange');
});

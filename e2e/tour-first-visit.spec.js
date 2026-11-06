import { test, expect } from '@playwright/test';

const flag = 'chord-tour-dismissed';

test('first visit and interrupted reload show the tour; closing persists and allows replay', async ({ page }) => {
  await page.goto('/');
  const tour = page.getByRole('dialog', { name: 'Guided tour' });
  const launch = page.getByRole('button', { name: 'Start guided tour' });
  await expect(tour).toBeVisible();
  await expect(tour.getByRole('button', { name: 'Next' })).toBeFocused();
  await tour.getByRole('button', { name: 'Next' }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), flag)).toBeNull();
  await page.reload();
  await expect(tour.getByRole('heading')).toHaveText('AUDIO VISUALIZER');
  await tour.getByRole('button', { name: 'Close' }).click();
  await expect(launch).toBeFocused();
  expect(await page.evaluate(key => localStorage.getItem(key), flag)).toBe('true');
  await page.reload();
  await expect(tour).toHaveCount(0);
  await launch.click();
  await expect(tour).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(launch).toBeFocused();
  await page.reload();
  await expect(tour).toHaveCount(0);
});

test('finishing persists and manual replay remains available', async ({ page }) => {
  await page.goto('/');
  const tour = page.getByRole('dialog', { name: 'Guided tour' });
  for (let i = 0; i < 8; i++) await tour.getByRole('button', { name: 'Next' }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), flag)).toBeNull();
  await tour.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByRole('button', { name: 'Start guided tour' })).toBeFocused();
  expect(await page.evaluate(key => localStorage.getItem(key), flag)).toBe('true');
  await page.reload();
  await expect(tour).toHaveCount(0);
  await page.getByRole('button', { name: 'Start guided tour' }).click();
  await expect(tour.getByRole('heading')).toHaveText('AUDIO VISUALIZER');
});

test('Escape on the first visit persists dismissal', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: 'Guided tour' })).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(key => localStorage.getItem(key), flag)).toBe('true');
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Guided tour' })).toHaveCount(0);
});

test('chord hover and active colors follow every live theme switch', async ({ page }) => {
  await page.goto('/');
  const tour = page.getByRole('dialog', { name: 'Guided tour' });
  if (await tour.isVisible()) await tour.getByRole('button', { name: 'Close' }).click();
  const pad = page.getByRole('button', { name: 'PLAY CHORD I', exact: true });
  for (const [theme, color] of Object.entries({ mint: 'rgb(180, 205, 179)', salmon: 'rgb(233, 169, 154)', orange: 'rgb(238, 185, 130)', lavender: 'rgb(199, 174, 219)', sky: 'rgb(159, 203, 210)' })) {
    await page.getByLabel('Theme').selectOption(theme);
    await pad.hover();
    await expect(pad).toHaveCSS('background-color', color);
    await page.keyboard.down('1');
    await page.mouse.move(0, 0);
    await expect(pad).toHaveCSS('background-color', color);
    await page.keyboard.up('1');
  }
});

test('unavailable storage does not prevent closing, replay or playback', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('unavailable'); } }));
  await page.goto('/');
  const tour = page.getByRole('dialog', { name: 'Guided tour' });
  await expect(tour).toBeVisible();
  await tour.getByRole('button', { name: 'Close' }).click();
  await page.keyboard.down('1');
  await expect(page.locator('.screen strong')).toHaveText('C');
  await page.keyboard.up('1');
  await page.getByRole('button', { name: 'Start guided tour' }).click();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(tour).toBeVisible();
});

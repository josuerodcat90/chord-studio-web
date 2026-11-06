import { test, expect } from './fixture.js';

test('history records played chords and their settings even while closed, and resets on reload', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('1');
  await page.getByRole('combobox', { name: 'KEY', exact: true }).selectOption('2');
  await page.getByRole('combobox', { name: 'VOICE', exact: true }).selectOption('Bell');
  await page.getByRole('combobox', { name: 'VOICE', exact: true }).blur();
  await page.keyboard.press('2');
  await page.getByRole('button', { name: 'Chord history' }).click();
  const history = page.getByRole('region', { name: 'Chord history' });
  await expect(history.locator('li')).toHaveCount(2);
  await expect(history.locator('li').first()).toContainText('BELL');
  await expect(history.locator('li').first()).toContainText('D MAJOR');
  await expect(history.locator('li').last()).toContainText('C');
  await page.getByRole('button', { name: 'Close history' }).click();
  await expect(history).toHaveCount(0);
  await page.getByRole('button', { name: 'Chord history' }).click();
  await expect(history.locator('li')).toHaveCount(2);
  await page.reload();
  await page.getByRole('button', { name: 'Chord history' }).click();
  await expect(history).toContainText('NO CHORDS PLAYED YET');
});

test('history captures settings at a hit without recording sound rebuilds', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Chord history' }).click();
  const history = page.getByRole('region', { name: 'Chord history' });
  await page.getByRole('combobox', { name: 'Reverb' }).selectOption('hall');
  await page.getByRole('combobox', { name: 'CHORD COLOR' }).selectOption('seventh');
  await page.getByRole('combobox', { name: 'CHORD COLOR' }).blur();
  await page.keyboard.down('ArrowUp');
  await page.keyboard.down('1');
  await expect(history.locator('li')).toHaveCount(1);
  await expect(history.locator('li').first()).toContainText('I');
  await expect(history.locator('li').first()).toContainText('seventh');
  await expect(history.locator('li').first()).toContainText('UP');
  await expect(history.locator('li').first()).toContainText('hall');
  await page.getByRole('combobox', { name: 'VOICE' }).selectOption('Bell');
  await page.getByRole('combobox', { name: 'VOICE' }).blur();
  await page.keyboard.up('ArrowUp');
  await expect(history.locator('li')).toHaveCount(1);
  await expect(history.locator('li').first()).toContainText('WARM');
  await page.keyboard.up('1');
  await page.keyboard.press('1');
  await expect(history.locator('li')).toHaveCount(2);
  await expect(history.locator('li').first()).toContainText('BELL');
});

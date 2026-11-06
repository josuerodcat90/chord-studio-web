import { test, expect } from './fixture.js';

test('matrix theme uses a green terminal palette, persists, and preserves playback', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Theme').selectOption('matrix');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'matrix');
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(2, 10, 4)');
  await expect(page.locator('.instrument')).toHaveCSS('font-family', /monospace/);
  await expect(page.locator('.visualizer canvas')).toHaveCSS('color', 'rgb(103, 255, 139)');
  await page.reload();
  await expect(page.getByLabel('Theme')).toHaveValue('matrix');
  await page.keyboard.down('1');
  await expect(page.locator('.screen strong')).toHaveText('C');
  await page.keyboard.up('1');
  await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
});

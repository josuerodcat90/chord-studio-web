import { test, expect } from './fixture.js';

for (const theme of ['radio', 'console']) {
  test(`${theme} theme is selectable, persistent, and keeps the instrument playable`, async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Theme').selectOption(theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('.instrument')).toHaveCSS('background-color', theme === 'radio' ? 'rgb(218, 190, 151)' : 'rgb(197, 196, 190)');
    await page.reload();
    await expect(page.getByLabel('Theme')).toHaveValue(theme);
    await page.getByRole('button', { name: 'PLAY CHORD I', exact: true }).focus();
    await page.keyboard.down('Space');
    await expect(page.getByRole('button', { name: 'PLAY CHORD I', exact: true })).toHaveClass(/active/);
    await page.keyboard.up('Space');
  });
}

import { test, expect } from './fixture.js';

test('diagonal dots follow every theme and retain active feedback', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const theme = page.getByLabel('Theme');
  const joystick = page.getByRole('application', { name: 'Chord joystick' });
  const dots = joystick.locator('.joy-diagonal');
  const inactiveColors = new Set();
  const activeColors = new Set();
  for (const value of ['mint', 'salmon', 'orange', 'lavender', 'sky']) {
    await theme.selectOption(value);
    await expect(page.locator('html')).toHaveAttribute('data-theme', value);
    await theme.blur();
    const inactive = await dots.evaluateAll(elements => elements.map(el => getComputedStyle(el).backgroundColor));
    expect(new Set(inactive).size).toBe(1);
    inactiveColors.add(inactive[0]);
    await page.keyboard.down('ArrowUp');
    await page.keyboard.down('ArrowRight');
    const activeDot = joystick.locator('[data-direction="up-right"]');
    await expect(activeDot).toHaveClass(/active/);
    await expect(page.locator('#joystick-status')).toHaveText('UP-RIGHT');
    const active = await activeDot.evaluate(el => ({ color: getComputedStyle(el).backgroundColor, shadow: getComputedStyle(el).boxShadow }));
    expect(active.color).not.toBe(inactive[0]);
    expect(active.shadow).not.toBe('none');
    activeColors.add(active.color);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('ArrowUp');
    await expect(activeDot).not.toHaveClass(/active/);
    await expect(page.locator('#joystick-status')).toHaveText('CENTER');
  }
  expect(inactiveColors.size).toBe(5);
  expect(activeColors.size).toBe(5);
});

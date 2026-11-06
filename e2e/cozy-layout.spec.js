import { test, expect } from './fixture.js';

test('wide layout pairs the display with the visualizer and controls with joystick', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  // Measure together: font loading or scrolling can move the layout between calls.
  const { screen, visualizer, controls, stick, sustain } = await page.evaluate(() => {
    const box = selector => {
      const { x, y, width, height } = document.querySelector(selector).getBoundingClientRect();
      return { x, y, width, height };
    };
    return { screen: box('.screen'), visualizer: box('.visualizer canvas'), controls: box('.controls'), stick: box('.joystick'), sustain: box('.joystick-sustain') };
  });
  expect(screen.x + screen.width).toBeLessThanOrEqual(visualizer.x);
  const overlap = Math.min(screen.y + screen.height, visualizer.y + visualizer.height) - Math.max(screen.y, visualizer.y);
  expect(overlap).toBeGreaterThanOrEqual(Math.min(screen.height, visualizer.height) / 2);
  expect(controls.x + controls.width).toBeLessThanOrEqual(stick.x);
  expect(stick.y).toBeLessThan(controls.y + controls.height);
  expect(sustain.y).toBeGreaterThanOrEqual(stick.y + stick.height);
});

test('mobile layout fits and joystick directions are accessible but not visibly explained', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  for (const selector of ['.screen', '.visualizer', '.controls', '.joystick', '.joystick-sustain']) {
    const box = await page.locator(selector).boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
  }
  await expect(page.getByText('Drag or use arrow keys', { exact: false })).toHaveCount(0);
  await expect(page.getByText('Combine unassigned arrows', { exact: false })).toHaveCount(0);
  const status = page.locator('#joystick-status');
  await expect(status).toHaveAttribute('aria-live', 'polite');
  await expect(status).toHaveCSS('position', 'absolute');
  await page.keyboard.down('ArrowRight');
  await expect(status).toHaveText('RIGHT');
  await page.keyboard.up('ArrowRight');
  await expect(status).toHaveText('CENTER');
});

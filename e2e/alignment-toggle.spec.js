import { test, expect } from './fixture.js';

test('shared visualizer heading and desktop controls align', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Audio visualizer' });
  await expect(section.locator('.screen strong')).toHaveText('READY TO PLAY');
  await expect(section.locator('canvas')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  // Measure all geometry in one snapshot, after font metrics have settled.
  const boxes = await page.evaluate(() => {
    const box = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
    return { screen: box('.screen'), canvas: box('.visualizer canvas'), label: box('.joystick-control > .section-label'), key: box('.controls label'), toggle: box('.joystick-sustain'), color: box('.controls label:last-child select') };
  });
  expect(Math.abs((boxes.screen.y + boxes.screen.height / 2) - (boxes.canvas.y + boxes.canvas.height / 2))).toBeLessThanOrEqual(1);
  expect(boxes.canvas.height).toBeCloseTo(boxes.screen.height, 0);
  expect(Math.abs(boxes.label.y - boxes.key.y)).toBeLessThanOrEqual(2);
  for (const select of [boxes.color]) {
    // Same-row alignment allows minor differences in native control/font metrics,
    // but requires most of the shorter control to overlap vertically.
    const overlap = Math.min(boxes.toggle.bottom, select.bottom) - Math.max(boxes.toggle.top, select.top);
    expect(overlap).toBeGreaterThanOrEqual(Math.min(boxes.toggle.height, select.height) * 0.85);
  }
});

test('joystick sustain is a keyboard-operable tactile toggle independent of chord sustain', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Sustain joystick' });
  const chord = page.getByRole('button', { name: 'SUSTAIN CHORD I', exact: true });
  await expect(toggle.locator('.toggle-track')).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(chord).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

test('mobile display and toggle stay within viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  for (const element of [page.locator('.screen'), page.locator('canvas'), page.getByRole('button', { name: 'Sustain joystick' })]) {
    await expect(element).toBeVisible();
    const box = await element.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

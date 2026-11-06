import { test, expect } from './fixture.js';

test('wide layout keeps chord color in the sound controls and sustain beside joystick', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.locator('.controls').getByRole('combobox', { name: 'Chord color' })).toBeVisible();
  // Compare a single layout frame: late font loading can reposition both controls.
  const { stick, sustain } = await page.evaluate(() => ({
    stick: document.querySelector('.joystick').getBoundingClientRect().toJSON(),
    sustain: document.querySelector('.joystick-sustain').getBoundingClientRect().toJSON(),
  }));
  expect(Math.abs((sustain.x + sustain.width / 2) - (stick.x + stick.width / 2))).toBeLessThan(25);
  expect(sustain.y - (stick.y + stick.height)).toBeGreaterThanOrEqual(0);
  expect(sustain.y - (stick.y + stick.height)).toBeLessThan(20);
});

test('controls and joystick section has a visible full-width divider at desktop and mobile sizes', async ({ page }) => {
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const divider = await page.locator('.control-grid').evaluate(el => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return { style: style.borderTopStyle, width: parseFloat(style.borderTopWidth), color: style.borderTopColor, rowWidth: rect.width, parentWidth: el.parentElement.clientWidth };
    });
    expect(divider.style).toBe('solid');
    expect(divider.width).toBeGreaterThan(0);
    expect(divider.color).not.toBe('rgba(0, 0, 0, 0)');
    expect(divider.rowWidth).toBeGreaterThan(divider.parentWidth * 0.8);
  }
});

test('mobile controls remain visible, usable and within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  const color = page.getByRole('combobox', { name: 'Chord color' });
  for (const control of [page.getByLabel('Theme'), color, page.getByRole('application', { name: 'Chord joystick' }), page.getByRole('button', { name: 'Sustain joystick' }), page.getByRole('button', { name: 'PLAY CHORD I', exact: true }), page.getByRole('button', { name: 'SUSTAIN CHORD I', exact: true })]) {
    await expect(control).toBeVisible();
    const box = await control.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.getByLabel('Theme').selectOption('salmon');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'salmon');
  await expect(color.locator('option')).toHaveText(['Original', '7th', 'Sus4', 'Sus2', '6th', 'Add9']);
  await expect(color).toHaveValue('triad');
  for (const [value, name] of [['seventh', 'C maj7'], ['sus4', 'C sus4'], ['triad', 'C']]) {
    await color.selectOption(value);
    await expect(color).toHaveValue(value);
    await color.blur();
    await page.keyboard.down('1');
    await expect(page.locator('.screen strong')).toHaveText(name);
    await page.keyboard.up('1');
  }
  await page.getByRole('button', { name: 'Sustain joystick' }).click();
  await expect(page.getByRole('button', { name: 'Sustain joystick' })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.down('1');
  await expect(page.locator('.screen strong')).toHaveText('C');
  await page.keyboard.up('1');
  await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
});

import { test, expect } from './fixture.js';

const anchors = ['.visualizer', '.controls', '.joystick-control', '.pitch-bend', '.metronome', '.reset-actions', '.chord-header', '.pads', '.pad-group .sustain'];

async function checkSpotlight(page, anchor) {
  await expect.poll(async () => page.evaluate(selector => {
    const target = document.querySelector(selector).getBoundingClientRect();
    const spot = document.querySelector('.tour-spotlight')?.getBoundingClientRect();
    if (!spot) return false;
    const left = Math.max(0, Math.min(innerWidth, target.left));
    const right = Math.max(left, Math.min(innerWidth, target.right));
    const top = Math.max(0, Math.min(innerHeight, target.top));
    const bottom = Math.max(top, Math.min(innerHeight, target.bottom));
    return Math.abs(spot.left - left) < 2 && Math.abs(spot.top - top) < 2 && Math.abs(spot.width - (right - left)) < 2 && Math.abs(spot.height - (bottom - top)) < 2;
  }, anchor)).toBe(true);
}

test('backdrop follows every step, blocks outside clicks, and dismisses accessibly', async ({ page }) => {
  await page.goto('/');
  const launch = page.getByRole('button', { name: 'Start guided tour' });
  await expect(page.locator('.tour-backdrop')).toHaveCount(0);
  await launch.click();
  const tour = page.getByRole('dialog', { name: 'Guided tour' });
  await expect(tour.getByRole('button', { name: 'Next' })).toBeFocused();
  await expect(page.locator('.tour-backdrop')).toBeVisible();
  await expect(page.locator('.tour-backdrop')).toHaveAttribute('aria-hidden', 'true');
  expect(await page.evaluate(() => document.elementFromPoint(1, 1).classList.contains('tour-shade'))).toBe(true);
  await page.mouse.click(1, 1);
  await expect(tour).toBeVisible();
  for (let i = 0; i < anchors.length; i++) {
    await checkSpotlight(page, anchors[i]);
    const layers = await page.evaluate(() => ({ panel: +getComputedStyle(document.querySelector('.tour-panel')).zIndex, backdrop: +getComputedStyle(document.querySelector('.tour-backdrop')).zIndex }));
    expect(layers.panel).toBeGreaterThan(layers.backdrop);
    if (i < anchors.length - 1) await tour.getByRole('button', { name: 'Next' }).click();
  }
  await tour.getByRole('button', { name: 'Back' }).click();
  await checkSpotlight(page, anchors[7]);
  await page.keyboard.press('Escape');
  await expect(page.locator('.tour-backdrop')).toHaveCount(0);
  await expect(launch).toBeFocused();
  await launch.click();
  await tour.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('.tour-backdrop')).toHaveCount(0);
  await expect(launch).toBeFocused();
});

test('spotlight tracks scroll and resize on mobile without interrupting playback', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.getByRole('button', { name: 'SUSTAIN CHORD I', exact: true }).click();
  await page.keyboard.press('1');
  await expect(page.locator('.screen strong')).toHaveText('C');
  await page.getByRole('button', { name: 'Start guided tour' }).click();
  await checkSpotlight(page, anchors[0]);
  await page.evaluate(() => window.scrollBy(0, 80));
  await checkSpotlight(page, anchors[0]);
  await page.setViewportSize({ width: 375, height: 667 });
  await checkSpotlight(page, anchors[0]);
  const tour = page.getByRole('dialog', { name: 'Guided tour' });
  for (let i = 1; i < anchors.length; i++) {
    await tour.getByRole('button', { name: 'Next' }).click();
    await checkSpotlight(page, anchors[i]);
  }
  await tour.getByRole('button', { name: 'Finish' }).click();
  await expect(page.locator('.tour-backdrop')).toHaveCount(0);
  await expect(page.locator('.screen strong')).toHaveText('C');
});

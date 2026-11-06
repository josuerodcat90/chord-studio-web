import { test, expect } from './fixture.js';

const titles = ['Audio visualizer', 'Sound controls', 'Chord joystick', 'Pitch bend', 'Metronome', 'Stopping and resetting', 'Keyboard bindings', 'Play chords', 'Sustain chords'].map(title => title.toUpperCase());

test('tour is optional, navigable and restores focus on dismissal', async ({ page }) => {
  await page.goto('/');
  const launch = page.getByRole('button', { name: 'Start guided tour' });
  await expect(page.getByRole('dialog', { name: 'Guided tour' })).toHaveCount(0);
  await launch.click();
  const tour = page.getByRole('dialog', { name: 'Guided tour' });
  await expect(tour).toBeVisible();
  await expect(tour.getByRole('heading')).toHaveText(titles[0]);
  await expect(tour.getByRole('button', { name: 'Next' })).toBeFocused();
  for (const title of titles.slice(1)) {
    await tour.getByRole('button', { name: 'Next' }).click();
    await expect(tour.getByRole('heading')).toHaveText(title);
  }
  await tour.getByRole('button', { name: 'Back' }).click();
  await expect(tour.getByRole('heading')).toHaveText('PLAY CHORDS');
  await page.keyboard.press('Escape');
  await expect(tour).toHaveCount(0);
  await expect(launch).toBeFocused();
  await launch.click();
  await expect(tour.getByRole('heading')).toHaveText(titles[0]);
  await tour.getByRole('button', { name: 'Close' }).click();
  await expect(launch).toBeFocused();
  await page.reload();
  await expect(tour).toHaveCount(0);
});

for (const width of [320, 1280]) test(`tour describes pitch and both reset actions at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start guided tour' }).click();
  const tour = page.getByRole('dialog', { name: 'Guided tour' });
  for (let i = 0; i < 3; i++) await tour.getByRole('button', { name: 'Next' }).click();
  await expect(tour).toContainText('RESET PITCH BEND');
  await expect(page.locator('.tour-spotlight')).toBeVisible();
  await tour.getByRole('button', { name: 'Next' }).click();
  await expect(tour.getByRole('heading')).toHaveText('METRONOME');
  await expect(tour).toContainText('BEATS PER MEASURE');
  await expect(tour).toContainText('FIRST BEAT');
  await expect(tour).toContainText('LIGHTS');
  await tour.getByRole('button', { name: 'Next' }).click();
  await expect(tour).toContainText('TURN EVERYTHING OFF');
  await expect(tour).toContainText('RESET CONFIGURATION');
  await expect(tour).toContainText('THEME AND TOUR DISMISSAL');
  await expect(tour).toContainText('METRONOME');
  await tour.getByRole('button', { name: 'Back' }).click();
  await expect(tour.getByRole('heading')).toHaveText('METRONOME');
  for (let i = 0; i < 4; i++) await tour.getByRole('button', { name: 'Next' }).click();
  await tour.getByRole('button', { name: 'Finish' }).click();
  await expect(tour).toHaveCount(0);
});

test('tour does not interrupt sustained audio or change settings', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('VOICE').selectOption('Bright');
  await page.getByRole('button', { name: 'SUSTAIN CHORD I', exact: true }).click();
  await page.keyboard.press('1');
  await expect(page.locator('.screen strong')).toHaveText('C');
  await page.getByRole('button', { name: 'Start guided tour' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.screen strong')).toHaveText('C');
  await expect(page.getByRole('button', { name: 'SUSTAIN CHORD I', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('VOICE')).toHaveValue('Bright');
});

test('tour remains within a mobile viewport while navigating', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start guided tour' }).click();
  const tour = page.getByRole('dialog', { name: 'Guided tour' });
  for (let i = 0; i < titles.length; i++) {
    await expect(tour.getByRole('heading')).toHaveText(titles[i]);
    const box = await tour.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    expect(box.y + box.height).toBeLessThanOrEqual(568);
    if (i < titles.length - 1) await tour.getByRole('button', { name: 'Next' }).click();
  }
  await tour.getByRole('button', { name: 'Finish' }).click();
  await expect(tour).toHaveCount(0);
});

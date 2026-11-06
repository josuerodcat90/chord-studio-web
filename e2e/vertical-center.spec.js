import { test, expect } from './fixture.js';

for (const [name, viewport] of [['desktop', { width: 1280, height: 1200 }], ['mobile', { width: 390, height: 1600 }]]) {
  test(`centers the instrument below the header on spacious ${name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const header = await page.locator('header').boundingBox();
    const instrument = await page.getByRole('region', { name: 'Chord instrument' }).boundingBox();
    expect(instrument.y).toBeGreaterThan(header.y + header.height);
    expect(Math.abs((instrument.y + instrument.height / 2) - (header.y + header.height + viewport.height) / 2)).toBeLessThanOrEqual(2);
  });
}

for (const [name, viewport] of [['desktop', { width: 1280, height: 500 }], ['mobile', { width: 320, height: 568 }]]) {
  test(`short ${name} viewport scrolls to all instrument controls and preserves the tour`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const header = page.locator('header');
    const instrument = page.getByRole('region', { name: 'Chord instrument' });
    const headerBox = await header.boundingBox();
    const instrumentBox = await instrument.boundingBox();
    expect(instrumentBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(viewport.height);
    const reset = page.getByRole('button', { name: 'Turn Everything Off' });
    await reset.scrollIntoViewIfNeeded();
    await expect(reset).toBeInViewport();
    await reset.click();
    await page.getByRole('button', { name: 'Start guided tour' }).click();
    const tour = page.getByRole('dialog', { name: 'Guided tour' });
    await expect(tour.getByRole('heading')).toHaveText('AUDIO VISUALIZER');
    await tour.getByRole('button', { name: 'Next' }).click();
    await expect(tour.getByRole('heading')).toHaveText('SOUND CONTROLS');
    await tour.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('button', { name: 'Start guided tour' })).toBeFocused();
  });
}

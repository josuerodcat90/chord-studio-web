import { test, expect } from './fixture.js';

for (const width of [1440, 320]) {
  test(`compact, legible displays at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const screen = page.locator('.screen');
    const canvas = page.locator('.visualizer canvas');
    await expect(screen).toHaveCSS('display', 'flex');
    await expect(screen).toHaveCSS('flex-direction', 'column');
    await expect(screen).toHaveCSS('justify-content', 'space-between');
    await expect(screen).toHaveCSS('padding-top', '10px');
    await expect(screen).toHaveCSS('padding-bottom', '10px');
    const screenBox = await screen.boundingBox();
    const canvasBox = await canvas.boundingBox();
    console.log(`baseline ${width}px: screen=${screenBox.height}px canvas=${canvasBox.height}px`);
    for (const box of [screenBox, canvasBox]) {
      expect(box.height).toBe(100);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    if (width > 650) {
      expect(canvasBox.height).toBeCloseTo(screenBox.height, 0);
      expect(canvasBox.y).toBeCloseTo(screenBox.y, 0);
    } else {
      expect(canvasBox.y).toBeGreaterThanOrEqual(screenBox.y + screenBox.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    const checkContent = async () => {
      for (const part of [screen.locator('.screen-top'), screen.locator('strong'), screen.locator('.screen-bottom')]) {
        await expect(part).toBeVisible();
        const box = await part.boundingBox();
        expect(box.y).toBeGreaterThanOrEqual(screenBox.y);
        expect(box.y + box.height).toBeLessThanOrEqual(screenBox.y + screenBox.height);
        expect(box.x).toBeGreaterThanOrEqual(screenBox.x);
        expect(box.x + box.width).toBeLessThanOrEqual(screenBox.x + screenBox.width);
      }
    };
    await expect(screen.locator('strong')).toHaveText('READY TO PLAY');
    await checkContent();
    await page.keyboard.down('1');
    await expect(screen.locator('strong')).toHaveText('C');
    await checkContent();
    await page.keyboard.up('1');
    await expect(screen.locator('strong')).toHaveText('READY TO PLAY');
    await page.getByRole('button', { name: 'Spectrum' }).click();
    await expect(page.getByRole('button', { name: 'Spectrum' })).toHaveAttribute('aria-pressed', 'true');
  });
}

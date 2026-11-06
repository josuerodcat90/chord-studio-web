import { test, expect } from './fixture.js';

for (const width of [1440, 320]) {
  test(`display geometry at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const screen = await page.locator('.screen').boundingBox();
    const canvas = await page.locator('canvas').boundingBox();
    if (width > 650) {
      expect(canvas.height).toBeCloseTo(screen.height, 0);
      expect(canvas.y).toBeCloseTo(screen.y, 0);
    } else {
      expect(canvas.y).toBeGreaterThanOrEqual(screen.y + screen.height);
      expect(canvas.height).toBeGreaterThan(0);
    }
    expect(canvas.x).toBeGreaterThanOrEqual(0);
    expect(canvas.x + canvas.width).toBeLessThanOrEqual(width);
  });
}

for (const reducedMotion of ['no-preference', 'reduce']) {
  test(`theme redraws idle and active waveform and spectrum with ${reducedMotion} motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.addInitScript(() => {
      window.draws = [];
      const ctx = { setTransform() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() { window.draws.push(['stroke', this.strokeStyle]); }, fillRect() { window.draws.push(['bar', this.fillStyle]); } };
      HTMLCanvasElement.prototype.getContext = () => ctx;
      window.AudioContext = class {
        currentTime = 0; sampleRate = 100; destination = {};
        resume() {} close() {}
        createBuffer(_c, length) { return { getChannelData: () => new Float32Array(length) }; }
        createConvolver() { return { connect() {} }; }
        createAnalyser() { return { connect() {}, fftSize: 2048, frequencyBinCount: 1024, getByteTimeDomainData(data) { data.fill(160); }, getByteFrequencyData(data) { data.fill(100); } }; }
        createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} }, connect() {} }; }
        createOscillator() { return { frequency: {}, connect() {}, start() {}, stop() {} }; }
      };
    });
    await page.goto('/');
    const theme = page.getByLabel('Theme');
    const color = () => page.locator('canvas').evaluate(el => getComputedStyle(el).color);
    const changeAndCheck = async (value, kind) => {
      const oldColor = await color();
      await page.evaluate(() => { window.draws = []; });
      await theme.selectOption(value);
      await expect.poll(color).not.toBe(oldColor);
      const expected = await color();
      await expect.poll(() => page.evaluate(() => window.draws.at(-1))).toEqual([kind, expected]);
    };
    await changeAndCheck('salmon', 'stroke');
    await changeAndCheck('mint', 'stroke');
    await page.keyboard.down('1');
    await expect(page.getByRole('button', { name: 'PLAY CHORD I', exact: true })).toHaveClass(/active/);
    await changeAndCheck('sky', 'stroke');
    await page.getByRole('button', { name: 'Spectrum' }).click();
    await expect.poll(() => page.evaluate(() => window.draws.at(-1)?.[0])).toBe('bar');
    await changeAndCheck('lavender', 'bar');
    await page.keyboard.up('1');
    await changeAndCheck('orange', 'stroke');
  });
}

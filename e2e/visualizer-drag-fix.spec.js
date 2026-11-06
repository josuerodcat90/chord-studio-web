import { test, expect } from './fixture.js';

for (const width of [1440, 320]) {
  test(`visualizer is aligned at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const canvas = await page.locator('.visualizer canvas').boundingBox();
    const screen = await page.locator('.screen').boundingBox();
    if (width > 650) {
      expect(canvas.height).toBeCloseTo(screen.height, 0);
      expect(canvas.y + canvas.height / 2).toBeCloseTo(screen.y + screen.height / 2, 0);
    } else {
      expect(canvas.y).toBeGreaterThanOrEqual(screen.y + screen.height);
    }
    expect(canvas.x).toBeGreaterThanOrEqual(0);
    expect(canvas.x + canvas.width).toBeLessThanOrEqual(width);
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.notes = [];
    window.AudioContext = class {
      currentTime = 0; sampleRate = 100; destination = {};
      resume() {} close() {}
      createBuffer(_channels, length) { return { getChannelData() { return new Float32Array(length); } }; }
      createConvolver() { return { connect() {} }; }
      createAnalyser() { return { connect() {}, fftSize: 2048, frequencyBinCount: 1024, getByteTimeDomainData(data) { data.fill(128); }, getByteFrequencyData(data) { data.fill(0); } }; }
      createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} }, connect() {} }; }
      createOscillator() { const note = { stopped: false }; return { frequency: {}, connect() {}, start() { window.notes.push(note); }, stop() { note.stopped = true; } }; }
    };
  });
});

async function position(locator) {
  const box = await locator.boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
const sounding = page => page.evaluate(() => window.notes.filter(note => !note.stopped).length);

test('mouse drag switches audio and visual from original pad, including outside and release', async ({ page }) => {
  await page.goto('/');
  const first = page.getByRole('button', { name: 'PLAY CHORD I', exact: true });
  const second = page.getByRole('button', { name: 'PLAY CHORD ii', exact: true });
  await first.scrollIntoViewIfNeeded();
  const a = await position(first), b = await position(second);
  const idle = await second.evaluate(el => getComputedStyle(el).backgroundColor);
  await page.mouse.move(b.x, b.y); await page.mouse.move(a.x, a.y); await page.mouse.down();
  await expect(first).toHaveClass(/active/); expect(await sounding(page)).toBe(3);
  await page.mouse.move(b.x, b.y);
  await expect(first).not.toHaveClass(/active/); await expect(second).toHaveClass(/active/);
  await expect(page.locator('.screen strong')).toHaveText('Dm');
  expect(await sounding(page)).toBe(3);
  expect(await first.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(idle);
  await expect(first).not.toBeFocused();
  await page.mouse.move(b.x, b.y + 200);
  await expect(second).not.toHaveClass(/active/); expect(await sounding(page)).toBe(0);
  await page.mouse.move(b.x, b.y); await expect(second).toHaveClass(/active/);
  await page.mouse.up(); await expect(second).not.toHaveClass(/active/); expect(await sounding(page)).toBe(0);
});

test('sustain and layered keyboard notes survive pointer movement and keyboard focus remains visible', async ({ page }) => {
  await page.goto('/');
  const first = page.getByRole('button', { name: 'PLAY CHORD I', exact: true });
  const second = page.getByRole('button', { name: 'PLAY CHORD ii', exact: true });
  await page.getByRole('button', { name: 'SUSTAIN CHORD I', exact: true }).click();
  await page.keyboard.down('3');
  await first.scrollIntoViewIfNeeded();
  const a = await position(first), b = await position(second);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y);
  await expect(first).toHaveClass(/active/); await expect(second).toHaveClass(/active/);
  expect(await sounding(page)).toBe(9);
  await page.mouse.up(); expect(await sounding(page)).toBe(6);
  await page.keyboard.up('3'); expect(await sounding(page)).toBe(3);
  await page.getByRole('button', { name: 'SUSTAIN CHORD I', exact: true }).click();
  expect(await sounding(page)).toBe(0);
  await first.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(first).toBeFocused();
  expect(await first.evaluate(el => el.matches(':focus-visible'))).toBe(true);
  await page.keyboard.down('Enter'); await expect(first).toHaveClass(/active/);
  await page.keyboard.up('Enter'); await expect(first).not.toHaveClass(/active/);
});

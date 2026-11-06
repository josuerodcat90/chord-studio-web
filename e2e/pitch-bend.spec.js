import { test, expect } from './fixture.js';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.notes = [];
    window.AudioContext = class {
      currentTime = 1; sampleRate = 100; destination = {};
      resume() {} close() {}
      createBuffer(_c, n) { return { getChannelData() { return new Float32Array(n); } }; }
      createConvolver() { return { connect() {} }; }
      createAnalyser() { return { connect() {}, disconnect() {}, fftSize: 2048, frequencyBinCount: 1024, getByteTimeDomainData(d) { d.fill(128); }, getByteFrequencyData(d) { d.fill(0); } }; }
      createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} }, connect() {} }; }
      createOscillator() { const note = { frequency: {}, stopped: false }; return { frequency: note.frequency, connect() {}, start() { window.notes.push(note); }, stop() { note.stopped = true; } }; }
    };
  });
  await page.goto('/');
});

test('bends held and sustained layers continuously, including future and rebuilt voices', async ({ page }) => {
  const slider = page.getByRole('slider', { name: 'Pitch bend' });
  await expect(slider).toHaveValue('0');
  await page.getByRole('button', { name: 'SUSTAIN CHORD I', exact: true }).click();
  await page.keyboard.press('1'); await page.keyboard.down('2');
  const state = () => page.evaluate(() => ({ count: window.notes.length, frequencies: window.notes.filter(n => !n.stopped).map(n => n.frequency.value) }));
  const initial = await state();
  expect(initial.count).toBe(6);
  await slider.fill('2');
  let changed = await state();
  expect(changed.count).toBe(6);
  changed.frequencies.forEach((frequency, i) => { expect(frequency / initial.frequencies[i]).toBeCloseTo(2 ** (2 / 12), 6); });
  await slider.fill('-1');
  changed = await state();
  changed.frequencies.forEach((frequency, i) => { expect(frequency / initial.frequencies[i]).toBeCloseTo(2 ** (-1 / 12), 6); });
  await slider.fill('0');
  expect((await state()).frequencies).toEqual(initial.frequencies);
  await slider.fill('2');
  await slider.blur(); await page.keyboard.down('3');
  expect((await state()).frequencies[6]).toBeCloseTo(440 * 2 ** ((64 - 69 + 2) / 12), 6);
  await page.getByLabel('KEY').selectOption('2');
  expect((await state()).frequencies[0]).toBeCloseTo(440 * 2 ** ((62 - 69 + 2) / 12), 6);
  await page.getByRole('button', { name: 'Turn Everything Off' }).click();
  expect((await state()).frequencies).toEqual([]);
  await expect(slider).toHaveValue('2');
  await page.keyboard.up('2'); await page.keyboard.up('3');
});

test('vertical control is beside joystick, keyboard accessible and fits mobile', async ({ page }) => {
  const slider = page.getByRole('slider', { name: 'Pitch bend' });
  const joy = page.getByRole('application', { name: 'Chord joystick' });
  expect((await slider.boundingBox()).x).toBeGreaterThan((await joy.boundingBox()).x);
  await slider.focus(); await page.keyboard.press('ArrowUp');
  await expect(slider).not.toHaveValue('0');
  await expect(page.locator('#joystick-status')).toHaveText('CENTER');
  await expect(page.locator('.pitch-bend output')).toContainText('SEMITONES');
  await page.setViewportSize({ width: 375, height: 800 });
  const box = await slider.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

import { test, expect } from './fixture.js';

test('holds and releases all seven keyboard chords simultaneously', async ({ page }) => {
  await page.addInitScript(() => {
    window.testOscillators = [];
    window.AudioContext = class {
      currentTime = 0; sampleRate = 100; destination = {};
      resume() {} close() {}
      createBuffer(_channels, length) { return { getChannelData() { return new Float32Array(length); } }; }
      createConvolver() { return { connect() {} }; }
      createAnalyser() { return { connect() {}, fftSize: 2048, frequencyBinCount: 1024, getByteTimeDomainData(data) { data.fill(128); }, getByteFrequencyData(data) { data.fill(0); } }; }
      createOscillator() {
        const entry = { started: false, stopped: false };
        window.testOscillators.push(entry);
        return { frequency: {}, connect() {}, start() { entry.started = true; }, stop() { entry.stopped = true; } };
      }
      createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} }, connect() {} }; }
    };
  });
  await page.goto('/');
  const keys = ['1', '2', '3', '4', '5', '6', '7'];
  for (const key of keys) await page.keyboard.down(key);
  await expect(page.locator('.pad.active')).toHaveCount(7);
  expect(await page.evaluate(() => window.testOscillators.filter(o => o.started && !o.stopped).length)).toBe(21);
  for (let i = 0; i < keys.length; i++) {
    await page.keyboard.up(keys[i]);
    await expect(page.locator('.pad.active')).toHaveCount(6 - i);
    expect(await page.evaluate(() => window.testOscillators.filter(o => o.started && !o.stopped).length)).toBe((6 - i) * 3);
  }
  expect(await page.evaluate(() => window.testOscillators.length)).toBe(21);
  await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
});

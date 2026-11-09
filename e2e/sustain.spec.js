import { test, expect } from './fixture.js';

test('layers keyboard chords, sustains independently, and colors every sounding chord', async ({ page }) => {
  await page.addInitScript(() => {
    window.notes = [];
    window.AudioContext = class {
      currentTime = 0; sampleRate = 100; destination = {};
      resume() {} close() {}
      createBuffer(_channels, length) { return { getChannelData() { return new Float32Array(length); } }; }
      createConvolver() { return { connect() {} }; }
      createAnalyser() { return { connect() {}, fftSize: 2048, frequencyBinCount: 1024, getByteTimeDomainData(data) { data.fill(128); }, getByteFrequencyData(data) { data.fill(0); } }; }
      createOscillator() {
        const entry = { note: null, gain: null, stopAt: null };
        return { frequency: {}, connect(gain) { entry.gain = gain.gain; return gain; }, start() { entry.note = Math.round(69 + 12 * Math.log2(this.frequency.value / 440)); window.notes.push(entry); }, stop(time) { entry.stopAt = time; } };
      }
      createGain() { return { gain: { value: 0, setValueAtTime(value) { this.value = value; }, linearRampToValueAtTime(value) { this.value = value; }, cancelScheduledValues() {}, setTargetAtTime(value) { this.value = value; } }, connect() {} }; }
    };
  });
  // Gain targets distinguish held notes from still-running release tails.
  const sounding = () => page.evaluate(() => window.notes.filter(n => n.gain.value > 0).map(n => n.note).sort((a, b) => a - b));
  await page.goto('/');
  const sustain = page.getByRole('button', { name: 'SUSTAIN CHORD I', exact: true });
  await sustain.click();
  await expect(sustain).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.down('1');
  await page.keyboard.down('2');
  expect(await sounding()).toEqual([60, 62, 64, 65, 67, 69]);
  await page.keyboard.up('1');
  expect(await sounding()).toEqual([60, 62, 64, 65, 67, 69]);
  await page.keyboard.down('ArrowUp');
  expect(await sounding()).toEqual([60, 62, 63, 66, 67, 69]);
  await page.keyboard.up('ArrowUp');
  expect(await sounding()).toEqual([60, 62, 64, 65, 67, 69]);
  expect(await page.evaluate(() => window.notes.length)).toBe(8);
  await page.keyboard.up('2');
  expect(await sounding()).toEqual([60, 64, 67]);
  await page.keyboard.down('1');
  expect(await sounding()).toEqual([]);
  await page.keyboard.up('1');
  await page.keyboard.down('1');
  await sustain.click();
  expect(await sounding()).toEqual([60, 64, 67]);
  await page.keyboard.up('1');
  expect(await sounding()).toEqual([]);
});

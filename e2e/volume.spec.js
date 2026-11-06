import { test, expect } from './fixture.js';

test('volume immediately updates sustained and layered notes without restarting them', async ({ page }) => {
  await page.addInitScript(() => {
    window.notes = [];
    window.AudioContext = class {
      currentTime = 1; sampleRate = 100; destination = {};
      resume() {} close() {}
      createBuffer(_channels, length) { return { getChannelData() { return new Float32Array(length); } }; }
      createConvolver() { return { connect() {} }; }
      createAnalyser() { return { connect() {}, fftSize: 2048, frequencyBinCount: 1024, getByteTimeDomainData(data) { data.fill(128); }, getByteFrequencyData(data) { data.fill(0); } }; }
      createOscillator() {
        const note = { stopped: false, gain: null };
        return { frequency: {}, connect(gain) { note.gain = gain.gain; return gain; }, start() { window.notes.push(note); }, stop() { note.stopped = true; } };
      }
      createGain() {
        const gain = { value: 0, setValueAtTime(value) { this.value = value; }, linearRampToValueAtTime(value) { this.value = value; }, cancelScheduledValues() {}, setTargetAtTime(value) { this.value = value; } };
        return { gain, connect() {} };
      }
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'SUSTAIN CHORD I', exact: true }).click();
  await page.getByRole('button', { name: 'SUSTAIN CHORD ii', exact: true }).click();
  await page.keyboard.press('1');
  await page.keyboard.press('2');
  const state = () => page.evaluate(() => ({ count: window.notes.length, sounding: window.notes.filter(note => !note.stopped).map(note => note.gain.value) }));
  expect(await state()).toEqual({ count: 6, sounding: Array(6).fill(0.4 * 0.12) });
  const volume = page.getByLabel('VOLUME');
  await volume.fill('0.2');
  await expect.poll(state).toEqual({ count: 6, sounding: Array(6).fill(0.2 * 0.12) });
  await volume.fill('0');
  await expect.poll(state).toEqual({ count: 6, sounding: Array(6).fill(0) });
  await page.getByRole('button', { name: 'SUSTAIN CHORD I', exact: true }).click();
  await page.getByRole('button', { name: 'SUSTAIN CHORD ii', exact: true }).click();
  expect(await state()).toEqual({ count: 6, sounding: [] });
  await volume.fill('0.3');
  await volume.blur();
  await page.keyboard.down('1');
  expect(await state()).toEqual({ count: 9, sounding: Array(3).fill(0.3 * 0.12) });
  await page.keyboard.up('1');
  expect(await state()).toEqual({ count: 9, sounding: [] });
});

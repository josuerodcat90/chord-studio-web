import { test, expect } from './fixture.js';

test('new voices and colors update sustained chords and labels', async ({ page }) => {
  await page.addInitScript(() => {
    window.notes = [];
    window.AudioContext = class {
      currentTime = 1; sampleRate = 100; destination = {};
      resume() {} close() {}
      createBuffer(_c, n) { return { getChannelData: () => new Float32Array(n) }; }
      createConvolver() { return { connect() {} }; }
      createAnalyser() { return { connect() {}, disconnect() {}, fftSize: 32, frequencyBinCount: 16, getByteTimeDomainData() {}, getByteFrequencyData() {} }; }
      createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} }, connect() {} }; }
      createPeriodicWave(_real, imag) { return Array.from(imag); }
      createOscillator() { const n = { stopped: false }; return { frequency: {}, connect() {}, setPeriodicWave(w) { n.wave = w; }, start() { n.type = this.type; n.note = Math.round(69 + 12 * Math.log2(this.frequency.value / 440)); window.notes.push(n); }, stop() { n.stopped = true; } }; }
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'SUSTAIN CHORD I', exact: true }).click();
  await page.keyboard.press('1');
  await page.getByLabel('VOICE').selectOption('Pulse');
  expect(await page.evaluate(() => window.notes.filter(n => !n.stopped).map(n => n.type))).toEqual(['square', 'square', 'square']);
  await page.getByLabel('VOICE').selectOption('Organ');
  expect(await page.evaluate(() => window.notes.filter(n => !n.stopped).every(n => n.wave?.[2] === 0.5))).toBe(true);
  await page.getByLabel('CHORD COLOR').selectOption('add9');
  expect(await page.evaluate(() => window.notes.filter(n => !n.stopped).map(n => n.note))).toEqual([60,64,67,74]);
  await expect(page.locator('.screen strong')).toHaveText('C add9');
  await page.getByLabel('CHORD COLOR').selectOption('sixth');
  await expect(page.locator('.screen strong')).toHaveText('C 6');
  await page.getByLabel('CHORD COLOR').selectOption('seventh');
  await expect(page.locator('.screen strong')).toHaveText('C maj7');
  await page.getByRole('button', { name: 'Turn Everything Off' }).click();
  await page.keyboard.down('2');
  await expect(page.locator('.screen strong')).toHaveText('Dm 7');
  await page.keyboard.up('2');
});

test('tour follows the layout from visualizer to reset', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start guided tour' }).click();
  const tour = page.getByRole('dialog', { name: 'Guided tour' });
  for (const [index, title] of ['Audio visualizer', 'Sound controls', 'Chord joystick', 'Pitch bend', 'Metronome', 'Stopping and resetting', 'Keyboard bindings', 'Play chords', 'Sustain chords'].map(title => title.toUpperCase()).entries()) {
    if (index) await tour.getByRole('button', { name: 'Next' }).click();
    await expect(tour.getByRole('heading')).toHaveText(title);
  }
});

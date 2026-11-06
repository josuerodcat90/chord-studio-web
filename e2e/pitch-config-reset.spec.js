import { test, expect } from './fixture.js';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.notes = [];
    window.AudioContext = class {
      currentTime = 1; sampleRate = 100; destination = {};
      resume() {} close() {}
      createBuffer() { return { getChannelData() { return new Float32Array(300); } }; }
      createConvolver() { return { connect() {} }; }
      createAnalyser() { return { connect() {}, disconnect() {}, fftSize: 2048, frequencyBinCount: 1024, getByteTimeDomainData(d) { d.fill(128); }, getByteFrequency(d) { d.fill(0); } }; }
      createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} }, connect() {} }; }
      createOscillator() { const note = { frequency: {}, stopped: false }; return { frequency: note.frequency, connect() {}, start() { window.notes.push(note); }, stop() { note.stopped = true; } }; }
    };
  });
  await page.goto('/');
});

test('pitch reset restores sounding notes without restarting them', async ({ page }) => {
  await page.keyboard.down('1');
  const frequencies = () => page.evaluate(() => window.notes.filter(n => !n.stopped).map(n => n.frequency.value));
  const original = await frequencies();
  await page.getByLabel('Pitch bend').fill('2');
  expect(await frequencies()).not.toEqual(original);
  await page.getByRole('button', { name: 'Reset pitch bend' }).click();
  await expect(page.getByLabel('Pitch bend')).toHaveValue('0');
  expect(await frequencies()).toEqual(original);
  await page.keyboard.up('1');
});

test('configuration reset stops inputs and restores defaults while preserving unrelated preferences', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('unrelated', 'keep'));
  await page.getByLabel('Theme').selectOption('sky');
  await page.getByRole('button', { name: 'PLAY CHORD I', exact: true }).click({ button: 'right' });
  await page.keyboard.press('q');
  for (const [label, value] of [['KEY','2'], ['VOICE','Bright'], ['CHORD COLOR','seventh'], ['Reverb','hall']]) await page.getByLabel(label).selectOption(value);
  await page.getByLabel('VOLUME').fill('0.2');
  await page.getByLabel('Pitch bend').fill('1');
  await page.getByRole('button', { name: 'SUSTAIN CHORD I', exact: true }).click();
  await page.keyboard.press('q');
  await page.keyboard.down('2');
  await page.getByRole('button', { name: 'Sustain joystick' }).click();
  await page.keyboard.down('ArrowUp');
  await page.getByRole('button', { name: 'Reset Configuration' }).click();
  for (const [label, value] of [['KEY','0'], ['VOICE','Warm'], ['CHORD COLOR','triad'], ['Reverb','off'], ['VOLUME','0.4'], ['Pitch bend','0'], ['Theme','sky']]) await expect(page.getByLabel(label)).toHaveValue(value);
  await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
  await expect(page.getByRole('button', { name: 'SUSTAIN CHORD I', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Sustain joystick' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#joystick-status')).toHaveText('CENTER');
  expect(await page.evaluate(() => window.notes.every(n => n.stopped))).toBe(true);
  await page.keyboard.up('2'); await page.keyboard.up('ArrowUp');
  await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
  await page.reload();
  await expect(page.getByLabel('Theme')).toHaveValue('sky');
  await expect(page.getByRole('dialog', { name: 'Guided tour' })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep');
  await page.keyboard.down('1'); await expect(page.locator('.screen strong')).toHaveText('C'); await page.keyboard.up('1');
  await page.keyboard.down('q'); await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY'); await page.keyboard.up('q');
});

test('stop only preserves pitch and configuration', async ({ page }) => {
  await page.getByLabel('Pitch bend').fill('1');
  await page.getByLabel('KEY').selectOption('2');
  await page.keyboard.down('1');
  await page.getByRole('button', { name: 'Turn Everything Off' }).click();
  await expect(page.getByLabel('Pitch bend')).toHaveValue('1');
  await expect(page.getByLabel('KEY')).toHaveValue('2');
  await page.keyboard.up('1');
  await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
});

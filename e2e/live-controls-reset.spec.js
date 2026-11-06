import { test, expect } from './fixture.js';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.notes = []; window.gains = [];
    window.AudioContext = class {
      currentTime = 1; sampleRate = 100; destination = {};
      resume() {} close() {}
      createBuffer(_c, n) { return { getChannelData() { return new Float32Array(n); } }; }
      createConvolver() { return { connect() {} }; }
      createAnalyser() { const analyser = { disconnected: false, connect() {}, disconnect() { this.disconnected = true; }, fftSize: 2048, frequencyBinCount: 1024, getByteTimeDomainData(d) { d.fill(128); }, getByteFrequencyData(d) { d.fill(0); } }; window.outputs ||= []; window.outputs.push(analyser); return analyser; }
      createGain() { const gain = { value: 0, setValueAtTime(v) { this.value = v; }, linearRampToValueAtTime(v) { this.value = v; }, cancelScheduledValues() {}, setTargetAtTime(v) { this.value = v; } }; window.gains.push(gain); return { gain, connect() {} }; }
      createOscillator() { const entry = { stopped: false }; return { frequency: {}, connect(g) { entry.gain = g.gain; }, start() { entry.note = Math.round(69 + 12 * Math.log2(this.frequency.value / 440)); entry.type = this.type; window.notes.push(entry); }, stop() { entry.stopped = true; } }; }
    };
  });
  await page.goto('/');
});

test('live controls update held and sustained layers', async ({ page }) => {
  await page.getByRole('button', { name: 'SUSTAIN CHORD I', exact: true }).click();
  await page.keyboard.press('1'); await page.keyboard.down('2');
  const notes = () => page.evaluate(() => window.notes.filter(n => !n.stopped).map(n => ({ note: n.note, type: n.type, gain: n.gain.value })));
  expect((await notes()).map(n => n.note).sort((a,b) => a-b)).toEqual([60,62,64,65,67,69]);
  await page.getByLabel('KEY').selectOption('2');
  expect((await notes()).map(n => n.note).sort((a,b) => a-b)).toEqual([62,64,66,67,69,71]);
  await page.getByLabel('VOICE').selectOption('Bright');
  expect((await notes()).every(n => n.type === 'sawtooth')).toBe(true);
  await page.getByLabel('CHORD COLOR').selectOption('seventh');
  expect(await notes()).toHaveLength(8);
  await page.getByLabel('VOLUME').fill('0.2');
  expect((await notes()).every(n => n.gain === 0.024)).toBe(true);
  await page.getByLabel('Reverb').selectOption('hall');
  expect(await page.evaluate(() => window.gains.slice(1, 4).map(g => g.value))).toEqual([0, 0.15, 0]);
  await page.keyboard.up('2');
  expect(await notes()).toHaveLength(4);
});

test('turning off isolates reverb tails and releases captured pad pointer without restarting', async ({ page }) => {
  await page.getByLabel('Reverb').selectOption('hall');
  await page.keyboard.press('1'); // Leave a convolver tail.
  const pad = page.getByRole('button', { name: 'PLAY CHORD ii', exact: true });
  await pad.scrollIntoViewIfNeeded();
  const box = await pad.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  expect(await pad.evaluate(el => el.hasPointerCapture(1))).toBe(true);
  await page.getByRole('button', { name: 'Turn Everything Off' }).focus();
  await page.keyboard.press('Enter');
  expect(await pad.evaluate(el => el.hasPointerCapture(1))).toBe(false);
  expect(await page.evaluate(() => ({ disconnected: window.outputs[0].disconnected, sounding: window.notes.filter(n => !n.stopped).length }))).toEqual({ disconnected: true, sounding: 0 });
  const count = await page.evaluate(() => window.notes.length);
  await page.mouse.move(box.x + box.width / 3, box.y + box.height / 3);
  await page.mouse.up();
  expect(await page.evaluate(() => window.notes.length)).toBe(count);
  await page.getByLabel('Reverb').selectOption('hall');
  await page.keyboard.press('1');
  expect(await page.evaluate(() => window.outputs.map(o => o.disconnected))).toEqual([true, false]);
});

test('turning off releases a captured joystick and ignores its later movement and release', async ({ page }) => {
  await page.keyboard.down('1');
  const joystick = page.getByRole('application', { name: 'Chord joystick' });
  await joystick.scrollIntoViewIfNeeded();
  const box = await joystick.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 10);
  await page.mouse.down();
  expect(await joystick.evaluate(el => el.hasPointerCapture(1))).toBe(true);
  await expect(page.locator('#joystick-status')).toHaveText('UP');
  await page.getByRole('button', { name: 'Turn Everything Off' }).focus();
  await page.keyboard.press('Enter');
  expect(await joystick.evaluate(el => el.hasPointerCapture(1))).toBe(false);
  const count = await page.evaluate(() => window.notes.length);
  await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2);
  await page.mouse.up();
  await page.keyboard.up('1');
  await expect(page.locator('#joystick-status')).toHaveText('CENTER');
  expect(await page.evaluate(() => ({ count: window.notes.length, sounding: window.notes.filter(n => !n.stopped).length }))).toEqual({ count, sounding: 0 });
});


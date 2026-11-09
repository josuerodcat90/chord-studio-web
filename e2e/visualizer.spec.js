import { test, expect } from './fixture.js';

test('switches visualizations, draws idle and combined audio, and pauses when hidden', async ({ page }) => {
  await page.addInitScript(() => {
    window.trace = { edges: [], lines: [], bars: 0, time: 0, frequency: 0 };
    const context = { clearRect() {}, beginPath() {}, moveTo(_x,y) { window.trace.lines.push(['move', y]); }, lineTo(_x,y) { window.trace.lines.push(['line', y]); }, stroke() {}, fillRect() { window.trace.bars++; }, setTransform() {} };
    HTMLCanvasElement.prototype.getContext = () => context;
    window.AudioContext = class {
      currentTime = 0; sampleRate = 100; destination = { name: 'destination' };
      resume() {} close() {}
      createBuffer(_channels, length) { return { getChannelData() { return new Float32Array(length); } }; }
      createConvolver() { return { name: 'convolver', connect(node) { window.trace.edges.push(['convolver', node.name]); } }; }
      createAnalyser() { return { name: 'analyser', fftSize: 2048, get frequencyBinCount() { return this.fftSize / 2; }, connect: node => window.trace.edges.push(['analyser', node.name]), getByteTimeDomainData(data) { window.trace.time++; data.fill(160); }, getByteFrequencyData(data) { window.trace.frequency++; data.fill(100); } }; }
      createGain() { return { name: 'gain', gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} }, connect(node) { window.trace.edges.push(['gain', node.name]); return node; } }; }
      createOscillator() { return { frequency: {}, connect: node => node, start() {}, stop() {} }; }
    };
  });
  await page.goto('/');
  const waveform = page.getByRole('button', { name: 'Waveform' });
  const spectrum = page.getByRole('button', { name: 'Spectrum' });
  await expect(waveform).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => window.trace.lines.length)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.trace.time)).toBe(0);
  await page.keyboard.down('1');
  await page.keyboard.down('2');
  await expect.poll(() => page.evaluate(() => window.trace.time)).toBeGreaterThan(0);
  const edges = await page.evaluate(() => window.trace.edges);
  expect(edges.filter(e => e[0] === 'gain' && e[1] === 'analyser')).toHaveLength(4);
  expect(edges.filter(e => e[0] === 'gain' && e[1] === 'destination')).toHaveLength(0);
  expect(edges.filter(e => e[0] === 'analyser' && e[1] === 'destination')).toHaveLength(1);
  await spectrum.click();
  await expect(spectrum).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => window.trace.frequency)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.trace.bars)).toBeGreaterThan(0);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const stopped = await page.evaluate(() => window.trace.frequency);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.trace.frequency)).toBe(stopped);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(() => page.evaluate(() => window.trace.frequency)).toBeGreaterThan(stopped);
  await page.keyboard.up('1'); await page.keyboard.up('2');
});

test('repressing a latched sustained chord stops it without disabling sustain or disturbing another chord', async ({ page }) => {
  await page.addInitScript(() => {
    window.notes = [];
    window.AudioContext = class {
      currentTime = 0; sampleRate = 100; destination = {};
      resume() {} close() {}
      createBuffer(_channels, length) { return { getChannelData() { return new Float32Array(length); } }; }
      createConvolver() { return { connect() {} }; }
      createAnalyser() { return { connect() {}, fftSize: 2048, frequencyBinCount: 1024, getByteTimeDomainData(data) { data.fill(128); }, getByteFrequencyData(data) { data.fill(0); } }; }
      createGain() { return { gain: { value: 0, setValueAtTime(value) { this.value = value; }, linearRampToValueAtTime(value) { this.value = value; }, cancelScheduledValues() {}, setTargetAtTime(value) { this.value = value; } }, connect() {} }; }
      createOscillator() { const note = { gain: null, stopAt: null }; return { frequency: {}, connect(node) { note.gain = node.gain; return node; }, start() { window.notes.push(note); }, stop(time) { note.stopAt = time; } }; }
    };
  });
  await page.goto('/');
  // Gain targets distinguish held notes from release tails that still run.
  const activeCount = () => page.evaluate(() => window.notes.filter(n => n.gain.value > 0).length);
  const sustain = page.getByRole('button', { name: 'SUSTAIN CHORD I', exact: true });
  await sustain.click();
  await page.keyboard.down('1'); await page.keyboard.up('1');
  await page.keyboard.down('2');
  expect(await activeCount()).toBe(6);
  await page.keyboard.down('1');
  expect(await activeCount()).toBe(3);
  await expect(sustain).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.up('1');
  expect(await activeCount()).toBe(3);
  await page.keyboard.down('1'); await page.keyboard.up('1');
  expect(await activeCount()).toBe(6);
  expect(await page.evaluate(() => window.notes.length)).toBe(6);
  await page.keyboard.up('2');
  expect(await activeCount()).toBe(3);
});

import { test, expect } from './fixture.js';

test('reverb presets are accessible and can change while a chord sounds', async ({ page }) => {
  await page.goto('/');
  const reverb = page.getByRole('combobox', { name: 'REVERB', exact: true });
  await expect(reverb.locator('option')).toHaveText(['OFF', 'ROOM', 'HALL', 'DREAMY']);
  await expect(reverb).toHaveValue('off');
  await page.keyboard.down('1');
  await expect(page.locator('.screen strong')).toHaveText('C');
  for (const value of ['room', 'hall', 'dreamy', 'off']) {
    await reverb.selectOption(value);
    await expect(reverb).toHaveValue(value);
    await expect(page.locator('.screen strong')).toHaveText('C');
  }
  await page.keyboard.up('1');
  await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
});

test('shared convolution paths crossfade without restarting voices and feed the output analyser', async ({ page }) => {
  await page.addInitScript(() => {
    window.graph = { nodes: [], edges: [], starts: 0, stops: 0 };
    let id = 0;
    const node = type => {
      const n = { id: `${type}${id++}`, kind: type, connect(target) { window.graph.edges.push([this.id, target.id]); return target; } };
      window.graph.nodes.push(n);
      return n;
    };
    window.AudioContext = class {
      currentTime = 1; sampleRate = 100; destination = node('destination');
      resume() {} close() {}
      createGain() { const n = node('gain'); n.gain = { value: 1, events: [], setValueAtTime(v) { this.value = v; }, linearRampToValueAtTime(v) { this.value = v; }, cancelScheduledValues() {}, setTargetAtTime(v, t, tc) { this.value = v; this.events.push([v, t, tc]); } }; return n; }
      createConvolver() { return node('convolver'); }
      createBuffer(channels, length, rate) { const data = Array.from({ length: channels }, () => new Float32Array(length)); return { length, sampleRate: rate, getChannelData: i => data[i] }; }
      createAnalyser() { return Object.assign(node('analyser'), { fftSize: 2048, frequencyBinCount: 1024, getByteTimeDomainData(d) { d.fill(128); }, getByteFrequencyData(d) { d.fill(0); } }); }
      createOscillator() { return Object.assign(node('oscillator'), { frequency: {}, start() { window.graph.starts++; }, stop() { window.graph.stops++; } }); }
    };
  });
  await page.goto('/');
  const reverb = page.getByRole('combobox', { name: 'REVERB', exact: true });
  await page.keyboard.down('1');
  const graph = () => page.evaluate(() => ({ nodes: window.graph.nodes.map(n => ({ id: n.id, type: n.kind, gain: n.gain?.value, events: n.gain?.events, length: n.buffer?.length, sample: n.buffer?.getChannelData(0)[1] })), edges: window.graph.edges, starts: window.graph.starts, stops: window.graph.stops }));
  let state = await graph();
  const nodes = type => state.nodes.filter(n => n.type === type);
  const destinations = id => state.edges.filter(([from]) => from === id).map(([, to]) => to);
  const analyser = nodes('analyser')[0], destination = nodes('destination')[0];
  const convolvers = nodes('convolver');
  expect(convolvers).toHaveLength(3);
  expect(new Set(convolvers.map(n => n.length)).size).toBe(3);
  expect(convolvers.every(n => n.sample !== 0)).toBe(true);
  const voiceGains = nodes('oscillator').map(n => destinations(n.id)[0]);
  expect(new Set(voiceGains).size).toBe(3);
  const bus = destinations(voiceGains[0])[0];
  expect(voiceGains.every(id => destinations(id).includes(bus))).toBe(true);
  expect(destinations(bus)).toContain(analyser.id);
  expect(destinations(analyser.id)).toEqual([destination.id]);
  const wetGains = convolvers.map(n => destinations(n.id)[0]);
  expect(convolvers.every(n => destinations(bus).includes(n.id))).toBe(true);
  expect(wetGains.every(id => destinations(id).includes(analyser.id))).toBe(true);
  expect(wetGains.map(id => state.nodes.find(n => n.id === id).gain)).toEqual([0, 0, 0]);
  for (const [index, value] of ['room', 'hall', 'dreamy', 'off'].entries()) {
    await reverb.selectOption(value);
    state = await graph();
    expect(state.starts).toBe(3);
    expect(state.stops).toBe(0);
    const gains = wetGains.map(id => state.nodes.find(n => n.id === id));
    expect(gains.map(n => n.gain)).toEqual(wetGains.map((_, i) => i === index ? 0.15 : 0));
    expect(gains.every(n => n.events.at(-1)[2] > 0)).toBe(true);
  }
  await reverb.selectOption('hall');
  await reverb.blur();
  await page.keyboard.down('2');
  state = await graph();
  expect(state.starts).toBe(6);
  expect(nodes('oscillator').slice(3).every(n => destinations(destinations(n.id)[0]).includes(bus))).toBe(true);
  await page.keyboard.up('1'); await page.keyboard.up('2');
});

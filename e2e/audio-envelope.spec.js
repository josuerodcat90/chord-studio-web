import { test, expect } from '@playwright/test';

// Constant sources make each rendered sample the sum of the actual Web Audio
// gain envelopes, independent of oscillator phase or waveform cancellation.
async function renderEnvelope(page, actions) {
  return page.evaluate(async actions => {
    const { createAudioTransitions } = await import('/src/music/audio-transition.js');
    const sampleRate = 48000;
    const audio = new OfflineAudioContext(1, sampleRate, sampleRate);
    // Schedule the public API at controlled future times before offline rendering.
    const clock = { currentTime: 0 };
    const engine = createAudioTransitions(clock, (note, voice) => {
      const osc = audio.createConstantSource();
      const gain = audio.createGain();
      osc.connect(gain).connect(audio.destination);
      return { note, voice, osc, gain };
    });
    for (const action of actions) {
      clock.currentTime = action.time;
      if (action.volumeOnly) engine.setVolume(action.volume);
      else engine.transition(0, [60], action.voice, action.volume);
    }
    const rendered = await audio.startRendering();
    return Array.from(rendered.getChannelData(0));
  }, actions);
}

function at(samples, time) {
  return samples[Math.round(time * 48000)];
}

function range(samples, start, end) {
  return samples.slice(Math.round(start * 48000), Math.round(end * 48000));
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('rapid Warm → Soft → Warm stays bounded and restores the full target', async ({ page }) => {
  const samples = await renderEnvelope(page, [
    { time: 0, voice: 'Warm', volume: 0.4 },
    { time: 0.2, voice: 'Soft', volume: 0.4 },
    { time: 0.225, voice: 'Warm', volume: 0.4 },
  ]);
  const target = 0.048;
  // Check every sample, allowing only float rounding, not a perceptible boost.
  for (const sample of range(samples, 0.2, 0.525)) {
    expect(sample).toBeLessThanOrEqual(target + 0.00001);
    expect(sample).toBeGreaterThanOrEqual(target - 0.0001);
  }
  // Long after tails stop, the restored voice must not remain half-volume.
  expect(at(samples, 0.9)).toBeCloseTo(target, 4);
});

test('switching voice during attack keeps the rendered envelope continuous', async ({ page }) => {
  const samples = await renderEnvelope(page, [
    { time: 0, voice: 'Warm', volume: 0.4 },
    { time: 0.01, voice: 'Soft', volume: 0.4 },
  ]);
  // A 25ms linear attack has reached 40% at 10ms. Adjacent samples
  // must differ by less than 0.0001, comfortably above a one-sample slope.
  expect(at(samples, 0.01)).toBeCloseTo(0.048 * 0.4, 4);
  expect(Math.abs(at(samples, 0.01) - samples[479])).toBeLessThan(0.0001);
  expect(at(samples, 0.9)).toBeCloseTo(0.048, 4);
});

for (const volume of [0.2, 0.8]) {
  test(`volume ${volume} during overlap follows a continuous bounded envelope`, async ({ page }) => {
    const samples = await renderEnvelope(page, [
      { time: 0, voice: 'Warm', volume: 0.4 },
      { time: 0.2, voice: 'Soft', volume: 0.4 },
      { time: 0.21, volumeOnly: true, volume },
    ]);
    const initial = 0.048;
    const target = volume * 0.12;
    // Matching 45ms time constants should make the sum follow this curve;
    // 0.0001 permits floating point and sample-boundary rounding.
    for (let i = 0; i <= 200; i++) {
      const time = 0.21 + i / 1000;
      const expected = target + (initial - target) * Math.exp(-(time - 0.21) / 0.045);
      expect(Math.abs(at(samples, time) - expected)).toBeLessThan(0.0001);
    }
    expect(at(samples, 0.9)).toBeCloseTo(target, 4);
  });
}

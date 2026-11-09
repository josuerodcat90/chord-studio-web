import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudioTransitions } from './audio-transition.js';

function fixture({ hold = true } = {}) {
  const context = { currentTime: 0 };
  const created = [];
  const engine = createAudioTransitions(context, (note, voice) => {
    const events = [];
    const gain = { gain: {
      value: 0.03,
      ...(hold ? { cancelAndHoldAtTime: time => events.push(['hold', time]) } : {}),
      cancelScheduledValues: time => events.push(['cancel', time]),
      setTargetAtTime: (...args) => events.push(['target', ...args]),
      setValueAtTime: (...args) => events.push(['set', ...args]),
      linearRampToValueAtTime: (...args) => events.push(['ramp', ...args]),
    } };
    const osc = { start: time => events.push(['start', time]), stop: time => events.push(['stop', time]), onended: null };
    const result = { note, voice, osc, gain, frequency: note, events };
    created.push(result);
    return result;
  });
  return { context, created, engine };
}

// Deterministic model of the automation methods used here; it sums gains, not waveforms.
function envelopeFixture() {
  const context = { currentTime: 0 };
  const notes = [];
  const engine = createAudioTransitions(context, (note, voice) => {
    let events = [];
    let stop = Infinity;
    let start = Infinity;
    function valueAt(time) {
      let value = 0, lastTime = 0, target = null;
      for (const event of events) {
        if (event.time > time) {
          if (event.type === 'ramp' && !target) {
            return value + (event.value - value) * (time - lastTime) / (event.time - lastTime);
          }
          break;
        }
        if (target) value = target.value + (value - target.value) * Math.exp(-(event.time - lastTime) / target.tau);
        lastTime = event.time;
        if (event.type === 'target') target = event;
        else { value = event.value; target = null; }
      }
      return target ? target.value + (value - target.value) * Math.exp(-(time - lastTime) / target.tau) : value;
    }
    const gain = { gain: {
      get value() { return valueAt(context.currentTime); },
      cancelScheduledValues(time) { events = events.filter(event => event.time < time); },
      cancelAndHoldAtTime(time) {
        const value = valueAt(time);
        events = events.filter(event => event.time < time);
        events.push({ type: 'set', time, value });
      },
      setValueAtTime(value, time) { events.push({ type: 'set', value, time }); },
      linearRampToValueAtTime(value, time) { events.push({ type: 'ramp', value, time }); },
      setTargetAtTime(value, time, tau) { events.push({ type: 'target', value, time, tau }); },
    } };
    const osc = { start(time) { start = time; }, stop(time) { stop = time; }, onended: null };
    const result = { note, voice, gain, osc, valueAt: time => time >= start && time < stop ? valueAt(time) : 0 };
    notes.push(result);
    return result;
  });
  return { context, engine, notes };
}

test('modeled aggregate gain stays bounded through rapid voice reversal and recovers', () => {
  const { context, engine, notes } = envelopeFixture();
  const target = 0.048;
  engine.transition(0, [60], 'Warm', 0.4);
  context.currentTime = 1; engine.transition(0, [60], 'Soft', 0.4);
  const sum = time => notes.reduce((total, note) => total + note.valueAt(time), 0);
  for (let ms = 0; ms <= 25; ms++) {
    const time = 1 + ms / 1000;
    assert.ok(sum(time) <= target + 1e-10, `gain ${sum(time) / target} at ${time}`);
  }
  context.currentTime = 1.025; engine.transition(0, [60], 'Warm', 0.4);
  for (let ms = 0; ms <= 300; ms++) {
    const time = 1.025 + ms / 1000;
    assert.ok(sum(time) <= target + 1e-10, `gain ${sum(time) / target} at ${time}`);
  }
  assert.ok(Math.abs(sum(2) - target) < target * 0.001);
  assert.equal(notes.length, 2);
});

test('modeled gains stay bounded with multiple release tails and repeated transitions', () => {
  const { context, engine, notes } = envelopeFixture();
  const target = 0.048;
  engine.transition(0, [60], 'Warm', 0.4);
  for (const [time, voice] of [[1, 'Soft'], [1.01, 'Bright'], [1.02, 'Warm'], [1.03, 'Soft']]) {
    context.currentTime = time;
    engine.transition(0, [60], voice, 0.4);
    for (let ms = 0; ms <= 10; ms++) {
      const sample = time + ms / 1000;
      const sum = notes.reduce((total, note) => total + note.valueAt(sample), 0);
      assert.ok(sum <= target + 1e-10, `gain ${sum / target} at ${sample}`);
    }
  }
  assert.equal(notes.length, 3);
  const final = notes.reduce((total, note) => total + note.valueAt(2), 0);
  assert.ok(Math.abs(final - target) < target * 0.001);
});

test('volume changes during overlap keep the modeled sum on a bounded envelope', () => {
  for (const nextVolume of [0.2, 0.8]) {
    const { context, engine, notes } = envelopeFixture();
    engine.transition(0, [60], 'Warm', 0.4);
    context.currentTime = 1; engine.transition(0, [60], 'Soft', 0.4);
    context.currentTime = 1.01;
    const sum = time => notes.reduce((total, note) => total + note.valueAt(time), 0);
    const before = sum(context.currentTime);
    engine.setVolume(nextVolume);
    const target = nextVolume * 0.12;
    for (let ms = 0; ms <= 200; ms++) {
      const time = 1.01 + ms / 1000;
      const expected = target + (before - target) * Math.exp(-(time - 1.01) / 0.045);
      assert.ok(Math.abs(sum(time) - expected) < 1e-9, `volume ${nextVolume}, gain ${sum(time)} at ${time}, expected ${expected}`);
    }
    context.currentTime = 1.22; engine.transition(0, [60], 'Warm', nextVolume);
    for (let ms = 0; ms <= 300; ms++) {
      const time = 1.22 + ms / 1000;
      assert.ok(sum(time) <= Math.max(before, target) + 1e-9);
    }
    assert.ok(Math.abs(sum(2) - target) < target * 0.001);
  }
});

test('ordinary volume updates retain the 25ms target and hold the current gain', () => {
  const { engine, context } = fixture();
  const note = engine.transition(0, [60], 'Warm', 0.4)[0];
  context.currentTime = 1; engine.setVolume(0.7);
  assert.deepEqual(note.events.slice(-2), [['hold', 1], ['target', 0.7 * 0.12, 1, 0.025]]);
});

test('volume update uses the exposed-value fallback and leaves release tails alone', () => {
  const { engine, context } = fixture({ hold: false });
  const warm = engine.transition(0, [60], 'Warm', 0.4)[0];
  context.currentTime = 1; const soft = engine.transition(0, [60], 'Soft', 0.4)[0];
  const tailEvents = warm.events.length;
  context.currentTime = 1.01; engine.setVolume(0.2);
  assert.deepEqual(soft.events.slice(-3), [['cancel', 1.01], ['set', 0.03, 1.01], ['target', 0.024, 1.01, 0.045]]);
  assert.equal(warm.events.length, tailEvents);
});

test('direction retains common notes and releases only departing notes', () => {
  const { engine, created, context } = fixture();
  const first = engine.transition(0, [60, 64, 67], 'Warm', 0.4);
  context.currentTime = 1;
  const next = engine.transition(0, [60, 65, 67], 'Warm', 0.4);
  assert.equal(created.length, 4);
  assert.equal(next[0], first[0]); assert.equal(next[2], first[2]);
  assert.deepEqual(first[1].events.slice(-3), [['hold', 1], ['target', 0, 1, 0.045], ['stop', 1.3]]);
  assert.deepEqual(next[1].events, [['set', 0, 1], ['ramp', 0.048, 1.025], ['start', 1]]);
});

test('rapid reentry reuses a release tail without accumulating oscillators', () => {
  const { engine, created, context } = fixture();
  const first = engine.transition(0, [60], 'Warm', 0.4)[0];
  context.currentTime = 1; engine.transition(0, [61], 'Warm', 0.4);
  context.currentTime = 1.01; assert.equal(engine.transition(0, [60], 'Warm', 0.4)[0], first);
  context.currentTime = 1.02; engine.transition(0, [61], 'Warm', 0.4);
  assert.equal(created.length, 2);
  assert.ok(first.events.some(event => event[0] === 'stop' && event[1] > 1.3));
});

test('release and re-press reuse tails, while distinct degrees and voices remain independent', () => {
  const { engine, created, context } = fixture();
  const first = engine.transition(0, [60], 'Warm', 0.4)[0];
  const other = engine.transition(1, [60], 'Warm', 0.4)[0];
  assert.notEqual(first, other);
  context.currentTime = 1; engine.release(0);
  context.currentTime = 1.01; assert.equal(engine.transition(0, [60], 'Warm', 0.4)[0], first);
  const changed = engine.transition(0, [60], 'Soft', 0.4)[0];
  assert.notEqual(changed, first); assert.equal(created.length, 3);
  engine.release(1);
  assert.ok(other.events.some(event => event[0] === 'target' && event[1] === 0));
});

test('fallback releases and revives notes without cancelAndHoldAtTime', () => {
  const { engine, context } = fixture({ hold: false });
  const first = engine.transition(0, [60], 'Warm', 0.4)[0];
  context.currentTime = 1;
  engine.release(0);
  assert.deepEqual(first.events.slice(-4), [['cancel', 1], ['set', 0.03, 1], ['target', 0, 1, 0.045], ['stop', 1.3]]);
  context.currentTime = 1.01;
  assert.equal(engine.transition(0, [60], 'Warm', 0.4)[0], first);
  assert.deepEqual(first.events.slice(-4), [['stop', 86401.01], ['cancel', 1.01], ['set', 0.03, 1.01], ['target', 0.048, 1.01, 0.025]]);
  context.currentTime = 1.02;
  assert.doesNotThrow(() => engine.release(0));
  assert.deepEqual(first.events.slice(-4), [['cancel', 1.02], ['set', 0.03, 1.02], ['target', 0, 1.02, 0.045], ['stop', 1.32]]);
});

test('new oscillators start only after their gain envelope is scheduled', () => {
  const { engine, context } = fixture();
  context.currentTime = 2;
  const note = engine.transition(0, [60], 'Warm', 0.4)[0];
  assert.deepEqual(note.events, [['set', 0, 2], ['ramp', 0.048, 2.025], ['start', 2]]);
});

test('ended tails are forgotten and can be recreated', () => {
  const { engine, created, context } = fixture();
  const first = engine.transition(0, [60], 'Warm', 0.4)[0];
  engine.release(0); first.osc.onended();
  context.currentTime = 1;
  assert.notEqual(engine.transition(0, [60], 'Warm', 0.4)[0], first);
  assert.equal(created.length, 2);
});

test('revived tail accounts for other sounding voices and restores its target', () => {
  const { engine, context } = fixture();
  const warm = engine.transition(0, [60], 'Warm', 0.4)[0];
  context.currentTime = 1; engine.transition(0, [60], 'Soft', 0.4);
  context.currentTime = 1.01; assert.equal(engine.transition(0, [60], 'Warm', 0.4)[0], warm);
  assert.deepEqual(warm.events.slice(-3), [
    ['stop', 86401.01], ['hold', 1.01], ['target', 0.048, 1.01, 0.045],
  ]);
});

test('new voice counts existing release tails and returns to full gain after overlap', () => {
  const { engine, context } = fixture();
  engine.transition(0, [60], 'Warm', 0.4);
  context.currentTime = 1; engine.transition(0, [60], 'Soft', 0.4);
  context.currentTime = 1.01; const bright = engine.transition(0, [60], 'Bright', 0.4)[0];
  assert.deepEqual(bright.events, [
    ['set', 0, 1.01], ['target', 0.048, 1.01, 0.045], ['start', 1.01],
  ]);
});

test('voice change holds an in-progress attack before releasing it', () => {
  const { engine, context } = fixture();
  const warm = engine.transition(0, [60], 'Warm', 0.4)[0];
  context.currentTime = 0.01; engine.transition(0, [60], 'Soft', 0.4);
  assert.deepEqual(warm.events.slice(3), [['hold', 0.01], ['target', 0, 0.01, 0.045], ['stop', 0.31]]);
});

test('fallback holds the exposed gain before interrupting an attack', () => {
  const { engine, context } = fixture({ hold: false });
  const warm = engine.transition(0, [60], 'Warm', 0.4)[0];
  context.currentTime = 0.01; engine.transition(0, [60], 'Soft', 0.4);
  assert.deepEqual(warm.events.slice(3), [
    ['cancel', 0.01], ['set', 0.03, 0.01], ['target', 0, 0.01, 0.045], ['stop', 0.31],
  ]);
});

test('later volume automation can replace the overlap target', () => {
  const { engine, context } = fixture();
  engine.transition(0, [60], 'Warm', 0.4);
  context.currentTime = 1; const soft = engine.transition(0, [60], 'Soft', 0.4)[0];
  context.currentTime = 1.1;
  soft.gain.gain.cancelScheduledValues(context.currentTime);
  soft.gain.gain.setTargetAtTime(0.024, context.currentTime, 0.025);
  assert.deepEqual(soft.events.slice(-2), [['cancel', 1.1], ['target', 0.024, 1.1, 0.025]]);
});

// Voice-change crossfade tests
test('voice change holds old automation and matches release time constant', () => {
  const { engine, created, context } = fixture();
  engine.transition(0, [60], 'Warm', 0.4);
  context.currentTime = 1;
  // Voice change: Warm → Soft
  engine.transition(0, [60], 'Soft', 0.4);
  const oldNote = created[0];
  // Hold the current gain before the release envelope begins.
  assert.ok(oldNote.events.some(e => e[0] === 'hold' && e[1] === 1));
  const newNote = created[1];
  assert.deepEqual(newNote.events.filter(e => e[0] === 'target'), [
    ['target', 0.048, 1, 0.045]
  ]);
});

test('multi-pitch overlap matches the release time constant per pitch', () => {
  const { engine, created, context } = fixture();
  // Start with triad: C4(60), E4(64), G4(67)
  engine.transition(0, [60, 64, 67], 'Warm', 0.4);
  context.currentTime = 1;
  // Voice change to Soft — all three pitches release
  engine.transition(0, [60, 64, 67], 'Soft', 0.4);
  const newNotes = created.slice(3, 6); // notes at indices 3, 4, 5
  for (const note of newNotes) {
    assert.deepEqual(note.events.filter(e => e[0] === 'target'), [
      ['target', 0.048, 1, 0.045]
    ]);
  }
});

test('direction-only change does not trigger crossfade (regression)', () => {
  const { engine, created, context } = fixture();
  engine.transition(0, [60, 64, 67], 'Warm', 0.4);
  context.currentTime = 1;
  // Direction change only: voice stays Warm
  engine.transition(0, [60, 65, 67], 'Warm', 0.4);
  const oldNote = created[1];
  // No cancelScheduledValues before release (crossfade was NOT triggered)
  assert.ok(!oldNote.events.some(e => e[0] === 'cancel' && e[1] === 1));
});

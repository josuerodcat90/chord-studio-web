/** Manage oscillators per pad, including notes still in their release envelope. */
export function createAudioTransitions(context, createNote) {
  const active = new Map();
  const tails = new Map();

  function holdGain(param, now) {
    if (typeof param.cancelAndHoldAtTime === 'function') {
      param.cancelAndHoldAtTime(now);
    } else {
      // The exposed value is an approximation of the instantaneous automation value.
      const value = param.value;
      param.cancelScheduledValues(now);
      param.setValueAtTime(value, now);
    }
  }

  function releaseNote(degree, note, now) {
    holdGain(note.gain.gain, now);
    note.gain.gain.setTargetAtTime(0, now, 0.045);
    note.osc.stop(now + 0.3);
    note.releaseEnd = now + 0.3;
    if (!tails.has(degree)) tails.set(degree, new Set());
    const pending = tails.get(degree);
    pending.add(note);
    note.osc.onended = () => {
      pending.delete(note);
      if (!pending.size && tails.get(degree) === pending) tails.delete(degree);
    };
  }

  /** Crossfade all active notes when voice changes, preventing volume spike. */
  function crossfadeVoiceChange(degree, now) {
    const previous = active.get(degree) || [];
    // Count releasing oscillators per pitch (for proportional scaling of new targets)
    const releaseCountByPitch = new Map();
    for (const note of previous) {
      releaseCountByPitch.set(note.note, (releaseCountByPitch.get(note.note) || 0) + 1);
    }
    // Cancel existing automation and schedule linear ramp-down over ~50ms
    for (const note of previous) {
      const { gain } = note.gain;
      if (typeof gain.cancelScheduledValues === 'function') {
        gain.cancelScheduledValues(now);
      } else {
        holdGain(gain, now);
      }
      // setTargetAtTime(0, now, 0.043) ≈ linear ramp to 0 in ~50ms
      gain.setTargetAtTime(0, now, 0.043);
    }
    return releaseCountByPitch;
  }

  return {
    transition(degree, pitches, voice, volume) {
      const now = context.currentTime;
      const previous = [...(active.get(degree) || [])];
      // Detect voice change: all active notes have different voice from target
      const isVoiceChange = previous.length > 0 &&
        previous.every(note => note.voice !== voice);
      let releaseCountByPitch = new Map();
      if (isVoiceChange) {
        releaseCountByPitch = crossfadeVoiceChange(degree, now);
      }
      const pending = tails.get(degree);
      const next = pitches.map(pitch => {
        const index = previous.findIndex(note => note.note === pitch && note.voice === voice);
        if (index !== -1) return previous.splice(index, 1)[0];
        let note = pending && [...pending].find(candidate => candidate.note === pitch && candidate.voice === voice && candidate.releaseEnd > now);
        if (note) {
          pending.delete(note);
          if (!pending.size) tails.delete(degree);
          // A later stop() replaces the pending stop; the next release schedules a new one.
          note.osc.stop(now + 86400);
          holdGain(note.gain.gain, now);
          note.gain.gain.setTargetAtTime(volume * 0.12, now, 0.025);
        } else {
          note = createNote(pitch, voice);
          note.gain.gain.setValueAtTime(0, now);
          // Scale target proportionally to release count at this pitch (bounds combined gain during overlap)
          const overlapScale = releaseCountByPitch.get(pitch) !== undefined
            ? 1 + releaseCountByPitch.get(pitch)
            : 1;
          note.gain.gain.linearRampToValueAtTime(volume * 0.12 / overlapScale, now + 0.025);
          note.osc.start(now);
        }
        return note;
      });
      previous.forEach(note => { releaseNote(degree, note, now); });
      active.set(degree, next);
      return next;
    },
    release(degree) {
      const now = context.currentTime;
      for (const note of active.get(degree) || []) releaseNote(degree, note, now);
      active.delete(degree);
    },
  };
}

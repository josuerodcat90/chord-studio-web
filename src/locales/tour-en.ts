export default {
  label: 'Guided tour',
  progress: 'Step {{current}} of {{total}}',
  close: 'Close', back: 'Back', finish: 'Finish', next: 'Next',
  steps: {
    visualizer: { title: 'Audio visualizer', text: 'The display shows the current chord and the combined audio output. Switch between Waveform and Spectrum without changing the sound.' },
    controls: { title: 'Sound controls', text: 'Choose the major key, voice, volume, reverb and chord color. Changes also affect sounding chords.' },
    joystick: { title: 'Chord joystick', text: 'Drag the joystick or hold unassigned arrow keys to change sounding chords: up changes the third, right adds a seventh, left adds a suspension, and down adds a sixth. Diagonals combine colors. Joystick Sustain keeps a dragged direction after release.' },
    pitchBend: { title: 'Pitch bend', text: 'Move the slider up or down by up to 2 semitones. It changes sounding chords live. The center is normal pitch; Reset pitch bend returns to center immediately.' },
    metronome: { title: 'Metronome', text: 'Start or stop the metronome and set its tempo in BPM and beats per measure. The lights follow each beat, and the first beat has a higher pitch.' },
    reset: { title: 'Stopping and resetting', text: 'Turn Everything Off stops the metronome, silences chords and reverb tails, releases inputs, disables sustains and centers the joystick while preserving settings and bindings. Reset Configuration also restores instrument defaults, metronome tempo and beats per measure, and keyboard bindings; your theme and tour dismissal stay unchanged.' },
    bindings: { title: 'Keyboard bindings', text: 'Right-click a chord pad and press a key to bind it. Reusing a key unbinds its previous chord; Escape cancels. Bindings are saved in this browser.' },
    play: { title: 'Play chords', text: 'Hold a chord pad or its displayed keyboard binding to play. Hold multiple chords to layer them; drag across pads to move between chords.' },
    sustain: { title: 'Sustain chords', text: 'Enable Sustain before playing to keep a chord sounding after release. Press the latched chord again to silence it, or turn Sustain off.' },
  },
};

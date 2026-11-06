# Chord Studio

**A little space to make something.**

Chord Studio is a browser-based, HiChord-inspired chord instrument. Hold a pad, find a sound you like, and explore chords without leaving your browser.

![Chord Studio desktop interface with chord pads, sound controls, a joystick, and a visualizer](docs/images/chord-studio-desktop.png)

## Make some noise

Pick a major key and play any of seven chord pads. Layer chords, hold them with sustain, and shape their sound as you play.

- **Play your way:** use the pads or keys **1–7**, and customize your keyboard bindings.
- **Find your sound:** choose a voice, chord color, and reverb; adjust the volume and pitch bend.
- **Explore movement:** use the chord joystick to change intervals and add color to sounding chords.
- **Keep time:** start the metronome, adjust its tempo from 40 to 240 BPM, and choose the number of beats per measure. Each click and light represents one beat; BPM counts clicks. Turn Everything Off stops it; Reset Configuration restores 120 BPM and four beats per measure.
- **Make it yours:** choose a theme, switch between waveform and spectrum visualizers, or take the guided tour.
- **Choose your language:** the interface detects Spanish from your browser and otherwise defaults to English. Use the Language/Idioma selector to change it; your choice is saved in this browser when storage is available, or kept for the current session otherwise.

<details>
<summary>See the mobile layout</summary>

![Chord Studio interface arranged for a narrow mobile screen](docs/images/chord-studio-mobile.png)

</details>

## Run locally

You'll need [Bun](https://bun.sh/) and Node.js (for the test runner).

```sh
bun install
bun run dev
```

Open the local URL printed by Vite. Close or finish the first-visit tour, then hold a pad or press **1–7**. Browser audio starts after a user gesture; check your device volume if you can't hear it.

## Under the hood

Built with **React**, **Vite**, and the **Web Audio API**. To run the unit tests, lint the source and end-to-end tests with Biome, or create a production build:

```sh
bun run test
bun run lint
bun run build
```

The lint command may report warnings as well as errors; warnings do not cause it to fail.

- [Playing guide](docs/playing.md) — controls, sustain, bindings, joystick, and more.
- [Architecture and development](docs/architecture.md) — audio, state, storage, lifecycle, and testing.
- [Milestone memo](docs/milestone.md) — current scope and boundaries.

> Chord Studio is a small software instrument, not a complete HiChord hardware emulation. It does not include looping or drums. Browser audio and local storage availability depend on the browser and its settings.

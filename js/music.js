// Background music: an original lo-fi skate loop, made in code from scratch every time it plays.
// Swung hi-hats, a dusty kick and snare, a walking bass, soft jazzy chords (Am7, Fmaj7, Cmaj7, G7),
// and every other 8 bars a little melody. It runs on the Sound module's audio, with its own volume.

const Music = (() => {
  const BPM = 86, SIXTEENTH = 60 / BPM / 4, SWING = 0.2;
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const CHORDS = [
    { root: 45, notes: [57, 60, 64, 67] }, // Am7
    { root: 41, notes: [57, 60, 64, 65] }, // Fmaj7
    { root: 48, notes: [55, 59, 64, 67] }, // Cmaj7
    { root: 43, notes: [55, 59, 62, 65] }, // G7
  ];
  const KICK  = [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0];
  const SNARE = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0];
  const BASS  = { 0: 0, 7: 0, 10: 12, 14: 7 }; // step: semitones above the chord root
  const SCALE = [69, 72, 74, 76, 79, 81, 84];   // A minor pentatonic, up high

  let step = 0, bar = 0, next = 0;

  // a melody that's the same every time through (seeded by the bar)
  const noteFor = (b, s) => {
    let x = Math.sin(b * 12.9898 + s * 78.233) * 43758.5453;
    x -= Math.floor(x);
    return x;
  };

  function playStep(s, b, t) {
    const out = Sound.musicOut, chord = CHORDS[b % 4];
    if (KICK[s]) Sound.tone({ freq: 120, to: 42, dur: 0.18, gain: 0.55, at: t, out });
    if (SNARE[s] || (s === 15 && b % 4 === 3)) {
      Sound.burst({ type: 'bandpass', freq: 1700, Q: 0.7, dur: 0.16, gain: 0.22, at: t, out });
      Sound.tone({ freq: 200, to: 150, dur: 0.08, gain: 0.1, type: 'triangle', at: t, out });
    }
    if (s % 2 === 0 || noteFor(b, s + 40) < 0.2) {
      Sound.burst({ type: 'highpass', freq: 7200, dur: s % 4 === 2 ? 0.06 : 0.025, gain: 0.05 + noteFor(b, s) * 0.03, at: t, out });
    }
    if (BASS[s] !== undefined) Sound.tone({ freq: midi(chord.root + BASS[s]), dur: 0.38, gain: 0.24, type: 'triangle', at: t, out, attack: 0.012 });
    if (s === 0 || (s === 10 && b % 2)) {
      chord.notes.forEach((n, i) => Sound.tone({ freq: midi(n), to: midi(n) * 0.997, dur: 1.7, gain: 0.03, type: 'sine', at: t + i * 0.014, out, attack: 0.04 }));
    }
    // every other 8 bars, a few pentatonic notes on top
    if (Math.floor(b / 8) % 2 === 1 && [0, 3, 6, 8, 11, 14].includes(s) && noteFor(b, s) < 0.65) {
      Sound.tone({ freq: midi(SCALE[Math.floor(noteFor(b, s + 7) * SCALE.length)]), dur: 0.32, gain: 0.045, type: 'triangle', at: t, out, attack: 0.012 });
    }
  }

  function tick() {
    const ac = Sound.ctx;
    if (!ac || ac.state !== 'running' || Sound.muted || Sound.settings.music <= 0) { next = 0; return; }
    if (next < ac.currentTime) next = ac.currentTime + 0.05; // first time, or the tab was asleep
    while (next < ac.currentTime + 0.15) {
      playStep(step, bar, next + (step % 2 ? SWING * SIXTEENTH : 0));
      next += SIXTEENTH;
      if (++step === 16) { step = 0; bar++; }
    }
  }
  setInterval(tick, 40);

  return { get bar() { return bar; } };
})();

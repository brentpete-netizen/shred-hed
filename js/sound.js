// Skate sounds, all made in code with the Web Audio API (no sound files):
// wheels rolling, the ollie pop, the flick, landings, grind scrapes, bails and combo dings.
// Browsers only allow audio after you press a key or click, so it starts on your first input.

const Sound = (() => {
  // volumes are 0..10; mute silences everything
  const KEY = 'shredHed.audio';
  const settings = { muted: false, sfx: 8, music: 5 };
  try {
    Object.assign(settings, JSON.parse(localStorage.getItem(KEY)) || {});
    if (localStorage.getItem('shredHed.muted') === '1') settings.muted = true; // older saves
  } catch (e) { /* storage blocked */ }
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify(settings)); localStorage.removeItem('shredHed.muted'); } catch (e) { /* storage blocked */ } };

  let ac = null, master = null, sfx = null, musicBus = null, noise = null, loops = null;
  const levels = () => {
    if (!ac) return;
    master.gain.setTargetAtTime(settings.muted ? 0 : 0.8, ac.currentTime, 0.02);
    sfx.gain.setTargetAtTime(settings.sfx / 10, ac.currentTime, 0.02);
    musicBus.gain.setTargetAtTime((settings.music / 10) * 0.55, ac.currentTime, 0.05);
  };

  function init() {
    if (ac) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ac = new Ctx();
    master = ac.createGain();
    sfx = ac.createGain();
    musicBus = ac.createGain();
    sfx.connect(master);
    musicBus.connect(master);
    levels();
    const comp = ac.createDynamicsCompressor();
    master.connect(comp).connect(ac.destination);
    noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    loops = {
      roll: loop('lowpass', 500, 0.8),     // wheels on concrete
      grind: loop('bandpass', 2600, 5),    // metal scrape
      brake: loop('bandpass', 900, 1.4),   // shoe / tail drag
    };
  }
  const unlock = () => { init(); if (ac && ac.state === 'suspended') ac.resume(); };
  addEventListener('keydown', unlock);
  addEventListener('pointerdown', unlock);

  function loop(type, freq, Q) {
    const src = ac.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const filter = ac.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = Q;
    const gain = ac.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(gain).connect(sfx);
    src.start();
    return { filter, gain };
  }

  // A short burst of filtered noise: pops, clacks, scuffs.
  // `at` schedules it for an exact time (the music uses this); otherwise it plays now.
  function burst({ type = 'bandpass', freq = 1000, Q = 1, dur = 0.06, gain = 0.3, delay = 0, out = sfx, at = null }) {
    const t = (at ?? ac.currentTime) + delay;
    const src = ac.createBufferSource();
    src.buffer = noise;
    const filter = ac.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = Q;
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(out);
    src.start(t, Math.random() * 1.5, dur + 0.02);
  }

  // A pitched blip: thumps (sliding down), metal rings, menu and combo notes.
  function tone({ freq, to = freq, dur = 0.1, gain = 0.3, type = 'sine', delay = 0, out = sfx, at = null, attack = 0.005 }) {
    const t = (at ?? ac.currentTime) + delay;
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  const SFX = {
    pop() { // tail snapping on the concrete
      burst({ type: 'highpass', freq: 2500, dur: 0.02, gain: 0.35 });
      burst({ type: 'lowpass', freq: 1600, dur: 0.06, gain: 0.45 });
      tone({ freq: 150, to: 60, dur: 0.09, gain: 0.45 });
    },
    flick() { burst({ type: 'bandpass', freq: 3200, Q: 2, dur: 0.07, gain: 0.12 }); },
    land(p = 0.5) { // wheels hit, then the deck settles
      burst({ type: 'highpass', freq: 1800, dur: 0.025, gain: 0.25 + 0.2 * p });
      burst({ type: 'highpass', freq: 1500, dur: 0.025, gain: 0.2 + 0.2 * p, delay: 0.022 });
      burst({ type: 'lowpass', freq: 800, dur: 0.08, gain: 0.25 + 0.35 * p });
      tone({ freq: 95, to: 45, dur: 0.12, gain: 0.25 + 0.4 * p });
    },
    grind() { // trucks lock onto metal
      for (const [f, g] of [[820, 0.12], [1310, 0.08], [2050, 0.05]]) tone({ freq: f, to: f * 0.97, dur: 0.3, gain: g, type: 'triangle' });
      burst({ type: 'highpass', freq: 2200, dur: 0.08, gain: 0.25 });
    },
    push() { burst({ type: 'bandpass', freq: 450, Q: 0.7, dur: 0.18, gain: 0.16 }); },
    pivot() { burst({ type: 'bandpass', freq: 700, Q: 1, dur: 0.12, gain: 0.12 }); },
    thud(p = 0.5) { // body hitting the ground
      tone({ freq: 80, to: 40, dur: 0.16, gain: 0.3 + 0.4 * p });
      burst({ type: 'lowpass', freq: 380, dur: 0.12, gain: 0.25 + 0.35 * p });
    },
    bail() {
      SFX.thud(0.9);
      for (let i = 0; i < 4; i++) burst({ type: 'highpass', freq: 1400 + i * 300, dur: 0.03, gain: 0.2, delay: 0.08 + i * 0.09 + Math.random() * 0.04 });
    },
    combo(mult = 1) { // a little rising arpeggio, longer for bigger combos
      const notes = [523, 659, 784, 1047, 1319];
      for (let i = 0; i < Math.min(notes.length, 1 + mult); i++) tone({ freq: notes[i], dur: 0.14, gain: 0.1, type: 'triangle', delay: i * 0.065 });
    },
    lost() { tone({ freq: 330, to: 220, dur: 0.3, gain: 0.08, type: 'sawtooth' }); },
    menuMove() { tone({ freq: 660, dur: 0.05, gain: 0.08, type: 'triangle' }); },
    menuPick() { tone({ freq: 880, dur: 0.09, gain: 0.1, type: 'triangle' }); tone({ freq: 1320, dur: 0.12, gain: 0.07, type: 'triangle', delay: 0.05 }); },
    levelUp() { // a little fanfare
      [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.22, gain: 0.12, type: 'square', delay: i * 0.09 }));
      tone({ freq: 1568, dur: 0.6, gain: 0.08, type: 'triangle', delay: 0.38 });
    },
    newTrick() { tone({ freq: 988, dur: 0.12, gain: 0.08, type: 'triangle' }); tone({ freq: 1480, dur: 0.18, gain: 0.07, type: 'triangle', delay: 0.07 }); },
    tung() { // a hollow wooden knock (Tung Tung Tung Sahur's ollie)
      tone({ freq: 620, to: 540, dur: 0.11, gain: 0.22, type: 'triangle' });
      tone({ freq: 1240, to: 1100, dur: 0.05, gain: 0.06, type: 'sine' });
      burst({ type: 'bandpass', freq: 1500, Q: 5, dur: 0.03, gain: 0.18 });
    },
    cash() { // cha-ching: the drawer clunks open, then the bell
      burst({ type: 'bandpass', freq: 900, Q: 1.2, dur: 0.07, gain: 0.25 });
      tone({ freq: 140, to: 90, dur: 0.08, gain: 0.25 });
      for (const [f, d] of [[2093, 0.11], [2637, 0.15], [3136, 0.19]]) tone({ freq: f, dur: 0.55, gain: 0.07, type: 'sine', delay: d });
      for (let i = 0; i < 3; i++) tone({ freq: 4200 + i * 500, dur: 0.05, gain: 0.03, type: 'triangle', delay: 0.3 + i * 0.06 }); // coins settling
    },
  };

  function play(name, arg) {
    if (!ac || settings.muted || !SFX[name]) return;
    SFX[name](arg);
  }

  // Turns skater messages into sounds.
  function onMessage(m) {
    switch (m.type) {
      case 'pop': return play('pop');
      case 'flick': return play('flick');
      case 'land': return m.onRail ? undefined : play('land', m.impact);
      case 'grindStart': return play('grind');
      case 'push': return play('push');
      case 'pivot': return play('pivot');
      case 'thud': return play('thud', m.power);
      case 'bail': return play('bail');
      case 'combo': return play('combo', m.mult);
      case 'comboLost': return play('lost');
    }
  }

  // Continuous sounds follow what the skater is doing every frame.
  function update(sk, active) {
    if (!ac || !loops) return;
    const t = ac.currentTime, set = (param, v) => param.setTargetAtTime(v, t, 0.04);
    const speed = Math.abs(sk.v);
    const rolling = active && sk.state === 'ground' ? Math.min(1, speed / 800) : 0;
    set(loops.roll.gain.gain, rolling * (sk.manual ? 0.18 : 0.3) * (0.9 + Math.random() * 0.2));
    set(loops.roll.filter.frequency, 250 + speed * 1.1);
    const grinding = active && sk.state === 'grind';
    set(loops.grind.gain.gain, grinding ? 0.16 + Math.min(0.12, speed / 4000) : 0);
    set(loops.grind.filter.frequency, 2200 + speed * 1.2 + Math.random() * 300);
    set(loops.brake.gain.gain, active && sk.braking && speed > 100 ? 0.18 : 0);
  }

  return {
    play, onMessage, update, burst, tone,
    settings,
    get muted() { return settings.muted; },
    get ctx() { return ac; },
    get musicOut() { return musicBus; },
    toggle() {
      settings.muted = !settings.muted;
      store();
      levels();
    },
    // which: 'sfx' or 'music', by -1 / +1
    adjust(which, d) {
      settings[which] = clamp(settings[which] + d, 0, 10);
      store();
      levels();
    },
  };
})();

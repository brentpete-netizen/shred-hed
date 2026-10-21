// Skate sounds, all made in code with the Web Audio API (no sound files):
// wheels rolling, the ollie pop, the flick, landings, grind scrapes, bails and combo dings.
// Browsers only allow audio after you press a key or click, so it starts on your first input.

const Sound = (() => {
  const KEY = 'shredHed.muted';
  let muted = false;
  try { muted = localStorage.getItem(KEY) === '1'; } catch (e) { /* storage blocked */ }

  let ac = null, master = null, noise = null, loops = null;

  function init() {
    if (ac) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ac = new Ctx();
    master = ac.createGain();
    master.gain.value = muted ? 0 : 0.8;
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
    src.connect(filter).connect(gain).connect(master);
    src.start();
    return { filter, gain };
  }

  // A short burst of filtered noise: pops, clacks, scuffs.
  function burst({ type = 'bandpass', freq = 1000, Q = 1, dur = 0.06, gain = 0.3, delay = 0 }) {
    const t = ac.currentTime + delay;
    const src = ac.createBufferSource();
    src.buffer = noise;
    const filter = ac.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = Q;
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(master);
    src.start(t, Math.random() * 1.5, dur + 0.02);
  }

  // A pitched blip: thumps (sliding down), metal rings, menu and combo notes.
  function tone({ freq, to = freq, dur = 0.1, gain = 0.3, type = 'sine', delay = 0 }) {
    const t = ac.currentTime + delay;
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
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
  };

  function play(name, arg) {
    if (!ac || muted || !SFX[name]) return;
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
    play, onMessage, update,
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) { /* storage blocked */ }
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.8, ac.currentTime, 0.02);
    },
  };
})();

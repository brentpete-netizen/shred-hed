// The CPU opponent for Game of S.K.A.T.E. It skates with exactly the same physics and controls
// as you do: it pushes, pops and presses trick keys at chosen moments. To find out *when*, it
// quietly test-runs attempts on a copy of the skater (the physics is deterministic) until one
// lands the trick it wants. Then it skates that run for real, sometimes fluffing it on purpose
// so it's beatable.
//
// A trick can be a whole line: flips and grabs in the air, onto a rail, ollie out of the grind
// into more tricks, maybe onto another rail. The CPU works it out a piece at a time: first the
// pop and the first air (and the grind it lands in), then with that sorted, when to ollie out and
// what to do in the next air, and so on.

const CPU_STEP = 1 / 120;
const KEY_EVENT = { R: 'right', L: 'left', D: 'down', U: 'up' };
const GRAB_BY_NAME = Object.fromEntries(Object.entries(GRABS).map(([k, g]) => [g.name, k]));
const GRIND_BY_NAME = Object.fromEntries(Object.entries(GRINDS).map(([k, g]) => [g.name, k]));
const FLIP_KEYS = Object.fromEntries(Object.entries(TRICKS).map(([k, t]) => [t.name, k]));

// Plays one planned run: push up to speed (braking if it's going too fast), maybe turn fakie,
// pop at a spot, then press and hold keys at set times. Each press / hold says which part of the
// line it belongs to (p): 0 is from the pop, 1 from locking onto the first rail, 2 from leaving
// it, 3 from the second rail, and so on.
class CpuDriver {
  constructor(plan) {
    this.plan = plan;
    this.t = 0;
    this.popT = null;
    this.done = new Set();
    this.phases = [];
    this.last = null;
  }

  step(sk) {
    const p = this.plan, ev = [], held = new Set();
    this.t += CPU_STEP;
    if (this.popT === null) {
      const dist = p.ollieX - sk.pos.x;
      if (sk.facing === 1) {
        // push right up to speed; for a fakie trick, then revert so you're rolling backwards
        if (Math.abs(sk.v) < p.speed && !sk.pivot) held.add('right');
        // way too fast coming up to the spot (off a big roll-in): brake
        else if (sk.state === 'ground' && dist < 700 && sk.v > p.speed * 1.25 + 80 && !p.fakie) held.add('left');
        else if (p.fakie && sk.state === 'ground' && !sk.push && !sk.pivot) ev.push('spinFront');
      }
      if (p.charge && dist < Math.abs(sk.v) * 0.4) held.add('down');
      const ready = !p.fakie || (sk.facing === -1 && !sk.pivot);
      if (sk.state === 'ground' && dist <= 0 && ready) {
        ev.push('up');
        this.popT = this.t;
        this.phases = [this.t];
        this.last = sk.state;
      }
      return { ev, held };
    }
    // the next part of the line: onto a rail, or off it
    const ph = this.phases;
    if (sk.state === 'grind' && this.last !== 'grind' && ph.length % 2 === 1) ph.push(this.t);
    else if (this.last === 'grind' && sk.state === 'air' && ph.length % 2 === 0) ph.push(this.t);
    this.last = sk.state;
    const since = k => (ph[k] === undefined ? -1 : this.t - ph[k]);
    p.presses.forEach((a, i) => { if (!this.done.has(i) && since(a.p || 0) >= a.t) { ev.push(a.key); this.done.add(i); } });
    for (const h of p.holds) { const ta = since(h.p || 0); if (ta >= h.from && ta < h.to) held.add(h.key); }
    // back on the ground: brake so you don't roll into something
    if (sk.state === 'ground' && this.t - this.popT > 0.25 && Math.abs(sk.v) > 100) held.add(sk.v > 0 ? 'left' : 'right');
    return { ev, held };
  }
}

// Test-runs a plan on a fresh skater and reports how it went: the trick names it got, whether it
// rode away, and for each part of the line when it started (from the pop), which way the skater
// faced as it locked onto each rail, and how long each grind lasted.
function cpuSimulate(terrain, plan, maxT = 8) {
  const sk = new Skater(terrain), drv = new CpuDriver(plan);
  sk.regular = true; // plans are worked out in regular stance (the CPU skates regular)
  sk.holdRepeat = false; // and one trick at a time
  let names = null, landed = false, landedAt = null, grindFrom = null;
  const facing = [], grindDur = [], exitV = [];
  for (let i = 0; i < maxT / CPU_STEP; i++) {
    const { ev, held } = drv.step(sk);
    const was = sk.state, v = Math.abs(sk.v);
    sk.update(CPU_STEP, ev, a => held.has(a));
    if (drv.popT !== null) {
      if (sk.state === 'grind' && was !== 'grind') { facing.push(sk.facing); grindFrom = drv.t; }
      if (was === 'grind' && sk.state !== 'grind' && grindFrom !== null) { grindDur.push(drv.t - grindFrom); exitV.push(v); grindFrom = null; }
    }
    for (const m of sk.out) {
      if (m.type === 'chain' && m.names.length && names === null) { names = m.names.join(' + '); landed = m.landed; landedAt = drv.t; }
      if (m.type === 'bail' && landedAt !== null) landed = false;
    }
    sk.out.length = 0;
    if (sk.state === 'bail' || (landedAt !== null && drv.t - landedAt > 0.7)) break;
  }
  if (grindFrom !== null) { grindDur.push(drv.t - grindFrom); exitV.push(Math.abs(sk.v)); }
  const phases = drv.phases.map(t => t - (drv.popT ?? 0));
  return { names, landed, phases, facing, grindDur, exitV, lockT: phases[1] ?? null };
}

// Breaks a trick name like "Fakie BS 180 Kickflip + 50-50 + Heelflip" into the parts of the line:
// airs (flips and grabs in order, a spin, fakie or not) and grinds in between. null if it isn't
// something you can do. (A spin is named last in its air, or merged into the air's only flip.)
function cpuParse(target) {
  const segs = [];
  let air = null;
  const newAir = () => { air = { type: 'air', fakie: false, halves: 0, tricks: [], merged: false, spun: false }; segs.push(air); };
  for (const part of target.split(' + ')) {
    if (GRIND_BY_NAME[part]) {
      if (!air) newAir();
      segs.push({ type: 'grind', kind: GRIND_BY_NAME[part] });
      air = null;
      continue;
    }
    if (!air) newAir();
    if (air.spun || air.merged) return null; // nothing comes after those in the same air
    const m = part.match(/^(Fakie )?(?:(BS|FS) (\d+) ?)?(.*)$/);
    if (m[1]) air.fakie = true;
    const rest = m[4];
    if (m[2]) {
      const halves = (m[2] === 'BS' ? -1 : 1) * (+m[3] / 180);
      if (!Number.isInteger(halves) || !halves) return null;
      air.halves = halves;
      if (!rest) { air.spun = true; continue; }
      if (!FLIP_KEYS[rest] || air.tricks.length) return null;
      air.tricks.push({ kind: 'flip', keys: FLIP_KEYS[rest] });
      air.merged = true;
      continue;
    }
    if (FLIP_KEYS[rest]) air.tricks.push({ kind: 'flip', keys: FLIP_KEYS[rest] });
    else if (GRAB_BY_NAME[rest]) air.tricks.push({ kind: 'grab', keys: GRAB_BY_NAME[rest] });
    else return null;
  }
  // "BS 180" on its own after one flip would have been merged into it: a different name
  for (const s of segs) if (s.type === 'air' && s.spun && s.tricks.length === 1 && s.tricks[0].kind === 'flip') return null;
  return segs.length ? segs : null;
}

// How many names an air comes out as.
const airNames = a => a.tricks.length + (a.spun ? 1 : 0);

// The keys for one air, timed from the start of that part of the line.
// v: { gap between tricks, how long to hold a grab, when to let go of a spin }
function cpuAirKeys(air, p, v) {
  const presses = [], holds = [];
  let t = 0.03;
  for (const tr of air.tricks) {
    if (tr.kind === 'flip') {
      [...tr.keys].forEach((k, i) => presses.push({ p, t: t + i * 0.06, key: KEY_EVENT[k] }));
      t += TRICKS[tr.keys].dur + v.gap;
    } else {
      // one arrow for most grabs, two quick taps for the Christ Air
      presses.push({ p, t, key: 'grab' });
      [...tr.keys].forEach((k, i) => presses.push({ p, t: t + 0.02 + i * 0.06, key: KEY_EVENT[k] }));
      holds.push({ p, from: t + 0.02, to: t + 0.08, key: KEY_EVENT[tr.keys[0]] });
      holds.push({ p, from: t, to: t + v.grabT, key: 'grab' });
      t += v.grabT + v.gap;
    }
  }
  if (air.halves) holds.push({ p, from: 0, to: v.spinT, key: air.halves < 0 ? 'spinBack' : 'spinFront' });
  return { presses, holds, end: Math.max(t, air.halves ? v.spinT : 0) };
}

// Ways to time an air, the likeliest first.
function cpuAirVariants(air) {
  const spin0 = Math.abs(air.halves) * Math.PI / CONFIG.spinSpeed + 0.04;
  const spins = air.halves ? [0, -0.04, -0.08, 0.05, -0.14].map(d => spin0 + d) : [0];
  const grabs = air.tricks.some(t => t.kind === 'grab') ? [0.32, 0.42, 0.24] : [0.3];
  const gaps = air.tricks.length > 1 ? [0.04, 0.1] : [0.04];
  const out = [];
  spins.forEach((spinT, a) => grabs.forEach((grabT, b) => gaps.forEach((gap, c) => out.push({ spinT, grabT, gap, rank: a + b + c }))));
  return out.sort((x, y) => x.rank - y.rank);
}

// Spots along the map where the CPU could pop. For a rail: the run-up to each one. Otherwise
// anywhere you can roll: flat ground for most things, but for tricks that need a lot of air,
// the tops of drops and stairs and the lips of kickers first.
function cpuSpots(terrain, grind, needAir = 0) {
  const seg = terrain.segs[terrain.segIndexAt(terrain.spawnS)];
  const spawnX = terrain.pointOnSeg(seg, (terrain.spawnS - seg.s0) / seg.len).x;
  if (grind) {
    // the faster you can be going (off the Mega Ramp, say), the further back you have to pop
    const reach = terrain.maxSpeed ? 900 : 260, step = terrain.maxSpeed ? 60 : 35;
    const spots = [];
    for (const r of terrain.railLines) {
      const a = r.pts[0];
      if (a.x < spawnX + 150) continue;
      for (let x = a.x - reach; x <= a.x + 20; x += step) if (x > spawnX + 40) spots.push({ x });
    }
    return spots;
  }
  const angAt = x => terrain.surfaceBelow(x, -2000)?.ang ?? 1;
  const flat = x => Math.abs(angAt(x)) < 0.15; // flat-ish, a gentle hill is fine
  const flats = [], others = [];
  for (let x = spawnX + 120; x < spawnX + 2800; x += 110) if (flat(x) && flat(x + 150) && flat(x + 300)) flats.push({ x });
  if (needAir <= 0.5) return flats;
  // how much further down you'd land than you took off, plus a bonus for a kicker's lip
  for (let x = spawnX + 120; x < terrain.maxX - 250; x += 60) {
    if (Math.abs(angAt(x)) > CONFIG.pushMaxSlope) continue;
    const drop = terrain.groundYAt(x + 260, terrain.groundYAt(x) - 5) - terrain.groundYAt(x);
    const kicker = angAt(x - 25) < -0.2 ? 120 : 0;
    if (drop > 25 || kicker) others.push({ x, score: drop + kicker });
  }
  // up the quarter pipe at the far end: ollie near the top for the biggest air there is
  for (const c of terrain.copings) if (c.end === 1) for (const d of [12, 30, 55, 90]) others.push({ x: c.pt.x - d, score: 150 - d });
  others.sort((a, b) => b.score - a.score);
  if (needAir <= 0.62) return [...flats, ...others.slice(0, 12)];
  // big air: the drops and kickers, taking turns with flat ground (a charged ollie can do a lot)
  const out = [], big = others.slice(0, 18);
  for (let i = 0; i < Math.max(big.length, flats.length); i++) out.push(...[big[i], flats[i]].filter(Boolean));
  return out;
}

// Finds a plan that lands `target`, or null if the CPU can't figure one out.
function cpuPlan(terrain, target, budget = 260) {
  const run = cpuThinkPlan(terrain, target, budget);
  let r;
  do r = run.next(); while (!r.done);
  return r.value;
}

// The same, a few test-runs at a time (each `next()` is one), so the game keeps going while the
// CPU thinks. The physics is deterministic, so a plan that worked once on this map always works.
function* cpuThinkPlan(terrain, target, budget = 260) {
  const cache = terrain.cpuPlans || (terrain.cpuPlans = new Map());
  if (!cache.has(target)) cache.set(target, yield* cpuSearch(terrain, target, budget));
  return cache.get(target);
}

function* cpuSearch(terrain, target, budget) {
  const segs = cpuParse(target);
  if (!segs) return null;
  const parts = target.split(' + ');
  // the line in pieces: each air, with the grind it lands in (if any)
  const units = [];
  for (let i = 0; i < segs.length; i++) {
    if (segs[i].type !== 'air') continue;
    const grind = segs[i + 1]?.type === 'grind' ? segs[i + 1] : null;
    const n = airNames(segs[i]) + (grind ? 1 : 0);
    units.push({ air: segs[i], grind, upTo: (units.length ? units[units.length - 1].upTo : 0) + n });
  }
  // harder lines get more tries
  budget += 300 * (units.length - 1) + 60 * Math.max(0, segs[0].tricks.length - 1) + (Math.abs(segs[0].halves) >= 3 ? 160 : 0);
  let sims = 0;
  const prefix = n => parts.slice(0, n).join(' + ');
  const got = (r, n) => r.names && r.names.split(' + ').slice(0, n).join(' + ') === prefix(n);
  // a piece worked: the names so far are right and (for a piece with a grind that the line goes
  // on from) it held the grind long enough, and was still going fast enough, to ollie out of it;
  // the last piece has to ride away
  const pieceOk = (r, u, k) => {
    if (k === units.length - 1) return r.landed && r.names === target;
    return got(r, u.upTo) && (r.grindDur[k] ?? 0) >= 0.18 && (r.exitV[k] ?? 0) >= 140;
  };
  const sim = function* (plan) { sims++; const r = cpuSimulate(terrain, plan); yield; return r; };

  // the grind's key, pressed just before touching the rail ("forward" means toward the nose,
  // which flips if you're fakie or spun a half turn: so it's which way you face as you lock on)
  const addGrind = (plan, grind, p, r, k) => {
    const lockAt = r.phases[p + 1], face = r.facing[k];
    if (lockAt === undefined || face === undefined) return false;
    const rel = lockAt - r.phases[p], t = Math.max(0.02, rel - 0.08);
    if (grind.kind === 'dark') {
      // both spin keys held at once
      plan.holds.push({ p, from: t, to: rel + 0.15, key: 'spinBack' }, { p, from: t, to: rel + 0.15, key: 'spinFront' });
    } else if (grind.kind !== 'none') {
      const key = grind.kind === 'down' || grind.kind === 'up' ? grind.kind : (grind.kind === 'fwd') === (face > 0) ? 'right' : 'left';
      plan.presses.push({ p, t, key });
      plan.holds.push({ p, from: t, to: rel + 0.15, key });
    }
    return true;
  };

  // one piece of the line, on top of a plan that already does the pieces before it
  function* piece(k, base, baseRun) {
    const u = units[k], p = 2 * k, found = [];
    const variants = cpuAirVariants(u.air);
    // first piece: where to pop and how fast; later ones: when to ollie out of the grind
    const starts = [];
    if (k === 0) {
      const need = cpuAirKeys(u.air, 0, variants[0]).end + 0.08;
      // a line that goes on after the grind needs to grind fast enough to get to the end of the
      // rail: the most run-up and the most speed first
      const more = units.length > 1 && u.grind;
      const speeds = more ? [800, 640, 480] : u.grind ? [480, 640, 800, 380] : [520, 700, 380, 860];
      let spots = cpuSpots(terrain, !!u.grind, need);
      if (more) {
        // taking turns: the most run-up, then the usual order
        const far = [...spots].sort((a, b) => b.x - a.x);
        spots = [...new Set(far.flatMap((s, i) => [s, spots[i]]))];
      }
      for (const spot of spots) {
        for (const speed of speeds) {
          for (const charge of [false, true]) starts.push({ ollieX: spot.x, speed, charge, fakie: u.air.fakie, presses: [], holds: [] });
        }
      }
    } else {
      // near the end of the rail, so you come down past it (pop too early and you land back on it)
      const dur = baseRun.grindDur[k - 1] || 0.3;
      for (const before of [0.12, 0.24, 0.06, 0.36, 0.5]) {
        if (dur - before < 0.06) continue;
        const plan = JSON.parse(JSON.stringify(base));
        plan.presses.push({ p: p - 1, t: dur - before, key: 'up' });
        starts.push(plan);
      }
      starts.push(JSON.parse(JSON.stringify(base))); // or just roll off the end into it
    }
    for (const start of starts) {
      for (const v of variants) {
        if (sims > budget) return found;
        const plan = JSON.parse(JSON.stringify(start)), keys = cpuAirKeys(u.air, p, v);
        plan.presses.push(...keys.presses);
        plan.holds.push(...keys.holds);
        let r = yield* sim(plan);
        if (u.grind && u.grind.kind !== 'none' && got(r, u.upTo - 1) && r.phases[p + 1] !== undefined) {
          if (addGrind(plan, u.grind, p, r, k)) r = yield* sim(plan);
        }
        if (pieceOk(r, u, k)) {
          found.push({ plan, r });
          if (k === units.length - 1 || found.length >= 3) return found;
          break; // that start works: try the next one for a second option
        }
      }
    }
    return found;
  }

  // piece by piece, with a couple of fallbacks at each step in case one leads nowhere
  function* from(k, base, baseRun) {
    const options = yield* piece(k, base, baseRun);
    for (const o of options) {
      if (k === units.length - 1) return o.plan;
      const done = yield* from(k + 1, o.plan, o.r);
      if (done) return done;
      if (sims > budget) return null;
    }
    return null;
  }
  return yield* from(0, null, null);
}

// Mess a plan up on purpose: flick too late, cut a spin short, hang onto a grab, or pop at the
// wrong spot. Each idea is test-run and the first one that really fails is used.
function cpuFluff(terrain, plan, target) {
  const copy = () => JSON.parse(JSON.stringify(plan));
  // on a line, mess up the last bit (it gets most of the way, like a real try)
  const lastPart = p => Math.max(0, ...p.presses.map(a => a.p || 0));
  const late = by => p => { const k = lastPart(p); if (!k) return false; for (const a of p.presses) if ((a.p || 0) === k) a.t += by; };
  const ideas = [
    late(0.32), late(0.48),
    p => { const g = p.holds.find(h => h.key === 'grab'); if (!g) return false; g.to = 9; },
    p => { const s = p.holds.find(h => h.key === 'spinBack' || h.key === 'spinFront'); if (!s) return false; s.to *= 0.45; },
    p => { if (!p.presses.length) return false; for (const a of p.presses) a.t += 0.3; },
    p => { if (!p.presses.length) return false; for (const a of p.presses) a.t += 0.45; },
    p => { p.ollieX -= 90; },
    p => { p.ollieX += 110; },
    p => { p.holds.push({ from: 0.05, to: 9, key: 'spinFront' }); },
  ];
  for (const idea of ideas) {
    const p = copy();
    if (idea(p) === false) continue;
    const r = cpuSimulate(terrain, p);
    if (!(r.landed && r.names === target)) return p;
  }
  return copy();
}

// What the CPU tries to set, roughly from easy to hard.
const CPU_SETS = [
  { tier: 0, names: ['Kickflip', 'Heelflip', 'Pop Shove-it', 'FS 180', 'BS 180', 'Indy', '50-50'] },
  { tier: 1, names: ['Varial Kickflip', '360 Shove-it', 'BS 180 Kickflip', 'FS 180 Heelflip', 'Melon', 'Boardslide', '5-0', 'Kickflip + 50-50', 'Impossible'] },
  { tier: 2, names: ['Tre Flip', 'Laser Flip', 'Hardflip', 'Inward Heelflip', 'BS 360', 'Method', 'Nosegrind', 'Crooked Grind', 'Fakie Kickflip', 'Christ Air', 'Double Impossible', '360 Hardflip'] },
  { tier: 3, names: ['BS 360 Kickflip', 'FS 360 Heelflip', 'Kickflip + Indy', 'Double Kickflip', 'Tre Flip + 50-50', 'Kickflip + 50-50 + Heelflip',
    'Hardflip + Boardslide', 'Fakie Tre Flip', 'Nightmare Flip', 'Heelflip + Melon', '50-50 + Kickflip'] },
];

// The chance the CPU fluffs a trick, by how hard it is.
function cpuMissChance(target) {
  const segs = cpuParse(target) || [];
  const pts = segs.reduce((sum, s) => {
    if (s.type === 'grind') return sum + GRINDS[s.kind].pts + 50;
    const tricks = s.tricks.reduce((n, t) => n + (t.kind === 'flip' ? TRICKS[t.keys].pts : GRABS[t.keys].pts), 0);
    return sum + tricks + (SPIN_PTS[Math.abs(s.halves)] || 0) + (s.fakie ? 50 : 0);
  }, 0);
  return clamp(0.12 + pts / 1200, 0.15, 0.5);
}

// Picks a trick to set and plans it. Bolder when it's ahead, safer when it's about to lose, and
// pulling out the big stuff when it's well behind.
function* cpuThinkSet(terrain, cpuLetters, otherLetters) {
  let tier = cpuLetters >= 4 ? 0 : cpuLetters + 1 < otherLetters ? 3 : cpuLetters < otherLetters ? 2 : 1;
  if (tier > 0 && Math.random() < 0.3) tier--; // keep it unpredictable
  for (; tier >= 0; tier--) {
    const names = [...CPU_SETS[tier].names].sort(() => Math.random() - 0.5);
    for (const name of names) {
      const plan = yield* cpuThinkPlan(terrain, name, 60);
      if (plan) return { name, plan };
    }
  }
  return null;
}

function cpuChooseSet(terrain, cpuLetters, otherLetters) {
  const run = cpuThinkSet(terrain, cpuLetters, otherLetters);
  let r;
  do r = run.next(); while (!r.done);
  return r.value;
}

// The CPU opponent for Game of S.K.A.T.E. It skates with exactly the same physics and controls
// as you do: it pushes, pops and presses trick keys at chosen moments. To find out *when*, it
// quietly test-runs attempts on a copy of the skater (the physics is deterministic) until one
// lands the trick it wants. Then it skates that run for real, sometimes fluffing it on purpose
// so it's beatable.

const CPU_STEP = 1 / 120;
const KEY_EVENT = { R: 'right', L: 'left', D: 'down', U: 'up' };
const GRAB_BY_NAME = Object.fromEntries(Object.entries(GRABS).map(([k, g]) => [g.name, k]));
const GRIND_BY_NAME = Object.fromEntries(Object.entries(GRINDS).map(([k, g]) => [g.name, k]));
const FLIP_KEYS = Object.fromEntries(Object.entries(TRICKS).map(([k, t]) => [t.name, k]));

// Plays one planned run: push up to speed, (maybe) turn fakie, pop at a spot, then press and
// hold keys at set times after the pop.
class CpuDriver {
  constructor(plan) {
    this.plan = plan;
    this.t = 0;
    this.popT = null;
    this.done = new Set();
    this.picked = false;
  }

  step(sk) {
    const p = this.plan, ev = [], held = new Set();
    this.t += CPU_STEP;
    if (this.popT === null) {
      const dist = p.ollieX - sk.pos.x;
      // a caveman: ride most of the way, then grab the board and jog up to the spot
      if (p.caveman && !sk.foot && !this.picked && sk.state === 'ground' && dist < 140 && sk.flatEnough()) {
        ev.push('carry');
        this.picked = true;
        return { ev, held };
      }
      if (sk.facing === 1) {
        // push right up to speed; for a fakie trick, then revert so you're rolling backwards
        if (Math.abs(sk.v) < p.speed && !sk.pivot) held.add('right');
        else if (p.fakie && sk.state === 'ground' && !sk.push && !sk.pivot) ev.push('spinFront');
      }
      if (p.charge && dist < Math.abs(sk.v) * 0.4) held.add('down');
      const ready = (!p.fakie || (sk.facing === -1 && !sk.pivot)) && (!p.caveman || sk.foot);
      if (sk.state === 'ground' && dist <= 0 && ready) {
        ev.push('up');
        this.popT = this.t;
      }
      return { ev, held };
    }
    const ta = this.t - this.popT;
    p.presses.forEach((a, i) => { if (!this.done.has(i) && ta >= a.t) { ev.push(a.key); this.done.add(i); } });
    for (const h of p.holds) if (ta >= h.from && ta < h.to) held.add(h.key);
    // back on the ground: brake so you don't roll into something
    if (sk.state === 'ground' && ta > 0.25 && Math.abs(sk.v) > 100) held.add(sk.v > 0 ? 'left' : 'right');
    return { ev, held };
  }
}

// Test-runs a plan on a fresh skater and reports what trick it lands (or that it bailed).
function cpuSimulate(terrain, plan, maxT = 7) {
  const sk = new Skater(terrain), drv = new CpuDriver(plan);
  let names = null, landed = false, landedAt = null, lockT = null;
  for (let i = 0; i < maxT / CPU_STEP; i++) {
    const { ev, held } = drv.step(sk);
    sk.update(CPU_STEP, ev, a => held.has(a));
    if (sk.state === 'grind' && lockT === null && drv.popT !== null) lockT = drv.t - drv.popT;
    for (const m of sk.out) {
      if (m.type === 'chain' && m.names.length && names === null) { names = m.names.join(' + '); landed = m.landed; landedAt = drv.t; }
      if (m.type === 'bail' && landedAt !== null) landed = false;
    }
    sk.out.length = 0;
    if (sk.state === 'bail' || (landedAt !== null && drv.t - landedAt > 0.7)) break;
  }
  return { names, landed, lockT };
}

// Breaks a trick name like "Fakie BS 180 Kickflip + 50-50" into what to press.
function cpuParse(target) {
  const parts = target.split(' + ');
  let air = null, grind = null;
  for (const part of parts) {
    if (GRIND_BY_NAME[part]) { if (grind) return null; grind = GRIND_BY_NAME[part]; continue; }
    if (part === 'Caveman') { if (air || grind) return null; air = { caveman: true, fakie: false, halves: 0, flip: null, grab: null }; continue; }
    if (air || grind) return null; // flips after a grind, or two separate airs: too fancy for the CPU
    const m = part.match(/^(Fakie )?(?:(BS|FS) (\d+) ?)?(.*)$/);
    const rest = m[4];
    air = { fakie: !!m[1], halves: m[2] ? (m[2] === 'BS' ? -1 : 1) * (+m[3] / 180) : 0, flip: null, grab: null };
    if (FLIP_KEYS[rest]) air.flip = FLIP_KEYS[rest];
    else if (GRAB_BY_NAME[rest]) air.grab = GRAB_BY_NAME[rest];
    else if (rest) return null;
  }
  return { air: air || { fakie: false, halves: 0, flip: null, grab: null }, grind };
}

// Spots along the map where the CPU could pop: flat ground ahead of the spawn, or the run-up
// to a rail.
function cpuSpots(terrain, grind) {
  const seg = terrain.segs[terrain.segIndexAt(terrain.spawnS)];
  const spawnX = terrain.pointOnSeg(seg, (terrain.spawnS - seg.s0) / seg.len).x;
  const spots = [];
  if (grind) {
    for (const r of terrain.railLines) {
      const a = r.pts[0];
      if (a.x < spawnX + 150) continue;
      for (let x = a.x - 260; x <= a.x + 20; x += 35) spots.push({ x });
    }
  } else {
    const flat = x => Math.abs(terrain.surfaceBelow(x, -2000)?.ang ?? 1) < 0.15; // flat-ish, a gentle hill is fine
    for (let x = spawnX + 120; x < spawnX + 2800; x += 110) if (flat(x) && flat(x + 150) && flat(x + 300)) spots.push({ x });
  }
  return spots;
}

// Finds a plan that lands `target`, or null if the CPU can't figure one out.
function cpuPlan(terrain, target, budget = 260) {
  // the physics is deterministic, so a plan that worked once on this map always works
  const cache = terrain.cpuPlans || (terrain.cpuPlans = new Map());
  if (!cache.has(target)) cache.set(target, cpuSearch(terrain, target, budget));
  return cache.get(target);
}

function cpuSearch(terrain, target, budget) {
  const want = cpuParse(target);
  if (!want) return null;
  const { air, grind } = want;
  if (air.caveman) return grind ? null : cpuSearchCaveman(terrain, target, budget);
  const presses = [], holds = [];
  if (air.flip) [...air.flip].forEach((k, i) => presses.push({ t: 0.03 + i * 0.06, key: KEY_EVENT[k] }));
  if (air.grab) {
    presses.push({ t: 0.08, key: 'grab' }, { t: 0.1, key: KEY_EVENT[air.grab] });
    holds.push({ from: 0.1, to: 0.16, key: KEY_EVENT[air.grab] });
  }
  const spinKey = air.halves < 0 ? 'spinBack' : 'spinFront';
  const spinT0 = Math.abs(air.halves) * Math.PI / CONFIG.spinSpeed + 0.04;
  const spinTimes = air.halves ? [spinT0 - 0.08, spinT0 - 0.04, spinT0, spinT0 + 0.05, spinT0 - 0.14] : [0];
  const grabHolds = air.grab ? [0.32, 0.42, 0.24] : [0];
  const speeds = grind ? [480, 640, 800, 380] : [520, 700, 380];
  let sims = 0;
  for (const spot of cpuSpots(terrain, grind)) {
    for (const speed of speeds) {
      for (const charge of [false, true]) {
        for (const spinT of spinTimes) {
          for (const grabT of grabHolds) {
            if (sims++ > budget) return null;
            const plan = {
              ollieX: spot.x, speed, charge, fakie: air.fakie,
              presses: [...presses], holds: [...holds],
            };
            if (air.halves) plan.holds.push({ from: 0, to: spinT, key: spinKey });
            if (air.grab) plan.holds.push({ from: 0.08, to: 0.08 + grabT, key: 'grab' });
            let r = cpuSimulate(terrain, plan);
            if (grind && grind !== 'none' && r.lockT !== null) {
              // press the grind's direction just before touching the rail ("forward" means toward
              // the nose, which flips if you're fakie or spun a half turn)
              const facing = (air.fakie ? -1 : 1) * (Math.abs(air.halves) % 2 ? -1 : 1);
              const t = Math.max(0.02, r.lockT - 0.08);
              if (grind === 'dark') {
                // both spin keys held at once
                plan.holds.push({ from: t, to: r.lockT + 0.15, key: 'spinBack' }, { from: t, to: r.lockT + 0.15, key: 'spinFront' });
              } else {
                const key = grind === 'down' || grind === 'up' ? grind
                  : (grind === 'fwd') === (facing > 0) ? 'right' : 'left';
                plan.presses.push({ t, key });
                plan.holds.push({ from: t, to: r.lockT + 0.15, key });
              }
              r = cpuSimulate(terrain, plan);
            }
            if (r.landed && r.names === target) return plan;
          }
        }
      }
    }
  }
  return null;
}

// Ride up to a spot, pick the board up, jog the last bit, jump, and put the board under your
// feet: where, and when to press F in the air, are the things to work out.
function cpuSearchCaveman(terrain, target, budget) {
  let sims = 0;
  for (const spot of cpuSpots(terrain, null)) {
    for (const t of [0.04, 0.08, 0.12, 0.16]) {
      if (sims++ > budget) return null;
      const plan = { ollieX: spot.x, speed: 300, charge: false, fakie: false, caveman: true, presses: [{ t, key: 'carry' }], holds: [] };
      const r = cpuSimulate(terrain, plan, 10);
      if (r.landed && r.names === target) return plan;
    }
  }
  return null;
}

// Mess a plan up on purpose: flick too late, cut a spin short, hang onto a grab, or pop at the
// wrong spot. Each idea is test-run and the first one that really fails is used.
function cpuFluff(terrain, plan, target) {
  const copy = () => JSON.parse(JSON.stringify(plan));
  const ideas = [
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
  { tier: 1, names: ['Varial Kickflip', '360 Shove-it', 'BS 180 Kickflip', 'FS 180 Heelflip', 'Melon', 'Boardslide', '5-0', 'Kickflip + 50-50', 'Impossible', 'Caveman'] },
  { tier: 2, names: ['Tre Flip', 'Laser Flip', 'Hardflip', 'Inward Heelflip', 'BS 360', 'Method', 'Nosegrind', 'Crooked Grind', 'Fakie Kickflip'] },
];

// The chance the CPU fluffs a trick, by how hard it is.
function cpuMissChance(target) {
  const pts = target.split(' + ').reduce((sum, part) => {
    const air = cpuParse(part)?.air;
    const flip = air?.flip ? TRICKS[air.flip].pts : 0;
    const grab = air?.grab ? GRABS[air.grab].pts : 0;
    const spin = air ? SPIN_PTS[Math.abs(air.halves)] || 0 : 0;
    const grind = GRIND_BY_NAME[part] ? GRINDS[GRIND_BY_NAME[part]].pts + 50 : 0;
    const cave = air?.caveman ? CAVEMAN_PTS : 0;
    return sum + flip + grab + spin + grind + cave + (air?.fakie ? 50 : 0);
  }, 0);
  return clamp(0.12 + pts / 1200, 0.15, 0.5);
}

// Picks a trick to set and plans it. Bolder when it's ahead, safer when it's about to lose.
function cpuChooseSet(terrain, cpuLetters, otherLetters) {
  let tier = cpuLetters >= 4 ? 0 : cpuLetters < otherLetters ? 2 : 1;
  if (tier > 0 && Math.random() < 0.3) tier--; // keep it unpredictable
  for (; tier >= 0; tier--) {
    const names = [...CPU_SETS[tier].names].sort(() => Math.random() - 0.5);
    for (const name of names) {
      const plan = cpuPlan(terrain, name, 60);
      if (plan) return { name, plan };
    }
  }
  return null;
}

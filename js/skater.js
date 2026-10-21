// The skater and their board: riding, ollies, flip tricks, spins, grabs, grinds, manuals,
// landing and bailing. Tricks feed a Combo, which is banked when you land (or lost if you bail).
//
// Directions along the ground follow the terrain chain: +1 is toward the end of the chain
// (right on flat ground), -1 toward the start. `facing` is which way the board's nose points
// in those terms, so rolling one way while facing the other is riding fakie.
// `ang` is the angle of the board's frame: the ground angle when rolling, and in the air it
// eases toward the ground below so you come down level.
// `spin` is how far you've turned around in the air (Q / E); every half turn flips `facing` on landing.

const HB = 13.5; // ground to the middle of the deck
const SEQ_KEY = { up: 'U', down: 'D', left: 'L', right: 'R' };
const KEY_DIR = { U: 'up', D: 'down', L: 'left', R: 'right' };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));

class Skater {
  constructor(terrain) {
    this.terrain = terrain;
    this.facing = 1;
    this.out = [];  // messages for the HUD: tricks, combos, bails
    this.fx = [];   // dust puffs, pop lines and grind sparks
    this.time = 0;
    this.combo = new Combo();
    this.held = () => false;
    this.respawn(terrain.spawnS);
  }

  respawn(s) {
    const T = this.terrain;
    this.state = 'ground';
    this.seg = T.segIndexAt(s);
    this.s = s;
    this.v = 0;
    const seg = T.segs[this.seg];
    this.pos = T.pointOnSeg(seg, (s - seg.s0) / seg.len);
    this.vel = { x: 0, y: 0 };
    this.ang = seg.ang;
    this.crouch = 0.6;
    this.crouchVel = 0;
    this.crouchTime = 0;
    this.crouchHeld = false;
    this.airAmt = 0;
    this.airTime = 0;
    this.trick = null;
    this.grab = null;
    this.grabAmt = 0;
    this.lastGrab = null;
    this.spin = 0;
    this.spinVel = 0;
    this.airEntries = [];
    this.push = null;
    this.pivot = null;
    this.braking = false;
    this.ollieT = 9;
    this.vert = null;
    this.grind = null;
    this.manual = null;
    this.grace = 0;
    this.fakie = false;
    this.bail = null;
    this.chain = null;
    this.combo.reset();
  }

  update(dt, events, held) {
    this.time += dt;
    this.held = held;
    if (this.state === 'ground') this.updateGround(dt, events);
    else if (this.state === 'air') this.updateAir(dt, events);
    else if (this.state === 'grind') this.updateGrind(dt, events);
    else this.updateBail(dt, events);
    this.updateBody(dt);
    this.updateFx(dt);
  }

  // Adds a trick to the combo and tells the HUD.
  addEntry(name, base, perSec = 0, extra = {}) {
    const e = Object.assign(this.combo.add(name, base, perSec), extra);
    if (this.state === 'air') this.airEntries.push(e);
    if (this.chain && this.state !== 'ground') this.chain.entries.push(e);
    this.out.push({ type: 'trick', name });
    return e;
  }

  // Everything from leaving the ground until the wheels are back on it (airs and grinds) is one
  // "attempt", which is what Game of S.K.A.T.E. judges.
  endChain(landed) {
    if (!this.chain) return;
    this.out.push({ type: 'chain', names: this.chain.entries.map(e => e.name), landed });
    this.chain = null;
  }

  renameEntry(e, name, base) {
    e.name = name;
    e.base = base;
    this.out.push({ type: 'trick', name, upgrade: true });
  }

  dropEntry(e) {
    this.combo.remove(e);
    this.airEntries = this.airEntries.filter(x => x !== e);
    if (this.chain) this.chain.entries = this.chain.entries.filter(x => x !== e);
    this.out.push({ type: 'cancel' });
  }

  bankCombo() {
    this.grace = 0;
    if (!this.combo.active) return;
    const r = this.combo.result();
    this.out.push({ type: 'combo', score: r.score, points: r.points, mult: r.mult, parts: r.parts });
    this.combo.reset();
  }

  // ---------------------------------------------------------------- ground

  updateGround(dt, events) {
    const C = CONFIG, held = this.held;
    // Just landed: a short window to link a manual or revert, otherwise the combo is banked.
    if (this.grace > 0 && !this.manual) {
      this.grace -= dt;
      if (this.grace <= 0) this.bankCombo();
    }

    const pressed = new Set();
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (e === 'up') {
        this.ollie();
        // anything pressed in the same instant after the pop is already in the air
        this.updateAir(0, events.slice(i + 1));
        return;
      }
      if (e === 'down' && this.manual) { this.endManual(); continue; }
      if (e === 'down' && this.grace > 0) { this.startManual('manual'); continue; }
      if ((e === 'spinBack' || e === 'spinFront') && !this.manual) { this.revert(); continue; }
      pressed.add(e);
    }

    if (this.manual) {
      this.updateManual(dt);
      if (this.state !== 'ground') return;
    } else {
      this.crouchHeld = held('down');
      this.crouchTime = this.crouchHeld ? this.crouchTime + dt : 0;
      this.handleDirections(dt, d => held(d) || pressed.has(d));
    }

    if (this.push) {
      const p = this.push;
      p.t += dt;
      if (!p.kicked && p.t >= C.pushDuration * C.pushKickAt) {
        p.kicked = true;
        this.out.push({ type: 'push' });
        const along = p.dir * this.v;
        if (along < C.pushMaxSpeed) this.v = p.dir * Math.min(along + C.pushImpulse, C.pushMaxSpeed);
      }
      if (p.t >= C.pushDuration) this.push = null;
    }
    if (this.pivot) {
      this.pivot.t += dt;
      if (this.pivot.t >= C.pivotDuration) { this.facing = -this.facing; this.pivot = null; }
    }

    const seg = this.terrain.segs[this.seg];
    let a = C.gravity * seg.ty;
    if (this.crouchHeld && seg.curved && a * this.v > 0) a *= C.pumpBoost; // pumping
    this.v += a * dt;
    const drag = (C.rollingFriction + C.airDrag * this.v * this.v) * dt;
    this.v = Math.abs(this.v) <= drag ? 0 : this.v - Math.sign(this.v) * drag;
    this.v = clamp(this.v, -C.maxSpeed, C.maxSpeed);
    this.advance(dt);

    // a manual ends (and banks the combo) if you stop or roll onto a ramp
    if (this.manual && this.state === 'ground' && (!this.flatEnough() || Math.abs(this.v) < 40)) this.endManual();
  }

  // Push the way you're going, hold backwards to brake, and when stopped, backwards turns you around.
  handleDirections(dt, isDown) {
    const C = CONFIG;
    const moving = Math.abs(this.v) > C.pivotMaxSpeed;
    this.braking = false;
    for (const d of [1, -1]) {
      if (!isDown(d > 0 ? 'right' : 'left') || isDown(d > 0 ? 'left' : 'right')) continue;
      if (moving && Math.sign(this.v) !== d) {
        this.v -= Math.sign(this.v) * Math.min(Math.abs(this.v), C.brakeDecel * dt);
        this.braking = true;
        this.push = null;
      } else if (!this.pivot && !this.push) {
        if (this.facing !== d) this.startPivot();
        else this.startPush(d);
      }
    }
  }

  flatEnough() {
    return Math.abs(this.terrain.segs[this.seg].ang) < CONFIG.pushMaxSlope;
  }

  startPush(dir) {
    if (!this.flatEnough() || dir * this.v >= CONFIG.pushMaxSpeed - 5) return;
    this.push = { t: 0, dir, kicked: false };
  }

  startPivot() {
    if (!this.flatEnough()) return false;
    this.pivot = { t: 0 };
    this.push = null;
    this.out.push({ type: 'pivot' });
    return true;
  }

  // Q / E on the ground: a quick 180 pivot. Right after a landing it's a revert and keeps the combo.
  revert() {
    if (this.pivot || !this.startPivot()) return;
    if (this.grace > 0 && this.combo.active) {
      this.addEntry('Revert', REVERT_PTS);
      this.grace = CONFIG.comboGrace;
    }
  }

  startManual(kind) {
    if (!this.flatEnough() || Math.abs(this.v) < 60) return false;
    const def = MANUALS[kind];
    this.manual = { kind, bal: (Math.random() - 0.5) * 0.2, bv: 0, t: 0, entry: this.addEntry(def.name, def.pts, def.perSec) };
    this.grace = 0;
    this.push = null;
    this.pivot = null;
    this.braking = false;
    this.crouchHeld = false;
    return true;
  }

  // Balance with ← / →: lean toward the nose or the tail to keep the meter centered.
  updateManual(dt) {
    const C = CONFIG, m = this.manual, held = this.held;
    m.t += dt;
    m.entry.time = m.t;
    const fwd = this.facing > 0 ? 'right' : 'left', back = this.facing > 0 ? 'left' : 'right';
    const lean = (held(fwd) ? 1 : 0) - (held(back) ? 1 : 0);
    m.bv += (m.bal * C.manualTip * (1 + m.t * C.manualRamp) + (Math.random() - 0.5) * C.manualNoise + lean * C.manualLean) * dt;
    m.bv *= Math.pow(0.5, dt);
    m.bal += m.bv * dt;
    if (Math.abs(m.bal) > 1) this.startBail('lost balance');
  }

  endManual() {
    this.manual = null;
    this.bankCombo();
  }

  // Roll along the chain, launching off lips and copings.
  advance(dt) {
    const T = this.terrain, segs = T.segs;
    let s = this.s + this.v * dt;
    for (;;) {
      const seg = segs[this.seg];
      if (s > seg.s1) {
        const next = segs[this.seg + 1];
        if (!next) return this.launchOffEnd(seg, 1);
        if (this.convexLaunch(seg, next, 1)) return;
        if (this.hitWall(seg, next, 1)) { if (this.state !== 'ground') return; s = seg.s1 - 0.01; break; }
        this.seg++;
      } else if (s < seg.s0) {
        const prev = segs[this.seg - 1];
        if (!prev) return this.launchOffEnd(seg, -1);
        if (this.convexLaunch(seg, prev, -1)) return;
        if (this.hitWall(seg, prev, -1)) { if (this.state !== 'ground') return; s = seg.s0 + 0.01; break; }
        this.seg--;
      } else break;
    }
    const seg = segs[this.seg];
    this.s = s;
    this.pos = T.pointOnSeg(seg, (s - seg.s0) / seg.len);
    this.ang = seg.ang;
    this.vel = { x: seg.tx * this.v, y: seg.ty * this.v };
  }

  // Rolling fast over a corner that drops away (like a ramp lip) sends you flying,
  // and rolling off a ledge or step drops you whatever your speed.
  convexLaunch(cur, next, dir) {
    const C = CONFIG;
    const drop = -(next.tx * dir * cur.nx + next.ty * dir * cur.ny);
    if (drop < Math.sin(C.launchMinAngle)) return false;
    if (Math.abs(this.v) < C.launchMinSpeed && drop < Math.sin(0.7)) return false;
    const sp = Math.abs(this.v);
    this.pos = dir > 0 ? { ...cur.b } : { ...cur.a };
    this.vel = { x: cur.tx * dir * sp, y: cur.ty * dir * sp };
    this.goAir(false);
    return true;
  }

  // The ground ahead turns up too sharply to ride (a wall, a curb face, the side of a car):
  // bonk off it, or slam into it if you're going fast.
  hitWall(cur, next, dir) {
    const d1x = cur.tx * dir, d1y = cur.ty * dir, d2x = next.tx * dir, d2y = next.ty * dir;
    const turn = Math.atan2(d2x * cur.nx + d2y * cur.ny, d2x * d1x + d2y * d1y);
    if (turn < CONFIG.wallAngle) return false;
    if (Math.abs(this.v) > CONFIG.bonkSpeed) this.startBail('ran into a wall');
    else {
      this.v = -this.v * 0.25;
      this.push = null;
      this.out.push({ type: 'thud', power: 0.3 });
    }
    return true;
  }

  launchOffEnd(seg, dir) {
    const sp = Math.abs(this.v);
    if (!this.terrain.copings.some(c => c.end === dir)) {
      // the top of a wall: nowhere to go
      this.v = 0;
      return;
    }
    const tx = seg.tx * dir, ty = seg.ty * dir;
    this.pos = dir > 0 ? { ...seg.b } : { ...seg.a };
    if (Math.abs(ty) > 0.85) {
      // straight up out of a quarter pipe; you'll come back down onto the coping
      this.vel = { x: 0, y: ty * sp };
      this.goAir(false);
      this.vert = { end: dir, x: this.pos.x, y: this.pos.y, seg: seg.i };
    } else {
      this.vel = { x: tx * sp, y: ty * sp };
      this.goAir(false);
    }
  }

  ollie() {
    const C = CONFIG;
    const charge = clamp(this.crouchTime / C.popChargeTime, 0, 1);
    // an ollie out of a manual keeps the combo going; from plain rolling it starts a new one
    if (!this.manual) this.bankCombo();
    this.popFrom(this.terrain.segs[this.seg], this.v, C.popSpeed + charge * C.popChargeBonus);
  }

  popFrom(surf, v, pop) {
    this.fakie = Math.abs(v) > 30 && Math.sign(v) !== this.facing;
    this.vel = { x: surf.tx * v + surf.nx * pop, y: surf.ty * v + surf.ny * pop };
    this.pos = { x: this.pos.x + surf.nx, y: this.pos.y + surf.ny };
    this.goAir(true);
    this.crouchVel -= 9;
    this.popFx();
    this.out.push({ type: 'pop' });
  }

  goAir(popped) {
    if (!popped) this.fakie = Math.abs(this.v) > 30 && Math.sign(this.v) !== this.facing;
    this.state = 'air';
    this.airTime = 0;
    this.popped = popped;
    this.ollieT = popped ? 0 : 9;
    this.trick = null;
    this.grab = null;
    this.spin = 0;
    this.spinVel = 0;
    this.airEntries = [];
    this.push = null;
    this.pivot = null;
    this.braking = false;
    this.crouchHeld = false;
    this.vert = null;
    this.grind = null;
    this.manual = null;
    this.grace = 0;
    this.slippedOff = null;
    if (!this.chain) this.chain = { entries: [] };
  }

  // ---------------------------------------------------------------- air

  updateAir(dt, events) {
    const C = CONFIG, held = this.held;
    this.airTime += dt;
    this.ollieT += dt;
    for (const e of events) {
      if (e === 'grab') this.startGrab(this.heldDirKey());
      else if (e in SEQ_KEY) {
        if (e === 'up' && !this.popped && this.airTime <= C.coyoteTime) this.latePop();
        else if (held('grab')) this.grabInput(SEQ_KEY[e]);
        else this.trickInput(SEQ_KEY[e]);
      }
    }
    const tr = this.trick;
    if (tr && !tr.done) {
      tr.t += dt;
      if (tr.t >= tr.dur) tr.done = true;
    }
    if (this.grab) {
      if (!held('grab')) this.grab = null; // let go
      else {
        this.grab.t += dt;
        this.grab.entry.time = Math.max(0, this.grab.t - 0.15);
      }
    }
    this.updateSpin(dt);
    if (dt === 0) return;
    if (this.vert) this.updateVert(dt);
    else this.updateFlight(dt);
  }

  heldDirKey() {
    for (const [dir, k] of Object.entries(SEQ_KEY)) if (this.held(dir)) return k;
    return null;
  }

  // Hold Q / E to spin; let go and the spin finishes itself off to the nearest half turn.
  updateSpin(dt) {
    const C = CONFIG, held = this.held;
    const input = (held('spinFront') ? 1 : 0) - (held('spinBack') ? 1 : 0);
    let want;
    if (input) want = input * C.spinSpeed;
    else {
      const target = Math.round((this.spin + this.spinVel * 0.06) / Math.PI) * Math.PI;
      want = clamp((target - this.spin) * C.spinSnap, -C.spinSpeed, C.spinSpeed);
    }
    this.spinVel += clamp(want - this.spinVel, -C.spinAccel * dt, C.spinAccel * dt);
    this.spin += this.spinVel * dt;
  }

  // Ollie just after rolling off a lip still counts.
  latePop() {
    const pop = CONFIG.popSpeed;
    if (this.vert) this.vel.y -= pop * 0.5;
    else {
      this.vel.x += Math.sin(this.ang) * pop * 0.9;
      this.vel.y += -Math.cos(this.ang) * pop * 0.9;
    }
    this.popped = true;
    this.ollieT = 0;
    this.crouchVel -= 9;
    this.popFx();
    this.out.push({ type: 'pop' });
  }

  trickInput(k) {
    const C = CONFIG, tr = this.trick;
    if (this.grab) return; // hands are busy
    if (tr && !tr.done) {
      // second press of a combo flip, like ↓ then → for a tre flip
      if (tr.keys.length === 1 && tr.t <= C.comboWindow && TRICKS[tr.keys + k]) {
        tr.keys += k;
        tr.def = TRICKS[tr.keys];
        tr.dur = tr.def.dur;
        this.renameEntry(tr.entry, this.trickName(tr.def, tr.first), tr.def.pts);
      }
      return;
    }
    const def = TRICKS[k];
    if (!def) return;
    const first = !this.airEntries.some(e => e.flip);
    this.trick = { keys: k, def, t: 0, dur: def.dur, done: false, first };
    this.trick.entry = this.addEntry(this.trickName(def, first), def.pts, 0, { flip: true });
    this.out.push({ type: 'flick' });
  }

  trickName(def, first) {
    return (this.fakie && first ? 'Fakie ' : '') + def.name;
  }

  // Space in the air: grab the board. The arrow you're holding (or press right after) picks the grab.
  startGrab(k) {
    if (this.grab || (this.trick && !this.trick.done)) return;
    const def = GRABS[k || 'R'];
    this.grab = { key: k || 'R', def, t: 0, entry: this.addEntry(def.name, def.pts, GRAB_TWEAK_PTS, { grab: true }) };
    this.lastGrab = def;
  }

  grabInput(k) {
    const g = this.grab;
    if (!g) return this.startGrab(k);
    if (g.t <= CONFIG.comboWindow && k !== g.key) {
      g.key = k;
      g.def = GRABS[k];
      this.lastGrab = g.def;
      this.renameEntry(g.entry, g.def.name, g.def.pts);
    }
  }

  updateFlight(dt) {
    const C = CONFIG, T = this.terrain;
    this.vel.y += C.gravity * dt;
    const p1 = { x: this.pos.x + this.vel.x * dt, y: this.pos.y + this.vel.y * dt };
    const hit = T.sweep(this.pos, p1);
    const rail = T.sweepRails(this.pos, p1);
    if (rail && rail.seg === this.slippedOff && this.airTime < 0.3) rail.skip = true;
    if (rail && !rail.skip && (!hit || rail.t <= hit.t)) {
      this.pos = rail.p;
      this.lockGrind(rail);
      return;
    }
    if (hit) {
      this.pos = hit.p;
      this.land(hit.seg, hit.u);
      return;
    }
    this.pos = p1;

    // Flying past a coping: drop back in along the quarter pipe.
    for (const { end, pt, seg } of T.copings) {
      if ((p1.x - pt.x) * end < -0.5) continue;
      if (p1.y < pt.y) {
        this.pos.x = pt.x;
        this.vel.x = 0;
        this.vert = { end, x: pt.x, y: pt.y, seg };
      } else {
        this.pos.x = pt.x - end * 0.5;
        this.vel.x = end > 0 ? Math.min(0, this.vel.x) : Math.max(0, this.vel.x);
      }
    }

    const below = T.surfaceBelow(this.pos.x, this.pos.y);
    this.alignTo(below ? below.ang : 0, dt);
    if (this.pos.y > 1500) this.startBail('fell off the world');
  }

  updateVert(dt) {
    const C = CONFIG, seg = this.terrain.segs[this.vert.seg];
    this.vel.x = 0;
    this.vel.y += C.gravity * dt;
    this.pos.x = this.vert.x;
    this.pos.y += this.vel.y * dt;
    this.alignTo(seg.ang, dt);
    if (this.vel.y > 0 && this.pos.y >= this.vert.y) {
      this.pos.y = this.vert.y;
      const end = this.vert.end;
      this.land(seg, end > 0 ? 1 : 0, -end * Math.abs(this.vel.y));
    }
  }

  alignTo(target, dt) {
    const r = CONFIG.autoAlignRate * dt;
    this.ang += clamp(wrapAngle(target - this.ang), -r, r);
  }

  // Checks a touchdown (ground or rail). Bails if the board isn't under your feet; otherwise
  // finishes the air's tricks and returns the key of a flip that was pressed too late to count
  // (which becomes a manual or picks a grind instead).
  finishAir(surfAng, buffer) {
    const C = CONFIG, tr = this.trick, g = this.grab;
    let why = null, late = null;
    if (tr && !tr.done) {
      if (tr.t < buffer) { late = tr.keys[0]; this.dropEntry(tr.entry); this.trick = null; }
      else if (tr.t / tr.dur >= C.lateCatch) { tr.done = true; tr.entry.sloppy = true; }
      else why = 'board still flipping';
    }
    if (!why && g) {
      if (g.t < C.landBuffer) this.dropEntry(g.entry);
      else why = 'still grabbing';
    }
    const halves = Math.round(this.spin / Math.PI);
    const off = this.spin - halves * Math.PI;
    if (!why && Math.abs(off) > C.spinTolerance) why = Math.abs(this.spin) % Math.PI < Math.PI / 2 ? 'over-rotated' : 'under-rotated';
    if (!why && Math.abs(wrapAngle(this.ang - surfAng)) > C.landAngleTolerance) why = 'landed crooked';
    if (why) { this.startBail(why); return null; }

    if (halves !== 0) {
      this.addSpin(halves);
      if (halves % 2) this.facing = -this.facing;
    }
    this.spin = 0;
    this.spinVel = 0;
    this.trick = null;
    this.grab = null;
    this.out.push({ type: 'land', airTime: this.airTime, impact: clamp(this.vel.y / 900, 0, 1), onRail: buffer === C.grindBuffer });
    return { late };
  }

  // "FS 180", or merged into a single flip trick: "BS 360 Kickflip".
  addSpin(halves) {
    const side = halves > 0 ? 'FS' : 'BS', deg = Math.abs(halves) * 180;
    const pts = SPIN_PTS[Math.min(Math.abs(halves), SPIN_PTS.length - 1)];
    const flips = this.airEntries.filter(e => e.flip);
    if (flips.length === 1 && !this.airEntries.some(e => e.grab)) {
      const e = flips[0], fakie = e.name.startsWith('Fakie ');
      this.renameEntry(e, `${fakie ? 'Fakie ' : ''}${side} ${deg} ${fakie ? e.name.slice(6) : e.name}`, e.base + pts);
    } else {
      this.addEntry(`${this.fakie ? 'Fakie ' : ''}${side} ${deg}`, pts);
    }
  }

  land(seg, u, along) {
    const C = CONFIG;
    const res = this.finishAir(seg.ang, Math.max(C.landBuffer, C.manualBuffer));
    if (!res) return;
    const impact = along === undefined ? Math.max(0, -(this.vel.x * seg.nx + this.vel.y * seg.ny)) : 300;
    this.state = 'ground';
    this.vert = null;
    this.seg = seg.i;
    this.s = seg.s0 + u * seg.len;
    this.v = along ?? this.vel.x * seg.tx + this.vel.y * seg.ty;
    this.ang = seg.ang;
    this.pos = this.terrain.pointOnSeg(seg, u);
    this.crouchVel += Math.min(impact, 1600) * 0.009;
    this.dustFx(Math.min(1, impact / 900));
    // ↓ (or ↑) pressed just before touching down: roll away in a manual (or nose manual)
    this.endChain(true);
    const manual = res.late === 'D' ? 'manual' : res.late === 'U' ? 'nose' : null;
    if (!(manual && this.startManual(manual))) this.grace = C.comboGrace;
  }

  // ---------------------------------------------------------------- grinds

  lockGrind(hit) {
    const C = CONFIG, rail = hit.seg;
    const res = this.finishAir(rail.ang, C.grindBuffer);
    if (!res) return;
    const fwd = this.facing > 0 ? 'right' : 'left', back = this.facing > 0 ? 'left' : 'right';
    const isDown = d => this.held(d) || (res.late && KEY_DIR[res.late] === d);
    const kind = isDown(fwd) ? 'fwd' : isDown(back) ? 'back' : isDown('down') ? 'down' : isDown('up') ? 'up' : 'none';
    const def = GRINDS[kind];
    this.state = 'grind';
    this.ang = rail.ang;
    this.grind = { rail, s: hit.u * rail.len, v: this.vel.x * rail.tx + this.vel.y * rail.ty, kind, t: 0 };
    this.grind.entry = this.addEntry(def.name, def.pts, def.perSec);
    this.crouchVel += 4;
    this.sparkFx(8);
    this.out.push({ type: 'grindStart' });
  }

  updateGrind(dt, events) {
    const C = CONFIG, g = this.grind;
    if (events.includes('up')) {
      this.grind = null;
      this.popFrom(g.rail, g.v, C.popSpeed * 0.9); // ollie out, combo keeps going
      return;
    }
    g.v += C.gravity * g.rail.ty * dt;
    const fr = C.grindFriction * dt;
    g.v = Math.abs(g.v) <= fr ? 0 : g.v - Math.sign(g.v) * fr;
    g.s += g.v * dt;
    g.t += dt;
    g.entry.time = g.t;
    // follow the rail around its kinks
    const smooth = (a, b) => Math.abs(wrapAngle(a.ang - b.ang)) < 0.8;
    while (g.s > g.rail.len && g.rail.next && smooth(g.rail, g.rail.next)) { g.s -= g.rail.len; g.rail = g.rail.next; }
    while (g.s < 0 && g.rail.prev && smooth(g.rail, g.rail.prev)) { g.rail = g.rail.prev; g.s += g.rail.len; }
    const r = g.rail;
    this.ang = r.ang;
    const s = clamp(g.s, 0, r.len);
    this.pos = { x: r.a.x + r.tx * s, y: r.a.y + r.ty * s };
    this.vel = { x: r.tx * g.v, y: r.ty * g.v };
    this.v = g.v;
    if (Math.random() < 0.6) this.sparkFx(1);
    if (g.s < 0 || g.s > r.len || Math.abs(g.v) < C.grindMinSpeed) {
      // off the end (or too slow to stay on): back into the air, combo still going
      this.grind = null;
      this.goAir(false);
      this.slippedOff = r; // don't instantly lock back onto the rail you slid off
    }
  }

  // ---------------------------------------------------------------- bails

  startBail(why) {
    // the ragdoll starts from exactly the pose you were in, moving the way you were moving
    const pose = riderPose(this);
    const rag = new Ragdoll(pose.fig, pose.board, this.vel, this.facing, power => this.out.push({ type: 'thud', power }));
    this.bail = { t: 0, why, rag, body: { x: rag.hip.x, y: rag.hip.y, vx: rag.hip.vx, vy: rag.hip.vy } };
    if (this.combo.active) this.out.push({ type: 'comboLost', names: this.combo.names() });
    this.combo.reset();
    this.endChain(false);
    this.state = 'bail';
    this.trick = null;
    this.grab = null;
    this.grind = null;
    this.manual = null;
    this.spin = 0;
    this.spinVel = 0;
    this.grace = 0;
    this.vert = null;
    this.out.push({ type: 'bail', why });
    this.dustFx(0.8);
  }

  updateBail(dt, events) {
    const C = CONFIG, b = this.bail, hip = b.rag.hip;
    b.t += dt;
    b.rag.step(dt, this.terrain);
    b.body = { x: hip.x, y: hip.y, vx: hip.vx, vy: hip.vy }; // for the camera
    this.pos = { x: hip.x, y: hip.y };
    if (b.t > C.bailResetTime || (events.length && b.t > C.bailSkipTime)) this.recover();
  }

  recover() {
    const T = this.terrain, b = this.bail;
    const near = T.closest(b.body.x, b.body.y);
    this.respawn(T.flatNear(near.s));
    this.out.push({ type: 'recover' });
  }

  // ---------------------------------------------------------------- body & effects

  // Crouch is a springy 0..1 value: 0 standing tall, 1 deep crouch.
  updateBody(dt) {
    let target;
    if (this.state === 'air') target = this.grab ? 1 : this.trick && !this.trick.done ? 0.85 : 0.55;
    else if (this.state === 'grind') target = 0.6;
    else if (this.manual) target = 0.3;
    else if (this.crouchHeld) target = 1;
    else if (this.push) target = 0.35;
    else target = 0.2 + Math.min(0.15, Math.abs(this.v) / 3000);
    this.crouchVel += (180 * (target - this.crouch) - 20 * this.crouchVel) * dt;
    this.crouch = clamp(this.crouch + this.crouchVel * dt, -0.15, 1.15);
    const airTarget = this.state === 'air' ? 1 : this.state === 'grind' ? 0.6 : 0;
    this.airAmt += (airTarget - this.airAmt) * Math.min(1, dt * (airTarget ? 7 : 12));
    const grabTarget = this.grab ? 1 : 0;
    this.grabAmt += (grabTarget - this.grabAmt) * Math.min(1, dt * (grabTarget ? 14 : 18));
  }

  popFx() {
    const N = { x: Math.sin(this.ang), y: -Math.cos(this.ang) };
    const T = { x: Math.cos(this.ang) * this.facing, y: Math.sin(this.ang) * this.facing };
    const tail = { x: this.pos.x - T.x * 38, y: this.pos.y - T.y * 38 };
    for (let i = 0; i < 3; i++) {
      const a = Math.PI + (i - 1) * 0.5;
      const dx = Math.cos(a) * T.x - Math.sin(a) * N.x, dy = Math.cos(a) * T.y - Math.sin(a) * N.y;
      this.fx.push({ kind: 'line', x: tail.x, y: tail.y, dx, dy, life: 0, max: 0.18 });
    }
  }

  dustFx(power) {
    for (let i = 0; i < 4 + power * 6; i++) {
      const side = i % 2 ? 1 : -1;
      this.fx.push({
        kind: 'dust', x: this.pos.x + side * 20, y: this.pos.y - 3,
        vx: side * (40 + Math.random() * 120 * (0.5 + power)), vy: -20 - Math.random() * 60,
        r: 4 + Math.random() * 6 * (0.5 + power), life: 0, max: 0.35 + Math.random() * 0.3,
      });
    }
  }

  sparkFx(n) {
    for (let i = 0; i < n; i++) {
      this.fx.push({
        kind: 'spark', x: this.pos.x, y: this.pos.y,
        vx: -this.vel.x * (0.2 + Math.random() * 0.4) + (Math.random() - 0.5) * 120,
        vy: -60 - Math.random() * 160, life: 0, max: 0.18 + Math.random() * 0.2,
      });
    }
  }

  updateFx(dt) {
    for (const f of this.fx) {
      f.life += dt;
      if (f.kind === 'dust') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.92; f.vy *= 0.92; }
      if (f.kind === 'spark') { f.vy += CONFIG.gravity * 0.6 * dt; f.x += f.vx * dt; f.y += f.vy * dt; }
    }
    this.fx = this.fx.filter(f => f.life < f.max);
    if (this.braking && Math.abs(this.v) > 150 && Math.random() < 0.3) {
      this.fx.push({ kind: 'dust', x: this.pos.x - Math.cos(this.ang) * this.facing * 40, y: this.pos.y - 2,
        vx: -this.v * 0.1, vy: -30, r: 3, life: 0, max: 0.3 });
    }
  }
}

// Drawing the world: terrain, board, skater and effects, all in the hand-drawn style.
//
// The board is a small 3D model seen from the side with the camera tilted slightly down,
// so you can tell griptape from graphic and a kickflip actually rolls while a shove-it spins flat.

const TAU = Math.PI * 2;
const CAM_TILT = 0.32;

const INK = '#1c1c1c';
const COLORS = {
  concrete: '#d8d3c8',
  hatch: 'rgba(90, 84, 74, 0.22)',
  wood: '#c99a5b',
  truck: '#9aa0a6',
  coping: '#b9bfc6',
};

// ---------------------------------------------------------------- board model

const DECK_L = 84, DECK_W = 22, DECK_TH = 3, TAIL = 17, TAIL_RISE = 8;
const TRUCK_L = 28, AXLE_N = -9, WHEEL_W = 8, WHEEL_R = 4.5;

const deckLift = l => {
  const e = Math.abs(l) - (DECK_L / 2 - TAIL);
  return e > 0 ? TAIL_RISE * Math.pow(e / TAIL, 1.6) : 0;
};
const deckTopN = l => deckLift(l) + DECK_TH / 2;

const DECK = (() => {
  const r = DECK_W / 2, k = 7, pts = [];
  const sideLs = [DECK_L / 2 - r, 26, 12, 0, -12, -26, -(DECK_L / 2 - r)];
  for (let i = 0; i <= k; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / k;
    pts.push([DECK_L / 2 - r + r * Math.cos(a), r * Math.sin(a)]);
  }
  for (const l of sideLs.slice(1, -1)) pts.push([l, r]);
  for (let i = 0; i <= k; i++) {
    const a = Math.PI / 2 + (Math.PI * i) / k;
    pts.push([-DECK_L / 2 + r + r * Math.cos(a), r * Math.sin(a)]);
  }
  for (const l of sideLs.slice(1, -1).reverse()) pts.push([l, -r]);
  return pts.map(([l, w]) => ({ l, w, n: deckLift(l) }));
})();

// Board-local (l along the nose, n up, w toward the camera) -> world position + depth.
// Rotation order: flip (roll), then shove-it (yaw), then pitch around a pivot.
function boardXform(B) {
  const cr = Math.cos(B.roll), sr = Math.sin(B.roll);
  const cy = Math.cos(B.yaw), sy = Math.sin(B.yaw);
  const cp = Math.cos(B.pitch), sp = Math.sin(B.pitch);
  const ce = Math.cos(CAM_TILT), se = Math.sin(CAM_TILT);
  const tx = Math.cos(B.ang) * B.facing, ty = Math.sin(B.ang) * B.facing;
  const nx = Math.sin(B.ang), ny = -Math.cos(B.ang);
  return (l, n, w, dirOnly = false) => {
    const n1 = n * cr - w * sr, w1 = n * sr + w * cr;
    const l2 = l * cy - w1 * sy, w2 = l * sy + w1 * cy;
    const pl = dirOnly ? 0 : B.pivotL, pn = dirOnly ? 0 : B.pivotN;
    const dl = l2 - pl, dn = n1 - pn;
    const l3 = dl * cp - dn * sp + pl, n3 = dl * sp + dn * cp + pn;
    const up = n3 * ce - w2 * se, depth = w2 * ce + n3 * se;
    const ox = dirOnly ? 0 : B.cx, oy = dirOnly ? 0 : B.cy;
    return { x: ox + tx * l3 + nx * up, y: oy + ty * l3 + ny * up, d: depth };
  };
}

// Bottom-of-the-board art, in board-local (l, w) coordinates.
const BOARD_ART = {
  band: [[[-9, -9], [6, -9], [9, 9], [-6, 9]]],
  stripes: [[[-16, -10], [-11, -10], [-11, 10], [-16, 10]], [[11, -10], [16, -10], [16, 10], [11, 10]]],
  flame: [[[-30, -8], [-14, -8], [-4, -3], [-12, 0], [4, 2], [-8, 5], [10, 8], [-30, 8]]],
  dots: [[-22, 0], [-8, -4], [6, 3], [20, -2]].map(([l, w]) => {
    const pts = [];
    for (let i = 0; i < 8; i++) pts.push([l + Math.cos(i * TAU / 8) * 4, w + Math.sin(i * TAU / 8) * 4]);
    return pts;
  }),
  checker: (() => {
    const squares = [];
    for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) {
      if ((i + j) % 2) continue;
      const l = -28 + i * 7, w = -9 + j * 9;
      squares.push([[l, w], [l + 7, w], [l + 7, w + 9], [l, w + 9]]);
    }
    return squares;
  })(),
  rainbow: [0, 1, 2, 3, 4, 5].map(i => { const l = -27 + i * 9; return [[l, -10], [l + 9, -10], [l + 9, 10], [l, 10]]; }),
  bolt: [[[-28, -6], [-3, -9], [-7, -2], [26, -5], [1, 9], [4, 2], [-28, 5]]],
  stars: [[-24, -3, 4], [-10, 5, 3], [4, -5, 5], [18, 3, 3], [27, -4, 2.5]].map(([l, w, r]) => {
    const pts = [];
    for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.35 : r; pts.push([l + Math.cos(i * TAU / 8) * rr, w + Math.sin(i * TAU / 8) * rr]); }
    return pts;
  }),
  // crossed bones, then the skull on top, then its eyes (colour them with artColors).
  // Seen from below with the board level, +w is up.
  skull: [...[0.42, -0.42].map(a => bonePts(a)), rectPts(-4, -7.5, 4, -3), circPts(0, 2, 7), circPts(-2.8, 2, 2), circPts(2.8, 2, 2)],
};

// Shapes cut out of the griptape, in board-local (l, w). `grip: true` parts are griptape again
// (a smiley's eyes), the rest show the wood. Looking down at the grip, -w is up.
const GRIP_CUTS = {
  stripe: [{ pts: rectPts(-2.5, -10.5, 2.5, 10.5) }],
  line: [{ pts: rectPts(-34, -1.4, 34, 1.4) }],
  bars: [{ pts: rectPts(-13, -10.5, -9, 10.5) }, { pts: rectPts(9, -10.5, 13, 10.5) }],
  smiley: [{ pts: circPts(0, 0, 7.5, 14) }, { pts: circPts(-2.6, -2.5, 1.3), grip: true }, { pts: circPts(2.6, -2.5, 1.3), grip: true },
    { pts: arcBand(0, 0, 3.4, 4.8, Math.PI / 2 - 1.1, Math.PI / 2 + 1.1), grip: true }],
  heart: [{ pts: Array.from({ length: 20 }, (_, i) => {
    const t = (i / 20) * TAU;
    return [16 * Math.sin(t) ** 3 * 0.42, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 0.42 - 1];
  }) }],
  star: [{ pts: Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * TAU - Math.PI / 2, r = i % 2 ? 3.4 : 8.5;
    return [Math.cos(a) * r, Math.sin(a) * r];
  }) }],
  bolt: [{ pts: [[5, -8.5], [-3, -0.5], [1.5, -0.5], [-5, 8.5], [3, 0.5], [-1.5, 0.5]] }],
  cross: [{ pts: plusPts(0) }],
  x: [{ pts: plusPts(Math.PI / 4) }],
  diamond: [{ pts: [[10, 0], [0, 6.5], [-10, 0], [0, -6.5]] }],
  skull: [{ pts: rectPts(-3.5, 3, 3.5, 8) }, { pts: circPts(0, -1.5, 6.5) },{ pts: circPts(-2.4, -1.5, 1.7), grip: true }, { pts: circPts(2.4, -1.5, 1.7), grip: true }],
};

function rectPts(l0, w0, l1, w1) { return [[l0, w0], [l1, w0], [l1, w1], [l0, w1]]; }
function circPts(l, w, r, k = 10) { return Array.from({ length: k }, (_, i) => [l + Math.cos((i / k) * TAU) * r, w + Math.sin((i / k) * TAU) * r]); }
function arcBand(l, w, r0, r1, a0, a1, k = 6) {
  const pt = (r, a) => [l + Math.cos(a) * r, w + Math.sin(a) * r], out = [], back = [];
  for (let i = 0; i <= k; i++) { const a = a0 + ((a1 - a0) * i) / k; out.push(pt(r1, a)); back.unshift(pt(r0, a)); }
  return out.concat(back);
}
function plusPts(rot) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return [[-2, -7], [2, -7], [2, -2], [8, -2], [8, 2], [2, 2], [2, 7], [-2, 7], [-2, 2], [-8, 2], [-8, -2], [-2, -2]]
    .map(([l, w]) => [l * c - w * s, l * s + w * c]);
}
function bonePts(a) {
  const c = Math.cos(a), s = Math.sin(a), L = 21, W = 1.8;
  return [[-L, -W], [L, -W], [L, W], [-L, W]].map(([l, w]) => [l * c - w * s, l * s + w * c]);
}

// Little flecks in patterned griptape (camo, galaxy...), spread over the deck.
const GRIP_SPECKS = Array.from({ length: 30 }, (_, i) => {
  const r = k => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); }; // scattered, but the same every time
  return [-36 + r(1) * 72, -9 + r(2) * 18];
});

function drawBoard(ctx, B) {
  Sketch.seedFor(20);
  const look = Outfit.get('board');
  const X = boardXform(B);
  const gripShowing = X(0, 1, 0, true).d > 0;
  const top = DECK.map(p => X(p.l, p.n + DECK_TH / 2, p.w));
  const bot = DECK.map(p => X(p.l, p.n - DECK_TH / 2, p.w));
  const line = { color: INK, width: 1.8, amp: 0.45, maxLen: 14 };

  const running = () => {
    const wheels = [];
    for (const l of [-TRUCK_L, TRUCK_L]) {
      const base = X(l, -DECK_TH / 2, 0), axle = X(l, AXLE_N, 0);
      Sketch.limb(ctx, [base, axle], 2.5, COLORS.truck, { amp: 0.2 });
      Sketch.stroke(ctx, [X(l, AXLE_N, -WHEEL_W), X(l, AXLE_N, WHEEL_W)], { color: INK, width: 2, amp: 0.2, passes: 1, maxLen: 0 });
      for (const w of [-WHEEL_W, WHEEL_W]) wheels.push(X(l, AXLE_N, w));
    }
    wheels.sort((a, b) => a.d - b.d);
    for (const p of wheels) Sketch.circle(ctx, p.x, p.y, WHEEL_R, look.wheel, { width: 1.6, amp: 0.3 });
  };

  if (gripShowing) {
    running();
    Sketch.shape(ctx, bot, COLORS.wood, line);
    const tape = Outfit.get('grip'), cut = Outfit.get('cutout');
    const gripColor = tape?.color || look.grip;
    Sketch.shape(ctx, top, gripColor, line);
    const onTop = (l, w) => X(l, deckTopN(l) + 0.15, w);
    if (tape?.speckle) GRIP_SPECKS.forEach(([l, w], i) => {
      const p = onTop(l, w);
      ctx.fillStyle = tape.speckle[i % tape.speckle.length];
      ctx.fillRect(p.x - 0.8, p.y - 0.8, 1.6, 1.6);
    });
    if (cut?.cut) for (const part of GRIP_CUTS[cut.cut]) {
      Sketch.shape(ctx, part.pts.map(([l, w]) => onTop(l, w)), part.grip ? gripColor : COLORS.wood, { ...line, width: 1, amp: 0.2 });
    }
  } else {
    Sketch.shape(ctx, top, COLORS.wood, line);
    Sketch.shape(ctx, bot, look.graphic, line);
    const n = -DECK_TH / 2 - 0.2;
    BOARD_ART[look.art].forEach((art, i) => {
      const color = look.artColors ? look.artColors[i % look.artColors.length] : look.accent;
      Sketch.shape(ctx, art.map(([l, w]) => X(l, n, w)), color, { ...line, width: 1.2 });
    });
    running();
  }
}

// ---------------------------------------------------------------- skater pose

const THIGH = 25, SHIN = 25, TORSO = 33, HEAD_R = 11, UPPER_ARM = 17, FOREARM = 16;

const add = (a, b, k = 1) => ({ x: a.x + b.x * k, y: a.y + b.y * k });
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);

// Two-bone limb (leg or arm): bends the middle joint toward `bendDir`. Returns it and the (reachable) end.
function solve2(root, end, l1, l2, bendDir) {
  let dx = end.x - root.x, dy = end.y - root.y;
  let d = Math.hypot(dx, dy) || 0.001;
  const maxD = l1 + l2 - 0.5;
  if (d > maxD) { dx *= maxD / d; dy *= maxD / d; d = maxD; }
  const ux = dx / d, uy = dy / d;
  const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const cands = [a, -a].map(s => ({
    x: root.x + (ux * Math.cos(s) - uy * Math.sin(s)) * l1,
    y: root.y + (ux * Math.sin(s) + uy * Math.cos(s)) * l1,
  }));
  const score = k => (k.x - root.x) * bendDir.x + (k.y - root.y) * bendDir.y;
  return { mid: score(cands[0]) > score(cands[1]) ? cands[0] : cands[1], end: { x: root.x + dx, y: root.y + dy } };
}

function solveLeg(hip, foot, bendDir) {
  const r = solve2(hip, foot, THIGH, SHIN, bendDir);
  return { knee: r.mid, foot: r.end };
}

// How the board sits on a rail for each grind, relative to the contact point:
// shift along the nose, height above the rail, and yaw / pitch around a pivot.
const GRIND_POSE = {
  none: { shift: 0, up: 8.5, yaw: 0, pitch: 0, pivotL: 0 },
  back: { shift: TRUCK_L, up: 8.5, yaw: 0, pitch: 0.28, pivotL: -TRUCK_L },  // 5-0: back truck only
  fwd:  { shift: -TRUCK_L, up: 8.5, yaw: 0, pitch: -0.28, pivotL: TRUCK_L }, // nosegrind: front truck only
  down: { shift: 0, up: 3, yaw: 1.15, pitch: 0, pivotL: 0 },                 // boardslide: deck across the rail
  up:   { shift: -TRUCK_L - 4, up: 7, yaw: 0.45, pitch: -0.3, pivotL: TRUCK_L }, // crooked: angled on the nose
  dark: { shift: 0, up: 4, yaw: 0, pitch: 0, pivotL: 0, flip: Math.PI },      // darkslide: board upside down
};

function trickRotation(sk) {
  const tr = sk.trick;
  if (!tr) return { roll: 0, yaw: 0, imp: 0, p: 1, active: false };
  const p = tr.done ? 1 : Math.min(1, tr.t / tr.dur);
  const e = 1 - (1 - p) * (1 - p); // fast flick, slowing into the catch
  const stance = sk.goofy ? -1 : 1; // goofy riders flick the other way
  return {
    roll: tr.def.flip * TAU * e * sk.facing * stance,
    yaw: tr.def.shuv * Math.PI * e * sk.facing * stance,
    imp: (tr.def.imp || 0) * TAU * e,
    p, active: !tr.done, def: tr.def,
  };
}

function riderPose(sk) {
  const C = CONFIG, A = sk.ang;
  const N = { x: Math.sin(A), y: -Math.cos(A) };
  const T = { x: Math.cos(A), y: Math.sin(A) };

  // board pitch from the ollie snap, braking and kick turns
  let pitch = 0;
  if (sk.ollieT < 0.3) {
    const o = sk.ollieT < 0.05 ? sk.ollieT / 0.05 : Math.max(0, 1 - (sk.ollieT - 0.05) / 0.22);
    pitch += C.olliePitch * smooth(o);
  }
  const slide = sk.ollieT < 0.3 ? Math.sin(Math.min(1, sk.ollieT / 0.22) * Math.PI) : 0;
  if (sk.braking) pitch += 0.13;
  let pivotYaw = 0;
  if (sk.pivot) {
    const e = smooth(sk.pivot.t / C.pivotDuration);
    pivotYaw = Math.PI * e * sk.facing;
    pitch += 0.24 * Math.sin(Math.PI * e);
  }
  // how far the rider has turned around (kick turn or air spin); seen from the side,
  // turning squashes the body toward the camera and then mirrors it
  const turn = pivotYaw + sk.spin * (sk.goofy ? -1 : 1); // goofy spins the mirror way round
  const nose = { x: T.x * sk.facing, y: T.y * sk.facing };

  // where the board rides: on its wheels, on a rail, or up on two wheels in a manual
  let ride = add(sk.pos, N, HB), yaw = 0, roll = 0, pivotL = -TRUCK_L, pivotN = -HB, flip = 0;
  if (sk.state === 'grind') {
    const gp = GRIND_POSE[sk.grind.kind];
    flip = gp.flip || 0; // only the board turns over; the feet stay on top
    ride = add(add(sk.pos, N, gp.up), nose, gp.shift);
    yaw = gp.yaw * sk.facing;
    pitch = gp.pitch;
    pivotL = gp.pivotL;
    pivotN = -gp.up;
  } else if (sk.manual) {
    const noseDown = sk.manual.kind === 'nose';
    pitch += (noseDown ? -0.26 : 0.26) + sk.manual.bal * 0.08;
    pivotL = noseDown ? TRUCK_L : -TRUCK_L;
  }

  // grabs pull the board up to your hand and tweak it
  const grab = sk.grab ? sk.grab.def : sk.lastGrab, ga = grab ? sk.grabAmt : 0;
  const christ = grab?.christ ? ga : 0; // how far into a Christ Air (see below)
  let center = ride;
  if (ga > 0.01) {
    center = add(ride, N, (christ ? 0 : 15) * ga);
    roll += grab.roll * sk.facing * ga;
    pitch += grab.pitch * ga;
  }

  const control = { cx: center.x, cy: center.y, ang: A, facing: sk.facing, roll, yaw: yaw + turn, pitch, pivotL, pivotN };
  const rot = trickRotation(sk);
  const lift = rot.active ? Math.sin(rot.p * Math.PI) * 7 : 0;
  const board = {
    ...control, cx: center.x + N.x * lift, cy: center.y + N.y * lift,
    roll: roll + rot.roll + flip, yaw: control.yaw + rot.yaw, pitch: pitch + rot.imp,
  };

  // Feet ride the board unless a flip is in progress, then they hover while it spins under them.
  const F = { x: nose.x * Math.cos(turn), y: nose.y * Math.cos(turn) };
  const Xrest = boardXform(control);
  const frontL = 17 + 10 * slide, backL = -31;
  const ANKLE = 4; // ankles sit a little above the griptape
  let front = add(Xrest(frontL, deckTopN(frontL), 0), N, ANKLE);
  let back = add(Xrest(backL, deckTopN(backL), 0), N, ANKLE);
  if (rot.active) {
    const up = rot.p < 0.12 ? rot.p / 0.12 : rot.p > 0.7 ? (1 - rot.p) / 0.3 : 1;
    const kick = rot.def.flip ? 1 : 0, scoop = rot.def.shuv ? 1 : 0;
    front = add(add(front, N, 17 * up), F, 8 * kick * up);
    back = add(add(back, N, 14 * up), F, -6 * scoop * up);
  }

  // Pushing: the back foot steps off, shoves along the ground, and comes back.
  let pushT = 0;
  if (sk.push) {
    pushT = sk.push.t / C.pushDuration;
    const ground = l => add(add(sk.pos, F, l), N, ANKLE);
    let foot;
    if (pushT < 0.25) {
      const k = smooth(pushT / 0.25);
      const g = ground(6);
      foot = { x: lerp(back.x, g.x, k), y: lerp(back.y, g.y, k) };
      foot = add(foot, N, Math.sin(k * Math.PI) * 8);
    } else if (pushT < 0.7) {
      foot = ground(lerp(6, -46, (pushT - 0.25) / 0.45));
    } else {
      const k = smooth((pushT - 0.7) / 0.3);
      const g = ground(-46);
      foot = add({ x: lerp(g.x, back.x, k), y: lerp(g.y, back.y, k) }, N, Math.sin(k * Math.PI) * 12);
    }
    back = foot;
  }
  const pushBob = sk.push ? Math.sin(Math.min(1, pushT / 0.7) * Math.PI) : 0;

  // Hips, torso and head
  const crouch = clamp(sk.crouch, -0.1, 1.1);
  const hipH = lerp(44, 25, crouch) - pushBob * 7;
  const hip = add(add(ride, N, 2 + hipH), F, -7 + pushBob * 5);
  let lean = 0.14 + Math.min(0.12, Math.abs(sk.v) / 4000) + pushBob * 0.25;
  if (sk.braking) lean -= 0.25;
  if (sk.manual) lean += sk.manual.bal * 0.45;
  lean = lerp(lean, 0.06 + (rot.active ? 0.18 : 0), sk.airAmt) + 0.4 * ga;
  lean = lerp(lean, -0.04, christ); // standing tall in a Christ Air
  const torsoDir = add({ x: N.x * Math.cos(lean), y: N.y * Math.cos(lean) }, F, Math.sin(lean));
  const neck = add(hip, torsoDir, TORSO);
  const shoulder = add(add(hip, torsoDir, TORSO - 6), F, 1);
  const head = add(add(neck, torsoDir, HEAD_R + 4), F, 2);

  // Christ Air: the board comes off your feet, held up on end at arm's length out in front,
  // and your legs hang straight down together, making a cross with your spread arms.
  if (christ > 0.01) {
    const held = add(add(shoulder, torsoDir, 12), F, 29);
    board.cx = lerp(board.cx, held.x, christ);
    board.cy = lerp(board.cy, held.y, christ);
    board.pitch += 1.45 * christ;
    board.pivotL = lerp(board.pivotL, 0, christ); // turned on end around its middle, not a truck
    board.pivotN = lerp(board.pivotN, 0, christ);
    const down = { x: -N.x, y: -N.y };
    front = mix(front, add(add(hip, down, 47), F, 2.5), christ);
    back = mix(back, add(add(hip, down, 46), F, -2.5), christ);
  }
  const legs = {
    front: solveLeg(hip, front, F),
    back: solveLeg(hip, back, F),
  };

  // Arms: angles measured from straight down, positive toward the front. Elbows only bend one
  // way, so the forearm always turns toward the front from the upper arm (a positive bend).
  const sway = Math.sin(sk.time * 2.2) * 0.06;
  const swing = sk.push ? Math.sin(pushT * TAU) : 0;
  const air = sk.airAmt;
  const armAng = {
    back: lerp(-0.55 + sway + swing * 0.5, -1.9, air),
    front: lerp(0.45 - sway - swing * 0.4, 1.6, air),
    backBend: lerp(0.5, 0.75, air),
    frontBend: lerp(0.55, 0.6, air),
  };
  // spread out straight behind you in a Christ Air
  armAng.back = lerp(armAng.back, -1.65, christ);
  armAng.backBend = lerp(armAng.backBend, 0.08, christ);
  const D = { x: -torsoDir.x, y: -torsoDir.y };
  const armDir = th => add({ x: D.x * Math.cos(th), y: D.y * Math.cos(th) }, F, Math.sin(th));
  const arm = (th, bend) => {
    const elbow = add(shoulder, armDir(th), UPPER_ARM);
    return [shoulder, elbow, add(elbow, armDir(th + bend), FOREARM)];
  };
  let backArm = arm(armAng.back, armAng.backBend), frontArm = arm(armAng.front, armAng.frontBend);

  // the grabbing hand reaches the right edge of the board (toe side for an Indy, heel side for a Melon...)
  if (ga > 0.5) {
    const X = boardXform(board);
    const target = X(grab.l, -DECK_TH / 2, grab.side * sk.facing * DECK_W * 0.45);
    // reaching down to the board, the elbow points back, whichever hand it is
    const r = solve2(shoulder, target, UPPER_ARM, FOREARM, { x: -F.x, y: -F.y });
    if (grab.hand === 'front') frontArm = [shoulder, r.mid, r.end];
    else backArm = [shoulder, r.mid, r.end];
  }

  return {
    board,
    // flow: how much capes and scarves stream out behind you
    fig: { hip, neck, shoulder, head, torsoDir, F, legs, backArm, frontArm, flow: clamp(Math.hypot(sk.vel.x, sk.vel.y) / 900, 0.1, 1) },
  };
}

// The manual balance meter: an arc over your head with a marker that you keep in the middle.
function drawBalance(ctx, sk, fig) {
  const m = sk.manual, N = { x: Math.sin(sk.ang), y: -Math.cos(sk.ang) };
  const c = add(fig.head, N, 34), ua = Math.atan2(N.y, N.x);
  Sketch.seedFor(80);
  Sketch.stroke(ctx, arcPts(c, 26, ua - 0.9, ua + 0.9, 12), { color: INK, width: 3, amp: 0.5, passes: 1, maxLen: 0 });
  const danger = Math.abs(m.bal);
  const a = ua + clamp(m.bal, -1, 1) * 0.9 * sk.facing;
  const dot = { x: c.x + Math.cos(a) * 26, y: c.y + Math.sin(a) * 26 };
  Sketch.circle(ctx, dot.x, dot.y, 5, danger > 0.7 ? '#ef5a4a' : danger > 0.4 ? '#f4c542' : '#7fd36b', { width: 2 });
}

// ---------------------------------------------------------------- outfit drawing

const mix = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
const arcPts = (c, r, a0, a1, k = 10) => {
  const pts = [];
  for (let i = 0; i <= k; i++) {
    const a = a0 + ((a1 - a0) * i) / k;
    pts.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });
  }
  return pts;
};
const HAT_LINE = { color: INK, width: 2, amp: 0.4, maxLen: 8 };
const thin = (color, width = 1.4) => ({ color, width, amp: 0.25, passes: 1, maxLen: 0 });

function drawShoe(ctx, foot, F, up, shoe) {
  const heel = add(foot, F, -5), toe = add(foot, F, 6.5), down = { x: -up.x, y: -up.y };
  if (shoe.high) Sketch.limb(ctx, [add(heel, F, 2), add(add(heel, F, 2), up, 6)], 6, shoe.color, { amp: 0.3 });
  Sketch.limb(ctx, [heel, toe], 6.5, shoe.color, { amp: 0.3 });
  if (shoe.toecap) Sketch.limb(ctx, [add(toe, F, -2.5), toe], 6.5, shoe.toecap, { amp: 0.2 });
  if (shoe.checker) {
    ctx.fillStyle = shoe.accent;
    for (let k = 0; k < 4; k++) {
      const p = add(add(heel, F, 1 + k * 3), up, k % 2 ? 1.2 : -0.8);
      ctx.fillRect(p.x - 1.3, p.y - 1.3, 2.6, 2.6);
    }
  } else Sketch.stroke(ctx, [add(add(heel, F, 1.5), up, 0.5), add(add(toe, F, -3), up, 1.2)], thin(shoe.accent, 1.5));
  // light-up soles blink through their colours
  const sole = shoe.glow ? shoe.glow[Math.floor(performance.now() / 180) % shoe.glow.length] : shoe.sole;
  Sketch.stroke(ctx, [add(heel, down, 3), add(toe, down, 3)], thin(sole, shoe.glow ? 2.8 : 2.2));
}

function drawHead(ctx, h, up, F) {
  const hat = Outfit.get('hat'), skin = Outfit.get('skin').color;
  const R = HEAD_R, ua = Math.atan2(up.y, up.x), back = { x: -F.x, y: -F.y }, half = Math.PI / 2;
  const cap = (r, a = 0.15, center = h) => arcPts(center, r, ua - half - a, ua + half + a); // covers the top of the head

  // hair (see hair.js): the long bits hang behind your head, the rest goes on top
  const hair = hairLook(hat), wood = Outfit.get('skin').wood;
  if (!wood) drawHairBack(ctx, h, up, F, hair);

  const ear = add(add(h, back, 3), up, -1); // (headphones sit on it too)
  if (wood) {
    // Tung Tung Tung Sahur: a tall wooden log for a head, with the cut end on top, wood grain,
    // one big wide eye under a heavy brow, and a little mouth
    const top = add(h, up, R + 7), bot = add(h, up, -R + 1), wd = R - 0.5;
    Sketch.shape(ctx, [add(bot, back, wd), add(top, back, wd), add(top, F, wd), add(bot, F, wd)], skin, { color: INK, width: 2.2, amp: 0.4 });
    const ring = Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * TAU; return add(add(top, F, Math.cos(a) * wd), up, Math.sin(a) * 2.4); });
    Sketch.shape(ctx, ring, '#e0b07a', { color: INK, width: 1.6, amp: 0.2 });
    Sketch.stroke(ctx, [add(top, F, -wd * 0.45), add(top, F, wd * 0.45)], thin('rgba(120, 70, 30, 0.6)', 1));
    for (const k of [-0.7, -0.15, 0.45]) Sketch.stroke(ctx, [add(add(top, F, k * wd), up, -3), add(add(bot, F, k * wd + 0.6), up, 2)], thin('rgba(110, 66, 28, 0.45)', 1.1));
    const eye = add(add(h, F, 4.8), up, 2.5);
    Sketch.circle(ctx, eye.x, eye.y, 3.8, '#ffffff', { width: 1.4, amp: 0.2 });
    const pupil = add(eye, F, 1.2);
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(pupil.x, pupil.y, 1.7, 0, TAU);
    ctx.fill();
    Sketch.limb(ctx, [add(add(eye, F, -4), up, 5.5), add(add(eye, F, 4.5), up, 4.6)], 2.4, '#3a2410', { amp: 0.15 }); // the brow
    Sketch.stroke(ctx, [add(add(h, F, 3.5), up, -5.5), add(add(h, F, 7.5), up, -5)], thin(INK, 1.6));
  } else {
    Sketch.circle(ctx, h.x, h.y, R, skin, { width: 2.2 });
  }
  if (wood) { /* (face drawn above) */ } else if (Outfit.get('skin').bones) {
    // a skull: a big dark eye socket, a hole for a nose and a grin of teeth
    const eye = add(add(h, F, 4.6), up, -0.4);
    Sketch.circle(ctx, eye.x, eye.y, 3.2, BONE_DARK, { width: 1, amp: 0.3 });
    const nose = add(add(h, F, 8.4), up, -4.2);
    Sketch.shape(ctx, [add(nose, up, 1.8), add(add(nose, up, -1), F, 1.2), add(add(nose, up, -1), F, -1.2)], BONE_DARK, thin(BONE_DARK, 0.6));
    const j0 = add(add(h, F, 3.5), up, -7.6), j1 = add(add(h, F, 9.6), up, -6.1);
    Sketch.stroke(ctx, [j0, j1], thin(INK, 1.3));
    for (const t of [0.25, 0.5, 0.75]) { const p = mix(j0, j1, t); Sketch.stroke(ctx, [add(p, up, 1.4), add(p, up, -1.4)], thin(INK, 0.9)); }
  } else {
    Sketch.circle(ctx, ear.x, ear.y, 2.6, skin, { width: 1.4 });
    // face: dot eye and a little smirk
    const eye = add(add(h, F, 5.5), up, -1.5);
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(eye.x, eye.y, 1.6, 0, TAU);
    ctx.fill();
    Sketch.stroke(ctx, [add(add(h, F, 6), up, -5.8), add(add(h, F, 9), up, -4.6)], thin(INK, 1.4));
  }
  if (!wood) drawHairTop(ctx, h, up, F, hair);

  // Fit: tip the hat back or forward, and wear it pulled down or perched up (hair comes along).
  // (On a log head, hats sit on top of the log.)
  const tipSide = Math.sign(up.y * F.x - up.x * F.y) || 1, lift = Outfit.fit('hatHeight') * 1.8 + (wood ? 7 : 0);
  ctx.save();
  ctx.translate(h.x + up.x * lift, h.y + up.y * lift);
  ctx.rotate(Outfit.fit('hatTilt') * 0.13 * tipSide);
  ctx.translate(-h.x, -h.y);

  if (hat.type === 'beanie') {
    Sketch.shape(ctx, cap(R + 1.5), hat.color, HAT_LINE);
    Sketch.limb(ctx, [add(add(h, up, 1), back, R + 0.5), add(add(h, up, 1), F, R + 0.5)], 3, hat.accent, { amp: 0.2 });
    const pom = add(h, up, R + 4);
    Sketch.circle(ctx, pom.x, pom.y, 3.2, hat.accent, { width: 1.6 });
  } else if (hat.type === 'capBack') {
    const c = add(h, up, 1);
    Sketch.limb(ctx, [add(c, back, R - 3), add(add(c, back, R + 8), up, -1.5)], 2.5, hat.accent, { amp: 0.2 });
    Sketch.shape(ctx, cap(R + 1, 0, c), hat.color, HAT_LINE);
    const btn = add(c, up, R + 1);
    Sketch.circle(ctx, btn.x, btn.y, 1.8, hat.accent, { width: 1.2 });
  } else if (hat.type === 'bucket') {
    const c = add(h, up, 2.5);
    Sketch.shape(ctx, arcPts(c, R, ua - half + 0.2, ua + half - 0.2), hat.color, HAT_LINE);
    Sketch.limb(ctx, [add(c, back, R - 1), add(c, F, R - 1)], 1.8, hat.accent, { amp: 0.2 });
    Sketch.limb(ctx, [add(add(c, back, R + 6), up, -3), add(c, up, -0.5), add(add(c, F, R + 6), up, -3)], 2.5, hat.color, { amp: 0.3 });
  } else if (hat.type === 'cowboy') {
    const c = add(h, up, 3);
    const crown = [add(c, back, R - 2), add(add(c, back, R - 4), up, 11), add(c, up, 8), add(add(c, F, R - 4), up, 11), add(c, F, R - 2)];
    Sketch.shape(ctx, crown, hat.color, HAT_LINE);
    Sketch.limb(ctx, [add(add(c, back, R - 2), up, 2.5), add(add(c, F, R - 2), up, 2.5)], 1.8, hat.accent, { amp: 0.2 });
    Sketch.limb(ctx, [add(add(c, back, R + 11), up, 4), add(c, up, -1), add(add(c, F, R + 11), up, 4)], 3, hat.color, { amp: 0.3 });
  } else if (hat.type === 'tophat') {
    const c = add(h, up, R - 3);
    Sketch.shape(ctx, [add(c, back, R - 3), add(add(c, back, R - 4), up, 22), add(add(c, F, R - 4), up, 22), add(c, F, R - 3)], hat.color, HAT_LINE);
    Sketch.limb(ctx, [add(add(c, back, R - 3.5), up, 4), add(add(c, F, R - 3.5), up, 4)], 2.5, hat.accent, { amp: 0.2 });
    Sketch.limb(ctx, [add(c, back, R + 4), add(c, F, R + 4)], 2.5, hat.color, { amp: 0.2 });
  } else if (hat.type === 'propeller') {
    Sketch.shape(ctx, cap(R + 1.5), hat.color, HAT_LINE);
    Sketch.limb(ctx, [add(add(h, up, 2), back, R + 0.5), add(add(h, up, 2), F, R + 0.5)], 2.5, hat.stripe, { amp: 0.2 });
    const top = add(h, up, R + 1.5), hub = add(top, up, 5);
    Sketch.stroke(ctx, [top, hub], thin(INK, 1.6));
    const spin = Math.cos(performance.now() / 55) * 10; // the blades turning, seen from the side
    Sketch.limb(ctx, [add(hub, F, -spin), add(hub, F, spin)], 2, hat.accent, { amp: 0.1 });
  } else if (hat.type === 'viking') {
    for (const side of [F, back]) {
      const base = add(add(h, up, R - 3), side, R - 1);
      Sketch.shape(ctx, [base, add(base, up, 4), add(add(base, side, 8), up, 14)], hat.accent, { ...HAT_LINE, width: 1.6 });
    }
    Sketch.shape(ctx, cap(R + 2.5, 0.3), hat.color, HAT_LINE);
    Sketch.stroke(ctx, [add(add(h, up, 1), back, R + 1), add(add(h, up, 1), F, R + 1)], thin('#6e747b', 2.2));
  } else if (hat.type === 'bandana') {
    Sketch.shape(ctx, cap(R + 1, 0.05), hair.color, HAT_LINE);
    const knot = add(add(h, up, 3.5), back, R);
    Sketch.limb(ctx, [knot, add(add(h, up, 3.5), F, R + 0.5)], 3.5, hat.color, { amp: 0.2 });
    Sketch.limb(ctx, [knot, add(add(knot, back, 7), up, -3)], 2.5, hat.color, { amp: 0.3 });
    Sketch.limb(ctx, [knot, add(add(knot, back, 5), up, -8)], 2.5, hat.color, { amp: 0.3 });
    for (const k of [0.3, 0.6]) { const d = add(mix(knot, add(add(h, up, 3.5), F, R), k), up, 0.3); Sketch.circle(ctx, d.x, d.y, 0.9, hat.accent, { width: 0.6 }); }
  } else if (hat.type === 'halo') {
    const c = add(h, up, R + 11);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(ua + half);
    ctx.strokeStyle = hat.accent;
    ctx.lineWidth = 2.6;
    ctx.shadowColor = '#fff4c2';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 3, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  } else if (hat.type === 'crown') {
    const base = add(h, up, R - 3), left = add(base, F, -(R - 1)), right = add(base, F, R - 1);
    const crown = [left, add(left, up, 13), add(mix(left, right, 0.25), up, 6), add(mix(left, right, 0.5), up, 15),
      add(mix(left, right, 0.75), up, 6), add(right, up, 13), right];
    Sketch.shape(ctx, crown, hat.color, HAT_LINE);
    const gem = add(base, up, 5);
    Sketch.circle(ctx, gem.x, gem.y, 2.4, hat.accent, { width: 1.2 });
  } else if (hat.type === 'helmet') {
    Sketch.stroke(ctx, [add(add(h, back, R - 3), up, -2), add(add(h, F, 2), up, -R + 0.5)], thin(INK, 1.3));
    Sketch.shape(ctx, arcPts(h, R + 3, ua - half - 0.45, ua + half + 0.35), hat.color, HAT_LINE);
    for (const k of [-3, 3]) {
      Sketch.stroke(ctx, [add(add(h, up, R + 1.5), F, k), add(add(h, up, R - 3), F, k * 1.3)], thin(hat.accent, 2));
    }
  } else if (hat.type === 'headphones') {
    Sketch.limb(ctx, arcPts(h, R + 4, ua - half - 0.1, ua + half + 0.1, 8), 2.2, hat.color, { amp: 0.2 });
    Sketch.circle(ctx, ear.x, ear.y, 4.3, hat.accent, { width: 2 });
  } else if (hat.type === 'pumpkin') {
    // a carved pumpkin right over your head: ribs, a curly stalk, and a glowing jack-o'-lantern face
    const c = add(h, up, 1.5), r = R + 4.5, glow = '#ffd23f', dark = '#5a2a08';
    Sketch.limb(ctx, [add(c, up, r - 1), add(add(c, up, r + 4.5), back, 2.5)], 3.2, hat.accent, { amp: 0.2 });
    Sketch.circle(ctx, c.x, c.y, r, hat.color, { width: 2.2 });
    for (const k of [-0.55, 0, 0.55]) {
      Sketch.stroke(ctx, [add(add(c, up, r * 0.92), F, k * r * 0.25), add(c, F, k * r * 0.8), add(add(c, up, -r * 0.92), F, k * r * 0.25)], thin(hat.shade, 1.6));
    }
    const eye = add(add(c, F, r * 0.5), up, r * 0.2);
    Sketch.shape(ctx, [add(eye, up, 3.2), add(add(eye, up, -2), F, 3), add(add(eye, up, -2), F, -3)], glow, thin(dark, 1.2));
    const m = add(add(c, F, r * 0.42), up, -r * 0.36);
    const mouth = [add(m, F, -5.5), add(add(m, F, -3.5), up, -2.4), add(add(m, F, -1.5), up, -0.6), add(add(m, F, 0.5), up, -2.6),
      add(add(m, F, 2.5), up, -0.6), add(add(m, F, 4.5), up, -2.4), add(add(m, F, 5.5), up, 0.6), add(add(m, F, 2), up, 1.4), add(add(m, F, -2), up, 1.4)];
    Sketch.shape(ctx, mouth, glow, thin(dark, 1.2));
  }
  // (no hat, or a head item that's a hairstyle itself: nothing more to draw)
  ctx.restore();
}

const LONG_SLEEVES = new Set(['hoodie', 'flannel', 'varsity', 'tux', 'leather']);
const torsoWidth = top => top.type === 'hoodie' ? 17 : top.type === 'tank' ? 13 : top.type === 'leather' || top.type === 'vest' ? 16 : 15;

// A little skull, for tees and such. `up` points to the top of the skull.
function drawSkullIcon(ctx, c, up, F, color, r = 3.6) {
  const jaw = add(c, up, -r * 0.95);
  Sketch.limb(ctx, [add(jaw, F, -r * 0.45), add(jaw, F, r * 0.45)], r * 0.9, color, { amp: 0.1 });
  Sketch.circle(ctx, c.x, c.y, r, color, { width: 1.1, amp: 0.3 });
  ctx.fillStyle = INK;
  for (const s of [-1, 1]) {
    const e = add(add(c, F, s * r * 0.4), up, -r * 0.1);
    ctx.beginPath();
    ctx.arc(e.x, e.y, r * 0.28, 0, TAU);
    ctx.fill();
  }
}

function drawTorso(ctx, f, top) {
  const up = f.torsoDir, F = f.F, hip = f.hip, neck = f.neck;
  const width = torsoWidth(top);
  if (top.type === 'hoodie') {
    const hood = add(add(neck, F, -6), up, 1);
    Sketch.circle(ctx, hood.x, hood.y, 7, top.shade, { width: 2 });
  }
  // Fit: a cropped shirt shows your stomach, a long one hangs down over your pants
  const len = Outfit.fit('shirtLen'), hem = -2 - len * (len < 0 ? 5 : 3.5);
  // a vest is open at the front, over a tee
  Sketch.limb(ctx, [add(hip, up, Math.min(hem, -2)), neck], width, top.type === 'vest' ? top.under : top.color);
  const at = (k, side) => add(add(hip, up, k), F, side);
  if (hem > 0) {
    // cropped: bare stomach from the waistband up to a squared-off hem
    const s = width / 2 - 0.5, skin = Outfit.get('skin');
    if (skin.bones) {
      // a skeleton's middle: the spine, and the bottom ribs showing under the hem
      Sketch.shape(ctx, [at(-1, -s), at(-1, s), at(hem, s), at(hem, -s)], BONE_DARK, { color: INK, width: 2, amp: 0.4 });
      Sketch.stroke(ctx, [at(-1, -s * 0.6), at(hem, -s * 0.6)], thin(skin.color, 2.2));
      for (let k = hem - 1.5; k > 0.5; k -= 3) Sketch.stroke(ctx, [at(k, -s * 0.6), at(k - 1, s - 0.5)], thin(skin.color, 1.4));
    } else {
      Sketch.shape(ctx, [at(-1, -s), at(-1, s), at(hem, s), at(hem, -s)], skin.color, { color: INK, width: 2, amp: 0.4 });
      Sketch.stroke(ctx, [at(hem * 0.45, s - 2.5), at(hem * 0.45 + 0.8, s - 3.5)], thin(INK, 1)); // belly button
    }
  }
  if (top.stripes) top.stripes.forEach((c, i) => Sketch.stroke(ctx, [at(10 + i * 5, -7.5), at(10 + i * 5, 7.5)], thin(c, 3)));
  if (top.swirl) top.swirl.forEach((c, i) => {
    const s = at(9 + i * 11, i ? -2 : 3);
    Sketch.circle(ctx, s.x, s.y, 4.5 - i, null, { color: c, width: 2.4, amp: 1 });
  });
  if (top.spots) [[5, -4], [12, 3], [18, -3], [24, 3.5], [29, -2]].forEach(([k, s], i) => {
    const p = at(k, s);
    Sketch.circle(ctx, p.x, p.y, 2.7, top.spots[i % top.spots.length], { width: 1, amp: 0.4 });
  });
  if (top.type === 'hoodie') {
    Sketch.stroke(ctx, [at(7, -3), at(9, 8)], thin(INK, 1.3));
    for (const s of [3, 6]) Sketch.stroke(ctx, [at(29, s), at(20, s + 0.5)], thin(top.accent, 1.6));
  } else if (top.type === 'flannel') {
    Sketch.limb(ctx, [at(1, 5), at(29, 5)], 2.5, top.under, { outline: top.under, amp: 0.2 });
    for (const k of [7, 15, 23]) Sketch.stroke(ctx, [at(k, -7), at(k, 3.5)], thin(top.accent, 1.3));
    Sketch.stroke(ctx, [at(0, -2), at(30, -2)], thin(top.accent, 1.3));
  } else if (top.type === 'jersey') {
    Sketch.stroke(ctx, [at(18, -7), at(18, 7)], thin(top.accent, 3));
    Sketch.stroke(ctx, [at(23, -7), at(23, 7)], thin(top.accent, 1.5));
  } else if (top.type === 'varsity') {
    Sketch.stroke(ctx, [at(0, -7.5), at(0, 7.5)], thin(top.accent, 3));
    for (const k of [8, 15, 22]) { const b = at(k, 5.5); Sketch.circle(ctx, b.x, b.y, 1.1, top.accent, { width: 0.6 }); }
    const patch = at(20, -1);
    Sketch.circle(ctx, patch.x, patch.y, 4, top.accent, { width: 1.2 });
  } else if (top.type === 'tux') {
    Sketch.limb(ctx, [at(3, 4.5), at(30, 4.5)], 3.5, top.under, { outline: top.under, amp: 0.2 });
    const bow = at(30.5, 5);
    Sketch.shape(ctx, [add(bow, up, 2.5), add(bow, up, -2.5), add(add(bow, F, 3), up, 0)], top.accent, { ...thin(INK, 1), closed: true });
    Sketch.shape(ctx, [add(bow, up, 2.5), add(bow, up, -2.5), add(add(bow, F, -3), up, 0)], top.accent, { ...thin(INK, 1), closed: true });
  } else if (top.type === 'leather') {
    // biker jacket: diagonal zip, a tee peeking out at the collar, a band at the hem
    Sketch.limb(ctx, [at(25, 5.5), at(31, 5.5)], 2.6, top.under, { outline: top.under, amp: 0.2 });
    Sketch.shape(ctx, [at(31, 1.5), at(24, 4.5), at(31, 7)], top.shade, { ...thin(INK, 1), closed: true });
    Sketch.stroke(ctx, [at(1, 5), at(28, 1)], thin(top.accent, 1.3));
    Sketch.stroke(ctx, [at(0, -7.5), at(0, 7.5)], thin(top.shade, 2.8));
    if (top.studs) for (const [k, s] of [[30, -6], [30, -3], [29.5, 0], [27, -6.5], [24, -7]]) {
      const p = at(k, s);
      Sketch.circle(ctx, p.x, p.y, 1.1, top.accent, { width: 0.6, amp: 0.1 });
    }
  } else if (top.type === 'vest') {
    Sketch.limb(ctx, [at(-1, -2.5), at(31, -2.5)], width - 5, top.color);
    Sketch.stroke(ctx, [at(18, -6), at(18, 1)], thin(top.shade, 1.3));
    for (const k of [9, 16, 23]) { const b = at(k, 3.2); Sketch.circle(ctx, b.x, b.y, 1.1, top.accent, { width: 0.6 }); }
  } else if (top.logo === 'skull') {
    drawSkullIcon(ctx, at(20, 2), up, F, top.accent);
  } else if (top.flames) {
    // flames coming up off the hem
    [-6, -2, 2, 6].forEach((s, i) => {
      const base = at(0, s), tip = at(9 + (i % 2) * 7, s + 1.5);
      Sketch.stroke(ctx, [base, add(mix(base, tip, 0.5), F, -1.5), tip], thin(top.flames[i % 2], 2.6));
    });
  } else if (top.type !== 'tank' && !top.spots && !top.stripes) {
    const logo = at(19, 2.5);
    Sketch.circle(ctx, logo.x, logo.y, 3.6, top.accent, { width: 1.2 });
  }
}

// The first `f` (0..1) of an arm [shoulder, elbow, hand], measured along it.
function armPart(arm, f) {
  const [s, e, hand] = arm;
  const l1 = Math.hypot(e.x - s.x, e.y - s.y), l2 = Math.hypot(hand.x - e.x, hand.y - e.y), d = f * (l1 + l2);
  return d <= l1 ? [s, mix(s, e, d / Math.max(l1, 0.01))] : [s, e, mix(e, hand, (d - l1) / Math.max(l2, 0.01))];
}

// The Skeleton skin: where skin would show there are bones instead, thin with knobbly joints.
const BONE_DARK = '#2a2622';
function skinLimb(ctx, pts, w, skin) {
  if (!Outfit.get('skin').bones) return Sketch.limb(ctx, pts, w, skin);
  Sketch.limb(ctx, pts, Math.max(2.2, w * 0.45), skin, { amp: 0.2 });
  for (const p of pts.slice(1)) Sketch.circle(ctx, p.x, p.y, Math.max(1.5, w * 0.3), skin, { width: 1, amp: 0.2 });
}
function drawHand(ctx, arm, r, skin) {
  const hand = arm[2];
  if (!Outfit.get('skin').bones) return Sketch.circle(ctx, hand.x, hand.y, r, skin, { width: 1.5 });
  // bony fingers, spread a little, pointing on from the forearm
  const d = Math.hypot(hand.x - arm[1].x, hand.y - arm[1].y) || 1, dx = (hand.x - arm[1].x) / d, dy = (hand.y - arm[1].y) / d;
  for (const s of [-0.45, 0, 0.45]) {
    const c = Math.cos(s), sn = Math.sin(s);
    Sketch.stroke(ctx, [hand, { x: hand.x + (dx * c - dy * sn) * r * 1.6, y: hand.y + (dx * sn + dy * c) * r * 1.6 }], thin(INK, 1.6));
  }
  Sketch.circle(ctx, hand.x, hand.y, r * 0.6, skin, { width: 1, amp: 0.2 });
}

function drawArm(ctx, arm, top, color, skin) {
  if (top.type === 'vest') color = top.under; // the tee's sleeves
  // Fit: sleeves rolled up, or pulled down long (over your hands, for long sleeves)
  const roll = Outfit.fit('sleeves');
  let handR = 3.2;
  if (top.type === 'tank') {
    skinLimb(ctx, arm, 5, skin);
  } else if (LONG_SLEEVES.has(top.type)) {
    const len = 1 + 0.2 * roll;
    if (len < 1) {
      skinLimb(ctx, arm, 5, skin);
      const part = armPart(arm, len), end = part[part.length - 1];
      Sketch.limb(ctx, part, 6.5, top.sleeve || color);
      Sketch.limb(ctx, [armPart(arm, len - 0.06).pop(), end], 8, top.sleeve || color, { amp: 0.2 }); // the rolled cuff
    } else {
      Sketch.limb(ctx, arm, 6.5, top.sleeve || color);
      handR = 3.2 * (1 - (len - 1) * 1.2); // sweater paws
    }
  } else {
    const len = clamp(0.31 + 0.12 * roll, 0.06, 0.6);
    skinLimb(ctx, arm, 5, skin);
    const part = armPart(arm, len);
    Sketch.limb(ctx, part, 7.5, color);
    if (top.type === 'jersey') Sketch.limb(ctx, [armPart(arm, len - 0.03).pop(), part[part.length - 1]], 7.5, top.accent, { amp: 0.1 });
  }
  if (handR > 0.6) drawHand(ctx, arm, handR, skin);
}

// How you wear your pants, from the closet's Sag slider: `low` is 0..1 of sag below normal,
// `high` is 0..1 of pulled up above it.
function sagAmount() {
  const v = Outfit.sag();
  return { low: Math.max(0, (v - SAG_NORMAL) / (SAG_MAX - SAG_NORMAL)), high: Math.max(0, (SAG_NORMAL - v) / SAG_NORMAL) };
}
const BOXERS = { color: '#8fc4ef', shade: '#76aed9', stripe: '#f4f1ea' };
const BELT = '#3a2416';

function drawLeg(ctx, f, leg, pants, color, skin, shoe, front) {
  const perp = (a, b) => { const d = Math.hypot(b.x - a.x, b.y - a.y) || 1; return { x: -(b.y - a.y) / d, y: (b.x - a.x) / d }; };
  // sagging: the waistband slides down the thigh and your boxers show above it
  const { low } = sagAmount();
  const hip = low > 0 ? mix(f.hip, leg.knee, 0.8 * low) : f.hip;
  if (low > 0) {
    const top = mix(f.hip, leg.knee, 0.8 * low + 0.05), n = perp(f.hip, leg.knee);
    Sketch.limb(ctx, [f.hip, top], 11, front ? BOXERS.color : BOXERS.shade, { amp: 0.3 });
    for (const k of [-2.5, 2]) Sketch.stroke(ctx, [add(f.hip, n, k), add(top, n, k)], thin(BOXERS.stripe, 1.1));
  }
  // Fit: skinny or baggy, and the legs rolled up or stacked long over your shoes
  const widen = 1 + 0.15 * Outfit.fit('pantsWidth'), cuffs = Outfit.fit('cuffs');
  if (pants.type === 'shorts') {
    skinLimb(ctx, [leg.knee, leg.foot], 6, skin);
    Sketch.limb(ctx, [mix(leg.foot, leg.knee, 0.3), leg.foot], 6, pants.sock);
    // saggy shorts end up hanging past your knees
    if (low > 0) Sketch.limb(ctx, [hip, leg.knee, mix(leg.knee, leg.foot, 0.1 + 0.35 * low)], 11 * widen, color);
    else Sketch.limb(ctx, [hip, mix(hip, leg.knee, 1.1)], 11 * widen, color);
  } else {
    const w = (pants.type === 'cargo' ? 11 : 9) * widen;
    // rolled up: the leg ends partway down the shin, with your sock and ankle showing under the cuff
    const endT = cuffs > 0 ? 1 - 0.2 * cuffs : 1, foot = mix(leg.knee, leg.foot, endT);
    if (cuffs > 0) {
      skinLimb(ctx, [mix(leg.knee, leg.foot, endT - 0.1), leg.foot], 6, skin);
      Sketch.limb(ctx, [mix(leg.foot, leg.knee, 0.32), leg.foot], 6, '#f4f1ea');
    }
    Sketch.limb(ctx, [hip, leg.knee, foot], w, color);
    if (cuffs > 0) Sketch.limb(ctx, [mix(leg.knee, foot, 0.9), foot], w + 2, color, { amp: 0.2 });
    if (pants.type === 'cargo') {
      const m = mix(hip, leg.knee, 0.62);
      const d = Math.hypot(leg.knee.x - hip.x, leg.knee.y - hip.y) || 1;
      const dx = (leg.knee.x - hip.x) / d, dy = (leg.knee.y - hip.y) / d;
      const sq = [[-3, -2.5], [3, -2.5], [3, 2.5], [-3, 2.5]].map(([a, b]) => ({ x: m.x + dx * a - dy * b, y: m.y + dy * a + dx * b }));
      Sketch.stroke(ctx, sq, { ...thin(INK, 1.2), closed: true });
      if (cuffs <= 0) Sketch.limb(ctx, [mix(leg.knee, foot, 0.8), mix(leg.knee, foot, 0.93)], w + 1.5, color, { amp: 0.2 });
    }
    // the lower you wear them (or the longer the legs), the more they bunch up over your shoes
    const bunch = cuffs > 0 ? 0 : Math.max(low > 0.3 ? 2.5 * low : 0, -cuffs * 0.9);
    if (bunch > 0) Sketch.limb(ctx, [mix(leg.knee, foot, 0.8), mix(leg.knee, foot, 0.93)], Math.min(w + 1 + bunch, 15), color, { amp: 0.4 });
    if (pants.stripe) Sketch.stroke(ctx, [hip, leg.knee, mix(leg.knee, foot, 0.85)], thin(pants.stripe, 1.8));
    if (pants.spots) [[hip, leg.knee, 0.3], [hip, leg.knee, 0.72], [leg.knee, foot, 0.35], [leg.knee, foot, 0.72]].forEach(([a, b, t], i) => {
      const p = add(mix(a, b, t), perp(a, b), i % 2 ? 1.5 : -1.5);
      Sketch.circle(ctx, p.x, p.y, 2.4, pants.spots[i % pants.spots.length], { width: 0.8, amp: 0.4 });
    });
    if (pants.plaid) for (const [a, b] of [[hip, leg.knee], [leg.knee, foot]]) {
      const n = perp(a, b);
      for (const t of [0.3, 0.7]) { const p = mix(a, b, t); Sketch.stroke(ctx, [add(p, n, -4.5 * widen), add(p, n, 4.5 * widen)], thin(pants.plaid, 1.2)); }
      Sketch.stroke(ctx, [add(mix(a, b, 0.1), n, 1.5), add(mix(a, b, 0.9), n, 1.5)], thin(pants.plaid, 1));
    }
    if (pants.ripped) {
      const n = perp(leg.knee, foot);
      Sketch.stroke(ctx, [add(leg.knee, n, -3), add(leg.knee, n, 3)], thin(skin, 2.6));
      const t = mix(hip, leg.knee, 0.45), n2 = perp(hip, leg.knee);
      Sketch.stroke(ctx, [add(t, n2, -2), add(t, n2, 2.5)], thin(skin, 1.8));
    }
    if (pants.shine) {
      const n = perp(hip, leg.knee);
      Sketch.stroke(ctx, [add(mix(hip, leg.knee, 0.15), n, 2), add(mix(hip, leg.knee, 0.85), n, 2)], thin(pants.shine, 1.6));
      Sketch.stroke(ctx, [add(mix(leg.knee, foot, 0.1), n, 1.5), add(mix(leg.knee, foot, 0.6), n, 1.5)], thin(pants.shine, 1.3));
    }
    if (pants.flames) {
      // flames licking up from the cuffs
      const n = perp(leg.knee, foot);
      [-1, 0, 1].forEach((k, i) => {
        const base = add(mix(leg.knee, foot, 0.97), n, k * 3), tip = add(mix(leg.knee, foot, k ? 0.55 : 0.35), n, k * 1.2);
        Sketch.stroke(ctx, [base, add(mix(base, tip, 0.5), n, k ? -k * 1.5 : 1.5), tip], thin(pants.flames[i % 2], 2.4));
      });
    }
  }
  if (front && pants.chain) {
    // wallet chain looping from the belt to the back pocket
    const back = { x: -f.F.x, y: -f.F.y };
    Sketch.stroke(ctx, [add(hip, back, 3), add(mix(hip, leg.knee, 0.5), back, 5), add(mix(hip, leg.knee, 0.35), back, 1.5)], thin(pants.chain, 1.6));
  }
  if (front && low > 0) {
    const n = perp(hip, leg.knee);
    Sketch.stroke(ctx, [add(hip, n, -5), add(hip, n, 5)], thin(BELT, 2.2));
  }
  drawShoe(ctx, leg.foot, f.F, f.torsoDir, shoe);
}

// Pulled way up: the waistband climbs the shirt, tucked in, belt and all.
function drawHighWaist(ctx, f, pants, top) {
  const { high } = sagAmount();
  if (high <= 0 || pants.type === 'shorts' && high < 0.2) return;
  const up = f.torsoDir, F = f.F, half = torsoWidth(top) / 2 + 0.3, waist = add(f.hip, up, 3 + 12 * high);
  const at = (k, s) => add(add(f.hip, up, k), F, s);
  // a squared-off band of pants over the bottom of the shirt, belt along the top
  Sketch.shape(ctx, [at(-6, -half), at(-6, half), add(waist, F, half), add(waist, F, -half)], pants.color, { color: INK, width: 2, amp: 0.4 });
  Sketch.stroke(ctx, [add(add(waist, up, -1.5), F, -half + 1), add(add(waist, up, -1.5), F, half - 1)], thin(BELT, 2.4));
  const buckle = add(add(waist, F, half - 3), up, -1.5);
  Sketch.circle(ctx, buckle.x, buckle.y, 1.8, '#c0c5cc', { width: 1 });
}

// Accessories: some hang behind the body, the rest go on top.
function drawExtraBehind(ctx, f, extra) {
  const up = f.torsoDir, back = { x: -f.F.x, y: -f.F.y }, flow = f.flow ?? 0.5;
  if (extra.type === 'cape') {
    const n = f.neck;
    const cape = [add(n, f.F, 1), add(add(n, back, 5), up, -1),
      add(add(f.hip, back, 10 + 26 * flow), up, -6 + 18 * flow), add(add(f.hip, back, 2 + 14 * flow), up, -14 + 12 * flow)];
    Sketch.shape(ctx, cape, extra.color, { color: INK, width: 2, amp: 0.8 });
    Sketch.stroke(ctx, [mix(cape[1], cape[2], 0.3), mix(cape[0], cape[3], 0.5)], thin(extra.accent, 1.4));
  }
}

function drawExtraBody(ctx, f, extra) {
  const up = f.torsoDir, F = f.F, back = { x: -F.x, y: -F.y };
  if (extra.type === 'backpack') {
    const c = add(add(f.hip, up, 19), back, 9.5);
    const box = [add(add(c, F, -4.5), up, 9), add(add(c, F, 4.5), up, 9), add(add(c, F, 4.5), up, -9), add(add(c, F, -4.5), up, -9)];
    Sketch.shape(ctx, box, extra.color, { color: INK, width: 1.8, amp: 0.5 });
    Sketch.stroke(ctx, [add(c, up, 2), add(add(c, up, 2), back, 4)], thin(extra.accent, 2.2));
  }
}

function drawExtraFront(ctx, f, extra) {
  const up = f.torsoDir, F = f.F, back = { x: -F.x, y: -F.y }, h = f.head, n = f.neck, flow = f.flow ?? 0.5;
  const eye = add(add(h, F, 5.5), up, -1.5);
  if (extra.type === 'shades') {
    Sketch.limb(ctx, [add(eye, F, -2.5), add(eye, F, 2.5)], 3.5, extra.color, { amp: 0.1, outline: extra.color });
    Sketch.stroke(ctx, [add(eye, F, -2.5), add(add(h, back, 2), up, -0.5)], thin(extra.color, 1.4));
  } else if (extra.type === 'mustache') {
    Sketch.limb(ctx, [add(add(h, F, 5.5), up, -3.6), add(add(h, F, 8), up, -4.2), add(add(h, F, 10), up, -3.2)], 1.6, extra.color, { amp: 0.1, outline: extra.color });
  } else if (extra.type === 'scarf') {
    Sketch.limb(ctx, [add(add(n, back, 4), up, 1), add(add(n, F, 4.5), up, 0)], 5, extra.color, { amp: 0.2 });
    Sketch.limb(ctx, [add(n, back, 4), add(add(n, back, 9 + 12 * flow), up, -8 + 6 * flow)], 4, extra.color, { amp: 0.3 });
    Sketch.stroke(ctx, [add(add(n, back, 1), up, 1), add(add(n, back, 1), up, -1)], thin(extra.accent, 1.6));
  } else if (extra.type === 'chain') {
    const pts = [add(n, back, 2), add(add(n, up, -6), F, 2), add(add(n, up, -8), F, 4.5)];
    Sketch.stroke(ctx, pts, thin(extra.color, 1.8));
    Sketch.circle(ctx, pts[2].x, pts[2].y, 2, extra.color, { width: 1 });
  } else if (extra.type === 'collar') {
    const a = add(add(n, back, 4.5), up, 1.5), b = add(add(n, F, 4.5), up, 0.5);
    Sketch.limb(ctx, [a, b], 3.8, extra.color, { amp: 0.2 });
    for (const t of [0.25, 0.5, 0.75]) {
      const p = mix(a, b, t);
      Sketch.shape(ctx, [add(p, F, -1.2), add(p, up, -3.2), add(p, F, 1.2)], extra.accent, { ...thin(INK, 0.8), closed: true });
    }
  } else if (extra.type === 'patch') {
    Sketch.stroke(ctx, [add(add(h, F, 7), up, 2), add(add(h, back, HEAD_R - 2), up, 6)], thin(extra.color, 1.3));
    Sketch.circle(ctx, eye.x, eye.y, 2.9, extra.color, { width: 1, amp: 0.2 });
  } else if (extra.type === 'bandaid') {
    const p = add(add(h, F, 1.5), up, -2.8); // on the cheek, under the eye
    Sketch.limb(ctx, [add(add(p, F, -2.8), up, 1.2), add(add(p, F, 2.8), up, -1.2)], 2.8, extra.color, { amp: 0.1 });
    Sketch.stroke(ctx, [add(p, F, -0.6), add(p, F, 0.6)], thin('#c99a7a', 1));
  } else if (extra.type === 'axe') {
    // the joke-costume axe: only the back of the blade shows, "stuck in" the top of your head,
    // with the handle sticking up and back. (No blood: it's pretend!)
    const e = add(add(h, up, HEAD_R - 1.5), F, 1.5), at = (k, u) => add(add(e, F, k), up, u);
    Sketch.limb(ctx, [at(-5, 6), add(add(e, up, 22), back, 15)], 3.2, extra.accent, { amp: 0.2 });
    Sketch.shape(ctx, [at(-8, 0.5), at(-7, 8), at(-3, 9), at(3, 7), at(8.5, 0.5)], extra.color, { color: INK, width: 1.7, amp: 0.2 });
    Sketch.circle(ctx, at(-5, 6).x, at(-5, 6).y, 1.6, '#6e747b', { width: 0.8 }); // where the handle fits
    Sketch.stroke(ctx, [at(-2, 5.5), at(5, 2.5)], thin('#eef2f5', 1.3)); // a glint on the steel
    Sketch.stroke(ctx, [at(-8.5, 0.4), at(9, 0.4)], thin(INK, 1.9));   // where it "goes in"
  }
}

// Tung Tung Tung Sahur's wooden bat, held in his front hand, carrying on from the forearm.
function drawBat(ctx, arm) {
  const hand = arm[2], d = Math.hypot(hand.x - arm[1].x, hand.y - arm[1].y) || 1;
  const dir = { x: (hand.x - arm[1].x) / d, y: (hand.y - arm[1].y) / d };
  const grip = add(hand, dir, -3), end = add(hand, dir, 26);
  Sketch.limb(ctx, [grip, add(hand, dir, 11)], 3.4, '#a8743f', { amp: 0.15 });
  Sketch.limb(ctx, [add(hand, dir, 9), end], 6.5, '#b98552', { amp: 0.2 });
  Sketch.circle(ctx, end.x, end.y, 3.4, '#e0b07a', { width: 1.2, amp: 0.2 });
}

function drawFigure(ctx, f) {
  Sketch.seedFor(40);
  const skin = Outfit.get('skin').color, top = Outfit.get('top'), pants = Outfit.get('pants'), shoe = Outfit.get('shoes');
  const extra = Outfit.get('extra') || { type: 'none' };
  drawExtraBehind(ctx, f, extra);
  drawArm(ctx, f.backArm, top, top.shade, skin);
  drawLeg(ctx, f, f.legs.back, pants, pants.shade, skin, shoe, false);
  drawLeg(ctx, f, f.legs.front, pants, pants.color, skin, shoe, true);
  drawExtraBody(ctx, f, extra);
  skinLimb(ctx, [f.neck, add(f.head, f.torsoDir, -HEAD_R + 2)], 4, skin);
  drawTorso(ctx, f, top);
  drawHighWaist(ctx, f, pants, top);
  // bobblehead: blow the head up around the neck
  const bigHead = typeof Progress !== 'undefined' && Progress.cheat('bighead');
  if (bigHead) {
    ctx.save();
    ctx.translate(f.neck.x, f.neck.y);
    ctx.scale(1.8, 1.8);
    ctx.translate(-f.neck.x, -f.neck.y);
  }
  drawHead(ctx, f.head, f.torsoDir, f.F);
  drawExtraFront(ctx, f, extra);
  if (bigHead) ctx.restore();
  if (Outfit.get('skin').wood) drawBat(ctx, f.frontArm);
  drawArm(ctx, f.frontArm, top, top.color, skin);
  if (extra.type === 'nametag') drawNameTag(ctx, f, extra, Outfit.tagName());
}

// A "HELLO my name is" sticker on your chest, with your name written on it. It goes on top of
// your arm so it can always be read, and it stays the right way round whichever way you face.
function drawNameTag(ctx, f, extra, name) {
  const up = f.torsoDir, c = add(add(f.hip, up, 21), f.F, 1.5);
  const W = 13, H = 9.5, band = 3.6;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(Math.atan2(up.y, up.x) + Math.PI / 2);
  Sketch.seedFor(55);
  const box = [{ x: -W / 2, y: -H / 2 }, { x: W / 2, y: -H / 2 }, { x: W / 2, y: H / 2 }, { x: -W / 2, y: H / 2 }];
  Sketch.shape(ctx, box, '#ffffff', { color: INK, width: 0.9, amp: 0.15, maxLen: 4 });
  ctx.fillStyle = extra.color;
  ctx.fillRect(-W / 2 + 0.45, -H / 2 + 0.45, W - 0.9, band);
  ctx.fillRect(-W / 2 + 0.45, H / 2 - 1.3, W - 0.9, 0.85); // the red strip along the bottom
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 2.1px ${HAND}`;
  ctx.fillText('HELLO', 0, -H / 2 + 1.35);
  ctx.font = `1.15px ${HAND}`;
  ctx.fillText('my name is', 0, -H / 2 + 2.95);
  if (name) {
    // written in marker, shrunk to fit
    let size = 3.4;
    ctx.font = `${size}px ${MARKER}`;
    const wide = ctx.measureText(name).width;
    if (wide > W - 1.6) { size *= (W - 1.6) / wide; ctx.font = `${size}px ${MARKER}`; }
    ctx.fillStyle = INK;
    ctx.fillText(name, 0, 1.6);
  }
  ctx.restore();
}

function drawSkater(ctx, sk) {
  Outfit.override = sk.outfit || null;
  // mini skater: shrink everything around where the wheels touch down
  const mini = typeof Progress !== 'undefined' && Progress.cheat('mini');
  if (mini) {
    const p = sk.state === 'bail' ? sk.bail.rag.hip : sk.pos;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(0.55, 0.55);
    ctx.translate(-p.x, -p.y);
  }
  drawSkaterBody(ctx, sk);
  if (mini) ctx.restore();
  Outfit.override = null;
}

function drawSkaterBody(ctx, sk) {
  if (sk.state === 'bail') {
    drawBoard(ctx, sk.bail.rag.boardPose());
    drawFigure(ctx, sk.bail.rag.figure());
  } else {
    const pose = riderPose(sk);
    drawBoard(ctx, pose.board);
    drawFigure(ctx, pose.fig);
    if (sk.manual) drawBalance(ctx, sk, pose.fig);
  }
}

// A 5-point star, filled.
function starPath(ctx, x, y, r, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

// The extras some bails come with (see bailHit in skater.js). k: 0 when it appears, 1 when it's gone.
const BAIL_FX = {
  word(ctx, f, k) {
    ctx.globalAlpha = clamp((1 - k) / 0.35, 0, 1);
    markerText(ctx, f.text, f.x, f.y, f.size, f.color, f.rot, 1 + 0.7 * Math.exp(-f.life * 14));
  },
  star(ctx, f, k) {
    // little stars going round and round your head
    ctx.globalAlpha = clamp((1 - k) / 0.2, 0, 1);
    const x = f.x + Math.cos(f.a) * 22, y = f.y - 20 + Math.sin(f.a) * 7;
    starPath(ctx, x, y, 7, f.a * 2);
    ctx.fillStyle = '#ffd84a';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  },
  ghost(ctx, f, k) {
    // your ghost floats up out of you, waving
    const wob = Math.sin(f.life * 6) * 6, x = f.x + wob, y = f.y;
    ctx.globalAlpha = 0.8 * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85);
    ctx.beginPath();
    ctx.arc(x, y - 14, 15, Math.PI, 0);
    ctx.lineTo(x + 15, y + 14);
    for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(x + 15 - i * 7.5 - 3.75, y + 14 + (i % 2 ? -6 : 6) * Math.cos(f.life * 8), x + 15 - (i + 1) * 7.5, y + 14);
    ctx.closePath();
    ctx.fillStyle = '#f4f7fb';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = INK;
    for (const ex of [-5, 5]) { ctx.beginPath(); ctx.ellipse(x + ex, y - 14, 2.4, 3.6, 0, 0, TAU); ctx.fill(); }
    ctx.beginPath();
    ctx.ellipse(x, y - 4, 3, 4 + Math.sin(f.life * 5), 0, 0, TAU); // "ooooo"
    ctx.fill();
  },
  confetti(ctx, f, k) {
    ctx.globalAlpha = clamp((1 - k) / 0.3, 0, 1);
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.r);
    ctx.fillStyle = f.color;
    const h = 8 * Math.abs(Math.cos(f.r * 1.7)) + 2;
    ctx.fillRect(-3, -h / 2, 6, h);
    ctx.restore();
  },
  coin(ctx, f, k) {
    ctx.globalAlpha = clamp((1 - k) / 0.3, 0, 1);
    const sx = Math.max(0.15, Math.abs(Math.cos(f.spin + f.life * 9)));
    ctx.beginPath();
    ctx.ellipse(f.x, f.y, 7 * sx, 7, 0, 0, TAU);
    ctx.fillStyle = '#f4c542';
    ctx.fill();
    ctx.strokeStyle = '#a67814';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    if (sx > 0.5) { ctx.fillStyle = '#a67814'; ctx.font = `bold 9px ${HAND}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', f.x, f.y + 0.5); }
  },
  flame(ctx, f, k) {
    // yellow-hot, going orange, then red as it burns out
    ctx.globalAlpha = 0.85 * (1 - k);
    ctx.fillStyle = k < 0.3 ? '#ffe680' : k < 0.6 ? '#ff8c2e' : '#e2361f';
    ctx.beginPath();
    ctx.ellipse(f.x, f.y, f.r * 0.7, f.r * 1.2, 0, 0, TAU);
    ctx.fill();
  },
  smoke(ctx, f, k) {
    ctx.globalAlpha = 0.55 * (1 - k);
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, TAU);
    ctx.fillStyle = f.color;
    ctx.fill();
  },
  pow(ctx, f, k) {
    // a comic-book POW!
    const s = 1 + 0.8 * Math.exp(-f.life * 16);
    ctx.globalAlpha = clamp((1 - k) / 0.3, 0, 1);
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(s, s);
    ctx.rotate(-0.12);
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI) / 12, r = i % 2 ? 22 : 40 + (i % 4) * 4;
      ctx.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffd84a';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    markerText(ctx, 'POW!', f.x, f.y, 30 * s, '#e2553f', -0.12);
  },
};

function drawFx(ctx, fx) {
  Sketch.seedFor(60);
  for (const f of fx) {
    const k = f.life / f.max;
    if (f.kind === 'dust') {
      ctx.globalAlpha = 0.6 * (1 - k);
      Sketch.circle(ctx, f.x, f.y, f.r * (0.6 + k), null, { color: '#7a7266', width: 1.4, amp: 0.8 });
    } else if (f.kind === 'spark') {
      ctx.globalAlpha = 1 - k;
      Sketch.stroke(ctx, [{ x: f.x, y: f.y }, { x: f.x - f.vx * 0.025, y: f.y - f.vy * 0.025 }],
        { color: f.color || (k < 0.5 ? '#ffd166' : '#f08a3c'), width: 2, amp: 0.2, passes: 1, maxLen: 0 });
    } else if (BAIL_FX[f.kind]) {
      BAIL_FX[f.kind](ctx, f, k);
    } else {
      ctx.globalAlpha = 1 - k;
      const s = f.s || 1, a = (10 + k * 14) * s, b = (22 + k * 14) * s;
      Sketch.stroke(ctx, [{ x: f.x + f.dx * a, y: f.y + f.dy * a }, { x: f.x + f.dx * b, y: f.y + f.dy * b }],
        { color: INK, width: 2, amp: 0.3, passes: 1, maxLen: 0 });
    }
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- terrain

function drawTerrain(ctx, T, view) {
  drawScenery(ctx, T.back, view, 600, T);
  Sketch.seedFor(1);
  Sketch.fill(ctx, T.fillPoly, T.theme.ground || COLORS.concrete, 3);

  ctx.save();
  ctx.beginPath();
  T.fillPoly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = T.theme.hatch || COLORS.hatch;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (const [a, b] of T.hatch) {
    if (b.x < view.x0 || a.x > view.x1) continue;
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  ctx.restore();

  for (const line of T.decor) Sketch.stroke(ctx, line, { color: INK, width: 2.2, amp: 1 });
  Sketch.stroke(ctx, T.outline, { color: INK, width: 3.6, amp: 1.2, maxLen: 30 });
  for (const { pt } of T.copings) Sketch.circle(ctx, pt.x, pt.y - 3, 4.5, COLORS.coping, { width: 2 });
  drawScenery(ctx, T.front, view, 700, T);
  drawRails(ctx, T, view);
}

// Grindables: rails on posts, concrete ledges, benches, picnic tables, planters and curbs.
function drawRails(ctx, T, view) {
  T.railLines.forEach((r, i) => {
    const a = r.pts[0], b = r.pts[r.pts.length - 1];
    if (b.x < view.x0 - 50 || a.x > view.x1 + 50) return;
    Sketch.seedFor(400 + i);
    const ground = p => ({ x: p.x, y: T.groundYAt(p.x, p.y) });
    const line = { color: INK, width: 2.4, amp: 0.8 };
    if (r.kind === 'rail') {
      const posts = [];
      for (let k = 0; k < r.pts.length - 1; k++) {
        const p = r.pts[k], q = r.pts[k + 1], n = Math.max(1, Math.round(Math.hypot(q.x - p.x, q.y - p.y) / 140));
        for (let j = k ? 1 : 0; j <= n; j++) posts.push(mix(p, q, 0.04 + (0.92 * j) / n));
      }
      for (const p of posts) Sketch.limb(ctx, [p, ground(p)], 2.5, '#8d949c', { amp: 0.3 });
      Sketch.limb(ctx, r.pts, 3.5, COLORS.coping, { amp: 0.4 });
    } else if (r.kind === 'bench') {
      Sketch.limb(ctx, [add(a, { x: 0, y: -24 }), add(b, { x: 0, y: -24 })], 4, '#a0703f', { amp: 0.4 }); // backrest behind
      for (const p of [add(a, { x: 14, y: 0 }), add(b, { x: -14, y: 0 })]) {
        Sketch.limb(ctx, [p, ground(p)], 3, '#555a60', { amp: 0.3 });
        Sketch.limb(ctx, [add(p, { x: 0, y: -24 }), p], 2.5, '#555a60', { amp: 0.3 });
      }
      Sketch.limb(ctx, [a, b], 5, '#b9834b', { amp: 0.4 });
    } else if (r.kind === 'table') {
      const mid = mix(a, b, 0.5);
      for (const p of [add(a, { x: 24, y: 0 }), add(b, { x: -24, y: 0 })]) Sketch.limb(ctx, [mix(p, mid, 0.2), ground(mix(p, mid, -0.25))], 3, '#8a5c32', { amp: 0.3 });
      Sketch.limb(ctx, [a, b], 6, '#b9834b', { amp: 0.4 });
    } else if (r.kind === 'planter') {
      for (let x = a.x + 20; x < b.x - 10; x += 34) {
        Sketch.circle(ctx, x, a.y - 12 - (x % 3) * 3, 13, '#6fae5a', { width: 1.8, amp: 1.2 });
      }
      Sketch.shape(ctx, [a, b, ground(b), ground(a)], '#b8775a', line);
      Sketch.limb(ctx, [a, b], 2.5, '#d9d4c8', { amp: 0.3 });
    } else if (r.kind === 'curb') {
      Sketch.shape(ctx, [a, b, ground(b), ground(a)], '#e05a4a', line);
      for (let x = a.x + 30; x < b.x; x += 60) Sketch.shape(ctx, [{ x, y: a.y }, { x: x + 30, y: a.y }, { x: x + 30, y: ground({ x, y: a.y }).y }, { x, y: ground({ x, y: a.y }).y }], '#f4f1ea', { ...line, width: 1.2 });
    } else {
      // concrete ledge with a metal edge
      Sketch.shape(ctx, [a, b, ground(b), ground(a)], '#c4beb2', line);
      for (let x = a.x + 50; x < b.x - 20; x += 70) {
        Sketch.stroke(ctx, [{ x, y: a.y + 4 }, { x: x - 6, y: T.groundYAt(x, a.y) }], thin('rgba(60,55,48,0.45)', 1.2));
      }
      Sketch.limb(ctx, [a, b], 2.5, COLORS.coping, { amp: 0.3 });
    }
  });
}

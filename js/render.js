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
};

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
    Sketch.shape(ctx, top, look.grip, line);
  } else {
    Sketch.shape(ctx, top, COLORS.wood, line);
    Sketch.shape(ctx, bot, look.graphic, line);
    const n = -DECK_TH / 2 - 0.2;
    for (const art of BOARD_ART[look.art]) {
      Sketch.shape(ctx, art.map(([l, w]) => X(l, n, w)), look.accent, { ...line, width: 1.2 });
    }
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
};

function trickRotation(sk) {
  const tr = sk.trick;
  if (!tr) return { roll: 0, yaw: 0, imp: 0, p: 1, active: false };
  const p = tr.done ? 1 : Math.min(1, tr.t / tr.dur);
  const e = 1 - (1 - p) * (1 - p); // fast flick, slowing into the catch
  return {
    roll: tr.def.flip * TAU * e * sk.facing,
    yaw: tr.def.shuv * Math.PI * e * sk.facing,
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
  const turn = pivotYaw + sk.spin;
  const nose = { x: T.x * sk.facing, y: T.y * sk.facing };

  // where the board rides: on its wheels, on a rail, or up on two wheels in a manual
  let ride = add(sk.pos, N, HB), yaw = 0, roll = 0, pivotL = -TRUCK_L, pivotN = -HB;
  if (sk.state === 'grind') {
    const gp = GRIND_POSE[sk.grind.kind];
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
  let center = ride;
  if (ga > 0.01) {
    center = add(ride, N, 15 * ga);
    roll += grab.roll * sk.facing * ga;
    pitch += grab.pitch * ga;
  }

  const control = { cx: center.x, cy: center.y, ang: A, facing: sk.facing, roll, yaw: yaw + turn, pitch, pivotL, pivotN };
  const rot = trickRotation(sk);
  const lift = rot.active ? Math.sin(rot.p * Math.PI) * 7 : 0;
  const board = {
    ...control, cx: center.x + N.x * lift, cy: center.y + N.y * lift,
    roll: roll + rot.roll, yaw: control.yaw + rot.yaw, pitch: pitch + rot.imp,
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
  const torsoDir = add({ x: N.x * Math.cos(lean), y: N.y * Math.cos(lean) }, F, Math.sin(lean));
  const neck = add(hip, torsoDir, TORSO);
  const shoulder = add(add(hip, torsoDir, TORSO - 6), F, 1);
  const head = add(add(neck, torsoDir, HEAD_R + 4), F, 2);

  const legs = {
    front: solveLeg(hip, front, F),
    back: solveLeg(hip, back, F),
  };

  // Arms: angles measured from straight down, positive toward the front.
  const sway = Math.sin(sk.time * 2.2) * 0.06;
  const swing = sk.push ? Math.sin(pushT * TAU) : 0;
  const air = sk.airAmt;
  const armAng = {
    back: lerp(-0.55 + sway + swing * 0.5, -1.9, air),
    front: lerp(0.45 - sway - swing * 0.4, 1.6, air),
    backBend: lerp(0.5, 0.75, air),
    frontBend: lerp(-0.6, -0.85, air),
  };
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
    const r = solve2(shoulder, target, UPPER_ARM, FOREARM, grab.hand === 'front' ? F : { x: -F.x, y: -F.y });
    if (grab.hand === 'front') frontArm = [shoulder, r.mid, r.end];
    else backArm = [shoulder, r.mid, r.end];
  }

  return {
    board,
    fig: { hip, neck, shoulder, head, torsoDir, F, legs, backArm, frontArm },
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
  Sketch.stroke(ctx, [add(heel, down, 3), add(toe, down, 3)], thin(shoe.sole, 2.2));
  Sketch.stroke(ctx, [add(add(heel, F, 1.5), up, 0.5), add(add(toe, F, -3), up, 1.2)], thin(shoe.accent, 1.5));
}

function drawHead(ctx, h, up, F) {
  const hat = Outfit.get('hat'), skin = Outfit.get('skin').color;
  const R = HEAD_R, ua = Math.atan2(up.y, up.x), back = { x: -F.x, y: -F.y }, half = Math.PI / 2;

  Sketch.circle(ctx, h.x, h.y, R, skin, { width: 2.2 });
  const ear = add(add(h, back, 3), up, -1);
  Sketch.circle(ctx, ear.x, ear.y, 2.6, skin, { width: 1.4 });
  // face: dot eye and a little smirk
  const eye = add(add(h, F, 5.5), up, -1.5);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(eye.x, eye.y, 1.6, 0, TAU);
  ctx.fill();
  Sketch.stroke(ctx, [add(add(h, F, 6), up, -5.8), add(add(h, F, 9), up, -4.6)], thin(INK, 1.4));

  if (hat.type === 'beanie') {
    Sketch.shape(ctx, arcPts(h, R + 1.5, ua - half - 0.15, ua + half + 0.15), hat.color, HAT_LINE);
    Sketch.limb(ctx, [add(add(h, up, 1), back, R + 0.5), add(add(h, up, 1), F, R + 0.5)], 3, hat.accent, { amp: 0.2 });
    const pom = add(h, up, R + 4);
    Sketch.circle(ctx, pom.x, pom.y, 3.2, hat.accent, { width: 1.6 });
  } else if (hat.type === 'capBack') {
    const c = add(h, up, 1);
    Sketch.limb(ctx, [add(c, back, R - 3), add(add(c, back, R + 8), up, -1.5)], 2.5, hat.accent, { amp: 0.2 });
    Sketch.shape(ctx, arcPts(c, R + 1, ua - half, ua + half), hat.color, HAT_LINE);
    const btn = add(c, up, R + 1);
    Sketch.circle(ctx, btn.x, btn.y, 1.8, hat.accent, { width: 1.2 });
  } else if (hat.type === 'bucket') {
    const c = add(h, up, 2.5);
    Sketch.shape(ctx, arcPts(c, R, ua - half + 0.2, ua + half - 0.2), hat.color, HAT_LINE);
    Sketch.limb(ctx, [add(c, back, R - 1), add(c, F, R - 1)], 1.8, hat.accent, { amp: 0.2 });
    Sketch.limb(ctx, [add(add(c, back, R + 6), up, -3), add(c, up, -0.5), add(add(c, F, R + 6), up, -3)], 2.5, hat.color, { amp: 0.3 });
  } else if (hat.type === 'helmet') {
    Sketch.stroke(ctx, [add(add(h, back, R - 3), up, -2), add(add(h, F, 2), up, -R + 0.5)], thin(INK, 1.3));
    Sketch.shape(ctx, arcPts(h, R + 3, ua - half - 0.45, ua + half + 0.35), hat.color, HAT_LINE);
    for (const k of [-3, 3]) {
      Sketch.stroke(ctx, [add(add(h, up, R + 1.5), F, k), add(add(h, up, R - 3), F, k * 1.3)], thin(hat.accent, 2));
    }
  } else {
    // hair (spikes swept back), optionally with headphones on top
    const color = hat.type === 'hair' ? hat.color : hat.hair, spikes = [];
    const k = 9, a0 = ua - half - 0.2, a1 = ua + half + 0.2;
    const sweep = wrapAngle(Math.atan2(F.y, F.x) - ua) > 0 ? -0.16 : 0.16; // tips lean toward the back
    for (let i = 0; i <= k; i++) {
      const a = a0 + ((a1 - a0) * i) / k + (i % 2 ? sweep : 0);
      const r = i % 2 ? R + 6 : R + 1;
      spikes.push({ x: h.x + Math.cos(a) * r, y: h.y + Math.sin(a) * r });
    }
    Sketch.shape(ctx, spikes, color, HAT_LINE);
    if (hat.type === 'headphones') {
      Sketch.limb(ctx, arcPts(h, R + 4, ua - half - 0.1, ua + half + 0.1, 8), 2.2, hat.color, { amp: 0.2 });
      Sketch.circle(ctx, ear.x, ear.y, 4.3, hat.accent, { width: 2 });
    }
  }
}

function drawTorso(ctx, f, top) {
  const up = f.torsoDir, F = f.F, hip = f.hip, neck = f.neck;
  const width = top.type === 'hoodie' ? 17 : 15;
  if (top.type === 'hoodie') {
    const hood = add(add(neck, F, -6), up, 1);
    Sketch.circle(ctx, hood.x, hood.y, 7, top.shade, { width: 2 });
  }
  Sketch.limb(ctx, [add(hip, up, -2), neck], width, top.color);
  const at = (k, side) => add(add(hip, up, k), F, side);
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
  } else {
    const logo = at(19, 2.5);
    Sketch.circle(ctx, logo.x, logo.y, 3.6, top.accent, { width: 1.2 });
  }
}

function drawArm(ctx, arm, top, color, skin) {
  const [s, e, hand] = arm;
  if (top.type === 'hoodie' || top.type === 'flannel') {
    Sketch.limb(ctx, arm, 6.5, color);
  } else {
    Sketch.limb(ctx, [mix(s, e, 0.5), e, hand], 5, skin);
    Sketch.limb(ctx, [s, mix(s, e, 0.6)], 7.5, color);
    if (top.type === 'jersey') Sketch.limb(ctx, [mix(s, e, 0.5), mix(s, e, 0.6)], 7.5, top.accent, { amp: 0.1 });
  }
  Sketch.circle(ctx, hand.x, hand.y, 3.2, skin, { width: 1.5 });
}

function drawLeg(ctx, f, leg, pants, color, skin, shoe) {
  if (pants.type === 'shorts') {
    Sketch.limb(ctx, [leg.knee, leg.foot], 6, skin);
    Sketch.limb(ctx, [mix(leg.foot, leg.knee, 0.3), leg.foot], 6, pants.sock);
    Sketch.limb(ctx, [f.hip, mix(f.hip, leg.knee, 1.1)], 11, color);
  } else {
    const w = pants.type === 'cargo' ? 11 : 9;
    Sketch.limb(ctx, [f.hip, leg.knee, leg.foot], w, color);
    if (pants.type === 'cargo') {
      const m = mix(f.hip, leg.knee, 0.62);
      const d = Math.hypot(leg.knee.x - f.hip.x, leg.knee.y - f.hip.y) || 1;
      const dx = (leg.knee.x - f.hip.x) / d, dy = (leg.knee.y - f.hip.y) / d;
      const sq = [[-3, -2.5], [3, -2.5], [3, 2.5], [-3, 2.5]].map(([a, b]) => ({ x: m.x + dx * a - dy * b, y: m.y + dy * a + dx * b }));
      Sketch.stroke(ctx, sq, { ...thin(INK, 1.2), closed: true });
      Sketch.limb(ctx, [mix(leg.knee, leg.foot, 0.8), mix(leg.knee, leg.foot, 0.93)], w + 1.5, color, { amp: 0.2 });
    }
  }
  drawShoe(ctx, leg.foot, f.F, f.torsoDir, shoe);
}

function drawFigure(ctx, f) {
  Sketch.seedFor(40);
  const skin = Outfit.get('skin').color, top = Outfit.get('top'), pants = Outfit.get('pants'), shoe = Outfit.get('shoes');
  drawArm(ctx, f.backArm, top, top.shade, skin);
  drawLeg(ctx, f, f.legs.back, pants, pants.shade, skin, shoe);
  drawLeg(ctx, f, f.legs.front, pants, pants.color, skin, shoe);
  Sketch.limb(ctx, [f.neck, add(f.head, f.torsoDir, -HEAD_R + 2)], 4, skin, { amp: 0.2 });
  drawTorso(ctx, f, top);
  drawHead(ctx, f.head, f.torsoDir, f.F);
  drawArm(ctx, f.frontArm, top, top.color, skin);
}

function drawSkater(ctx, sk) {
  Outfit.override = sk.outfit || null;
  if (sk.state === 'bail') {
    drawBoard(ctx, sk.bail.rag.boardPose());
    drawFigure(ctx, sk.bail.rag.figure());
  } else {
    const pose = riderPose(sk);
    drawBoard(ctx, pose.board);
    drawFigure(ctx, pose.fig);
    if (sk.manual) drawBalance(ctx, sk, pose.fig);
  }
  Outfit.override = null;
}

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
        { color: k < 0.5 ? '#ffd166' : '#f08a3c', width: 2, amp: 0.2, passes: 1, maxLen: 0 });
    } else {
      ctx.globalAlpha = 1 - k;
      const a = 10 + k * 14, b = 22 + k * 14;
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

// Bails: the skater's joints become loose points held together by sticks (verlet-style physics),
// so a slam tumbles, skids and flops instead of playing a canned animation.
// The board flies off on its own as two wheel points joined by a stick, clattering as it lands.

const RAG_RADIUS = { head: 10, hip: 9, neck: 7 }; // everything else uses 4.5

class Ragdoll {
  // fig: the rider's pose at the moment of the bail (from riderPose), vel: skater velocity.
  constructor(fig, board, vel, facing, onHit) {
    this.facing = facing;
    this.onHit = onHit;
    const start = {
      hip: fig.hip, neck: fig.neck, head: fig.head,
      kneeF: fig.legs.front.knee, footF: fig.legs.front.foot,
      kneeB: fig.legs.back.knee, footB: fig.legs.back.foot,
      elbowF: fig.frontArm[1], handF: fig.frontArm[2],
      elbowB: fig.backArm[1], handB: fig.backArm[2],
    };
    // send the body tumbling: everything spins a little around the hips
    const spin = facing * (2.5 + Math.random() * 3);
    this.p = {};
    for (const [name, q] of Object.entries(start)) {
      const rx = q.x - fig.hip.x, ry = q.y - fig.hip.y;
      this.p[name] = {
        x: q.x, y: q.y,
        vx: vel.x * 0.85 - ry * spin, vy: vel.y * 0.55 - 160 + rx * spin,
        r: RAG_RADIUS[name] || 4.5, ground: null,
      };
    }
    const d = (a, b) => Math.hypot(start[a].x - start[b].x, start[a].y - start[b].y);
    const stick = (a, b, stiff = 1) => ({ a, b, len: d(a, b), stiff });
    this.sticks = [
      stick('hip', 'neck'), stick('neck', 'head'), stick('hip', 'head', 0.6), // spine stays fairly straight
      stick('hip', 'kneeF'), stick('kneeF', 'footF'), stick('hip', 'kneeB'), stick('kneeB', 'footB'),
      stick('neck', 'elbowF'), stick('elbowF', 'handF'), stick('neck', 'elbowB'), stick('elbowB', 'handB'),
    ];
    // limbs can fold, but not all the way flat
    this.spacers = [['hip', 'footF', 20], ['hip', 'footB', 20], ['neck', 'handF', 10], ['neck', 'handB', 10], ['head', 'hip', 30]];

    // the board: tail and nose wheel points
    const T = { x: Math.cos(board.ang) * facing, y: Math.sin(board.ang) * facing };
    const bv = { x: vel.x * 1.1, y: vel.y * 0.4 - 260 };
    const bspin = (Math.random() - 0.5) * 16;
    const wheel = side => ({
      x: board.cx + T.x * TRUCK_L * side, y: board.cy + T.y * TRUCK_L * side,
      vx: bv.x - T.y * TRUCK_L * side * bspin, vy: bv.y + T.x * TRUCK_L * side * bspin, r: HB, ground: null,
    });
    this.board = { tail: wheel(-1), nose: wheel(1), roll: board.roll || 0, rv: (Math.random() - 0.5) * 30 };
    this.hitCooldown = 0;
  }

  get hip() { return this.p.hip; }

  step(dt, terrain) {
    const g = CONFIG.gravity;
    this.hitCooldown -= dt;
    const all = [...Object.values(this.p), this.board.tail, this.board.nose];
    const old = new Map();
    for (const q of all) {
      q.vy += g * dt;
      old.set(q, { x: q.x, y: q.y });
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.ground = null;
    }
    // board height above the ground depends on whether it landed wheels down, on its edge, or upside down
    const b = this.board, c = Math.cos(b.roll);
    b.tail.r = b.nose.r = c > 0 ? lerp(11, HB, c * c) : lerp(11, 2.5, c * c);

    for (let it = 0; it < 6; it++) {
      for (const s of this.sticks) this.solve(this.p[s.a], this.p[s.b], s.len, s.stiff);
      for (const [a, bb, min] of this.spacers) this.spread(this.p[a], this.p[bb], min);
      this.solve(b.tail, b.nose, TRUCK_L * 2, 1);
      for (const q of all) {
        const hit = terrain.contact(q.x, q.y, q.r);
        if (hit) { q.x += hit.nx * hit.depth; q.y += hit.ny * hit.depth; q.ground = hit; }
      }
    }

    let hardest = 0;
    for (const q of all) {
      const o = old.get(q);
      q.vx = (q.x - o.x) / dt;
      q.vy = (q.y - o.y) / dt;
      if (!q.ground) continue;
      const n = q.ground, isBoard = q === b.tail || q === b.nose;
      const vn = q.vx * n.nx + q.vy * n.ny;
      if (vn < 0) {
        hardest = Math.max(hardest, -vn * (isBoard ? 0.6 : 1));
        const rest = isBoard ? 0.3 : 0.12;
        q.vx -= n.nx * vn * (1 + rest);
        q.vy -= n.ny * vn * (1 + rest);
      }
      // skid: bodies grip the ground, a board slides
      const fr = isBoard ? 0.02 : 0.25;
      const tx = -n.ny, ty = n.nx, vt = q.vx * tx + q.vy * ty;
      q.vx -= tx * vt * fr;
      q.vy -= ty * vt * fr;
    }
    if (hardest > 250 && this.hitCooldown <= 0) {
      this.onHit(Math.min(1, hardest / 900));
      this.hitCooldown = 0.12;
    }

    // board spin settles to wheels-down or wheels-up once it's sliding on the ground
    b.roll += b.rv * dt;
    if (b.tail.ground || b.nose.ground) {
      b.rv *= Math.pow(0.02, dt);
      b.roll += wrapAngle(Math.round(b.roll / Math.PI) * Math.PI - b.roll) * Math.min(1, 8 * dt);
    }
  }

  solve(a, b, len, stiff) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001;
    const k = ((d - len) / d) * 0.5 * stiff;
    a.x += dx * k; a.y += dy * k;
    b.x -= dx * k; b.y -= dy * k;
  }

  spread(a, b, min) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001;
    if (d >= min) return;
    const k = ((d - min) / d) * 0.5;
    a.x += dx * k; a.y += dy * k;
    b.x -= dx * k; b.y -= dy * k;
  }

  // The pose for drawing, in the same shape riderPose gives.
  figure() {
    const p = this.p;
    const ux = p.neck.x - p.hip.x, uy = p.neck.y - p.hip.y, ul = Math.hypot(ux, uy) || 1;
    const torsoDir = { x: ux / ul, y: uy / ul };
    const F = { x: -torsoDir.y * this.facing, y: torsoDir.x * this.facing };
    const shoulder = add(p.hip, torsoDir, TORSO - 6);
    const pt = q => ({ x: q.x, y: q.y });
    return {
      hip: pt(p.hip), neck: pt(p.neck), shoulder, head: pt(p.head), torsoDir, F,
      legs: { front: { knee: pt(p.kneeF), foot: pt(p.footF) }, back: { knee: pt(p.kneeB), foot: pt(p.footB) } },
      frontArm: [shoulder, pt(p.elbowF), pt(p.handF)],
      backArm: [shoulder, pt(p.elbowB), pt(p.handB)],
    };
  }

  boardPose() {
    const { tail, nose, roll } = this.board, f = this.facing;
    return {
      cx: (tail.x + nose.x) / 2, cy: (tail.y + nose.y) / 2,
      ang: Math.atan2((nose.y - tail.y) * f, (nose.x - tail.x) * f),
      facing: f, roll, yaw: 0, pitch: 0, pivotL: 0, pivotN: 0,
    };
  }
}

// Online play inside the game: sending your skater's pose to the room many times a second, and
// drawing everyone else's skaters. Other skaters are drawn a moment behind real time so there's
// always a newer pose to blend toward, which keeps them moving smoothly.

const POSE_RATE = 15;       // poses sent per second
const REMOTE_DELAY = 0.12;  // seconds behind that other skaters are drawn
const ANGLE_SLOTS = [34, 36, 37, 38]; // board ang / roll / yaw / pitch in a packed pose

// A pose (the figure and the board, as riderPose gives them) packed into a flat list of numbers.
function poseParts(f) {
  return [f.hip, f.neck, f.shoulder, f.head, f.torsoDir, f.F, f.legs.front.knee, f.legs.front.foot,
    f.legs.back.knee, f.legs.back.foot, ...f.backArm, ...f.frontArm];
}

function packPose(sk) {
  const pose = sk.state === 'bail' ? { board: sk.bail.rag.boardPose(), fig: sk.bail.rag.figure() } : riderPose(sk);
  const r = v => Math.round(v * 100) / 100;
  const out = [];
  for (const p of poseParts(pose.fig)) out.push(r(p.x), r(p.y));
  const b = pose.board;
  out.push(r(b.cx), r(b.cy), r(b.ang), b.facing, r(b.roll), r(b.yaw), r(b.pitch), r(b.pivotL), r(b.pivotN), r(pose.fig.flow));
  return out;
}

function unpackPose(a) {
  let i = 0;
  const pt = () => { const p = { x: a[i], y: a[i + 1] }; i += 2; return p; };
  const [hip, neck, shoulder, head, torsoDir, F, kf, ff, kb, fb, b0, b1, b2, f0, f1, f2] = Array.from({ length: 16 }, pt);
  const board = { cx: a[i], cy: a[i + 1], ang: a[i + 2], facing: a[i + 3], roll: a[i + 4], yaw: a[i + 5], pitch: a[i + 6], pivotL: a[i + 7], pivotN: a[i + 8] };
  return {
    board,
    fig: { hip, neck, shoulder, head, torsoDir, F, legs: { front: { knee: kf, foot: ff }, back: { knee: kb, foot: fb } },
      backArm: [b0, b1, b2], frontArm: [f0, f1, f2], flow: a[i + 9] },
  };
}

// Blend two packed poses; a spin that wrapped right round snaps instead of unwinding backwards.
function blendPose(a, b, k) {
  return a.map((v, i) => (ANGLE_SLOTS.includes(i) && Math.abs(b[i] - v) > Math.PI) || i === 35 ? b[i] : v + (b[i] - v) * k);
}

const Online = (() => {
  const remotes = new Map(); // id -> { name, outfit, snaps, pose, track, air, n }
  let sendTimer = 0, clock = 0, mine = null;

  function remote(id) {
    let r = remotes.get(id);
    if (!r) {
      const p = Net.players.find(q => q.id === id) || { name: 'Skater', outfit: {} };
      r = { id, name: p.name, outfit: Outfit.clean(p.outfit), snaps: [], pose: null, track: new TrailTrack(), air: false, n: 0 };
      remotes.set(id, r);
    }
    return r;
  }

  Net.on('pose', msg => {
    if (msg.from === Net.me) return;
    const r = remote(msg.from);
    // they just stepped back a copy of the endless hill: don't slide them all the way across
    const last = r.snaps[r.snaps.length - 1];
    if (last && Math.abs(msg.p[32] - last.p[32]) > 1000) { r.snaps.length = 0; r.track = new TrailTrack(); }
    r.snaps.push({ t: clock, p: msg.p, air: msg.air, n: msg.n });
    if (r.snaps.length > 8) r.snaps.shift();
  });

  // keep names and outfits up to date, and forget people who've gone
  function syncRoster() {
    for (const p of Net.players) {
      if (p.id === Net.me) continue;
      const r = remote(p.id);
      r.name = p.name;
      r.outfit = Outfit.clean(p.outfit);
    }
    for (const id of remotes.keys()) if (!Net.players.some(p => p.id === id)) remotes.delete(id);
  }

  // sendPose: whether your skater is out there to be seen right now
  function update(dt, sk, sendPose) {
    clock += dt;
    mine = sk;
    if (sendPose && (sendTimer -= dt) <= 0) {
      sendTimer = 1 / POSE_RATE;
      Net.send({ t: 'pose', p: packPose(sk), air: sk.state === 'air', n: sk.combo.entries.length });
    }
    const at = clock - REMOTE_DELAY;
    for (const r of remotes.values()) {
      const s = r.snaps;
      if (!s.length) continue;
      let a = s[0], b = s[0];
      for (let i = 1; i < s.length; i++) { if (s[i].t <= at) a = s[i]; b = s[i]; if (s[i].t > at) break; }
      const k = b.t > a.t ? clamp((at - a.t) / (b.t - a.t), 0, 1) : 1;
      const prev = r.pose;
      r.pose = unpackPose(blendPose(a.p, b.p, k));
      r.vx = prev ? (r.pose.board.cx - prev.board.cx) / Math.max(dt, 1e-3) : 0;
      r.air = b.air;
      r.n = b.n;
      r.track.update(r.pose.board.cx, r.pose.board.cy, r.n, true, dt);
    }
  }

  function draw(ctx, time, only = null) {
    for (const r of remotes.values()) {
      if (!r.pose || (only && r.id !== only)) continue;
      // on the endless hill everyone steps back on their own, so show them on your copy of it
      const L = mine?.terrain.loop, k = L ? Math.round((mine.pos.x - r.pose.board.cx) / L.dx) : 0;
      ctx.save();
      ctx.translate(k * (L?.dx || 0), k * (L?.dy || 0));
      r.track.draw(ctx, OUTFIT_OPTIONS.trail[r.outfit.trail], time);
      Outfit.override = r.outfit;
      drawBoard(ctx, r.pose.board);
      drawFigure(ctx, r.pose.fig);
      Outfit.override = null;
      const h = r.pose.fig.head;
      markerText(ctx, r.name, h.x, h.y - 34, 20, '#ffffff');
      ctx.restore();
    }
  }

  // Where the camera should look to follow another skater: { x, y, vx, air }.
  function focus(id) {
    const r = remotes.get(id);
    if (!r?.pose) return null;
    return { x: r.pose.fig.hip.x, y: r.pose.board.cy, vx: r.vx || 0, air: r.air };
  }

  function clear() { remotes.clear(); }

  return { update, draw, focus, clear, syncRoster };
})();

// Any map an online room might be on, unlocked here or not (the host picked it).
function findAnyMap(id) {
  return [...MAPS, ...SECRET_MAPS, ...HIDDEN_SPOTS].find(m => m.id === id) || MAPS[0];
}

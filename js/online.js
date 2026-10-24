// Online play inside the game: sending your skater's pose to the room many times a second, and
// drawing everyone else's skaters.
//
// Over the internet poses don't arrive evenly: some come late, some bunch up, now and then a few
// stall and then all land at once. So each pose says when it was sent, and other skaters are
// played back on the sender's own clock, a little behind: far enough behind that there's nearly
// always a newer pose to blend toward. How far is worked out as you go from how bumpy their
// connection is (a smooth one plays back quicker).

const POSE_RATE = 15;         // poses sent per second
const PLAY_DELAY_MIN = 0.1;   // seconds behind the sender, at the least...
const PLAY_DELAY_MAX = 0.6;   // ...and at the most, however bad the connection
const ANGLE_SLOTS = [34, 36, 37, 38]; // board ang / roll / yaw / pitch in a packed pose
const netClock = () => performance.now() / 1000; // seconds, for pose timing

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
  let sendTimer = 0, mine = null;

  function remote(id) {
    let r = remotes.get(id);
    if (!r) {
      const p = Net.players.find(q => q.id === id) || { name: 'Skater', outfit: {} };
      r = { id, name: p.name, outfit: Outfit.clean(p.outfit), snaps: [], lags: [], base: 0, delay: PLAY_DELAY_MIN, want: PLAY_DELAY_MIN, pose: null, track: new TrailTrack(), air: false, n: 0 };
      remotes.set(id, r);
    }
    return r;
  }

  Net.on('pose', msg => {
    if (msg.from === Net.me) return;
    const r = remote(msg.from), arrived = netClock();
    // (a skater on an older version doesn't say when they sent it: use when it got here)
    const ts = Number.isFinite(msg.ts) ? msg.ts : arrived;
    if (r.lastTs !== undefined && ts <= r.lastTs) return; // older than one we've got
    r.lastTs = ts;
    // they just stepped back a copy of the endless hill: don't slide them all the way across
    const last = r.snaps[r.snaps.length - 1];
    if (last && Math.abs(msg.p[32] - last.p[32]) > 1000) { r.snaps.length = 0; r.track = new TrailTrack(); r.jump = true; }
    r.snaps.push({ ts, p: msg.p, air: msg.air, n: msg.n });
    if (r.snaps.length > 40) r.snaps.shift();
    // Their clock against ours, plus the trip: the quickest trip lately is the best guess. And how
    // bumpy it is: how much slower than that the slow ones are (nine in ten get here within it).
    r.lags.push({ at: arrived, lag: arrived - ts });
    while (r.lags.length > 1 && r.lags[0].at < arrived - 8) r.lags.shift();
    r.base = Math.min(...r.lags.map(l => l.lag));
    const late = r.lags.map(l => l.lag - r.base).sort((x, y) => x - y);
    // enough cushion for nearly all of them: it grows straight away when things get bumpy, and
    // shrinks back slowly once they calm down (see update)
    r.want = clamp(1 / POSE_RATE + late[Math.floor((late.length - 1) * 0.98)] + 0.04, PLAY_DELAY_MIN, PLAY_DELAY_MAX);
    if (r.want > r.delay) r.delay = r.want;
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
    mine = sk;
    if (sendPose && (sendTimer -= dt) <= 0) {
      sendTimer = 1 / POSE_RATE;
      Net.send({ t: 'pose', p: packPose(sk), air: sk.state === 'air', n: sk.combo.entries.length, ts: netClock() });
    }
    const t = netClock();
    for (const r of remotes.values()) {
      const s = r.snaps;
      if (!s.length) continue;
      // when (on their clock) to show them: now, less the trip, less the cushion. Eased toward
      // rather than jumped to, so a change in their connection doesn't make them skip.
      if (r.want < r.delay) r.delay = Math.max(r.want, r.delay - 0.05 * dt);
      const target = t - r.base - r.delay;
      if (r.play === undefined || r.jump || Math.abs(target - r.play) > 0.5) r.play = target;
      else r.play += dt + (target - r.play) * Math.min(1, dt * 3);
      r.jump = false;
      // the poses either side of then
      let i = 0;
      while (i < s.length && s[i].ts <= r.play) i++;
      const a = s[Math.max(0, i - 1)], b = s[Math.min(i, s.length - 1)];
      const k = b.ts > a.ts ? clamp((r.play - a.ts) / (b.ts - a.ts), 0, 1) : 1;
      let p = blendPose(a.p, b.p, k);
      // caught up with the newest pose (a hiccup): keep them rolling the way they were going, briefly
      if (i >= s.length && s.length >= 2) {
        const q = s[s.length - 2], span = b.ts - q.ts, ahead = Math.min(r.play - b.ts, 0.25);
        if (span > 0 && ahead > 0) {
          const dx = (b.p[32] - q.p[32]) / span * ahead, dy = (b.p[33] - q.p[33]) / span * ahead;
          p = p.slice();
          for (let j = 0; j <= 33; j += 2) { p[j] += dx; p[j + 1] += dy; }
        }
      }
      while (s.length > 2 && s[1].ts < r.play - 0.5) s.shift(); // long gone
      const prev = r.pose;
      r.pose = unpackPose(p);
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

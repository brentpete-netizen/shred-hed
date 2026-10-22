// Things to find while you skate (Free Skate only): golden S-K-A-T-E letters tucked into
// hard-to-reach places on each map, and hidden spots you warp to by pulling off something
// special. Also draws the colour trail when that's switched on.

// Where the letters float, worked out from each map's layout. h = height above what's there.
const LETTER_SPOTS = {
  park: T => [
    copingSpot(T, -1, 120),          // S: big air out of the left quarter pipe
    railSpot(T, 0, 0.5, 70),         // K: over the flat bar
    aboveGround(T, 1196, 170),       // A: high over the funbox deck
    aboveGround(T, 1877, 150),       // T: over the manual pad
    copingSpot(T, 1, 160),           // E: huge air out of the right quarter pipe
  ],
  street: T => [
    aboveGround(T, 1366, 50),        // S: on the car roof
    aboveGround(T, 670, 140),        // K: ollie the stairs, high
    railSpot(T, 3, 0.5, 60),         // A: over the planter
    aboveGround(T, 2350, 150),       // T: off the bank lip
    copingSpot(T, 1, 120),           // E: out of the end quarter pipe
  ],
  school: T => [
    railSpot(T, 0, 0.5, 60),         // S: over the picnic table
    aboveGround(T, 1110, 130),       // K: over the big eight
    aboveGround(T, 1801, 200),       // A: in the air over the gap
    railSpot(T, 4, 0.5, 60),         // T: over the court bench
    copingSpot(T, 1, 150),           // E: out of the gym bank
  ],
  mega: T => {
    const lip = T.kickerLip;
    return [
      aboveGround(T, 150, 90),         // S: up on the tower
      { x: lip.x + 560, y: lip.y - 420 }, // K: way, way up off the mega kicker (ollie at the lip)
      aboveGround(T, lip.x + 1350, 140), // A: over the landing ramp
      railSpot(T, 0, 0.5, 60),         // T: over the DIY ledge
      copingSpot(T, 1, 200),           // E: out of the mega quarter
    ];
  },
};

function aboveGround(T, x, h) { return { x, y: T.groundYAt(x) - h }; }
function railSpot(T, i, t, h) {
  const pts = T.railLines[i].pts, a = pts[0], b = pts[pts.length - 1];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t - h };
}
function copingSpot(T, end, h) {
  const c = T.copings.find(c => c.end === end);
  return { x: c.pt.x - end * 35, y: c.pt.y - h };
}

const Bonus = (() => {
  let letters = [], mapId = null, terrain = null;
  let pad = null, padRun = null, bigRail = null, grindRun = null, lastGrind = null, endLip = null;
  const trail = [];

  function load(id, T) {
    mapId = id;
    terrain = T;
    letters = LETTER_SPOTS[id] ? LETTER_SPOTS[id](T).map((p, i) => ({ ...p, i, letter: SKATE_WORD[i] })) : [];
    // the manual pad on the skatepark, and the big kinked handrail at the school
    pad = id === 'park' ? T.segs.find(s => Math.abs(s.a.y + 16) < 0.5 && Math.abs(s.ang) < 0.01 && s.len > 250) : null;
    const line = id === 'school' ? T.railLines.findIndex(r => r.pts.length === 4) : -1;
    bigRail = line >= 0 ? T.rails.filter(s => T.railLines[line].pts.includes(s.a) || T.railLines[line].pts.includes(s.b)) : null;
    endLip = id === 'street' ? T.copings.find(c => c.end === 1).pt : null;
    padRun = grindRun = lastGrind = null;
    trail.length = 0;
  }

  // Returns the id of a hidden spot to warp to, if you just found one.
  function update(sk, dt, free) {
    if (!terrain || !free) return null;
    if (sk.state !== 'bail') {
      const N = { x: Math.sin(sk.ang), y: -Math.cos(sk.ang) };
      const body = { x: sk.pos.x + N.x * 45, y: sk.pos.y + N.y * 45 };
      for (const L of letters) {
        if (Progress.hasLetter(mapId, L.i)) continue;
        if (Math.hypot(body.x - L.x, body.y - L.y) < 44) Progress.collectLetter(mapId, L.i, L.letter);
      }
    }

    // Skatepark: manual the whole manual pad, end to end, without putting the wheels down
    if (pad) {
      const onPad = sk.state === 'ground' && terrain.segs[sk.seg] === pad;
      if (sk.manual && onPad) {
        if (!padRun) padRun = { from: sk.pos.x, far: 0 };
        padRun.far = Math.max(padRun.far, Math.abs(sk.pos.x - padRun.from));
      } else if (padRun) {
        // still in the manual when you roll (or ollie) off the far end counts; putting it down on the pad doesn't
        const made = !onPad && padRun.far > pad.len - 90; // the lip of the pad pops you up, so you can't start right at the edge
        padRun = null;
        if (made) return spot('pool');
      }
    }

    // School: grind the big handrail from the top all the way off the bottom in one go
    if (bigRail) {
      const g = sk.grind;
      if (g && bigRail.includes(g.rail)) {
        if (!grindRun) grindRun = { startedAt: bigRail.indexOf(g.rail) };
        lastGrind = { rail: g.rail, s: g.s };
      } else if (grindRun) {
        const last = bigRail[bigRail.length - 1];
        const made = grindRun.startedAt <= 1 && lastGrind && lastGrind.rail === last && lastGrind.s >= last.len - 14 && sk.state === 'air';
        grindRun = lastGrind = null;
        if (made) return spot('drain');
      }
    }

    // Street: launch way, way out of the quarter pipe at the end (a charged ollie right at the lip)
    if (endLip && sk.state === 'air' && sk.pos.x > endLip.x - 80 && sk.pos.y < endLip.y - 110) return spot('rooftops');

    // colour trail
    if (Progress.cheat('trail') && sk.state !== 'bail') {
      const N = { x: Math.sin(sk.ang), y: -Math.cos(sk.ang) };
      trail.push({ x: sk.pos.x + N.x * 6, y: sk.pos.y + N.y * 6, t: 0 });
    }
    for (const p of trail) p.t += dt;
    while (trail.length && (trail[0].t > 0.55 || trail.length > 60)) trail.shift();
    return null;
  }

  function spot(id) {
    const s = HIDDEN_SPOTS.find(h => h.id === id);
    Progress.findSpot(id, s.title);
    return id;
  }

  function draw(ctx, time) {
    // the trail: colour bands that fade out behind you
    if (trail.length > 1) {
      ctx.lineCap = 'round';
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1], b = trail[i];
        ctx.strokeStyle = `hsla(${(i * 14 + time * 240) % 360}, 90%, 60%, ${0.8 * (1 - b.t / 0.55)})`;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    // golden letters, spinning and bobbing
    for (const L of letters) {
      if (Progress.hasLetter(mapId, L.i)) continue;
      ctx.save();
      ctx.translate(L.x, L.y + Math.sin(time * 3 + L.i) * 5);
      ctx.scale(Math.max(0.15, Math.abs(Math.cos(time * 2 + L.i))), 1);
      ctx.shadowColor = '#ffe27a';
      ctx.shadowBlur = 14;
      markerText(ctx, L.letter, 0, 0, 34, '#f4c542');
      ctx.restore();
    }
  }

  return { load, update, draw, lettersOn: () => letters.length };
})();

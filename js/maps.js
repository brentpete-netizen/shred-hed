// The four maps. Each one is built left to right with a MapBuilder, which lays down the ground
// chain (flats, slopes, curves, stairs...) and drops grindable props and scenery along the way.
// Screen y points down, so negative heights are up.

class MapBuilder {
  constructor(x, y) {
    this.pts = [{ x, y }];
    this.rails = [];
    this.decor = [];
    this.back = [];
    this.front = [];
    this.ends = { start: 'coping', end: 'coping' };
  }

  // Start with a quarter pipe whose coping is at (x, y - R - ext), curving down to (x + R, y).
  static qpStart(x, y, R, ext) {
    const b = new MapBuilder(x, y - R - ext);
    return b.to(0, ext).bend(R, 0, Math.PI / 2);
  }

  // Start against a wall of height h at x (rolling into it bonks you).
  static wallStart(x, y, h) {
    const b = new MapBuilder(x, y - h);
    b.ends.start = 'wall';
    return b.to(0, h);
  }

  get cur() { return this.pts[this.pts.length - 1]; }

  get heading() {
    const n = this.pts.length;
    if (n < 2) return 0;
    const a = this.pts[n - 2], b = this.pts[n - 1];
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  to(dx, dy, curved = false) {
    const c = this.cur;
    this.pts.push({ x: c.x + dx, y: c.y + dy, curved });
    return this;
  }

  flat(len) { return this.to(len, 0); }

  line(len, ang) { return this.to(Math.cos(ang) * len, Math.sin(ang) * len); }

  // A smooth curve of radius R from the current heading to `toAng` (negative = uphill).
  // Curving up is a transition (pumpable); curving down is a rounded lip (no launch).
  bend(R, toAng, from = this.heading) {
    const turn = toAng - from, s = Math.sign(turn);
    if (!s) return this;
    const p0 = this.cur, concave = turn < 0;
    const cx = p0.x - R * Math.sin(from) * s, cy = p0.y + R * Math.cos(from) * s;
    if (concave) p0.curved = true;
    const k = Math.ceil(Math.abs(turn) / 0.06);
    for (let i = 1; i <= k; i++) {
      const phi = from + (turn * i) / k;
      this.pts.push({ x: cx + R * Math.sin(phi) * s, y: cy - R * Math.cos(phi) * s, curved: concave });
    }
    return this;
  }

  qpEnd(R, ext) {
    this.bend(R, -Math.PI / 2, 0).to(0, -ext);
    this.ends.end = 'coping';
    return this;
  }

  wallEnd(h) {
    this.to(0, -h);
    this.ends.end = 'wall';
    return this;
  }

  // Stairs going down, optionally with a kinked handrail over them.
  stairs(n, { rise = 14, run = 28, rail = true, railH = 34 } = {}) {
    const top = { ...this.cur };
    for (let i = 0; i < n; i++) {
      this.to(0, rise);
      if (i < n - 1) this.to(run, 0);
    }
    if (rail) {
      const y0 = top.y - railH, y1 = top.y + n * rise - railH, x1 = top.x + n * run;
      this.rails.push({ kind: 'rail', pts: [{ x: top.x - 70, y: y0 }, { x: top.x, y: y0 }, { x: x1, y: y1 }, { x: x1 + 60, y: y1 }] });
    }
    return this;
  }

  // A grindable prop standing on flat ground ahead: starts dx past here, len long, h tall.
  prop(kind, dx, len, h) {
    const c = this.cur;
    this.rails.push({ kind, pts: [{ x: c.x + dx, y: c.y - h }, { x: c.x + dx + len, y: c.y - h }] });
    return this;
  }

  // A parked car you can ollie onto (its bumpers are walls).
  car(color) {
    const c = { ...this.cur };
    const shape = [[0, -26], [6, -30], [60, -36], [100, -66], [175, -68], [205, -44], [245, -40], [250, -30], [250, 0]];
    for (const [x, y] of shape) this.pts.push({ x: c.x + x, y: c.y + y });
    this.front.push({ type: 'car', x: c.x, y: c.y, color, shape });
    return this;
  }

  scenery(item) { this.back.push(item); return this; }

  // A named gap (see gaps.js): pop between x0 and x1, come down between x2 and x3 (and at least
  // `drop` lower than you took off, for one that goes down stairs).
  gap(name, pts, [x0, x1], [x2, x3], drop = -1e9) {
    (this.gaps ||= []).push({ name, pts, from: [x0, x1], to: [x2, x3], drop });
    return this;
  }

  build({ spawn, theme, name, gravity }) {
    const T = new Terrain({
      points: this.pts, spawn, ends: this.ends, rails: this.rails,
      decor: this.decor, back: this.back, front: this.front, theme, name, gravity,
    });
    T.gaps = this.gaps || [];
    return T;
  }
}

// ---------------------------------------------------------------- the maps

const THEMES = {
  park:   { ground: '#d8d3c8', hatch: 'rgba(90, 84, 74, 0.22)', sky: 'city' },
  street: { ground: '#bfbab0', hatch: 'rgba(70, 66, 60, 0.25)', sky: 'downtown' },
  school: { ground: '#b3aea6', hatch: 'rgba(70, 66, 60, 0.22)', sky: 'suburb' },
  mega:   { ground: '#d6cdbb', hatch: 'rgba(110, 90, 60, 0.22)', sky: 'hills' },
  moon:   { ground: '#bdbac8', hatch: 'rgba(70, 66, 90, 0.25)', sky: 'space' },
  lava:   { ground: '#c97a5e', hatch: 'rgba(110, 30, 20, 0.25)', sky: 'volcano' },
  hill:   { ground: '#cfc6ae', hatch: 'rgba(100, 86, 60, 0.22)', sky: 'hills' },
  drain:  { ground: '#aaa69c', hatch: 'rgba(60, 60, 56, 0.25)', sky: 'hills' },
  beach:  { ground: '#e6d3a3', hatch: 'rgba(150, 110, 60, 0.22)', sky: 'beach' },
};

function buildSkatepark() {
  const b = MapBuilder.qpStart(0, 0, 180, 10);
  b.flat(110).prop('rail', 180, 290, 32).flat(690);
  // funbox with a handrail down the back
  const up = 50 / Math.tan(0.42), lip = { ...b.to(up, -50).cur };
  const deckEnd = { ...b.flat(210).cur };
  const bottom = { ...b.to(170, 50).cur };
  const slope = makeSeg(deckEnd, bottom);
  const along = (t, off) => ({ x: deckEnd.x + (bottom.x - deckEnd.x) * t + slope.nx * off, y: deckEnd.y + (bottom.y - deckEnd.y) * t + slope.ny * off });
  b.rails.push({ kind: 'rail', pts: [along(0.06, 30), along(0.9, 30)] });
  b.decor.push([lip, { x: lip.x, y: 0 }], [deckEnd, { x: deckEnd.x, y: 0 }]);
  // manual pad with bevelled edges, then a long ledge
  b.flat(260);
  const pad = { ...b.cur };
  b.to(16, -16).flat(260).to(16, 16);
  b.decor.push([{ x: pad.x + 16, y: -16 }, { x: pad.x + 16, y: 0 }], [{ x: pad.x + 276, y: -16 }, { x: pad.x + 276, y: 0 }]);
  b.flat(240).prop('ledge', 0, 350, 26).flat(780);
  b.qpEnd(200, 10);
  b.gap('Over The Rail', 150, [300, 468], [765, 1080]);
  b.gap('Funbox Gap', 300, [lip.x - 240, lip.x + 4], [bottom.x + 4, bottom.x + 600]);
  b.gap('Deck To Pad', 250, [deckEnd.x - 120, deckEnd.x + 2], [pad.x + 20, pad.x + 270]);
  b.gap('Pad Hop', 200, [pad.x - 300, pad.x], [pad.x + 300, pad.x + 700]);
  b.scenery({ type: 'fence', x0: -160, x1: b.cur.x + 160, y: 0, h: 70 });
  for (const x of [700, 1650, 2500, 3300]) b.scenery({ type: 'tree', x, y: -6, s: 1 });
  return b.build({ spawn: { x: 300, y: 0 }, theme: THEMES.park, name: 'Skatepark' });
}

function buildStreet() {
  const b = MapBuilder.wallStart(0, 0, 520);
  b.front.push({ type: 'facade', x0: -160, x1: 0, top: -520, bottom: 0, style: 'shop' });
  b.prop('bench', 200, 150, 28).flat(600);
  b.scenery({ type: 'lamp', x: 480, y: 0 });
  const stairTop = b.cur.x;
  b.stairs(5);                         // down to the plaza
  const stairEnd = b.cur.x;
  b.gap('Five Stair', 250, [stairTop - 160, stairTop + 4], [stairEnd + 4, stairEnd + 300], 40);
  b.flat(260).to(14, 12);              // curb cut down to the street
  b.flat(240);
  const car = b.cur.x;
  b.car('#3f7fd6').flat(200);
  b.gap('Car Hop', 400, [car - 260, car - 2], [car + 254, car + 520]);
  b.gap('Car Roof', 200, [car - 260, car - 2], [car + 110, car + 170]);
  b.prop('curb', 0, 180, 11).flat(380);
  b.scenery({ type: 'lamp', x: b.cur.x - 120, y: b.cur.y });
  b.bend(150, -0.42).line((82 - 150 * (1 - Math.cos(0.42))) / Math.sin(0.42), -0.42); // bank back up to the sidewalk
  b.flat(160).prop('planter', 80, 220, 30).flat(420);
  b.prop('rail', 60, 200, 30).flat(360);
  b.qpEnd(210, 10);
  for (const [x, w, h, c] of [[90, 260, 360, '#cfc4b0'], [420, 200, 300, '#c9b8a8'], [700, 300, 420, '#bfc6c9'], [1100, 240, 330, '#d1c2b4'],
    [1420, 280, 460, '#c4c8c0'], [1780, 220, 300, '#cdbfae'], [2080, 300, 400, '#c2c6cc'], [2460, 260, 340, '#cfc1ae'], [2800, 300, 420, '#c6c0b8']]) {
    b.scenery({ type: 'building', x, w, h, y: 0, color: c });
  }
  b.scenery({ type: 'sign', x: 1300, y: 82, text: 'STOP' });
  return b.build({ spawn: { x: 140, y: 0 }, theme: THEMES.street, name: 'Street' });
}

function buildSchool() {
  const b = MapBuilder.wallStart(0, 0, 520);
  b.front.push({ type: 'facade', x0: -160, x1: 0, top: -520, bottom: 0, style: 'school' });
  b.prop('table', 120, 160, 42).prop('bench', 120, 160, 20).flat(680);
  b.prop('planter', 60, 200, 28).flat(330);
  const eightTop = b.cur.x;
  b.stairs(8);                         // the big eight
  b.gap('The Big Eight', 500, [eightTop - 170, eightTop + 4], [b.cur.x + 4, b.cur.x + 420], 60);
  b.flat(520);
  // the gap: a ditch between the walkway and the court below
  const ditch = b.cur.x;
  b.to(0, 110).flat(150).to(35, -50);
  const court = { ...b.cur };
  b.gap('School Gap', 400, [ditch - 220, ditch], [court.x + 4, court.x + 500]);
  b.prop('bench', 380, 140, 24).flat(700);
  b.front.push({ type: 'court', x0: court.x + 40, x1: court.x + 660, y: court.y });
  b.qpEnd(200, 10);
  b.scenery({ type: 'schoolBuilding', x: 60, w: 900, h: 300, y: 0 });
  b.scenery({ type: 'flag', x: 1320, y: 112 });
  b.scenery({ type: 'hoop', x: court.x + 560, y: court.y });
  for (const x of [1250, 1500, 2400]) b.scenery({ type: 'tree', x, y: b.pts.find(p => p.x >= x).y - 4, s: 1.2 });
  return b.build({ spawn: { x: 140, y: 0 }, theme: THEMES.school, name: 'School Yard' });
}

const MEGA = { tower: 900, kicker: 200, gap: 520, landing: 1150 };

function buildMega() {
  const b = MapBuilder.wallStart(0, -MEGA.tower, 320);
  b.flat(260);
  // roll-in: rounded lip, a long steep drop, and a big transition to the runway
  b.bend(160, 0.9);
  const drop = (0 - 700 * (1 - Math.cos(0.9))) - b.cur.y;
  b.line(drop / Math.sin(0.9), 0.9).bend(700, 0);
  const runway = b.cur.x;
  b.flat(900);
  // the mega kicker, the pit, and a long landing ramp
  b.bend(420, -0.62);
  b.line((MEGA.kicker - 420 * (1 - Math.cos(0.62))) / Math.sin(0.62), -0.62);
  const lip = { ...b.cur };
  const wall = MEGA.kicker / Math.sin(0.96);
  b.line(wall, 0.96).flat(MEGA.gap).line(wall, -0.96).flat(30);
  b.gap('MEGA GAP', 1500, [lip.x - 200, lip.x + 4], [b.cur.x, b.cur.x + MEGA.landing + 300]);
  b.to(MEGA.landing, -b.cur.y);
  // the DIY spot under the bridge
  const diy = b.cur.x;
  b.flat(250).to(90, -32).flat(60).to(90, 32).flat(120);
  b.gap('Bump To Ledge', 250, [diy + 250, diy + 400], [b.cur.x + 20, b.cur.x + 260]);
  b.prop('ledge', 0, 240, 28).flat(300).prop('rail', 60, 200, 30).flat(340);
  b.qpEnd(340, 14);
  b.front.push({ type: 'scaffold', x0: -160, x1: runway, top: -MEGA.tower });
  b.front.push({ type: 'paint', x: lip.x - 200, y: -40, text: 'SEND IT' });
  b.scenery({ type: 'bridge', x0: diy - 200, x1: b.cur.x - 120, y: -430 });
  for (const [x, c] of [[diy + 140, '#e2553f'], [diy + 820, '#6c4bd1']]) b.scenery({ type: 'graffiti', x, y: -120, color: c });
  const T = b.build({ spawn: { x: 120, y: -MEGA.tower }, theme: THEMES.mega, name: 'Mega Ramp' });
  T.maxSpeed = 1950; // you can go faster than anywhere else down the big roll-in
  T.kickerLip = lip;
  return T;
}

// The boardwalk by the beach: a bench and a long rail, then the lifeguard kicker and a jump over
// the water (come up short and you're swimming), a picnic table, a sand dune and the sea wall.
const BOARDWALK = { kicker: 70, lipAng: 0.45, pool: 150, deck: -40, landing: 0.22 };

function buildBoardwalk() {
  const b = MapBuilder.qpStart(0, 0, 200, 10);
  b.flat(140).prop('bench', 90, 160, 26).flat(460);
  b.prop('rail', 40, 300, 30).flat(420);
  // the lifeguard kicker, straight down into the water, and a landing deck on the far side
  const K = BOARDWALK, R = 240;
  b.bend(R, -K.lipAng).line((K.kicker - R * (1 - Math.cos(K.lipAng))) / Math.sin(K.lipAng), -K.lipAng);
  const lip = { ...b.cur };
  b.to(0, K.kicker + 120);
  const poolStart = b.cur.x;
  b.flat(K.pool);
  const poolEnd = b.cur.x;
  b.to(0, -(120 - K.deck));
  b.line(-K.deck / Math.sin(K.landing), K.landing); // the landing ramp, down to the boardwalk
  b.gap('Lifeguard Leap', 400, [lip.x - 220, lip.x + 4], [poolEnd, poolEnd + 600]);
  b.flat(240).prop('table', 70, 160, 42).flat(420);
  const dune = b.cur.x;
  b.line(70, -0.5).flat(120).line(70, 0.5); // a sand dune
  b.gap('Dune Jump', 200, [dune + 30, dune + 190], [dune + 270, dune + 600]);
  b.flat(300).prop('ledge', 40, 320, 30).flat(520); // the sea wall
  b.qpEnd(230, 12);
  for (const x of [120, 900, 1900, 2700, 3500]) b.scenery({ type: 'palm', x, y: 0, s: 0.9 + (x % 3) * 0.12 });
  for (const [x, c] of [[600, '#e2553f'], [2300, '#2f80ed'], [3200, '#f4c542']]) b.scenery({ type: 'umbrella', x, y: 0, color: c });
  b.scenery({ type: 'lifeguard', x: lip.x - 230, y: 0 });
  b.front.push({ type: 'water', x0: poolStart, x1: poolEnd, y: 30, bottom: 120 });
  b.front.push({ type: 'paint', x: poolEnd + 210, y: -60, text: 'SURF & SHRED' });
  const T = b.build({ spawn: { x: 300, y: 0 }, theme: THEMES.beach, name: 'Boardwalk' });
  T.water = [{ x0: poolStart, x1: poolEnd, y: 30 }];
  T.kickerLip = lip;
  return T;
}

// ---------------------------------------------------------------- the hidden ones

function buildMoon() {
  const b = MapBuilder.qpStart(0, 0, 260, 12);
  b.flat(260);
  b.line(70, 0.45).flat(160).line(70, -0.45);           // a crater
  b.flat(200).prop('rail', 40, 420, 40).flat(560);       // the antenna pipe
  b.bend(160, -0.5).line(60, -0.5).flat(160).line(60, 0.5).bend(160, 0); // a moon mound
  b.flat(240).line(90, 0.5).flat(200).line(90, -0.5);    // a bigger crater
  b.flat(300).prop('ledge', 20, 300, 30).flat(500);
  b.qpEnd(260, 12);
  for (const x of [520, 1500, 2600, 3400]) b.scenery({ type: 'dome', x, y: 0 });
  return b.build({ spawn: { x: 420, y: 0 }, theme: THEMES.moon, name: 'Moon Base', gravity: 760 });
}

function buildLavaPipe() {
  const b = MapBuilder.qpStart(0, 0, 340, 20);
  b.flat(420).line(70, -0.55).line(70, 0.55).flat(420);  // a little spine in the middle
  b.qpEnd(340, 20);
  return b.build({ spawn: { x: 520, y: 0 }, theme: THEMES.lava, name: 'Lava Pipe' });
}

// Hill Bomb never ends: it's the same stretch of hill over and over. The ground holds a few
// copies of it, and whenever you get to the third copy, everything quietly steps back one copy
// (wrapWorld in game.js), so there's always more hill ahead.
const HILL = { slope: 0.13, copies: 4, wrapAt: 2 };

function buildHillBomb() {
  const b = MapBuilder.wallStart(0, -700, 300);
  b.flat(220).bend(300, HILL.slope);
  const tan = Math.tan(HILL.slope);
  const kicker = (run, lip) => b.line(run, HILL.slope).bend(120, -lip).line(30, -lip).to(0, 40);
  const rail = (kind, run, h) => {
    const a = { ...b.cur };
    b.line(run, HILL.slope);
    const c = b.cur;
    b.rails.push({ kind, pts: [{ x: a.x + 40, y: a.y + 40 * tan - h }, { x: c.x - 40, y: c.y - 40 * tan - h }] });
  };
  const starts = [];
  for (let k = 0; k <= HILL.copies; k++) {
    starts.push({ x: b.cur.x, y: b.cur.y, pts: b.pts.length, rails: b.rails.length });
    if (k === HILL.copies) break;
    kicker(520, 0.3);
    rail('rail', 560, 32);
    kicker(480, 0.42); // a bigger one
    rail('ledge', 520, 26);
    for (const [dx, s] of [[150, 1.1], [820, 1.3], [1500, 1]]) {
      const x = starts[k].x + dx;
      b.scenery({ type: 'tree', x, y: b.pts.find(p => p.x >= x).y - 4, s });
    }
  }
  b.line(2400, HILL.slope); // more hill past the last copy (you never get this far)
  const T = b.build({ spawn: { x: 110, y: -700 }, theme: THEMES.hill, name: 'Hill Bomb' });
  const [a, c] = [starts[1], starts[2]];
  T.loop = {
    from: starts[HILL.wrapAt].x, dx: c.x - a.x, dy: c.y - a.y,
    segs: c.pts - a.pts, rails: c.rails - a.rails,
    ds: T.segs[c.pts - 1].s0 - T.segs[a.pts - 1].s0,
    x0: a.x, y0: a.y, shift: 0, // shift: how far you've really come, for the scenery far away
  };
  return T;
}

// Street Spot: a different street spot every hour, the same one for everyone. The hour picks the
// name, the look and a run of street stuff (stairs, handrails, ledges, a parked car, banks, a gap,
// a manual pad, a kicker...), each its own size, with room to roll between them.
const SPOT_PLACES = ['Library', 'Bank', 'Courthouse', 'Mall', 'Museum', 'Post Office', 'City Hall', 'Parking Lot', 'Train Station',
  'Office Park', 'Hospital', 'Harbor', 'Market', 'Stadium', 'High School', 'Hotel', 'Diner', 'Fire Station', 'Gas Station', 'Art School'];
const SPOT_THINGS = ['Ledges', 'Stairs', 'Rails', 'Plaza', 'Banks', 'Gap', 'Spot', 'Drop', 'Curbs', 'Blocks', 'Steps', 'Lot'];
const SPOT_HOUR = 3.6e6;
const spotHour = (at = Date.now()) => Math.floor(at / SPOT_HOUR);
// a run of random numbers that's the same every time for the same hour
function spotRand(hour) {
  let a = (Math.imul(hour, 2654435761) ^ 0x5bd1e995) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function spotName(hour = spotHour()) {
  const r = spotRand(hour);
  return `${SPOT_PLACES[Math.floor(r() * SPOT_PLACES.length)]} ${SPOT_THINGS[Math.floor(r() * SPOT_THINGS.length)]}`;
}

function buildSpot(hour = spotHour()) {
  const r = spotRand(hour);
  r(); r(); // (those two were the name)
  const between = (a, b) => a + r() * (b - a), pick = list => list[Math.floor(r() * list.length)];
  const walled = r() < 0.5;
  const b = walled ? MapBuilder.wallStart(0, 0, 520) : MapBuilder.qpStart(0, 0, Math.round(between(170, 220)), 10);
  if (walled) b.front.push({ type: 'facade', x0: -160, x1: 0, top: -520, bottom: 0, style: pick(['shop', 'school']) });
  const spawnX = b.cur.x + 140;
  b.flat(860); // a long flat run-up first (room to warm up, and for the CPU to set tricks in S.K.A.T.E.)
  const flat = () => b.flat(Math.round(between(170, 320)));
  const onFlat = (kind, len, h, dx = 40) => { b.prop(kind, dx, len, h); b.flat(dx + len + 90); };
  const lamps = [];
  const FEATURES = {
    rail: () => onFlat('rail', Math.round(between(200, 380)), Math.round(between(28, 36))),
    ledge: () => onFlat('ledge', Math.round(between(220, 380)), Math.round(between(24, 32))),
    bench: () => onFlat('bench', Math.round(between(130, 180)), Math.round(between(20, 28))),
    planter: () => onFlat('planter', Math.round(between(180, 240)), Math.round(between(26, 32))),
    curb: () => onFlat('curb', Math.round(between(150, 260)), 11, 0),
    table: () => onFlat('table', 160, 42),
    // stairs down (and somewhere to land), only while there's still room to go down
    stairs: () => {
      if (b.cur.y > 160) return FEATURES.bank();
      const n = Math.round(between(3, 8)), top = b.cur.x;
      b.stairs(n, { rail: r() < 0.75 });
      b.gap(`${['', '', '', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'][n]} Stair`, 50 * n + 50, [top - 160, top + 4], [b.cur.x + 4, b.cur.x + 300], 30);
      b.flat(Math.round(between(280, 380)));
    },
    car: () => {
      b.flat(60);
      const at = b.cur.x;
      b.car(pick(['#3f7fd6', '#d64545', '#3fae4a', '#f4c542', '#26262b', '#e8e4da'])).flat(220);
      b.gap('Car Hop', 400, [at - 260, at - 2], [at + 254, at + 470]);
    },
    // a bank back up to the next level
    bank: () => {
      if (b.cur.y < -60) return FEATURES.ledge();
      const H = Math.round(between(50, 90));
      b.bend(150, -0.42).line((H - 150 * (1 - Math.cos(0.42))) / Math.sin(0.42), -0.42);
      b.flat(200);
    },
    // off a drop to the street below
    drop: () => {
      if (b.cur.y > 200) return FEATURES.bank();
      b.flat(20);
      const at = b.cur.x;
      b.to(0, Math.round(between(28, 60)));
      b.flat(320);
      b.gap('Drop In', 150, [at - 150, at - 1], [at + 120, at + 320]);
    },
    // a ditch to ollie over, landing a bit lower than you took off
    gap: () => {
      if (b.cur.y > 180) return FEATURES.rail();
      const deep = Math.round(between(100, 120)), up = Math.round(between(44, 54)), at = b.cur.x;
      b.to(0, deep).flat(Math.round(between(120, 160))).to(35, -up);
      b.gap('Ditch Gap', 400, [at - 220, at], [b.cur.x + 4, b.cur.x + 320]);
      b.flat(320);
    },
    manualPad: () => {
      const at = { ...b.cur }, len = Math.round(between(200, 300));
      b.to(16, -16).flat(len).to(16, 16);
      b.decor.push([{ x: at.x + 16, y: at.y - 16 }, { x: at.x + 16, y: at.y }], [{ x: at.x + 16 + len, y: at.y - 16 }, { x: at.x + 16 + len, y: at.y }]);
      b.flat(160);
    },
    kicker: () => {
      const base = b.cur.y, lip = between(0.32, 0.42);
      b.bend(120, -lip).line(Math.round(between(30, 46)), -lip).to(0, base - b.cur.y);
      b.flat(340);
    },
  };
  const kinds = Object.keys(FEATURES);
  let last = null;
  for (let n = Math.round(between(6, 8)), i = 0; i < n; i++) {
    let kind = pick(kinds);
    if (kind === last) kind = pick(kinds); // (not the same thing twice in a row, mostly)
    last = kind;
    FEATURES[kind]();
    if (r() < 0.5) lamps.push(b.cur.x - 60);
    flat();
  }
  b.qpEnd(Math.round(between(190, 230)), 10);

  // the buildings behind (standing on the lowest ground under them, so there's never a gap)
  const lowest = (x0, x1) => Math.max(...b.pts.filter(p => p.x >= x0 - 20 && p.x <= x1 + 20).map(p => p.y), 0);
  const colors = ['#cfc4b0', '#c9b8a8', '#bfc6c9', '#d1c2b4', '#c4c8c0', '#cdbfae', '#c2c6cc', '#d6c9b8', '#bfb8c4'];
  for (let x = 60; x < b.cur.x - 100;) {
    const w = Math.round(between(200, 320));
    if (r() < 0.85) b.scenery({ type: 'building', x, w, h: Math.round(between(260, 470)), y: lowest(x, x + w), color: pick(colors) });
    x += w + Math.round(between(40, 120));
  }
  const groundAt = x => (b.pts.find(p => p.x >= x) || b.cur).y;
  for (const x of lamps) b.scenery({ type: 'lamp', x, y: groundAt(x) });
  for (let i = 0; i < 3; i++) { const x = between(400, b.cur.x - 400); b.scenery({ type: 'tree', x, y: groundAt(x) - 4, s: between(0.9, 1.3) }); }
  const signX = between(600, b.cur.x - 600);
  b.scenery({ type: 'sign', x: signX, y: groundAt(signX), text: pick(['STOP', 'SLOW', 'ONE WAY', 'NO SKATING']) });
  const theme = pick([THEMES.street, THEMES.school, THEMES.park]);
  const T = b.build({ spawn: { x: spawnX, y: 0 }, theme, name: spotName(hour) });
  T.spotHour = hour;
  return T;
}

// Found, not given: each of these turns up when you pull off something special on a main map.

function buildDrain() {
  const b = MapBuilder.qpStart(0, 0, 320, 10);       // the curved drain walls
  b.flat(300).prop('rail', 60, 360, 30).flat(500);   // a long drain pipe
  b.line(160, 0.4).bend(200, 0).flat(260).bend(200, -0.4).line(160, -0.4); // the spillway dip
  b.flat(200).prop('ledge', 40, 260, 26).flat(420);
  b.qpEnd(320, 10);
  for (const [x, c] of [[700, '#7fd36b'], [1700, '#e2553f'], [2500, '#2f80ed']]) b.scenery({ type: 'graffiti', x, y: -160, color: c });
  return b.build({ spawn: { x: 420, y: 0 }, theme: THEMES.drain, name: 'Storm Drain' });
}

const HIDDEN_SPOTS = [
  { id: 'drain', name: 'STORM DRAIN', title: 'Storm Drain', blurb: 'Deep, curved and secret', build: buildDrain },
];

const SECRET_MAPS = [
  { id: 'moon', name: 'MOON BASE', blurb: 'Low gravity. Very low.', build: buildMoon },
  { id: 'lava', name: 'LAVA PIPE', blurb: 'One giant halfpipe over the lava', build: buildLavaPipe },
  { id: 'hill', name: 'HILL BOMB', blurb: 'A fast way down that never ends', build: buildHillBomb },
];

const MAPS = [
  { id: 'park', name: 'SKATEPARK', blurb: 'Quarter pipes, funbox, rails and a manual pad', build: buildSkatepark },
  { id: 'street', name: 'STREET', blurb: 'Stairs, handrails, benches and a parked car', build: buildStreet },
  { id: 'school', name: 'SCHOOL YARD', blurb: 'The big eight-stair, a gap and the court', build: buildSchool },
  { id: 'mega', name: 'MEGA RAMP', blurb: 'Giant roll-in, huge gap, DIY spot under the bridge', build: buildMega },
  { id: 'boardwalk', name: 'BOARDWALK', blurb: 'Palm trees, the sea wall, and a jump over the water', build: buildBoardwalk },
  {
    id: 'spot', name: 'STREET SPOT', build: () => buildSpot(),
    // today's spot, and how long until the next one
    get blurb() { return `${spotName()} · new spot in ${Math.ceil((SPOT_HOUR - (Date.now() % SPOT_HOUR)) / 6e4)} min`; },
  },
];

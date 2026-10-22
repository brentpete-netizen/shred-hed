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

  build({ spawn, theme, name, gravity }) {
    return new Terrain({
      points: this.pts, spawn, ends: this.ends, rails: this.rails,
      decor: this.decor, back: this.back, front: this.front, theme, name, gravity,
    });
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
  roof:   { ground: '#9c958c', hatch: 'rgba(50, 46, 42, 0.28)', sky: 'downtown' },
  pool:   { ground: '#b7dbe7', hatch: 'rgba(40, 90, 120, 0.25)', sky: 'suburb' },
  drain:  { ground: '#aaa69c', hatch: 'rgba(60, 60, 56, 0.25)', sky: 'hills' },
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
  b.scenery({ type: 'fence', x0: -160, x1: b.cur.x + 160, y: 0, h: 70 });
  for (const x of [700, 1650, 2500, 3300]) b.scenery({ type: 'tree', x, y: -6, s: 1 });
  return b.build({ spawn: { x: 300, y: 0 }, theme: THEMES.park, name: 'Skatepark' });
}

function buildStreet() {
  const b = MapBuilder.wallStart(0, 0, 520);
  b.front.push({ type: 'facade', x0: -160, x1: 0, top: -520, bottom: 0, style: 'shop' });
  b.prop('bench', 200, 150, 28).flat(600);
  b.scenery({ type: 'lamp', x: 480, y: 0 });
  b.stairs(5);                         // down to the plaza
  b.flat(260).to(14, 12);              // curb cut down to the street
  b.flat(240).car('#3f7fd6').flat(200);
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
  b.stairs(8);                         // the big eight
  b.flat(520);
  // the gap: a ditch between the walkway and the court below
  b.to(0, 110).flat(150).to(35, -50);
  const court = { ...b.cur };
  b.prop('bench', 380, 140, 24).flat(700);
  b.front.push({ type: 'court', x0: court.x + 40, x1: court.x + 660, y: court.y });
  b.qpEnd(200, 10);
  b.scenery({ type: 'schoolBuilding', x: 60, w: 900, h: 300, y: 0 });
  b.scenery({ type: 'flag', x: 1320, y: 112 });
  b.scenery({ type: 'hoop', x: court.x + 560, y: court.y });
  for (const x of [1250, 1500, 2400]) b.scenery({ type: 'tree', x, y: b.pts.find(p => p.x >= x).y - 4, s: 1.2 });
  return b.build({ spawn: { x: 140, y: 0 }, theme: THEMES.school, name: 'School Yard' });
}

function buildMega() {
  const b = MapBuilder.wallStart(0, -560, 300);
  b.flat(260);
  // roll-in: rounded lip, a long steep drop, and a big transition to the runway
  b.bend(140, 0.9);
  const drop = (0 - 520 * (1 - Math.cos(0.9))) - b.cur.y;
  b.line(drop / Math.sin(0.9), 0.9).bend(520, 0);
  const runway = b.cur.x;
  b.flat(600);
  // the mega kicker, the pit, and a long landing ramp
  b.bend(320, -0.6);
  b.line((120 - 320 * (1 - Math.cos(0.6))) / Math.sin(0.6), -0.6);
  const lip = { ...b.cur };
  b.line(146, 0.96).flat(260).line(146, -0.96).flat(30);
  b.to(720, -b.cur.y);
  // the DIY spot under the bridge
  const diy = b.cur.x;
  b.flat(250).to(90, -32).flat(60).to(90, 32).flat(120);
  b.prop('ledge', 0, 240, 28).flat(300).prop('rail', 60, 200, 30).flat(340);
  b.qpEnd(280, 12);
  b.front.push({ type: 'scaffold', x0: -160, x1: runway, top: -560 });
  b.front.push({ type: 'paint', x: lip.x - 160, y: -40, text: 'SEND IT' });
  b.scenery({ type: 'bridge', x0: diy - 200, x1: b.cur.x - 120, y: -430 });
  for (const [x, c] of [[diy + 140, '#e2553f'], [diy + 820, '#6c4bd1']]) b.scenery({ type: 'graffiti', x, y: -120, color: c });
  return b.build({ spawn: { x: 120, y: -560 }, theme: THEMES.mega, name: 'Mega Ramp' });
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

function buildHillBomb() {
  const b = MapBuilder.wallStart(0, -700, 300);
  b.flat(220).bend(300, 0.13);
  const tan = Math.tan(0.13);
  for (let i = 0; i < 4; i++) {
    if (i % 2 === 0) {
      b.line(520, 0.13).bend(120, -0.3).line(30, -0.3).to(0, 40); // a kicker on the way down
    } else {
      const a = { ...b.cur };
      b.line(560, 0.13);
      const c = b.cur;
      b.rails.push({ kind: 'rail', pts: [{ x: a.x + 40, y: a.y + 40 * tan - 32 }, { x: c.x - 40, y: c.y - 40 * tan - 32 }] });
    }
  }
  b.line(400, 0.13).bend(300, 0).flat(400);
  b.qpEnd(300, 12);
  for (let x = 300; x < b.cur.x - 300; x += 650) b.scenery({ type: 'tree', x, y: b.pts.find(p => p.x >= x).y - 4, s: 1.1 });
  return b.build({ spawn: { x: 110, y: -700 }, theme: THEMES.hill, name: 'Hill Bomb' });
}

// Found, not given: each of these turns up when you pull off something special on a main map.

function buildRooftops() {
  const b = MapBuilder.wallStart(0, 0, 400);         // the stairwell door
  b.front.push({ type: 'facade', x0: -160, x1: 0, top: -400, bottom: 0, style: 'shop' });
  const alley = (drop, floor) => b.to(0, drop).flat(floor).line(drop / Math.sin(0.87), -0.87); // fall in, ride the ramp out
  b.flat(260).prop('rail', 40, 180, 30).flat(300);  // skylight rail
  alley(220, 120);
  b.flat(120).prop('ledge', 20, 200, 34).flat(380);  // AC unit
  const roof = b.cur.y;
  b.bend(90, -0.5).line(30, -0.5);                   // chimney kicker
  b.to(0, roof - b.cur.y);
  b.flat(160);
  alley(260, 100);
  b.flat(200).prop('rail', 30, 300, 32).flat(420);   // the long pipe
  b.qpEnd(220, 10);
  for (const [x, y] of [[300, 0], [1200, 0], [2300, 0]]) b.scenery({ type: 'lamp', x, y });
  b.front.push({ type: 'paint', x: 900, y: 120, text: 'NO SKATING' });
  return b.build({ spawn: { x: 120, y: 0 }, theme: THEMES.roof, name: 'Rooftops' });
}

function buildPool() {
  const b = MapBuilder.wallStart(0, 0, 260);         // the back fence
  b.flat(320).prop('bench', 80, 150, 26);
  // an empty pool: rounded coping, steep walls, a deep end
  const wall = depth => (depth - 30 * (1 - Math.cos(1.3)) - 220 * (1 - Math.cos(1.3))) / Math.sin(1.3);
  b.bend(30, 1.3).line(wall(250), 1.3).bend(220, 0).flat(260).bend(220, -1.3).line(wall(250), -1.3).bend(30, 0);
  b.flat(300).prop('planter', 60, 160, 28).flat(200);
  b.wallEnd(260);
  b.front.push({ type: 'facade', x0: b.cur.x, x1: b.cur.x + 160, top: -260, bottom: 0, style: 'school' });
  b.scenery({ type: 'building', x: 40, w: 420, h: 220, y: 0, color: '#e8d9c0' });
  for (const x of [520, 1500]) b.scenery({ type: 'tree', x, y: 0, s: 1.2 });
  return b.build({ spawn: { x: 120, y: 0 }, theme: THEMES.pool, name: 'Backyard Pool' });
}

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
  { id: 'rooftops', name: 'ROOFTOPS', title: 'Rooftops', blurb: 'You found the way up', build: buildRooftops },
  { id: 'pool', name: 'BACKYARD POOL', title: 'Backyard Pool', blurb: "Don't tell the neighbours", build: buildPool },
  { id: 'drain', name: 'STORM DRAIN', title: 'Storm Drain', blurb: 'Deep, curved and secret', build: buildDrain },
];

const SECRET_MAPS = [
  { id: 'moon', name: 'MOON BASE', blurb: 'Low gravity. Very low.', build: buildMoon },
  { id: 'lava', name: 'LAVA PIPE', blurb: 'One giant halfpipe over the lava', build: buildLavaPipe },
  { id: 'hill', name: 'HILL BOMB', blurb: 'A long, fast way down', build: buildHillBomb },
];

const MAPS = [
  { id: 'park', name: 'SKATEPARK', blurb: 'Quarter pipes, funbox, rails and a manual pad', build: buildSkatepark },
  { id: 'street', name: 'STREET', blurb: 'Stairs, handrails, benches and a parked car', build: buildStreet },
  { id: 'school', name: 'SCHOOL YARD', blurb: 'The big eight-stair, a gap and the court', build: buildSchool },
  { id: 'mega', name: 'MEGA RAMP', blurb: 'Giant roll-in, huge gap, DIY spot under the bridge', build: buildMega },
];

// Custom skateparks. A park is a row of grid slots, left to right. Each slot holds a ground
// piece (flat, kicker, funbox, stairs...), props like rails and ledges sit on top of flat
// slots, and each end is a quarter pipe or a wall. Because pieces always join end to end, a
// park can never have anything floating or disconnected.
// Parks are saved in the browser and show up in the map list for Free Skate and S.K.A.T.E.

const SLOT = 120;                 // world pixels per grid slot
const PARK_MIN_SLOTS = 12, PARK_MAX_SLOTS = 48, PARK_MAX_HEIGHT = 280, MAX_PARKS = 8;

// Ground pieces. drop: how much lower (+) or higher (-) the ground is after the piece.
const PIECES = {
  flat:     { name: 'Flat', span: 1, drop: 0 },
  kicker:   { name: 'Kicker', span: 1, drop: 0 },
  funbox:   { name: 'Funbox', span: 3, drop: 0 },
  pad:      { name: 'Manual Pad', span: 2, drop: 0 },
  stairs3:  { name: '3 Stairs', span: 1, drop: 42, steps: 3 },
  stairs5:  { name: '5 Stairs', span: 1, drop: 70, steps: 5 },
  stairs7:  { name: '7 Stairs', span: 2, drop: 98, steps: 7 },
  bankUp:   { name: 'Bank Up', span: 2, drop: -70 },
  bankDown: { name: 'Bank Down', span: 2, drop: 70 },
  gap:      { name: 'Gap', span: 2, drop: 0 },
  dropoff:  { name: 'Drop-off', span: 1, drop: 40 },
  // unlockable
  halfpipe:   { name: 'Halfpipe', span: 4, drop: 0 },
  bankLedge:  { name: 'Bank to Ledge', span: 2, drop: 0 },
  diyQuarter: { name: 'DIY Quarter', span: 2, drop: 0 },
};

// Props on top. A handrail goes on a set of stairs instead of flat ground.
const PROPS = {
  rail:     { name: 'Flat Rail', span: 1, h: 32, kind: 'rail' },
  longRail: { name: 'Long Rail', span: 2, h: 32, kind: 'rail' },
  handrail: { name: 'Handrail', span: 0, kind: 'handrail' },
  ledge:    { name: 'Ledge', span: 2, h: 26, kind: 'ledge' },
  bench:    { name: 'Bench', span: 1, h: 28, kind: 'bench' },
  planter:  { name: 'Planter', span: 2, h: 30, kind: 'planter' },
  curb:     { name: 'Curb', span: 2, h: 11, kind: 'curb' },
  kinkRail: { name: 'Kink Rail', span: 3, h: 24, kind: 'rail', kink: 36 }, // unlockable: humps up in the middle
};

const PARK_THEMES = ['park', 'street', 'school', 'mega'];

// Lays one ground piece into a MapBuilder, ending exactly span slots later.
function emitPiece(b, type, opts = {}) {
  const def = PIECES[type], x0 = b.cur.x, end = x0 + def.span * SLOT;
  const pad = () => b.flat(end - b.cur.x);
  switch (type) {
    case 'kicker':
      b.flat(15).bend(90, -0.45);
      b.line((30 - 90 * (1 - Math.cos(0.45))) / Math.sin(0.45), -0.45).to(0, 30);
      break;
    case 'funbox': {
      b.flat(25);
      const lip = { ...b.to(110, -45).cur };
      const deckEnd = { ...b.flat(90).cur };
      b.to(110, 45);
      b.decor.push([lip, { x: lip.x, y: lip.y + 45 }], [deckEnd, { x: deckEnd.x, y: deckEnd.y + 45 }]);
      break;
    }
    case 'pad': {
      const y = b.cur.y;
      b.flat(30).to(14, -16).flat(152).to(14, 16);
      b.decor.push([{ x: x0 + 44, y: y - 16 }, { x: x0 + 44, y }], [{ x: x0 + 196, y: y - 16 }, { x: x0 + 196, y }]);
      break;
    }
    case 'stairs3': case 'stairs5': case 'stairs7':
      b.flat((def.span * SLOT - (def.steps - 1) * 28) / 2);
      b.stairs(def.steps, { rail: !!opts.handrail });
      break;
    case 'bankUp':
      b.flat(20).bend(120, -0.5).line((70 - 120 * (1 - Math.cos(0.5))) / Math.sin(0.5), -0.5);
      break;
    case 'bankDown':
      b.flat(20).line((70 - 120 * (1 - Math.cos(0.5))) / Math.sin(0.5), 0.5).bend(120, 0);
      break;
    case 'gap':
      b.flat(30).line(73, 0.96).flat(96).line(73, -0.96);
      break;
    case 'dropoff':
      b.flat(60).to(0, 40);
      break;
    case 'halfpipe': {
      // sunk into the ground: rounded lips, steep walls, a flat bottom, and back up
      const wall = (110 - 30 * (1 - Math.cos(1)) - 130 * (1 - Math.cos(1))) / Math.sin(1);
      b.flat(30).bend(30, 1).line(wall, 1).bend(130, 0).flat(104).bend(130, -1).line(wall, -1).bend(30, 0);
      break;
    }
    case 'bankLedge': {
      // a bank up onto a ledge, then a drop off the end
      const y = b.cur.y;
      b.flat(30).to(110, -50).flat(60).to(0, 50);
      b.decor.push([{ x: x0 + 140, y: y - 50 }, { x: x0 + 140, y }]);
      break;
    }
    case 'diyQuarter': {
      // a steep crusty quarter: launches you nearly straight up, with a little deck and a drop behind
      const y = b.cur.y;
      b.flat(20).bend(100, -1.2).line(30, -1.2);
      const lip = { ...b.cur };
      b.flat(40).to(0, y - b.cur.y);
      b.decor.push([lip, { x: lip.x, y }]);
      break;
    }
  }
  pad();
}

// Which ground piece covers each slot (null = flat), and the ground height at each slot.
function parkLayout(park) {
  const cover = new Array(park.slots).fill(null);
  for (const p of park.pieces) for (let i = 0; i < PIECES[p.type].span; i++) if (p.at + i < park.slots) cover[p.at + i] = p;
  const levels = [];
  let y = 0;
  for (let i = 0; i < park.slots; i++) {
    levels.push(y);
    const p = cover[i];
    if (p && p.at === i) y += PIECES[p.type].drop;
  }
  levels.push(y);
  return { cover, levels };
}

// Is this park buildable? Returns { ok, msg }.
function validatePark(park) {
  const taken = new Array(park.slots).fill(false);
  for (const p of park.pieces) {
    const span = PIECES[p.type].span;
    if (p.at < 0 || p.at + span > park.slots) return { ok: false, msg: "doesn't fit there" };
    for (let i = p.at; i < p.at + span; i++) {
      if (taken[i]) return { ok: false, msg: 'something is already there' };
      taken[i] = true;
    }
  }
  const { cover, levels } = parkLayout(park);
  if (levels.some(y => Math.abs(y) > PARK_MAX_HEIGHT)) return { ok: false, msg: 'that would go too high or too low' };
  const propTaken = new Array(park.slots).fill(false);
  for (const pr of park.props) {
    const def = PROPS[pr.type];
    if (def.kind === 'handrail') {
      const stairs = cover[pr.at];
      if (!stairs || !PIECES[stairs.type].steps || stairs.at !== pr.at) return { ok: false, msg: 'handrails go on stairs' };
      continue;
    }
    if (pr.at < 0 || pr.at + def.span > park.slots) return { ok: false, msg: "doesn't fit there" };
    for (let i = pr.at; i < pr.at + def.span; i++) {
      if (cover[i]) return { ok: false, msg: 'props need flat ground' };
      if (propTaken[i]) return { ok: false, msg: 'something is already there' };
      propTaken[i] = true;
    }
  }
  return { ok: true };
}

// Turns a saved park into a ridable map.
function buildPark(park) {
  const theme = THEMES[park.theme] || THEMES.park;
  let b, spawn;
  if (park.ends.left === 'rollin') {
    // a roll-in tower: start up top and drop in
    b = MapBuilder.wallStart(0, -420, 260).flat(170).bend(120, 0.9);
    const drop = (0 - 380 * (1 - Math.cos(0.9))) - b.cur.y;
    b.line(drop / Math.sin(0.9), 0.9).bend(380, 0);
    b.front.push({ type: 'scaffold', x0: -160, x1: b.cur.x, top: -420 });
    spawn = { x: 90, y: -420 };
  } else {
    b = park.ends.left === 'wall' ? MapBuilder.wallStart(0, 0, 480) : MapBuilder.qpStart(0, 0, 180, 10);
    if (park.ends.left === 'wall') b.front.push({ type: 'facade', x0: -160, x1: 0, top: -480, bottom: 0, style: park.theme === 'school' ? 'school' : 'shop' });
  }
  b.cur.y = 0; // a roll-in's transition can land a hair off level
  const startX = b.cur.x;
  spawn = spawn || { x: startX + 60, y: 0 };
  const { cover, levels } = parkLayout(park);
  const handrails = new Set(park.props.filter(p => p.type === 'handrail').map(p => p.at));
  for (let i = 0; i < park.slots; i++) {
    const p = cover[i];
    if (!p) b.flat(SLOT);
    else if (p.at === i) emitPiece(b, p.type, { handrail: handrails.has(i) });
  }
  for (const pr of park.props) {
    const def = PROPS[pr.type];
    if (def.kind === 'handrail') continue;
    const x = startX + pr.at * SLOT + 12, y = levels[pr.at], len = def.span * SLOT - 24;
    const pts = def.kink
      ? [{ x, y: y - def.h }, { x: x + 80, y: y - def.h - def.kink }, { x: x + len - 80, y: y - def.h - def.kink }, { x: x + len, y: y - def.h }]
      : [{ x, y: y - def.h }, { x: x + len, y: y - def.h }];
    b.rails.push({ kind: def.kind, pts });
  }
  const endY = levels[park.slots];
  if (park.ends.right === 'wall') {
    b.wallEnd(480);
    b.front.push({ type: 'facade', x0: b.cur.x, x1: b.cur.x + 160, top: endY - 480, bottom: endY, style: park.theme === 'school' ? 'school' : 'shop' });
  } else b.qpEnd(180, 10);

  // a little scenery so it doesn't look empty
  if (park.theme === 'park') b.scenery({ type: 'fence', x0: -160, x1: b.cur.x + 160, y: 0, h: 70 });
  for (let i = 3; i < park.slots; i += 7) {
    const x = startX + i * SLOT + 60, y = levels[i];
    if (park.theme === 'street') b.scenery({ type: 'lamp', x, y });
    else b.scenery({ type: 'tree', x, y: y - 4, s: 1 });
  }
  const T = b.build({ spawn, theme, name: park.name });
  T.slotStart = startX; // where slot 0 begins, for the builder's grid
  return T;
}

// ---------------------------------------------------------------- saving

const Parks = (() => {
  const KEY = 'shredHed.parks';
  let parks = [];
  try { parks = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { /* none saved */ }
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify(parks)); } catch (e) { /* storage blocked */ } };

  return {
    list() { return parks; },
    get(id) { return parks.find(p => p.id === id); },
    full() { return parks.length >= MAX_PARKS; },
    create() {
      let n = parks.length + 1;
      while (parks.some(p => p.name === `My Park ${n}`)) n++;
      const park = {
        id: Date.now().toString(36), name: `My Park ${n}`, theme: 'park', slots: 24,
        ends: { left: 'qp', right: 'qp' },
        pieces: [{ type: 'kicker', at: 6 }, { type: 'funbox', at: 11 }],
        props: [{ type: 'rail', at: 3 }],
      };
      parks.push(park);
      store();
      return park;
    },
    save(park) {
      const i = parks.findIndex(p => p.id === park.id);
      if (i >= 0) parks[i] = JSON.parse(JSON.stringify(park));
      store();
    },
    remove(id) {
      parks = parks.filter(p => p.id !== id);
      store();
    },
  };
})();

// Every map you can pick: the built-in ones, then your parks.
function allMaps() {
  const hidden = typeof Progress !== 'undefined' && Progress.everything ? SECRET_MAPS : [];
  return [...MAPS, ...hidden, ...Parks.list().map(p => ({
    id: 'park:' + p.id, name: p.name.toUpperCase(), blurb: 'Your park', custom: true,
    build: () => buildPark(Parks.get(p.id)),
  }))];
}

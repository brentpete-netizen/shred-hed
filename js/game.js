// Main loop: fixed-step physics, camera, and drawing everything each frame.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let cw = 0, ch = 0, dpr = 1;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cw = window.innerWidth;
  ch = window.innerHeight;
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  canvas.style.width = cw + 'px';
  canvas.style.height = ch + 'px';
}
addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- background art

const PAPER = '#f3eee1';

function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) >>> 0;
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const paperPattern = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const r = seededRandom(3);
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = `rgba(110, 96, 70, ${0.03 + r() * 0.06})`;
    g.fillRect(r() * 256, r() * 256, 1 + r() * 1.5, 1 + r() * 1.5);
  }
  return ctx.createPattern(c, 'repeat');
})();

// The faint pencil-drawn distance behind each map, drawn once and scrolled slowly (parallax):
// a city, a taller downtown, suburbs with houses and trees, or rolling hills.
const PARALLAX = 0.4, SKY_RES = 2, SKY_X0 = -900, SKY_H = 520;
function makeSkyline(kind, worldWidth) {
  const width = worldWidth * PARALLAX + 2400;
  const c = document.createElement('canvas');
  c.width = width * SKY_RES;
  c.height = SKY_H * SKY_RES;
  const g = c.getContext('2d');
  g.scale(SKY_RES, SKY_RES);
  g.translate(0, SKY_H - 20);
  const r = seededRandom(11);
  Sketch.setBoil(0);
  Sketch.seedFor(500);
  const pencil = { color: 'rgba(80, 74, 66, 0.42)', width: 1.6, amp: 1.2, maxLen: 25 };
  const wash = 'rgba(200, 192, 176, 0.35)';
  // (the sun and moon go across the sky by the time of day: see daylight.js)
  const windows = []; // the ones that light up at night

  const towers = (minH, maxH, density) => {
    for (let x = 0; x < width;) {
      const bw = 60 + r() * 120, bh = minH + r() * (maxH - minH);
      const box = [{ x, y: 0 }, { x, y: -bh }, { x: x + bw, y: -bh }, { x: x + bw, y: 0 }];
      Sketch.fill(g, box, wash, 2);
      Sketch.stroke(g, box, pencil);
      for (let wy = -bh + 16; wy < -20; wy += 22) {
        for (let wx = x + 12; wx < x + bw - 16; wx += 20) {
          if (r() < density) {
            Sketch.stroke(g, [{ x: wx, y: wy }, { x: wx + 8, y: wy }, { x: wx + 8, y: wy + 10 }, { x: wx, y: wy + 10 }],
              { ...pencil, width: 1, closed: true, passes: 1 });
            if (Daylight.lit(wx * 0.37 + wy)) windows.push({ x: wx + 1, y: wy + 1, w: 6, h: 8 });
          }
        }
      }
      if (r() < 0.3) Sketch.stroke(g, [{ x: x + bw * 0.6, y: -bh }, { x: x + bw * 0.6, y: -bh - 30 - r() * 30 }], pencil);
      x += bw + (r() < 0.3 ? 20 + r() * 60 : 0);
    }
  };
  const tree = (x, s) => {
    Sketch.stroke(g, [{ x, y: 0 }, { x, y: -30 * s }], pencil);
    Sketch.circle(g, x, -46 * s, 20 * s, wash, { color: pencil.color, width: 1.4, amp: 1 });
  };

  if (kind === 'space') {
    for (let i = 0; i < 260; i++) {
      const x = r() * width, y = -40 - r() * 460, s = 1 + r() * 2;
      g.fillStyle = `rgba(70, 66, 90, ${0.25 + r() * 0.4})`;
      g.fillRect(x, y, s, s);
    }
    Sketch.circle(g, width * 0.55, -330, 70, 'rgba(90, 150, 220, 0.35)', { color: 'rgba(70,66,90,0.5)', width: 2 });
    Sketch.circle(g, width * 0.55 - 20, -345, 26, 'rgba(110, 170, 90, 0.35)', { color: 'rgba(70,66,90,0.3)', width: 1.2 });
    const ridge = [{ x: 0, y: 0 }];
    for (let x = 0; x <= width; x += 50) ridge.push({ x, y: -60 - Math.abs(Math.sin(x / 180)) * 50 });
    ridge.push({ x: width, y: 0 });
    Sketch.fill(g, ridge, 'rgba(150, 146, 170, 0.3)', 2);
    Sketch.stroke(g, ridge.slice(1, -1), pencil);
  } else if (kind === 'volcano') {
    for (let x = 100; x < width; x += 700 + r() * 300) {
      const vh = 220 + r() * 120, vw = 360;
      const cone = [{ x: x - vw / 2, y: 0 }, { x: x - 40, y: -vh }, { x: x + 40, y: -vh }, { x: x + vw / 2, y: 0 }];
      Sketch.fill(g, cone, 'rgba(150, 90, 70, 0.35)', 2);
      Sketch.stroke(g, cone, pencil);
      for (let k = 0; k < 4; k++) Sketch.circle(g, x + (r() - 0.5) * 60, -vh - 30 - k * 40, 22 + k * 8, 'rgba(120, 110, 100, 0.18)', { color: 'rgba(80,74,66,0.25)', width: 1.2 });
      Sketch.stroke(g, [{ x: x - 30, y: -vh + 4 }, { x: x - 10, y: -vh + 60 }, { x: x + 6, y: -vh + 110 }], { ...pencil, color: 'rgba(226, 85, 63, 0.6)', width: 4 });
    }
  } else if (kind === 'beach') {
    // the sea out to the horizon, sailboats, a lighthouse and a few gulls
    const sea = [{ x: 0, y: 0 }, { x: 0, y: -90 }, { x: width, y: -90 }, { x: width, y: 0 }];
    Sketch.fill(g, sea, 'rgba(110, 175, 215, 0.35)', 2);
    Sketch.stroke(g, [{ x: 0, y: -90 }, { x: width, y: -90 }], pencil);
    for (let y = -70; y < 0; y += 18) for (let x = (y * 37) % 90; x < width; x += 90 + r() * 60) {
      Sketch.stroke(g, [{ x, y }, { x: x + 14, y: y - 3 }, { x: x + 28, y }], { ...pencil, width: 1, passes: 1 });
    }
    for (let x = 300; x < width; x += 900 + r() * 500) {
      Sketch.shape(g, [{ x, y: -96 }, { x: x + 60, y: -96 }, { x: x + 50, y: -86 }, { x: x + 10, y: -86 }], wash, { ...pencil, width: 1.2 });
      Sketch.shape(g, [{ x: x + 30, y: -98 }, { x: x + 30, y: -160 }, { x: x + 58, y: -102 }], 'rgba(244, 241, 234, 0.7)', { ...pencil, width: 1.2 });
    }
    for (let x = 1500; x < width; x += 3200) {
      Sketch.shape(g, [{ x: x - 16, y: -90 }, { x: x - 10, y: -230 }, { x: x + 10, y: -230 }, { x: x + 16, y: -90 }], 'rgba(244, 241, 234, 0.6)', pencil);
      for (const yy of [-120, -170, -215]) Sketch.stroke(g, [{ x: x - 14, y: yy }, { x: x + 14, y: yy }], { ...pencil, color: 'rgba(226, 85, 63, 0.6)', width: 6 });
      Sketch.circle(g, x, -244, 12, 'rgba(244, 197, 66, 0.4)', { color: pencil.color, width: 1.4 });
    }
    for (let i = 0; i < 26; i++) {
      const x = r() * width, y = -200 - r() * 240, s = 6 + r() * 6;
      Sketch.stroke(g, [{ x: x - s, y: y - s * 0.4 }, { x, y }, { x: x + s, y: y - s * 0.4 }], { ...pencil, width: 1.4, passes: 1 });
    }
  } else if (kind === 'downtown') towers(160, 440, 0.7);
  else if (kind === 'suburb') {
    for (let x = 0; x < width; x += 150 + r() * 80) {
      const w = 90 + r() * 40, h = 60 + r() * 30;
      const house = [{ x, y: 0 }, { x, y: -h }, { x: x + w / 2, y: -h - 40 }, { x: x + w, y: -h }, { x: x + w, y: 0 }];
      Sketch.fill(g, house, wash, 2);
      Sketch.stroke(g, house, pencil);
      Sketch.stroke(g, [{ x: x + 20, y: -h + 20 }, { x: x + 40, y: -h + 20 }, { x: x + 40, y: -h + 40 }, { x: x + 20, y: -h + 40 }], { ...pencil, width: 1, closed: true, passes: 1 });
      if (Daylight.lit(x * 0.37)) windows.push({ x: x + 21, y: -h + 21, w: 18, h: 18 });
      tree(x + w + 30, 0.9 + r() * 0.6);
    }
  } else if (kind === 'hills') {
    // wave lengths that fit the width exactly, so the hills join up when the sky repeats
    const wave = len => TAU * Math.max(1, Math.round(width / (TAU * len))) / width;
    const k1 = wave(260), k2 = wave(97);
    const hill = [{ x: 0, y: 0 }];
    for (let x = 0; x <= width; x += 40) hill.push({ x, y: -120 - Math.sin(x * k1) * 60 - Math.sin(x * k2) * 18 });
    hill.push({ x: width, y: 0 });
    Sketch.fill(g, hill, 'rgba(160, 180, 140, 0.3)', 2);
    Sketch.stroke(g, hill.slice(1, -1), pencil);
    for (let x = 80; x < width; x += 340) {
      Sketch.stroke(g, [{ x, y: 0 }, { x, y: -220 }], pencil);
      Sketch.stroke(g, [{ x: x - 20, y: -205 }, { x: x + 20, y: -205 }], pencil);
      Sketch.stroke(g, [{ x, y: -205 }, { x: x + 170, y: -190 }, { x: x + 340, y: -205 }], { ...pencil, width: 1 });
    }
    for (let x = 30; x < width; x += 120 + r() * 160) tree(x, 0.7 + r() * 0.5);
  } else towers(70, 300, 0.55);
  // how high the tallest thing in it goes (the stars come out above that)
  const tallest = { space: 410, volcano: 400, beach: 260, downtown: 500, suburb: 160, hills: 250 }[kind] ?? 360;
  return { canvas: c, width, windows, tallest };
}

// ---------------------------------------------------------------- game state

// Everything you unlock, buy and wear is saved in this browser as you go. Ask the browser to keep
// it even when it's tidying up space, so it's all still there next time.
try { navigator.storage?.persist?.().catch(() => {}); } catch (e) { /* not supported */ }
// load the hand-drawn fonts straight away, so the first frames aren't in a plain font
try { for (const f of ['Permanent Marker', 'Patrick Hand']) document.fonts.load(`24px "${f}"`).catch(() => {}); } catch (e) { /* old browser */ }

const MAP_KEY = 'shredHed.map';
let mapId = 'park';
try { mapId = localStorage.getItem(MAP_KEY) || 'park'; } catch (e) { /* storage blocked */ }
if (!allMaps().some(m => m.id === mapId)) mapId = 'park';

let terrain, skater, skyline;
const hud = new Hud();
const cam = { x: 0, y: -100 };
const STEP = 1 / 120;

function loadTerrain(t, id) {
  mapId = id;
  terrain = t;
  skater = new Skater(terrain);
  skyline = makeSkyline(terrain.theme.sky, terrain.maxX - terrain.minX);
  cam.x = skater.pos.x;
  cam.y = skater.pos.y - 110;
  hud.clear();
  hud.mapId = id;
  hud.mapName = terrain.name;
  Bonus.load(id, terrain);
  Gaps.load(id, terrain);
  Hype.load(terrain);
  window.shredHed = { skater, terrain, cam, CONFIG }; // for tuning from the browser console
}

function loadMap(id) {
  const m = allMaps().find(m => m.id === id) || MAPS[0];
  try { localStorage.setItem(MAP_KEY, m.id); } catch (e) { /* storage blocked */ }
  loadTerrain(m.build(), m.id);
}
loadMap(mapId);

const menu = new Menu(new Skater(MAPS[0].build()), mapId);
const builder = new Builder();
let mode = 'menu', showHelp = !TouchPad.enabled, debug = false; // mode: 'menu', 'play' or 'build'
let skateGame = null; // a Game of S.K.A.T.E. in progress, or null for free skate
let testRide = false; // skating a park straight from the builder

// resume: coming back from a test ride, keeping the cursor and undo history
function openBuilder(parkId, resume = false) {
  if (!resume) builder.open(Parks.get(parkId));
  skyline = makeSkyline(builder.terrain.theme.sky, builder.terrain.maxX - builder.terrain.minX);
  mode = 'build';
  testRide = false;
  skateGame = null;
}

function startTestRide() {
  loadTerrain(buildPark(builder.park), 'park:' + builder.park.id);
  skateGame = null;
  testRide = true;
  mode = 'play';
}

// The 2-minute run: as many points as you can in two minutes, for a medal.
const RUN_TIME = 120, RUN_MEDALS = [20000, 60000, 150000], RUN_BUCKS = [0, 15, 30, 60];
let run = null; // { t: seconds left, over, wait, result }

function startRun(map) {
  loadMap(map);
  skateGame = null;
  run = { t: RUN_TIME, over: false, wait: 0, result: null, lastTick: 11 };
  showHelp = false;
}

// Time's up: once the combo you're in has landed (or a few seconds), add it up.
function finishRun() {
  const score = hud.score, medal = RUN_MEDALS.filter(m => score >= m).length;
  const best = Progress.runDone(mapId, score);
  if (RUN_BUCKS[medal]) Progress.earn(RUN_BUCKS[medal], `${['', 'bronze', 'silver', 'gold'][medal]} medal`);
  if (medal) Trophies.event('medal', medal);
  run.result = { score, medal, best, bucks: RUN_BUCKS[medal], t: 0 };
  Sound.play(medal ? 'trophy' : 'lost');
}

function updateRun(dt) {
  if (run.result) { run.result.t += dt; return; }
  if (!run.over) {
    run.t -= dt;
    // the last ten seconds tick down
    const s = Math.ceil(run.t);
    if (s < run.lastTick && s >= 1 && s <= 10) { run.lastTick = s; Sound.play('tick'); }
    if (run.t <= 0) { run.t = 0; run.over = true; Sound.play('horn'); }
    return;
  }
  // time's up: let the combo you're in land (or not), then add it all up
  run.wait += dt;
  if ((!skater.combo.active && skater.state !== 'air' && skater.state !== 'grind') || run.wait > 4) finishRun();
}

// The clock, and the medal when it's over.
function drawRun(ctx, w, h) {
  const size = Math.min(52, w / 12);
  if (!run.result) {
    const s = Math.ceil(run.t), text = run.over ? 'TIME!' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const hurry = run.t <= 10;
    markerText(ctx, text, w / 2, h * 0.07 + 8, size * (hurry ? 1.1 + Math.sin(time * 12) * 0.06 : 1), hurry ? '#ef5a4a' : '#ffffff', -0.03);
    const next = RUN_MEDALS.find(m => hud.score < m);
    ctx.font = `${Math.max(13, size * 0.3)}px ${HAND}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = INK;
    ctx.fillText(next ? `${fmtScore(next - hud.score)} to ${['bronze', 'silver', 'gold'][RUN_MEDALS.indexOf(next)]}` : 'GOLD!', w / 2, h * 0.07 + 8 + size * 0.6);
    return;
  }
  const R = run.result, k = Math.min(1, R.t / 0.3);
  ctx.fillStyle = `rgba(28, 28, 34, ${0.45 * k})`;
  ctx.fillRect(0, 0, w, h);
  const cw2 = Math.min(440, w - 32), chh = Math.min(380, h - 60), x = (w - cw2) / 2, y = (h - chh) / 2;
  drawCard(ctx, x, y, cw2, chh, 880);
  markerText(ctx, "TIME'S UP!", w / 2, y + 40, Math.min(44, cw2 / 7), '#f4c542', -0.04, 1 + 0.3 * Math.exp(-R.t * 8));
  // the medal
  const colors = [['#b9b4aa', '#8a857c'], ['#d98a4a', '#a8622e'], ['#d5dbe1', '#9aa3ab'], ['#f4c542', '#c8931c']][R.medal];
  const mx = w / 2, my = y + chh * 0.42, mr = Math.min(48, chh * 0.13) * (1 + 0.25 * Math.exp(-R.t * 6));
  Sketch.seedFor(881);
  ctx.save();
  ctx.translate(mx, my);
  Sketch.circle(ctx, 0, 0, mr, colors[0], { color: INK, width: 3, amp: 0.6 });
  Sketch.circle(ctx, 0, 0, mr * 0.72, colors[1], { color: INK, width: 1.6, amp: 0.4 });
  ctx.fillStyle = '#fff8dc';
  starPath(ctx, 0, 0, mr * 0.45, 0);
  ctx.fill();
  ctx.restore();
  markerText(ctx, ['NO MEDAL', 'BRONZE', 'SILVER', 'GOLD'][R.medal], w / 2, my + mr + 22, 26, colors[0], -0.03);
  markerText(ctx, fmtScore(R.score), w / 2, my + mr + 58, Math.min(40, cw2 / 8), '#ffffff', -0.02);
  ctx.font = `${Math.max(14, Math.min(18, w / 50))}px ${HAND}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  const lines = [R.best ? 'NEW BEST ON THIS MAP!' : `best here: ${fmtScore(Progress.runBest(mapId))}`, R.bucks ? `+${R.bucks} Shred Bucks` : `${fmtScore(RUN_MEDALS[0] - R.score)} more for bronze`];
  lines.forEach((l, i) => ctx.fillText(l, w / 2, my + mr + 88 + i * 22));
  ctx.fillText(TouchPad.enabled ? 'tap to go again' : 'Enter: go again  ·  Esc: menu', w / 2, y + chh - 22);
}

// choice: { map, game: 'free' | 'cpu' | '2p' | 'run' }
function startSkating({ map, game }) {
  run = null;
  if (game === 'run') startRun(map);
  else if (game === 'free') {
    // (Street Spot: a new hour is a new spot; and after the menu's show skater, a fresh start)
    if (map !== mapId || skater.state === 'bail' || skateGame || attract.used || (terrain.spotHour !== undefined && terrain.spotHour !== spotHour())) loadMap(map);
    skateGame = null;
  } else {
    loadMap(map);
    skateGame = new SkateGame(terrain, game === 'cpu');
    skateGame.onGameOver = winner => {
      if (game === 'cpu') { Stats.skateResult(!winner.cpu); Progress.skateResult(!winner.cpu); if (!winner.cpu) Trophies.event('skateWin', winner.letters); }
      else Progress.skateGame();
    };
    skater = skateGame.skater;
    showHelp = false;
  }
  menu.lastChoice = { map, game };
  testRide = false;
  mode = 'play';
  attract.used = false;
  hud.clear();
}

// On the main menu your skater shows off behind it: the CPU works out a trick and skates it, then
// another one (same physics, same planner as in S.K.A.T.E.). Nothing it does counts for anything.
const ATTRACT_TRICKS = ['Kickflip', 'Tre Flip', 'BS 360', 'Kickflip + 50-50', 'Indy', 'Heelflip', 'Varial Kickflip', 'FS 180 Heelflip',
  'Boardslide', 'Method', '360 Shove-it', 'Hardflip', 'Kickflip + Indy', 'Laser Flip', 'Christ Air', 'Tre Flip + 50-50'];
const attract = { driver: null, think: null, t: 0, used: false, name: null };

function attractOn() { return mode === 'menu' && menu.screen === 'main' && !online && !menu.inRoom && !skateGame && !testRide; }

function attractStep() {
  if (!attractOn()) {
    if (attract.driver || attract.think) { attract.driver = attract.think = null; skater.regular = false; }
    return;
  }
  if (!attract.driver && !attract.think) {
    attract.name = ATTRACT_TRICKS[Math.floor(Math.random() * ATTRACT_TRICKS.length)];
    attract.think = cpuThinkPlan(terrain, attract.name, 80);
  }
  if (attract.think) {
    const until = performance.now() + 4;
    let r;
    do r = attract.think.next(); while (!r.done && performance.now() < until);
    if (!r.done) return;
    attract.think = null;
    if (!r.value) return; // couldn't on this map: try another next time
    skater.respawn(terrain.spawnS);
    skater.facing = 1;
    skater.regular = true; // (plans are worked out regular)
    attract.driver = new CpuDriver(r.value);
    attract.t = 0;
    attract.used = true;
  }
}

function menuPicked(r) {
  if (r.resume) return backToRoom();
  if (r.leave) return leaveOnline();
  if (r.build) openBuilder(r.build);
  else startSkating(r);
}

// ---------------------------------------------------------------- online

let online = false; // skating in an online room right now

// The host said go (or you dropped into a Free Skate already going): everyone loads the same map.
function startOnline(msg) {
  const def = msg.park ? { id: 'park:' + msg.park.id, build: () => buildPark(msg.park) }
    : msg.map === 'spot' && Number.isFinite(msg.spot) ? { id: 'spot', build: () => buildSpot(msg.spot) } // the host's hour, for everyone
    : findAnyMap(msg.map);
  loadTerrain(def.build(), def.id);
  Online.syncRoster();
  if (msg.mode === 'skate') {
    skateGame = new SkateGame(terrain, false, { players: Net.players, me: Net.me });
    skateGame.onGameOver = () => Progress.skateGame();
    skater = skateGame.skater;
    showHelp = false;
  } else skateGame = null;
  menu.inRoom = false;
  online = true;
  testRide = false;
  mode = 'play';
  hud.clear();
}

// out of the menu and skating in the room again (in whatever you put on in the closet)
function backToRoom() {
  menu.inRoom = false;
  if (!online) { mode = 'menu'; menu.open('online'); return; }
  mode = 'play';
  Net.updateOutfit();
  hud.clear();
}

function leaveOnline(why) {
  menu.inRoom = false;
  menu.sel = 0;
  online = false;
  skateGame = null;
  Online.clear();
  Chat.clear();
  Net.leave();
  loadMap(mapId.startsWith('park:') ? 'park' : mapId);
  mode = 'menu';
  menu.open('online');
  if (why) menu.flash(why);
}

Net.on('start', msg => startOnline(msg));
Net.on('roster', () => Online.syncRoster());
Net.on('closed', (why, wasPublic) => {
  if (!online) return;
  leaveOnline(why);
  // a public park closed (its host left): off to find another one, or open one
  if (wasPublic) { menu.open('lobby'); menu.note('PARK CLOSED · FINDING ANOTHER'); Net.joinPublic(); }
});
Net.on('left', id => skateGame?.online && skateGame.playerLeft(id));
Net.on('result', msg => skateGame?.online && skateGame.onNetResult(msg));
// the other skater's tricks pop up for you while you watch their S.K.A.T.E. attempt
Net.on('say', msg => {
  if (!skateGame?.watching || msg.from !== skateGame.current.id) return;
  hud.handle(msg.m);
  Sound.onMessage(msg.m);
});
const SAY_TYPES = new Set(['trick', 'combo', 'comboLost', 'bail', 'land', 'pop', 'flick', 'grindStart', 'cancel']);

// The endless Hill Bomb: once you're down into the third copy of the hill, you, the camera and
// your trails all step back one copy. The ground there is exactly the same, so you can't tell.
// (Not mid-grind or mid-slam, which hang on to bits of the ground; it waits a moment for those.)
function wrapWorld() {
  const L = terrain.loop;
  if (!L || skateGame || skater.pos.x < L.from || skater.vert) return;
  if (skater.state !== 'ground' && skater.state !== 'air') return;
  const dx = -L.dx, dy = -L.dy;
  skater.pos = { x: skater.pos.x + dx, y: skater.pos.y + dy };
  if (skater.state === 'ground') { skater.seg -= L.segs; skater.s -= L.ds; }
  if (skater.slippedOff) skater.slippedOff = terrain.rails[terrain.rails.indexOf(skater.slippedOff) - L.rails] || null;
  for (const f of skater.fx) { f.x += dx; f.y += dy; }
  cam.x += dx;
  cam.y += dy;
  L.shift += L.dx;
  ComboTrail.shift(dx, dy);
  Bonus.shift(dx, dy);
}

// Where the camera follows: you, or the other skater while you watch their attempt.
function cameraTarget() {
  const watched = skateGame?.watching && Online.focus(skateGame.current.id);
  if (watched) return { ...watched, air: watched.air };
  const bail = skater.state === 'bail' ? skater.bail.body : null;
  const p = bail || skater.pos;
  return { x: p.x, y: p.y, vx: bail ? bail.vx : skater.vel.x, air: skater.state === 'air' };
}

// The builder zooms out further so you can see more of your park.
const BUILD_VIEW = 900;
const builderToWorld = (x, y) => {
  const s = viewScale(BUILD_VIEW);
  return { x: builder.cam.x + (x - cw / 2) / s, y: builder.cam.y + (y - ch / 2) / s };
};

canvas.addEventListener('pointerdown', e => {
  // (taps on the chat, the help card and the end-of-game cards first; any other touch is a swipe)
  if ((mode === 'play' || menu.screen === 'lobby') && Chat.click(e.clientX, e.clientY)) return;
  if (mode === 'play' && showHelp && e.pointerType === 'touch') { showHelp = false; return; } // tap the help away
  if (mode === 'play' && skateGame?.state === 'over') { carry.push('start'); return; }     // tap for a rematch
  if (mode === 'play' && run?.result) { carry.push('start'); return; }                    // tap to run it again
  if (mode === 'play' && TouchPad.down(e)) return;
  if (mode === 'menu') {
    const r = menu.click(e.clientX, e.clientY);
    if (r) menuPicked(r);
  } else if (mode === 'build') builder.pointerDown(e.clientX, e.clientY, e.button, builderToWorld);
});
canvas.addEventListener('pointercancel', e => TouchPad.up(e));
canvas.addEventListener('pointerup', e => {
  TouchPad.up(e);
  if (mode === 'build') builder.pointerUp(e.clientX, e.clientY, builderToWorld);
  else if (mode === 'menu') menu.pointerMove(e.clientX, e.clientY, false);
});
canvas.addEventListener('pointermove', e => {
  TouchPad.move(e);
  if (mode === 'menu') menu.pointerMove(e.clientX, e.clientY, (e.buttons & 1) === 1);
});
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => { if (mode === 'build') { e.preventDefault(); builder.wheel(e.deltaY || e.deltaX); } }, { passive: false });
let time = 0, fps = 60, acc = 0, last = performance.now(), carry = [];

// Game feel: the camera zooms out for big air, shakes on slams, and a huge landing freezes for a beat.
const feel = { zoom: 1, shake: 0, hitstop: 0, offset: { x: 0, y: 0 } };

function feelMessage(m) {
  if (m.type === 'bail') { feel.shake = Math.max(feel.shake, 12); feel.hitstop = 0.05; }
  else if (m.type === 'land' && m.impact > 0.55) feel.shake = Math.max(feel.shake, 7 * m.impact);
  else if (m.type === 'thud') feel.shake = Math.max(feel.shake, 6 * m.power);
  else if (m.type === 'combo' && m.score >= 2000) { feel.hitstop = 0.08; feel.shake = Math.max(feel.shake, 4); }
}

// Fit viewHeight world pixels top to bottom, but zoom out on narrow windows so you can see ahead.
// (an upright phone sees less width so the skater isn't tiny)
function viewScale(vh = CONFIG.viewHeight * feel.zoom) { return Math.min(ch / vh, cw / (vh * (ch > cw ? 0.85 : 1.4))); }

function updateCamera(dt) {
  const p = cameraTarget(), vx = p.vx;
  // zoom out the higher you are above the ground
  const height = p.air ? terrain.groundYAt(p.x, p.y) - p.y : 0;
  const zoomTarget = 1 + clamp((height - 100) / 800, 0, 0.45);
  feel.zoom += (zoomTarget - feel.zoom) * Math.min(1, dt * (zoomTarget > feel.zoom ? 2 : 1.2));
  feel.shake *= Math.pow(0.004, dt);
  feel.offset = { x: (Math.random() - 0.5) * feel.shake, y: (Math.random() - 0.5) * feel.shake };

  const scale = viewScale(), halfW = cw / 2 / scale;
  let tx = p.x + clamp(vx * CONFIG.lookAhead, -260, 260);
  const ty = Math.min(p.y - 110 * feel.zoom, terrain.lowest - 100);
  const minX = terrain.minX + halfW, maxX = terrain.maxX - halfW;
  tx = minX < maxX ? clamp(tx, minX, maxX) : (terrain.minX + terrain.maxX) / 2;
  cam.x += (tx - cam.x) * Math.min(1, dt * 5);
  cam.y += (ty - cam.y) * Math.min(1, dt * (p.air ? 2.5 : 4));
}

// Streaks across the screen when you're really flying.
function drawSpeedLines(ctx, w, h) {
  const v = skater.state === 'bail' ? 0 : Math.hypot(skater.vel.x, skater.vel.y);
  if (v < 950) return;
  const k = clamp((v - 950) / 500, 0, 1), dir = Math.sign(skater.vel.x) || 1;
  ctx.strokeStyle = `rgba(60, 54, 46, ${0.25 * k})`;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const y = ((i * 97 + Math.floor(time * 30) * 53) % 100) / 100 * h;
    const x = ((i * 211 + time * v * 1.4 * dir * -1) % (w + 300) + w + 300) % (w + 300) - 150;
    ctx.moveTo(x, y);
    ctx.lineTo(x + 120 * dir * k, y);
  }
  ctx.stroke();
}

// Evening and night (see daylight.js): everything drawn so far gets darker, then the lights go on
// top. Stars, the moon and lit windows only go in the sky, never over the ground or your skater
// (who's left out of the clip). Called with the world's transform set.
function drawNight(day, sky, view, skyAt, space) {
  const [r, g, b] = day.color;
  if (r + g + b >= 765) return; // broad daylight
  const worldT = ctx.getTransform();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(0, 0, cw, ch);
  ctx.globalCompositeOperation = 'source-over';
  if (day.night <= 0.05) return ctx.setTransform(worldT);
  // the lights are drawn on a see-through layer, with what they'd be behind cut out of it, then
  // laid over the picture
  const L = nightLayer.getContext('2d');
  if (nightLayer.width !== canvas.width || nightLayer.height !== canvas.height) { nightLayer.width = canvas.width; nightLayer.height = canvas.height; }
  const T = terrain, you = skateGame?.watching ? null : skater.state === 'bail' ? skater.bail.rag.hip : skater.pos;
  const cut = (far) => {
    L.setTransform(worldT);
    L.globalCompositeOperation = 'destination-out';
    L.beginPath();
    T.fillPoly.forEach((p, i) => (i ? L.lineTo(p.x, p.y) : L.moveTo(p.x, p.y)));
    L.fill();
    if (you) L.fillRect(you.x - 70, you.y - 130, 140, 150);
    if (far) {
      for (const s of T.back) if (s.type === 'building' || s.type === 'schoolBuilding') L.fillRect(s.x, s.y - s.h, s.w, s.h);
      for (const s of T.front) if (s.type === 'facade') L.fillRect(s.x0, s.top, s.x1 - s.x0, s.bottom - s.top);
    }
    L.globalCompositeOperation = 'source-over';
  };
  const layOn = op => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = op;
    ctx.drawImage(nightLayer, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  };
  // street lamps and lit windows, in the world (not over the ground or you)
  L.setTransform(1, 0, 0, 1, 0, 0);
  L.clearRect(0, 0, nightLayer.width, nightLayer.height);
  L.setTransform(worldT);
  Daylight.drawLights(L, day, T, view);
  cut(false);
  layOn('lighter');
  // far off: windows in the skyline, the stars and the moon (not through buildings either)
  L.setTransform(1, 0, 0, 1, 0, 0);
  L.clearRect(0, 0, nightLayer.width, nightLayer.height);
  L.setTransform(dpr, 0, 0, dpr, 0, 0);
  Daylight.drawSkylineLights(L, day, skyline, skyAt);
  Daylight.drawNightSky(L, day, sky, time, !space); // (the Moon Base has a planet up there already, not a moon)
  cut(true);
  layOn('source-over');
  ctx.setTransform(worldT);
}
const nightLayer = document.createElement('canvas');

function render() {
  const building = mode === 'build';
  const scale = building ? viewScale(BUILD_VIEW) : viewScale();
  const view = building ? builder.cam : cam, world = building ? builder.terrain : terrain;
  Sketch.setBoil(Math.floor(time * CONFIG.boilFps));

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = paperPattern;
  ctx.fillRect(0, 0, cw, ch);

  // skyline (parallax). On the endless Hill Bomb it goes by as if there'd been no stepping back,
  // stays level with the hill, and repeats so it never runs out either.
  const loop = !building && world.loop;
  const skyX = loop ? view.x + loop.shift : view.x;
  const skyY = loop ? view.y - (view.x - world.start.x) * (loop.dy / loop.dx) : view.y;
  const sx = (SKY_X0 - skyX * PARALLAX) * scale + cw / 2;
  const sy = ch / 2 + (40 - skyY * PARALLAX) * scale - SKY_H * scale;
  const tw = skyline.width * scale;
  // the sun, wherever it is in the sky right now (the same time as where you are)
  const day = Daylight.now(), space = world.theme.sky === 'space';
  const sky = { w: cw, top: clamp(sy + (SKY_H - 60) * scale, ch * 0.25, ch * 0.7), starsTo: sy + (SKY_H - 20 - skyline.tallest) * scale };
  if (!building && !space) Daylight.drawSun(ctx, day, sky);
  let tx = loop ? ((sx % tw) + tw) % tw - tw : sx;
  const skyXs = [];
  do { ctx.drawImage(skyline.canvas, tx, sy, tw, SKY_H * scale); skyXs.push(tx); tx += tw; } while (loop && tx < cw);

  // world (shaken a little after a slam)
  const k = dpr * scale, shake = building ? { x: 0, y: 0 } : feel.offset;
  ctx.setTransform(k, 0, 0, k, dpr * (cw / 2 + shake.x) - view.x * k, dpr * (ch / 2 + shake.y) - view.y * k);
  const halfW = cw / 2 / scale;
  drawTerrain(ctx, world, { x0: view.x - halfW - 50, x1: view.x + halfW + 50 });
  if (building) builder.drawWorld(ctx);
  else {
    const seen = { x0: view.x - halfW - 50, x1: view.x + halfW + 50 };
    Season.drawGround(ctx, world, seen);
    if (mode === 'play' && !skateGame && !testRide) Hype.drawWorld(ctx, time);
    if (online) Online.draw(ctx, time, skateGame ? skateGame.watchedId() : null);
    // while you watch someone's S.K.A.T.E. attempt, your own skater steps aside
    if (!skateGame?.watching) {
      drawFx(ctx, skater.fx);
      if (!online) Bonus.draw(ctx, time); // (golden letters can't be collected online, so they don't show)
      ComboTrail.draw(ctx, skater, time);
      drawSkater(ctx, skater);
    }
    drawNight(day, sky, seen, { xs: skyXs, y: sy, scale, w: cw }, space);
    // jack-o'-lanterns glow in the dark
    if (day.night > 0.2) {
      ctx.globalCompositeOperation = 'lighter';
      Season.drawGround(ctx, world, seen, clamp(day.night, 0, 1));
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // screen-space UI
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!building) Season.drawAir(ctx, cw, ch, time, day); // leaves, snow, bats...
  if (mode === 'menu') { menu.draw(ctx, cw, ch, time, dpr); hud.drawProgress(ctx, cw, ch); }
  else if (building) builder.drawUI(ctx, cw, ch);
  else {
    drawSpeedLines(ctx, cw, ch);
    hud.draw(ctx, cw, ch, skater, !!skateGame);
    if (!skateGame && !testRide) Hype.drawHud(ctx, cw, ch, view, scale, time);
    if (run) drawRun(ctx, cw, ch);
    if (skateGame) skateGame.draw(ctx, cw, ch);
    if (showHelp) drawHelp(ctx, cw, ch);
    ctx.font = `15px ${HAND}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle = INK;
    const corner = testRide ? 'TEST RIDE · Esc back to the builder' : online ? `${Net.public ? 'PUBLIC PARK' : `ONLINE · room ${Net.code}`} · ${Net.players.length} here${TouchPad.enabled ? '' : ' · T chat · Esc menu'}` : TouchPad.enabled ? '' : 'Esc · menu';
    ctx.fillText(corner, cw - 14, 12);
    // "Sam joined", "Sam left"
    Net.toasts.forEach((t, i) => {
      ctx.globalAlpha = clamp((3 - t.t) / 0.5, 0, 1);
      markerText(ctx, t.text, cw / 2, ch * 0.2 + i * 30, Math.min(24, cw / 28), '#7fd36b', -0.02);
    });
    ctx.globalAlpha = 1;
    if (online) Chat.draw(ctx, cw, ch);
    TouchPad.draw(ctx, cw, ch);
  }
  if (mode !== 'play') TouchPad.clear();
  if (debug) drawDebug(ctx, skater, fps);
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += dt;
  fps += (1 / Math.max(dt, 1e-3) - fps) * 0.05;

  Input.repeatOk = mode === 'build'; // holding ← → slides the builder cursor along
  Secrets.listening = mode === 'menu';
  let events = carry.concat(Input.drain());
  carry = [];
  events = events.filter(e => {
    if (e === 'help') { showHelp = !showHelp; return false; }
    if (e === 'debug') { debug = !debug; return false; }
    if (e === 'mute') { Sound.toggle(); return false; }
    if (mode === 'play' && e === 'reset' && !skateGame) { skater.facing = 1; skater.respawn(terrain.spawnS); hud.clear(); return false; }
    if (mode === 'play' && e === 'menu' && testRide) { openBuilder(builder.park.id, true); Stats.save(); return false; }
    // online, the menu opens over the room: you're still in it (and still there for everyone) until LEAVE ROOM
    if (mode === 'play' && e === 'menu' && online) { mode = 'menu'; menu.openInRoom(); Stats.save(); return false; }
    if (mode === 'play' && e === 'test' && online) { Chat.open(); return false; }
    if (mode === 'play' && e === 'menu') { mode = 'menu'; run = null; menu.open(); Stats.save(); return false; }
    // the 2-minute run's over: go again
    if (mode === 'play' && run?.result && e === 'start') { if (run.result.t > 0.6) { startRun(mapId); hud.clear(); } return false; }
    if (mode === 'play' && skateGame?.state === 'over' && e === 'start') {
      if (!online) startSkating(menu.lastChoice);
      else if (Net.role === 'host' && Net.players.length >= 2) Net.startGame(); // rematch for everyone
      return false;
    }
    return true;
  });
  if (mode === 'menu') {
    const picked = menu.handle(events);
    if (picked) menuPicked(picked);
    events = [];
    menu.update(dt);
  }
  if (mode === 'build') {
    const r = builder.handle(events);
    if (r?.test) startTestRide();
    else if (r?.exit) { mode = 'menu'; menu.open('parks'); }
    else {
      if (builder.skylineDirty) {
        builder.skylineDirty = false;
        skyline = makeSkyline(builder.terrain.theme.sky, builder.terrain.maxX - builder.terrain.minX);
      }
      builder.update(dt);
      render();
      requestAnimationFrame(frame);
      return;
    }
    events = [];
  }

  // hitstop: a big landing freezes the action for a split second
  const simDt = feel.hitstop > 0 ? 0 : dt;
  feel.hitstop -= dt;
  acc += simDt * CONFIG.timeScale * (Progress.cheat('halfspeed') ? 0.5 : 1);
  if (acc < STEP) carry = events;
  let first = true;
  attractStep();
  // Free Skate and the 2-minute run get gaps and hype (not S.K.A.T.E., a test ride or the menu)
  const extras = mode === 'play' && !skateGame && !testRide;
  while (acc >= STEP) {
    const keys = first ? events : [];
    // (in the menu, the keys are for the menu, not the skater behind it)
    const playing = mode === 'play';
    if (attract.driver) {
      const { ev, held } = attract.driver.step(skater);
      skater.update(STEP, ev, a => held.has(a));
      attract.t += STEP;
    } else if (skateGame && (playing || online)) {
      // in S.K.A.T.E. the game decides who's in control: you, player 2, the CPU, or nobody
      const { ev, held } = skateGame.input(playing ? keys : []);
      skater.update(STEP, ev, playing ? held : () => false);
    } else skater.update(STEP, playing && run?.result ? [] : keys, a => (playing || !online) && !run?.result && Input.held(a));
    if (extras) Gaps.update(skater, STEP);
    first = false;
    acc -= STEP;
    if (mode === 'play') wrapWorld();
  }
  // the show skater's done its trick (or slammed): on to the next one
  if (attract.driver && (attract.t > 8 || (attract.driver.popT !== null && skater.state === 'ground' && attract.t - attract.driver.popT > 1.6))) {
    attract.driver = null;
    skater.regular = false;
  }
  const yours = (!skateGame || skateGame.isMine()) && !attractOn(); // only your own skating goes in your stats
  const telling = online && skateGame && !skateGame.watching; // your S.K.A.T.E. attempt, for the other skater
  for (const m of skater.out) {
    if (!yours && !skateGame) continue; // (the menu's show skater: quietly)
    if (extras) Hype.onMessage(m, skater); // (on fire, a hot spot: before anyone counts the points)
    hud.handle(m);
    if (yours) {
      Progress.onMessage(m); // before Stats, so it can tell which tricks are new
      Challenges.onMessage(m);
      Stats.onMessage(m, skateGame ? null : mapId, hud.score);
      Trophies.onMessage(m);
      if (m.type === 'gap') Trophies.event('gap');
    }
    Sound.onMessage(m);
    // Tung Tung Tung Sahur goes "tung" when he pops
    if (m.type === 'pop' && OUTFIT_OPTIONS.skin[(skater.outfit || Outfit.pick).skin]?.wood) Sound.play('tung');
    feelMessage(m);
    if (skateGame) skateGame.onMessage(m);
    if (telling && SAY_TYPES.has(m.type)) Net.send({ t: 'say', m });
  }
  skater.out.length = 0;
  if (extras) {
    Hype.update(dt, skater);
    for (const e of Hype.events.splice(0)) {
      if (e.type === 'fire') {
        hud.progress({ type: 'banner', title: 'ON FIRE!', lines: ['double points', "until you bail or it burns out"] });
        Sound.play('fire');
        Trophies.event('fire');
      } else if (e.type === 'fireOut') Sound.play('fireOut');
      else if (e.type === 'spot') { hud.progress({ type: 'newTrick', name: 'HOT SPOT! triple points there' }); Sound.play('spot'); }
      else if (e.type === 'spotHit') Trophies.event('spotHit');
    }
  }
  if (run && mode === 'play') updateRun(dt);
  if (mode === 'play' && yours) Trophies.tick(skater, dt);
  if (attract.driver) ComboTrail.update(skater, dt);
  if (mode === 'play') {
    ComboTrail.update(skater, dt);
    // (no warping off to a hidden spot online, or you'd lose everyone)
    const warp = Bonus.update(skater, dt, !skateGame && !testRide && !online);
    if (warp) { loadMap(warp); menu.lastChoice = { map: warp, game: 'free' }; }
  }
  // the room goes on while you're in the menu: everyone keeps moving, and so do you (standing still)
  if (online) Online.update(dt, skater, !skateGame || (!skateGame.watching && skateGame.state === 'attempt'));
  Net.update(dt);
  for (const ev of Progress.events.splice(0)) {
    hud.progress(ev);
    if (ev.type === 'trophy') Sound.play('trophy');
    else if (ev.type === 'level' || ev.type === 'secret' || ev.type === 'banner') Sound.play('levelUp');
    else if (ev.type === 'newTrick' || ev.type === 'letter') Sound.play('newTrick');
    if (ev.type === 'secret' || ev.type === 'banner') menu.refreshMaps();
  }
  if (skateGame && (mode === 'play' || online)) {
    skateGame.update(dt);
    if (skater !== skateGame.skater) { skater = skateGame.skater; hud.clear(); }
  }
  Sound.update(skater, mode === 'play');
  if (mode === 'play' && yours) Stats.track(skater, dt * CONFIG.timeScale);
  hud.update(dt);
  updateCamera(dt);
  render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

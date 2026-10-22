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
  Sketch.circle(g, width * 0.3, -380, 46, 'rgba(244, 197, 66, 0.25)', { color: 'rgba(80,74,66,0.35)', width: 1.6 });

  const towers = (minH, maxH, density) => {
    for (let x = 0; x < width;) {
      const bw = 60 + r() * 120, bh = minH + r() * (maxH - minH);
      const box = [{ x, y: 0 }, { x, y: -bh }, { x: x + bw, y: -bh }, { x: x + bw, y: 0 }];
      Sketch.fill(g, box, wash, 2);
      Sketch.stroke(g, box, pencil);
      for (let wy = -bh + 16; wy < -20; wy += 22) {
        for (let wx = x + 12; wx < x + bw - 16; wx += 20) {
          if (r() < density) Sketch.stroke(g, [{ x: wx, y: wy }, { x: wx + 8, y: wy }, { x: wx + 8, y: wy + 10 }, { x: wx, y: wy + 10 }],
            { ...pencil, width: 1, closed: true, passes: 1 });
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
  } else if (kind === 'downtown') towers(160, 440, 0.7);
  else if (kind === 'suburb') {
    for (let x = 0; x < width; x += 150 + r() * 80) {
      const w = 90 + r() * 40, h = 60 + r() * 30;
      const house = [{ x, y: 0 }, { x, y: -h }, { x: x + w / 2, y: -h - 40 }, { x: x + w, y: -h }, { x: x + w, y: 0 }];
      Sketch.fill(g, house, wash, 2);
      Sketch.stroke(g, house, pencil);
      Sketch.stroke(g, [{ x: x + 20, y: -h + 20 }, { x: x + 40, y: -h + 20 }, { x: x + 40, y: -h + 40 }, { x: x + 20, y: -h + 40 }], { ...pencil, width: 1, closed: true, passes: 1 });
      tree(x + w + 30, 0.9 + r() * 0.6);
    }
  } else if (kind === 'hills') {
    const hill = [{ x: 0, y: 0 }];
    for (let x = 0; x <= width; x += 40) hill.push({ x, y: -120 - Math.sin(x / 260) * 60 - Math.sin(x / 97) * 18 });
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
  return { canvas: c, width };
}

// ---------------------------------------------------------------- game state

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
let mode = 'menu', showHelp = true, debug = false; // mode: 'menu', 'play' or 'build'
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

// choice: { map, game: 'free' | 'cpu' | '2p' }
function startSkating({ map, game }) {
  if (game === 'free') {
    if (map !== mapId || skater.state === 'bail' || skateGame) loadMap(map);
    skateGame = null;
  } else {
    loadMap(map);
    skateGame = new SkateGame(terrain, game === 'cpu');
    skateGame.onGameOver = winner => {
      if (game === 'cpu') { Stats.skateResult(!winner.cpu); Progress.skateResult(!winner.cpu); }
      else Progress.add(20, 'S.K.A.T.E.');
    };
    skater = skateGame.skater;
    showHelp = false;
  }
  menu.lastChoice = { map, game };
  testRide = false;
  mode = 'play';
  hud.clear();
}

function menuPicked(r) {
  if (r.build) openBuilder(r.build);
  else startSkating(r);
}

// The builder zooms out further so you can see more of your park.
const BUILD_VIEW = 900;
const builderToWorld = (x, y) => {
  const s = viewScale(BUILD_VIEW);
  return { x: builder.cam.x + (x - cw / 2) / s, y: builder.cam.y + (y - ch / 2) / s };
};

canvas.addEventListener('pointerdown', e => {
  if (mode === 'menu') {
    const r = menu.click(e.clientX, e.clientY);
    if (r) menuPicked(r);
  } else if (mode === 'build') builder.pointerDown(e.clientX, e.clientY, e.button, builderToWorld);
});
canvas.addEventListener('pointerup', e => {
  if (mode === 'build') builder.pointerUp(e.clientX, e.clientY, builderToWorld);
  else if (mode === 'menu') menu.pointerMove(e.clientX, e.clientY, false);
});
canvas.addEventListener('pointermove', e => { if (mode === 'menu') menu.pointerMove(e.clientX, e.clientY, (e.buttons & 1) === 1); });
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
function viewScale(vh = CONFIG.viewHeight * feel.zoom) { return Math.min(ch / vh, cw / (vh * 1.4)); }

function updateCamera(dt) {
  // zoom out the higher you are above the ground
  const height = skater.state === 'air' ? terrain.groundYAt(skater.pos.x, skater.pos.y) - skater.pos.y : 0;
  const zoomTarget = 1 + clamp((height - 100) / 800, 0, 0.45);
  feel.zoom += (zoomTarget - feel.zoom) * Math.min(1, dt * (zoomTarget > feel.zoom ? 2 : 1.2));
  feel.shake *= Math.pow(0.004, dt);
  feel.offset = { x: (Math.random() - 0.5) * feel.shake, y: (Math.random() - 0.5) * feel.shake };

  const scale = viewScale(), halfW = cw / 2 / scale;
  const bail = skater.state === 'bail' ? skater.bail.body : null;
  const p = bail || skater.pos, vx = bail ? bail.vx : skater.vel.x;
  let tx = p.x + clamp(vx * CONFIG.lookAhead, -260, 260);
  const ty = Math.min(p.y - 110 * feel.zoom, terrain.lowest - 100);
  const minX = terrain.minX + halfW, maxX = terrain.maxX - halfW;
  tx = minX < maxX ? clamp(tx, minX, maxX) : (terrain.minX + terrain.maxX) / 2;
  cam.x += (tx - cam.x) * Math.min(1, dt * 5);
  cam.y += (ty - cam.y) * Math.min(1, dt * (skater.state === 'air' ? 2.5 : 4));
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

  // skyline (parallax)
  const sx = (SKY_X0 - view.x * PARALLAX) * scale + cw / 2;
  const sy = ch / 2 + (40 - view.y * PARALLAX) * scale - SKY_H * scale;
  ctx.drawImage(skyline.canvas, sx, sy, skyline.width * scale, SKY_H * scale);

  // world (shaken a little after a slam)
  const k = dpr * scale, shake = building ? { x: 0, y: 0 } : feel.offset;
  ctx.setTransform(k, 0, 0, k, dpr * (cw / 2 + shake.x) - view.x * k, dpr * (ch / 2 + shake.y) - view.y * k);
  const halfW = cw / 2 / scale;
  drawTerrain(ctx, world, { x0: view.x - halfW - 50, x1: view.x + halfW + 50 });
  if (building) builder.drawWorld(ctx);
  else {
    drawFx(ctx, skater.fx);
    Bonus.draw(ctx, time);
    drawSkater(ctx, skater);
  }

  // screen-space UI
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (mode === 'menu') { menu.draw(ctx, cw, ch, time, dpr); hud.drawProgress(ctx, cw, ch); }
  else if (building) builder.drawUI(ctx, cw, ch);
  else {
    drawSpeedLines(ctx, cw, ch);
    hud.draw(ctx, cw, ch, skater, !!skateGame);
    if (skateGame) skateGame.draw(ctx, cw, ch);
    if (showHelp) drawHelp(ctx, cw, ch);
    ctx.font = `15px ${HAND}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle = INK;
    ctx.fillText(testRide ? 'TEST RIDE · Esc back to the builder' : 'Esc · menu', cw - 14, 12);
  }
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
    if (mode === 'play' && e === 'menu') { mode = 'menu'; menu.open(); Stats.save(); return false; }
    if (mode === 'play' && skateGame?.state === 'over' && e === 'start') { startSkating(menu.lastChoice); return false; }
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
  while (acc >= STEP) {
    const keys = first ? events : [];
    if (skateGame && mode === 'play') {
      // in S.K.A.T.E. the game decides who's in control: you, player 2, the CPU, or nobody
      const { ev, held } = skateGame.input(keys);
      skater.update(STEP, ev, held);
    } else skater.update(STEP, keys, a => Input.held(a));
    first = false;
    acc -= STEP;
  }
  const yours = !skateGame || skateGame.turn === 0; // only your own skating goes in your stats
  for (const m of skater.out) {
    hud.handle(m);
    if (yours) {
      Progress.onMessage(m); // before Stats, so it can tell which tricks are new
      Stats.onMessage(m, skateGame ? null : mapId, hud.score);
    }
    Sound.onMessage(m);
    feelMessage(m);
    if (skateGame) skateGame.onMessage(m);
  }
  skater.out.length = 0;
  if (mode === 'play') {
    const warp = Bonus.update(skater, dt, !skateGame && !testRide);
    if (warp) { loadMap(warp); menu.lastChoice = { map: warp, game: 'free' }; }
  }
  for (const ev of Progress.events.splice(0)) {
    hud.progress(ev);
    if (ev.type === 'level' || ev.type === 'secret' || ev.type === 'banner') Sound.play('levelUp');
    else if (ev.type === 'newTrick' || ev.type === 'letter') Sound.play('newTrick');
    if (ev.type === 'secret' || ev.type === 'banner') menu.refreshMaps();
  }
  if (skateGame && mode === 'play') {
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

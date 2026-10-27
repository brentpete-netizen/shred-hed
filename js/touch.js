// Touch controls for phones and tablets: swipes instead of buttons, like the flick-it controls
// in skate. The screen is split down the middle:
//
//   left side  = your feet. Put a finger down and drag it: right / left pushes, brakes and turns
//                (and balances a manual), down crouches (to pop higher, or pump on ramps). In the
//                air, dragging left / right spins you backside / frontside.
//   right side = the flick. Flick up to ollie; pull down first and then flick up for a bigger
//                one. In the air, flick for flip tricks (→ kickflip, ← heelflip, ↓ shove-it,
//                ↑ impossible, and one swipe that bends, like ↓ then →, is a tre flip). Hold
//                still in the air to grab, and flick while holding to pick which grab. Flicks
//                just before you land pick a manual (↓) or a grind. Flick sideways on the
//                ground to kick-turn or revert.
//
// Every gesture ends up as the same presses and holds as the keyboard (see Input), so the game
// doesn't know the difference. Each finger works on its own. A menu and a help button stay up top.
// It all only shows up once the screen has been touched (or on a touch-only device).

const TouchPad = (() => {
  let enabled = matchMedia('(pointer: coarse)').matches;
  let buttons = [];
  const fingers = new Map(); // pointer id -> what that finger is doing
  const trails = [];         // fading streaks where the right-hand fingers flicked
  let hintT = 0;             // how long the "how to swipe" hint has been showing

  const DEAD = 22;   // px a left-hand finger has to drag before it does anything
  const FLICK = 30;  // px a right-hand finger has to travel to count as a flick
  const HOLD = 0.16; // seconds a right-hand finger has to stay still in the air to grab

  const sk = () => (typeof skater !== 'undefined' ? skater : null);
  const inAir = () => sk()?.state === 'air';

  function layout(w, h) {
    buttons = [
      { action: 'menu', x: w - 30, y: 56, r: 20, label: '☰' },
      { action: 'help', x: w - 76, y: 56, r: 20, label: '?' },
    ];
  }
  const findButton = (x, y) => buttons.find(b => Math.hypot(x - b.x, y - b.y) < b.r * 1.3);

  // presses (one-off, like tapping a key) and holds (until let go), each under its own id so two
  // fingers never cancel each other out
  const press = (id, action) => { Input.touchDown(`${id}:tap`, action); Input.touchUp(`${id}:tap`); };
  function hold(f, slot, action) {
    const key = `${f.id}:${slot}`;
    if (f[slot] === action) return;
    if (f[slot]) Input.touchUp(key);
    f[slot] = action;
    if (action) Input.touchDown(key, action);
  }

  // which way a drag went, by its biggest part
  const dirOf = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');

  // pointer events from the canvas; true when a touch was taken for skating
  function down(e) {
    if (e.pointerType === 'touch' && !enabled) enabled = true;
    if (!enabled || e.pointerType === 'mouse') return false;
    const b = findButton(e.clientX, e.clientY);
    if (b) { press(e.pointerId, b.action); e.preventDefault(); return true; }
    const side = e.clientX < innerWidth / 2 ? 'left' : 'right';
    const f = { id: e.pointerId, side, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t: 0, last: null, moved: false };
    fingers.set(e.pointerId, f);
    if (side === 'right') trails.push(f.trail = { pts: [{ x: e.clientX, y: e.clientY, t: 0 }], fade: 0 });
    hintT = Math.max(hintT, 6); // they've got the idea, start fading the hint
    e.preventDefault();
    return true;
  }

  function move(e) {
    const f = fingers.get(e.pointerId);
    if (!f) return;
    f.x = e.clientX;
    f.y = e.clientY;
    if (f.side === 'left') return feet(f);
    f.trail.pts.push({ x: f.x, y: f.y, t: 0 });
    flick(f);
  }

  // Left hand: like a stick. Which way you've dragged from where you put your finger down is held.
  function feet(f) {
    const dx = f.x - f.x0, dy = f.y - f.y0;
    if (Math.hypot(dx, dy) < DEAD) { f.drag = null; return hold(f, 'dir', null); }
    const d = dirOf(dx, dy);
    if (d === f.drag) return; // keep doing what this drag started (pushing into an ollie stays a push)
    f.drag = d;
    // a new drag in the air spins you; on the ground it's the arrow keys (up does nothing here:
    // ollies are a flick on the right)
    if (inAir()) hold(f, 'dir', d === 'left' ? 'spinBack' : d === 'right' ? 'spinFront' : null);
    else hold(f, 'dir', d === 'up' ? null : d);
  }

  // Right hand: each time the finger travels far enough a new way, that's a flick. One swipe
  // that changes direction is two flicks (↓ then → is a tre flip; ↑ then → is an ollie kickflip).
  function flick(f) {
    const ax = f.ax ?? f.x0, ay = f.ay ?? f.y0;
    const dx = f.x - ax, dy = f.y - ay;
    if (Math.hypot(dx, dy) < FLICK) return;
    f.moved = true;
    const d = dirOf(dx, dy);
    f.ax = f.x;
    f.ay = f.y;
    if (d === f.last) return; // still going the same way
    f.last = d;
    const s = sk();
    if (!s || s.state === 'bail') return press(f.id, d); // (any flick gets you back up after a bail)
    if (s.state === 'ground' && !s.manual && d === 'down') {
      hold(f, 'crouch', 'down'); // pull down and keep it there: crouch, then flick up to pop higher
      return;
    }
    hold(f, 'crouch', null);
    // on the ground, sideways is a kick-turn (or a revert just after landing)
    if (s.state === 'ground' && !s.manual && (d === 'left' || d === 'right')) return press(f.id, d === 'left' ? 'spinBack' : 'spinFront');
    press(f.id, d);
  }

  function up(e) {
    const f = fingers.get(e.pointerId);
    if (!f) return;
    for (const slot of ['dir', 'crouch', 'grab']) hold(f, slot, null);
    if (f.trail) f.trail.fade = 0.001;
    fingers.delete(e.pointerId);
  }

  // every frame: holding still on the right in the air is a grab; left-hand drags follow the
  // skater into and out of the air
  function update(dt) {
    hintT += dt;
    for (const f of fingers.values()) {
      f.t += dt;
      if (f.side === 'left') { feet(f); continue; }
      const still = Math.hypot(f.x - (f.ax ?? f.x0), f.y - (f.ay ?? f.y0)) < 10;
      if (!f.grab && inAir() && still && f.t >= HOLD && !f.moved) hold(f, 'grab', 'grab');
      if (f.grab && !inAir()) hold(f, 'grab', null);
    }
    for (const tr of trails) {
      for (const p of tr.pts) p.t += dt;
      if (tr.fade) tr.fade += dt;
      while (tr.pts.length > 2 && tr.pts[0].t > 0.35) tr.pts.shift();
    }
    for (let i = trails.length - 1; i >= 0; i--) if (trails[i].fade > 0.35) trails.splice(i, 1);
  }

  let lastDraw = 0;
  function draw(ctx, w, h) {
    if (!enabled) { buttons = []; return; }
    const now = performance.now() / 1000;
    update(lastDraw ? Math.min(0.1, now - lastDraw) : 0);
    lastDraw = now;
    layout(w, h);

    // the left-hand "stick": a ring where the finger went down and a knob that follows it
    for (const f of fingers.values()) {
      if (f.side !== 'left') continue;
      const dx = f.x - f.x0, dy = f.y - f.y0, d = Math.hypot(dx, dy), k = d > 54 ? 54 / d : 1;
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#26262b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(f.x0, f.y0, 54, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = f.dir ? (f.dir.startsWith('spin') ? '#6c4bd1' : '#2f80ed') : '#26262b';
      ctx.beginPath();
      ctx.arc(f.x0 + dx * k, f.y0 + dy * k, 22, 0, TAU);
      ctx.fill();
    }
    // right-hand flicks leave a streak that fades out
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const tr of trails) {
      if (tr.pts.length < 2) continue;
      ctx.globalAlpha = 0.5 * (tr.fade ? Math.max(0, 1 - tr.fade / 0.35) : 1);
      ctx.strokeStyle = '#f4c542';
      ctx.lineWidth = 9;
      ctx.beginPath();
      tr.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // how it works, for the first few seconds of each session (gone as soon as you touch)
    if (hintT < 7 && !fingers.size) {
      ctx.globalAlpha = clamp((7 - hintT) / 1.5, 0, 1) * 0.85;
      const fs = Math.max(13, Math.min(18, w / 50)), y = h * 0.62;
      markerText(ctx, 'drag: push · spin in the air', w * 0.25, y, fs, '#ffffff');
      markerText(ctx, 'flick ↑ to ollie · flick to flip · hold to grab', w * 0.75, y, fs, '#ffffff');
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(w / 2, h * 0.3);
      ctx.lineTo(w / 2, h * 0.9);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    for (const b of buttons) {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#26262b';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = '#fbf8f0';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      markerText(ctx, b.label, b.x, b.y + 1, b.r * 0.8, '#ffffff');
    }
    ctx.globalAlpha = 1;
  }

  // no buttons along the bottom any more, so nothing for chat to make room for
  function bottomSpace() { return 0; }

  function clear() {
    for (const f of fingers.values()) for (const slot of ['dir', 'crouch', 'grab']) hold(f, slot, null);
    fingers.clear();
    trails.length = 0;
    buttons = [];
    hintT = 0;
  }

  return { down, move, up, draw, clear, bottomSpace, get enabled() { return enabled; } };
})();

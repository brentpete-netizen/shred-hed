// On-screen buttons for phones and tablets, while you skate: a D-pad on the left (the arrow
// keys), and on the right OLLIE, GRAB (Space) and the two spins (Q / E). Plus a menu button and
// a help button up top. They only show once the screen has been touched (or on a touch-only
// device). Each finger works on its own, so you can hold GRAB and tap arrows for a grab, and
// sliding a finger from one button onto another presses the new one.

const TouchPad = (() => {
  let enabled = matchMedia('(pointer: coarse)').matches;
  let buttons = [];
  const fingers = new Map(); // pointer id -> the button it's on (or null)

  // Where everything goes for a screen this size.
  function layout(w, h) {
    const s = Math.max(44, Math.min(76, Math.min(w, h) * 0.12)), m = 14 + s * 0.1, gap = s * 1.08;
    const lx = m + s / 2, ly = h - m - s / 2 - gap; // the middle of the D-pad
    const rx = w - m - s * 0.7, ry = h - m - s * 0.7;
    buttons = [
      { action: 'up', x: lx + gap, y: ly - gap, r: s / 2, label: '▲' },
      { action: 'left', x: lx, y: ly, r: s / 2, label: '◀' },
      { action: 'right', x: lx + gap * 2, y: ly, r: s / 2, label: '▶' },
      { action: 'down', x: lx + gap, y: ly + gap, r: s / 2, label: '▼' },
      { action: 'up', x: rx, y: ry, r: s * 0.7, label: 'OLLIE', big: true },
      { action: 'grab', x: rx - s * 1.55, y: ry + s * 0.05, r: s * 0.52, label: 'GRAB' },
      { action: 'spinBack', x: rx - s * 1.2, y: ry - s * 1.3, r: s * 0.44, spin: -1 },
      { action: 'spinFront', x: rx + s * 0.05, y: ry - s * 1.55, r: s * 0.44, spin: 1 },
      { action: 'menu', x: w - 30, y: 56, r: 20, label: '☰', small: true },
      { action: 'help', x: w - 76, y: 56, r: 20, label: '?', small: true },
    ];
    return s;
  }

  const active = () => enabled;
  const find = (x, y) => buttons.find(b => Math.hypot(x - b.x, y - b.y) < b.r * 1.2);

  // pointer events from the canvas; true when one of the buttons took it
  function down(e) {
    if (e.pointerType === 'touch' && !enabled) enabled = true;
    if (!enabled || !buttons.length) return false;
    const b = find(e.clientX, e.clientY);
    if (!b) return false;
    fingers.set(e.pointerId, b);
    Input.touchDown(e.pointerId, b.action);
    e.preventDefault();
    return true;
  }
  function move(e) {
    if (!fingers.has(e.pointerId)) return;
    const b = find(e.clientX, e.clientY), was = fingers.get(e.pointerId);
    if (b === was) return;
    fingers.set(e.pointerId, b);
    if (b && !b.small) Input.touchDown(e.pointerId, b.action);
    else Input.touchUp(e.pointerId);
  }
  function up(e) {
    if (!fingers.has(e.pointerId)) return;
    fingers.delete(e.pointerId);
    Input.touchUp(e.pointerId);
  }

  // a curly arrow, for the spin buttons
  function spinArrow(ctx, x, y, r, dir) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(3, r * 0.16);
    ctx.lineCap = 'round';
    // most of a circle, going round the way it spins, with an arrowhead on the end
    const start = dir > 0 ? -2.6 : -0.55, end = dir > 0 ? 0.9 : -4.05, rr = r * 0.48;
    ctx.beginPath();
    ctx.arc(x, y, rr, start, end, dir < 0);
    ctx.stroke();
    const ex = x + Math.cos(end) * rr, ey = y + Math.sin(end) * rr;
    const t = end + (dir > 0 ? Math.PI / 2 : -Math.PI / 2), k = r * 0.26;
    ctx.beginPath();
    ctx.moveTo(ex + Math.cos(t + 2.5) * k, ey + Math.sin(t + 2.5) * k);
    ctx.lineTo(ex, ey);
    ctx.lineTo(ex + Math.cos(t - 2.5) * k, ey + Math.sin(t - 2.5) * k);
    ctx.stroke();
  }

  function draw(ctx, w, h) {
    if (!enabled) { buttons = []; return; }
    layout(w, h);
    const pressed = new Set([...fingers.values()].filter(Boolean));
    for (const b of buttons) {
      const on = pressed.has(b);
      ctx.globalAlpha = on ? 0.9 : 0.55;
      ctx.fillStyle = b.big ? '#e2553f' : b.action === 'grab' ? '#2f80ed' : b.spin ? '#6c4bd1' : '#26262b';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * (on ? 0.94 : 1), 0, TAU);
      ctx.fill();
      ctx.globalAlpha = on ? 1 : 0.8;
      ctx.strokeStyle = '#fbf8f0';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      if (b.spin) spinArrow(ctx, b.x, b.y, b.r, b.spin);
      else markerText(ctx, b.label, b.x, b.y + 1, b.big ? b.r * 0.42 : b.label.length > 1 ? b.r * 0.42 : b.r * 0.8, '#ffffff');
    }
    ctx.globalAlpha = 1;
  }

  // how much of the bottom of the screen the buttons use (so chat can sit above them)
  function bottomSpace(h) { return enabled && buttons.length ? Math.max(44, Math.min(76, Math.min(innerWidth, h) * 0.12)) * 3.4 : 0; }

  function clear() { for (const id of fingers.keys()) Input.touchUp(id); fingers.clear(); buttons = []; }

  return { down, move, up, draw, clear, bottomSpace, get enabled() { return active(); } };
})();

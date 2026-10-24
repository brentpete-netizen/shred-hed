// The combo trail: once you're two tricks into a combo, your board leaves a glowing streak
// behind it, longer and brighter the bigger the combo gets. Pick its look in the closet (Trail);
// new looks unlock as you level up.

const TRAIL_START = 2; // tricks in the combo before the trail lights up

// How long a trail point lasts: longer trails for bigger combos.
const trailLife = n => 0.5 + Math.min(0.6, (n - TRAIL_START) * 0.1);

// One skater's trail: feed it where the board is each frame (and how big the combo is).
class TrailTrack {
  constructor() { this.pts = []; }
  update(x, y, n, on, dt) {
    for (const p of this.pts) p.t += dt;
    if (on && n >= TRAIL_START) this.pts.push({ x, y, t: 0, n });
    while (this.pts.length && (this.pts[0].t > trailLife(this.pts[0].n) || this.pts.length > 140)) this.pts.shift();
  }
  draw(ctx, style, time) { ComboTrail.drawPoints(ctx, this.pts, style, time); }
}

const ComboTrail = (() => {
  let pts = [], owner = null;
  const lifeFor = trailLife;

  function styleOf(sk) {
    const was = Outfit.override;
    Outfit.override = sk.outfit || null;
    const style = Outfit.get('trail');
    Outfit.override = was;
    return style;
  }

  function update(sk, dt) {
    if (sk !== owner) { pts = []; owner = sk; } // a new skater (S.K.A.T.E. turns): start fresh
    for (const p of pts) p.t += dt;
    const n = sk.combo.entries.length, style = styleOf(sk);
    if (n >= TRAIL_START && sk.state !== 'bail' && !style.off) {
      const N = { x: Math.sin(sk.ang), y: -Math.cos(sk.ang) };
      pts.push({ x: sk.pos.x + N.x * 10, y: sk.pos.y + N.y * 10, t: 0, n });
    }
    while (pts.length && (pts[0].t > lifeFor(pts[0].n) || pts.length > 140)) pts.shift();
  }

  function reset() { pts = []; }

  // the world stepped back (on the endless Hill Bomb): the trail comes with it
  function shift(dx, dy) { for (const p of pts) { p.x += dx; p.y += dy; } }

  // Draws a streak through `points` (oldest first): a soft wide glow, a brighter band, then a hot core.
  function drawPoints(ctx, points, style, time, width = 1) {
    if (points.length < 2 || style.off) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const layers = [[3, 0.3], [1.6, 0.7], [0.6, 1]]; // [width × base, opacity]
    layers.forEach(([wk, alpha], layer) => {
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i];
        const life = lifeFor(b.n), k = Math.max(0, 1 - b.t / life);
        let w = (5 + Math.min(9, (b.n - TRAIL_START) * 1.6)) * Math.sqrt(k) * wk * width;
        if (style.flicker) w *= 0.75 + 0.45 * Math.abs(Math.sin(i * 1.7 + time * 26));
        if (w < 0.2) continue;
        let color = style.colors[layer];
        if (style.rainbow && layer < 2) color = `hsl(${(i * 14 - time * 360) % 360}, 95%, ${layer ? 62 : 55}%)`;
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha * Math.min(1, k * 1.6);
        ctx.lineWidth = w;
        ctx.beginPath();
        if (style.zap && layer > 0) {
          // electric: the streak crackles sideways
          const j = (s) => (Math.sin(i * 12.9898 + s + Math.floor(time * 20) * 3.1) * 43758.5453 % 1) * 6 * k;
          ctx.moveTo(a.x + j(1), a.y + j(2));
          ctx.lineTo(b.x + j(3), b.y + j(4));
        } else {
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();
      }
    });
    if (style.sparkle) {
      ctx.fillStyle = style.sparkle;
      for (let i = 2; i < points.length; i += 4) {
        const p = points[i], k = Math.max(0, 1 - p.t / lifeFor(p.n));
        const r = (1 + Math.abs(Math.sin(time * 9 + i))) * k * 1.6 * width;
        ctx.globalAlpha = k;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - r * 2);
        ctx.lineTo(p.x + r * 0.5, p.y);
        ctx.lineTo(p.x, p.y + r * 2);
        ctx.lineTo(p.x - r * 0.5, p.y);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function draw(ctx, sk, time) {
    if (sk === owner) drawPoints(ctx, pts, styleOf(sk), time);
  }

  // For the closet: a streak swooping round and round the model, as if mid-combo.
  function drawDemo(ctx, cx, cy, r, time, style) {
    const points = [];
    for (let i = 0; i < 40; i++) {
      const a = time * 3.2 - (39 - i) * 0.09;
      points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.45, t: (39 - i) * 0.018, n: 7 });
    }
    drawPoints(ctx, points, style, time, r / 60);
  }

  return { update, draw, drawDemo, drawPoints, reset, shift };
})();

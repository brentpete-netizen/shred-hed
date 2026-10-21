// Hand-drawn drawing helpers. Every line wobbles a little, and the wobble changes a few
// times a second ("line boil"), like a cartoon drawn frame by frame.
// Jitter is seeded per object, so a drawing holds still between boil ticks.

const Sketch = (() => {
  let boil = 0, seed = 1, n = 0;

  function setBoil(b) { boil = b; }
  // Call before drawing each object so its wobble doesn't depend on what was drawn before it.
  function seedFor(id) { seed = (Math.imul(boil + 1, 2654435761) ^ Math.imul(id + 7, 40503)) >>> 0; n = 0; }

  function rand() {
    let t = (seed + Math.imul(++n, 0x6D2B79F5)) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const j = amp => (rand() * 2 - 1) * amp;

  // Break long edges into short pieces so they can wobble along their length.
  function subdivide(pts, maxLen, closed) {
    const out = [];
    const count = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < count; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / maxLen));
      for (let k = 0; k < steps; k++) {
        const t = k / steps;
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
    if (!closed) out.push(pts[pts.length - 1]);
    return out;
  }

  function trace(ctx, pts, amp, closed) {
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = p.x + j(amp), y = p.y + j(amp);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    });
    if (closed) ctx.closePath();
  }

  // A marker line: one solid pass plus a lighter second pass slightly off.
  function stroke(ctx, pts, { color = '#222', width = 2, amp = 1, closed = false, passes = 2, maxLen = 40 } = {}) {
    const p = maxLen ? subdivide(pts, maxLen, closed) : pts;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < passes; i++) {
      ctx.lineWidth = i ? width * 0.55 : width;
      ctx.globalAlpha = i ? 0.5 : 1;
      trace(ctx, p, amp, closed);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Marker fill that doesn't quite stay inside the lines.
  function fill(ctx, pts, color, off = 2) {
    const ox = j(off), oy = j(off);
    ctx.fillStyle = color;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x + ox, p.y + oy) : ctx.moveTo(p.x + ox, p.y + oy)));
    ctx.closePath();
    ctx.fill();
  }

  function shape(ctx, pts, fillColor, strokeOpts = {}) {
    if (fillColor) fill(ctx, pts, fillColor, strokeOpts.off ?? 1.5);
    stroke(ctx, pts, { ...strokeOpts, closed: true });
  }

  function circle(ctx, x, y, r, fillColor, { color = '#222', width = 2, amp = 0.6 } = {}) {
    const k = Math.max(10, Math.round(r * 1.5));
    if (fillColor) {
      const ring = [];
      for (let i = 0; i < k; i++) {
        const a = (i / k) * Math.PI * 2;
        ring.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
      }
      fill(ctx, ring, fillColor, amp * 1.5);
    }
    // the outline overshoots its start a little, like a quick pen circle
    const start = rand() * Math.PI * 2, pts = [];
    for (let i = 0; i <= k + 2; i++) {
      const a = start + (i / k) * Math.PI * 2;
      const rr = r + j(amp);
      pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
    }
    stroke(ctx, pts, { color, width, amp: amp * 0.5, passes: 1, maxLen: 0 });
  }

  // A thick cartoon limb: dark outline with a colored core.
  function limb(ctx, pts, width, color, { outline = '#1c1c1c', amp = 0.6 } = {}) {
    const q = pts.map(p => ({ x: p.x + j(amp), y: p.y + j(amp) }));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [w, c] of [[width + 4, outline], [width, color]]) {
      ctx.lineWidth = w;
      ctx.strokeStyle = c;
      ctx.beginPath();
      q.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    }
  }

  return { setBoil, seedFor, rand, j, stroke, fill, shape, circle, limb };
})();

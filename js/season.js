// Holiday decorations (see HOLIDAYS in outfit.js), by the real date like the time of day (see
// daylight.js): New Year's fireworks and confetti, Valentine's hearts, St. Patrick's shamrocks,
// Easter eggs, Fourth of July fireworks, Halloween pumpkins and bats, Thanksgiving leaves,
// Christmas lights, presents and snow. A month without a holiday just looks normal.

const Season = (() => {
  // what's up this month: a set of decoration names ('snow', 'pumpkins'...)
  const decor = () => new Set(holidayNow().holiday?.decor || []);

  // things blowing about, in screen space: [count, colours, size, speed x, speed y, sway]
  const KINDS = {
    leaves: [26, ['#e2553f', '#ff8c2e', '#f4c542', '#c8463d', '#a8743f'], 7, -40, 46, 40],
    snow: [70, ['#ffffff', '#f4f7fb'], 3, -12, 50, 18],
    petals: [30, ['#ffb3d1', '#ffd6e6', '#ffffff'], 5, 30, 32, 30],
    confetti: [40, ['#f4c542', '#ff5fae', '#3dd6ff', '#7fd36b', '#a593e6'], 4, 10, 70, 30],
    hearts: [22, ['#ff5fae', '#d63a3a', '#ff8fb8'], 8, 8, -34, 26],
    clovers: [22, ['#3fae4a', '#2e9e4f', '#7fd36b'], 7, -20, 40, 30],
  };
  const seeds = Array.from({ length: 70 }, (_, i) => { const r = n => { const v = Math.sin((i + 1) * n) * 43758.5453; return v - Math.floor(v); }; return [r(12.9), r(78.2), r(37.7), r(5.3)]; });

  const heart = (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.35);
    ctx.bezierCurveTo(-s * 1.1, -s * 0.4, -s * 0.45, -s * 1.05, 0, -s * 0.45);
    ctx.bezierCurveTo(s * 0.45, -s * 1.05, s * 1.1, -s * 0.4, 0, s * 0.35);
    ctx.fill();
  };
  const clover = (ctx, s) => {
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(Math.cos(k * 2.1 - 1.57) * s * 0.5, Math.sin(k * 2.1 - 1.57) * s * 0.5, s * 0.45, 0, TAU); ctx.fill(); }
    ctx.fillRect(-s * 0.08, 0, s * 0.16, s * 0.9);
  };

  // In front of everything, screen space: falling and floating things, fireworks, bats, lights.
  function drawAir(ctx, w, h, time, day) {
    const d = decor();
    if (!d.size) return;
    for (const kind of Object.keys(KINDS)) {
      if (!d.has(kind)) continue;
      const [n, colors, size, vx, vy, sway] = KINDS[kind];
      for (let i = 0; i < n; i++) {
        const [a, b, c, e] = seeds[i], sp = 0.6 + c * 0.8;
        const x = (((a * (w + 80) + time * vx * sp + Math.sin(time * (0.8 + e) + i) * sway) % (w + 80)) + w + 80) % (w + 80) - 40;
        const y = ((((b * (h + 80) + time * vy * sp) % (h + 80)) + h + 80) % (h + 80)) - 40;
        ctx.globalAlpha = kind === 'snow' ? 0.85 : 0.75;
        ctx.fillStyle = colors[i % colors.length];
        ctx.save();
        ctx.translate(x, y);
        const sz = size * (0.7 + c * 0.6);
        if (kind === 'hearts') { ctx.rotate(Math.sin(time * 2 + i) * 0.3); heart(ctx, sz); }
        else {
          ctx.rotate(time * (1 + e) + i);
          if (kind === 'snow') { ctx.beginPath(); ctx.arc(0, 0, sz, 0, TAU); ctx.fill(); }
          else if (kind === 'clovers') clover(ctx, sz);
          else if (kind === 'confetti') ctx.fillRect(-sz / 2, -sz, sz, sz * 2 * Math.abs(Math.cos(time * 3 + i)));
          else { ctx.beginPath(); ctx.ellipse(0, 0, sz, sz * 0.55, 0, 0, TAU); ctx.fill(); }
        }
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    if (d.has('lights')) drawLightString(ctx, w, time, day);
    const dark = clamp((day.night - 0.35) / 0.3, 0, 1);
    if (dark <= 0) return;
    if (d.has('fireworks')) drawFireworks(ctx, w, h, time, dark);
    if (d.has('bats')) {
      ctx.globalAlpha = dark;
      for (let i = 0; i < 6; i++) {
        const [a, b, c] = seeds[i], x = ((a * w + time * (60 + c * 50)) % (w + 120)) - 60, y = h * (0.08 + b * 0.25) + Math.sin(time * 2 + i) * 20;
        const flap = Math.sin(time * 14 + i * 2) * 6, sz = 10 + c * 6;
        ctx.fillStyle = '#1c1c22';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x - sz * 0.6, y - flap - 4, x - sz * 1.3, y - flap);
        ctx.quadraticCurveTo(x - sz * 0.7, y + 2, x, y + 3);
        ctx.quadraticCurveTo(x + sz * 0.7, y + 2, x + sz * 1.3, y - flap);
        ctx.quadraticCurveTo(x + sz * 0.6, y - flap - 4, x, y);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  // Fireworks after dark: a new one every second or so, bursting up in the sky and falling away.
  function drawFireworks(ctx, w, h, time, dark) {
    const EVERY = 1.1, LIFE = 2.2, colors = ['#ff5a5a', '#f4c542', '#3dd6ff', '#7fd36b', '#ff5fae', '#ffffff'];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = Math.floor((time - LIFE) / EVERY); k <= Math.floor(time / EVERY); k++) {
      const t = time - k * EVERY;
      if (t < 0 || t > LIFE) continue;
      const r = n => { const v = Math.sin(k * 91.7 + n * 13.3) * 43758.5453; return v - Math.floor(v); };
      const cx = w * (0.1 + 0.8 * r(1)), cy = h * (0.1 + 0.25 * r(2)), color = colors[Math.floor(r(3) * colors.length)];
      const up = Math.min(1, t / 0.4); // shooting up first
      if (up < 1) {
        ctx.globalAlpha = dark;
        ctx.fillStyle = '#fff4c2';
        ctx.fillRect(cx, h * 0.9 - (h * 0.9 - cy) * up, 3, 8);
        continue;
      }
      const bt = t - 0.4, fade = 1 - bt / (LIFE - 0.4), size = Math.min(w, h) * 0.22 * (0.7 + r(4) * 0.6);
      const spread = size * (1 - Math.exp(-bt * 3)), drop = bt * bt * 40;
      // a flash as it goes off
      if (bt < 0.15) {
        ctx.globalAlpha = dark * (1 - bt / 0.15);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(cx, cy, 14, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = dark * fade;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * TAU, tail = Math.min(spread, 22);
        ctx.moveTo(cx + Math.cos(a) * (spread - tail), cy + Math.sin(a) * (spread - tail) + drop * 0.8);
        ctx.lineTo(cx + Math.cos(a) * spread, cy + Math.sin(a) * spread + drop);
      }
      ctx.stroke();
      ctx.fillStyle = '#fff8dc';
      for (let i = 0; i < 32; i += 2) { const a = (i / 32) * TAU; ctx.fillRect(cx + Math.cos(a) * spread - 2, cy + Math.sin(a) * spread + drop - 2, 4, 4); }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // Christmas lights strung along the top of the screen (they glow at night).
  function drawLightString(ctx, w, time, day) {
    const sag = 18, gap = 70;
    ctx.strokeStyle = '#2b3a2b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 10) { const k = (x % (gap * 3)) / (gap * 3); ctx.lineTo(x, 8 + Math.sin(k * Math.PI) * sag); }
    ctx.stroke();
    const colors = ['#ff4040', '#3fdc5a', '#ffd23f', '#3db4ff', '#ff5fae'];
    for (let x = gap / 2, i = 0; x < w; x += gap / 2, i++) {
      const k = (x % (gap * 3)) / (gap * 3), y = 8 + Math.sin(k * Math.PI) * sag + 6;
      const on = 0.6 + 0.4 * Math.sin(time * 3 + i * 1.7);
      ctx.fillStyle = colors[i % colors.length];
      ctx.shadowColor = colors[i % colors.length];
      ctx.shadowBlur = 6 + 14 * day.night * on;
      ctx.globalAlpha = 0.7 + 0.3 * on;
      ctx.beginPath();
      ctx.ellipse(x, y, 4, 6, 0, 0, TAU);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // On the ground along the map (world space): jack-o'-lanterns at Halloween, painted eggs at
  // Easter, presents at Christmas. glow: the pumpkins' faces lit, after dark.
  function drawGround(ctx, T, view, glow = 0) {
    const d = decor(), kind = d.has('pumpkins') ? 'pumpkin' : d.has('eggs') ? 'egg' : d.has('presents') ? 'present' : null;
    if (!kind || (glow && kind !== 'pumpkin')) return;
    for (let x = T.minX + 380, i = 0; x < T.maxX - 300; x += 820, i++) {
      if (x < view.x0 - 60 || x > view.x1 + 60) continue;
      const y = T.groundYAt(x), seg = T.surfaceBelow(x, y - 5);
      if (!seg || Math.abs(seg.ang) > 0.2) continue; // only on flat ground
      Sketch.seedFor(700 + i);
      if (kind === 'pumpkin') pumpkin(ctx, x, y, glow);
      else if (kind === 'egg') {
        for (const [dx, c, s] of [[-12, '#ffb3d1', 1], [6, '#bfe6f2', 0.85], [18, '#fff1a0', 0.75]]) {
          Sketch.shape(ctx, Array.from({ length: 12 }, (_, k) => { const a = (k / 12) * TAU; return { x: x + dx + Math.cos(a) * 8 * s, y: y - 11 * s + Math.sin(a) * 11 * s * (Math.sin(a) < 0 ? 1.15 : 0.9) }; }), c, { color: INK, width: 1.4, amp: 0.3 });
          Sketch.stroke(ctx, [{ x: x + dx - 7 * s, y: y - 11 * s }, { x: x + dx + 7 * s, y: y - 11 * s }], { color: '#ff5fae', width: 2, amp: 0.3, passes: 1 });
        }
      } else {
        for (const [dx, c, ribbon, s] of [[-14, '#d64545', '#f4c542', 1], [12, '#3fae4a', '#f4f1ea', 0.8]]) {
          const bw = 24 * s, bh = 20 * s, bx = x + dx - bw / 2;
          Sketch.shape(ctx, [{ x: bx, y }, { x: bx, y: y - bh }, { x: bx + bw, y: y - bh }, { x: bx + bw, y }], c, { color: INK, width: 1.6, amp: 0.3 });
          Sketch.stroke(ctx, [{ x: bx + bw / 2, y }, { x: bx + bw / 2, y: y - bh }], { color: ribbon, width: 3, amp: 0.2, passes: 1 });
          Sketch.circle(ctx, bx + bw / 2 - 3, y - bh - 3, 3, ribbon, { width: 1 });
          Sketch.circle(ctx, bx + bw / 2 + 3, y - bh - 3, 3, ribbon, { width: 1 });
        }
      }
    }
  }

  function pumpkin(ctx, x, y, glow) {
    const r = 15;
    if (!glow) {
      Sketch.shape(ctx, Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * TAU; return { x: x + Math.cos(a) * r * 1.2, y: y - r + Math.sin(a) * r }; }), '#ff8c1a', { color: INK, width: 1.8, amp: 0.4 });
      Sketch.stroke(ctx, [{ x, y: y - r * 2 }, { x: x + 2, y: y - r * 2 - 7 }], { color: '#5b8c2a', width: 3, amp: 0.3, passes: 1 });
    }
    // the face (glowing at night)
    ctx.fillStyle = glow ? `rgba(255, 214, 90, ${glow})` : '#3a2410';
    ctx.beginPath();
    ctx.moveTo(x - 9, y - r - 4); ctx.lineTo(x - 4, y - r - 4); ctx.lineTo(x - 6.5, y - r - 9); ctx.closePath();
    ctx.moveTo(x + 4, y - r - 4); ctx.lineTo(x + 9, y - r - 4); ctx.lineTo(x + 6.5, y - r - 9); ctx.closePath();
    ctx.moveTo(x - 9, y - r + 3); ctx.lineTo(x + 9, y - r + 3); ctx.lineTo(x + 5, y - r + 8); ctx.lineTo(x, y - r + 5); ctx.lineTo(x - 5, y - r + 8); ctx.closePath();
    ctx.fill();
  }

  return { drawAir, drawGround };
})();

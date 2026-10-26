// The time of year, like the time of day (see daylight.js), is the real one: leaves blow about in
// the autumn, pumpkins sit out (and bats come out at night) around Halloween, it snows in the
// winter, petals drift about in the spring, and there are fireflies on summer nights.

const Season = (() => {
  function now(d = new Date()) {
    const m = d.getMonth() + 1, day = d.getDate(), md = m * 100 + day;
    return {
      halloween: md >= 1015 && md <= 1031,
      leaves: md >= 922 && md <= 1130,
      snow: m === 12 || m <= 2,
      petals: md >= 320 && md <= 531,
      fireflies: m >= 6 && m <= 8,
    };
  }

  // things blowing about, in screen space: [count, colours, size, speed x, speed y, sway]
  const KINDS = {
    leaves: [26, ['#e2553f', '#ff8c2e', '#f4c542', '#c8463d', '#a8743f'], 7, -40, 46, 40],
    snow: [70, ['#ffffff', '#f4f7fb'], 3, -12, 50, 18],
    petals: [30, ['#ffb3d1', '#ffd6e6', '#ffffff'], 5, 30, 32, 30],
  };
  const seeds = Array.from({ length: 70 }, (_, i) => { const r = n => { const v = Math.sin((i + 1) * n) * 43758.5453; return v - Math.floor(v); }; return [r(12.9), r(78.2), r(37.7), r(5.3)]; });

  function drawAir(ctx, w, h, time, day) {
    const s = now();
    for (const kind of ['leaves', 'snow', 'petals']) {
      if (!s[kind]) continue;
      const [n, colors, size, vx, vy, sway] = KINDS[kind];
      for (let i = 0; i < n; i++) {
        const [a, b, c, d] = seeds[i], sp = 0.6 + c * 0.8;
        const x = (((a * (w + 80) + time * vx * sp + Math.sin(time * (0.8 + d) + i) * sway) % (w + 80)) + w + 80) % (w + 80) - 40;
        const y = ((b * (h + 80) + time * vy * sp) % (h + 80)) - 40;
        ctx.globalAlpha = kind === 'snow' ? 0.85 : 0.75;
        ctx.fillStyle = colors[i % colors.length];
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(time * (1 + d) + i);
        const sz = size * (0.7 + c * 0.6);
        if (kind === 'snow') { ctx.beginPath(); ctx.arc(0, 0, sz, 0, TAU); ctx.fill(); }
        else { ctx.beginPath(); ctx.ellipse(0, 0, sz, sz * 0.55, 0, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
    }
    // after dark: bats at Halloween, fireflies in the summer
    if (day.night > 0.4 && (s.halloween || s.fireflies)) {
      ctx.globalAlpha = clamp((day.night - 0.4) / 0.3, 0, 1);
      if (s.halloween) for (let i = 0; i < 6; i++) {
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
      if (s.fireflies) for (let i = 0; i < 24; i++) {
        const [a, b, c, d] = seeds[i], x = a * w + Math.sin(time * 0.6 + i) * 40, y = h * (0.45 + b * 0.45) + Math.cos(time * 0.8 + i * 2) * 25;
        ctx.globalAlpha = clamp((day.night - 0.4) / 0.3, 0, 1) * Math.max(0, Math.sin(time * (1 + d) + c * 10));
        ctx.fillStyle = '#e9ff8a';
        ctx.shadowColor = '#e9ff8a';
        ctx.shadowBlur = 8;
        ctx.fillRect(x, y, 3, 3);
        ctx.shadowBlur = 0;
      }
    }
    ctx.globalAlpha = 1;
  }

  // Halloween: jack-o'-lanterns along the map (world space). glow: the faces lit, after dark.
  function drawPumpkins(ctx, T, view, glow = 0) {
    if (!now().halloween) return;
    const start = T.minX + 380;
    for (let x = start; x < T.maxX - 300; x += 820) {
      if (x < view.x0 - 60 || x > view.x1 + 60) continue;
      const y = T.groundYAt(x), seg = T.surfaceBelow(x, y - 5);
      if (!seg || Math.abs(seg.ang) > 0.2) continue; // only on flat ground
      const r = 15;
      if (!glow) {
        Sketch.seedFor(700 + Math.round(x));
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
  }

  return { now, drawAir, drawPumpkins };
})();

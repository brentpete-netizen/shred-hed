// Day and night: it's the same time in the game as it is where you are. Through the day the sky
// is the paper as usual; the sun comes up, goes over and sets in a golden glow, and at night
// everything goes blue-dark, the stars and the moon come out, the street lamps glow and lights
// come on in the windows. (shredHed.hour = 21 in the console tries out another time.)

const Daylight = (() => {
  // the colour everything gets tinted (multiplied) by, through the day: [hour, [r, g, b]]
  const NIGHT = [92, 104, 168];
  const KEYS = [
    [0, NIGHT], [5, NIGHT], [6, [236, 176, 170]], [7, [255, 238, 226]], [8, [255, 255, 255]],
    [17, [255, 255, 255]], [18.5, [255, 214, 162]], [19.5, [232, 156, 134]], [20.5, [128, 112, 170]], [21.5, NIGHT], [24, NIGHT],
  ];
  const SUNRISE = 6, SUNSET = 19.7;
  const nightAvg = (NIGHT[0] + NIGHT[1] + NIGHT[2]) / 3;

  const hour = () => {
    const o = typeof window !== 'undefined' && window.shredHed?.hour;
    if (Number.isFinite(o)) return ((o % 24) + 24) % 24;
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  };

  function tint(h) {
    for (let i = 1; i < KEYS.length; i++) {
      const [h1, c1] = KEYS[i];
      if (h > h1) continue;
      const [h0, c0] = KEYS[i - 1], k = (h - h0) / (h1 - h0 || 1);
      return c0.map((v, j) => Math.round(v + (c1[j] - v) * k));
    }
    return NIGHT;
  }

  // what the sky's doing right now: night is 0 in the day and 1 in the dead of night
  function now() {
    const h = hour(), color = tint(h);
    const night = clamp((255 - (color[0] + color[1] + color[2]) / 3) / (255 - nightAvg), 0, 1);
    return { h, color, night };
  }

  // where along its arc across the sky something is (0 rising, 1 setting), or null if it's down
  const arc = (h, from, to) => {
    const len = (to - from + 24) % 24, t = ((h - from + 24) % 24) / len;
    return t <= 1 ? t : null;
  };

  const stars = (() => {
    let s = 77;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    return Array.from({ length: 90 }, () => ({ x: r(), y: r(), size: 0.8 + r() * 1.8, tw: r() * TAU }));
  })();

  // The sun, behind everything (sky: { w, h, top: how far down the sky goes on screen }).
  function drawSun(ctx, d, sky) {
    const t = arc(d.h, SUNRISE, SUNSET);
    if (t === null) return;
    const x = sky.w * (0.08 + 0.84 * t), y = sky.top - Math.sin(Math.PI * t) * sky.top * 0.8;
    const low = 1 - Math.sin(Math.PI * t); // near the horizon it's bigger and redder
    Sketch.seedFor(9);
    Sketch.circle(ctx, x, y, 34 + low * 10, `rgba(${244}, ${Math.round(197 - low * 80)}, ${Math.round(66 - low * 30)}, 0.32)`,
      { color: 'rgba(80, 74, 66, 0.35)', width: 1.6 });
  }

  // On top of the darkened world: stars and the moon up in the sky (above the skyline, so they're
  // never in front of a building), screen space.
  function drawNightSky(ctx, d, sky, time, moon = true) {
    if (d.night <= 0.05) return;
    for (const st of stars) {
      const y = st.y * sky.starsTo;
      if (y > sky.starsTo) continue;
      ctx.globalAlpha = d.night * (0.55 + 0.45 * Math.sin(time * 2 + st.tw));
      ctx.fillStyle = '#fff8dc';
      ctx.fillRect(st.x * sky.w, y, st.size, st.size);
    }
    ctx.globalAlpha = 1;
    const t = arc(d.h, SUNSET, SUNRISE + 24);
    if (t === null || !moon) return;
    const x = sky.w * (0.1 + 0.8 * t), y = Math.min(sky.starsTo - 30, sky.top - Math.sin(Math.PI * t) * sky.top * 0.75);
    ctx.globalAlpha = clamp(d.night * 1.4, 0, 1);
    ctx.save();
    ctx.shadowColor = 'rgba(255, 248, 220, 0.8)';
    ctx.shadowBlur = 24;
    Sketch.seedFor(10);
    Sketch.circle(ctx, x, y, 26, '#f6f0d8', { color: 'rgba(60, 60, 80, 0.5)', width: 1.6 });
    ctx.restore();
    for (const [cx, cy, cr] of [[-8, -6, 5], [7, 4, 4], [-2, 10, 3]]) Sketch.circle(ctx, x + cx, y + cy, cr, 'rgba(180, 176, 160, 0.6)', { color: 'rgba(60,60,80,0.3)', width: 1 });
    ctx.globalAlpha = 1;
  }

  // Lights in the world, after it's been darkened: street lamps, windows in the buildings behind.
  function drawLights(ctx, d, T, view) {
    if (d.night <= 0.15) return;
    const on = clamp((d.night - 0.15) / 0.5, 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of T.back) {
      if (s.type === 'lamp') {
        if (s.x < view.x0 - 200 || s.x > view.x1 + 200) continue;
        const hx = s.x + 35, hy = s.y - 193;
        const g = ctx.createRadialGradient(hx, hy, 4, hx, hy, 90);
        g.addColorStop(0, `rgba(255, 220, 140, ${0.7 * on})`);
        g.addColorStop(1, 'rgba(255, 200, 120, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(hx - 90, hy - 90, 180, 180);
        // the pool of light on the ground under it
        ctx.fillStyle = `rgba(255, 210, 140, ${0.18 * on})`;
        ctx.beginPath();
        ctx.moveTo(hx - 10, hy + 6);
        ctx.lineTo(hx + 10, hy + 6);
        ctx.lineTo(hx + 70, s.y);
        ctx.lineTo(hx - 70, s.y);
        ctx.closePath();
        ctx.fill();
      } else if (s.type === 'building' || s.type === 'schoolBuilding') {
        const { x, w, h, y } = s;
        if (x + w < view.x0 || x > view.x1) continue;
        ctx.fillStyle = `rgba(255, 206, 110, ${0.75 * on})`;
        for (let wy = y - h + 24, i = 0; wy < y - 50; wy += 46) {
          for (let wx = x + 18; wx < x + w - 34; wx += 42, i++) if (lit(x + i * 7.3)) ctx.fillRect(wx + 2, wy + 2, 18, 24);
        }
      }
    }
    ctx.restore();
  }

  // Windows in the skyline far away (sky: where the skyline picture is on screen).
  function drawSkylineLights(ctx, d, skyline, at) {
    if (d.night <= 0.15 || !skyline.windows) return;
    const on = clamp((d.night - 0.15) / 0.5, 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255, 206, 110, ${0.55 * on})`;
    for (const tx of at.xs) {
      for (const win of skyline.windows) {
        const sx = tx + win.x * at.scale;
        if (sx < -20 || sx > at.w + 20) continue;
        ctx.fillRect(sx, at.y + (win.y + SKY_H - 20) * at.scale, win.w * at.scale, win.h * at.scale);
      }
    }
    ctx.restore();
  }

  // the same windows lit every night (about 4 in 10 of them)
  const lit = n => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v) < 0.42; };

  return { now, tint, drawSun, drawNightSky, drawLights, drawSkylineLights, lit };
})();

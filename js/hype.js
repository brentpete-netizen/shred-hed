// Hype, for Free Skate and the 2-minute run:
// - the HYPE meter fills as you land combos (big ones fill it faster); fill it and you're ON FIRE:
//   flames off your board and double points, until you bail or it burns out;
// - every so often a HOT SPOT lights up somewhere on the map: land a combo in it for triple points.

const FIRE_TIME = 25;     // seconds on fire
const SPOT_TIME = 20;     // seconds a hot spot stays lit
const SPOT_WIDTH = 170;   // how far either side of the middle counts

const Hype = (() => {
  let T = null, meter = 0, fire = 0, spot = null, spotWait = 20, flick = 0;
  const events = [];

  function load(terrain) {
    T = terrain;
    meter = 0;
    fire = 0;
    spot = null;
    spotWait = 15 + Math.random() * 10;
  }

  const inSpot = sk => spot && Math.abs(sk.pos.x - spot.x) <= SPOT_WIDTH;

  // A skater message, before anything else sees it: a combo can get bigger.
  function onMessage(m, sk) {
    if (m.type === 'combo') {
      let mult = 1;
      const tags = [];
      if (inSpot(sk)) { mult *= 3; tags.push('HOT SPOT ×3'); spot.t = Math.min(spot.t, 0.6); events.push({ type: 'spotHit' }); }
      if (fire > 0) { mult *= 2; tags.push('ON FIRE ×2'); }
      if (mult > 1) { m.score = Math.round(m.score * mult); m.bonus = tags; }
      if (fire <= 0) {
        meter += clamp(m.score / 7000, 0.06, 0.55);
        if (meter >= 1) { meter = 0; fire = FIRE_TIME; events.push({ type: 'fire' }); }
      }
    } else if (m.type === 'bail') {
      if (fire > 0) { fire = 0; events.push({ type: 'fireOut' }); } else meter = Math.max(0, meter - 0.25);
    }
  }

  function update(dt, sk) {
    if (!T) return;
    if (fire > 0) {
      fire -= dt;
      if (fire <= 0) events.push({ type: 'fireOut' });
      // flames off the board
      if (sk.state !== 'bail' && (flick += dt) > 0.025) {
        flick = 0;
        const back = { x: -Math.cos(sk.ang) * sk.facing, y: -Math.sin(sk.ang) * sk.facing };
        sk.fx.push({ kind: 'flame', x: sk.pos.x + back.x * (10 + Math.random() * 30) + (Math.random() - 0.5) * 10, y: sk.pos.y - 4 + (Math.random() - 0.5) * 6,
          vx: back.x * 60 - sk.vel.x * 0.15, vy: -90 - Math.random() * 80, r: 5 + Math.random() * 5, life: 0, max: 0.35 + Math.random() * 0.25 });
      }
    }
    if (spot) {
      if ((spot.t -= dt) <= 0) { spot = null; spotWait = 25 + Math.random() * 20; }
    } else if ((spotWait -= dt) <= 0) {
      // somewhere ahead of you (or behind, near the far end), on the ground
      const x0 = T.minX + 250, x1 = T.maxX - 250, near = sk.pos.x + (Math.random() < 0.7 ? 1 : -1) * (500 + Math.random() * 900);
      const x = clamp(near, x0, x1);
      spot = { x, y: T.groundYAt(x, T.groundYAt(x) - 5), t: SPOT_TIME, born: 0 };
      events.push({ type: 'spot' });
    }
    if (spot) spot.born += dt;
  }

  // The hot spot, in the world.
  function drawWorld(ctx, time) {
    if (!spot) return;
    const { x, y } = spot, pulse = 1 + Math.sin(time * 6) * 0.06, fade = clamp(spot.t / 1.5, 0, 1) * clamp(spot.born / 0.4, 0, 1);
    ctx.save();
    ctx.globalAlpha = fade;
    const g = ctx.createRadialGradient(x, y, 10, x, y - 40, SPOT_WIDTH * 1.2);
    g.addColorStop(0, 'rgba(255, 120, 40, 0.45)');
    g.addColorStop(1, 'rgba(255, 120, 40, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - SPOT_WIDTH * 1.3, y - 220, SPOT_WIDTH * 2.6, 240);
    ctx.strokeStyle = '#ff7a2e';
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 10]);
    ctx.lineDashOffset = -time * 40;
    ctx.beginPath();
    ctx.ellipse(x, y, SPOT_WIDTH * pulse, 16 * pulse, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    // sparks going up
    for (let i = 0; i < 10; i++) {
      const k = (time * 0.7 + i / 10) % 1, sx = x + Math.sin(i * 7.3) * SPOT_WIDTH * 0.85;
      ctx.globalAlpha = fade * (1 - k);
      ctx.fillStyle = i % 2 ? '#ffd84a' : '#ff7a2e';
      ctx.fillRect(sx, y - k * 160, 4, 4);
    }
    ctx.globalAlpha = fade;
    markerText(ctx, 'HOT SPOT ×3', x, y - 150 + Math.sin(time * 3) * 6, 30, '#ff8c2e', -0.05);
    markerText(ctx, `${Math.ceil(spot.t)}`, x, y - 112, 20, '#ffffff');
    ctx.restore();
  }

  // The meter (top left, under the score) and an arrow to the hot spot when it's off screen.
  function drawHud(ctx, w, h, view, scale, time) {
    const x = 18, y = 62, bw = Math.min(170, w * 0.3), bh = 12;
    const on = fire > 0, k = on ? fire / FIRE_TIME : meter;
    ctx.save();
    Sketch.seedFor(97);
    const bar = [{ x, y }, { x: x + bw, y }, { x: x + bw, y: y + bh }, { x, y: y + bh }];
    Sketch.fill(ctx, bar, 'rgba(251, 248, 240, 0.85)', 1);
    if (k > 0.01) {
      const fillW = bw * k;
      const grad = ctx.createLinearGradient(x, 0, x + bw, 0);
      grad.addColorStop(0, '#f4c542');
      grad.addColorStop(1, on ? '#ff3d1f' : '#ff8c2e');
      ctx.fillStyle = grad;
      ctx.fillRect(x + 1, y + 1, fillW - 2, bh - 2);
    }
    Sketch.stroke(ctx, bar, { color: INK, width: 1.8, amp: 0.5, closed: true });
    const label = on ? 'ON FIRE! ×2' : meter > 0.85 ? 'HYPE · ALMOST!' : 'HYPE';
    markerText(ctx, label, x + bw / 2, y + bh + 12, 13, on ? '#ff5a1f' : '#ffffff', 0, on ? 1 + Math.sin(time * 10) * 0.06 : 1);
    if (on) for (let i = 0; i < 5; i++) {
      const fx = x + (bw * k) * (i / 4), fy = y - 3 - Math.abs(Math.sin(time * 9 + i * 1.7)) * 8;
      ctx.fillStyle = i % 2 ? '#ffd84a' : '#ff5a1f';
      ctx.beginPath();
      ctx.ellipse(fx, fy, 3, 6, 0, 0, TAU);
      ctx.fill();
    }
    // where the hot spot is, if you can't see it
    if (spot) {
      const sx = (spot.x - view.x) * scale + w / 2;
      if (sx < 20 || sx > w - 20) {
        const right = sx > w, ax = right ? w - 34 : 34, ay = h * 0.55;
        const bob = Math.sin(time * 6) * 5 * (right ? 1 : -1);
        markerText(ctx, right ? '▶' : '◀', ax + bob, ay, 30, '#ff8c2e');
        markerText(ctx, 'HOT SPOT', ax + (right ? -10 : 10), ay + 30, 14, '#ffffff');
      }
    }
    ctx.restore();
  }

  return { load, onMessage, update, drawWorld, drawHud, events, get onFire() { return fire > 0; }, get spot() { return spot; } };
})();

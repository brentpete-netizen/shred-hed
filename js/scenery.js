// Map scenery, all hand-drawn: things behind the ground (buildings, trees, lamps, the bridge)
// and details on top of it (shop fronts, the parked car, court lines, the mega ramp scaffold).

const PENCIL = 'rgba(70, 64, 56, 0.55)';

const SCENERY = {
  // ---- behind the ground
  fence({ x0, x1, y, h }) {
    const line = { color: PENCIL, width: 1.4, amp: 1, passes: 1 };
    for (let x = x0; x < x1; x += 60) Sketch.stroke(sc, [{ x, y }, { x, y: y - h }], line);
    for (const k of [0.15, 0.55, 0.95]) Sketch.stroke(sc, [{ x: x0, y: y - h * k }, { x: x1, y: y - h * k }], { ...line, maxLen: 60 });
  },
  tree({ x, y, s = 1 }) {
    Sketch.limb(sc, [{ x, y }, { x: x + 3, y: y - 70 * s }], 9 * s, '#8a6240', { amp: 0.5 });
    for (const [dx, dy, r] of [[-26, -84, 30], [22, -90, 32], [0, -118, 34], [-6, -70, 26]]) {
      Sketch.circle(sc, x + dx * s, y + dy * s, r * s, '#7fb069', { color: '#3d5a2e', width: 2, amp: 1.5 });
    }
  },
  lamp({ x, y }) {
    Sketch.limb(sc, [{ x, y }, { x, y: y - 190 }, { x: x + 34, y: y - 196 }], 3.5, '#5d636b', { amp: 0.4 });
    Sketch.shape(sc, [{ x: x + 24, y: y - 198 }, { x: x + 46, y: y - 198 }, { x: x + 42, y: y - 188 }, { x: x + 28, y: y - 188 }], '#f4e1a1', { color: INK, width: 1.6, amp: 0.4 });
  },
  sign({ x, y, text }) {
    Sketch.limb(sc, [{ x, y }, { x, y: y - 110 }], 3, '#5d636b', { amp: 0.3 });
    const pts = [];
    for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + (i * Math.PI) / 4; pts.push({ x: x + Math.cos(a) * 20, y: y - 128 + Math.sin(a) * 20 }); }
    Sketch.shape(sc, pts, '#d64545', { color: INK, width: 2, amp: 0.5 });
    sc.font = `11px ${MARKER}`;
    sc.fillStyle = '#fff';
    sc.textAlign = 'center';
    sc.textBaseline = 'middle';
    sc.fillText(text, x, y - 127);
  },
  building({ x, w, h, y, color }) {
    const box = [{ x, y }, { x, y: y - h }, { x: x + w, y: y - h }, { x: x + w, y }];
    Sketch.fill(sc, box, color, 2);
    Sketch.stroke(sc, box, { color: PENCIL, width: 2, amp: 1.2 });
    for (let wy = y - h + 24; wy < y - 50; wy += 46) {
      for (let wx = x + 18; wx < x + w - 34; wx += 42) {
        Sketch.shape(sc, [{ x: wx, y: wy }, { x: wx + 22, y: wy }, { x: wx + 22, y: wy + 28 }, { x: wx, y: wy + 28 }], 'rgba(150, 175, 190, 0.55)', { color: PENCIL, width: 1.2, amp: 0.6, passes: 1 });
      }
    }
  },
  schoolBuilding({ x, w, h, y }) {
    SCENERY.building({ x, w, h, y, color: '#c98a6b' });
    for (let by = y - h + 12; by < y; by += 14) Sketch.stroke(sc, [{ x, y: by }, { x: x + w, y: by }], { color: 'rgba(120, 60, 40, 0.18)', width: 1, amp: 0.6, passes: 1, maxLen: 80 });
    markerText(sc, 'SHRED HIGH', x + w / 2, y - h + 20, 22, '#f4c542', -0.02);
  },
  flag({ x, y }) {
    Sketch.limb(sc, [{ x, y }, { x, y: y - 240 }], 2.5, '#9aa0a6', { amp: 0.3 });
    Sketch.shape(sc, [{ x, y: y - 238 }, { x: x + 60, y: y - 228 }, { x: x + 56, y: y - 200 }, { x, y: y - 206 }], '#2f80ed', { color: INK, width: 1.8, amp: 1 });
  },
  hoop({ x, y }) {
    Sketch.limb(sc, [{ x, y }, { x, y: y - 200 }, { x: x - 30, y: y - 200 }], 5, '#5d636b', { amp: 0.4 });
    Sketch.shape(sc, [{ x: x - 34, y: y - 236 }, { x: x - 30, y: y - 236 }, { x: x - 30, y: y - 176 }, { x: x - 34, y: y - 176 }], '#f4f1ea', { color: INK, width: 2, amp: 0.4 });
    Sketch.stroke(sc, [{ x: x - 32, y: y - 190 }, { x: x - 62, y: y - 190 }], { color: '#e2553f', width: 3, amp: 0.4, passes: 1 });
    for (let k = 0; k < 4; k++) Sketch.stroke(sc, [{ x: x - 34 - k * 8, y: y - 190 }, { x: x - 40 - k * 5, y: y - 168 }], thin('rgba(60,60,60,0.6)', 1));
  },
  bridge({ x0, x1, y }) {
    const deck = [{ x: x0 - 400, y }, { x: x1 + 400, y }, { x: x1 + 400, y: y + 50 }, { x: x0 - 400, y: y + 50 }];
    for (let x = x0 + 60; x < x1; x += 420) {
      const pillar = [{ x, y: y + 50 }, { x: x + 70, y: y + 50 }, { x: x + 80, y: 20 }, { x: x - 10, y: 20 }];
      Sketch.shape(sc, pillar, '#b6aea0', { color: PENCIL, width: 2, amp: 1 });
    }
    Sketch.shape(sc, deck, '#a59d90', { color: INK, width: 2.4, amp: 1.2, maxLen: 60 });
    Sketch.stroke(sc, [{ x: x0 - 400, y: y - 14 }, { x: x1 + 400, y: y - 14 }], { color: PENCIL, width: 2, amp: 1, maxLen: 60 });
  },
  dome({ x, y }) {
    const pts = [];
    for (let i = 0; i <= 12; i++) { const a = Math.PI + (Math.PI * i) / 12; pts.push({ x: x + Math.cos(a) * 90, y: y + Math.sin(a) * 70 }); }
    Sketch.shape(sc, pts, 'rgba(210, 225, 235, 0.8)', { color: PENCIL, width: 2, amp: 1 });
    for (const k of [-0.5, 0, 0.5]) Sketch.stroke(sc, [{ x: x + k * 90, y }, { x: x + k * 60, y: y - 68 + Math.abs(k) * 20 }], thin(PENCIL, 1.2));
    Sketch.limb(sc, [{ x: x + 40, y: y - 60 }, { x: x + 40, y: y - 120 }], 2, '#9aa0a6', { amp: 0.3 });
    Sketch.circle(sc, x + 40, y - 124, 5, '#ef5a4a', { width: 1.4 });
  },
  palm({ x, y, s = 1 }) {
    // a curvy trunk with rings, and a burst of fronds on top
    const trunk = [{ x, y }, { x: x + 10 * s, y: y - 70 * s }, { x: x + 28 * s, y: y - 150 * s }];
    Sketch.limb(sc, trunk, 10 * s, '#a7804f', { amp: 0.4 });
    for (let k = 0.15; k < 0.95; k += 0.12) {
      const p = { x: x + 28 * s * k * k + 2, y: y - 150 * s * k };
      Sketch.stroke(sc, [{ x: p.x - 5 * s, y: p.y }, { x: p.x + 5 * s, y: p.y - 2 }], thin('rgba(90, 60, 30, 0.5)', 1.2));
    }
    const top = { x: x + 28 * s, y: y - 150 * s };
    for (const [ang, len] of [[-2.9, 70], [-2.3, 62], [-1.6, 50], [-0.9, 62], [-0.25, 72], [0.4, 54], [-3.5, 54]]) {
      const tip = { x: top.x + Math.cos(ang) * len * s, y: top.y + Math.sin(ang) * len * s + 26 * s };
      const mid = { x: (top.x + tip.x) / 2, y: Math.min(top.y, tip.y) - 12 * s };
      Sketch.limb(sc, [top, mid, tip], 9 * s, '#5fa84a', { amp: 0.5 });
    }
    for (const dx of [-5, 4]) Sketch.circle(sc, top.x + dx * s, top.y + 6 * s, 5 * s, '#7a5230', { width: 1.4 });
  },
  umbrella({ x, y, color }) {
    Sketch.limb(sc, [{ x, y }, { x: x + 6, y: y - 92 }], 3, '#e8e2d2', { amp: 0.3 });
    const top = { x: x + 6, y: y - 92 }, pts = [];
    for (let i = 0; i <= 10; i++) { const a = Math.PI + (Math.PI * i) / 10; pts.push({ x: top.x + Math.cos(a) * 58, y: top.y + 6 + Math.sin(a) * 26 }); }
    Sketch.shape(sc, pts, color, { color: INK, width: 2, amp: 0.6 });
    for (const k of [-0.5, 0, 0.5]) Sketch.stroke(sc, [{ x: top.x, y: top.y - 20 }, { x: top.x + k * 58, y: top.y + 6 }], thin('rgba(255,255,255,0.8)', 3));
    Sketch.shape(sc, [{ x: x - 40, y: y - 2 }, { x: x + 30, y: y - 2 }, { x: x + 34, y: y - 10 }, { x: x - 36, y: y - 10 }], '#f4f1ea', thin(PENCIL, 1.2)); // a towel
  },
  lifeguard({ x, y }) {
    // a lifeguard tower on stilts
    for (const dx of [-30, 30]) Sketch.stroke(sc, [{ x: x + dx, y }, { x: x + dx * 0.6, y: y - 120 }], { color: '#8a6240', width: 4, amp: 0.4 });
    Sketch.stroke(sc, [{ x: x - 26, y: y - 50 }, { x: x + 26, y: y - 90 }], thin('#8a6240', 3));
    const hut = [{ x: x - 34, y: y - 120 }, { x: x + 34, y: y - 120 }, { x: x + 34, y: y - 176 }, { x: x - 34, y: y - 176 }];
    Sketch.shape(sc, hut, '#f4f1ea', { color: INK, width: 2.2, amp: 0.6 });
    Sketch.shape(sc, [{ x: x - 44, y: y - 176 }, { x: x + 44, y: y - 176 }, { x: x, y: y - 204 }], '#e2553f', { color: INK, width: 2.2, amp: 0.6 });
    Sketch.stroke(sc, [{ x: x - 34, y: y - 150 }, { x: x + 34, y: y - 150 }], thin('#e2553f', 4));
    markerText(sc, '+', x, y - 134, 18, '#e2553f');
  },
  graffiti({ x, y, color }) {
    for (let i = 0; i < 5; i++) {
      Sketch.circle(sc, x + i * 26 - 50, y + Math.sin(i * 1.7) * 10, 18, color, { color: INK, width: 2, amp: 2 });
    }
    markerText(sc, 'SHRED', x + 2, y + 2, 26, '#f4f1ea', -0.12);
  },

  // ---- on top of the ground
  facade({ x0, x1, top, bottom, style }) {
    const school = style === 'school';
    const box = [{ x: x0, y: top }, { x: x1, y: top }, { x: x1, y: bottom }, { x: x0, y: bottom }];
    Sketch.shape(sc, box, school ? '#c98a6b' : '#9fb3b8', { color: INK, width: 3, amp: 1 });
    for (let wy = top + 30; wy < bottom - 150; wy += 70) {
      Sketch.shape(sc, [{ x: x0 + 40, y: wy }, { x: x1 - 30, y: wy }, { x: x1 - 30, y: wy + 40 }, { x: x0 + 40, y: wy + 40 }], '#dce9ee', { color: INK, width: 1.6, amp: 0.6 });
    }
    // a door at street level
    Sketch.shape(sc, [{ x: x1 - 70, y: bottom }, { x: x1 - 70, y: bottom - 90 }, { x: x1 - 20, y: bottom - 90 }, { x: x1 - 20, y: bottom }], school ? '#2f80ed' : '#6b4b3a', { color: INK, width: 2, amp: 0.6 });
    if (!school) Sketch.shape(sc, [{ x: x0 + 10, y: bottom - 130 }, { x: x1, y: bottom - 130 }, { x: x1 + 12, y: bottom - 112 }, { x: x0 + 10, y: bottom - 112 }], '#e2553f', { color: INK, width: 2, amp: 0.8 });
  },
  car({ x, y, color, shape }) {
    // the body matches the shape you ride on, lifted a little off the road on its wheels
    const body = shape.map(([dx, dy]) => ({ x: x + dx, y: y + Math.min(dy, -10) }));
    body.unshift({ x, y: y - 10 });
    Sketch.shape(sc, body, color, { color: INK, width: 2.6, amp: 0.8 });
    Sketch.shape(sc, [{ x: x + 104, y: y - 61 }, { x: x + 172, y: y - 63 }, { x: x + 196, y: y - 45 }, { x: x + 94, y: y - 43 }], '#cfe3ee', { color: INK, width: 1.8, amp: 0.5 });
    for (const wx of [48, 200]) {
      Sketch.circle(sc, x + wx, y - 13, 13, '#2b2b2b', { width: 2 });
      Sketch.circle(sc, x + wx, y - 13, 5, '#9aa0a6', { width: 1.2 });
    }
  },
  court({ x0, x1, y }) {
    const paint = { color: 'rgba(244, 241, 234, 0.85)', width: 3, amp: 0.6, passes: 1, maxLen: 60 };
    Sketch.stroke(sc, [{ x: x0, y: y + 4 }, { x: x1, y: y + 4 }], paint);
    Sketch.stroke(sc, [{ x: (x0 + x1) / 2, y: y + 2 }, { x: (x0 + x1) / 2, y: y + 40 }], paint);
    Sketch.stroke(sc, [{ x: x1 - 160, y: y + 4 }, { x: x1 - 190, y: y + 36 }, { x: x1 - 60, y: y + 36 }], paint);
  },
  scaffold({ x0, x1, top }) {
    // wooden beams and cross braces under the roll-in tower
    const beam = { color: 'rgba(110, 76, 44, 0.6)', width: 3, amp: 0.8, passes: 1 };
    const bottom = 0;
    for (let x = x0 + 40; x < x1 - 40; x += 120) {
      const y0 = Math.max(top, T_ACTIVE.groundYAt(x, top - 10) + 6);
      Sketch.stroke(sc, [{ x, y: y0 }, { x, y: bottom }], beam);
      if (x + 120 < x1 - 40) {
        const y1 = Math.max(top, T_ACTIVE.groundYAt(x + 120, top - 10) + 6);
        Sketch.stroke(sc, [{ x, y: y0 }, { x: x + 120, y: bottom }], { ...beam, width: 2 });
        Sketch.stroke(sc, [{ x, y: bottom }, { x: x + 120, y: y1 }], { ...beam, width: 2 });
      }
    }
  },
  paint({ x, y, text }) { markerText(sc, text, x, y, 30, '#f4c542', -0.08); },
  water({ x0, x1, y, bottom }) {
    // the pool under the jump, rippling
    const t = performance.now() / 1000, top = [];
    for (let x = x0; x <= x1; x += 12) top.push({ x, y: y + Math.sin(x / 26 + t * 2.4) * 2.5 });
    sc.fillStyle = 'rgba(70, 150, 210, 0.72)';
    sc.beginPath();
    sc.moveTo(x0, bottom);
    for (const p of top) sc.lineTo(p.x, p.y);
    sc.lineTo(x1, bottom);
    sc.closePath();
    sc.fill();
    Sketch.stroke(sc, top, { color: 'rgba(240, 250, 255, 0.9)', width: 2.4, amp: 0.3, passes: 1, maxLen: 0 });
    for (let k = 0; k < 3; k++) {
      const wx = x0 + ((k * 61 + t * 30) % (x1 - x0 - 30)) + 10, wy = y + 22 + k * 22;
      Sketch.stroke(sc, [{ x: wx, y: wy }, { x: wx + 9, y: wy - 3 }, { x: wx + 18, y: wy }], thin('rgba(240, 250, 255, 0.6)', 1.6));
    }
  },
};

let sc = null, T_ACTIVE = null; // the canvas and terrain the drawers above are working with

function drawScenery(context, items, view, seedBase, terrain) {
  sc = context;
  T_ACTIVE = terrain;
  items.forEach((item, i) => {
    const x0 = item.x0 ?? item.x - 400, x1 = item.x1 ?? item.x + (item.w || 0) + 400;
    if (x1 < view.x0 - 200 || x0 > view.x1 + 200) return;
    Sketch.seedFor(seedBase + i);
    SCENERY[item.type](item);
  });
}

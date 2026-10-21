// The ground you ride on: one connected chain of line segments, left to right.
// Each segment's "up" normal points out of the ground, so the skater always knows
// which side is solid. Each end of the chain is either a quarter pipe coping (you fly
// straight up out of it) or a wall (you bonk into it).
// Rails and ledges are separate grindable lines (which can have kinks) that you can roll
// underneath or past.

function makeSeg(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
  const tx = dx / len, ty = dy / len;
  return { a, b, len, tx, ty, nx: ty, ny: -tx, ang: Math.atan2(ty, tx) }; // n = up, out of the ground
}

class Terrain {
  constructor({ points, spawn, ends = { start: 'coping', end: 'coping' }, rails = [], decor = [],
                back = [], front = [], theme = {}, name = '', decks = 160, gravity = null }) {
    this.name = name;
    this.gravity = gravity;
    this.points = points;
    this.segs = [];
    let s = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const seg = makeSeg(points[i], points[i + 1]);
      Object.assign(seg, { i, s0: s, s1: s + seg.len, curved: !!(points[i].curved && points[i + 1].curved) });
      this.segs.push(seg);
      s += seg.len;
    }
    this.length = s;
    this.start = points[0];
    this.end = points[points.length - 1];
    this.ends = ends;
    this.copings = [];
    if (ends.start === 'coping') this.copings.push({ end: -1, pt: this.start, seg: 0 });
    if (ends.end === 'coping') this.copings.push({ end: 1, pt: this.end, seg: this.segs.length - 1 });

    // grindables: each rail is a polyline; its segments know their neighbours so a grind
    // carries on around a kink
    this.railLines = rails;
    this.rails = [];
    for (const r of rails) {
      let prev = null;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const seg = Object.assign(makeSeg(r.pts[i], r.pts[i + 1]), { kind: r.kind, prev, next: null });
        if (prev) prev.next = seg;
        this.rails.push(seg);
        prev = seg;
      }
    }

    this.spawnS = this.closest(spawn.x, spawn.y).s;
    this.decor = decor;  // extra outline strokes (box edges and such)
    this.back = back;    // scenery drawn behind the ground
    this.front = front;  // details drawn on top of it
    this.theme = theme;

    // Outline (with a deck past each end) and the solid shape for filling.
    const lowest = Math.max(...points.map(p => p.y)), highest = Math.min(...points.map(p => p.y));
    const bottom = lowest + 1400;
    this.outline = [{ x: this.start.x - decks, y: this.start.y }, ...points, { x: this.end.x + decks, y: this.end.y }];
    this.fillPoly = [{ x: this.start.x - decks, y: bottom }, ...this.outline, { x: this.end.x + decks, y: bottom }];
    // everything a tumbling body can hit: the chain plus the decks past the ends
    this.solid = [makeSeg(this.outline[0], this.start), ...this.segs, makeSeg(this.end, this.outline[this.outline.length - 1])];
    this.minX = this.outline[0].x;
    this.maxX = this.outline[this.outline.length - 1].x;
    this.lowest = lowest;
    this.highest = highest;

    // Pencil hatching inside the ground.
    const H = bottom - highest + 100;
    this.hatch = [];
    for (let x = this.minX - H; x < this.maxX; x += 15) this.hatch.push([{ x, y: bottom }, { x: x + H, y: bottom - H }]);
  }

  segIndexAt(s) {
    for (const seg of this.segs) if (s <= seg.s1) return seg.i;
    return this.segs.length - 1;
  }

  pointOnSeg(seg, u) {
    return { x: seg.a.x + (seg.b.x - seg.a.x) * u, y: seg.a.y + (seg.b.y - seg.a.y) * u };
  }

  closest(x, y) {
    let best = null;
    for (const seg of this.segs) {
      const u = Math.max(0, Math.min(1, ((x - seg.a.x) * seg.tx + (y - seg.a.y) * seg.ty) / seg.len));
      const p = this.pointOnSeg(seg, u);
      const d = Math.hypot(p.x - x, p.y - y);
      if (!best || d < best.d) best = { d, seg, u, s: seg.s0 + u * seg.len };
    }
    return best;
  }

  // The nearest walkable spot to s that's flat enough to stand on.
  flatNear(s) {
    for (let off = 0; off < 1500; off += 10) {
      for (const cand of [s + off, s - off]) {
        if (cand < 0 || cand > this.length) continue;
        const seg = this.segs[this.segIndexAt(cand)];
        if (Math.abs(seg.ang) < 0.2 && seg.len > 30) return cand;
      }
    }
    return this.spawnS;
  }

  // The ground directly under a point (used to level the board out in the air).
  surfaceBelow(x, y) {
    let best = null, bestY = Infinity;
    for (const seg of this.segs) {
      const minX = Math.min(seg.a.x, seg.b.x), maxX = Math.max(seg.a.x, seg.b.x);
      if (maxX - minX < 1e-6 || x < minX || x > maxX) continue;
      const sy = seg.a.y + (seg.b.y - seg.a.y) * ((x - seg.a.x) / (seg.b.x - seg.a.x));
      if (sy >= y - 4 && sy < bestY) { bestY = sy; best = seg; }
    }
    return best;
  }

  // Height of the ground under x (the highest surface not above `fromY`).
  groundYAt(x, fromY = -1e9) {
    const seg = this.surfaceBelow(x, fromY);
    return seg ? seg.a.y + (seg.b.y - seg.a.y) * ((x - seg.a.x) / (seg.b.x - seg.a.x)) : this.lowest;
  }

  // First segment the path p0 -> p1 passes through from above, if any.
  sweep(p0, p1, segs = this.segs) {
    let hit = null;
    for (const seg of segs) {
      const d0 = (p0.x - seg.a.x) * seg.nx + (p0.y - seg.a.y) * seg.ny;
      const d1 = (p1.x - seg.a.x) * seg.nx + (p1.y - seg.a.y) * seg.ny;
      if (d0 < -0.5 || d1 >= 0) continue;
      // Starting right on the line (e.g. just launched off this segment's end): judge by where
      // we end up, so rolling off a lip doesn't count as landing back on it.
      const t = d0 < 0.5 ? 0 : d0 / (d0 - d1);
      const q = d0 < 0.5 ? p1 : { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t };
      const u = ((q.x - seg.a.x) * seg.tx + (q.y - seg.a.y) * seg.ty) / seg.len;
      if (u < -0.001 || u > 1.001) continue;
      const uc = Math.max(0, Math.min(1, u));
      if (!hit || t < hit.t) hit = { t, seg, u: uc, p: this.pointOnSeg(seg, uc) };
    }
    return hit;
  }

  sweepRails(p0, p1) { return this.sweep(p0, p1, this.rails); }

  // How far a ball of radius r at (x, y) is sunk into the ground, and which way is out.
  // Used for loose things: a ragdolling skater and a flying board.
  contact(x, y, r) {
    let best = null;
    const keep = (nx, ny, depth) => { if (!best || depth > best.depth) best = { nx, ny, depth }; };
    for (const seg of this.solid) {
      const u = ((x - seg.a.x) * seg.tx + (y - seg.a.y) * seg.ty) / seg.len;
      const d = (x - seg.a.x) * seg.nx + (y - seg.a.y) * seg.ny;
      if (u >= 0 && u <= 1) {
        if (d < r && d > -r * 3) keep(seg.nx, seg.ny, r - d);
      } else if (d >= 0) {
        // round off outside corners (like a ramp lip)
        const q = u < 0 ? seg.a : seg.b, dx = x - q.x, dy = y - q.y, dist = Math.hypot(dx, dy);
        if (dist < r && dist > 1e-6) keep(dx / dist, dy / dist, r - dist);
      }
    }
    if (x < this.minX + r) keep(1, 0, this.minX + r - x);
    if (x > this.maxX - r) keep(-1, 0, x - (this.maxX - r));
    return best;
  }
}

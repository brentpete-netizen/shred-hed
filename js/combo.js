// Tony Hawk-style combos. Every trick in a combo adds points, and the total is multiplied by
// how many tricks you chained. Manuals and grinds keep a combo alive between airs.
// The combo only counts once you land clean; bail and it's gone.

const REPEAT_FACTOR = [1, 0.75, 0.5, 0.25, 0.1]; // doing the same trick again in one combo is worth less

class Combo {
  constructor() { this.entries = []; }

  get active() { return this.entries.length > 0; }

  // perSec: extra points per second for things you hold (grinds, manuals, grab tweaks).
  add(name, base, perSec = 0) {
    const e = { name, base, perSec, time: 0, sloppy: false };
    this.entries.push(e);
    return e;
  }

  remove(e) {
    const i = this.entries.indexOf(e);
    if (i >= 0) this.entries.splice(i, 1);
  }

  reset() { this.entries = []; }

  names() { return this.entries.map(e => e.name); }

  result() {
    const seen = {};
    const parts = this.entries.map(e => {
      const n = (seen[e.name] = (seen[e.name] || 0) + 1);
      const pts = (e.base + e.perSec * e.time) * (e.sloppy ? 0.5 : 1) * REPEAT_FACTOR[Math.min(n - 1, REPEAT_FACTOR.length - 1)];
      return { name: e.name, pts: Math.round(pts) };
    });
    const points = parts.reduce((sum, p) => sum + p.pts, 0);
    return { parts, points, mult: parts.length, score: points * parts.length };
  }
}

const fmtScore = n => Math.round(n).toLocaleString('en-US');

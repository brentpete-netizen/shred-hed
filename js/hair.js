// Hair: lots of styles, in any color. Each style has up to two layers: `back` goes behind the head
// (long hair, ponytails, dreads) and `top` goes over it. Under a hat only the back layer and a
// little hair at the sides show; with no hat (or headphones, a halo, a crown) you see it all.
//
// Shapes are written in head space: P(u, f) is u up from the middle of the head and f toward the
// face, and arc() angles are measured from straight up (0) toward the face (+) or the back (-).

const HAIR_NATURAL = '#3a2416';
const HAIR_LINE = { color: INK, width: 1.9, amp: 0.35, maxLen: 7 };

// hats you can see the whole hairstyle around (the rest cover the top of your head)
const HAIR_SHOWS = new Set(['none', 'headphones', 'halo', 'crown']);
// the old head items that are a hairstyle themselves
const HAIR_FROM_HEAD = { hair: 'spiky', mohawk: 'mohawk', afro: 'afro', ponytail: 'ponytail' };

function hairSpace(h, up, F) {
  const R = HEAD_R;
  const P = (u, f) => ({ x: h.x + up.x * u + F.x * f, y: h.y + up.y * u + F.y * f });
  const arc = (cu, cf, r, a0, a1, k = 10) =>
    Array.from({ length: k + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / k; return P(cu + Math.cos(a) * r, cf + Math.sin(a) * r); });
  // a curved band of hair hugging the head, from angle a0 to a1
  const band = (r0, r1, a0, a1) => arc(0, 0, r1, a0, a1).concat(arc(0, 0, r0, a1, a0));
  // a point moved u up and f toward the face
  const off = (p, u, f) => ({ x: p.x + up.x * u + F.x * f, y: p.y + up.y * u + F.y * f });
  return { R, P, arc, band, off };
}

const HAIR_DRAW = {
  short: { top: (ctx, s, c) => Sketch.shape(ctx, s.band(s.R - 1.5, s.R + 1.8, -2.0, 0.95), c, HAIR_LINE) },
  buzz: { top: (ctx, s, c) => Sketch.shape(ctx, s.band(s.R - 0.6, s.R + 0.7, -1.9, 1.0), c, { ...HAIR_LINE, width: 1.2 }) },
  bald: {},
  spiky: {
    top: (ctx, s, c) => {
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const a = -1.95 + (3.2 * i) / 10 - (i % 2 ? 0.16 : 0); // tips lean back
        const r = i % 2 ? s.R + 6.5 : s.R + 1;
        pts.push(s.P(Math.cos(a) * r, Math.sin(a) * r));
      }
      Sketch.shape(ctx, pts.concat(s.arc(0, 0, s.R - 2, 1.25, -1.95)), c, HAIR_LINE);
    },
  },
  mohawk: {
    top: (ctx, s, c) => {
      Sketch.shape(ctx, s.band(s.R - 0.6, s.R + 0.6, -1.9, 1.0), c, { ...HAIR_LINE, width: 1.1 }); // shaved sides
      const fin = [];
      for (let i = 0; i <= 8; i++) {
        const a = -0.7 + (1.4 * i) / 8, r = i % 2 ? s.R + 4 : s.R + 12 - Math.abs(i - 4);
        fin.push(s.P(Math.cos(a) * r, Math.sin(a) * r));
      }
      Sketch.shape(ctx, fin.concat(s.arc(0, 0, s.R - 2, 0.7, -0.7, 4)), c, HAIR_LINE);
    },
  },
  liberty: {
    top: (ctx, s, c) => {
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const a = -1.35 + (2.4 * i) / 10, r = i % 2 ? s.R + 17 - Math.abs(i - 5) : s.R + 0.5;
        pts.push(s.P(Math.cos(a) * r, Math.sin(a) * r));
      }
      Sketch.shape(ctx, pts.concat(s.arc(0, 0, s.R - 2, 1.05, -1.35)), c, HAIR_LINE);
    },
  },
  afro: {
    back: (ctx, s, c) => { const o = s.P(7, -4); Sketch.circle(ctx, o.x, o.y, s.R + 6, c, { width: 2.2, amp: 1.4 }); },
    top: (ctx, s, c) => Sketch.shape(ctx, s.arc(2.5, 0, s.R + 1.5, -1.32, 1.32), c, HAIR_LINE),
  },
  curly: {
    top: (ctx, s, c) => {
      Sketch.shape(ctx, s.band(s.R - 1.5, s.R + 1, -1.95, 1.0), c, HAIR_LINE);
      for (let a = -1.9; a <= 1.05; a += 0.33) {
        const p = s.P(Math.cos(a) * (s.R + 1.2), Math.sin(a) * (s.R + 1.2));
        Sketch.circle(ctx, p.x, p.y, 3.3, c, { width: 1.5, amp: 0.3 });
      }
    },
  },
  long: {
    back: (ctx, s, c) => Sketch.shape(ctx, [s.P(5, -s.R - 1.5), s.P(-6, -s.R - 3), s.P(-24, -s.R - 2), s.P(-26, -s.R + 5), s.P(-10, -3), s.P(2, -1)], c, HAIR_LINE),
    top: (ctx, s, c) => Sketch.shape(ctx, s.band(s.R - 1.5, s.R + 2, -2.05, 1.05), c, HAIR_LINE),
  },
  ponytail: {
    back: (ctx, s, c) => Sketch.limb(ctx, [s.P(3, -s.R + 2), s.P(-3, -s.R - 7), s.P(-13, -s.R - 9)], 6, c, { amp: 0.5 }),
    top: (ctx, s, c) => Sketch.shape(ctx, s.band(s.R - 1.2, s.R + 1.3, -1.95, 1.0), c, HAIR_LINE),
  },
  pigtails: {
    back: (ctx, s, c) => {
      Sketch.limb(ctx, [s.P(3, -s.R + 3), s.P(-4, -s.R - 8), s.P(-12, -s.R - 9)], 5, c, { amp: 0.5 });
      Sketch.limb(ctx, [s.P(-1, -s.R + 1), s.P(-8, -s.R - 5), s.P(-17, -s.R - 4)], 5, c, { amp: 0.5 });
    },
    top: (ctx, s, c) => Sketch.shape(ctx, s.band(s.R - 1.2, s.R + 1.3, -1.95, 1.0), c, HAIR_LINE),
  },
  bun: {
    top: (ctx, s, c) => {
      Sketch.shape(ctx, s.band(s.R - 1.2, s.R + 1.3, -1.95, 1.0), c, HAIR_LINE);
      const b = s.P(s.R + 2.5, -4);
      Sketch.circle(ctx, b.x, b.y, 4.6, c, { width: 1.8, amp: 0.4 });
    },
  },
  spacebuns: {
    top: (ctx, s, c) => {
      for (const f of [-6, 5]) { const b = s.P(s.R + 0.5, f); Sketch.circle(ctx, b.x, b.y, 4.3, c, { width: 1.8, amp: 0.4 }); }
      Sketch.shape(ctx, s.band(s.R - 1.2, s.R + 1.3, -1.95, 1.0), c, HAIR_LINE);
    },
  },
  mullet: {
    back: (ctx, s, c) => Sketch.shape(ctx, [s.P(2, -s.R), s.P(-13, -s.R - 2.5), s.P(-17, -s.R + 4), s.P(-5, -2)], c, HAIR_LINE),
    top: (ctx, s, c) => Sketch.shape(ctx, s.band(s.R - 1.5, s.R + 1.6, -1.9, 0.95), c, HAIR_LINE),
  },
  bowl: {
    top: (ctx, s, c) => Sketch.shape(ctx, [...s.arc(0, 0, s.R + 2, -2.05, 1.5), s.P(1.2, s.R - 0.6), s.P(2.2, 0), s.P(-2.5, -s.R + 0.5)], c, HAIR_LINE),
  },
  flattop: {
    top: (ctx, s, c) => Sketch.shape(ctx, [s.P(-1, -s.R - 1), s.P(s.R + 5, -s.R + 0.5), s.P(s.R + 5.5, s.R - 3), s.P(4, s.R - 0.3), s.P(2, 0)], c, HAIR_LINE),
  },
  swoop: {
    top: (ctx, s, c) => {
      Sketch.shape(ctx, s.band(s.R - 1.5, s.R + 1.8, -1.95, 0.9), c, HAIR_LINE);
      Sketch.shape(ctx, [s.P(s.R + 1.5, -3), s.P(s.R + 3.5, 5), s.P(5, s.R + 2), s.P(1, s.R + 1), s.P(5, s.R - 3), s.P(s.R - 2, 1)], c, HAIR_LINE);
    },
  },
  emo: {
    top: (ctx, s, c) => {
      Sketch.shape(ctx, s.band(s.R - 1.5, s.R + 1.8, -2.0, 0.9), c, HAIR_LINE);
      // a long fringe swept down over one eye
      Sketch.shape(ctx, [s.P(s.R + 1.5, -4), s.P(s.R, s.R - 2), s.P(-4, s.R + 1.2), s.P(-1.5, s.R - 3.5), s.P(5, 0)], c, HAIR_LINE);
    },
  },
  dreads: {
    back: (ctx, s, c) => {
      for (let i = 0; i < 6; i++) {
        const a = -2.35 + i * 0.28, root = s.P(Math.cos(a) * s.R, Math.sin(a) * s.R);
        const len = 17 + (i % 3) * 3;
        Sketch.limb(ctx, [root, s.off(root, -len / 2, -1.5), s.off(root, -len, -3 + i * 0.6)], 3.4, c, { amp: 0.6 });
      }
    },
    top: (ctx, s, c) => Sketch.shape(ctx, s.band(s.R - 1.2, s.R + 1.8, -2.0, 1.0), c, HAIR_LINE),
  },
  shaggy: {
    top: (ctx, s, c) => {
      const jag = [];
      for (let i = 0; i <= 12; i++) { const a = 1.15 - (3.3 * i) / 12, r = i % 2 ? s.R - 3.5 : s.R - 0.5; jag.push(s.P(Math.cos(a) * r, Math.sin(a) * r)); }
      Sketch.shape(ctx, s.arc(0, 0, s.R + 2.2, -2.15, 1.15).concat(jag), c, HAIR_LINE);
    },
  },
  slick: {
    top: (ctx, s, c) => {
      Sketch.shape(ctx, s.band(s.R - 1, s.R + 1.6, -2.0, 0.85), c, HAIR_LINE);
      for (const r of [s.R - 0.1, s.R + 0.8]) Sketch.stroke(ctx, s.arc(0, 0, r, 0.75, -1.7, 6), thin('rgba(255, 255, 255, 0.35)', 0.8));
    },
  },
};

// What hair to draw for the current outfit: its style, its color, and whether a hat hides the top.
function hairLook(hat) {
  const legacy = HAIR_FROM_HEAD[hat.type];
  const style = legacy || Outfit.get('hair').style;
  const pick = Outfit.get('hairColor');
  let color = pick.color || (legacy ? hat.color : hat.hair) || HAIR_NATURAL;
  if (pick.rainbow) color = `hsl(${(performance.now() / 12) % 360}, 85%, 55%)`;
  return { style, color, full: !!legacy || HAIR_SHOWS.has(hat.type) };
}

function drawHairBack(ctx, h, up, F, look) {
  const d = HAIR_DRAW[look.style];
  if (d?.back) d.back(ctx, hairSpace(h, up, F), look.color);
}

function drawHairTop(ctx, h, up, F, look) {
  const d = HAIR_DRAW[look.style], s = hairSpace(h, up, F);
  if (look.full) { if (d?.top) d.top(ctx, s, look.color); }
  else if (look.style !== 'bald') {
    // under a hat: a little hair at the back of your neck, and a sideburn in front of your ear
    Sketch.shape(ctx, s.band(s.R - 1.5, s.R + 0.8, -1.95, -1.35), look.color, { ...HAIR_LINE, width: 1.3 });
    if (look.style !== 'buzz') Sketch.shape(ctx, [s.P(2.5, -0.2), s.P(2.5, 1.6), s.P(-3, 1.1), s.P(-3, 0)], look.color, { ...HAIR_LINE, width: 1 });
  }
}

// The Shred Hed logo: a hand-drawn cracked skull. Drawn on the menu next to the title.
// (index.html has a simple SVG version of the same skull for the browser tab.)

const SKULL_BONE = '#f1e8cf', SKULL_SHADE = '#d9cba8';

// The skull's outline in its own units: about 100 wide, from y -52 (top) to 52 (chin).
const SKULL_OUTLINE = (() => {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI + (Math.PI * i) / 12; // the dome, left to right over the top
    pts.push([Math.cos(a) * 46, -6 + Math.sin(a) * 46]);
  }
  return pts.concat([[45, 8], [37, 20], [31, 25], [29, 40], [18, 50], [0, 53], [-18, 50], [-29, 40], [-31, 25], [-37, 20], [-45, 8]]);
})();

// Where the crack runs: from a chip out of the top of the head down into the right eye,
// with a couple of smaller cracks branching off.
const SKULL_CRACKS = [
  [[5, -51], [1, -40], [10, -31], [4, -21], [12, -11], [14, -5]],
  [[10, -31], [20, -35], [27, -30]],
  [[4, -21], [-5, -17]],
  [[-43, -18], [-33, -15], [-28, -22]],
];

// cx, cy: the middle of the skull; s: how tall it is in pixels; rot: tilt in radians
function drawSkullLogo(ctx, cx, cy, s, rot = 0) {
  const u = s / 106;
  const P = ([x, y]) => ({ x: x * u, y: y * u });
  const ink = (w, amp = 0.8) => ({ color: INK, width: w * u, amp, maxLen: 10 * u });
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  Sketch.seedFor(700);

  // a shadow first, so the logo stands off the paper
  ctx.globalAlpha = 0.18;
  Sketch.shape(ctx, SKULL_OUTLINE.map(([x, y]) => P([x + 5, y + 6])), INK, { ...ink(1), amp: 1.2 });
  ctx.globalAlpha = 1;

  Sketch.shape(ctx, SKULL_OUTLINE.map(P), SKULL_BONE, ink(4.2, 1.2));
  // shading down the left side of the head
  Sketch.shape(ctx, [[-44, -14], [-36, -36], [-30, -10], [-33, 14], [-40, 12]].map(P), SKULL_SHADE, { color: SKULL_SHADE, width: 1, amp: 0.6 });

  // eye sockets, frowning a little, and the nose
  const socket = (ex, tilt) => Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * TAU;
    let y = Math.sin(a) * 11;
    if (y < 0) y += tilt * Math.cos(a) * 4; // slant the brow
    return [ex + Math.cos(a) * 13, 4 + y];
  });
  Sketch.shape(ctx, socket(-18, 1).map(P), INK, ink(2.2, 0.6));
  Sketch.shape(ctx, socket(18, -1).map(P), INK, ink(2.2, 0.6));
  Sketch.shape(ctx, [[0, 15], [6, 28], [0, 25], [-6, 28]].map(P), INK, ink(1.6, 0.4));

  // teeth
  Sketch.stroke(ctx, [[-21, 37], [21, 37]].map(P), ink(2.6, 0.5));
  for (const x of [-14, -5, 5, 14]) Sketch.stroke(ctx, [[x, 31], [x * 1.05, 45]].map(P), ink(2.2, 0.4));

  // the chip and the cracks
  Sketch.shape(ctx, [[0, -52], [11, -51], [5, -43]].map(P), INK, ink(1.4, 0.3));
  SKULL_CRACKS.forEach((line, i) => Sketch.stroke(ctx, line.map(P), ink(i ? 2.2 : 3.2, 0.5)));
  ctx.restore();
}

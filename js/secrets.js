// Shh.

const Secrets = (() => {
  const mix = s => [...s].reduce((h, c) => (h * 131 + c.charCodeAt(0) * 7 + 11) % 998244353, 5381);
  // [length, check, what it switches]
  const LOCKS = [
    [3, 132148774, () => Progress.toggleSecret()],
    [6, 858370977, () => Progress.toggleCheat('bighead', 'BIG HEAD MODE')],
    [4, 232430412, () => Progress.toggleCheat('lowgrav', 'MOON GRAVITY')],
    [4, 341506799, () => Progress.toggleCheat('halfspeed', 'SLOW-MO')],
    [7, 631033509, () => Progress.toggleCheat('trail', 'COLOR TRAIL')],
    [4, 356882152, () => Progress.toggleCheat('mini', 'MINI SKATER')],
    [4, 358316207, () => Progress.unlockNameTag()],
  ];
  let recent = '';
  const api = { listening: false };

  addEventListener('keydown', e => {
    // (not while you're typing a name, or your name could switch things on)
    if (!api.listening || e.repeat || e.key.length !== 1 || Input.textCapture) return;
    recent = (recent + e.key.toLowerCase()).slice(-10);
    for (const [len, check, run] of LOCKS) {
      if (recent.length >= len && mix(recent.slice(-len)) === check) {
        recent = '';
        run();
        break;
      }
    }
  });
  return api;
})();

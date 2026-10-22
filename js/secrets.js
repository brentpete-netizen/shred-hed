// Shh.

const Secrets = (() => {
  const mix = s => [...s].reduce((h, c) => (h * 131 + c.charCodeAt(0) * 7 + 11) % 998244353, 5381);
  const LOCK = 132148774;
  let recent = '';
  const api = { listening: false };

  addEventListener('keydown', e => {
    if (!api.listening || e.repeat || e.key.length !== 1) return;
    recent = (recent + e.key.toLowerCase()).slice(-3);
    if (mix(recent) === LOCK) {
      recent = '';
      Progress.toggleSecret();
    }
  });
  return api;
})();

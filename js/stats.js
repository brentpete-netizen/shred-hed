// Lifetime stats, saved in the browser.

const Stats = (() => {
  const KEY = 'shredHed.stats';
  const data = {
    landed: 0, bails: 0, bestAir: 0, topSpeed: 0, distance: 0, timeSkated: 0, vertAirs: 0,
    hardest: '', hardestPts: 0, bestCombo: 0, bestComboText: '', totalScore: 0, tricks: {},
    maps: {}, // per map: best combo and best session score
    skateWins: 0, skateLosses: 0, // Game of S.K.A.T.E. vs the CPU
  };
  try { Object.assign(data, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* nothing saved yet */ }

  const map = id => (data.maps[id] = data.maps[id] || { bestCombo: 0, bestScore: 0 });

  // Another copy of the stats (another tab's, or from a save code) folded in: the best of both.
  const COUNTS = ['landed', 'bails', 'bestAir', 'topSpeed', 'distance', 'timeSkated', 'vertAirs', 'totalScore', 'skateWins', 'skateLosses'];
  function mergeIn(b) {
    if (!b || typeof b !== 'object') return;
    for (const k of COUNTS) data[k] = Math.max(+data[k] || 0, +b[k] || 0);
    if ((+b.hardestPts || 0) > data.hardestPts) { data.hardestPts = +b.hardestPts; data.hardest = String(b.hardest || ''); }
    if ((+b.bestCombo || 0) > data.bestCombo) { data.bestCombo = +b.bestCombo; data.bestComboText = String(b.bestComboText || ''); }
    for (const [t, n] of Object.entries(b.tricks || {})) data.tricks[t] = Math.max(data.tricks[t] || 0, +n || 0);
    for (const [id, m] of Object.entries(b.maps || {})) {
      const mine = map(id);
      mine.bestCombo = Math.max(mine.bestCombo, +m?.bestCombo || 0);
      mine.bestScore = Math.max(mine.bestScore, +m?.bestScore || 0);
    }
  }

  let dirty = false, sinceSave = 0;
  const save = () => {
    if (!dirty) return;
    try {
      mergeIn(JSON.parse(localStorage.getItem(KEY))); // what another tab saved since
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* storage blocked */ }
    dirty = false;
    sinceSave = 0;
  };
  addEventListener('beforeunload', save);
  // phones close pages without warning: save whenever the game goes into the background
  addEventListener('pagehide', save);
  addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && save());

  return {
    data,
    save,
    map,
    // Skater messages: landings, banked combos and bails. sessionScore is the running score on this map.
    onMessage(m, mapId, sessionScore = 0) {
      if (m.type === 'combo' && mapId) {
        const best = map(mapId);
        best.bestCombo = Math.max(best.bestCombo, m.score);
        best.bestScore = Math.max(best.bestScore, sessionScore);
      }
      if (m.type === 'land') {
        if (m.airTime > data.bestAir) data.bestAir = m.airTime;
      } else if (m.type === 'combo') {
        for (const p of m.parts) {
          data.landed++;
          data.tricks[p.name] = (data.tricks[p.name] || 0) + 1;
          if (p.pts > data.hardestPts) { data.hardestPts = p.pts; data.hardest = p.name; }
        }
        data.totalScore += m.score;
        if (m.score > data.bestCombo) {
          data.bestCombo = m.score;
          data.bestComboText = m.parts.map(p => p.name).join(' + ');
        }
      } else if (m.type === 'bail') {
        data.bails++;
      } else return;
      dirty = true;
    },
    // Called every frame while skating.
    track(sk, dt) {
      data.timeSkated += dt;
      const speed = sk.state === 'ground' ? Math.abs(sk.v) : sk.state === 'bail' ? 0 : Math.hypot(sk.vel.x, sk.vel.y);
      if (speed > data.topSpeed) data.topSpeed = speed;
      if (sk.state === 'ground') data.distance += Math.abs(sk.v) * dt;
      if (sk.vert && !sk.countedVert) { data.vertAirs++; sk.countedVert = true; }
      if (!sk.vert) sk.countedVert = false;
      dirty = true;
      if ((sinceSave += dt) > 5) save();
    },
    skateResult(won) {
      if (won) data.skateWins++; else data.skateLosses++;
      dirty = true;
      save();
    },
    merge(b) { mergeIn(b); dirty = true; save(); },
    favorites(n) {
      return Object.entries(data.tricks).sort((a, b) => b[1] - a[1]).slice(0, n);
    },
  };
})();

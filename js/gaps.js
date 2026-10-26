// Gaps: named jumps on each map, like the Five Stair or the Car Hop. Pop from the right place and
// come down in the right place (any trick, or none) and the gap goes into your combo for bonus
// points. Each map's gaps are yours to find: the first time you get one it's saved, with Shred
// Bucks, and the Stats screen counts how many you've found. A couple work anywhere: a lot of hang
// time, or a big drop.

const GAP_MAPS = ['park', 'street', 'school', 'mega', 'boardwalk']; // the ones with gaps to collect
const GAP_BUCKS = 15;

const Gaps = (() => {
  let T = null, mapId = null, from = null, was = 'ground';

  function load(id, terrain) {
    T = terrain;
    mapId = id;
    from = null;
    was = 'ground';
  }

  // After each physics step (Free Skate and the 2-minute run).
  function update(sk, dt) {
    if (!T) return;
    const st = sk.state;
    if (st === 'air' && was !== 'air' && was !== 'bail') from = { x: sk.pos.x, y: sk.pos.y, t: 0, dir: Math.sign(sk.vel.x) || sk.facing };
    if (st === 'air' && from) from.t += dt;
    if ((st === 'ground' || st === 'grind') && was === 'air' && from) landed(sk);
    if (st === 'bail') from = null;
    was = st;
  }

  function landed(sk) {
    const f = from, x = sk.pos.x, drop = sk.pos.y - f.y;
    from = null;
    const named = f.dir > 0 && (T.gaps || []).find(g => f.x >= g.from[0] && f.x <= g.from[1] && x >= g.to[0] && x <= g.to[1] && drop >= g.drop);
    if (named) award(sk, named.name, named.pts, true);
    if (f.t >= 1.2) award(sk, 'Hang Time', Math.round(200 + (f.t - 1.2) * 400), false);
    else if (drop >= 220 && !named) award(sk, 'Big Drop', 250, false);
  }

  function award(sk, name, pts, collect) {
    sk.addEntry(name, pts);
    const first = collect && GAP_MAPS.includes(mapId) && Progress.findGap(mapId, name);
    sk.out.push({ type: 'gap', name, pts, first });
  }

  // How many gaps there are to find on the maps that have them (built once, when it's asked).
  let total = null;
  const count = () => (total ??= MAPS.filter(m => GAP_MAPS.includes(m.id)).reduce((n, m) => n + (m.build().gaps || []).length, 0));

  return { load, update, count };
})();

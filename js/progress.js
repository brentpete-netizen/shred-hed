// Rep and levels. You earn Rep for landing combos, for each trick you land for the first time,
// and for playing Game of S.K.A.T.E. Every level unlocks something: maps, outfits, boards and
// bonus Park Builder pieces. Progress is saved in the browser.

// Rep needed to reach each level (index 0 = level 1).
const REP_LEVELS = [0, 50, 150, 300, 500, 750, 1050, 1400, 1800, 2250, 2750, 3300, 3900];

// What each level unlocks. Anything not listed here is open from the start.
//   map: a map id · piece / prop / end: a Park Builder part · anything else: a closet item by name
const UNLOCKS = {
  2:  [['map', 'street'], ['board', 'Black & Gold'], ['hat', 'Helmet'], ['hat', 'Cowboy Hat'], ['top', 'Hawaiian Shirt'], ['board', 'Pizza'], ['extra', 'Backpack']],
  3:  [['hat', 'Bucket Hat'], ['top', 'Team Jersey'], ['piece', 'halfpipe'], ['hat', 'Afro'], ['pants', 'Ripped Jeans'], ['shoes', 'Neon Kicks'], ['extra', 'Mustache']],
  4:  [['map', 'school'], ['shoes', 'Red High-Tops'], ['top', 'Black Hoodie'], ['top', 'Varsity Jacket'], ['pants', 'Camo Pants'], ['board', 'Lightning']],
  5:  [['board', 'Ocean'], ['pants', 'Khaki Shorts'], ['prop', 'kinkRail'], ['hat', 'Top Hat'], ['top', 'Tuxedo'], ['extra', 'Scarf']],
  6:  [['hat', 'Headphones'], ['top', 'Red Flannel'], ['piece', 'bankLedge'], ['skin', 'Zombie'], ['hat', 'Propeller Beanie'], ['top', 'Camo Hoodie'], ['pants', 'Plaid Pants'], ['board', 'Rainbow']],
  7:  [['map', 'mega'], ['board', 'Toxic'], ['top', 'Tie-Dye Tee'], ['hat', 'Viking Helmet'], ['shoes', 'Light-Ups'], ['extra', 'Gold Chain'], ['skin', 'Ice']],
  8:  [['hat', 'Spiky Hair'], ['shoes', 'Green High-Tops'], ['piece', 'diyQuarter'], ['pants', 'Red Pants'], ['hat', 'Halo'], ['board', 'Neon Grid'], ['extra', 'Hero Cape']],
  9:  [['end', 'rollin'], ['board', 'Checker'], ['hat', 'Mohawk'], ['board', 'Camo'], ['shoes', 'Combat Boots']],
  10: [['skin', 'Robot'], ['top', 'Rainbow Hoodie'], ['pants', 'Tan Cargos']],
  11: [['hat', 'Gold Crown'], ['shoes', 'Gold Kicks']],
  12: [['skin', 'Alien'], ['board', 'Galaxy']],
  13: [['board', 'Gold'], ['skin', 'Gold Statue']],
};

const UNLOCK_LEVEL = {};
for (const [lvl, items] of Object.entries(UNLOCKS)) for (const [type, key] of items) UNLOCK_LEVEL[`${type}:${key}`] = +lvl;

const TOTAL_LETTERS = 20; // S-K-A-T-E on each of the four maps

const MAP_NAMES = { street: 'Street map', school: 'School Yard map', mega: 'Mega Ramp map' };
const BUILDER_NAMES = { halfpipe: 'Halfpipe piece', kinkRail: 'Kink Rail piece', bankLedge: 'Bank-to-Ledge piece', diyQuarter: 'DIY Quarter piece', rollin: 'Roll-in tower start' };
const unlockLabel = ([type, key]) => MAP_NAMES[key] || BUILDER_NAMES[key] || key;

const Progress = (() => {
  const KEY = 'shredHed.progress';
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* nothing saved */ }
  const data = saved || { rep: 0, owned: [] };
  const events = [];   // for the HUD: rep gained, new tricks, level ups

  const store = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage blocked */ } };

  const levelFor = rep => {
    let lvl = 1;
    while (lvl < REP_LEVELS.length && rep >= REP_LEVELS[lvl]) lvl++;
    return lvl;
  };

  const api = {
    data,
    events,
    get level() { return levelFor(data.rep); },
    get maxLevel() { return REP_LEVELS.length; },
    // progress toward the next level, 0..1
    get toNext() {
      const lvl = api.level;
      if (lvl >= REP_LEVELS.length) return 1;
      return (data.rep - REP_LEVELS[lvl - 1]) / (REP_LEVELS[lvl] - REP_LEVELS[lvl - 1]);
    },
    nextAt() { return REP_LEVELS[api.level] ?? null; },

    // The level something unlocks at (0 if it's always open).
    lockLevel(type, key) { return UNLOCK_LEVEL[`${type}:${key}`] || 0; },
    isUnlocked(type, key) {
      if (data.everything) return true;
      const secretItem = (OUTFIT_OPTIONS[type] || []).find(o => o.name === key && o.secret);
      if (secretItem) return api.secretOwned(secretItem);
      const need = api.lockLevel(type, key);
      return !need || api.level >= need || data.owned.includes(`${type}:${key}`);
    },
    get everything() { return !!data.everything; },
    // on, or back off again
    toggleSecret() {
      data.everything = !data.everything;
      store();
      events.push({ type: 'secret', on: data.everything });
    },

    // little extras that change how the game plays or looks
    cheat(name) { return !!(data.cheats && data.cheats[name]); },
    toggleCheat(name, label) {
      data.cheats = data.cheats || {};
      data.cheats[name] = !data.cheats[name];
      store();
      events.push({ type: 'banner', title: `${label} ${data.cheats[name] ? 'ON' : 'OFF'}`, lines: [data.cheats[name] ? 'type it again to turn it off' : 'back to normal'] });
    },

    // golden letters hidden around the maps
    hasLetter(mapId, i) { return !!(data.letters && data.letters[mapId] && data.letters[mapId].includes(i)); },
    lettersFound() { return Object.values(data.letters || {}).reduce((n, l) => n + l.length, 0); },
    get allLetters() { return api.lettersFound() >= TOTAL_LETTERS; },
    collectLetter(mapId, i, letter) {
      data.letters = data.letters || {};
      const list = (data.letters[mapId] = data.letters[mapId] || []);
      if (list.includes(i)) return;
      list.push(i);
      store();
      const found = api.lettersFound();
      events.push({ type: 'letter', letter, found, total: TOTAL_LETTERS });
      if (found === TOTAL_LETTERS) {
        events.push({ type: 'banner', title: 'ALL 20 LETTERS!', lines: ['secret skater unlocked: the Ghost', 'check the closet'] });
      }
    },

    // hidden spots you find by doing something special
    hasSpot(id) { return !!(data.spots && data.spots[id]) || !!data.everything; },
    findSpot(id, name) {
      data.spots = data.spots || {};
      const first = !data.spots[id];
      data.spots[id] = true;
      store();
      events.push({ type: 'banner', title: first ? 'SECRET SPOT FOUND!' : name.toUpperCase(), lines: [first ? `welcome to the ${name}` : 'you found it again'] });
    },

    // secret closet items (like the Ghost) only show up once you've earned them
    secretOwned(item) { return !item.secret || !!data.everything || (item.secret === 'letters' && api.allLetters); },

    add(amount, reason) {
      if (amount <= 0) return;
      const before = api.level;
      data.rep += amount;
      events.push({ type: 'rep', amount, reason });
      const after = api.level;
      for (let lvl = before + 1; lvl <= after; lvl++) {
        events.push({ type: 'level', level: lvl, unlocked: (UNLOCKS[lvl] || []).map(unlockLabel) });
      }
      store();
    },

    // Your own skating: combos are worth Rep, and so is every trick you land for the first time.
    onMessage(m) {
      if (m.type !== 'combo') return;
      for (const p of m.parts) {
        if (!Stats.data.tricks[p.name] && !api.seen.has(p.name)) {
          api.seen.add(p.name);
          events.push({ type: 'newTrick', name: p.name });
          api.add(10, 'new trick');
        }
      }
      if (m.score >= 100) api.add(clamp(Math.floor(m.score / 200), 1, 50), 'combo');
    },
    seen: new Set(),

    skateResult(won) { api.add(won ? 60 : 20, won ? 'S.K.A.T.E. win' : 'S.K.A.T.E.'); },
  };

  // First time with Rep: count what you've already done, and keep the outfit you're wearing.
  if (!saved) {
    const s = Stats.data;
    data.rep = Math.floor(s.totalScore / 200) + 10 * Object.keys(s.tricks).length + 60 * s.skateWins + 20 * s.skateLosses;
    for (const [cat] of OUTFIT_CATEGORIES) {
      const item = OUTFIT_OPTIONS[cat][Outfit.pick[cat]];
      if (item) data.owned.push(`${cat}:${item.name}`);
    }
    store();
  }
  return api;
})();

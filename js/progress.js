// Rep and levels. You earn Rep for landing combos, for each trick you land for the first time,
// and for playing Game of S.K.A.T.E. Every level unlocks something: maps, outfits, boards and
// bonus Park Builder pieces. Progress is saved in the browser.

// Rep needed to reach each level (index 0 = level 1), all the way to level 50. Each level takes a
// bit more than the last, levelling off at 650 more a level from level 14 on.
const MAX_LEVEL = 50;
const REP_LEVELS = [0];
for (let lvl = 2; lvl <= MAX_LEVEL; lvl++) REP_LEVELS.push(REP_LEVELS[lvl - 2] + Math.min(650, 50 * (lvl - 1)));

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
  50: [['skin', 'Skeleton']], // the top of the mountain
};
// the tough stuff and grip, spread over the levels
for (const [lvl, items] of Object.entries({
  2:  [['top', 'Skull Tee'], ['grip', 'Red'], ['cutout', 'Smiley'], ['pants', 'Black Cargos']],
  3:  [['hat', 'Black Beanie'], ['grip', 'Blue'], ['cutout', 'Heart'], ['extra', 'Band-Aid']],
  4:  [['top', 'Leather Jacket'], ['shoes', 'Black High-Tops'], ['grip', 'Purple'], ['cutout', 'Star']],
  5:  [['pants', 'Ripped Black Jeans'], ['hat', 'Black Snapback'], ['grip', 'Pink'], ['board', 'Black Flames']],
  6:  [['top', 'Flame Tee'], ['extra', 'Spiked Collar'], ['cutout', 'Lightning'], ['grip', 'Teal']],
  7:  [['top', 'Denim Vest'], ['pants', 'Chain Jeans'], ['board', 'Skull'], ['cutout', 'Diamond']],
  8:  [['shoes', 'Steel-Toe Boots'], ['hat', 'Skull Bandana'], ['extra', 'Eye Patch'], ['grip', 'Camo']],
  9:  [['top', 'Studded Jacket'], ['pants', 'Leather Pants'], ['cutout', 'Skull'], ['hat', 'Black Mohawk']],
  10: [['pants', 'Flame Pants'], ['shoes', 'Flame Kicks'], ['board', 'Crossbones'], ['top', 'Moto Jersey']],
  11: [['grip', 'Gold'], ['hat', 'Black Helmet']],
  12: [['grip', 'Galaxy'], ['top', 'Black Flannel']],
})) UNLOCKS[lvl].push(...items);
// hairstyles and bright hair colors (the everyday ones are open from the start)
for (const [lvl, items] of Object.entries({
  2:  [['hair', 'Mullet'], ['hairColor', 'Red']],
  3:  [['hair', 'Emo Fringe'], ['hairColor', 'Pink']],
  4:  [['hair', 'Man Bun'], ['hairColor', 'Blue']],
  5:  [['hair', 'Dreads'], ['hairColor', 'Purple']],
  6:  [['hair', 'Space Buns'], ['hairColor', 'Teal']],
  7:  [['hair', 'Flat Top'], ['hairColor', 'Green']],
  8:  [['hair', 'Liberty Spikes'], ['hairColor', 'Lime']],
  9:  [['hairColor', 'Orange']],
  12: [['hairColor', 'Rainbow']],
})) UNLOCKS[lvl].push(...items);
// combo trails: a new one nearly every level (Glow and Off are yours from the start)
['Ice', 'Fire', 'Toxic', 'Bubblegum', 'Lightning', 'Rainbow', 'Galaxy', 'Shadow', 'Gold']
  .forEach((name, i) => UNLOCKS[i < 8 ? i + 2 : 11].push(['trail', name]));

const UNLOCK_LEVEL = {};
for (const [lvl, items] of Object.entries(UNLOCKS)) for (const [type, key] of items) UNLOCK_LEVEL[`${type}:${key}`] = +lvl;

const TOTAL_LETTERS = 20; // S-K-A-T-E on each of the four maps

// Shred Bucks: money for the Skate Shop. You earn them skating, never from a cheat.
const BUCKS = {
  start: 50,                                                 // to get you going
  combo: score => score >= 400 ? Math.min(30, Math.floor(score / 400)) : 0,
  newTrick: 5, letter: 25, skateWin: 40, skateGame: 10,
  levelUp: lvl => 25 * lvl,
};
// cheats that make skating easier: no Rep or Shred Bucks while one's on
const EASY_CHEATS = ['lowgrav', 'halfspeed'];

const MAP_NAMES = { street: 'Street map', school: 'School Yard map', mega: 'Mega Ramp map' };
const BUILDER_NAMES = { halfpipe: 'Halfpipe piece', kinkRail: 'Kink Rail piece', bankLedge: 'Bank-to-Ledge piece', diyQuarter: 'DIY Quarter piece', rollin: 'Roll-in tower start' };
const unlockLabel = ([type, key]) => MAP_NAMES[key] || BUILDER_NAMES[key] || (type === 'trail' ? `${key} trail` : key);

// Two copies of your progress put together (another tab's, a backup, or a save code), keeping the
// best of each: the most Rep, everything you've ever owned or found. Shred Bucks are kept as how
// many you've ever earned and ever spent, which only go up, so nothing can be lost (or copied).
// Cheat switches stay as they are in `a`.
function mergeProgress(a, b) {
  if (!b || typeof b !== 'object') return a;
  a.rep = Math.max(+a.rep || 0, +b.rep || 0);
  a.bucksEarned = Math.max(+a.bucksEarned || 0, +b.bucksEarned || 0);
  a.bucksSpent = Math.max(+a.bucksSpent || 0, +b.bucksSpent || 0);
  for (const k of ['owned', 'bought']) a[k] = [...new Set([...(a[k] || []), ...(Array.isArray(b[k]) ? b[k] : [])])];
  a.letters = a.letters || {};
  for (const [m, list] of Object.entries(b.letters || {})) if (Array.isArray(list)) a.letters[m] = [...new Set([...(a.letters[m] || []), ...list])];
  a.spots = a.spots || {};
  for (const [id, found] of Object.entries(b.spots || {})) if (found) a.spots[id] = true;
  a.nameTag = !!(a.nameTag || b.nameTag);
  return a;
}

const Progress = (() => {
  const KEY = 'shredHed.progress', BACKUP = KEY + '.backup';
  const read = key => { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } };
  // the save, with its backup copy folded in (in case one of them got lost or broken)
  const main = read(KEY), backup = read(BACKUP);
  const saved = main || backup ? mergeProgress(main || { ...backup }, backup) : null;
  const data = saved || { rep: 0, owned: [] };
  const events = [];   // for the HUD: rep gained, new tricks, level ups

  // Save: first fold in anything another open tab saved since, so the two never undo each other.
  const store = () => {
    try {
      mergeProgress(data, read(KEY));
      const json = JSON.stringify(data);
      localStorage.setItem(KEY, json);
      localStorage.setItem(BACKUP, json);
    } catch (e) { /* storage blocked */ }
  };
  // another tab saved: keep up with it
  addEventListener('storage', e => { if (e.key === KEY && e.newValue) { try { mergeProgress(data, JSON.parse(e.newValue)); } catch (err) { /* broken */ } } });

  // An easy-mode cheat is on: nothing earned, and a heads-up the first time.
  let warned = false;
  const blocked = () => {
    if (!api.cheating) return false;
    if (!warned) {
      warned = true;
      events.push({ type: 'banner', title: 'CHEATS ON', lines: ['no Rep or Shred Bucks while they are', 'type the code again to turn it off'] });
    }
    return true;
  };

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
      const item = (OUTFIT_OPTIONS[type] || []).find(o => o.name === key);
      // you have to really get there: no cheat opens it (and once you have, it's yours for good)
      if (item?.earned) return levelFor(data.rep) >= item.earned || data.owned.includes(`${type}:${key}`);
      if (item?.shop) return api.owns(item);                       // only ever bought in the shop
      if (data.everything) return true;
      if (item?.secret) return api.secretOwned(item);
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
      warned = false;
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
      api.earn(BUCKS.letter, 'golden letter');
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
    secretOwned(item) {
      if (item.shop) return api.owns(item); // shop things don't show in the closet until they're yours
      return !item.secret || !!data.everything || (item.secret === 'letters' && api.allLetters) || (item.secret === 'tag' && !!data.nameTag);
    },
    // a secret cosmetic of its own: yours for good once you've found it
    unlockNameTag() {
      const had = data.nameTag;
      data.nameTag = true;
      store();
      events.push(had
        ? { type: 'banner', title: 'NAME TAG', lines: ['already yours', 'Closet → Extra'] }
        : { type: 'banner', title: 'SECRET COSMETIC!', lines: ['Hello My Name Is tag', 'Closet → Extra · N to write your name'] });
    },

    add(amount, reason) {
      if (amount <= 0 || blocked()) return;
      const before = api.level;
      data.rep += amount;
      events.push({ type: 'rep', amount, reason });
      const after = api.level;
      for (let lvl = before + 1; lvl <= after; lvl++) {
        events.push({ type: 'level', level: lvl, unlocked: (UNLOCKS[lvl] || []).map(unlockLabel) });
        api.earn(BUCKS.levelUp(lvl), 'level up');
      }
      keepUnlocks();
      store();
    },

    // Your own skating: combos are worth Rep and Shred Bucks, and so is every trick you land for
    // the first time.
    onMessage(m) {
      if (m.type !== 'combo' || blocked()) return;
      for (const p of m.parts) {
        if (!Stats.data.tricks[p.name] && !api.seen.has(p.name)) {
          api.seen.add(p.name);
          events.push({ type: 'newTrick', name: p.name });
          api.add(10, 'new trick');
          api.earn(BUCKS.newTrick, 'new trick');
        }
      }
      if (m.score >= 100) api.add(clamp(Math.floor(m.score / 200), 1, 50), 'combo');
      api.earn(BUCKS.combo(m.score), 'combo');
    },
    seen: new Set(),

    skateResult(won) {
      api.add(won ? 60 : 20, won ? 'S.K.A.T.E. win' : 'S.K.A.T.E.');
      api.earn(won ? BUCKS.skateWin : BUCKS.skateGame, 'S.K.A.T.E.');
    },
    // a game against a person (on this computer or online)
    skateGame() {
      api.add(20, 'S.K.A.T.E.');
      api.earn(BUCKS.skateGame, 'S.K.A.T.E.');
    },

    // ---------------------------------------------------------------- Shred Bucks and the shop
    get bucks() { return Math.max(0, data.bucksEarned - data.bucksSpent); },
    get cheating() { return EASY_CHEATS.some(c => api.cheat(c)); },
    earn(amount, reason) {
      if (amount <= 0 || blocked()) return;
      data.bucksEarned += amount;
      events.push({ type: 'bucks', amount, reason });
      store();
    },
    owns(item) { return data.bought.includes(`${item.cat}:${item.name}`); },
    // 'bought', 'owned' (already yours) or 'broke' (not enough Shred Bucks)
    buy(item, price = item.shop) {
      if (api.owns(item)) return 'owned';
      if (api.bucks < price) return 'broke';
      data.bucksSpent += price;
      data.bought.push(`${item.cat}:${item.name}`);
      store();
      return 'bought';
    },

    // ---------------------------------------------------------------- save codes
    // Everything about you (progress, outfits, stats) as one line of text, to keep somewhere safe or
    // to carry to another phone or computer. Loading one only ever adds: it never takes away.
    saveCode() {
      const body = JSON.stringify({ v: 1, progress: data, outfit: Outfit.pick, saves: Outfit.saves, stats: Stats.data });
      const b64 = btoa(unescape(encodeURIComponent(body)));
      return `SHRED-${b64}-${codeCheck(b64)}`;
    },
    // true if it worked
    loadCode(code) {
      const m = /^SHRED-([A-Za-z0-9+/=]+)-(\d+)$/.exec(String(code || '').replace(/\s+/g, ''));
      if (!m || +m[2] !== codeCheck(m[1])) return false;
      let got;
      try { got = JSON.parse(decodeURIComponent(escape(atob(m[1])))); } catch (e) { return false; }
      if (!got || got.v !== 1 || !got.progress) return false;
      mergeProgress(data, got.progress);
      keepUnlocks();
      store();
      Stats.merge(got.stats);
      if (got.outfit) Outfit.load(got.outfit, got.saves);
      return true;
    },
  };

  // Once you've unlocked something by levelling up, it's yours for good, whatever happens after.
  function keepUnlocks() {
    const lvl = levelFor(data.rep);
    for (const [at, items] of Object.entries(UNLOCKS)) {
      if (+at > lvl) continue;
      for (const [type, key] of items) if (!data.owned.includes(`${type}:${key}`)) data.owned.push(`${type}:${key}`);
    }
  }
  // a quick fingerprint, so a typo (or a fiddled-with code) doesn't load
  function codeCheck(s) { return [...s].reduce((h, c) => (h * 131 + c.charCodeAt(0) * 7 + 11) % 998244353, 77); }

  // First time with Rep: count what you've already done, and keep the outfit you're wearing.
  if (!saved) {
    const s = Stats.data;
    data.rep = Math.floor(s.totalScore / 200) + 10 * Object.keys(s.tricks).length + 60 * s.skateWins + 20 * s.skateLosses;
    for (const cat in OUTFIT_OPTIONS) {
      const item = OUTFIT_OPTIONS[cat][Outfit.pick[cat]];
      if (item) data.owned.push(`${cat}:${item.name}`);
    }
    store();
  }
  data.owned = data.owned || [];
  data.bought = data.bought || [];
  // Shred Bucks are kept as earned and spent. Saves from before kept just the balance.
  if (data.bucksEarned === undefined) {
    if (data.bucks !== undefined) {
      data.bucksSpent = data.bought.reduce((n, key) => n + (SHOP_ITEMS.find(i => `${i.cat}:${i.name}` === key)?.shop || 0), 0);
      data.bucksEarned = data.bucks + data.bucksSpent;
    } else {
      // first time with Shred Bucks: a starting stack, plus what your level-ups so far would have paid
      data.bucksEarned = BUCKS.start;
      for (let lvl = 2; lvl <= levelFor(data.rep); lvl++) data.bucksEarned += BUCKS.levelUp(lvl);
      data.bucksSpent = 0;
    }
    delete data.bucks;
  }
  keepUnlocks();
  store();
  // phones can close the game without warning: save whenever it goes into the background
  addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && store());
  return api;
})();

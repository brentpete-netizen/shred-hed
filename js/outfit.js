// Clothes and boards. Each category is a list of ready-made looks; the closet cycles through them.
// The choice is saved in the browser so your skater keeps their fit next time.
// Many items unlock as you level up (see progress.js). New items go at the end of each list so
// saved choices keep pointing at the same thing.

const OUTFIT_OPTIONS = {
  skin: [
    { name: 'Tone 1', color: '#f6d3b3' },
    { name: 'Tone 2', color: '#e8b48a' },
    { name: 'Tone 3', color: '#c98b5e' },
    { name: 'Tone 4', color: '#9a6440' },
    { name: 'Tone 5', color: '#6b4329' },
    { name: 'Zombie', color: '#9bc47a' },
    { name: 'Robot', color: '#b9c0c8' },
    { name: 'Alien', color: '#a593e6' },
    { name: 'Ice', color: '#bfe6f2' },
    { name: 'Gold Statue', color: '#e0b23c' },
    { name: 'Ghost', color: '#eef3f8', secret: 'letters' },
  ],
  hat: [
    { name: 'Backwards Cap', type: 'capBack', color: '#26262b', accent: '#e2553f' },
    { name: 'Red Beanie', type: 'beanie', color: '#d64545', accent: '#f4f1ea' },
    { name: 'Bucket Hat', type: 'bucket', color: '#f4c542', accent: '#26262b' },
    { name: 'Headphones', type: 'headphones', color: '#26262b', accent: '#7fd36b', hair: '#e8c06a' },
    { name: 'Spiky Hair', type: 'hair', color: '#4a2e1a' },
    { name: 'Helmet', type: 'helmet', color: '#2f80ed', accent: '#f4f1ea' },
    { name: 'Mohawk', type: 'mohawk', color: '#e2553f' },
    { name: 'Gold Crown', type: 'crown', color: '#e0b23c', accent: '#e2553f' },
    { name: 'Bandana', type: 'bandana', color: '#e2553f', accent: '#f4f1ea', hair: '#3a2416' },
    { name: 'Ponytail', type: 'ponytail', color: '#7a4a24' },
    { name: 'Cowboy Hat', type: 'cowboy', color: '#a8743f', accent: '#3a2416' },
    { name: 'Afro', type: 'afro', color: '#2e1d12' },
    { name: 'Top Hat', type: 'tophat', color: '#26262b', accent: '#e2553f' },
    { name: 'Propeller Beanie', type: 'propeller', color: '#2f80ed', accent: '#f4c542', stripe: '#e2553f' },
    { name: 'Viking Helmet', type: 'viking', color: '#9aa0a6', accent: '#f1e8cf' },
    { name: 'Halo', type: 'halo', color: '#e8c06a', accent: '#f4d35e' },
    { name: 'Golden Beanie', type: 'beanie', color: '#e0b23c', accent: '#fff4c2', secret: 'letters' },
    { name: 'Black Beanie', type: 'beanie', color: '#26262b', accent: '#3d3d44' },
    { name: 'Black Snapback', type: 'capBack', color: '#1c1c20', accent: '#e0b23c' },
    { name: 'Black Mohawk', type: 'mohawk', color: '#26262b' },
    { name: 'Skull Bandana', type: 'bandana', color: '#26262b', accent: '#f4f1ea', hair: '#26262b' },
    { name: 'Black Helmet', type: 'helmet', color: '#1c1c20', accent: '#e2553f' },
    { name: 'No Hat', type: 'none' }, // shows off your hair
  ],
  // hairstyles (drawn in hair.js); a hat hides the top of it
  hair: [
    { name: 'Short', style: 'short' },
    { name: 'Buzz Cut', style: 'buzz' },
    { name: 'Bald', style: 'bald' },
    { name: 'Spiky', style: 'spiky' },
    { name: 'Curly', style: 'curly' },
    { name: 'Afro', style: 'afro' },
    { name: 'Long', style: 'long' },
    { name: 'Ponytail', style: 'ponytail' },
    { name: 'Pigtails', style: 'pigtails' },
    { name: 'Bowl Cut', style: 'bowl' },
    { name: 'Side Swoop', style: 'swoop' },
    { name: 'Slicked Back', style: 'slick' },
    { name: 'Shaggy', style: 'shaggy' },
    { name: 'Mullet', style: 'mullet' },
    { name: 'Man Bun', style: 'bun' },
    { name: 'Space Buns', style: 'spacebuns' },
    { name: 'Emo Fringe', style: 'emo' },
    { name: 'Flat Top', style: 'flattop' },
    { name: 'Mohawk', style: 'mohawk' },
    { name: 'Dreads', style: 'dreads' },
    { name: 'Liberty Spikes', style: 'liberty' },
  ],
  hairColor: [
    { name: 'Natural', color: null }, // whatever color the look comes in
    { name: 'Black', color: '#1f1a17' },
    { name: 'Dark Brown', color: '#3a2416' },
    { name: 'Brown', color: '#6b4226' },
    { name: 'Auburn', color: '#8a3b1e' },
    { name: 'Ginger', color: '#d2691e' },
    { name: 'Strawberry', color: '#e8875a' },
    { name: 'Blonde', color: '#e8c06a' },
    { name: 'Platinum', color: '#f1e6c4' },
    { name: 'Grey', color: '#9a9a9a' },
    { name: 'White', color: '#f4f1ea' },
    { name: 'Red', color: '#d63a3a' },
    { name: 'Orange', color: '#ff8c2e' },
    { name: 'Pink', color: '#ff8fc4' },
    { name: 'Purple', color: '#8e5bd6' },
    { name: 'Blue', color: '#2f80ed' },
    { name: 'Teal', color: '#2fb5b0' },
    { name: 'Green', color: '#3fae4a' },
    { name: 'Lime', color: '#b6f23d' },
    { name: 'Rainbow', color: '#ff8fc4', rainbow: true },
  ],
  top: [
    { name: 'Purple Hoodie', type: 'hoodie', color: '#6c4bd1', shade: '#5639ad', accent: '#f4f1ea' },
    { name: 'Black Hoodie', type: 'hoodie', color: '#2e2e34', shade: '#222227', accent: '#e2553f' },
    { name: 'Red Flannel', type: 'flannel', color: '#c8463d', shade: '#a73930', accent: '#2a1e1e', under: '#f4f1ea' },
    { name: 'Graphic Tee', type: 'tee', color: '#f4f1ea', shade: '#d9d5cb', accent: '#e2553f' },
    { name: 'Team Jersey', type: 'jersey', color: '#2f80ed', shade: '#2468c4', accent: '#f4c542' },
    { name: 'Yellow Tee', type: 'tee', color: '#f4c542', shade: '#d9a92c', accent: '#3f5fa8' },
    { name: 'Tie-Dye Tee', type: 'tee', color: '#ff8fb8', shade: '#e57aa0', accent: '#7fd8e0', swirl: ['#7fd8e0', '#f4c542'] },
    { name: 'Rainbow Hoodie', type: 'hoodie', color: '#ff9f43', shade: '#e8862c', accent: '#6c4bd1', stripes: ['#e2553f', '#f4c542', '#7fd36b', '#2f80ed'] },
    { name: 'Striped Tee', type: 'tee', color: '#f4f1ea', shade: '#d9d5cb', accent: '#26262b', stripes: ['#26262b', '#26262b', '#26262b'] },
    { name: 'Tank Top', type: 'tank', color: '#7fd36b', shade: '#67b556', accent: '#26262b' },
    { name: 'Hawaiian Shirt', type: 'tee', color: '#2fb5b0', shade: '#259893', accent: '#f4c542', spots: ['#f4c542', '#ff8fb8', '#f4f1ea'] },
    { name: 'Varsity Jacket', type: 'varsity', color: '#c8463d', shade: '#a73930', accent: '#f4f1ea', sleeve: '#f4f1ea' },
    { name: 'Tuxedo', type: 'tux', color: '#26262b', shade: '#1c1c20', accent: '#e2553f', under: '#f4f1ea' },
    { name: 'Camo Hoodie', type: 'hoodie', color: '#7a8a4a', shade: '#66753d', accent: '#3d4a26', spots: ['#4e5a30', '#a39a6a', '#3d4a26'] },
    { name: 'Leather Jacket', type: 'leather', color: '#24242a', shade: '#1a1a1f', accent: '#c0c5cc', under: '#e9e6de' },
    { name: 'Studded Jacket', type: 'leather', color: '#24242a', shade: '#1a1a1f', accent: '#c0c5cc', under: '#c8463d', studs: true },
    { name: 'Skull Tee', type: 'tee', color: '#26262b', shade: '#1c1c20', accent: '#f4f1ea', logo: 'skull' },
    { name: 'Flame Tee', type: 'tee', color: '#26262b', shade: '#1c1c20', accent: '#e2553f', flames: ['#e2553f', '#f4c542'] },
    { name: 'Denim Vest', type: 'vest', color: '#4a6aa8', shade: '#3d5890', accent: '#c0c5cc', under: '#26262b' },
    { name: 'Black Flannel', type: 'flannel', color: '#3a3a40', shade: '#2c2c31', accent: '#111114', under: '#26262b' },
    { name: 'Moto Jersey', type: 'jersey', color: '#26262b', shade: '#1c1c20', accent: '#e2553f' },
  ],
  pants: [
    { name: 'Baggy Cargos', type: 'cargo', color: '#6b7a3a', shade: '#59662f' },
    { name: 'Blue Jeans', type: 'jeans', color: '#3f5fa8', shade: '#33508f' },
    { name: 'Black Jeans', type: 'jeans', color: '#2e2e34', shade: '#232328' },
    { name: 'Khaki Shorts', type: 'shorts', color: '#c9b27c', shade: '#ad9763', sock: '#f4f1ea' },
    { name: 'Tan Cargos', type: 'cargo', color: '#b89a6a', shade: '#9e8256' },
    { name: 'Red Pants', type: 'jeans', color: '#c8463d', shade: '#a73930' },
    { name: 'Grey Sweats', type: 'jeans', color: '#9aa0a6', shade: '#848a90', stripe: '#f4f1ea' },
    { name: 'Ripped Jeans', type: 'jeans', color: '#5a7bbf', shade: '#4a69a6', ripped: true },
    { name: 'Camo Pants', type: 'cargo', color: '#7a8a4a', shade: '#66753d', spots: ['#4e5a30', '#a39a6a'] },
    { name: 'Plaid Pants', type: 'jeans', color: '#c8463d', shade: '#a73930', plaid: '#26262b' },
    { name: 'Black Cargos', type: 'cargo', color: '#2e2e34', shade: '#232328' },
    { name: 'Ripped Black Jeans', type: 'jeans', color: '#2e2e34', shade: '#232328', ripped: true },
    { name: 'Leather Pants', type: 'jeans', color: '#1f1f23', shade: '#17171a', shine: '#5a5a64' },
    { name: 'Chain Jeans', type: 'jeans', color: '#3f5fa8', shade: '#33508f', chain: '#c0c5cc' },
    { name: 'Flame Pants', type: 'jeans', color: '#26262b', shade: '#1c1c20', flames: ['#e2553f', '#f4c542'] },
  ],
  shoes: [
    { name: 'White / Red', color: '#f4f1ea', sole: '#d8c9a3', accent: '#e2553f' },
    { name: 'Black / White', color: '#2b2b2b', sole: '#f4f1ea', accent: '#f4f1ea' },
    { name: 'Red High-Tops', color: '#c8463d', sole: '#f4f1ea', accent: '#f4f1ea', high: true },
    { name: 'Blue Skate Shoes', color: '#2f80ed', sole: '#f4f1ea', accent: '#26262b' },
    { name: 'Green High-Tops', color: '#5aa84a', sole: '#f4f1ea', accent: '#26262b', high: true },
    { name: 'Gold Kicks', color: '#e0b23c', sole: '#f4f1ea', accent: '#26262b', high: true },
    { name: 'Checker Slip-Ons', color: '#f4f1ea', sole: '#f4f1ea', accent: '#26262b', checker: true },
    { name: 'Neon Kicks', color: '#c6ff3d', sole: '#26262b', accent: '#ff3dbb' },
    { name: 'Light-Ups', color: '#26262b', sole: '#f4f1ea', accent: '#2f80ed', glow: ['#ff3dbb', '#3dd6ff', '#c6ff3d'] },
    { name: 'Combat Boots', color: '#5a3d24', sole: '#26262b', accent: '#26262b', high: true },
    { name: 'Black High-Tops', color: '#26262b', sole: '#f4f1ea', accent: '#e2553f', high: true },
    { name: 'Steel-Toe Boots', color: '#3a2a1c', sole: '#26262b', accent: '#9aa0a6', high: true, toecap: '#c0c5cc' },
    { name: 'Flame Kicks', color: '#26262b', sole: '#f4c542', accent: '#e2553f' },
  ],
  board: [
    { name: 'Flames', grip: '#2f2f33', graphic: '#e2553f', art: 'flame', accent: '#f4c542', wheel: '#f1e8cf' },
    { name: 'Classic Red', grip: '#3a3a3d', graphic: '#e2553f', art: 'band', accent: '#f4c542', wheel: '#f1e8cf' },
    { name: 'Black & Gold', grip: '#2f2f33', graphic: '#26262b', art: 'stripes', accent: '#e0b23c', wheel: '#e0b23c' },
    { name: 'Ocean', grip: '#3a3a3d', graphic: '#2f80ed', art: 'dots', accent: '#7fd8e0', wheel: '#f4f1ea' },
    { name: 'Toxic', grip: '#2f2f33', graphic: '#7a4fc2', art: 'flame', accent: '#7fd36b', wheel: '#7fd36b' },
    { name: 'Checker', grip: '#2f2f33', graphic: '#f4f1ea', art: 'checker', accent: '#26262b', wheel: '#f1e8cf' },
    { name: 'Galaxy', grip: '#2f2f33', graphic: '#2b1d4a', art: 'stars', accent: '#f4f1ea', wheel: '#a593e6' },
    { name: 'Gold', grip: '#4a3a10', graphic: '#e0b23c', art: 'band', accent: '#fff4c2', wheel: '#e0b23c' },
    { name: 'Natural Wood', grip: '#3a3a3d', graphic: '#d9aa6c', art: 'band', accent: '#a77a45', wheel: '#f1e8cf' },
    { name: 'Pizza', grip: '#2f2f33', graphic: '#f4c542', art: 'dots', accent: '#c8463d', wheel: '#f1e8cf' },
    { name: 'Lightning', grip: '#2f2f33', graphic: '#26262b', art: 'bolt', accent: '#f4d35e', wheel: '#f4d35e' },
    { name: 'Rainbow', grip: '#2f2f33', graphic: '#f4f1ea', art: 'rainbow', accent: '#e2553f', wheel: '#f4f1ea',
      artColors: ['#e2553f', '#ff9f43', '#f4c542', '#7fd36b', '#2f80ed', '#6c4bd1'] },
    { name: 'Neon Grid', grip: '#2f2f33', graphic: '#1c1c20', art: 'checker', accent: '#ff3dbb', wheel: '#3dd6ff',
      artColors: ['#ff3dbb', '#3dd6ff', '#c6ff3d'] },
    { name: 'Camo', grip: '#2f2f33', graphic: '#7a8a4a', art: 'dots', accent: '#4e5a30', wheel: '#a39a6a',
      artColors: ['#4e5a30', '#a39a6a', '#3d4a26'] },
    { name: 'Golden Letters', grip: '#4a3a10', graphic: '#26262b', art: 'checker', accent: '#e0b23c', wheel: '#e0b23c', secret: 'letters' },
    { name: 'Skull', grip: '#2f2f33', graphic: '#26262b', art: 'skull', accent: '#f4f1ea', wheel: '#f4f1ea',
      artColors: ['#f4f1ea', '#f4f1ea', '#f4f1ea', '#f4f1ea', '#26262b', '#26262b'] },
    { name: 'Crossbones', grip: '#2f2f33', graphic: '#c8463d', art: 'skull', accent: '#26262b', wheel: '#26262b',
      artColors: ['#26262b', '#26262b', '#26262b', '#26262b', '#c8463d', '#c8463d'] },
    { name: 'Black Flames', grip: '#2f2f33', graphic: '#1c1c20', art: 'flame', accent: '#e2553f', wheel: '#e2553f' },
  ],
  // accessories on top of everything else
  extra: [
    { name: 'None', type: 'none' },
    { name: 'Shades', type: 'shades', color: '#1c1c20' },
    { name: 'Backpack', type: 'backpack', color: '#2f80ed', accent: '#f4c542' },
    { name: 'Mustache', type: 'mustache', color: '#3a2416' },
    { name: 'Scarf', type: 'scarf', color: '#e2553f', accent: '#f4f1ea' },
    { name: 'Gold Chain', type: 'chain', color: '#e0b23c' },
    { name: 'Hero Cape', type: 'cape', color: '#d64545', accent: '#a73930' },
    { name: 'Spiked Collar', type: 'collar', color: '#26262b', accent: '#c0c5cc' },
    { name: 'Eye Patch', type: 'patch', color: '#1c1c20' },
    { name: 'Band-Aid', type: 'bandaid', color: '#e8c39a' },
    { name: 'Name Tag', type: 'nametag', color: '#d63a3a', secret: 'tag' }, // "HELLO my name is", with your name on it
  ],
  // which foot goes forward; goofy flicks flips and shove-its the other way round
  stance: [
    { name: 'Regular', goofy: false },
    { name: 'Goofy', goofy: true },
  ],
  // griptape on top of the board ("Board Default" keeps the board's own)
  grip: [
    { name: 'Board Default', color: null },
    { name: 'Black', color: '#2f2f33' },
    { name: 'Red', color: '#c8463d' },
    { name: 'Blue', color: '#2f80ed' },
    { name: 'Green', color: '#5aa84a' },
    { name: 'Purple', color: '#6c4bd1' },
    { name: 'Pink', color: '#ff8fb8' },
    { name: 'Orange', color: '#ff9f43' },
    { name: 'Yellow', color: '#f4c542' },
    { name: 'White', color: '#ece8de' },
    { name: 'Teal', color: '#2fb5b0' },
    { name: 'Camo', color: '#7a8a4a', speckle: ['#4e5a30', '#a39a6a'] },
    { name: 'Galaxy', color: '#2b1d4a', speckle: ['#f4f1ea', '#a593e6'] },
    { name: 'Gold', color: '#e0b23c', speckle: ['#fff4c2'] },
  ],
  // shapes cut out of the griptape so the wood shows through (see GRIP_CUTS in render.js)
  cutout: [
    { name: 'None', cut: null },
    { name: 'Stripe', cut: 'stripe' },
    { name: 'Center Line', cut: 'line' },
    { name: 'Two Bars', cut: 'bars' },
    { name: 'Smiley', cut: 'smiley' },
    { name: 'Heart', cut: 'heart' },
    { name: 'Star', cut: 'star' },
    { name: 'Lightning', cut: 'bolt' },
    { name: 'Cross', cut: 'cross' },
    { name: 'Diamond', cut: 'diamond' },
    { name: 'X', cut: 'x' },
    { name: 'Skull', cut: 'skull' },
  ],
  // the glowing trail you leave once you're two tricks into a combo (see trail.js)
  //   colors: outer glow first, white-hot core last · rainbow / flicker / zap / sparkle: extra effects
  trail: [
    { name: 'Glow', colors: ['#ffd84a', '#fff1a0', '#fffbe6'] },
    { name: 'Ice', colors: ['#5cc8ff', '#a8e8ff', '#f2fdff'] },
    { name: 'Fire', colors: ['#e2553f', '#ff8c2e', '#ffe680'], flicker: true },
    { name: 'Toxic', colors: ['#5fc232', '#a6f05c', '#efffc4'] },
    { name: 'Bubblegum', colors: ['#ff5fae', '#ff9fcf', '#fff0f7'] },
    { name: 'Lightning', colors: ['#3fa9ff', '#a8dcff', '#ffffff'], zap: true },
    { name: 'Rainbow', colors: ['#ffffff', '#ffffff', '#ffffff'], rainbow: true },
    { name: 'Galaxy', colors: ['#4b2fa8', '#9a7cff', '#efe8ff'], sparkle: '#ffffff' },
    { name: 'Shadow', colors: ['#1c1c20', '#3a3a44', '#6a6a78'] },
    { name: 'Gold', colors: ['#c8931c', '#f4c542', '#fff6d0'], sparkle: '#fffbe6' },
    { name: 'Off', off: true },
  ],
};

// 'sag' isn't a list of looks, it's a slider in the closet (see SAG_MAX).
const OUTFIT_CATEGORIES = [
  ['skin', 'Skin'], ['hat', 'Head'], ['hair', 'Hair'], ['hairColor', 'Hair Color'], ['top', 'Top'], ['pants', 'Pants'], ['sag', 'Sag'], ['shoes', 'Shoes'], ['board', 'Board'],
  ['grip', 'Grip'], ['cutout', 'Grip Cut'], ['trail', 'Trail'], ['extra', 'Extra'], ['stance', 'Stance'],
];

// How high or low you wear your pants: 0 = pulled way up, SAG_NORMAL = regular, SAG_MAX = boxers out.
const SAG_NORMAL = 3, SAG_MAX = 10;

// How your clothes sit on you: sliders on the closet's Fit screen. `normal` is how things come;
// `ends` label the two ends of the slider.
const FIT_SLIDERS = [
  { key: 'sag', label: 'Sag', min: 0, max: SAG_MAX, normal: SAG_NORMAL, ends: ['high', 'low'] },
  { key: 'hatTilt', label: 'Hat tilt', min: -3, max: 3, normal: 0, ends: ['back', 'forward'] },
  { key: 'hatHeight', label: 'Hat height', min: -2, max: 2, normal: 0, ends: ['pulled down', 'perched up'] },
  { key: 'shirtLen', label: 'Shirt length', min: -2, max: 2, normal: 0, ends: ['cropped', 'long'] },
  { key: 'sleeves', label: 'Sleeves', min: -2, max: 2, normal: 0, ends: ['rolled up', 'long'] },
  { key: 'pantsWidth', label: 'Pants width', min: -2, max: 2, normal: 0, ends: ['skinny', 'baggy'] },
  { key: 'cuffs', label: 'Pant legs', min: -2, max: 2, normal: 0, ends: ['stacked', 'rolled up'] },
];
const FIT_BY_KEY = Object.fromEntries(FIT_SLIDERS.map(f => [f.key, f]));

const OUTFIT_SAVE_SLOTS = 2;

// What's written on the name tag: plain characters, short enough to fit.
const TAG_NAME_MAX = 12;
const cleanTagName = s => String(s ?? '').replace(/[^\x20-\x7e]/g, '').slice(0, TAG_NAME_MAX);

const Outfit = (() => {
  const KEY = 'shredHed.outfit', SAVES_KEY = 'shredHed.outfitSaves';
  // Fills in anything missing and keeps every pick in range (lists can change between versions).
  const clean = saved => {
    const o = { skin: 1, hat: 0, top: 0, pants: 0, shoes: 0, board: 0, extra: 0, stance: 0, grip: 0, cutout: 0 };
    for (const f of FIT_SLIDERS) o[f.key] = f.normal;
    Object.assign(o, saved || {});
    for (const cat in OUTFIT_OPTIONS) {
      const n = OUTFIT_OPTIONS[cat].length, i = Math.round(+o[cat]) || 0;
      o[cat] = ((i % n) + n) % n;
    }
    for (const f of FIT_SLIDERS) {
      const v = Math.round(+o[f.key]);
      o[f.key] = Number.isFinite(v) ? Math.max(f.min, Math.min(f.max, v)) : f.normal;
    }
    o.tagName = cleanTagName(o.tagName);
    return o;
  };
  let stored = null;
  try { stored = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* no saved outfit */ }
  const pick = clean(stored);

  // outfits saved for later, one per slot (null = empty)
  let savedSlots = [];
  try { savedSlots = JSON.parse(localStorage.getItem(SAVES_KEY)) || []; } catch (e) { /* none saved */ }
  const saves = Array.from({ length: OUTFIT_SAVE_SLOTS }, (_, i) => (savedSlots[i] ? clean(savedSlots[i]) : null));

  return {
    pick,
    saves,
    saveTo(slot, outfit) {
      saves[slot] = clean(outfit);
      try { localStorage.setItem(SAVES_KEY, JSON.stringify(saves)); } catch (e) { /* storage blocked */ }
    },
    override: null, // while drawing someone else (player 2, the CPU, the closet preview), their picks
    get(cat) {
      const from = this.override && this.override[cat] !== undefined ? this.override : pick;
      return OUTFIT_OPTIONS[cat][from[cat]];
    },
    // a Fit slider's value; skaters who don't say how they wear things wear them normal
    fit(key) {
      return this.override ? this.override[key] ?? FIT_BY_KEY[key].normal : pick[key];
    },
    sag() { return this.fit('sag'); },
    tagName() { return (this.override ? this.override.tagName : pick.tagName) || ''; },
    set(cat, index) {
      pick[cat] = index;
      try { localStorage.setItem(KEY, JSON.stringify(pick)); } catch (e) { /* storage blocked */ }
    },
  };
})();

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
  ],
  // which foot goes forward; goofy flicks flips and shove-its the other way round
  stance: [
    { name: 'Regular', goofy: false },
    { name: 'Goofy', goofy: true },
  ],
};

const OUTFIT_CATEGORIES = [
  ['skin', 'Skin'], ['hat', 'Head'], ['top', 'Top'], ['pants', 'Pants'], ['shoes', 'Shoes'], ['board', 'Board'],
  ['extra', 'Extra'], ['stance', 'Stance'],
];

const Outfit = (() => {
  const KEY = 'shredHed.outfit';
  const pick = { skin: 1, hat: 0, top: 0, pants: 0, shoes: 0, board: 0, extra: 0, stance: 0 };
  try { Object.assign(pick, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* no saved outfit */ }
  for (const cat in pick) pick[cat] = ((pick[cat] % OUTFIT_OPTIONS[cat].length) + OUTFIT_OPTIONS[cat].length) % OUTFIT_OPTIONS[cat].length;

  return {
    pick,
    override: null, // while drawing someone else (player 2, the CPU, the closet preview), their picks
    get(cat) {
      const from = this.override && this.override[cat] !== undefined ? this.override : pick;
      return OUTFIT_OPTIONS[cat][from[cat]];
    },
    set(cat, index) {
      pick[cat] = index;
      try { localStorage.setItem(KEY, JSON.stringify(pick)); } catch (e) { /* storage blocked */ }
    },
  };
})();

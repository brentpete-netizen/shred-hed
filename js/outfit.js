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
  ],
  pants: [
    { name: 'Baggy Cargos', type: 'cargo', color: '#6b7a3a', shade: '#59662f' },
    { name: 'Blue Jeans', type: 'jeans', color: '#3f5fa8', shade: '#33508f' },
    { name: 'Black Jeans', type: 'jeans', color: '#2e2e34', shade: '#232328' },
    { name: 'Khaki Shorts', type: 'shorts', color: '#c9b27c', shade: '#ad9763', sock: '#f4f1ea' },
    { name: 'Tan Cargos', type: 'cargo', color: '#b89a6a', shade: '#9e8256' },
    { name: 'Red Pants', type: 'jeans', color: '#c8463d', shade: '#a73930' },
  ],
  shoes: [
    { name: 'White / Red', color: '#f4f1ea', sole: '#d8c9a3', accent: '#e2553f' },
    { name: 'Black / White', color: '#2b2b2b', sole: '#f4f1ea', accent: '#f4f1ea' },
    { name: 'Red High-Tops', color: '#c8463d', sole: '#f4f1ea', accent: '#f4f1ea', high: true },
    { name: 'Blue Skate Shoes', color: '#2f80ed', sole: '#f4f1ea', accent: '#26262b' },
    { name: 'Green High-Tops', color: '#5aa84a', sole: '#f4f1ea', accent: '#26262b', high: true },
    { name: 'Gold Kicks', color: '#e0b23c', sole: '#f4f1ea', accent: '#26262b', high: true },
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
  ],
  // which foot goes forward; goofy flicks flips and shove-its the other way round
  stance: [
    { name: 'Regular', goofy: false },
    { name: 'Goofy', goofy: true },
  ],
};

const OUTFIT_CATEGORIES = [
  ['skin', 'Skin'], ['hat', 'Head'], ['top', 'Top'], ['pants', 'Pants'], ['shoes', 'Shoes'], ['board', 'Board'], ['stance', 'Stance'],
];

const Outfit = (() => {
  const KEY = 'shredHed.outfit';
  const pick = { skin: 1, hat: 0, top: 0, pants: 0, shoes: 0, board: 0, stance: 0 };
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

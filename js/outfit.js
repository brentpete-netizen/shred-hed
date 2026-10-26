// Clothes and boards. Each category is a list of ready-made looks; the closet cycles through them.
// The choice is saved in the browser so your skater keeps their fit next time.
// Many items unlock as you level up (see progress.js). New items go at the end of each list so
// saved choices keep pointing at the same thing.
//   shop: a price in Shred Bucks. Only ever yours by buying it in the Skate Shop.
//   earned: a level you have to really reach (no cheat opens it), like the Skeleton.

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
    { name: 'Skeleton', color: '#efe8d2', bones: true, earned: 12 }, // a skull and bones, under your clothes
    { name: 'Chrome', color: '#d5dbe1', shop: 700 },
    { name: 'Tung Tung Tung Sahur', color: '#c28a52', wood: true, secret: 'tung' }, // a wooden log with a face, and his bat
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
    { name: 'Chrome Helmet', type: 'helmet', color: '#c9d1d9', accent: '#3dd6ff', shop: 250 },
    { name: 'Diamond Crown', type: 'crown', color: '#bfefff', accent: '#3dd6ff', shop: 600 },
    { name: 'Flame Snapback', type: 'capBack', color: '#e2553f', accent: '#f4c542', shop: 180 },
    { name: 'Neon Beanie', type: 'beanie', color: '#c6ff3d', accent: '#ff3dbb', shop: 160 },
    { name: 'Gold Bandana', type: 'bandana', color: '#1c1c20', accent: '#f4c542', hair: '#26262b', shop: 140 },
    { name: 'Galaxy Helmet', type: 'helmet', color: '#2b1d4a', accent: '#a593e6', shop: 300 },
    // Halloween: free in the shop until the end of October (keep it for good if you grab it)
    { name: 'Pumpkin Head', type: 'pumpkin', color: '#ff8c1a', shade: '#e06d0b', accent: '#5b8c2a', shop: 0, until: [2026, 10, 31] },
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
    { name: 'Lava Hoodie', type: 'hoodie', color: '#26262b', shade: '#1c1c20', accent: '#ff8c2e', flames: ['#ff5a1f', '#ffd23f'], shop: 350 },
    { name: 'Galaxy Hoodie', type: 'hoodie', color: '#2b1d4a', shade: '#22173b', accent: '#a593e6', spots: ['#f4f1ea', '#a593e6', '#ffd84a'], shop: 400 },
    { name: 'Shred Hed Pro Tee', type: 'tee', color: '#1c1c20', shade: '#141417', accent: '#f4c542', logo: 'skull', shop: 150 },
    { name: 'Gold Leather Jacket', type: 'leather', color: '#c8931c', shade: '#a67814', accent: '#fff4c2', under: '#26262b', studs: true, shop: 500 },
    { name: 'Neon Jersey', type: 'jersey', color: '#c6ff3d', shade: '#a8dd2c', accent: '#ff3dbb', shop: 250 },
    { name: 'Ice Hoodie', type: 'hoodie', color: '#bfe6f2', shade: '#a3d2e2', accent: '#3dd6ff', spots: ['#ffffff', '#3dd6ff'], shop: 320 },
    { name: 'Money Tee', type: 'tee', color: '#2e9e4f', shade: '#258540', accent: '#f4c542', spots: ['#f4c542', '#7fd36b'], shop: 220 },
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
    { name: 'Blue Flame Pants', type: 'jeans', color: '#1c1c20', shade: '#141417', flames: ['#3dd6ff', '#ffffff'], shop: 300 },
    { name: 'Galaxy Cargos', type: 'cargo', color: '#2b1d4a', shade: '#22173b', spots: ['#f4f1ea', '#a593e6'], shop: 300 },
    { name: 'Gold Chain Jeans', type: 'jeans', color: '#1f1f23', shade: '#17171a', chain: '#e0b23c', shop: 200 },
    { name: 'Neon Sweats', type: 'jeans', color: '#26262b', shade: '#1c1c20', stripe: '#c6ff3d', shop: 180 },
    { name: 'Ice Cargos', type: 'cargo', color: '#bfe6f2', shade: '#a3d2e2', shop: 240 },
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
    { name: 'Rocket Kicks', color: '#e2553f', sole: '#ffd23f', accent: '#26262b', glow: ['#ff5a1f', '#ffd23f', '#ff8c2e'], shop: 350 },
    { name: 'Diamond Kicks', color: '#bfefff', sole: '#3dd6ff', accent: '#ffffff', high: true, shop: 450 },
    { name: 'Neon Runners', color: '#ff3dbb', sole: '#c6ff3d', accent: '#26262b', glow: ['#ff3dbb', '#c6ff3d', '#3dd6ff'], shop: 280 },
    { name: 'Gold Light-Ups', color: '#e0b23c', sole: '#fff4c2', accent: '#26262b', high: true, glow: ['#f4c542', '#fff4c2', '#e2553f'], shop: 500 },
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
    { name: 'Shred Hed Pro', grip: '#2f2f33', graphic: '#f4c542', art: 'skull', accent: '#26262b', wheel: '#26262b',
      artColors: ['#26262b', '#26262b', '#26262b', '#26262b', '#f4c542', '#f4c542'], shop: 400 },
    { name: 'Holo Deck', grip: '#2f2f33', graphic: '#c9d1d9', art: 'rainbow', accent: '#9a7cff', wheel: '#ffffff',
      artColors: ['#ff9fcf', '#a8e8ff', '#c6ff3d', '#ffd84a', '#9a7cff', '#7fd8e0'], shop: 500 },
    { name: 'Lava Deck', grip: '#2a1410', graphic: '#1c1c20', art: 'flame', accent: '#ffd23f', wheel: '#ff5a1f', shop: 300 },
    { name: 'Money Deck', grip: '#2f2f33', graphic: '#2e9e4f', art: 'dots', accent: '#f4c542', wheel: '#f4c542', artColors: ['#f4c542', '#7fd36b', '#e9ffe6'], shop: 350 },
    { name: 'Ice Deck', grip: '#2f2f33', graphic: '#bfe6f2', art: 'stars', accent: '#ffffff', wheel: '#3dd6ff', shop: 300 },
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
    { name: 'Diamond Chain', type: 'chain', color: '#bfefff', shop: 350 },
    { name: 'Flame Cape', type: 'cape', color: '#ff5a1f', accent: '#c8360f', shop: 400 },
    { name: 'Gold Shades', type: 'shades', color: '#e0b23c', shop: 150 },
    { name: 'Ice Shades', type: 'shades', color: '#bfefff', shop: 140 },
    { name: 'Galaxy Cape', type: 'cape', color: '#2b1d4a', accent: '#a593e6', shop: 450 },
    // Halloween: a joke axe "stuck" in your head, like the costume one (free until the end of October)
    { name: 'Axe in Head', type: 'axe', color: '#b9c0c8', accent: '#8a5a2b', shop: 0, until: [2026, 10, 31] },
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
    { name: 'Lava', color: '#2a1410', speckle: ['#ff5a1f', '#ffd23f'], shop: 120 },
    { name: 'Diamond Dust', color: '#2f2f33', speckle: ['#ffffff', '#bfefff'], shop: 150 },
    { name: 'Neon', color: '#1c1c20', speckle: ['#ff3dbb', '#c6ff3d'], shop: 130 },
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
    { name: 'Money', colors: ['#2e9e4f', '#7fd36b', '#e9ffe6'], sparkle: '#f4c542', shop: 300 },
    { name: 'Lava Streak', colors: ['#b8240f', '#ff5a1f', '#ffd23f'], flicker: true, shop: 300 },
    { name: 'Diamond', colors: ['#3dd6ff', '#bfefff', '#ffffff'], sparkle: '#ffffff', shop: 450 },
    { name: 'Neon Zap', colors: ['#ff3dbb', '#c6ff3d', '#ffffff'], zap: true, shop: 350 },
    { name: 'Sunset', colors: ['#ff5a1f', '#ff8fc4', '#fff1a0'], shop: 280 },
  ],
  // How you fall when you bail (see ragdoll.js). Anything left out falls the classic way.
  //   spin: how hard you tumble · carry: [x, y] how much of your speed you keep
  //   kick: {x, y} a shove (x is forwards) · parts: shoves for just the head / hip / hands / feet
  //   spread: limbs flung out by this much · bounce / grip: off the ground (0.12 / 0.25 normally)
  //   gravity: times normal · floppy: how stretchy your limbs go (1 = not at all)
  //   slow: slow motion · time: how much longer before you're back up
  //   fx: something extra to see (and hear) · word: what pops up when you hit the ground
  bail: [
    { name: 'Classic Slam' },
    { name: 'Faceplant', spin: 0.3, kick: { x: 80, y: 60 }, parts: { head: { x: 300, y: 320 }, hand: { x: 120, y: -140 }, foot: { x: -80, y: -380 } }, word: 'OOF', color: '#ef5a4a' },
    { name: 'Butt Slam', spin: 0.1, carry: [0.4, 0.3], parts: { hip: { x: -40, y: 650 }, head: { x: -50, y: -120 }, foot: { x: 140, y: -320 } }, word: 'THUD', color: '#c98b5e' },
    { name: 'Cartwheel', spin: 2.6, carry: [1.05, 0.5], grip: 0.03, bounce: 0.2, word: 'WHEEE', color: '#f4c542' },
    { name: 'Noodle', spin: 0.6, floppy: 0.3, parts: { hand: { x: 60, y: -420 }, foot: { x: -60, y: -300 } }, word: 'WOBBLE', color: '#ffd84a' },
    { name: 'Starfish', spin: 0.25, kick: { x: 0, y: -200 }, spread: 420, word: 'SPLAT', color: '#ff8fb8' },
    { name: 'Superman', spin: 0, carry: [1, 0.2], kick: { x: 380, y: -420 }, parts: { hand: { x: 320, y: -160 }, head: { x: 160, y: -60 }, foot: { x: -160, y: 40 } }, gravity: 0.55, time: 1.3, word: 'UP, UP...', color: '#2f80ed' },
    { name: 'Bouncy Ball', spin: 1.2, bounce: 0.82, grip: 0.04, time: 1.2, fx: 'boing', color: '#7fd36b' },
    { name: 'Pancake', spin: 0.15, kick: { x: 0, y: 260 }, parts: { hip: { x: 0, y: 260 }, head: { x: 0, y: 160 } }, spread: 300, bounce: 0, grip: 0.9, word: 'SPLAT', color: '#e8b48a' },
    { name: 'Dizzy Stars', fx: 'stars', time: 1.2 },
    { name: 'Slow-Mo', slow: 0.35, time: 1.8, fx: 'noo', color: '#a593e6' },
    { name: 'Rocket', spin: 1.4, carry: [0.25, 0], kick: { x: 0, y: -1450 }, time: 1.5, fx: 'rocket', color: '#ff8c2e' },
    { name: 'Ice Slide', spin: 0.15, carry: [1.25, 0.3], kick: { x: 180, y: 160 }, grip: 0.003, bounce: 0, time: 1.2, fx: 'ice', word: 'WHOOSH', color: '#7fd8e0' },
    { name: 'Ghost Out', fx: 'ghost', time: 1.3 },
    { name: 'Tornado', spin: 6, carry: [0.2, 0.2], kick: { x: 0, y: -750 }, gravity: 0.7, time: 1.3, fx: 'tornado', word: 'WHIRL', color: '#9aa0a6' },
    { name: 'Banana Peel', spin: -0.4, carry: [0.6, 0.4], parts: { foot: { x: 650, y: -520 }, knee: { x: 380, y: -300 }, head: { x: -220, y: 60 } }, word: 'WHOOPS', color: '#f4d35e', shop: 200 },
    { name: 'Confetti Pop', fx: 'confetti', shop: 250 },
    { name: 'Moon Float', gravity: 0.22, bounce: 0.3, time: 1.7, spin: 0.7, word: 'floaty...', color: '#bfe6f2', shop: 300 },
    { name: 'Cartoon POW', fx: 'pow', shop: 350 },
    { name: 'Pinball', spin: 1.4, bounce: 0.95, grip: 0.02, time: 1.3, fx: 'ding', shop: 400 },
    { name: 'Coin Spill', fx: 'coins', shop: 450 },
  ],
};
// every item knows its category (handy for the shop)
for (const cat in OUTFIT_OPTIONS) for (const o of OUTFIT_OPTIONS[cat]) o.cat = cat;
// everything the Skate Shop ever sells, cheapest first
const SHOP_ITEMS = Object.values(OUTFIT_OPTIONS).flat().filter(o => o.shop && !o.until).sort((a, b) => a.shop - b.shop);
// for a short time only, on top of the daily stock: until: [year, month, day] it's there up to the
// end of that day (yours for good if you get it in time)
const SHOP_LIMITED = Object.values(OUTFIT_OPTIONS).flat().filter(o => o.until);
const limitedEnds = item => new Date(item.until[0], item.until[1] - 1, item.until[2], 23, 59, 59, 999).getTime();

// The shop changes completely every day at 12:00 PM (your time): everything in it goes, and 8 new
// things come in, one of them the Daily Deal. It's the same shop for everyone.
const SHOP_STOCK = 8, SHOP_PER_KIND = 2, SHOP_DEAL_OFF = 0.25;
const shopRand = seed => () => (seed = (seed * 16807 + 12345) % 2147483647) / 2147483647;
// The order things come into the shop: everything in one long line, shuffled once. Each day takes
// the next 8 in the line, so no day ever has anything the day before had, and nothing comes back
// for 5 days. (The shuffle is one where no day ever gets more than 2 of a kind.)
const SHOP_LINE = (() => {
  const n = SHOP_ITEMS.length;
  for (let seed = 1; ; seed++) {
    const rand = shopRand(seed), line = [...SHOP_ITEMS];
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [line[i], line[j]] = [line[j], line[i]]; }
    let ok = true;
    for (let start = 0; start < n && ok; start++) {
      const kinds = {};
      for (let k = 0; k < SHOP_STOCK && ok; k++) ok = (kinds[line[(start + k) % n].cat] = (kinds[line[(start + k) % n].cat] || 0) + 1) <= SHOP_PER_KIND;
    }
    if (ok || seed > 20000) return line;
  }
})();
// Which shop day it is: a day that starts at noon, so before 12:00 PM it's still yesterday's shop.
// (Going by the clock, not by counting hours, keeps it at noon on the daylight-saving days too.)
function shopDate(at) {
  const d = new Date(at);
  if (d.getHours() < 12) d.setDate(d.getDate() - 1);
  return d;
}
function shopDay(at = Date.now()) {
  const d = shopDate(at);
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
function shopDayNumber(at = Date.now()) {
  const d = shopDate(at);
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
}
function shopToday(at = Date.now()) {
  const day = shopDay(at), num = shopDayNumber(at), n = SHOP_LINE.length;
  const items = Array.from({ length: SHOP_STOCK }, (_, k) => SHOP_LINE[(((num * SHOP_STOCK + k) % n) + n) % n]);
  items.sort((a, b) => a.shop - b.shop);
  const deal = items[Math.floor(shopRand(num)() * items.length)];
  const next = new Date(at);
  next.setHours(12, 0, 0, 0);
  if (next.getTime() <= at) next.setDate(next.getDate() + 1);
  // the limited-time things go first, while they're still around
  const limited = SHOP_LIMITED.filter(it => at <= limitedEnds(it));
  return { day, items: [...limited, ...items], deal, nextAt: next.getTime() };
}
// what it costs today (the Daily Deal is cheaper)
function shopPrice(item, today = shopToday()) {
  return today.deal === item ? Math.round((item.shop * (1 - SHOP_DEAL_OFF)) / 5) * 5 : item.shop;
}

// 'sag' isn't a list of looks, it's a slider in the closet (see SAG_MAX).
const OUTFIT_CATEGORIES = [
  ['skin', 'Skin'], ['hat', 'Head'], ['hair', 'Hair'], ['hairColor', 'Hair Color'], ['top', 'Top'], ['pants', 'Pants'], ['sag', 'Sag'], ['shoes', 'Shoes'], ['board', 'Board'],
  ['grip', 'Grip'], ['cutout', 'Grip Cut'], ['trail', 'Trail'], ['bail', 'Bail'], ['extra', 'Extra'], ['stance', 'Stance'],
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
    clean, // tidies up an outfit from somewhere else (another player's game, say)
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
    // put on an outfit (and saved slots) from a save code
    load(outfit, slots) {
      Object.assign(pick, clean(outfit));
      (Array.isArray(slots) ? slots : []).slice(0, OUTFIT_SAVE_SLOTS).forEach((s, i) => { if (s) saves[i] = clean(s); });
      try {
        localStorage.setItem(KEY, JSON.stringify(pick));
        localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
      } catch (e) { /* storage blocked */ }
    },
  };
})();

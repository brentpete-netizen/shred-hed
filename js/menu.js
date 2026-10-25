// Start menu: Free Skate or Game of S.K.A.T.E. (then pick a map), the Park Builder, Closet
// (change your fit), Stats and Sound on/off. Works with the arrow keys + Enter / Esc, or by clicking.

const PX_PER_FT = 23; // the skater is about 5.5 ft tall

const MAIN_ITEMS = ['FREE SKATE', 'S.K.A.T.E.', 'ONLINE', 'CHALLENGES', 'PARK BUILDER', 'CLOSET', 'SKATE SHOP', 'STATS', 'AUDIO'];
const CATEGORY_LABEL = Object.fromEntries(OUTFIT_CATEGORIES);

// the last shop day you looked in the shop (so the menu can say there's new stock)
const SHOP_SEEN_KEY = 'shredHed.shopSeen';
const shopSeenDay = () => { try { return +localStorage.getItem(SHOP_SEEN_KEY) || 0; } catch (e) { return 0; } };

// The Skate Shop: a line about each thing for sale, by category and name.
const SHOP_TAGLINES = {
  'skin:Chrome': 'Shiny. Very, very shiny.',
  'hat:Chrome Helmet': 'Safety first, but make it shine',
  'hat:Diamond Crown': 'For the king of the park',
  'hat:Flame Snapback': 'A seriously hot head',
  'top:Lava Hoodie': 'Fresh out of the volcano',
  'top:Galaxy Hoodie': 'A whole universe, warm and cosy',
  'top:Shred Hed Pro Tee': 'Official team gear',
  'top:Gold Leather Jacket': 'Studded. Golden. Legendary.',
  'pants:Blue Flame Pants': 'The hottest flames burn blue',
  'pants:Galaxy Cargos': 'Pockets full of stars',
  'pants:Gold Chain Jeans': 'A little bling on the side',
  'shoes:Rocket Kicks': 'They glow. They go.',
  'shoes:Diamond Kicks': 'Ice on your feet',
  'board:Shred Hed Pro': 'The official pro model deck',
  'board:Holo Deck': 'Shimmers in every colour',
  'board:Lava Deck': 'Hot to the touch',
  'grip:Lava': 'Molten griptape',
  'grip:Diamond Dust': 'Sparkles under your feet',
  'trail:Money': 'Make it rain',
  'trail:Lava Streak': 'Leave the ground on fire',
  'trail:Diamond': 'A trail of pure ice',
  'extra:Diamond Chain': 'Frozen bling',
  'extra:Flame Cape': 'Super. Hero. Hot.',
  'extra:Gold Shades': 'The future is so bright',
  'hat:Neon Beanie': 'Visible from space',
  'hat:Gold Bandana': 'Pirate captain energy',
  'hat:Galaxy Helmet': 'Ready for launch',
  'top:Neon Jersey': 'Glows in the daylight',
  'top:Ice Hoodie': 'Stay frosty',
  'top:Money Tee': 'Ballin',
  'pants:Neon Sweats': 'Comfy and loud',
  'pants:Ice Cargos': 'Cold as ice',
  'shoes:Neon Runners': 'They light up every step',
  'shoes:Gold Light-Ups': 'Flashy and golden',
  'board:Money Deck': 'Paid in full',
  'board:Ice Deck': 'A frozen night sky',
  'grip:Neon': 'Rave under your feet',
  'trail:Neon Zap': 'Electric',
  'trail:Sunset': 'Ride off into it',
  'extra:Ice Shades': 'Too cool',
  'extra:Galaxy Cape': 'Wear the stars',
  'hat:Pumpkin Head': 'Happy Halloween!',
  'extra:Axe in Head': "Don't worry, it's just pretend",
};
// a card's background, by category (trails glow best in the dark)
const SHOP_TINT = { trail: '#26262b', board: '#dfe9f0', grip: '#dfe9f0', skin: '#efe2cf', hat: '#f6e3d3', top: '#e9e2f3', pants: '#e2ecdf', shoes: '#f3e6cf', extra: '#f6dfe6' };
// where on the skater a card zooms in: how far up from the wheels, and how much fits
const SHOP_FOCUS = { hat: [104, 44], skin: [64, 134], top: [70, 62], pants: [36, 70], shoes: [14, 36], extra: [86, 60] };
const EXTRA_FOCUS = { shades: [101, 34], chain: [82, 44], cape: [70, 96] };
const ONLINE_ITEMS = ['PUBLIC PARK', 'HOST FREE SKATE', 'HOST S.K.A.T.E.', 'JOIN A ROOM'];
const VERSUS_ITEMS = ['VS CPU', '2 PLAYERS'];

// What a Fit slider's setting looks like in words: "normal", "a bit baggy", "skinny"...
function fitWords(f, v) {
  if (f.key === 'sag') return v === SAG_NORMAL ? 'normal' : v < SAG_NORMAL ? 'pulled up' : v >= SAG_MAX - 1 ? 'mega sag' : 'saggy';
  if (v === f.normal) return 'normal';
  const end = f.ends[v < f.normal ? 0 : 1], far = Math.abs(v - f.normal) >= (f.max - f.normal) * 0.66;
  return far ? end : `a bit ${end}`;
}

class Menu {
  constructor(preview, mapId = 'park') {
    this.preview = preview;   // a second skater who models outfits in the closet
    this.screen = 'main';
    this.sel = 0;
    this.row = 0;
    this.mapId = mapId;
    this.parkSel = 0;
    this.refreshMaps();
    this.hits = [];
    this.result = null;
    this.showoff = 0;
  }

  // The map list includes your parks, which can change whenever you build.
  refreshMaps() {
    this.maps = allMaps();
    this.mapShapes = this.maps.map(m => m.build()); // for the little map drawings
    this.mapSel = Math.max(0, this.maps.findIndex(m => m.id === this.mapId));
  }

  open(screen = 'main') { this.screen = screen; this.result = null; this.confirmDelete = false; }

  // Returns { map, game } once the player picks what to play (game is 'free', 'cpu' or '2p'),
  // or { build: parkId } to open the Park Builder.
  handle(events) {
    for (const e of events) {
      if (this.screen === 'main') {
        if (e === 'up') { this.sel = (this.sel + MAIN_ITEMS.length - 1) % MAIN_ITEMS.length; Sound.play('menuMove'); }
        else if (e === 'down') { this.sel = (this.sel + 1) % MAIN_ITEMS.length; Sound.play('menuMove'); }
        else if (e === 'start' || e === 'grab' || e === 'right') this.choose(this.sel);
      } else if (this.screen === 'online') {
        const n = ONLINE_ITEMS.length;
        if (e === 'up') { this.onSel = (this.onSel + n - 1) % n; Sound.play('menuMove'); }
        else if (e === 'down') { this.onSel = (this.onSel + 1) % n; Sound.play('menuMove'); }
        else if (e === 'start' || e === 'grab' || e === 'right') this.chooseOnline(this.onSel);
        else if (e === 'rename') this.startTyping('name');
        else if (e === 'menu' || e === 'left') this.back();
      } else if (this.screen === 'lobby') {
        if (e === 'start' && Net.role === 'host' && this.canStart()) Net.startGame();
        else if (e === 'test') Chat.open();
        else if (e === 'menu') this.leaveRoom();
      } else if (this.screen === 'shop') {
        // the cards are a grid: ← → along a shelf, ↑ ↓ between shelves
        const cols = this.shopCols || 4, step = { left: -1, right: 1, up: -cols, down: cols }[e];
        if (step) this.shopMove(step);
        else if (e === 'start' || e === 'grab') this.shopPick();
        else if (e === 'menu') this.back();
      } else if (this.screen === 'versus') {
        if (e === 'up' || e === 'down') { this.vsSel = 1 - this.vsSel; Sound.play('menuMove'); }
        else if (e === 'start' || e === 'grab' || e === 'right') this.chooseVersus(this.vsSel);
        else if (e === 'menu' || e === 'left') this.back();
      } else if (this.screen === 'audio') {
        if (e === 'up') { this.audioRow = (this.audioRow + 2) % 3; Sound.play('menuMove'); }
        else if (e === 'down') { this.audioRow = (this.audioRow + 1) % 3; Sound.play('menuMove'); }
        else if (e === 'left' || e === 'right') this.adjustAudio(this.audioRow, e === 'right' ? 1 : -1);
        else if (e === 'start' || e === 'grab') { if (this.audioRow === 2) this.adjustAudio(2, 1); else this.back(); }
        else if (e === 'menu') this.back();
      } else if (this.screen === 'parks') {
        const n = this.parkRows().length;
        if (e === 'up') { this.parkSel = (this.parkSel + n - 1) % n; this.confirmDelete = false; Sound.play('menuMove'); }
        else if (e === 'down') { this.parkSel = (this.parkSel + 1) % n; this.confirmDelete = false; Sound.play('menuMove'); }
        else if (e === 'start' || e === 'grab' || e === 'right') this.pickPark(this.parkSel);
        else if (e === 'delete') this.deletePark(this.parkSel);
        else if (e === 'menu' || e === 'left') this.back();
      } else if (this.screen === 'maps') {
        const n = this.maps.length;
        if (e === 'left' || e === 'up') { this.mapSel = (this.mapSel + n - 1) % n; Sound.play('menuMove'); }
        else if (e === 'right' || e === 'down') { this.mapSel = (this.mapSel + 1) % n; Sound.play('menuMove'); }
        else if (e === 'start' || e === 'grab') this.pickMap(this.mapSel);
        else if (e === 'menu') this.back();
      } else if (this.screen === 'closet') {
        const n = OUTFIT_CATEGORIES.length;
        if (e === 'up') { this.row = (this.row + n - 1) % n; Sound.play('menuMove'); }
        else if (e === 'down') { this.row = (this.row + 1) % n; Sound.play('menuMove'); }
        else if (e === 'left' || e === 'right') this.change(this.row, e === 'right' ? 1 : -1);
        else if (e === 'fit') this.openFit();
        else if (e === 'rename') this.startTagName();
        else if (e === 'slot1' || e === 'slot2') this.loadOutfit(e === 'slot1' ? 0 : 1);
        else if (e === 'saveSlot1' || e === 'saveSlot2') this.saveOutfit(e === 'saveSlot1' ? 0 : 1);
        else if (e === 'start' || e === 'menu') this.back();
      } else if (this.screen === 'fit') {
        const n = FIT_SLIDERS.length;
        if (e === 'up') { this.fitRow = (this.fitRow + n - 1) % n; Sound.play('menuMove'); }
        else if (e === 'down') { this.fitRow = (this.fitRow + 1) % n; Sound.play('menuMove'); }
        else if (e === 'left' || e === 'right') {
          const key = FIT_SLIDERS[this.fitRow].key;
          this.setFit(key, this.trying[key] + (e === 'right' ? 1 : -1));
        } else if (e === 'start' || e === 'menu' || e === 'fit') this.closeFit();
      } else if (e === 'start' || e === 'menu' || e === 'left') {
        this.back();
      }
    }
    const r = this.result;
    this.result = null;
    return r;
  }

  choose(i) {
    this.sel = i;
    Sound.play('menuPick');
    const item = MAIN_ITEMS[i];
    if (item === 'FREE SKATE') { this.game = 'free'; this.refreshMaps(); this.screen = 'maps'; }
    else if (item === 'S.K.A.T.E.') { this.screen = 'versus'; this.vsSel = this.vsSel || 0; }
    else if (item === 'ONLINE') { this.screen = 'online'; this.onSel = this.onSel || 0; }
    else if (item === 'PARK BUILDER') { this.screen = 'parks'; this.confirmDelete = false; }
    else if (item === 'CLOSET') { this.screen = 'closet'; this.showoff = 0; this.trying = { ...Outfit.pick }; }
    else if (item === 'SKATE SHOP') {
      this.screen = 'shop'; this.showoff = 0; this.shopSel = this.shopSel || 0; this.shopConfirm = false;
      try { localStorage.setItem(SHOP_SEEN_KEY, String(shopDay())); } catch (e) { /* storage blocked */ }
    }
    else if (item === 'STATS') this.screen = 'stats';
    else if (item === 'CHALLENGES') this.screen = 'challenges';
    else { this.screen = 'audio'; this.audioRow = 0; }
  }

  // ---------------------------------------------------------------- online

  chooseOnline(i) {
    this.onSel = i;
    Sound.play('menuPick');
    const item = ONLINE_ITEMS[i];
    if (item === 'PUBLIC PARK') { this.screen = 'lobby'; Net.joinPublic(); }
    else if (item === 'JOIN A ROOM') { this.screen = 'join'; this.joinCode = ''; this.startTyping('code'); }
    else { this.game = item === 'HOST FREE SKATE' ? 'online-free' : 'online-skate'; this.refreshMaps(); this.screen = 'maps'; }
  }

  // Typing your online name (it's the name on your Name Tag too) or a room code.
  startTyping(what) {
    this.typing = what;
    Input.textCapture = key => {
      if (key === 'Escape') { this.stopTyping(); if (what === 'code') this.screen = 'online'; return; }
      if (what === 'code') {
        if (key === 'Enter') { if (this.joinCode.length === 4) { this.stopTyping(); Net.join(this.joinCode); this.screen = 'lobby'; } return; }
        if (key === 'Backspace') this.joinCode = this.joinCode.slice(0, -1);
        else if (/^[a-z]$/i.test(key) && this.joinCode.length < 4) this.joinCode += key.toUpperCase();
        Sound.play('menuMove');
      } else {
        if (key === 'Enter') { this.stopTyping(); Outfit.set('tagName', Outfit.pick.tagName.trim()); return; }
        const name = key === 'Backspace' ? Outfit.pick.tagName.slice(0, -1) : key.length === 1 ? cleanTagName(Outfit.pick.tagName + key) : Outfit.pick.tagName;
        Outfit.set('tagName', name);
      }
    };
  }

  stopTyping() {
    this.typing = null;
    Input.textCapture = null;
  }

  leaveRoom() {
    Net.leave();
    Chat.clear();
    this.screen = 'online';
    Sound.play('menuMove');
  }

  chooseVersus(i) {
    this.vsSel = i;
    this.game = i === 0 ? 'cpu' : '2p';
    Sound.play('menuPick');
    this.refreshMaps();
    this.screen = 'maps';
  }

  pickMap(i) {
    this.mapSel = i;
    const need = Progress.lockLevel('map', this.maps[i].id);
    if (!Progress.isUnlocked('map', this.maps[i].id)) return this.flash(`reach level ${need} to unlock ${this.maps[i].name}`);
    this.mapId = this.maps[i].id;
    Sound.play('menuPick');
    if (this.game.startsWith('online')) {
      // open a room on this map; a custom park gets sent to everyone who joins
      const m = this.maps[i], park = m.custom ? Parks.get(m.id.slice(5)) : null;
      Net.host(this.game === 'online-free' ? 'free' : 'skate', m.id, park);
      this.screen = 'lobby';
      return;
    }
    this.result = { map: this.mapId, game: this.game };
    this.screen = 'main';
  }

  canStart() { return Net.role === 'host' && (Net.mode === 'free' || Net.players.length >= 2); }

  // My Parks: each saved park, then "new park" if there's room.
  parkRows() {
    const rows = Parks.list().map(p => ({ park: p }));
    if (!Parks.full()) rows.push({ create: true });
    return rows;
  }

  pickPark(i) {
    const row = this.parkRows()[i];
    if (!row) return;
    Sound.play('menuPick');
    const park = row.create ? Parks.create() : row.park;
    this.result = { build: park.id };
  }

  deletePark(i) {
    const row = this.parkRows()[i];
    if (!row || row.create) return;
    if (!this.confirmDelete) { this.confirmDelete = true; Sound.play('menuMove'); return; }
    Parks.remove(row.park.id);
    this.confirmDelete = false;
    this.parkSel = Math.max(0, Math.min(this.parkSel, this.parkRows().length - 1));
    Sound.play('lost');
  }

  back() {
    this.screen = 'main';
    Sound.play('menuMove');
  }

  adjustAudio(row, d) {
    this.audioRow = row;
    if (row === 2) Sound.toggle();
    else Sound.adjust(row === 0 ? 'sfx' : 'music', d);
    Sound.play('menuMove');
  }

  drawAudio(ctx, w, h) {
    markerText(ctx, 'AUDIO', w / 2, Math.min(60, h * 0.09), Math.min(52, w / 10), '#ffffff', -0.04);
    const s = Sound.settings;
    const rows = [['Sound effects', s.sfx], ['Music', s.music], ['Mute everything', s.muted ? 'ON' : 'OFF']];
    const rw = Math.min(460, w - 32), rh = Math.min(64, h * 0.1), x = (w - rw) / 2, top = Math.min(130, h * 0.2);
    rows.forEach(([label, value], i) => {
      const y = top + i * (rh + 10), sel = i === this.audioRow;
      Sketch.seedFor(380 + i);
      const box = [{ x, y }, { x: x + rw, y }, { x: x + rw, y: y + rh }, { x, y: y + rh }];
      Sketch.fill(ctx, box, sel ? '#f4c542' : '#fbf8f0', 1.5);
      Sketch.stroke(ctx, box, { color: INK, width: sel ? 3 : 1.8, amp: 1, closed: true });
      ctx.font = `${Math.min(22, rh * 0.36)}px ${HAND}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = INK;
      ctx.fillText(label, x + 16, y + rh / 2);
      if (typeof value === 'number') {
        // a row of 10 pips
        for (let k = 0; k < 10; k++) {
          const px = x + rw * 0.45 + k * (rw * 0.05);
          Sketch.circle(ctx, px, y + rh / 2, rw * 0.016, k < value ? '#7fd36b' : null, { width: 1.4 });
        }
        this.hit(x, y, rw * 0.45, rh, () => this.adjustAudio(i, -1));
        this.hit(x + rw * 0.45, y, rw * 0.55, rh, () => this.adjustAudio(i, 1));
      } else {
        markerText(ctx, value, x + rw * 0.72, y + rh / 2, rh * 0.4, value === 'ON' ? '#ef5a4a' : '#ffffff');
        this.hit(x, y, rw, rh, () => this.adjustAudio(i, 1));
      }
    });
    ctx.font = `${Math.max(13, Math.min(17, w / 70))}px ${HAND}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = INK;
    ctx.fillText('↑ ↓ pick · ← → change · M mutes anytime · Esc back', w / 2, top + 3 * (rh + 10) + 6);
  }

  wearingTag() { return OUTFIT_OPTIONS.extra[this.trying.extra].type === 'nametag'; }

  // Write your name on the name tag: type, Backspace to fix it, Enter (or Esc) when you're done.
  startTagName() {
    if (!this.wearingTag() || this.naming) return;
    if (TouchPad.enabled) {
      // no keyboard to type on: a pop-up instead
      const name = window.prompt('Write your name on the tag:', this.trying.tagName);
      if (name !== null) { this.trying.tagName = cleanTagName(name).trim(); Outfit.set('tagName', this.trying.tagName); }
      return;
    }
    this.naming = true;
    Sound.play('menuPick');
    Input.textCapture = key => {
      if (key === 'Enter' || key === 'Escape') return this.finishTagName();
      if (key === 'Backspace') this.trying.tagName = this.trying.tagName.slice(0, -1);
      else if (key.length === 1) this.trying.tagName = cleanTagName(this.trying.tagName + key);
      Outfit.set('tagName', this.trying.tagName);
    };
  }

  finishTagName() {
    if (!this.naming) return;
    this.naming = false;
    Input.textCapture = null;
    this.trying.tagName = this.trying.tagName.trim();
    Outfit.set('tagName', this.trying.tagName);
    Sound.play('menuMove');
  }

  // good news, in green
  note(text) {
    this.msg = { text, t: 0, color: '#7fd36b' };
    Sound.play('menuPick');
  }

  // Saved outfits: two slots. Saving keeps exactly what you're trying on (fit and all);
  // loading puts it back on. Anything still locked shows but isn't worn, same as browsing.
  saveOutfit(slot) {
    Outfit.saveTo(slot, this.trying);
    this.note(`SAVED TO SLOT ${slot + 1}`);
  }

  loadOutfit(slot) {
    const saved = Outfit.saves[slot];
    if (!saved) return this.flash(`slot ${slot + 1} is empty · save an outfit there first`);
    for (const cat in OUTFIT_OPTIONS) {
      // a secret thing you don't have any more stays as it is
      if (!Progress.secretOwned(OUTFIT_OPTIONS[cat][saved[cat]])) continue;
      this.trying[cat] = saved[cat];
      if (Progress.isUnlocked(cat, OUTFIT_OPTIONS[cat][saved[cat]].name)) Outfit.set(cat, saved[cat]);
    }
    for (const f of FIT_SLIDERS) { this.trying[f.key] = saved[f.key]; Outfit.set(f.key, saved[f.key]); }
    this.trying.tagName = saved.tagName;
    Outfit.set('tagName', saved.tagName);
    this.note(`LOADED SLOT ${slot + 1}`);
    this.kickflip(true);
  }

  flash(text) {
    this.msg = { text, t: 0 };
    Sound.play('lost');
  }

  // ---------------------------------------------------------------- skate shop

  // What you're wearing, with the shop item you're looking at swapped in.
  shopLook() {
    const item = this.shopStock().items[this.shopSel];
    return { ...Outfit.pick, [item.cat]: OUTFIT_OPTIONS[item.cat].indexOf(item) };
  }

  // Today's stock. (It changes at noon: if it just did, start back at the first thing.)
  shopStock() {
    const today = shopToday();
    if (this.shopDay !== today.day) { this.shopDay = today.day; this.shopSel = 0; this.shopConfirm = false; this.shopTop = 0; }
    this.shopSel = clamp(this.shopSel || 0, 0, today.items.length - 1);
    return (this.today = today);
  }

  shopMove(step) {
    const n = this.shopStock().items.length, to = this.shopSel + step;
    if (to < 0 || to >= n) {
      // off the end of a shelf: wrap round
      if (Math.abs(step) === 1) this.shopSel = (to + n) % n;
      else return;
    } else this.shopSel = to;
    this.shopConfirm = false;
    Sound.play('menuMove');
  }

  // Buy it (press twice, so you don't spend by accident), or put it on if it's already yours.
  shopPick(i = this.shopSel) {
    this.shopSel = i;
    const today = this.shopStock(), item = today.items[i], price = shopPrice(item, today), index = OUTFIT_OPTIONS[item.cat].indexOf(item);
    if (Progress.owns(item)) {
      Outfit.set(item.cat, index);
      this.shopConfirm = false;
      this.kickflip(true);
      return this.note(`WEARING ${item.name.toUpperCase()}`);
    }
    if (Progress.bucks < price) return this.flash(`you need ${price - Progress.bucks} more Shred Bucks`);
    if (price > 0 && !this.shopConfirm) { this.shopConfirm = true; Sound.play('menuMove'); return; } // (free things: no need to ask)
    this.shopConfirm = false;
    if (Progress.buy(item, price) !== 'bought') return;
    Outfit.set(item.cat, index);
    Sound.play('cash');
    this.sold = { name: item.name, t: 0 };
    this.confettiBurst(this.shopModelAt || { x: innerWidth / 2, y: innerHeight / 2 });
    this.kickflip(true);
  }

  // Confetti and coins flying up out of a purchase.
  confettiBurst(at) {
    const colors = ['#f4c542', '#e2553f', '#7fd36b', '#2f80ed', '#ff8fc4', '#ffffff'];
    this.confetti = Array.from({ length: 90 }, (_, i) => ({
      x: at.x, y: at.y, vx: (Math.random() - 0.5) * 640, vy: -260 - Math.random() * 520,
      r: Math.random() * TAU, vr: (Math.random() - 0.5) * 16, color: colors[i % colors.length], coin: i % 5 === 0, t: 0,
    }));
  }

  drawConfetti(ctx) {
    for (const p of this.confetti || []) {
      ctx.globalAlpha = clamp((2.4 - p.t) / 0.6, 0, 1);
      if (p.coin) drawCoin(ctx, p.x, p.y, 7, Math.cos(p.r * 2));
      else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.color;
        ctx.fillRect(-3, -5 * Math.abs(Math.cos(p.r * 1.7)) - 1, 6, 10 * Math.abs(Math.cos(p.r * 1.7)) + 2);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  // In the closet you can try on anything; only unlocked things actually get saved.
  change(row, dir) {
    this.row = row;
    const cat = OUTFIT_CATEGORIES[row][0];
    if (cat === 'sag') return this.setFit('sag', this.trying.sag + dir);
    const n = OUTFIT_OPTIONS[cat].length;
    // secret items don't even show up until you've earned them
    do { this.trying[cat] = (this.trying[cat] + dir + n) % n; } while (!Progress.secretOwned(OUTFIT_OPTIONS[cat][this.trying[cat]]));
    if (Progress.isUnlocked(cat, OUTFIT_OPTIONS[cat][this.trying[cat]].name)) Outfit.set(cat, this.trying[cat]);
    Sound.play('menuMove');
    if (cat === 'board' || cat === 'stance') this.kickflip(true); // show off the graphic underneath
    if (cat === 'stance') this.note(OUTFIT_OPTIONS.stance[this.trying.stance].goofy ? 'GOOFY: ← → AND Q / E SWAP FOR TRICKS' : 'REGULAR: CONTROLS BACK TO NORMAL');
  }

  // The Fit sliders (Sag, hat tilt, sleeves...): anything goes, nothing to unlock.
  setFit(key, v) {
    const f = FIT_BY_KEY[key];
    v = clamp(Math.round(v), f.min, f.max);
    if (v === this.trying[key]) return;
    this.trying[key] = v;
    Outfit.set(key, v);
    Sound.play('menuMove');
  }

  openFit() {
    this.screen = 'fit';
    this.fitRow = this.fitRow || 0;
    Sound.play('menuPick');
  }

  closeFit() {
    this.screen = 'closet';
    this.dragging = null;
    Sound.play('menuMove');
  }

  // Dragging a slider's knob (or clicking anywhere along its bar).
  pointerMove(x, y, down) {
    if (!down) { this.dragging = null; return; }
    const bar = this.dragging && this.fitBars?.[this.dragging];
    if (bar) this.setFit(this.dragging, bar.min + ((x - bar.x) / bar.w) * (bar.max - bar.min));
  }

  kickflip(loud = false) {
    const p = this.preview;
    if (p.state !== 'ground') return;
    p.ollie();
    p.trickInput('R');
    this.showoff = 0;
    this.loud = loud;
  }

  update(dt) {
    const p = this.preview;
    p.update(dt, [], () => false);
    // only make noise for kickflips you asked for, not the idle show-off every few seconds
    if (this.loud) for (const m of p.out) Sound.onMessage(m);
    if (p.state === 'ground' && p.out.some(m => m.type === 'land')) this.loud = false;
    p.out.length = 0;
    if ((this.screen === 'closet' || this.screen === 'shop') && (this.showoff += dt) > 4) this.kickflip();
    if (this.msg && (this.msg.t += dt) > 2) this.msg = null;
    if (this.confetti) {
      for (const p of this.confetti) { p.vy += 900 * dt; p.vx *= Math.pow(0.4, dt); p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.t += dt; }
      this.confetti = this.confetti.filter(p => p.t < 2.4);
      if (!this.confetti.length) this.confetti = null;
    }
    if (this.sold && (this.sold.t += dt) > 2.4) this.sold = null;
    // clicked away from the name tag (or took it off) while writing on it
    if (this.naming && (this.screen !== 'closet' || !this.wearingTag())) this.finishTagName();
    if (this.typing && this.screen !== 'online' && this.screen !== 'join') this.stopTyping();
  }

  click(x, y) {
    for (const h of this.hits) {
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) { h.fn(x, y); break; }
    }
    const r = this.result;
    this.result = null;
    return r;
  }

  hit(x, y, w, h, fn) { this.hits.push({ x, y, w, h, fn }); }

  // ---------------------------------------------------------------- drawing

  draw(ctx, w, h, time, dpr) {
    this.hits = [];
    ctx.fillStyle = 'rgba(243, 238, 225, 0.72)';
    ctx.fillRect(0, 0, w, h);
    if (this.screen === 'main') this.drawMain(ctx, w, h, time);
    else if (this.screen === 'maps') this.drawMaps(ctx, w, h);
    else if (this.screen === 'versus') this.drawVersus(ctx, w, h);
    else if (this.screen === 'parks') this.drawParks(ctx, w, h);
    else if (this.screen === 'audio') this.drawAudio(ctx, w, h);
    else if (this.screen === 'closet') this.drawCloset(ctx, w, h, dpr);
    else if (this.screen === 'shop') this.drawShop(ctx, w, h, dpr);
    else if (this.screen === 'challenges') this.drawChallenges(ctx, w, h);
    else if (this.screen === 'fit') this.drawFit(ctx, w, h, dpr);
    else if (this.screen === 'online') this.drawOnline(ctx, w, h);
    else if (this.screen === 'join') this.drawJoin(ctx, w, h);
    else if (this.screen === 'lobby') this.drawLobby(ctx, w, h);
    else this.drawStats(ctx, w, h);
    // screens you leave with Esc get a button too, for phones and tablets with no Esc key
    if (['maps', 'versus', 'parks', 'audio', 'online', 'join', 'challenges'].includes(this.screen)) {
      const leave = this.screen === 'join' ? () => { this.stopTyping(); this.screen = 'online'; Sound.play('menuMove'); } : () => this.back();
      this.button(ctx, '◀', 12, w < 600 ? h - 52 : 12, 52, 40, false, 653, leave); // (clear of the titles on a phone)
    }
    if (this.msg) {
      ctx.globalAlpha = clamp((2 - this.msg.t) / 0.4, 0, 1);
      markerText(ctx, this.msg.text, w / 2, h * 0.5, Math.min(30, w / 20), this.msg.color || '#ef5a4a', -0.03);
      ctx.globalAlpha = 1;
    }
  }

  // A dark wash with the level something unlocks at.
  drawLock(ctx, x, y, w, h, level) {
    ctx.fillStyle = 'rgba(60, 56, 50, 0.45)';
    ctx.fillRect(x, y, w, h);
    markerText(ctx, `LEVEL ${level}`, x + w / 2, y + h / 2, Math.min(28, w / 7, h * 0.4), '#f4c542', -0.04);
  }

  // A few lines of small handwriting, centred.
  note2(ctx, lines, w, y, fs) {
    ctx.font = `${fs}px ${HAND}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = INK;
    lines.forEach((l, i) => ctx.fillText(l, w / 2, y + i * fs * 1.35));
  }

  drawOnline(ctx, w, h) {
    markerText(ctx, 'ONLINE', w / 2, Math.min(70, h * 0.11), Math.min(52, w / 9), '#f4c542', -0.04);
    const fs = Math.max(14, Math.min(18, w / 60));
    this.note2(ctx, ['Public Park: drop in and skate with whoever\'s there (real people only).', 'Or host a room for friends and send them its code, or join theirs.'], w, Math.min(70, h * 0.11) + 36, fs);
    // your name, as everyone else will see it
    const bw = Math.min(360, w - 48), bh = Math.min(58, h * 0.085), x = (w - bw) / 2;
    const ny = h * 0.3, typing = this.typing === 'name';
    Sketch.seedFor(390);
    const box = [{ x, y: ny }, { x: x + bw, y: ny }, { x: x + bw, y: ny + bh }, { x, y: ny + bh }];
    Sketch.fill(ctx, box, typing ? '#f4c542' : '#fbf8f0', 1.5);
    Sketch.stroke(ctx, box, { color: INK, width: 2, amp: 1, closed: true });
    const caret = typing && Math.floor(performance.now() / 400) % 2 ? '|' : '';
    markerText(ctx, `${onlineName()}${caret}`, w / 2, ny + bh * 0.42, Math.min(bh * 0.42, 26), '#ffffff');
    ctx.font = `${fs * 0.75}px ${HAND}`;
    ctx.fillStyle = INK;
    ctx.fillText(typing ? 'type your name · Enter when done' : 'your name · click (or press N) to change it', w / 2, ny + bh * 0.72);
    this.hit(x, ny, bw, bh, () => {
      if (navigator.maxTouchPoints > 0) {
        // no keyboard to type on: a pop-up instead
        const name = window.prompt('Your name:', Outfit.pick.tagName);
        if (name !== null) Outfit.set('tagName', cleanTagName(name).trim());
      } else if (!this.typing) this.startTyping('name');
    });
    const y0 = ny + bh + 26;
    ONLINE_ITEMS.forEach((label, i) => this.button(ctx, label, x, y0 + i * bh * 1.3, bw, bh, i === this.onSel, 392 + i, () => this.chooseOnline(i)));
    this.note2(ctx, ['Public Park: up to 6 · Free Skate: up to 4 · S.K.A.T.E.: you vs one friend', 'Esc back'], w, y0 + ONLINE_ITEMS.length * bh * 1.3 + 6, fs * 0.85);
    if (Net.error) markerText(ctx, Net.error, w / 2, h * 0.94, Math.min(22, w / 30), '#ef5a4a');
  }

  drawJoin(ctx, w, h) {
    markerText(ctx, 'JOIN A ROOM', w / 2, Math.min(70, h * 0.11), Math.min(52, w / 11), '#f4c542', -0.04);
    const fs = Math.max(14, Math.min(18, w / 60));
    this.note2(ctx, ['Type the 4-letter room code your friend sees on their screen.'], w, Math.min(70, h * 0.11) + 36, fs);
    const s = Math.min(90, (w - 60) / 4.6), y = h * 0.42;
    for (let i = 0; i < 4; i++) {
      const x = w / 2 + (i - 2) * s * 1.12 + s * 0.06;
      Sketch.seedFor(400 + i);
      const box = [{ x, y }, { x: x + s, y }, { x: x + s, y: y + s }, { x, y: y + s }];
      Sketch.fill(ctx, box, i === this.joinCode.length ? '#f4c542' : '#fbf8f0', 1.5);
      Sketch.stroke(ctx, box, { color: INK, width: 2.4, amp: 1, closed: true });
      if (this.joinCode[i]) markerText(ctx, this.joinCode[i], x + s / 2, y + s / 2, s * 0.6, '#ffffff');
    }
    this.note2(ctx, [this.joinCode.length === 4 ? 'Enter to join' : 'letters only · Backspace to fix it', 'no keyboard? tap the boxes', 'Esc back'], w, y + s + 24, fs);
    // phones and tablets: ask for it in a pop-up instead
    this.hit(w / 2 - s * 2.3, y, s * 4.6, s, () => {
      const code = (window.prompt('Room code (4 letters):', this.joinCode) || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
      this.joinCode = code;
      if (code.length === 4) { this.stopTyping(); Net.join(code); this.screen = 'lobby'; }
    });
  }

  drawLobby(ctx, w, h) {
    const fs = Math.max(14, Math.min(18, w / 60)), host = Net.role === 'host';
    const mode = Net.mode === 'skate' ? 'S.K.A.T.E.' : 'FREE SKATE';
    markerText(ctx, Net.code ? `ROOM ${Net.code}` : 'ONLINE', w / 2, Math.min(70, h * 0.11), Math.min(56, w / 9), '#f4c542', -0.04);
    const map = Net.map ? (allMaps().find(m => m.id === Net.map) || findAnyMap(Net.map)).name : '';
    const lines = Net.code ? [`${mode}${map ? ' on ' + map : ''}`] : [];
    if (host && Net.code) lines.push('Tell your friends to press ONLINE,', `then JOIN A ROOM, and type ${Net.code}`);
    lines.push(Net.error || Net.status);
    this.note2(ctx, lines, w, Math.min(70, h * 0.11) + 38, fs);
    // who's here
    const bw = Math.min(360, w - 48), rh = Math.min(48, h * 0.07), x = (w - bw) / 2, y0 = h * 0.36;
    const slots = Net.mode ? Net.size || ROOM_SIZE[Net.mode] : 0;
    for (let i = 0; i < slots; i++) {
      const p = Net.players[i], y = y0 + i * (rh + 8);
      Sketch.seedFor(410 + i);
      const box = [{ x, y }, { x: x + bw, y }, { x: x + bw, y: y + rh }, { x, y: y + rh }];
      Sketch.fill(ctx, box, p ? '#fbf8f0' : 'rgba(251, 248, 240, 0.4)', 1.5);
      Sketch.stroke(ctx, box, { color: INK, width: 1.8, amp: 1, closed: true });
      const label = p ? `${p.id === Net.me ? p.name : cleanName(p.name)}${p.id === Net.me ? ' (you)' : ''}${p.id === 'h' ? ' · host' : ''}` : 'waiting…';
      markerText(ctx, label, w / 2, y + rh / 2, Math.min(rh * 0.42, 22), p ? '#ffffff' : '#b9b4aa');
    }
    const by = y0 + Math.max(slots, 1) * (rh + 8) + 16, bh = Math.min(54, h * 0.08), half = (bw - 14) / 2;
    if (host && Net.code) {
      const ready = this.canStart();
      this.button(ctx, ready ? 'START' : 'WAITING', x, by, half, bh, ready, 420, () => { if (this.canStart()) Net.startGame(); });
      this.button(ctx, 'CLOSE', x + half + 14, by, half, bh, false, 421, () => this.leaveRoom());
    } else this.button(ctx, Net.error ? 'BACK' : 'LEAVE', x + bw / 4, by, bw / 2, bh, false, 421, () => this.leaveRoom());
    const hint = !host ? 'Esc leave' : this.canStart() ? 'Enter start · Esc close the room' : 'S.K.A.T.E. needs 2 players · Esc close the room';
    this.note2(ctx, [hint, Net.active ? 'T to chat' : ''], w, by + bh + 10, fs * 0.85);
    Chat.draw(ctx, w, h, true);
  }

  drawVersus(ctx, w, h) {
    markerText(ctx, 'GAME OF S.K.A.T.E.', w / 2, Math.min(70, h * 0.11), Math.min(52, w / 12), '#f4c542', -0.04);
    const fs = Math.max(14, Math.min(19, w / 60));
    ctx.font = `${fs}px ${HAND}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = INK;
    const rules = 'Land a trick and the other skater has to land the exact same one, or they get a letter. ' +
      'Miss your set and they set instead. Last letter gets two tries. Spell S.K.A.T.E. and you lose.';
    const lines = [''];
    for (const word of rules.split(' ')) {
      const test = (lines[lines.length - 1] + ' ' + word).trim();
      if (ctx.measureText(test).width > Math.min(w - 40, 640)) lines.push(word); else lines[lines.length - 1] = test;
    }
    lines.forEach((l, i) => ctx.fillText(l, w / 2, Math.min(70, h * 0.11) + 40 + i * fs * 1.3));
    const bw = Math.min(320, w - 48), bh = Math.min(60, h * 0.09), x = (w - bw) / 2, y0 = h * 0.38;
    VERSUS_ITEMS.forEach((label, i) => this.button(ctx, label, x, y0 + i * bh * 1.35, bw, bh, i === this.vsSel, 140 + i, () => this.chooseVersus(i)));
    const d = Stats.data;
    ctx.font = `${fs}px ${HAND}`;
    ctx.fillStyle = INK;
    ctx.fillText(`vs CPU record: ${d.skateWins} won, ${d.skateLosses} lost  ·  Esc back`, w / 2, y0 + 2 * bh * 1.35 + 8);
  }

  drawParks(ctx, w, h) {
    markerText(ctx, 'MY PARKS', w / 2, Math.min(60, h * 0.09), Math.min(52, w / 10), '#ffffff', -0.04);
    const rows = this.parkRows();
    const rw = Math.min(460, w - 32), rh = Math.min(58, (h * 0.66) / Math.max(4, rows.length)), x = (w - rw) / 2, top = Math.min(110, h * 0.17);
    rows.forEach((row, i) => {
      const y = top + i * (rh + 8), sel = i === this.parkSel;
      Sketch.seedFor(360 + i);
      const box = [{ x, y }, { x: x + rw, y }, { x: x + rw, y: y + rh }, { x, y: y + rh }];
      const danger = sel && this.confirmDelete;
      Sketch.fill(ctx, box, danger ? '#ef9a8f' : sel ? '#f4c542' : row.create ? '#e7eef3' : '#fbf8f0', 1.5);
      Sketch.stroke(ctx, box, { color: INK, width: sel ? 3 : 1.8, amp: 1, closed: true });
      const fs = Math.min(rh * 0.42, 24);
      if (row.create) markerText(ctx, '+ NEW PARK', x + rw / 2, y + rh / 2, fs, '#ffffff');
      else {
        const p = row.park;
        markerText(ctx, p.name.toUpperCase(), x + rw * 0.36, y + rh / 2, fs, '#ffffff');
        ctx.font = `${fs * 0.7}px ${HAND}`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = INK;
        ctx.fillText(danger ? 'press Delete again to delete' : `${p.slots} slots · ${p.theme} · best ${fmtScore(Stats.map('park:' + p.id).bestScore)}`, x + rw - 14, y + rh / 2);
      }
      this.hit(x, y, rw, rh, () => { this.parkSel = i; this.pickPark(i); });
    });
    ctx.font = `${Math.max(13, Math.min(17, w / 70))}px ${HAND}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = INK;
    const tip = Parks.full() ? `that's the max of ${MAX_PARKS} parks · ` : '';
    ctx.fillText(`${tip}↑ ↓ pick · Enter build · Delete remove · Esc back`, w / 2, top + rows.length * (rh + 8) + 6);
    ctx.fillText('Your parks show up in the map list for Free Skate and S.K.A.T.E.', w / 2, top + rows.length * (rh + 8) + 28);
  }

  // Map select: a card per spot with a little sketch of its layout and your best scores there.
  drawMaps(ctx, w, h) {
    const title = { free: 'PICK A SPOT', cpu: 'S.K.A.T.E. VS CPU', '2p': 'S.K.A.T.E. 2 PLAYERS',
      'online-free': 'ONLINE · PICK A SPOT', 'online-skate': 'ONLINE S.K.A.T.E. · PICK A SPOT' }[this.game];
    markerText(ctx, title, w / 2, Math.min(60, h * 0.09), Math.min(52, w / 12), '#ffffff', -0.04);
    const cols = w > 900 ? 4 : 2, rows = Math.ceil(this.maps.length / cols);
    const gap = 16, top = Math.min(110, h * 0.17);
    const cardW = Math.min(300, (w - 32 - gap * (cols - 1)) / cols);
    const cardH = Math.min(280, (h - top - 90 - gap * (rows - 1)) / rows);
    const x0 = (w - (cardW * cols + gap * (cols - 1))) / 2;
    this.maps.forEach((m, i) => {
      const x = x0 + (i % cols) * (cardW + gap), y = top + Math.floor(i / cols) * (cardH + gap), sel = i === this.mapSel;
      Sketch.seedFor(330 + i);
      const box = [{ x, y }, { x: x + cardW, y }, { x: x + cardW, y: y + cardH }, { x, y: y + cardH }];
      Sketch.fill(ctx, box, sel ? '#f4c542' : '#fbf8f0', 2);
      Sketch.stroke(ctx, box, { color: INK, width: sel ? 3.2 : 2, amp: 1.2, closed: true });
      const fs = Math.min(26, cardW / 9);
      markerText(ctx, m.name, x + cardW / 2, y + fs, fs, '#ffffff', -0.03);

      // the layout, squeezed into the card
      const T = this.mapShapes[i];
      const mx = x + 12, mw = cardW - 24, my = y + fs * 2, mh = cardH * 0.42;
      const sx = mw / (T.maxX - T.minX), sy = Math.min(sx * 1.6, mh / (T.lowest + 60 - T.highest));
      const px = p => ({ x: mx + (p.x - T.minX) * sx, y: my + mh - (T.lowest + 30 - p.y) * sy });
      ctx.lineJoin = 'round';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      T.outline.forEach((p, k) => { const q = px(p); if (k) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); });
      ctx.stroke();
      ctx.strokeStyle = '#7a8088';
      ctx.lineWidth = 1.5;
      for (const r of T.railLines) {
        ctx.beginPath();
        r.pts.forEach((p, k) => { const q = px(p); if (k) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); });
        ctx.stroke();
      }

      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = `${Math.max(12, fs * 0.62)}px ${HAND}`;
      const words = m.blurb.split(' '), lines = [''];
      for (const word of words) {
        const test = (lines[lines.length - 1] + ' ' + word).trim();
        if (ctx.measureText(test).width > cardW - 24) lines.push(word); else lines[lines.length - 1] = test;
      }
      const by = my + mh + 8;
      if (cardH > 170) lines.slice(0, 2).forEach((l, k) => ctx.fillText(l, x + cardW / 2, by + k * fs * 0.75));
      const best = Stats.map(m.id);
      ctx.font = `${Math.max(12, fs * 0.6)}px ${MARKER}`;
      const gold = [0, 1, 2, 3, 4].filter(i => Progress.hasLetter(m.id, i)).length; // only hinted once you've found one
      const line = (best.bestCombo ? `best combo ${fmtScore(best.bestCombo)}` : 'not skated yet') + (gold ? `  ·  ${gold}/5 ★` : '');
      ctx.fillText(line, x + cardW / 2, Math.min(y + cardH - fs * 0.95, by + fs * 1.7));
      if (!Progress.isUnlocked('map', m.id)) this.drawLock(ctx, x, y, cardW, cardH, Progress.lockLevel('map', m.id));
      this.hit(x, y, cardW, cardH, () => this.pickMap(i));
    });
    ctx.font = `${Math.max(13, Math.min(17, w / 70))}px ${HAND}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = INK;
    ctx.fillText('← → pick  ·  Enter skate  ·  Esc back', w / 2, top + rows * (cardH + gap) + 4);
  }

  button(ctx, label, x, y, bw, bh, selected, id, fn) {
    Sketch.seedFor(id);
    const box = [{ x, y }, { x: x + bw, y }, { x: x + bw, y: y + bh }, { x, y: y + bh }];
    Sketch.fill(ctx, box, selected ? '#f4c542' : '#fbf8f0', 2);
    Sketch.stroke(ctx, box, { color: INK, width: selected ? 3.2 : 2.2, amp: 1.2, closed: true });
    markerText(ctx, label, x + bw / 2, y + bh / 2 + 2, Math.min(bh * 0.5, 34), selected ? '#ffffff' : '#f4f1ea', selected ? -0.03 : 0);
    if (fn) this.hit(x, y, bw, bh, fn);
  }

  drawMain(ctx, w, h, time) {
    // the cracked skull logo: beside the title on wide screens, on top of it on tall ones
    const stacked = w < h;
    const size = Math.min(stacked ? w / 6.2 : w / 8, h / 5.5, 140);
    const tilt = -0.06 + Math.sin(time * 3) * 0.015;
    // (the title is about 5.6 × size wide; the skull about 0.87 × its height)
    const skullH = stacked ? size * 1.2 : size * 1.55, side = stacked ? 0 : size * 0.72;
    const tx = w / 2 + side;
    if (stacked) drawSkullLogo(ctx, w / 2, h * 0.2 - size * 0.6 - skullH / 2, skullH, tilt * 1.5);
    else drawSkullLogo(ctx, tx - size * 2.9 - skullH * 0.43, h * 0.2 + size * 0.05, skullH, tilt * 1.5 - 0.08);
    markerText(ctx, 'SHRED HED', tx, h * 0.2, size, '#f4c542', tilt);
    Sketch.seedFor(95);
    Sketch.stroke(ctx, [
      { x: tx - size * 2.5, y: h * 0.2 + size * 0.72 },
      { x: tx + size * 2.3, y: h * 0.2 + size * 0.42 },
    ], { color: '#e2553f', width: size * 0.08, amp: 3 });

    // your level and how close you are to the next one
    const ly = h * 0.2 + size * 0.95;
    const bw = Math.min(320, w - 48), bh = Math.min(54, h * 0.07, (h - ly - 100) / (MAIN_ITEMS.length * 1.28)), gap = bh * 0.28;
    const x = (w - bw) / 2;
    const next = Progress.nextAt();
    markerText(ctx, `LEVEL ${Progress.level}${Progress.everything ? ' ★' : ''}`, x + 52, ly + 9, 20, Progress.everything ? '#f4c542' : '#ffffff', -0.03);
    Sketch.seedFor(96);
    const bar = [{ x: x + 110, y: ly }, { x: x + bw, y: ly }, { x: x + bw, y: ly + 18 }, { x: x + 110, y: ly + 18 }];
    Sketch.fill(ctx, bar, '#fbf8f0', 1);
    const fillW = (bw - 110) * Progress.toNext;
    if (fillW > 2) Sketch.fill(ctx, [{ x: x + 110, y: ly }, { x: x + 110 + fillW, y: ly }, { x: x + 110 + fillW, y: ly + 18 }, { x: x + 110, y: ly + 18 }], '#7fd36b', 1);
    Sketch.stroke(ctx, bar, { color: INK, width: 2, amp: 0.8, closed: true });
    ctx.font = `13px ${HAND}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    ctx.fillText(next ? `${Progress.data.rep} / ${next} rep` : `${Progress.data.rep} rep · max level!`, x + 110 + (bw - 110) / 2, ly + 9);

    const bucksW = drawBucks(ctx, Progress.bucks, w / 2 - 50, ly + 35, 18, '#f4c542');
    ctx.font = `14px ${HAND}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    ctx.fillText('Shred Bucks', w / 2 - 50 + bucksW / 2 + 8, ly + 36);
    const y0 = ly + 52;
    MAIN_ITEMS.forEach((item, i) => {
      this.button(ctx, item, x, y0 + i * (bh + gap), bw, bh, i === this.sel, 100 + i, () => this.choose(i));
      // fresh stock in the shop you haven't looked at yet, and challenges still to do today
      const bob = Math.sin(time * 5) * 2, by = y0 + i * (bh + gap) + 4 + bob, bs = Math.min(20, bh * 0.42);
      if (item === 'SKATE SHOP' && shopSeenDay() !== shopDay()) markerText(ctx, 'NEW!', x + bw - 8, by, bs, '#e2553f', 0.2);
      if (item === 'CHALLENGES' && Challenges.left()) markerText(ctx, `${Challenges.left()} LEFT`, x + bw - 14, by, bs, '#f4c542', 0.2);
    });

    const d = Stats.data;
    ctx.font = `${Math.max(14, Math.min(19, w / 60))}px ${HAND}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = INK;
    ctx.fillText(`best combo ${fmtScore(d.bestCombo)}  ·  ${d.landed} trick${d.landed === 1 ? '' : 's'} landed  ·  ↑ ↓ + Enter, or click`,
      w / 2, y0 + MAIN_ITEMS.length * (bh + gap) + 6);
  }

  // The skater modelling what you're trying on (locked or not). Returns where it's drawn.
  // trail: a combo trail style to show swooping around the model
  // at: { cx, gy, k } to put the model somewhere else (where its feet go, and its size)
  drawPreview(ctx, w, h, dpr, wide, zoom = 1, trail = null, at = null) {
    const p = this.preview;
    const k = zoom * (at ? at.k : Math.min(wide ? h * 0.0042 : h * 0.0026, wide ? w * 0.0026 : w * 0.006));
    const cx = at ? at.cx : wide ? w * 0.3 : w / 2, gy = at ? at.gy : wide ? h * 0.82 : h * 0.47;
    ctx.save();
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * cx - p.pos.x * dpr * k, dpr * gy - p.pos.y * dpr * k);
    Sketch.seedFor(7);
    Sketch.stroke(ctx, [{ x: p.pos.x - 90, y: p.pos.y }, { x: p.pos.x + 90, y: p.pos.y }], { color: INK, width: 3, amp: 1 });
    if (trail) ComboTrail.drawDemo(ctx, p.pos.x, p.pos.y - 55, 72, performance.now() / 1000, trail);
    p.outfit = this.trying;
    drawSkater(ctx, p);
    ctx.restore();
    return { cx, gy };
  }

  drawCloset(ctx, w, h, dpr) {
    const wide = w > h * 1.1;
    markerText(ctx, 'CLOSET', wide ? w * 0.3 : w / 2, Math.min(60, h * 0.09), Math.min(52, w / 9), '#ffffff', -0.04);
    // picking a trail: show it swooping round your skater
    const showTrail = OUTFIT_CATEGORIES[this.row][0] === 'trail' ? OUTFIT_OPTIONS.trail[this.trying.trail] : null;
    const { cx } = this.drawPreview(ctx, w, h, dpr, wide, 1, showTrail);

    this.drawHeldBoard(ctx, w, h, dpr, wide, cx, OUTFIT_CATEGORIES[this.row][0]);

    // category rows
    const rows = OUTFIT_CATEGORIES.length;
    const rx = wide ? w * 0.56 : 16, rw = wide ? Math.min(w * 0.4, 420) : w - 32;
    const top = wide ? h * 0.14 : h * 0.5;
    const rh = Math.min(58, ((wide ? h * 0.7 : h * 0.4)) / rows);
    // short rows (phones): everything on one line, big enough to read
    const compact = rh < 36, fs = compact ? Math.max(13, rh * 0.62) : Math.min(rh * 0.42, 24);
    OUTFIT_CATEGORIES.forEach(([cat, label], i) => {
      const y = top + i * rh, sel = i === this.row;
      Sketch.seedFor(200 + i);
      const box = [{ x: rx, y: y + 2 }, { x: rx + rw, y: y + 2 }, { x: rx + rw, y: y + rh - 2 }, { x: rx, y: y + rh - 2 }];
      Sketch.fill(ctx, box, sel ? '#f4c542' : '#fbf8f0', 1.5);
      Sketch.stroke(ctx, box, { color: INK, width: sel ? 2.8 : 1.8, amp: 1, closed: true });
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = INK;
      ctx.font = `${fs * 0.9}px ${HAND}`;
      ctx.fillText(label, rx + 12, y + rh * (compact ? 0.5 : 0.42));
      if (cat === 'sag') return this.drawFitRow(ctx, FIT_BY_KEY.sag, rx, y, rw, rh, fs, () => { this.row = i; });
      const visible = OUTFIT_OPTIONS[cat].filter(o => Progress.secretOwned(o));
      const opt = OUTFIT_OPTIONS[cat][this.trying[cat]], n = visible.length;
      const locked = !Progress.isUnlocked(cat, opt.name);
      const midX = rx + rw * 0.6;
      const nameSize = this.fitText(ctx, opt.name, rw * 0.5, fs * 0.8, MARKER);
      if (compact) {
        markerText(ctx, locked ? `${opt.name} · LV ${Progress.lockLevel(cat, opt.name)}` : opt.name, midX, y + rh / 2, this.fitText(ctx, opt.name + ' · LV 12', rw * 0.5, fs * 0.8, MARKER), locked ? '#ef9a8f' : '#ffffff');
      } else {
        markerText(ctx, opt.name, midX, y + rh * (locked ? 0.38 : 0.5), nameSize, locked ? '#b9b4aa' : '#ffffff');
        if (locked) markerText(ctx, `locked · level ${Progress.lockLevel(cat, opt.name)}`, midX, y + rh * 0.74, fs * 0.5, '#ef5a4a');
      }
      markerText(ctx, '◀', rx + rw * 0.3, y + rh / 2, fs, '#ffffff');
      markerText(ctx, '▶', rx + rw - 22, y + rh / 2, fs, '#ffffff');
      ctx.font = `${fs * 0.6}px ${HAND}`;
      ctx.fillStyle = INK;
      if (compact) {
        // no room for "3 of 12"; the name tag's label still opens the name to write
        if (cat === 'extra' && opt.type === 'nametag') this.hit(rx, y, rw * 0.24, rh, () => { this.row = i; this.startTagName(); });
      } else if (cat === 'extra' && opt.type === 'nametag') {
        // the name tag: click the label (or press N) to write your name on it
        const caret = this.naming && Math.floor(performance.now() / 400) % 2 ? '|' : '';
        const shown = this.naming ? `${this.trying.tagName}${caret}` : this.trying.tagName ? `"${this.trying.tagName}" · N edit` : 'N: write name';
        ctx.fillStyle = this.naming ? '#e2553f' : INK;
        ctx.fillText(shown, rx + 12, y + rh * 0.74);
        this.hit(rx, y, rw * 0.24, rh, () => { this.row = i; this.startTagName(); });
      } else ctx.fillText(`${visible.indexOf(opt) + 1} of ${n}`, rx + 12, y + rh * 0.74);
      this.hit(rx, y, rw * 0.45, rh, () => this.change(i, -1));
      this.hit(rx + rw * 0.45, y, rw * 0.55, rh, () => this.change(i, 1));
    });

    const by = top + rows * rh + 12, bw = Math.min(160, (rw - 14) / 2), bh = Math.min(50, h * 0.08);
    this.button(ctx, 'FIT', rx + rw / 2 - bw - 7, by, bw, bh, false, 301, () => this.openFit());
    this.button(ctx, 'DONE', rx + rw / 2 + 7, by, bw, bh, false, 300, () => { this.screen = 'main'; });
    ctx.font = `${Math.max(13, fs * 0.65)}px ${HAND}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = INK;
    ctx.fillText('↑ ↓ pick  ·  ← → change  ·  F fit  ·  Esc done', rx + rw / 2, by + bh + 8);
    ctx.fillText('1 / 2 load a saved outfit  ·  Shift + 1 / 2 save', rx + rw / 2, by + bh + 8 + Math.max(15, fs * 0.8));

    // the two saved-outfit slots: beside the skater on wide screens, either side of it on tall ones
    const sw = wide ? Math.min(190, w * 0.15) : Math.min(110, w * 0.25);
    const sh = wide ? Math.min(h * 0.3, sw * 1.45) : Math.min(h * 0.26, sw * 1.75);
    for (let i = 0; i < OUTFIT_SAVE_SLOTS; i++) {
      const sx = wide ? 16 : i ? w - 16 - sw : 16;
      const sy = wide ? h * 0.2 + i * (sh + 14) : h * 0.12;
      this.drawSlot(ctx, i, sx, sy, sw, sh);
    }
  }

  // Picking a board or grip: hold the board up so you can see it properly.
  drawHeldBoard(ctx, w, h, dpr, wide, cx, cat) {
    if (cat !== 'board' && cat !== 'grip' && cat !== 'cutout') return;
    const bk = Math.min(wide ? w * 0.22 : w * 0.4, 360) / DECK_L; // leaves room for the saved-outfit slots
    const by = wide ? h * 0.25 : h * 0.15, rock = Math.sin(performance.now() / 700) * 0.12;
    // turned face-on to the camera: grip side for grip, the graphic for boards
    const roll = Math.PI / 2 - CAM_TILT + (cat === 'board' ? Math.PI : 0) + rock;
    ctx.save();
    ctx.setTransform(dpr * bk, 0, 0, dpr * bk, dpr * cx, dpr * by);
    Outfit.override = this.trying;
    drawBoard(ctx, { cx: 0, cy: 0, ang: 0, facing: 1, roll, yaw: rock * 0.5, pitch: 0, pivotL: 0, pivotN: 0 });
    Outfit.override = null;
    ctx.restore();
  }

  // The Skate Shop: things you can't get anywhere else, for Shred Bucks. Yours for good once bought.
  // A shop front (awning, sign, a wall of plank boards), the thing you're looking at on your skater
  // in the window, and everything else hanging on the wall as cards with price tags.
  drawShop(ctx, w, h, dpr) {
    const wide = w > h * 1.1, now = performance.now() / 1000;
    const today = this.shopStock(), item = today.items[this.shopSel];
    // (on a narrow screen the sign moves over to make room for your Shred Bucks)
    const { bottom: signBottom, mid } = this.drawShopFront(ctx, w, h, now, wide ? w / 2 : w * 0.47, wide ? Math.min(560, w * 0.48) : w * 0.46);
    this.drawWallet(ctx, w - 12, mid, Math.min(24, w / 17), w > 700);
    // a way back for when there's no Esc key (phones)
    this.fancyButton(ctx, wide ? '◀ BACK' : '◀', 12, mid - 20, wide ? 124 : 52, 40, '#fbf8f0', 652, () => this.back());
    // when the stock changes next (every day at 12:00 PM)
    const left = Math.max(0, today.nextAt - Date.now()), hrs = Math.floor(left / 3.6e6), mins = Math.floor((left % 3.6e6) / 6e4), secs = Math.floor((left % 6e4) / 1000);
    const when = hrs ? `${hrs}h ${String(mins).padStart(2, '0')}m` : `${mins}m ${String(secs).padStart(2, '0')}s`;
    markerText(ctx, `ALL-NEW SHOP IN ${when}`, wide ? w / 2 : w * 0.47, signBottom + 12, Math.min(16, w / 26), '#ffffff', -0.01);

    // the window: your skater wearing it, its name, price and the big button
    const pad = 16, top = signBottom + (wide ? 10 : 26); // (room under the sign for the countdown)
    const panel = wide
      ? { x: pad, y: top, w: Math.min(w * 0.34, 430), h: h - top - pad }
      : { x: pad, y: top, w: w - pad * 2, h: Math.min(h * 0.34, 330) };
    this.drawShopWindow(ctx, item, panel, w, h, dpr, wide, now);

    // the wall of cards
    const grid = wide
      ? { x: panel.x + panel.w + 22, y: top + 6, w: w - panel.x - panel.w - 22 - pad, h: h - top - 6 - 46 }
      : { x: pad, y: panel.y + panel.h + 12, w: w - pad * 2, h: h - panel.y - panel.h - 12 - 40 };
    this.drawShopWall(ctx, grid, dpr, now);

    ctx.font = `${Math.max(12, Math.min(16, w / 70))}px ${HAND}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = INK;
    const hint = wide ? 'arrows pick  ·  Enter buy (twice to be sure)  ·  Esc back' : 'tap to pick · tap again to buy · Esc back';
    ctx.fillText(hint, grid.x + grid.w / 2, h - (wide ? 36 : 30));
    if (wide) ctx.fillText('earn Shred Bucks from combos, new tricks, golden letters, level ups and S.K.A.T.E.', grid.x + grid.w / 2, h - 18);
    this.drawConfetti(ctx);
  }

  // Your Shred Bucks, on a dark badge. x: its right edge.
  drawWallet(ctx, x, y, size, label) {
    ctx.font = `${size}px ${MARKER}`;
    const tw = ctx.measureText(fmtScore(Progress.bucks)).width;
    ctx.font = `${size * 0.55}px ${HAND}`;
    const lw = label ? ctx.measureText('SHRED BUCKS').width + 12 : 0;
    const bw = 10 + size * 1.26 + tw + lw + 12, bh = size * 1.55;
    Sketch.seedFor(660);
    const box = [{ x: x - bw, y: y - bh / 2 }, { x, y: y - bh / 2 }, { x, y: y + bh / 2 }, { x: x - bw, y: y + bh / 2 }];
    Sketch.fill(ctx, box, '#26262b', 1.5);
    Sketch.stroke(ctx, box, { color: '#f4c542', width: 2.4, amp: 0.8, closed: true });
    drawBucks(ctx, Progress.bucks, x - bw + 10, y, size, '#f4c542', 'left');
    if (label) {
      ctx.font = `${size * 0.55}px ${HAND}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f4f1ea';
      ctx.fillText('SHRED BUCKS', x - 10, y + 1);
    }
  }

  // Stripy awning, a sign hanging off it (centred on sx, sWide across), and plank boards on the
  // wall. Returns where the sign's middle and bottom are.
  drawShopFront(ctx, w, h, now, sx, sWide) {
    // plank wall
    ctx.fillStyle = '#ead7b2';
    ctx.fillRect(0, 0, w, h);
    const pw = 54;
    for (let x = 0, i = 0; x < w; x += pw, i++) {
      if (i % 3 === 1) { ctx.fillStyle = 'rgba(160, 110, 60, 0.07)'; ctx.fillRect(x, 0, pw, h); }
      Sketch.seedFor(700 + i);
      Sketch.stroke(ctx, [{ x, y: 0 }, { x, y: h }], { color: 'rgba(120, 82, 44, 0.35)', width: 1.6, amp: 0.8, maxLen: 60 });
      for (const ny of [h * 0.18, h * 0.62]) { ctx.fillStyle = 'rgba(90, 60, 30, 0.35)'; ctx.fillRect(x + 7, ny + (i % 2) * 9, 2.5, 2.5); }
    }
    // awning
    const ah = Math.max(34, Math.min(58, h * 0.065)), sw = Math.max(34, Math.min(60, w / 16));
    for (let x = 0, i = 0; x < w + sw; x += sw, i++) {
      ctx.fillStyle = i % 2 ? '#fbf8f0' : '#e2553f';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + sw, 0);
      ctx.lineTo(x + sw, ah);
      ctx.arc(x + sw / 2, ah, sw / 2, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
    }
    Sketch.seedFor(690);
    const edge = [];
    for (let x = 0; x <= w + sw; x += sw / 6) {
      const k = ((x % sw) + sw) % sw / sw;
      edge.push({ x, y: ah + Math.sin(k * Math.PI) * sw / 2 });
    }
    Sketch.stroke(ctx, edge, { color: INK, width: 2.4, amp: 0.6, maxLen: 0 });
    Sketch.stroke(ctx, [{ x: 0, y: ah * 0.2 }, { x: w, y: ah * 0.2 }], { color: 'rgba(30,30,30,0.25)', width: 2, amp: 0.6 });

    // the sign, swinging a little on two ropes
    const sH = Math.max(48, Math.min(84, h * 0.1, sWide * 0.2));
    const sy = ah + sw / 2 + 14 + sH / 2, swing = Math.sin(now * 1.3) * 0.012;
    ctx.save();
    ctx.translate(sx, ah);
    ctx.rotate(swing);
    ctx.translate(-sx, -ah);
    for (const rx of [sx - sWide * 0.34, sx + sWide * 0.34]) Sketch.stroke(ctx, [{ x: rx, y: ah * 0.6 }, { x: rx, y: sy - sH / 2 + 4 }], thin('#7a5530', 2.4));
    // a deck-shaped sign: rounded ends like a skateboard
    const r = sH / 2;
    ctx.fillStyle = '#26262b';
    ctx.beginPath();
    ctx.moveTo(sx - sWide / 2 + r, sy - r);
    ctx.lineTo(sx + sWide / 2 - r, sy - r);
    ctx.arc(sx + sWide / 2 - r, sy, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(sx - sWide / 2 + r, sy + r);
    ctx.arc(sx - sWide / 2 + r, sy, r, Math.PI / 2, Math.PI * 1.5);
    ctx.fill();
    ctx.strokeStyle = '#f4c542';
    ctx.lineWidth = 3;
    ctx.stroke();
    drawSkullLogo(ctx, sx - sWide / 2 + r + 6, sy, sH * 0.72, -0.15);
    drawSkullLogo(ctx, sx + sWide / 2 - r - 6, sy, sH * 0.72, 0.15);
    markerText(ctx, 'SKATE SHOP', sx, sy + 2, Math.min(sH * 0.62, (sWide - sH * 1.7) / 6.2), '#f4c542', -0.02);
    ctx.restore();
    return { mid: sy, bottom: sy + sH / 2 };
  }

  // The window: the thing you're looking at on your skater, on a little stand.
  drawShopWindow(ctx, item, p, w, h, dpr, wide, now) {
    drawCard(ctx, p.x, p.y, p.w, p.h, 640);
    const owned = Progress.owns(item), wearing = owned && Outfit.pick[item.cat] === OUTFIT_OPTIONS[item.cat].indexOf(item);
    const price = shopPrice(item, this.today), afford = Progress.bucks >= price, deal = this.today.deal === item;
    // the model: big in a wide window, beside the words in a short one
    const modelW = wide ? p.w : p.w * 0.45, modelH = wide ? p.h * 0.52 : p.h - 20;
    const cx = p.x + modelW / 2, gy = p.y + (wide ? modelH + 24 : p.h - 22), k = Math.min(modelH / 150, modelW / 140);
    ctx.fillStyle = 'rgba(244, 197, 66, 0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, gy - modelH * 0.45, modelW * 0.42, modelH * 0.52, 0, 0, TAU); // a spotlight
    ctx.fill();
    Sketch.seedFor(641);
    Sketch.shape(ctx, [{ x: cx - modelW * 0.36, y: gy + 2 }, { x: cx + modelW * 0.36, y: gy + 2 }, { x: cx + modelW * 0.32, y: gy + 14 }, { x: cx - modelW * 0.32, y: gy + 14 }], '#b98a52', { color: INK, width: 2, amp: 0.4 });
    this.trying = this.shopLook();
    this.drawPreview(ctx, w, h, dpr, wide, 1, item.cat === 'trail' ? item : null, { cx, gy, k });
    this.shopModelAt = { x: cx, y: gy - 60 * k };
    if (item.cat === 'board' || item.cat === 'grip') {
      // hold the board up so you can see it properly
      const bk = (modelW * 0.7) / DECK_L, rock = Math.sin(now * 1.4) * 0.12;
      ctx.save();
      ctx.setTransform(dpr * bk, 0, 0, dpr * bk, dpr * cx, dpr * (p.y + (wide ? p.h * 0.12 : p.h * 0.16)));
      Outfit.override = this.trying;
      drawBoard(ctx, { cx: 0, cy: 0, ang: 0, facing: 1, roll: Math.PI / 2 - CAM_TILT + (item.cat === 'board' ? Math.PI : 0) + rock, yaw: rock * 0.5, pitch: 0, pivotL: 0, pivotN: 0 });
      Outfit.override = null;
      ctx.restore();
    }
    if (this.sold) {
      const t = this.sold.t, s = 1 + 1.4 * Math.exp(-t * 9);
      ctx.globalAlpha = clamp((2.4 - t) / 0.5, 0, 1);
      markerText(ctx, 'YOURS!', cx, gy - modelH * 0.5, Math.min(64, modelW / 3.2), '#7fd36b', -0.18, s);
      ctx.globalAlpha = 1;
    }

    // the words
    const tx = wide ? p.x + p.w / 2 : p.x + modelW + (p.w - modelW) / 2, tw = wide ? p.w - 30 : p.w - modelW - 16;
    let y = wide ? gy + 34 : p.y + 24;
    const nameSize = this.fitText(ctx, item.name, tw, Math.min(wide ? 36 : 26, w / 14), MARKER);
    markerText(ctx, item.name, tx, y, nameSize, '#ffffff', -0.02);
    y += nameSize * 0.95;
    ctx.font = `${Math.max(13, Math.min(18, w / 60))}px ${HAND}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    const line = `${CATEGORY_LABEL[item.cat] || item.cat}  ·  ${SHOP_TAGLINES[`${item.cat}:${item.name}`] || 'only in the Skate Shop'}`;
    const lh = Math.max(15, Math.min(21, w / 52));
    y += lh * this.wrapText(ctx, line, tx, y, tw, lh).length + 8;
    if (!owned && item.until) {
      // a limited-time freebie: when it goes
      const ends = new Date(limitedEnds(item)), when = ends.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      markerText(ctx, 'FREE', tx, y + 10, Math.min(34, w / 18), '#7fd36b', -0.03);
      ctx.font = `${Math.max(12, Math.min(16, w / 70))}px ${HAND}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e2553f';
      ctx.fillText(`leaves the shop after ${when} · yours for good if you grab it`, tx, y + 34);
      y += 44;
      markerText(ctx, 'HALLOWEEN · LIMITED TIME', tx, p.y + 18, Math.min(22, w / 30), '#ff8c1a', -0.04);
    } else if (!owned) {
      const size = Math.min(30, w / 20);
      if (deal) {
        // today's deal: the usual price crossed out, then the deal price
        const old = fmtScore(item.shop);
        ctx.font = `${size * 0.6}px ${MARKER}`;
        const ow = ctx.measureText(old).width;
        ctx.font = `${size}px ${MARKER}`;
        const nw = size * 1.26 + ctx.measureText(fmtScore(price)).width, left = tx - (ow + 14 + nw) / 2;
        markerText(ctx, old, left + ow / 2, y + 8, size * 0.6, '#b9b4aa');
        Sketch.stroke(ctx, [{ x: left - 3, y: y + 11 }, { x: left + ow + 3, y: y + 5 }], thin('#e2553f', 2.6));
        drawBucks(ctx, price, left + ow + 14, y + 8, size, afford ? '#7fd36b' : '#ef5a4a', 'left');
      } else drawBucks(ctx, price, tx, y + 8, size, afford ? '#f4c542' : '#ef5a4a');
      y += 30;
    }
    if (deal && !owned) markerText(ctx, `DAILY DEAL · ${Math.round(SHOP_DEAL_OFF * 100)}% OFF`, tx, p.y + 18, Math.min(22, w / 30), '#e2553f', -0.04);
    else y += 6;

    // the big button
    const bw = Math.min(tw, 300), bh = Math.max(44, Math.min(58, h * 0.07)), bx = tx - bw / 2, by = Math.min(y + 8, p.y + p.h - bh - 12);
    const pulse = 1 + Math.sin(now * 8) * 0.03;
    const look = wearing ? ['WEARING IT', '#e7eef3'] : owned ? ['WEAR IT', '#7fd36b']
      : !afford ? [`NEED ${fmtScore(price - Progress.bucks)} MORE`, '#d9d5cb']
      : price === 0 ? ['GET IT FREE', '#7fd36b']
      : this.shopConfirm ? ['SURE? TAP AGAIN', '#f4c542'] : ['BUY IT', '#7fd36b'];
    this.fancyButton(ctx, look[0], bx, by, bw, bh, look[1], 650, () => this.shopPick(), this.shopConfirm ? pulse : 1);
  }

  // The wall of cards, scrolled so the one you've picked is always in view.
  drawShopWall(ctx, wall, dpr, now) {
    // room above and below for the "more" arrows
    const g = { x: wall.x, y: wall.y + 22, w: wall.w, h: wall.h - 44 };
    const stock = this.today.items, gap = 14;
    // the biggest cards that still fit everything on the wall (or, if nothing does, 3 across and scroll)
    let cols = 3, cw = 0, ch = 0;
    for (let c = 2; c <= 6; c++) {
      const w0 = Math.min(240, (g.w - gap * (c - 1)) / c), h0 = w0 * 1.2, r0 = Math.ceil(stock.length / c);
      if (r0 * (h0 + gap) - gap <= g.h && w0 > cw) { cols = c; cw = w0; ch = h0; }
    }
    if (!cw) { cols = clamp(Math.floor(g.w / 150), 3, 6); cw = (g.w - gap * (cols - 1)) / cols; ch = cw * 1.2; }
    if (ch > g.h) { ch = Math.max(80, g.h); cw = Math.min(cw, ch / 1.2); } // short screens: at least a row
    // centre the cards on the wall
    g.x += (g.w - (cw * cols + gap * (cols - 1))) / 2;
    const rows = Math.ceil(stock.length / cols), show = Math.max(1, Math.floor((g.h + gap) / (ch + gap)));
    this.shopCols = cols;
    const selRow = Math.floor(this.shopSel / cols);
    this.shopTop = clamp(this.shopTop ?? 0, Math.max(0, selRow - show + 1), Math.min(selRow, Math.max(0, rows - show)));
    for (let r = 0; r < show && this.shopTop + r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = (this.shopTop + r) * cols + c;
        if (i >= stock.length) break;
        this.drawShopCard(ctx, stock[i], g.x + c * (cw + gap), g.y + r * (ch + gap), cw, ch, i === this.shopSel, dpr, i, now);
      }
    }
    // more up or down the wall
    const arrow = (label, y, dir) => {
      markerText(ctx, label, g.x + g.w / 2, y, 22, '#ffffff');
      this.hit(g.x + g.w / 2 - 40, y - 16, 80, 32, () => this.shopMove(dir * cols));
    };
    if (this.shopTop > 0) arrow('▲ more', wall.y + 8, -1);
    if (this.shopTop + show < rows) arrow('▼ more', g.y + show * (ch + gap) - gap + 14, 1);
  }

  drawShopCard(ctx, it, x, y, cw, ch, sel, dpr, i, now) {
    const owned = Progress.owns(it), wearing = owned && Outfit.pick[it.cat] === OUTFIT_OPTIONS[it.cat].indexOf(it);
    const price = shopPrice(it, this.today), afford = Progress.bucks >= price, deal = this.today.deal === it;
    const lift = sel ? 5 + Math.sin(now * 4) * 1.5 : 0;
    y -= lift;
    const rect = (x0, y0, w0, h0) => [{ x: x0, y: y0 }, { x: x0 + w0, y: y0 }, { x: x0 + w0, y: y0 + h0 }, { x: x0, y: y0 + h0 }];
    ctx.fillStyle = 'rgba(60, 40, 20, 0.22)';
    ctx.fillRect(x + 5, y + 7 + lift, cw, ch);
    Sketch.seedFor(600 + i);
    Sketch.fill(ctx, rect(x, y, cw, ch), sel ? '#fff4c2' : '#fbf8f0', 1.5);
    // the picture
    const px = x + 7, py = y + 7, pw = cw - 14, ph = ch * 0.66;
    ctx.fillStyle = SHOP_TINT[it.cat] || '#efe6d6';
    ctx.fillRect(px, py, pw, ph);
    if (it.cat === 'trail') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(px, py, pw, ph);
      ctx.clip();
      ctx.translate(px + pw / 2, py + ph / 2);
      const s = Math.min(pw, ph) * 0.4 / 72;
      ctx.scale(s, s);
      ComboTrail.drawDemo(ctx, 0, 0, 72, now + i, it);
      ctx.restore();
    } else ctx.drawImage(this.shopThumb(it, pw, ph, dpr), px, py, pw, ph);
    Sketch.stroke(ctx, rect(px, py, pw, ph), { ...thin(INK, 1.3), closed: true });
    if (sel) Sketch.stroke(ctx, rect(x - 2, y - 2, cw + 4, ch + 4), { color: '#f4c542', width: 6, amp: 0.8, closed: true });
    Sketch.stroke(ctx, rect(x, y, cw, ch), { color: INK, width: sel ? 3.2 : 2, amp: 1, closed: true });
    // its name
    const ny = py + ph + (ch - ph - 7) / 2;
    markerText(ctx, it.name, x + cw / 2, ny, this.fitText(ctx, it.name, cw - 14, Math.min(20, cw * 0.12), MARKER), '#ffffff');
    // the price tag, tied on at the corner
    const tagW = Math.max(60, cw * 0.48), tagH = Math.max(26, cw * 0.2);
    ctx.save();
    ctx.translate(x + cw - tagW / 2 + 6, y + tagH / 2 - 2);
    ctx.rotate(0.16);
    Sketch.seedFor(800 + i);
    const tag = [{ x: -tagW / 2, y: 0 }, { x: -tagW / 2 + tagH / 2, y: -tagH / 2 }, { x: tagW / 2, y: -tagH / 2 }, { x: tagW / 2, y: tagH / 2 }, { x: -tagW / 2 + tagH / 2, y: tagH / 2 }];
    Sketch.shape(ctx, tag, owned ? '#7fd36b' : afford ? '#f4c542' : '#f1a59a', { color: INK, width: 1.6, amp: 0.3 });
    Sketch.circle(ctx, -tagW / 2 + tagH * 0.42, 0, 2.2, '#fbf8f0', { width: 1 });
    if (owned) {
      const s = tagH * 0.3;
      Sketch.stroke(ctx, [{ x: -s * 0.4, y: 0 }, { x: s * 0.2, y: s * 0.6 }, { x: s * 1.5, y: -s * 0.8 }], thin(INK, 2.6));
    } else if (price === 0) markerText(ctx, 'FREE', tagH * 0.22, 0.5, tagH * 0.56, '#ffffff');
    else drawBucks(ctx, price, tagH * 0.22, 0.5, tagH * 0.56, '#ffffff');
    ctx.restore();
    // a ribbon across the top-left corner: today's deal, or a limited-time freebie
    const ribbon = (text, color) => {
      ctx.save();
      ctx.translate(x + cw * 0.17, y + cw * 0.17);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = color;
      ctx.fillRect(-cw * 0.32, -10, cw * 0.64, 20);
      markerText(ctx, text, 0, 1, Math.min(14, cw * 0.09), '#ffffff');
      ctx.restore();
    };
    if (owned) markerText(ctx, wearing ? 'WEARING' : 'OWNED', px + pw / 2, py + ph * 0.84, Math.min(18, cw * 0.11), '#7fd36b', -0.14);
    else if (it.until) ribbon('HALLOWEEN', '#ff8c1a');
    else if (deal) ribbon(`${Math.round(SHOP_DEAL_OFF * 100)}% OFF`, '#e2553f');
    // a twinkle on the one you've picked
    if (sel) for (let k = 0; k < 3; k++) {
      const a = now * 2 + k * 2.1, tw = Math.max(0, Math.sin(now * 5 + k * 1.7));
      const sx = x + cw / 2 + Math.cos(a) * cw * 0.45, sy = y + ch * 0.35 + Math.sin(a * 1.3) * ch * 0.38, s = 3 + 5 * tw;
      ctx.strokeStyle = `rgba(255, 246, 200, ${tw})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx - s, sy); ctx.lineTo(sx + s, sy); ctx.moveTo(sx, sy - s); ctx.lineTo(sx, sy + s);
      ctx.stroke();
    }
    this.hit(x, y, cw, ch, () => {
      if (this.shopSel === i) return this.shopPick(i);
      this.shopSel = i;
      this.shopConfirm = false;
      Sound.play('menuMove');
    });
  }

  // A card's picture: the thing on your skater, zoomed in on where it goes (a board, grip held
  // face on). Drawn once and kept, since there are lots of cards.
  shopThumb(it, tw, th, dpr) {
    const look = { ...Outfit.pick, [it.cat]: OUTFIT_OPTIONS[it.cat].indexOf(it) };
    const key = `${it.cat}:${it.name}:${Math.round(tw)}x${Math.round(th)}@${dpr}:${JSON.stringify(Outfit.pick)}`;
    this.thumbs ||= new Map();
    let c = this.thumbs.get(key);
    if (c) return c;
    if (this.thumbs.size > 150) this.thumbs.clear();
    c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(tw * dpr));
    c.height = Math.max(1, Math.ceil(th * dpr));
    const g = c.getContext('2d');
    if (it.cat === 'board' || it.cat === 'grip') {
      const k = (tw * 0.82) / DECK_L;
      g.setTransform(dpr * k, 0, 0, dpr * k, dpr * tw / 2, dpr * th / 2);
      Outfit.override = look;
      drawBoard(g, { cx: 0, cy: 0, ang: -0.32, facing: 1, roll: Math.PI / 2 - CAM_TILT + (it.cat === 'board' ? Math.PI : 0), yaw: 0, pitch: 0, pivotL: 0, pivotN: 0 });
      Outfit.override = null;
    } else {
      const m = this.thumbModel ||= new Skater(this.preview.terrain);
      // a dark top so jewellery and capes stand out
      if (it.cat === 'extra') look.top = OUTFIT_OPTIONS.top.findIndex(o => o.name === 'Black Hoodie');
      m.outfit = look;
      const { at, size } = this.shopFocus(it, riderPose(m).fig, m);
      const k = th / size;
      g.setTransform(dpr * k, 0, 0, dpr * k, dpr * (tw / 2 - at.x * k), dpr * (th / 2 - at.y * k));
      drawSkater(g, m);
    }
    this.thumbs.set(key, c);
    return c;
  }

  // Where on the skater a shop card zooms in for a thing, and how much of you fits (top to bottom).
  shopFocus(it, f, m) {
    const feet = mix(f.legs.front.foot, f.legs.back.foot, 0.5);
    if (it.cat === 'hat') return { at: add(f.head, f.torsoDir, 3), size: 44 };
    if (it.cat === 'top') return { at: mix(f.hip, f.neck, 0.5), size: 60 };
    if (it.cat === 'pants') return { at: mix(f.hip, feet, 0.45), size: 72 };
    if (it.cat === 'shoes') return { at: add(feet, f.torsoDir, 2), size: 34 };
    if (it.cat === 'extra') {
      if (it.type === 'shades') return { at: f.head, size: 32 };
      if (it.type === 'chain') return { at: mix(f.neck, f.hip, 0.25), size: 42 };
      if (it.type === 'axe') return { at: add(f.head, f.torsoDir, 8), size: 56 };
      return { at: mix(f.shoulder, f.hip, 0.4), size: 90 };
    }
    return { at: mix(m.pos, f.head, 0.5), size: 134 }; // a skin: all of you
  }

  // A button in any colour, that can throb a little.
  fancyButton(ctx, label, x, y, bw, bh, fill, id, fn, scale = 1) {
    ctx.save();
    ctx.translate(x + bw / 2, y + bh / 2);
    ctx.scale(scale, scale);
    ctx.translate(-x - bw / 2, -y - bh / 2);
    ctx.fillStyle = 'rgba(40, 30, 20, 0.25)';
    ctx.fillRect(x + 4, y + 5, bw, bh);
    Sketch.seedFor(id);
    const box = [{ x, y }, { x: x + bw, y }, { x: x + bw, y: y + bh }, { x, y: y + bh }];
    Sketch.fill(ctx, box, fill, 2);
    Sketch.stroke(ctx, box, { color: INK, width: 3, amp: 1.2, closed: true });
    markerText(ctx, label, x + bw / 2, y + bh / 2 + 2, this.fitText(ctx, label, bw - 20, Math.min(bh * 0.5, 30), MARKER), '#ffffff', -0.02);
    ctx.restore();
    if (fn) this.hit(x, y, bw, bh, fn);
  }

  // The biggest size (up to `size`) that fits `text` in `maxW`.
  fitText(ctx, text, maxW, size, font) {
    ctx.font = `${size}px ${font}`;
    const w0 = ctx.measureText(text).width * 1.08;
    return w0 > maxW ? Math.max(9, size * (maxW / w0)) : size;
  }

  // Lines of handwriting (in the current font), wrapped to maxW. Returns the lines.
  wrapText(ctx, text, x, y, maxW, lh) {
    const lines = [''];
    for (const word of text.split(' ')) {
      const test = (lines[lines.length - 1] + ' ' + word).trim();
      if (ctx.measureText(test).width > maxW && lines[lines.length - 1]) lines.push(word); else lines[lines.length - 1] = test;
    }
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
    return lines;
  }

  // One saved-outfit card: a little model wearing it (click it to put it on) and a SAVE button.
  drawSlot(ctx, i, x, y, cw, ch) {
    const saved = Outfit.saves[i];
    const same = saved && Object.keys(saved).every(k => saved[k] === this.trying[k]);
    const bh = Math.min(30, ch * 0.2), cardH = ch - bh - 6;
    Sketch.seedFor(360 + i);
    const box = [{ x, y }, { x: x + cw, y }, { x: x + cw, y: y + cardH }, { x, y: y + cardH }];
    Sketch.fill(ctx, box, same ? '#f4c542' : '#fbf8f0', 1.5);
    Sketch.stroke(ctx, box, { color: INK, width: same ? 2.8 : 1.8, amp: 1, closed: true });
    markerText(ctx, `SLOT ${i + 1}`, x + cw / 2, y + 14, Math.min(18, cw * 0.14), '#ffffff', -0.02);
    if (saved) {
      if (!this.slotModel) { this.slotModel = new Skater(this.preview.terrain); this.slotModel.crouch = 0.2; }
      const m = this.slotModel;
      const k = Math.min((cardH - 30) / 125, cw / 95);
      ctx.save();
      ctx.translate(x + cw / 2, y + cardH - 8);
      ctx.scale(k, k);
      ctx.translate(-m.pos.x, -m.pos.y);
      m.outfit = saved;
      drawSkater(ctx, m);
      ctx.restore();
      this.hit(x, y, cw, cardH, () => this.loadOutfit(i));
    } else {
      ctx.font = `${Math.min(15, cw * 0.11)}px ${HAND}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = INK;
      ctx.fillText('empty', x + cw / 2, y + cardH / 2);
    }
    this.button(ctx, 'SAVE', x, y + cardH + 6, cw, bh, false, 370 + i, () => this.saveOutfit(i));
  }

  // Fit: how your clothes sit on you, with a slider for each.
  drawFit(ctx, w, h, dpr) {
    const wide = w > h * 1.1;
    markerText(ctx, 'FIT', wide ? w * 0.3 : w / 2, Math.min(60, h * 0.09), Math.min(52, w / 9), '#ffffff', -0.04);
    this.drawPreview(ctx, w, h, dpr, wide, wide ? 1.15 : 0.95);
    const rows = FIT_SLIDERS.length;
    const rx = wide ? w * 0.56 : 16, rw = wide ? Math.min(w * 0.4, 420) : w - 32;
    const top = wide ? h * 0.16 : h * 0.52;
    const rh = Math.min(64, ((wide ? h * 0.62 : h * 0.34)) / rows);
    const fs = Math.min(rh * 0.42, 24);
    FIT_SLIDERS.forEach((f, i) => {
      const y = top + i * rh, sel = i === this.fitRow;
      Sketch.seedFor(320 + i);
      const box = [{ x: rx, y: y + 3 }, { x: rx + rw, y: y + 3 }, { x: rx + rw, y: y + rh - 3 }, { x: rx, y: y + rh - 3 }];
      Sketch.fill(ctx, box, sel ? '#f4c542' : '#fbf8f0', 1.5);
      Sketch.stroke(ctx, box, { color: INK, width: sel ? 2.8 : 1.8, amp: 1, closed: true });
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = INK;
      ctx.font = `${fs * 0.9}px ${HAND}`;
      ctx.fillText(f.label, rx + 12, y + rh * 0.42);
      this.drawFitRow(ctx, f, rx, y, rw, rh, fs, () => { this.fitRow = i; });
    });
    const by = top + rows * rh + 12, bw = Math.min(160, (rw - 14) / 2), bh = Math.min(50, h * 0.08);
    this.button(ctx, 'RESET', rx + rw / 2 - bw - 7, by, bw, bh, false, 340, () => {
      for (const f of FIT_SLIDERS) this.setFit(f.key, f.normal);
    });
    this.button(ctx, 'BACK', rx + rw / 2 + 7, by, bw, bh, false, 341, () => this.closeFit());
    ctx.font = `${Math.max(13, fs * 0.65)}px ${HAND}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = INK;
    ctx.fillText('↑ ↓ pick  ·  ← → or drag to adjust  ·  Esc back', rx + rw / 2, by + bh + 8);
  }

  // A slider row (the label is already drawn): drag the knob, click along the bar, or press ← →.
  drawFitRow(ctx, f, rx, y, rw, rh, fs, select) {
    const v = this.trying[f.key], span = f.max - f.min;
    const x0 = rx + rw * 0.36, x1 = rx + rw - 30, cy = y + rh * 0.45;
    (this.fitBars ||= {})[f.key] = { x: x0, w: x1 - x0, min: f.min, max: f.max };
    Sketch.seedFor(260);
    Sketch.stroke(ctx, [{ x: x0, y: cy }, { x: x1, y: cy }], { color: INK, width: 4, amp: 0.6 });
    for (let k = f.min; k <= f.max; k++) {
      const tx = x0 + ((x1 - x0) * (k - f.min)) / span, mid = k === f.normal;
      Sketch.stroke(ctx, [{ x: tx, y: cy - (mid ? 7 : 4) }, { x: tx, y: cy + (mid ? 7 : 4) }], thin(INK, mid ? 2 : 1.2));
    }
    const kx = x0 + ((x1 - x0) * (v - f.min)) / span;
    Sketch.circle(ctx, kx, cy, Math.min(11, rh * 0.22), this.dragging === f.key ? '#ef5a4a' : '#ffffff', { width: 2.2 });
    ctx.font = `${fs * 0.5}px ${HAND}`;
    ctx.fillStyle = INK;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(f.ends[0], x0 - 6, cy + 9);
    ctx.textAlign = 'right';
    ctx.fillText(f.ends[1], x1 + 6, cy + 9);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `${fs * 0.6}px ${HAND}`;
    ctx.fillText(fitWords(f, v), rx + 12, y + rh * 0.74);
    this.hit(rx + rw * 0.3, y, rw * 0.7, rh, x => {
      select();
      this.dragging = f.key;
      this.setFit(f.key, f.min + ((x - x0) / (x1 - x0)) * span);
    });
  }

  // Today's three challenges: how far you've got, what they pay, and when new ones come.
  drawChallenges(ctx, w, h) {
    markerText(ctx, 'DAILY CHALLENGES', w / 2, Math.min(60, h * 0.09), Math.min(52, w / 11), '#f4c542', -0.04);
    const list = Challenges.today(), now = performance.now() / 1000;
    const cw = Math.min(w - 32, 640), chh = Math.max(84, Math.min(124, (h * 0.6) / 3)), x = (w - cw) / 2, top = Math.min(118, h * 0.16);
    const TIER_COLOR = ['#7fd36b', '#f4c542', '#e2553f'];
    list.forEach((c, i) => {
      const y = top + i * (chh + 14);
      Sketch.seedFor(720 + i);
      const box = [{ x, y }, { x: x + cw, y }, { x: x + cw, y: y + chh }, { x, y: y + chh }];
      ctx.fillStyle = 'rgba(40, 30, 20, 0.2)';
      ctx.fillRect(x + 5, y + 6, cw, chh);
      Sketch.fill(ctx, box, c.done ? '#e3f3d6' : '#fbf8f0', 2);
      Sketch.stroke(ctx, box, { color: INK, width: 2.2, amp: 1, closed: true });
      // EASY / MEDIUM / HARD
      const tag = [{ x: x + 14, y: y + 12 }, { x: x + 112, y: y + 12 }, { x: x + 104, y: y + 40 }, { x: x + 14, y: y + 40 }];
      Sketch.shape(ctx, tag, TIER_COLOR[c.tier], { color: INK, width: 1.8, amp: 0.4 });
      markerText(ctx, CHALLENGE_TIER[c.tier], x + 60, y + 27, 18, '#ffffff');
      // what to do (the reward gets the right-hand part of the card)
      const rw = Math.min(184, cw * 0.28), textW = cw - rw - 30;
      const size = this.fitText(ctx, c.text, textW, Math.min(30, chh * 0.3), MARKER);
      ctx.font = `${size}px ${MARKER}`;
      markerText(ctx, c.text, x + 18 + ctx.measureText(c.text).width / 2, y + chh * 0.6, size, '#ffffff', -0.01);
      // how far (for the ones you count up)
      if (c.goal > 1) {
        const bx = x + 18, bw = textW - 8, by = y + chh - 20, f = c.prog / c.goal;
        Sketch.seedFor(730 + i);
        const bar = [{ x: bx, y: by }, { x: bx + bw, y: by }, { x: bx + bw, y: by + 10 }, { x: bx, y: by + 10 }];
        Sketch.fill(ctx, bar, '#ece6d8', 1);
        if (f > 0) Sketch.fill(ctx, [{ x: bx, y: by }, { x: bx + bw * f, y: by }, { x: bx + bw * f, y: by + 10 }, { x: bx, y: by + 10 }], TIER_COLOR[c.tier], 1);
        Sketch.stroke(ctx, bar, { color: INK, width: 1.6, amp: 0.5, closed: true });
        ctx.font = `14px ${HAND}`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = INK;
        ctx.fillText(`${c.prog} / ${c.goal}`, bx + bw, by - 2);
      }
      // what it pays, or DONE
      if (c.done) markerText(ctx, 'DONE!', x + cw - rw / 2 - 6, y + chh / 2, Math.min(40, chh * 0.38, rw / 2.6), '#7fd36b', -0.18, 1 + Math.sin(now * 3 + i) * 0.03);
      else drawBucks(ctx, `+${c.reward}`, x + cw - rw / 2 - 6, y + chh / 2, Math.min(32, chh * 0.3, rw / 3.6), '#f4c542');
    });
    const ends = shopToday().nextAt - Date.now(), hrs = Math.floor(ends / 3.6e6), mins = Math.floor((ends % 3.6e6) / 6e4);
    const by = top + 3 * (chh + 14) + 4;
    markerText(ctx, `NEW CHALLENGES IN ${hrs}h ${String(mins).padStart(2, '0')}m`, w / 2, by + 10, Math.min(20, w / 30), '#ffffff');
    ctx.font = `${Math.max(13, Math.min(16, w / 70))}px ${HAND}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = INK;
    const notes = this.wrapText(ctx, 'New ones every day at 12:00 PM · your own skating counts, anywhere · cheats pause them', w / 2, by + 26, w - 32, 18);
    const bw = Math.min(220, w - 48), bh = Math.min(50, h * 0.08);
    this.button(ctx, 'BACK', (w - bw) / 2, by + 34 + notes.length * 18, bw, bh, false, 740, () => { this.screen = 'main'; });
  }

  drawStats(ctx, w, h) {
    const d = Stats.data;
    const attempts = d.landed + d.bails;
    const mph = d.topSpeed / PX_PER_FT * 0.6818;
    const ft = d.distance / PX_PER_FT;
    const mins = Math.floor(d.timeSkated / 60), secs = Math.floor(d.timeSkated % 60);
    const fav = Stats.favorites(3).map(([n, c]) => `${n} ×${c}`).join(',  ') || '—';
    const lines = [
      ['Level', `${Progress.level}  (${Progress.data.rep} rep)`],
      ['Best combo', d.bestCombo ? `${fmtScore(d.bestCombo)}  (${d.bestComboText})` : '—'],
      ['Total points', fmtScore(d.totalScore)],
      ['Tricks landed', d.landed],
      ['Bails', d.bails],
      ['Landing rate', attempts ? Math.round((d.landed / attempts) * 100) + '%' : '—'],
      ['Best air time', d.bestAir.toFixed(2) + ' s'],
      ['Top speed', mph.toFixed(1) + ' mph'],
      ['Distance skated', ft > 5280 ? (ft / 5280).toFixed(2) + ' miles' : Math.round(ft) + ' ft'],
      ['Time skating', `${mins}:${String(secs).padStart(2, '0')}`],
      ['S.K.A.T.E. vs CPU', `${d.skateWins} won, ${d.skateLosses} lost`],
      ['Hardest trick', d.hardest || '—'],
      ['Most landed', fav],
    ];
    markerText(ctx, 'STATS', w / 2, Math.min(60, h * 0.09), Math.min(52, w / 9), '#ffffff', -0.04);
    const cw = Math.min(w - 32, 620), lh = Math.min(34, h * 0.055), fs = Math.min(lh * 0.64, 21);
    const cx = (w - cw) / 2, cy = Math.min(110, h * 0.17), chh = lh * lines.length + 30;
    drawCard(ctx, cx, cy, cw, chh, 310);
    lines.forEach(([label, value], i) => {
      const y = cy + 15 + i * lh + lh / 2;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = INK;
      ctx.font = `${fs}px ${HAND}`;
      ctx.fillText(label, cx + 18, y);
      ctx.textAlign = 'right';
      ctx.font = `${fs * 0.95}px ${MARKER}`;
      let text = String(value);
      while (ctx.measureText(text).width > cw * 0.58 && text.length > 4) text = text.slice(0, -2);
      ctx.fillText(text === String(value) ? text : text + '…', cx + cw - 18, y);
    });
    // your save as a code, to keep safe or to move to another phone or computer
    const bh = Math.min(50, h * 0.08), gap = 12, bw = Math.min(220, (cw - gap * 2) / 3), by = cy + chh + 14;
    const x0 = (w - (bw * 3 + gap * 2)) / 2;
    this.button(ctx, 'SAVE CODE', x0, by, bw, bh, false, 321, () => this.copySaveCode());
    this.button(ctx, 'LOAD CODE', x0 + bw + gap, by, bw, bh, false, 322, () => this.loadSaveCode());
    this.button(ctx, 'BACK', x0 + (bw + gap) * 2, by, bw, bh, false, 320, () => { this.screen = 'main'; });
    ctx.font = `${Math.max(12, Math.min(15, w / 70))}px ${HAND}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = INK;
    ctx.fillText('Everything saves by itself in this browser. A save code takes it to another phone or computer.', w / 2, by + bh + 8);
  }

  copySaveCode() {
    const code = Progress.saveCode();
    const fallback = () => window.prompt('Your save code (copy it and keep it somewhere safe):', code);
    try {
      navigator.clipboard.writeText(code).then(() => this.note('SAVE CODE COPIED · keep it somewhere safe'), fallback);
    } catch (e) { fallback(); }
  }

  loadSaveCode() {
    const code = window.prompt('Paste a save code (it only adds to what you have, never takes away):');
    if (!code) return;
    if (!Progress.loadCode(code)) return this.flash("that code didn't work · check you copied all of it");
    this.refreshMaps();
    this.note('SAVE LOADED!');
  }
}

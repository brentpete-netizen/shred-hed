// Start menu: Free Skate or Game of S.K.A.T.E. (then pick a map), the Park Builder, Closet
// (change your fit), Stats and Sound on/off. Works with the arrow keys + Enter / Esc, or by clicking.

const PX_PER_FT = 23; // the skater is about 5.5 ft tall

const MAIN_ITEMS = ['FREE SKATE', 'S.K.A.T.E.', 'ONLINE', 'PARK BUILDER', 'CLOSET', 'SKATE SHOP', 'STATS', 'AUDIO'];
const CATEGORY_LABEL = Object.fromEntries(OUTFIT_CATEGORIES);
const ONLINE_ITEMS = ['HOST FREE SKATE', 'HOST S.K.A.T.E.', 'JOIN A ROOM'];
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
        const n = SHOP_ITEMS.length;
        if (e === 'up') { this.shopSel = (this.shopSel + n - 1) % n; this.shopConfirm = false; Sound.play('menuMove'); }
        else if (e === 'down') { this.shopSel = (this.shopSel + 1) % n; this.shopConfirm = false; Sound.play('menuMove'); }
        else if (e === 'start' || e === 'grab' || e === 'right') this.shopPick();
        else if (e === 'menu' || e === 'left') this.back();
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
    else if (item === 'SKATE SHOP') { this.screen = 'shop'; this.showoff = 0; this.shopSel = this.shopSel || 0; this.shopConfirm = false; }
    else if (item === 'STATS') this.screen = 'stats';
    else { this.screen = 'audio'; this.audioRow = 0; }
  }

  // ---------------------------------------------------------------- online

  chooseOnline(i) {
    this.onSel = i;
    Sound.play('menuPick');
    if (i === 2) { this.screen = 'join'; this.joinCode = ''; this.startTyping('code'); }
    else { this.game = i === 0 ? 'online-free' : 'online-skate'; this.refreshMaps(); this.screen = 'maps'; }
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
    const item = SHOP_ITEMS[this.shopSel];
    return { ...Outfit.pick, [item.cat]: OUTFIT_OPTIONS[item.cat].indexOf(item) };
  }

  // Buy it (press twice, so you don't spend by accident), or put it on if it's already yours.
  shopPick(i = this.shopSel) {
    this.shopSel = i;
    const item = SHOP_ITEMS[i], index = OUTFIT_OPTIONS[item.cat].indexOf(item);
    if (Progress.owns(item)) {
      Outfit.set(item.cat, index);
      this.shopConfirm = false;
      return this.note(`WEARING ${item.name.toUpperCase()}`);
    }
    if (Progress.bucks < item.shop) return this.flash(`you need ${item.shop - Progress.bucks} more Shred Bucks`);
    if (!this.shopConfirm) { this.shopConfirm = true; Sound.play('menuMove'); return; }
    this.shopConfirm = false;
    if (Progress.buy(item) !== 'bought') return;
    Outfit.set(item.cat, index);
    this.note(`YOURS FOREVER: ${item.name.toUpperCase()}`);
    Sound.play('levelUp');
    this.kickflip(true);
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
    else if (this.screen === 'fit') this.drawFit(ctx, w, h, dpr);
    else if (this.screen === 'online') this.drawOnline(ctx, w, h);
    else if (this.screen === 'join') this.drawJoin(ctx, w, h);
    else if (this.screen === 'lobby') this.drawLobby(ctx, w, h);
    else this.drawStats(ctx, w, h);
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
    this.note2(ctx, ['Skate with friends on their own computers or phones.', 'Host a room and send them its code, or join theirs.'], w, Math.min(70, h * 0.11) + 36, fs);
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
    this.note2(ctx, ['Free Skate: up to 4 skaters on one map · S.K.A.T.E.: you vs one friend', 'Esc back'], w, y0 + 3 * bh * 1.3 + 6, fs * 0.85);
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
    const slots = Net.mode ? ROOM_SIZE[Net.mode] : 0;
    for (let i = 0; i < slots; i++) {
      const p = Net.players[i], y = y0 + i * (rh + 8);
      Sketch.seedFor(410 + i);
      const box = [{ x, y }, { x: x + bw, y }, { x: x + bw, y: y + rh }, { x, y: y + rh }];
      Sketch.fill(ctx, box, p ? '#fbf8f0' : 'rgba(251, 248, 240, 0.4)', 1.5);
      Sketch.stroke(ctx, box, { color: INK, width: 1.8, amp: 1, closed: true });
      const label = p ? `${p.name}${p.id === Net.me ? ' (you)' : ''}${p.id === 'h' ? ' · host' : ''}` : 'waiting…';
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

    markerText(ctx, `${Progress.bucks} SHRED BUCKS`, w / 2, ly + 34, 18, '#f4c542', -0.02);
    const y0 = ly + 52;
    MAIN_ITEMS.forEach((item, i) => {
      this.button(ctx, item, x, y0 + i * (bh + gap), bw, bh, i === this.sel, 100 + i, () => this.choose(i));
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
  drawPreview(ctx, w, h, dpr, wide, zoom = 1, trail = null) {
    const p = this.preview;
    const k = zoom * Math.min(wide ? h * 0.0042 : h * 0.0026, wide ? w * 0.0026 : w * 0.006);
    const cx = wide ? w * 0.3 : w / 2, gy = wide ? h * 0.82 : h * 0.47;
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
    const fs = Math.min(rh * 0.42, 24);
    OUTFIT_CATEGORIES.forEach(([cat, label], i) => {
      const y = top + i * rh, sel = i === this.row;
      Sketch.seedFor(200 + i);
      const box = [{ x: rx, y: y + 3 }, { x: rx + rw, y: y + 3 }, { x: rx + rw, y: y + rh - 3 }, { x: rx, y: y + rh - 3 }];
      Sketch.fill(ctx, box, sel ? '#f4c542' : '#fbf8f0', 1.5);
      Sketch.stroke(ctx, box, { color: INK, width: sel ? 2.8 : 1.8, amp: 1, closed: true });
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = INK;
      ctx.font = `${fs * 0.9}px ${HAND}`;
      ctx.fillText(label, rx + 12, y + rh * 0.42);
      if (cat === 'sag') return this.drawFitRow(ctx, FIT_BY_KEY.sag, rx, y, rw, rh, fs, () => { this.row = i; });
      const visible = OUTFIT_OPTIONS[cat].filter(o => Progress.secretOwned(o));
      const opt = OUTFIT_OPTIONS[cat][this.trying[cat]], n = visible.length;
      const locked = !Progress.isUnlocked(cat, opt.name);
      const midX = rx + rw * 0.6;
      markerText(ctx, opt.name, midX, y + rh * (locked ? 0.38 : 0.5), fs * 0.8, locked ? '#b9b4aa' : '#ffffff');
      if (locked) markerText(ctx, `locked · level ${Progress.lockLevel(cat, opt.name)}`, midX, y + rh * 0.74, fs * 0.5, '#ef5a4a');
      markerText(ctx, '◀', rx + rw * 0.3, y + rh / 2, fs, '#ffffff');
      markerText(ctx, '▶', rx + rw - 22, y + rh / 2, fs, '#ffffff');
      ctx.font = `${fs * 0.6}px ${HAND}`;
      ctx.fillStyle = INK;
      if (cat === 'extra' && opt.type === 'nametag') {
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
  drawShop(ctx, w, h, dpr) {
    const wide = w > h * 1.1;
    markerText(ctx, 'SKATE SHOP', wide ? w * 0.3 : w / 2, Math.min(60, h * 0.09), Math.min(52, w / 10), '#ffffff', -0.04);
    const item = SHOP_ITEMS[this.shopSel];
    this.trying = this.shopLook(); // your skater models it
    const { cx } = this.drawPreview(ctx, w, h, dpr, wide, 1, item.cat === 'trail' ? item : null);
    this.drawHeldBoard(ctx, w, h, dpr, wide, cx, item.cat);

    const rx = wide ? w * 0.56 : 16, rw = wide ? Math.min(w * 0.4, 440) : w - 32;
    const top = wide ? h * 0.1 : h * 0.5;
    markerText(ctx, `${Progress.bucks} SHRED BUCKS`, rx + rw / 2, top, Math.min(28, w / 20), '#f4c542', -0.03);
    // the stock, scrolled to keep your pick in view
    const space = wide ? h * 0.62 : h * 0.3, rh = Math.min(50, Math.max(34, space / 9)), show = Math.max(3, Math.floor(space / rh));
    const first = clamp(this.shopSel - Math.floor(show / 2), 0, Math.max(0, SHOP_ITEMS.length - show));
    const fs = Math.min(rh * 0.42, 22), y0 = top + 26;
    for (let k = 0; k < show && first + k < SHOP_ITEMS.length; k++) {
      const i = first + k, it = SHOP_ITEMS[i], y = y0 + k * rh, sel = i === this.shopSel;
      const owned = Progress.owns(it), wearing = owned && Outfit.pick[it.cat] === OUTFIT_OPTIONS[it.cat].indexOf(it);
      Sketch.seedFor(500 + i);
      const box = [{ x: rx, y: y + 3 }, { x: rx + rw, y: y + 3 }, { x: rx + rw, y: y + rh - 3 }, { x: rx, y: y + rh - 3 }];
      Sketch.fill(ctx, box, sel ? (this.shopConfirm ? '#7fd36b' : '#f4c542') : owned ? '#e7eef3' : '#fbf8f0', 1.5);
      Sketch.stroke(ctx, box, { color: INK, width: sel ? 2.8 : 1.8, amp: 1, closed: true });
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = INK;
      ctx.font = `${fs * 0.62}px ${HAND}`;
      ctx.fillText(CATEGORY_LABEL[it.cat] || it.cat, rx + 12, y + rh / 2);
      markerText(ctx, it.name, rx + rw * 0.48, y + rh / 2, fs * 0.82, '#ffffff');
      const tag = wearing ? 'WEARING' : owned ? 'OWNED' : `${it.shop}`;
      markerText(ctx, tag, rx + rw - 46, y + rh / 2, fs * (owned ? 0.6 : 0.8), owned ? '#7fd36b' : Progress.bucks >= it.shop ? '#f4c542' : '#ef5a4a');
      this.hit(rx, y, rw, rh, () => {
        if (this.shopSel === i) return this.shopPick(i);
        this.shopSel = i;
        this.shopConfirm = false;
        Sound.play('menuMove');
      });
    }
    // the big button: buy it, then wear it
    const owned = Progress.owns(item), wearing = owned && Outfit.pick[item.cat] === OUTFIT_OPTIONS[item.cat].indexOf(item);
    const label = wearing ? 'WEARING' : owned ? 'WEAR IT' : this.shopConfirm ? `SURE? ${item.shop}` : `BUY · ${item.shop}`;
    const by = y0 + Math.min(show, SHOP_ITEMS.length) * rh + 10, bh = Math.min(50, h * 0.08), half = (rw - 14) / 2;
    this.button(ctx, label, rx, by, half, bh, this.shopConfirm, 560, () => this.shopPick());
    this.button(ctx, 'BACK', rx + half + 14, by, half, bh, false, 561, () => this.back());
    ctx.font = `${Math.max(13, fs * 0.65)}px ${HAND}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = INK;
    ctx.fillText('↑ ↓ pick  ·  Enter buy (twice to be sure)  ·  Esc back', rx + rw / 2, by + bh + 8);
    ctx.fillText('earn Shred Bucks: combos · new tricks · golden letters · level ups · S.K.A.T.E.', rx + rw / 2, by + bh + 8 + Math.max(15, fs * 0.8));
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
    const bw = Math.min(220, cw), bh = Math.min(50, h * 0.08);
    this.button(ctx, 'BACK', (w - bw) / 2, cy + chh + 14, bw, bh, false, 320, () => { this.screen = 'main'; });
  }
}

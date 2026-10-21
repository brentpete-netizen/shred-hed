// The Park Builder screen. You see your park drawn for real with a grid of slots over it, a
// cursor, and a palette of pieces along the bottom. Every change is saved automatically.
//
//   ← →        move the cursor (all the way left/right selects an end: Enter swaps QP / wall)
//   ↑ ↓        pick a piece from the palette
//   Enter      place it          Delete / Backspace   remove what's under the cursor
//   Shift ← →  move the piece under the cursor
//   Z / Y      undo / redo       [ ]   shorter / longer park
//   N          rename            T     test ride          Esc   back to the menu
// Mouse: click the palette to pick, click the park to place, right-click to remove,
// drag a piece to move it, and scroll to slide along.

const PALETTE = [
  ...Object.keys(PIECES).map(type => ({ kind: 'piece', type, name: type === 'flat' ? 'Flat (clear)' : PIECES[type].name })),
  ...Object.keys(PROPS).map(type => ({ kind: 'prop', type, name: PROPS[type].name })),
  { kind: 'theme', name: 'Theme' },
];

class Builder {
  constructor() {
    this.park = null;
    this.cursor = 2;
    this.pal = 1;
    this.undoStack = [];
    this.redoStack = [];
    this.msg = null;
    this.renaming = false;
    this.hits = [];
    this.cam = { x: 0, y: -150 };
    this.drag = null;
    this.time = 0;
  }

  open(park) {
    this.park = JSON.parse(JSON.stringify(park));
    this.cursor = Math.min(this.cursor, this.park.slots - 1);
    this.undoStack = [];
    this.redoStack = [];
    this.rebuild();
    this.cam.x = this.slotX(this.cursor);
  }

  rebuild() {
    this.terrain = buildPark(this.park);
    this.layout = parkLayout(this.park);
    this.ghost = new Skater(this.terrain); // stands at the start to show where you drop in
    Parks.save(this.park);
  }

  slotX(i) { return this.terrain.slotStart + i * SLOT; }

  // Bonus pieces are locked until you level up.
  lockFor(item) {
    if (item.kind !== 'piece' && item.kind !== 'prop') return 0;
    return Progress.isUnlocked(item.kind, item.type) ? 0 : Progress.lockLevel(item.kind, item.type);
  }
  slotAt(x) { return Math.floor((x - this.slotX(0)) / SLOT); }

  flash(text, bad = false) {
    this.msg = { text, bad, t: 0 };
    if (bad) Sound.play('lost');
  }

  // Apply a change if the result is a valid park.
  commit(change, okText) {
    const next = JSON.parse(JSON.stringify(this.park));
    change(next);
    const v = validatePark(next);
    if (!v.ok) { this.flash(v.msg, true); return false; }
    this.undoStack.push(JSON.stringify(this.park));
    if (this.undoStack.length > 60) this.undoStack.shift();
    this.redoStack = [];
    this.park = next;
    this.rebuild();
    if (okText) this.flash(okText);
    Sound.play('menuMove');
    return true;
  }

  // ---------------------------------------------------------------- editing

  place(at = this.cursor) {
    const item = PALETTE[this.pal];
    if (item.kind === 'theme') return this.cycleTheme();
    if (at < 0 || at >= this.park.slots) return this.toggleEnd(at);
    if (this.lockFor(item)) return this.flash(`${item.name} unlocks at level ${this.lockFor(item)}`, true);
    if (item.kind === 'piece') {
      const span = PIECES[item.type].span;
      this.commit(p => {
        // whatever was in the way goes (props too, they need flat ground)
        p.pieces = p.pieces.filter(q => q.at + PIECES[q.type].span <= at || q.at >= at + span);
        p.props = p.props.filter(q => {
          const qs = PROPS[q.type].span || 1;
          return q.at + qs <= at || q.at >= at + span;
        });
        if (item.type !== 'flat') p.pieces.push({ type: item.type, at });
      });
    } else {
      const stairs = this.layout.cover[at];
      const where = PROPS[item.type].kind === 'handrail' && stairs ? stairs.at : at;
      const span = PROPS[item.type].span || 1;
      this.commit(p => {
        p.props = p.props.filter(q => q.at + (PROPS[q.type].span || 1) <= where || q.at >= where + span);
        p.props.push({ type: item.type, at: where });
      });
    }
  }

  erase(at = this.cursor) {
    const prop = this.propAt(at), piece = this.layout.cover[at];
    if (prop) this.commit(p => { p.props = p.props.filter(q => !(q.at === prop.at && q.type === prop.type)); });
    else if (piece) this.commit(p => {
      p.pieces = p.pieces.filter(q => q.at !== piece.at);
      p.props = p.props.filter(q => !(PROPS[q.type].kind === 'handrail' && q.at === piece.at));
    });
  }

  propAt(at) {
    return this.park.props.find(q => at >= q.at && at < q.at + (PROPS[q.type].span || PIECES[this.layout.cover[q.at]?.type]?.span || 1));
  }

  // Slide the piece (or prop) under the cursor to start at `to`.
  moveThing(from, to) {
    const prop = this.propAt(from), piece = this.layout.cover[from];
    if (prop && PROPS[prop.type].kind !== 'handrail') {
      const d = to - from;
      return this.commit(p => { p.props.find(q => q.at === prop.at && q.type === prop.type).at += d; });
    }
    if (piece) {
      const d = to - from;
      return this.commit(p => {
        p.pieces.find(q => q.at === piece.at).at += d;
        for (const q of p.props) if (PROPS[q.type].kind === 'handrail' && q.at === piece.at) q.at += d; // its handrail comes too
      });
    }
    return false;
  }

  // Quarter pipe, wall, or (left side only, once unlocked) a roll-in tower.
  toggleEnd(at) {
    const side = at < 0 ? 'left' : 'right';
    const kinds = side === 'left' && Progress.isUnlocked('end', 'rollin') ? ['qp', 'wall', 'rollin'] : ['qp', 'wall'];
    const next = kinds[(kinds.indexOf(this.park.ends[side]) + 1) % kinds.length];
    const label = { qp: 'quarter pipe', wall: 'wall', rollin: 'roll-in tower' }[next];
    this.commit(p => { p.ends[side] = next; }, `${side} end: ${label}`);
    if (side === 'left' && !Progress.isUnlocked('end', 'rollin') && next === 'qp') this.flash(`roll-in tower unlocks at level ${Progress.lockLevel('end', 'rollin')}`);
  }

  cycleTheme() {
    const i = PARK_THEMES.indexOf(this.park.theme);
    const next = PARK_THEMES[(i + 1) % PARK_THEMES.length];
    this.commit(p => { p.theme = next; }, `theme: ${next}`);
    this.skylineDirty = true;
  }

  resize(d) {
    const n = clamp(this.park.slots + d, PARK_MIN_SLOTS, PARK_MAX_SLOTS);
    if (n === this.park.slots) return;
    this.commit(p => {
      p.slots = n;
      p.pieces = p.pieces.filter(q => q.at + PIECES[q.type].span <= n);
      p.props = p.props.filter(q => q.at + (PROPS[q.type].span || 1) <= n);
    }, `${n} slots long`);
    this.cursor = Math.min(this.cursor, n);
  }

  undo() {
    if (!this.undoStack.length) return this.flash('nothing to undo', true);
    this.redoStack.push(JSON.stringify(this.park));
    this.park = JSON.parse(this.undoStack.pop());
    this.rebuild();
    this.flash('undo');
  }

  redo() {
    if (!this.redoStack.length) return this.flash('nothing to redo', true);
    this.undoStack.push(JSON.stringify(this.park));
    this.park = JSON.parse(this.redoStack.pop());
    this.rebuild();
    this.flash('redo');
  }

  startRename() {
    this.renaming = true;
    Input.textCapture = key => {
      if (key === 'Enter' || key === 'Escape') {
        this.renaming = false;
        Input.textCapture = null;
        if (!this.park.name.trim()) this.park.name = 'My Park';
        this.rebuild();
      } else if (key === 'Backspace') this.park.name = this.park.name.slice(0, -1);
      else if (key.length === 1 && this.park.name.length < 18) this.park.name += key;
    };
  }

  // Returns { test: true } to test ride, or { exit: true } to go back to the menu.
  handle(events) {
    for (const e of events) {
      const shift = Input.held('shift');
      if (e === 'left' || e === 'right') {
        const d = e === 'right' ? 1 : -1;
        if (shift) { if (this.moveThing(this.cursor, this.cursor + d)) this.cursor += d; }
        else this.cursor = clamp(this.cursor + d, -1, this.park.slots);
      } else if (e === 'up') this.pal = (this.pal + PALETTE.length - 1) % PALETTE.length;
      else if (e === 'down') this.pal = (this.pal + 1) % PALETTE.length;
      else if (e === 'start' || e === 'grab') this.place();
      else if (e === 'delete') this.erase();
      else if (e === 'undo') this.undo();
      else if (e === 'redo') this.redo();
      else if (e === 'shorter') this.resize(-1);
      else if (e === 'longer') this.resize(1);
      else if (e === 'rename') this.startRename();
      else if (e === 'test') return { test: true };
      else if (e === 'menu') return { exit: true };
    }
    return null;
  }

  // Mouse: x, y on screen; toWorld converts to world coordinates.
  pointerDown(x, y, button, toWorld) {
    for (const h of this.hits) if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) { h.fn(); return; }
    const at = this.slotAt(toWorld(x, y).x);
    this.cursor = clamp(at, -1, this.park.slots);
    if (button === 2) return this.erase(this.cursor);
    this.drag = { from: this.cursor, has: !!(this.layout.cover[this.cursor] || this.propAt(this.cursor)) };
  }

  pointerUp(x, y, toWorld) {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    const at = clamp(this.slotAt(toWorld(x, y).x), -1, this.park.slots);
    if (at !== d.from && d.has) { if (this.moveThing(d.from, at)) this.cursor = at; }
    else this.place(at);
  }

  wheel(dy) { this.cursor = clamp(this.cursor + Math.sign(dy), -1, this.park.slots); }

  update(dt) {
    this.time += dt;
    if (this.msg && (this.msg.t += dt) > 1.8) this.msg = null;
    this.ghost.update(dt, [], () => false);
    this.ghost.out.length = 0;
    const tx = this.cursor < 0 ? this.slotX(0) - 100 : this.cursor >= this.park.slots ? this.slotX(this.park.slots) + 100 : this.slotX(this.cursor) + SLOT / 2;
    const ty = (this.layout.levels[clamp(this.cursor, 0, this.park.slots)] || 0) - 160;
    this.cam.x += (tx - this.cam.x) * Math.min(1, dt * 8);
    this.cam.y += (ty - this.cam.y) * Math.min(1, dt * 6);
  }

  // ---------------------------------------------------------------- drawing

  // Grid, cursor and a ghost of what you're about to place, in world space.
  drawWorld(ctx) {
    const T = this.terrain, n = this.park.slots;
    const top = T.highest - 420, bottom = T.lowest + 160;
    ctx.save();
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = 'rgba(60, 90, 160, 0.35)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath();
      ctx.moveTo(this.slotX(i), top);
      ctx.lineTo(this.slotX(i), bottom);
      ctx.stroke();
    }
    ctx.restore();

    const item = PALETTE[this.pal];
    let from = this.cursor, span = 1;
    if (this.cursor >= 0 && this.cursor < n) {
      if (item.kind === 'piece') span = PIECES[item.type].span;
      else if (item.kind === 'prop') {
        const stairs = this.layout.cover[this.cursor];
        if (PROPS[item.type].kind === 'handrail' && stairs) { from = stairs.at; span = PIECES[stairs.type].span; }
        else span = PROPS[item.type].span || 1;
      }
    }
    const x0 = this.cursor < 0 ? this.slotX(0) - 180 : this.cursor >= n ? this.slotX(n) : this.slotX(from);
    const x1 = this.cursor < 0 ? this.slotX(0) : this.cursor >= n ? this.slotX(n) + 180 : this.slotX(from + span);
    const pulse = 0.16 + 0.06 * Math.sin(this.time * 6);
    ctx.fillStyle = `rgba(244, 197, 66, ${pulse})`;
    ctx.fillRect(x0, top, x1 - x0, bottom - top);
    ctx.strokeStyle = '#d9a92c';
    ctx.lineWidth = 3;
    ctx.strokeRect(x0, top, x1 - x0, bottom - top);
    drawSkater(ctx, this.ghost);
  }

  drawUI(ctx, w, h) {
    this.hits = [];
    const p = this.park;
    const title = this.renaming ? `${p.name}${Math.floor(this.time * 2) % 2 ? '|' : ' '}` : p.name;
    markerText(ctx, title, w / 2, 34, Math.min(40, w / 14), this.renaming ? '#f4c542' : '#ffffff', -0.02);
    ctx.font = `${Math.max(13, Math.min(16, w / 75))}px ${HAND}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = INK;
    const help = this.renaming ? 'type a name · Enter when done'
      : '← → move · ↑ ↓ pick · Enter place · Del remove · Shift+← → move piece · Z/Y undo/redo · [ ] length · N rename · T test ride · Esc menu';
    const lines = [''];
    for (const word of help.split(' ')) {
      const test = (lines[lines.length - 1] + ' ' + word).trim();
      if (ctx.measureText(test).width > w - 30) lines.push(word); else lines[lines.length - 1] = test;
    }
    lines.forEach((l, i) => ctx.fillText(l, w / 2, 58 + i * 18));

    // what's under the cursor
    const n = p.slots, c = this.cursor;
    let here = '';
    if (c < 0 || c >= n) here = `${c < 0 ? 'Left' : 'Right'} end: ${{ qp: 'quarter pipe', wall: 'wall', rollin: 'roll-in tower' }[p.ends[c < 0 ? 'left' : 'right']]} (Enter to swap)`;
    else {
      const piece = this.layout.cover[c], prop = this.propAt(c);
      here = `slot ${c + 1}/${n}: ${piece ? PIECES[piece.type].name : 'flat'}${prop ? ' + ' + PROPS[prop.type].name : ''}`;
    }
    ctx.fillText(`${here}  ·  theme: ${p.theme}  ·  saved`, w / 2, 58 + lines.length * 18 + 4);

    if (this.msg) {
      ctx.globalAlpha = clamp((1.8 - this.msg.t) / 0.4, 0, 1);
      markerText(ctx, this.msg.text, w / 2, h * 0.3, Math.min(30, w / 18), this.msg.bad ? '#ef5a4a' : '#7fd36b', -0.03);
      ctx.globalAlpha = 1;
    }
    this.drawPalette(ctx, w, h);
  }

  drawPalette(ctx, w, h) {
    const cardW = 104, cardH = 78, gap = 8, y = h - cardH - 14;
    const total = PALETTE.length * (cardW + gap) - gap;
    // keep the selected card on screen
    let x0 = total <= w - 24 ? (w - total) / 2 : clamp(w / 2 - (this.pal + 0.5) * (cardW + gap), w - 12 - total, 12);
    ctx.fillStyle = 'rgba(243, 238, 225, 0.85)';
    ctx.fillRect(0, y - 12, w, cardH + 26);
    PALETTE.forEach((item, i) => {
      const x = x0 + i * (cardW + gap);
      if (x + cardW < 0 || x > w) return;
      const sel = i === this.pal;
      Sketch.seedFor(900 + i);
      const box = [{ x, y }, { x: x + cardW, y }, { x: x + cardW, y: y + cardH }, { x, y: y + cardH }];
      Sketch.fill(ctx, box, sel ? '#f4c542' : item.kind === 'prop' ? '#e7eef3' : '#fbf8f0', 1.5);
      Sketch.stroke(ctx, box, { color: INK, width: sel ? 3 : 1.6, amp: 0.8, closed: true });
      this.drawIcon(ctx, item, x + 8, y + 8, cardW - 16, cardH - 34);
      ctx.font = `13px ${HAND}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = INK;
      ctx.fillText(item.kind === 'theme' ? `Theme: ${this.park.theme}` : item.name, x + cardW / 2, y + cardH - 6);
      const lock = this.lockFor(item);
      if (lock) {
        ctx.fillStyle = 'rgba(60, 56, 50, 0.45)';
        ctx.fillRect(x, y, cardW, cardH);
        markerText(ctx, `LEVEL ${lock}`, x + cardW / 2, y + cardH / 2 - 6, 17, '#f4c542', -0.04);
      }
      this.hit(x, y, cardW, cardH, () => { this.pal = i; Sound.play('menuMove'); if (item.kind === 'theme') this.cycleTheme(); });
    });
  }

  // A tiny line drawing of each piece, made by actually building it.
  drawIcon(ctx, item, x, y, w, h) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    if (item.kind === 'piece') {
      const b = new MapBuilder(0, 0);
      b.flat(SLOT * 0.4);
      emitPiece(b, item.type, { handrail: false });
      b.flat(SLOT * 0.4);
      const pts = b.pts, xs = pts.map(q => q.x), ys = pts.map(q => q.y);
      const minY = Math.min(...ys, -50), maxY = Math.max(...ys, 10);
      const s = Math.min(w / (Math.max(...xs) - Math.min(...xs)), h / (maxY - minY));
      const ox = x + (w - (Math.max(...xs) - Math.min(...xs)) * s) / 2, oy = y + h - (maxY * s);
      ctx.beginPath();
      pts.forEach((q, k) => (k ? ctx.lineTo(ox + q.x * s, oy + q.y * s) : ctx.moveTo(ox + q.x * s, oy + q.y * s)));
      ctx.stroke();
    } else if (item.kind === 'prop') {
      const def = PROPS[item.type];
      const gy = y + h - 4;
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + w, gy);
      ctx.stroke();
      if (def.kind === 'handrail') {
        ctx.beginPath();
        for (let i = 0; i < 4; i++) { ctx.lineTo(x + 18 + i * 12, gy - 24 + i * 6); ctx.lineTo(x + 18 + i * 12, gy - 18 + i * 6); }
        ctx.stroke();
        ctx.strokeStyle = '#7a8088';
        ctx.beginPath();
        ctx.moveTo(x + 10, gy - 36); ctx.lineTo(x + 18, gy - 36); ctx.lineTo(x + 66, gy - 12); ctx.lineTo(x + 76, gy - 12);
        ctx.stroke();
      } else if (def.kink) {
        ctx.strokeStyle = '#7a8088';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 6, gy - 12); ctx.lineTo(x + 24, gy - 32); ctx.lineTo(x + w - 24, gy - 32); ctx.lineTo(x + w - 6, gy - 12);
        ctx.stroke();
      } else {
        const ph = Math.max(6, def.h * 0.6), len = def.span > 1 ? w * 0.8 : w * 0.5;
        ctx.fillStyle = { rail: '#b9bfc6', ledge: '#c4beb2', bench: '#b9834b', planter: '#b8775a', curb: '#e05a4a' }[def.kind];
        ctx.fillRect(x + (w - len) / 2, gy - ph, len, def.kind === 'rail' ? 4 : ph);
        if (def.kind === 'rail') for (const k of [0.2, 0.8]) ctx.fillRect(x + (w - len) / 2 + len * k, gy - ph, 2, ph);
      }
    } else {
      // paint dots in the colours of each theme's ground
      PARK_THEMES.forEach((t, i) => {
        Sketch.circle(ctx, x + w * (0.2 + i * 0.2), y + h / 2, 8, THEMES[t].ground, { width: t === this.park.theme ? 3 : 1.4 });
      });
    }
  }

  hit(x, y, w, h, fn) { this.hits.push({ x, y, w, h, fn }); }
}

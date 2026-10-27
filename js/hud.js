// On-screen text: trick and combo popups, the score, the help card and a debug readout.

// What the game shouts when you land a big one (by how many points it was worth).
const PRAISE = [
  { at: 1500, text: 'NICE!', color: '#7fd36b', burst: '#fff4c2', size: 54 },
  { at: 4000, text: 'SICK!', color: '#3dd6ff', burst: '#d9f6ff', size: 64 },
  { at: 10000, text: 'GNARLY!', color: '#f4c542', burst: '#fff0b0', size: 72 },
  { at: 25000, text: 'INSANE!!', color: '#ff8c2e', burst: '#ffd9b0', size: 80 },
  { at: 60000, text: 'GODLIKE!!!', color: '#ff3dbb', burst: '#ffd0f0', size: 88 },
];

const MARKER = '"Permanent Marker", "Comic Sans MS", cursive';
const HAND = '"Patrick Hand", "Comic Sans MS", cursive';

function markerText(ctx, text, x, y, size, color, rot = 0, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  ctx.font = `${size}px ${MARKER}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.18;
  ctx.strokeStyle = INK;
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// The trick you just did, the running combo ("Kickflip + 50-50 + Manual") and its score
// ("1,250 × 3"), small in the bottom-left corner. Landing shows what you banked; bailing shows what you lost.
class Hud {
  constructor() {
    this.score = 0;     // this session
    this.trickPop = null;
    this.result = null;
  }

  clear() {
    this.score = 0;
    this.trickPop = null;
    this.result = null;
  }

  handle(m) {
    if (m.type === 'trick') this.trickPop = { text: m.name, t: m.upgrade && this.trickPop ? this.trickPop.t * 0.3 : 0 };
    else if (m.type === 'cancel') this.trickPop = null;
    else if (m.type === 'combo') {
      this.score += m.score;
      this.trickPop = null;
      const sub = (m.mult > 1 ? `${fmtScore(m.points)} × ${m.mult}` : m.parts[0].name) + (m.bonus ? `  ·  ${m.bonus.join('  ·  ')}` : '');
      this.result = { text: '+' + fmtScore(m.score), sub, color: m.bonus ? '#ff8c2e' : '#7fd36b', t: 0 };
      // and a word for the big ones
      const p = PRAISE.findLast(p => m.score >= p.at);
      if (p) { this.praise = { ...p, t: 0, rot: (Math.random() - 0.5) * 0.2 }; Sound.play('praise', PRAISE.indexOf(p)); }
    } else if (m.type === 'gap') {
      this.gapPop = { text: m.name.toUpperCase() + ' GAP!', pts: m.pts, t: 0 };
      Sound.play('gap');
    } else if (m.type === 'bail') {
      this.trickPop = null;
      this.result = { text: 'BAIL!', sub: m.why, color: '#ef5a4a', t: 0 };
    }
  }

  // Rep and level-up news from Progress (kept across clear(), so a level up isn't cut short).
  progress(ev) {
    this.news = this.news || [];
    if (ev.type === 'rep') this.news.push({ kind: 'rep', text: `+${ev.amount} REP`, t: 0, dur: 1.4 });
    else if (ev.type === 'bucks') this.news.push({ kind: 'bucks', amount: ev.amount, t: 0, dur: 1.6 });
    else if (ev.type === 'newTrick') this.news.push({ kind: 'trick', text: `NEW TRICK: ${ev.name}`, t: 0, dur: 2 });
    else if (ev.type === 'level') this.levelUp = { level: ev.level, unlocked: ev.unlocked, t: 0 };
    else if (ev.type === 'banner') this.levelUp = { title: ev.title, unlocked: ev.lines, t: 0 };
    else if (ev.type === 'letter') this.news.push({ kind: 'trick', text: `GOLDEN ${ev.letter}!  ${ev.found} / ${ev.total}`, t: 0, dur: 2.2 });
    else if (ev.type === 'newGap') this.news.push({ kind: 'trick', text: `NEW GAP: ${ev.name.toUpperCase()}`, t: 0, dur: 2.2 });
    else if (ev.type === 'trophy') this.levelUp = { title: 'TROPHY!', unlocked: [ev.name, `+${ev.reward} Shred Bucks`], t: 0, trophy: true };
    else if (ev.type === 'secret') {
      this.levelUp = ev.on
        ? { title: 'SECRET UNLOCKED!', unlocked: ['the whole closet and every map', 'plus 3 hidden maps', '(shop stuff you still have to buy)'], t: 0 }
        : { title: 'SECRET LOCKED', unlocked: ['back to normal'], t: 0 };
    }
  }

  update(dt) {
    if (this.trickPop && (this.trickPop.t += dt) > 1.2) this.trickPop = null;
    if (this.result && (this.result.t += dt) > 1.6) this.result = null;
    if (this.news) this.news = this.news.filter(n => (n.t += dt) < n.dur);
    if (this.levelUp && (this.levelUp.t += dt) > 3.6) this.levelUp = null;
    if (this.praise && (this.praise.t += dt) > 1.4) this.praise = null;
    if (this.gapPop && (this.gapPop.t += dt) > 1.5) this.gapPop = null;
  }

  // Everything else that pops up, as small rows for the bottom-left corner (above the tricks):
  // level ups and trophies, new tricks and gaps, who joined, the word for a big combo and a gap
  // you just hit. Rows are [text, size, color, scale, alpha, font], top to bottom.
  popRows(ctx, fs, maxW) {
    const rows = [], fade = (t, dur, out = 0.4) => clamp((dur - t) / out, 0, 1);
    const L = this.levelUp;
    if (L) {
      const a = clamp(Math.min(L.t / 0.2, (3.6 - L.t) / 0.5), 0, 1);
      rows.push([L.title || `LEVEL ${L.level}!`, fs * 1.5, '#f4c542', 1 + 0.3 * Math.exp(-L.t * 8), a, MARKER]);
      const lines = L.title ? fitLines(ctx, L.unlocked, '   ·   ', fs * 0.9, maxW)
        : L.unlocked.length ? fitLines(ctx, ['unlocked:', ...L.unlocked], '   ', fs * 0.9, maxW) : ['keep shredding'];
      for (const l of lines) rows.push([l, fs * 0.9, '#ffffff', 1, a, MARKER]);
    }
    for (const n of this.news || []) if (n.kind === 'trick') rows.push([n.text, fs, '#f4c542', 1, fade(n.t, n.dur), MARKER]);
    for (const t of typeof Net !== 'undefined' ? Net.toasts : []) rows.push([t.text, fs, '#7fd36b', 1, fade(t.t, 3, 0.5), MARKER]);
    const P = this.praise;
    if (P) rows.push([P.text, fs * 1.6, P.color, 1 + 0.5 * Math.exp(-P.t * 10), fade(P.t, 1.4), MARKER]);
    const G = this.gapPop;
    if (G) rows.push([`${G.text}   +${fmtScore(G.pts)}`, fs * 1.1, '#3dd6ff', 1 + 0.3 * Math.exp(-G.t * 12), fade(G.t, 1.5), MARKER]);
    return rows;
  }

  // the rep and Shred Bucks you just got, small by the counters in the top-right
  drawProgress(ctx, w, h) {
    // (on a narrow screen, below the titles so they don't overlap)
    const ny = w < 700 || TouchPad.enabled ? 120 : 78;
    (this.news || []).filter(n => n.kind !== 'trick').forEach((n, i) => {
      ctx.globalAlpha = clamp((n.dur - n.t) / 0.4, 0, 1);
      const y = ny + i * 26 - n.t * 18;
      if (n.kind === 'rep') markerText(ctx, n.text, w - 70, y, 18, '#7fd36b', -0.03);
      else drawBucks(ctx, `+${n.amount}`, w - 16, y, 18, '#f4c542', 'right');
      ctx.globalAlpha = 1;
    });
  }

  // skate: in Game of S.K.A.T.E. there's no score
  draw(ctx, w, h, sk, skate = false) {
    const size = Math.max(24, Math.min(50, w / 24));

    const scoreText = 'SCORE ' + fmtScore(this.score);
    ctx.font = `${size * 0.5}px ${MARKER}`;
    if (!skate) markerText(ctx, scoreText, 18 + ctx.measureText(scoreText).width / 2, 24, size * 0.5, '#f4c542');
    if (this.mapId && !skate) {
      const best = Stats.map(this.mapId);
      ctx.font = `${Math.max(13, size * 0.34)}px ${HAND}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = INK;
      ctx.fillText(`${this.mapName}  ·  best ${fmtScore(best.bestScore)}  ·  best combo ${fmtScore(best.bestCombo)}`, 18, 24 + size * 0.42);
    }

    this.drawTricks(ctx, w, h, sk);
    this.drawProgress(ctx, w, h);
  }

  // All the words that pop up, small and spaced out in the bottom-left corner: level ups, trophies
  // and the like on top (see popRows, and the S.K.A.T.E. calls), then the trick you just did, the
  // combo so far (wrapping onto more lines), its score, and what you banked or lost.
  // (Bottom right while the help card's open, and beside the CHAT button online.)
  drawTricks(ctx, w, h, sk) {
    const fs = Math.max(12, Math.min(17, w / 66));
    const right = typeof showHelp !== 'undefined' && showHelp;
    const x = right ? w - 18 : 18 + (typeof Net !== 'undefined' && Net.active ? 92 : 0);
    const maxW = Math.min(w * 0.45, 440), align = right ? 'right' : 'left';
    const rows = this.popRows(ctx, fs, maxW); // top to bottom: [text, size, color, scale, alpha, font]
    if (typeof skateGame !== 'undefined' && skateGame) rows.push(...skateGame.popRows(ctx, fs, maxW));

    if (this.trickPop) {
      const p = this.trickPop;
      rows.push([p.text, fs * 1.35, '#ffffff', 1 + 0.3 * Math.exp(-p.t * 14), clamp((1.2 - p.t) / 0.3, 0, 1), MARKER]);
    }
    if (sk.combo.active) {
      const r = sk.combo.result();
      // as many tricks to a line as fit; only the last few lines
      const lines = fitLines(ctx, sk.combo.names(), '   +   ', fs * 0.9, maxW, '+   ');
      if (lines.length > 4) lines.splice(0, lines.length - 4, '…');
      for (const l of lines) rows.push([l, fs * 0.9, '#ffffff', 1, 1, MARKER]);
      rows.push([`${fmtScore(r.points)}  ×  ${r.mult}`, fs * 1.1, '#f4c542', 1, 1, MARKER]);
    }
    if (this.result) {
      const p = this.result, a = clamp((1.6 - p.t) / 0.4, 0, 1), pop = 1 + 0.3 * Math.exp(-p.t * 12);
      rows.push([p.text, fs * 1.5, p.color, pop, a, MARKER]);
      if (p.sub) rows.push([p.sub, fs * 0.95, '#ffffff', 1, a, MARKER]);
    }

    let y = h - 18;
    for (let i = rows.length - 1; i >= 0; i--) {
      const [text, size, color, scale, alpha, font] = rows[i];
      ctx.globalAlpha = alpha;
      spacedText(ctx, text, x, y, size, color, align, scale, font);
      y -= size * 1.6;
    }
    ctx.globalAlpha = 1;
  }
}

// Small text with the letters spread out. Marker text gets a dark outline like markerText (so it
// reads on the night sky too); handwriting is just inked. (x, y) is the start (or end, for
// Joins parts with sep into as many lines as it takes to keep each under maxW (measured as
// spacedText draws it); lead starts each line after the first.
function fitLines(ctx, parts, sep, size, maxW, lead = '') {
  const lines = [''];
  ctx.font = `${size}px ${MARKER}`;
  ctx.letterSpacing = `${(size * 0.14).toFixed(1)}px`;
  for (const part of parts) {
    const last = lines[lines.length - 1], t = last ? last + sep + part : part;
    if (ctx.measureText(t).width > maxW && last) lines.push(lead + part);
    else lines[lines.length - 1] = t;
  }
  ctx.letterSpacing = '0px';
  return lines;
}

// 'right') of the baseline.
function spacedText(ctx, text, x, y, size, color, align = 'left', scale = 1, font = MARKER) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.font = `${size}px ${font}`;
  ctx.letterSpacing = `${(size * 0.14).toFixed(1)}px`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if (font === MARKER) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.2;
    ctx.strokeStyle = INK;
    ctx.strokeText(text, 0, 0);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawCard(ctx, x, y, w, h, id) {
  Sketch.seedFor(id);
  const box = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
  ctx.globalAlpha = 0.92;
  Sketch.fill(ctx, box, '#fbf8f0', 2);
  ctx.globalAlpha = 1;
  Sketch.stroke(ctx, box, { color: INK, width: 2.2, amp: 1.2, closed: true });
}

const HELP_LINES = [
  ['← →  or  A D', 'push · hold backwards to brake / turn around'],
  ['↑  or  W', 'ollie (hold ↓ first to pop higher) · hold ↓ on ramps to pump'],
  ['after the ollie:', '→ kickflip   ← heelflip   ↓ shove-it   ↑ impossible   (hold it to keep doing it)'],
  ['two quick taps:', '↓→ tre flip   ↓← laser   →→ double kick   ↓↓ 360 shuv   →↓ varial   ↑↑ double impossible'],
  ['hold Q / E', 'spin backside / frontside (180, 360, 540...)'],
  ['Space + arrow', 'grab:  → Indy   ← Melon   ↓ Stalefish   ↑ Method   ↑↓ Christ Air  (let go to land!)'],
  ['land on a rail', 'nothing 50-50 · forward nosegrind · back 5-0 · ↓ boardslide · ↑ crooked'],
  ['↓ as you land', 'manual (↑ nose manual) · ← → balance · ↓ set it down · ↑ ollie out'],
  ['Q / E after landing', 'revert: keeps the combo going'],
  ['goofy stance', 'everything mirrors: ← → swap for flips and grabs, Q / E swap for spins'],
  ['H', 'hide this  ·  R  back to the start  ·  M  mute  ·  Esc  menu'],
];

function drawHelp(ctx, w, h) {
  const fs = Math.max(13, Math.min(17, w / 80));
  const lh = fs * 1.35, pad = fs * 0.9;
  const cardW = Math.min(w - 32, fs * 46), cardH = pad * 2 + lh * (HELP_LINES.length + 1);
  const x = 16, y = h - cardH - 16;
  drawCard(ctx, x, y, cardW, cardH, 90);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = `${fs * 1.15}px ${MARKER}`;
  ctx.fillText('How to shred', x + pad, y + pad);
  const lines = TouchPad.enabled
    ? [...HELP_LINES.slice(0, -1), ['on the screen', 'left side: drag to push, brake and crouch (in the air: spin) · right side: flick ↑ to ollie, flick to flip, hold still in the air to grab · tap here to close']]
    : HELP_LINES;
  lines.forEach(([k, v], i) => {
    const ly = y + pad + lh * (i + 1);
    ctx.font = `bold ${fs}px ${HAND}`;
    ctx.fillText(k, x + pad, ly);
    ctx.font = `${fs}px ${HAND}`;
    ctx.fillText(v, x + pad + fs * 9.5, ly);
  });
}

function drawDebug(ctx, sk, fps) {
  const lines = [
    `fps ${fps.toFixed(0)}`,
    `state ${sk.state}${sk.vert ? ' (vert)' : ''}`,
    `speed ${Math.abs(sk.state === 'ground' ? sk.v : Math.hypot(sk.vel.x, sk.vel.y)).toFixed(0)}`,
    `facing ${sk.facing}  fakie ${sk.fakie}`,
    `pos ${sk.pos.x.toFixed(0)}, ${sk.pos.y.toFixed(0)}`,
    `trick ${sk.trick ? sk.trick.entry.name + ' ' + (sk.trick.t / sk.trick.dur).toFixed(2) : '-'}`,
    `spin ${(sk.spin * 180 / Math.PI).toFixed(0)}°  grab ${sk.grab ? sk.grab.def.name : '-'}`,
    `grind ${sk.grind ? sk.grind.kind : '-'}  manual ${sk.manual ? sk.manual.bal.toFixed(2) : '-'}`,
  ];
  ctx.font = `14px monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = INK;
  lines.forEach((l, i) => ctx.fillText(l, 16, 56 + i * 17));
}

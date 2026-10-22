// On-screen text: trick and combo popups, the score, the help card and a debug readout.

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

// The trick you just did pops up big; under it the running combo ("Kickflip + 50-50 + Manual")
// and its score ("1,250 × 3"). Landing shows what you banked; bailing shows what you lost.
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
      const sub = m.mult > 1 ? `${fmtScore(m.points)} × ${m.mult}` : m.parts[0].name;
      this.result = { text: '+' + fmtScore(m.score), sub, color: '#7fd36b', t: 0 };
    } else if (m.type === 'bail') {
      this.trickPop = null;
      this.result = { text: 'BAIL!', sub: m.why, color: '#ef5a4a', t: 0 };
    }
  }

  // Rep and level-up news from Progress (kept across clear(), so a level up isn't cut short).
  progress(ev) {
    this.news = this.news || [];
    if (ev.type === 'rep') this.news.push({ kind: 'rep', text: `+${ev.amount} REP`, t: 0, dur: 1.4 });
    else if (ev.type === 'newTrick') this.news.push({ kind: 'trick', text: `NEW TRICK: ${ev.name}`, t: 0, dur: 2 });
    else if (ev.type === 'level') this.levelUp = { level: ev.level, unlocked: ev.unlocked, t: 0 };
    else if (ev.type === 'banner') this.levelUp = { title: ev.title, unlocked: ev.lines, t: 0 };
    else if (ev.type === 'letter') this.news.push({ kind: 'trick', text: `GOLDEN ${ev.letter}!  ${ev.found} / ${ev.total}`, t: 0, dur: 2.2 });
    else if (ev.type === 'secret') {
      this.levelUp = ev.on
        ? { title: 'SECRET UNLOCKED!', unlocked: ['everything', 'plus 3 hidden maps'], t: 0 }
        : { title: 'SECRET LOCKED', unlocked: ['back to normal'], t: 0 };
    }
  }

  update(dt) {
    if (this.trickPop && (this.trickPop.t += dt) > 1.2) this.trickPop = null;
    if (this.result && (this.result.t += dt) > 1.6) this.result = null;
    if (this.news) this.news = this.news.filter(n => (n.t += dt) < n.dur);
    if (this.levelUp && (this.levelUp.t += dt) > 3.6) this.levelUp = null;
  }

  drawProgress(ctx, w, h) {
    (this.news || []).forEach((n, i) => {
      ctx.globalAlpha = clamp((n.dur - n.t) / 0.4, 0, 1);
      if (n.kind === 'rep') markerText(ctx, n.text, w - 70, 78 + i * 26 - n.t * 18, 18, '#7fd36b', -0.03);
      else markerText(ctx, n.text, w / 2, h * 0.72 - n.t * 10, Math.min(28, w / 18), '#f4c542', -0.04, 1 + 0.3 * Math.exp(-n.t * 10));
      ctx.globalAlpha = 1;
    });
    const L = this.levelUp;
    if (!L) return;
    const a = clamp(Math.min(L.t / 0.2, (3.6 - L.t) / 0.5), 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(243, 238, 225, 0.8)';
    ctx.fillRect(0, h * 0.36, w, h * 0.26);
    markerText(ctx, L.title || `LEVEL ${L.level}!`, w / 2, h * 0.44, Math.min(64, w / (L.title ? 11 : 8)), '#f4c542', -0.05, 1 + 0.4 * Math.exp(-L.t * 8));
    const text = L.title ? L.unlocked.join(' · ') : L.unlocked.length ? `unlocked: ${L.unlocked.join(', ')}` : 'keep shredding';
    markerText(ctx, text, w / 2, h * 0.53, Math.min(22, w / (text.length * 0.62)), '#ffffff', -0.02);
    ctx.globalAlpha = 1;
  }

  // skate: in Game of S.K.A.T.E. there's no score, and the trick popups sit lower under the letters
  draw(ctx, w, h, sk, skate = false) {
    const size = Math.max(24, Math.min(50, w / 24));
    const cx = w / 2, top = h * (skate ? 0.24 : 0.13);

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

    if (this.trickPop) {
      const p = this.trickPop;
      ctx.globalAlpha = clamp((1.2 - p.t) / 0.3, 0, 1);
      markerText(ctx, p.text, cx, top, size, '#ffffff', -0.04, 1 + 0.35 * Math.exp(-p.t * 14));
      ctx.globalAlpha = 1;
    }

    if (sk.combo.active) {
      const r = sk.combo.result();
      ctx.font = `${size * 0.42}px ${HAND}`;
      let line = sk.combo.names().join(' + ');
      while (ctx.measureText(line).width > w - 40 && line.includes(' + ')) line = '… ' + line.slice(line.indexOf(' + ') + 3);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = INK;
      ctx.fillText(line, cx, top + size * 0.95);
      markerText(ctx, `${fmtScore(r.points)} × ${r.mult}`, cx, top + size * 1.6, size * 0.6, '#f4c542', -0.02);
    }

    this.drawProgress(ctx, w, h);
    if (this.result) {
      const p = this.result;
      const y = top + size * (sk.combo.active ? 2.6 : 0.9);
      ctx.globalAlpha = clamp((1.6 - p.t) / 0.4, 0, 1);
      const pop = 1 + 0.4 * Math.exp(-p.t * 12);
      markerText(ctx, p.text, cx, y, size * 0.9, p.color, -0.04, pop);
      if (p.sub) markerText(ctx, p.sub, cx + size * 0.3, y + size * 0.7, size * 0.4, '#ffffff', -0.04, pop);
      ctx.globalAlpha = 1;
    }
  }
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
  ['after the ollie:', '→ kickflip   ← heelflip   ↓ shove-it   ↑ impossible'],
  ['two quick taps:', '↓→ tre flip   ↓← laser   →→ double kick   ↓↓ 360 shuv   →↓ varial'],
  ['hold Q / E', 'spin backside / frontside (180, 360, 540...)'],
  ['Space + arrow', 'grab:  → Indy   ← Melon   ↓ Stalefish   ↑ Method  (let go to land!)'],
  ['land on a rail', 'nothing 50-50 · forward nosegrind · back 5-0 · ↓ boardslide · ↑ crooked'],
  ['↓ as you land', 'manual (↑ nose manual) · ← → balance · ↓ set it down · ↑ ollie out'],
  ['Q / E after landing', 'revert: keeps the combo going'],
  ['F', 'pick up / throw down your board · carrying it: ↑ jump, then F for a caveman'],
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
  HELP_LINES.forEach(([k, v], i) => {
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

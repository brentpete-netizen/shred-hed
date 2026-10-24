// Chat in an online room: press T (or tap CHAT), type, Enter to send. Messages go to everyone
// in the room through the host, like everything else, and show bottom left for a little while.
// In a public park, full of people you don't know, it's quick-chat: pick one of a few friendly
// phrases (and typed messages from anyone else just aren't shown).

const CHAT_MAX = 80;    // letters in one message
const CHAT_SHOW = 12;   // seconds a message stays up in the game
const CHAT_LINES = 6;   // how many show at once
const QUICK_CHAT = ['Hi!', 'Nice!', 'Sick trick!', "Let's go!", 'Follow me!', 'Watch this!', 'GG', 'Bye!'];

const cleanChat = s => String(s ?? '').replace(/[^\x20-\x7e]/g, '').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX);

const Chat = (() => {
  const log = [];       // { name, text, at, mine }
  let draft = null;     // what you're typing, or null when you're not
  let quick = false;    // the quick-chat list is open
  let button = null;    // where the CHAT button was drawn, for taps
  let quickHits = [];   // where the quick-chat phrases were drawn, for taps

  function add(name, text, mine = false) {
    text = cleanChat(text);
    if (!text) return;
    log.push({ name: cleanName(name), text, at: performance.now() / 1000, mine });
    if (log.length > 40) log.shift();
    if (!mine && typeof Sound !== 'undefined') Sound.play('menuMove');
  }

  Net.on('chat', msg => {
    const p = Net.players.find(q => q.id === msg.from), name = p ? p.name : 'Skater';
    if (Number.isInteger(msg.q) && QUICK_CHAT[msg.q]) add(name, QUICK_CHAT[msg.q]);
    else if (!Net.public) add(name, msg.text);
  });

  function send(text) {
    text = cleanChat(text);
    if (!text || !Net.active) return;
    Net.send({ t: 'chat', text });
    add(onlineName(), text, true);
  }

  function sendQuick(i) {
    close();
    if (!Net.active || !QUICK_CHAT[i]) return;
    Net.send({ t: 'chat', q: i });
    add(onlineName(), QUICK_CHAT[i], true);
  }

  function close() {
    draft = null;
    quick = false;
    Input.textCapture = null;
  }

  function open() {
    if (!Net.active || draft !== null) return;
    if (Net.public) {
      // public park: pick a phrase (1 to 8, or tap one) and keep skating while you do
      quick = !quick;
      return;
    }
    if (navigator.maxTouchPoints > 0 && !matchMedia('(pointer: fine)').matches) {
      // no keyboard to type on: a pop-up instead
      const text = window.prompt('Say something to the room:');
      if (text) send(text);
      return;
    }
    draft = '';
    Input.textCapture = key => {
      if (key === 'Escape') return close();
      if (key === 'Enter') { const text = draft; close(); return send(text); }
      if (key === 'Backspace') draft = draft.slice(0, -1);
      else if (key.length === 1 && draft.length < CHAT_MAX) draft += key;
    };
  }

  // Bottom left: the latest messages (fading out in the game; all recent ones in the lobby),
  // the line you're typing, and a CHAT button.
  function draw(ctx, w, h, lobby = false) {
    if (!Net.active) { button = null; return; }
    const now = performance.now() / 1000, fs = Math.max(14, Math.min(18, w / 55));
    const x = 16, bottom = h - 16 - (typeof TouchPad !== 'undefined' && !lobby ? TouchPad.bottomSpace(h) : 0); // above the touch buttons
    const bw = 76, bh = 30;
    Sketch.seedFor(620);
    const box = [{ x, y: bottom - bh }, { x: x + bw, y: bottom - bh }, { x: x + bw, y: bottom }, { x, y: bottom }];
    Sketch.fill(ctx, box, draft !== null || quick ? '#f4c542' : '#fbf8f0', 1.5);
    Sketch.stroke(ctx, box, { color: INK, width: 1.8, amp: 0.8, closed: true });
    markerText(ctx, 'CHAT', x + bw / 2, bottom - bh / 2 + 1, 15, '#ffffff');
    button = { x, y: bottom - bh, w: bw, h: bh };

    let y = bottom - bh - 10;
    ctx.font = `${fs}px ${HAND}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    quickHits = [];
    if (quick) {
      // the quick-chat phrases, two to a row, numbered for the keyboard
      const rh = Math.max(30, fs * 1.8), gap = 6, cw = Math.min(170, (w - 40) / 2), rows = Math.ceil(QUICK_CHAT.length / 2);
      const top = y - rows * (rh + gap);
      QUICK_CHAT.forEach((phrase, i) => {
        const bx = x + (i % 2) * (cw + gap), by = top + Math.floor(i / 2) * (rh + gap);
        Sketch.seedFor(630 + i);
        const b = [{ x: bx, y: by }, { x: bx + cw, y: by }, { x: bx + cw, y: by + rh }, { x: bx, y: by + rh }];
        Sketch.fill(ctx, b, '#fbf8f0', 1.5);
        Sketch.stroke(ctx, b, { color: INK, width: 1.6, amp: 0.6, closed: true });
        ctx.font = `${fs}px ${HAND}`;
        ctx.fillStyle = '#e2553f';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${i + 1}`, bx + 9, by + rh / 2 + 1);
        ctx.fillStyle = INK;
        ctx.fillText(phrase, bx + 26, by + rh / 2 + 1);
        quickHits.push({ x: bx, y: by, w: cw, h: rh, i });
      });
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = INK;
      ctx.fillText('pick one (1 to 8) · T or Esc to close', x + 2, top - 6);
      y = top - fs * 1.6;
    } else if (draft !== null) {
      const caret = Math.floor(now * 2.5) % 2 ? '|' : '';
      const line = `say: ${draft}${caret}`;
      ctx.fillStyle = 'rgba(251, 248, 240, 0.9)';
      ctx.fillRect(x - 4, y - fs * 1.3, Math.min(w - 24, ctx.measureText(line).width + 12), fs * 1.35);
      ctx.fillStyle = '#e2553f';
      ctx.fillText(line, x + 2, y);
      y -= fs * 1.5;
      ctx.fillStyle = INK;
      ctx.fillText('Enter send · Esc cancel', x + 2, y);
      y -= fs * 1.4;
    }
    if (!lobby && !quick && draft === null) {
      ctx.fillStyle = INK;
      ctx.fillText('T to chat', x + bw + 10, bottom - 6);
    }
    const recent = log.filter(m => lobby || draft !== null || quick || now - m.at < CHAT_SHOW).slice(-CHAT_LINES);
    for (let i = recent.length - 1; i >= 0; i--) {
      const m = recent[i], age = now - m.at;
      ctx.globalAlpha = lobby || draft !== null || quick ? 1 : clamp((CHAT_SHOW - age) / 1.5, 0, 1);
      const name = `${m.name}: `;
      ctx.font = `${fs}px ${MARKER}`;
      const nw = ctx.measureText(name).width;
      ctx.font = `${fs}px ${HAND}`;
      const tw = Math.min(w - 40 - nw, ctx.measureText(m.text).width);
      ctx.fillStyle = 'rgba(251, 248, 240, 0.85)';
      ctx.fillRect(x - 4, y - fs * 1.3, nw + tw + 12, fs * 1.35);
      ctx.font = `${fs}px ${MARKER}`;
      ctx.fillStyle = m.mine ? '#2f80ed' : '#e2553f';
      ctx.fillText(name, x + 2, y);
      ctx.font = `${fs}px ${HAND}`;
      ctx.fillStyle = INK;
      let text = m.text;
      while (ctx.measureText(text).width > tw && text.length > 3) text = text.slice(0, -2);
      ctx.fillText(text === m.text ? text : text + '…', x + 2 + nw, y);
      y -= fs * 1.5;
    }
    ctx.globalAlpha = 1;
  }

  // A tap or click on the CHAT button (or one of the quick-chat phrases).
  function click(px, py) {
    const hit = quickHits.find(q => px >= q.x && px <= q.x + q.w && py >= q.y && py <= q.y + q.h);
    if (hit) { sendQuick(hit.i); return true; }
    if (!button || px < button.x || px > button.x + button.w || py < button.y || py > button.y + button.h) return false;
    open();
    return true;
  }

  function clear() { log.length = 0; close(); }

  // the number keys pick a quick-chat phrase, and Esc closes the list (rather than leaving the park)
  addEventListener('keydown', e => {
    if (!quick) return;
    if (/^(Digit|Numpad)[1-8]$/.test(e.code)) sendQuick(+e.code.slice(-1) - 1);
    else if (e.code === 'Escape') close();
    else return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  return { open, close, send, draw, click, clear, add, get typing() { return draft !== null; }, log };
})();

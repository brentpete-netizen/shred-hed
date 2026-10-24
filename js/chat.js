// Chat in an online room: press T (or tap CHAT), type, Enter to send. Messages go to everyone
// in the room through the host, like everything else, and show bottom left for a little while.

const CHAT_MAX = 80;    // letters in one message
const CHAT_SHOW = 12;   // seconds a message stays up in the game
const CHAT_LINES = 6;   // how many show at once

const cleanChat = s => String(s ?? '').replace(/[^\x20-\x7e]/g, '').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX);

const Chat = (() => {
  const log = [];       // { name, text, at, mine }
  let draft = null;     // what you're typing, or null when you're not
  let button = null;    // where the CHAT button was drawn, for taps

  function add(name, text, mine = false) {
    text = cleanChat(text);
    if (!text) return;
    log.push({ name: cleanName(name), text, at: performance.now() / 1000, mine });
    if (log.length > 40) log.shift();
    if (!mine && typeof Sound !== 'undefined') Sound.play('menuMove');
  }

  Net.on('chat', msg => {
    const p = Net.players.find(q => q.id === msg.from);
    add(p ? p.name : 'Skater', msg.text);
  });

  function send(text) {
    text = cleanChat(text);
    if (!text || !Net.active) return;
    Net.send({ t: 'chat', text });
    add(onlineName(), text, true);
  }

  function close() {
    draft = null;
    Input.textCapture = null;
  }

  function open() {
    if (!Net.active || draft !== null) return;
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
    const x = 16, bottom = h - 16;
    const bw = 76, bh = 30;
    Sketch.seedFor(620);
    const box = [{ x, y: bottom - bh }, { x: x + bw, y: bottom - bh }, { x: x + bw, y: bottom }, { x, y: bottom }];
    Sketch.fill(ctx, box, draft !== null ? '#f4c542' : '#fbf8f0', 1.5);
    Sketch.stroke(ctx, box, { color: INK, width: 1.8, amp: 0.8, closed: true });
    markerText(ctx, 'CHAT', x + bw / 2, bottom - bh / 2 + 1, 15, '#ffffff');
    button = { x, y: bottom - bh, w: bw, h: bh };

    let y = bottom - bh - 10;
    ctx.font = `${fs}px ${HAND}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    if (draft !== null) {
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
    } else if (!lobby) {
      ctx.fillStyle = INK;
      ctx.fillText('T to chat', x + bw + 10, bottom - 6);
    }
    const recent = log.filter(m => lobby || draft !== null || now - m.at < CHAT_SHOW).slice(-CHAT_LINES);
    for (let i = recent.length - 1; i >= 0; i--) {
      const m = recent[i], age = now - m.at;
      ctx.globalAlpha = lobby || draft !== null ? 1 : clamp((CHAT_SHOW - age) / 1.5, 0, 1);
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

  // A tap or click on the CHAT button.
  function click(px, py) {
    if (!button || px < button.x || px > button.x + button.w || py < button.y || py > button.y + button.h) return false;
    open();
    return true;
  }

  function clear() { log.length = 0; close(); }

  return { open, close, send, draw, click, clear, add, get typing() { return draft !== null; }, log };
})();

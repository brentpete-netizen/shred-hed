// Keyboard input. WASD and the arrow keys both work.
// Presses are queued in order so quick combos (like ↓ then →) are never missed.
// While naming a park, textCapture gets the raw keys instead.

const Input = (() => {
  const KEYS = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    KeyQ: 'spinBack', KeyE: 'spinFront', Space: 'grab',
    KeyF: 'fit', // the closet's Fit screen
    Digit1: 'slot1', Digit2: 'slot2', // load (or with Shift, save) a closet outfit
    KeyH: 'help', KeyR: 'reset', KeyM: 'mute', Backquote: 'debug',
    Enter: 'start', Escape: 'menu',
    // park builder
    Delete: 'delete', Backspace: 'delete', KeyZ: 'undo', KeyY: 'redo',
    BracketLeft: 'shorter', BracketRight: 'longer', KeyN: 'rename', KeyT: 'test',
    ShiftLeft: 'shift', ShiftRight: 'shift',
  };
  // with Shift held at the moment the key goes down
  const SHIFTED = { Digit1: 'saveSlot1', Digit2: 'saveSlot2' };
  const heldCodes = new Set();
  const touches = new Map(); // on-screen buttons being held: finger (pointer id) -> action
  let queue = [];
  const api = {
    textCapture: null,
    held(action) {
      for (const code of heldCodes) if (KEYS[code] === action) return true;
      for (const a of touches.values()) if (a === action) return true;
      return false;
    },
    // a finger on an on-screen button (see touch.js): a press, held until it lets go
    touchDown(id, action) {
      if (touches.get(id) === action) return;
      touches.set(id, action);
      queue.push(action);
    },
    touchUp(id) { touches.delete(id); },
    // Returns every press since the last call, oldest first.
    drain() {
      const q = queue;
      queue = [];
      return q;
    },
  };

  addEventListener('keydown', e => {
    if (api.textCapture) {
      e.preventDefault();
      api.textCapture(e.key);
      return;
    }
    const action = (e.shiftKey && SHIFTED[e.code]) || KEYS[e.code];
    if (!action) return;
    e.preventDefault();
    if (e.repeat && action !== 'left' && action !== 'right' && action !== 'delete') return;
    if (e.repeat && !api.repeatOk) return;
    heldCodes.add(e.code);
    queue.push(action);
  });
  addEventListener('keyup', e => heldCodes.delete(e.code));
  addEventListener('blur', () => { heldCodes.clear(); touches.clear(); });

  return api;
})();

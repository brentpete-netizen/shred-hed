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
    KeyH: 'help', KeyR: 'reset', KeyM: 'mute', Backquote: 'debug',
    Enter: 'start', Escape: 'menu',
    // park builder
    Delete: 'delete', Backspace: 'delete', KeyZ: 'undo', KeyY: 'redo',
    BracketLeft: 'shorter', BracketRight: 'longer', KeyN: 'rename', KeyT: 'test',
    ShiftLeft: 'shift', ShiftRight: 'shift',
  };
  const heldCodes = new Set();
  let queue = [];
  const api = {
    textCapture: null,
    held(action) {
      for (const code of heldCodes) if (KEYS[code] === action) return true;
      return false;
    },
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
    const action = KEYS[e.code];
    if (!action) return;
    e.preventDefault();
    if (e.repeat && action !== 'left' && action !== 'right' && action !== 'delete') return;
    if (e.repeat && !api.repeatOk) return;
    heldCodes.add(e.code);
    queue.push(action);
  });
  addEventListener('keyup', e => heldCodes.delete(e.code));
  addEventListener('blur', () => heldCodes.clear());

  return api;
})();

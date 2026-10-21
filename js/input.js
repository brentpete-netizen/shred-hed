// Keyboard input. WASD and the arrow keys both work.
// Presses are queued in order so quick combos (like ↓ then →) are never missed.

const Input = (() => {
  const KEYS = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    KeyQ: 'spinBack', KeyE: 'spinFront', Space: 'grab',
    KeyH: 'help', KeyR: 'reset', KeyM: 'mute', Backquote: 'debug',
    Enter: 'start', Escape: 'menu',
  };
  const heldCodes = new Set();
  let queue = [];

  addEventListener('keydown', e => {
    const action = KEYS[e.code];
    if (!action) return;
    e.preventDefault();
    if (e.repeat) return;
    heldCodes.add(e.code);
    queue.push(action);
  });
  addEventListener('keyup', e => heldCodes.delete(e.code));
  addEventListener('blur', () => heldCodes.clear());

  return {
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
})();

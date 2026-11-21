// Keyboard + mouse input. Movement is WASD or arrows; Shift sneaks (slow, quiet),
// Space sprints (fast, loud, drains stamina); a mouse click throws a pebble that
// clatters and pulls nearby wardens toward where it lands. P pauses, Enter confirms.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_THROW = 4;

const MOVE_KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let click = null;

  function onKeyDown(event) {
    if (event.code in MOVE_KEYS || event.code === 'ShiftLeft' || event.code === 'ShiftRight' || event.code === 'Space') {
      event.preventDefault();
    }
    if (event.repeat) return;
    held.add(event.code);
    if (event.code === 'Enter' || event.code === 'Space') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function onMouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    click = {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 720,
    };
    actions |= ACTION_THROW;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);

  return {
    /** Normalised movement direction from the keys held this frame. */
    direction() {
      let x = 0;
      let y = 0;
      for (const code of held) {
        const move = MOVE_KEYS[code];
        if (move) {
          x += move[0];
          y += move[1];
        }
      }
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const length = Math.hypot(x, y);
      return { x: x / length, y: y / length };
    },
    sneaking() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    sprinting() {
      return held.has('Space');
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The last click's playfield coordinates (or null); consumed on read. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
  };
}

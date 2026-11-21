// Keyboard + mouse input. WASD or arrows move; Shift sneaks (slow, quiet),
// Space sprints (fast, loud, drains stamina); a click throws a pebble that
// clatters and pulls nearby wardens toward where it lands. P pauses, Enter
// confirms on the menu screens.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_THROW = 4;

const KEY_VECTORS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

const HANDLED_CODES = new Set([
  ...Object.keys(KEY_VECTORS), 'ShiftLeft', 'ShiftRight', 'Space',
]);

function isHandledCode(code) {
  return HANDLED_CODES.has(code);
}

export function createInput(canvas) {
  const pressed = new Set();
  let queued = 0;
  let lastClick = null;

  const onKeyDown = (event) => {
    if (isHandledCode(event.code)) event.preventDefault();
    if (event.repeat) return;
    pressed.add(event.code);
    if (event.code === 'Enter' || event.code === 'Space') queued |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') queued |= ACTION_PAUSE;
  };

  const onKeyUp = (event) => {
    pressed.delete(event.code);
  };

  const onMouseDown = (event) => {
    const box = canvas.getBoundingClientRect();
    lastClick = {
      x: ((event.clientX - box.left) / box.width) * 1280,
      y: ((event.clientY - box.top) / box.height) * 720,
    };
    queued |= ACTION_THROW;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);

  return {
    // Unit movement direction from the keys held this frame, or zero.
    direction() {
      let dx = 0;
      let dy = 0;
      for (const code of pressed) {
        const step = KEY_VECTORS[code];
        if (!step) continue;
        dx += step[0];
        dy += step[1];
      }
      if (dx === 0 && dy === 0) return { x: 0, y: 0 };
      const len = Math.hypot(dx, dy);
      return { x: dx / len, y: dy / len };
    },
    sneaking() {
      return pressed.has('ShiftLeft') || pressed.has('ShiftRight');
    },
    sprinting() {
      return pressed.has('Space');
    },
    takeActions() {
      const taken = queued;
      queued = 0;
      return taken;
    },
    // The last click's playfield coordinates (or null); consumed on read.
    takeClick() {
      const taken = lastClick;
      lastClick = null;
      return taken;
    },
  };
}

// Lantern Heist — keyboard and mouse input.
// WASD / arrows move, Shift sneaks, click throws a pebble, P or Esc pauses,
// Enter / Space confirms, R restarts the level, M mutes. Actions are
// consumed once (takeActions) so a single press never fires twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let click = null; // { x, y } in canvas pixels, consumed by the game loop
  let clickSeen = false;

  function keyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    if (e.key === 'Enter' || e.key === ' ') actions |= ACTION_CONFIRM;
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') actions |= ACTION_PAUSE;
    if (e.key === 'r' || e.key === 'R') actions |= ACTION_RESTART;
    if (e.key === 'm' || e.key === 'M') actions |= ACTION_MUTE;
  }

  function keyUp(e) {
    keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  }

  function mouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    click = { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    clickSeen = true;
    actions |= ACTION_CONFIRM; // a click also starts the game from a menu
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('mousedown', mouseDown);

  return {
    /** Normalised move vector from the held keys, plus whether Shift is held. */
    direction() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('d') || keys.has('ArrowRight')) x += 1;
      if (keys.has('w') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('s') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      return { x, y, sneak: keys.has('Shift') };
    },
    /** One-shot actions pressed since the last call. */
    takeActions() {
      const a = actions;
      actions = 0;
      return a;
    },
    /** One-shot mouse click in canvas pixels, or null. */
    takeClick() {
      if (!clickSeen) return null;
      clickSeen = false;
      return click;
    },
    /** True while the pointer is over the canvas (for the pebble hint). */
    get hasPointer() { return click !== null; },
  };
}

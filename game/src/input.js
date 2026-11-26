// Keyboard and mouse input: W/S throttle, arrows or mouse pitch, A/D roll, C camera, M mission.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_CAMERA = 4;
export const ACTION_MISSION = 8;
export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let mousePitch = 0;
  let mouseRoll = 0;
  const down = (e) => {
    held.add(e.code);
    if (!e.repeat && (e.code === 'Space' || e.code === 'Enter')) actions |= ACTION_CONFIRM;
    if (!e.repeat && (e.code === 'KeyP' || e.code === 'Escape')) actions |= ACTION_PAUSE;
    if (!e.repeat && e.code === 'KeyC') actions |= ACTION_CAMERA;
    if (!e.repeat && e.code === 'KeyM') actions |= ACTION_MISSION;
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  };
  const up = (e) => held.delete(e.code);
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouseRoll = ((e.clientX - r.left) / r.width - 0.5) * 2;
    mousePitch = (0.5 - (e.clientY - r.top) / r.height) * 2;
  });
  canvas.addEventListener('pointerdown', () => { actions |= ACTION_CONFIRM; });
  function axis(pos, neg, mouse) {
    const key = (held.has(pos) ? 1 : 0) - (held.has(neg) ? 1 : 0);
    return key !== 0 ? key : Math.max(-1, Math.min(1, mouse));
  }
  return {
    read() {
      return {
        throttle: (held.has('KeyW') || held.has('ShiftLeft') ? 1 : 0) - (held.has('KeyS') || held.has('ControlLeft') ? 1 : 0),
        pitch: axis('ArrowUp', 'ArrowDown', mousePitch),
        roll: axis('KeyD', 'KeyA', mouseRoll),
      };
    },
    takeActions() { const a = actions; actions = 0; return a; },
  };
}

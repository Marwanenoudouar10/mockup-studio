// Keyboard: arrows nudge the selected element (Shift = 10), Cmd/Ctrl+Z undo, Shift+Cmd/Ctrl+Z (or Ctrl+Y)
// redo, Delete removes an element added in the workspace, Esc deselects, Space holds the pan hand,
// Shift+1 fit, Cmd/Ctrl+0 = 100 %, + and - zoom. Nothing fires while typing in a field.
import { state, selected, emit } from '../state.js';
import { fit, zoomBy } from './viewport.js';
import { keys, select } from './pointer.js';
import { commit, undo, redo, remove } from '../edits.js';

let canvas;
let nudge = null; // { frame, el, before, values, timer }

const typing = (e) => e.target.closest && e.target.closest('input, textarea, select, [contenteditable]');

function doNudge(e) {
  const { frame: f, el } = selected();
  if (!f || !el || el.type === 'text' || !f.editable) return false;
  const step = e.shiftKey ? 10 : 1;
  const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (!nudge || nudge.el.id !== el.id || nudge.frame !== f) nudge = { frame: f, el, before: { ...el.values }, values: { ...el.values } };
  nudge.values.x += dir[0] * step * Math.sign(el.map.ux || 1);
  nudge.values.y += dir[1] * step * Math.sign(el.map.uy || 1);
  f.post({ ss: 'set', panel: el.panel, id: el.id, values: { x: nudge.values.x, y: nudge.values.y } });
  clearTimeout(nudge.timer);
  const n = nudge;
  n.timer = setTimeout(() => {
    nudge = null;
    commit(n.frame, n.el, n.before, n.values, 'nudge');
  }, 450);
  return true;
}

function down(e) {
  if (typing(e)) return;
  const mod = e.metaKey || e.ctrlKey;
  if (e.key === ' ' && !keys.space) {
    keys.space = true;
    canvas.classList.add('space');
    e.preventDefault();
    return;
  }
  if (mod && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); (e.shiftKey ? redo : undo)(); return; }
  if (mod && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); return; }
  if (mod && e.key === '0') { e.preventDefault(); zoomBy(1 / state.view.z); return; }
  if (e.key.startsWith('Arrow') && !mod) { if (doNudge(e)) e.preventDefault(); return; }
  if (e.key === 'Escape') { select(null); return; }
  if ((e.key === 'Delete' || e.key === 'Backspace') && !mod) {
    const { frame, el } = selected();
    if (frame && el && el.added) { e.preventDefault(); remove(frame, el).then(() => select({ frame: frame.key, panel: el.panel, id: null })); }
    return;
  }
  if (e.code === 'Digit1' && e.shiftKey) { e.preventDefault(); fit(); return; }
  if (!mod && (e.key === '+' || e.key === '=')) { zoomBy(1.25); return; }
  if (!mod && (e.key === '-' || e.key === '_')) { zoomBy(0.8); }
}

export function initKeys(els) {
  ({ canvas } = els);
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', (e) => {
    if (e.key === ' ') { keys.space = false; canvas.classList.remove('space'); }
  });
  window.addEventListener('blur', () => { keys.space = false; canvas.classList.remove('space'); });
  emit('keys-ready');
}

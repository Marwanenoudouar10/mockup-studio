// Keys in screen mode: arrows nudge the selected screen element 1 CSS px of the screen (Shift: 10), shown at once
// and saved as one edit after a short pause; Enter types its words; Shift+Cmd/Ctrl+H hides or shows it; Esc
// leaves screen mode. Undo and redo stay the board's (one history for layout.json and edits.json).
import { state, frames } from '../state.js';
import { leave, itemOf } from './enter.js';
import { startText } from './text.js';
import { preview, merged, setEdit, editOf } from './patches.js';

const DIRS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
let nudge = null; // { item, dx, dy, timer }

export function flushNudge() {
  if (!nudge) return Promise.resolve();
  clearTimeout(nudge.timer);
  const n = nudge;
  nudge = null;
  return setEdit(n.item, { dx: n.dx, dy: n.dy }, 'nudge');
}

function step(it, [x, y], by) {
  const s = state.screen;
  if (!nudge || nudge.item.eid !== it.eid) {
    if (nudge) flushNudge();
    const cur = editOf(s.screen, it.eid) || {};
    nudge = { item: it, dx: cur.dx || 0, dy: cur.dy || 0 };
  }
  nudge.dx = Math.max(-500, Math.min(500, nudge.dx + x * by));
  nudge.dy = Math.max(-500, Math.min(500, nudge.dy + y * by));
  preview(s.screen, it.eid, merged(it, { dx: nudge.dx, dy: nudge.dy }), frames.get(s.frame));
  clearTimeout(nudge.timer);
  nudge.timer = setTimeout(flushNudge, 450);
}

// -> true when the key was a screen-mode key (the caller prevents its default)
export function screenKey(e) {
  const s = state.screen;
  if (!s) return false;
  const mod = e.metaKey || e.ctrlKey;
  const it = itemOf(s.sel);
  if (e.key === 'Escape') {
    flushNudge();
    leave();
    return true;
  }
  if (e.key === 'Enter' && !mod && it) return startText(it.eid) || true;
  if (mod && e.shiftKey && (e.key === 'h' || e.key === 'H') && it) {
    setEdit(it, { hidden: !it.hidden }, it.hidden ? 'show' : 'hide');
    return true;
  }
  if (DIRS[e.key] && !mod && it) {
    step(it, DIRS[e.key], e.shiftKey ? 10 : 1);
    return true;
  }
  return false;
}

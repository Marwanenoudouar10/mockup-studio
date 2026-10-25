// Typing on the canvas: a text layer of the entered screen (double-click it, or Enter, or "Edit on canvas") and the
// headline or sub line of an image (double-click it). The words are typed IN the frame, in the real font and size
// (contenteditable, engine/core/edit-screen.js): Enter saves, Esc cancels, a click elsewhere saves. The frame
// answers with the words, which go to edits.json (patches.js). Keys typed there never reach the board's shortcuts.
// The frame needs a moment (about 100 ms) to make the words editable: keys typed before it says so (text-started /
// copy-started) are kept here (bufferKey, from canvas/keys.js) and sent to the frame in its answer (type-keys,
// always sent, maybe empty); the frame holds the keys typed into it until then and replays both in order, Enter
// and Esc included.
// Enter with nothing changed says so.
import { state, frames, emit } from '../state.js';
import { setEdit, setCopy, resume } from './patches.js';
import { texty } from './names.js';
import { toast } from '../panels/toast.js';

let canvas;
let early = null; // { frame, keys, t0 } from the start of an edit until the frame says the words are editable
const EARLY_MS = 2000; // a frame that never answers (reloaded meanwhile) gives the keys back to the board

// -> true when the key was kept for the edit that is starting (the caller prevents its default)
export function bufferKey(e) {
  if (early && Date.now() - early.t0 > EARLY_MS) early = null;
  if (!early || e.metaKey || e.ctrlKey || e.isComposing) return false;
  const k = e.key === 'Enter' && e.shiftKey ? 'BR' : e.key;
  if (k.length !== 1 && !['Enter', 'Escape', 'Backspace', 'BR'].includes(k)) return false;
  early.keys.push(k);
  return true;
}

export function startText(eid, { quiet = false } = {}) {
  const s = state.screen;
  const f = s && frames.get(s.frame);
  const it = s && s.items.find((i) => i.eid === eid);
  if (!f || !it) return false;
  if (!texty(it)) {
    if (!quiet) toast('This layer has no words of its own: pick a text layer');
    return false;
  }
  stopTyping();
  s.sel = eid;
  s.typing = eid;
  early = { frame: f.key, keys: [], t0: Date.now() };
  emit('screen-sel');
  f.post({ ss: 'text-start', eid });
  return true;
}

export function startCopy(f, panel, field) {
  stopTyping();
  state.copyTyping = { frame: f.key, panel, field };
  early = { frame: f.key, keys: [], t0: Date.now() };
  emit('screen-sel');
  f.post({ ss: 'copy-start', panel, field });
}

// a click elsewhere on the board saves what is being typed
export function stopTyping() {
  const s = state.screen;
  const key = (s && s.typing && s.frame) || (state.copyTyping && state.copyTyping.frame);
  const f = key && frames.get(key);
  if (f) f.post({ ss: 'type-stop' });
}

export const typingNow = () => !!((state.screen && state.screen.typing) || state.copyTyping);

export function onTyped(f, m) {
  const s = state.screen;
  if (m.ss === 'text-started' || m.ss === 'copy-started') {
    // always answer: the frame holds what is typed there until it has the keys typed here first
    f.post({ ss: 'type-keys', keys: early && early.frame === f.key ? early.keys : [] });
    if (early && early.frame === f.key) early = null;
    return;
  }
  if (early && early.frame === f.key) early = null;
  if (m.enter && (m.ss === 'text-cancel' || m.ss === 'copy-cancel')) toast('Nothing changed');
  if (m.ss === 'text-commit' || m.ss === 'text-cancel') {
    if (s && s.frame === f.key) s.typing = null;
    if (m.ss === 'text-commit' && s && s.frame === f.key) {
      const it = s.items.find((i) => i.eid === m.eid) || { eid: m.eid };
      setEdit(it, { text: m.text }, 'text');
    }
  } else if (m.ss === 'copy-commit' || m.ss === 'copy-cancel') {
    state.copyTyping = null;
    if (m.ss === 'copy-commit') setCopy(f, m.panel, m.field, m.html);
  } else return;
  // the keys come back to the board (they went to the frame), unless a field of the inspector took the focus
  const at = document.activeElement;
  if (!at || at === document.body || at.tagName === 'IFRAME') canvas.focus({ preventScroll: true });
  emit('screen-sel');
  resume();
}

export function initText(els) {
  ({ canvas } = els);
}

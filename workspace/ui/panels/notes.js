// Notes for Claude: a pin on an image with a short request ("make the streak card bigger"), saved to the
// project's notes.json. Claude reads that file before changing a layout and marks notes done.
//   notes.json: { "notes": [{ id, store, panel, locale, element, x, y (0..1 of the image), text, done, created }] }
import { state, frames, on, emit } from '../state.js';
import { api } from '../api.js';
import { ui, redraw } from '../canvas/overlay.js';
import { select } from '../canvas/pointer.js';
import { toast } from './toast.js';

// the frame a note belongs to on the current board (null when its row is filtered out)
export function frameOf(note) {
  for (const f of frames.values()) {
    if (f.store === note.store && f.panels.some((p) => p.id === note.panel)) return f;
  }
  return null;
}

export const numberOf = (note) => state.project.notes.findIndex((n) => n.id === note.id) + 1;

export function notesFor(f, panel) {
  if (!state.project || !f) return [];
  return state.project.notes.filter((n) => n.store === f.store && n.panel === panel);
}

function pins() {
  const sel = state.selection;
  ui.pins = state.project ? state.project.notes.map((note, i) => {
    const f = frameOf(note);
    if (!f) return null;
    // in a panorama strip x is a fraction of that panel's slice
    const slices = f.kind === 'strip' ? f.panels.length : 1;
    const at = f.kind === 'strip' ? f.panels.findIndex((p) => p.id === note.panel) : 0;
    return { frame: f.key, n: i + 1, note: { ...note, x: (at + note.x) / slices }, on: sel && sel.note === note.id };
  }).filter(Boolean) : [];
  redraw();
}

async function save(op, note) {
  try {
    state.project.notes = await api.notes(state.project.slug, op, note);
    emit('notes', state.project.notes);
  } catch (err) {
    toast(`Note not saved: ${err.message}`, true);
  }
}

// place: { x, y } as fractions of the panel image
export function addNote(f, panel, element, place, text) {
  const id = `n${Date.now().toString(36)}`;
  return save('put', { id, store: f.store, panel, locale: state.locale, element, x: place.x, y: place.y, text, done: false })
    .then(() => toast('Note saved → notes.json · Claude reads it'));
}

export const setDone = (note, done) => save('put', { ...note, done });
export const deleteNote = (note) => save('delete', note);

export function initNotes(els) {
  els.overlay.addEventListener('pointerdown', (e) => {
    const pin = e.target.closest('.pin');
    if (!pin) return;
    e.stopPropagation();
    const note = state.project.notes.find((n) => n.id === pin.dataset.note);
    const f = note && frameOf(note);
    if (f) select({ frame: f.key, panel: note.panel, id: note.element && note.element !== 'copy' ? note.element : null, note: note.id });
  });
  for (const ev of ['notes', 'rows', 'project', 'select']) on(ev, pins);
}

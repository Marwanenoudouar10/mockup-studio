// Writes layout.json and notes.json inside a registered project: read, change, write atomically
// (edits.json: server/edits-store.js, with the same writer). Only these files, only known keys, only finite
// numbers; the caller already resolved the project.
//   layout patch:  { entries: [{ store, panel, id, value | null }], adds: [{ id, value | null }] }
//   notes patch:   { op: 'put' | 'delete', note: { id, store, panel, locale, element, x, y, text, done } }
// The shape of layout.json is documented in the template: scripts/lib/layout.js.
import fs from 'node:fs';
import path from 'node:path';

const MOVABLE = ['x', 'y', 'w', 'h', 'r', 'z', 'radius', 'size'];
const TYPES = new Set(['phone', 'device', 'tablet', 'browser', 'laptop', 'monitor', 'lift', 'tile', 'badge', 'text']);
const KEY = /^[\w*.-]{1,64}$/;
const NAME = /^(?!.*\.\.)[\w./-]{1,160}$/;
const own = new Map(); // abs file -> the text this process wrote last

export const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
export const bad = (msg) => Object.assign(new Error(msg), { status: 400 });

export function readJson(file, fallback) {
  try {
    const v = JSON.parse(fs.readFileSync(file, 'utf8'));
    return isObj(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

// atomic: a reader (a render, the engine) never sees half a file; isOwnWrite() knows the text
export function writeJson(file, data) {
  const text = `${JSON.stringify(data, null, 2)}\n`;
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
  own.set(file, text);
  return data;
}

// true when the file holds exactly what we wrote (the watcher then skips the reload). The first foreign
// content forgets our record, so a later outside edit back to the same text still reloads.
export function isOwnWrite(root, rel) {
  const file = path.join(root, rel);
  if (!own.has(file)) return false;
  let text = null;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    // deleted
  }
  if (text === own.get(file)) return true;
  own.delete(file);
  return false;
}

function numbers(v) {
  const out = {};
  for (const k of MOVABLE) {
    if (v[k] === undefined || v[k] === null) continue;
    const n = Number(v[k]);
    if (!Number.isFinite(n) || Math.abs(n) > 1e6) throw bad(`${k} must be a number`);
    out[k] = Math.round(n * 100) / 100;
  }
  return out;
}

function cleanAdd(id, v) {
  if (!isObj(v) || !TYPES.has(v.type)) throw bad('an added element needs a known type');
  if (!KEY.test(String(v.store || '*')) || !Number.isInteger(+v.panel) || +v.panel < 1) throw bad('bad store or panel');
  const out = { id, store: String(v.store || '*'), panel: +v.panel, type: v.type };
  for (const k of ['screen', 'box', 'device', 'platform']) {
    if (v[k] == null) continue;
    if (!NAME.test(String(v[k]))) throw bad(`bad ${k}`);
    out[k] = String(v[k]);
  }
  return { ...out, ...numbers(v) };
}

export const layoutPath = (root) => path.join(root, 'layout.json');
export const readLayout = (root) => readJson(layoutPath(root), {});

export function patchLayout(root, patch) {
  if (!isObj(patch)) throw bad('expected a JSON object');
  const doc = readLayout(root);
  for (const e of patch.entries || []) {
    if (!KEY.test(String(e.store)) || !Number.isInteger(+e.panel) || +e.panel < 1 || !KEY.test(String(e.id))) throw bad('bad store, panel or id');
    const S = String(e.store);
    const P = String(+e.panel);
    if (S === 'add') throw bad('"add" is not a store');
    if (e.value === null) {
      if (doc[S] && doc[S][P]) delete doc[S][P][e.id];
    } else {
      if (!isObj(e.value)) throw bad('value must be an object or null');
      const v = numbers(e.value);
      if (typeof e.value.of === 'string' && e.value.of.length <= 160) v.of = e.value.of;
      ((doc[S] ||= {})[P] ||= {})[e.id] = v;
    }
  }
  for (const a of patch.adds || []) {
    if (!KEY.test(String(a.id))) throw bad('bad add id');
    const list = Array.isArray(doc.add) ? doc.add.filter((x) => x && x.id !== a.id) : [];
    const at = Array.isArray(doc.add) ? doc.add.findIndex((x) => x && x.id === a.id) : -1;
    if (a.value !== null) list.splice(at < 0 ? list.length : at, 0, cleanAdd(String(a.id), a.value));
    doc.add = list;
  }
  // tidy: no empty panels, stores or add list
  for (const [S, panels] of Object.entries(doc)) {
    if (S === 'add' || !isObj(panels)) continue;
    for (const [P, els] of Object.entries(panels)) if (!isObj(els) || !Object.keys(els).length) delete panels[P];
    if (!Object.keys(panels).length) delete doc[S];
  }
  if (Array.isArray(doc.add) && !doc.add.length) delete doc.add;
  return writeJson(layoutPath(root), doc);
}

export const notesPath = (root) => path.join(root, 'notes.json');
export const readNotes = (root) => {
  const d = readJson(notesPath(root), { notes: [] });
  return { notes: Array.isArray(d.notes) ? d.notes : [] };
};

export function patchNotes(root, { op, note } = {}) {
  if (!isObj(note) || !KEY.test(String(note.id))) throw bad('a note needs an id');
  const doc = readNotes(root);
  doc.notes = doc.notes.filter((n) => n && n.id !== note.id);
  if (op === 'put') {
    const text = String(note.text || '').slice(0, 2000).trim();
    if (!text) throw bad('a note needs text');
    const clean = {
      id: String(note.id), store: KEY.test(String(note.store)) ? String(note.store) : null,
      panel: Number.isInteger(+note.panel) ? +note.panel : null, locale: KEY.test(String(note.locale)) ? String(note.locale) : null,
      element: note.element != null && KEY.test(String(note.element)) ? String(note.element) : null,
      x: Math.max(0, Math.min(1, +note.x || 0)), y: Math.max(0, Math.min(1, +note.y || 0)),
      text, done: !!note.done, created: typeof note.created === 'string' ? note.created.slice(0, 40) : new Date().toISOString(),
    };
    doc.notes.push(clean);
  } else if (op !== 'delete') throw bad('op must be put or delete');
  return writeJson(notesPath(root), doc);
}

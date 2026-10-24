// Every change the workspace makes is a layout.json patch (server/store.js) with its inverse, so it can be
// undone and redone. Moves update the page live through the edit bridge; resets and "all stores" changes
// reload the frames that show that panel. layout.json format: the template's scripts/lib/layout.js.
import { state, frames, emit } from './state.js';
import { api } from './api.js';
import { toast } from './panels/toast.js';

const KEYS = ['x', 'y', 'w', 'h', 'r', 'z', 'radius', 'size'];
const undos = [];
const redos = [];
const SAVED = 'Saved position → layout.json · Claude and renders use it';

const doc = () => (state.project && state.project.layout) || {};
const entryOf = (S, panel, id) => {
  const e = doc()[S] && doc()[S][String(panel)] && doc()[S][String(panel)][String(id)];
  return e ? { ...e } : null;
};
export const addOf = (id) => (doc().add || []).find((a) => a && a.id === id) || null;

// where an element's position comes from right now: 'store' | 'all' | 'added' | 'config'
export function sourceOf(f, el) {
  if (el.added) return 'added';
  if (entryOf(f.store, el.panel, el.id)) return 'store';
  if (f.store !== 'feature' && entryOf('*', el.panel, el.id)) return 'all';
  return 'config';
}

// frames showing a config panel (store '*' = every store; the feature graphic only matches itself)
function framesFor(store, panel) {
  return [...frames.values()].filter((f) => f.editable && f.panels.some((p) => p.id === panel)
    && (store === 'feature' ? f.store === 'feature' : f.store !== 'feature' && (store === '*' || f.store === store)));
}

async function write(patch) {
  state.project.layout = await api.layout(state.project.slug, patch);
  emit('layout', state.project.layout);
}

function refresh(rec, dir) {
  const live = rec.live && rec.live[dir];
  if (live) {
    const f = frames.get(rec.live.frame);
    if (f) f.post(live);
    if (f && f.boxes && f.boxes.reflow) f.reload();
    return;
  }
  for (const f of framesFor(rec.store, rec.panel)) f.reload();
}

async function run(rec, msg) {
  try {
    await write(rec.do);
    undos.push(rec);
    redos.length = 0;
    refresh(rec, 'after');
    toast(msg || SAVED);
  } catch (err) {
    toast(`Not saved: ${err.message}`, true);
    refresh(rec, 'before');
  }
}

export async function undo() {
  const rec = undos.pop();
  if (!rec) return toast('Nothing to undo');
  if (rec.slug !== state.project.slug) { undos.push(rec); return toast('Undo: switch back to that project first'); }
  await write(rec.undo);
  redos.push(rec);
  refresh(rec, 'before');
  toast(`Undone: ${rec.what}`);
}

export async function redo() {
  const rec = redos.pop();
  if (!rec) return toast('Nothing to redo');
  if (rec.slug !== state.project.slug) { redos.push(rec); return toast('Redo: switch back to that project first'); }
  await write(rec.do);
  undos.push(rec);
  refresh(rec, 'after');
  toast(`Redone: ${rec.what}`);
}

const pick = (v, keys) => Object.fromEntries(keys.map((k) => [k, v[k]]));
const setMsg = (f, el, values) => ({ ss: 'set', panel: el.panel, id: el.id, values });

// a drag, rotate, resize, nudge or typed value: before/after are the element's values
export function commit(f, el, before, after, what = 'move') {
  const changed = KEYS.filter((k) => after[k] !== undefined && after[k] !== before[k]);
  if (!changed.length) return Promise.resolve();
  const live = { frame: f.key, before: setMsg(f, el, pick(before, changed)), after: setMsg(f, el, pick(after, changed)) };
  const base = { slug: state.project.slug, store: f.store, panel: el.panel, what, live };
  if (el.added) {
    const a = addOf(el.id);
    if (!a) return Promise.resolve();
    return run({ ...base, do: { adds: [{ id: a.id, value: { ...a, ...pick(after, changed) } }] }, undo: { adds: [{ id: a.id, value: a }] } });
  }
  const prev = entryOf(f.store, el.panel, el.id);
  const next = { ...(prev || {}), ...pick(after, changed), of: el.of };
  return run({
    ...base,
    do: { entries: [{ store: f.store, panel: el.panel, id: el.id, value: next }] },
    undo: { entries: [{ store: f.store, panel: el.panel, id: el.id, value: prev }] },
  });
}

// "Reset to config": drop this element's override here and for all stores; an added element is removed
export function reset(f, el) {
  const base = { slug: state.project.slug, panel: el.panel, what: 'reset' };
  if (el.added) return remove(f, el);
  const stores = f.store === 'feature' ? ['feature'] : [f.store, '*'];
  const had = stores.filter((S) => entryOf(S, el.panel, el.id));
  if (!had.length) return toast('Already as in the config');
  const store = had.includes('*') ? '*' : f.store;
  return run({
    ...base, store,
    do: { entries: had.map((S) => ({ store: S, panel: el.panel, id: el.id, value: null })) },
    undo: { entries: had.map((S) => ({ store: S, panel: el.panel, id: el.id, value: entryOf(S, el.panel, el.id) })) },
  }, `Reset to config${store === '*' ? ' (all stores)' : ''} → layout.json`);
}

// "Apply to all stores": this store's position becomes the "*" entry; other stores' own entries go
export function applyAll(f, el) {
  const base = { slug: state.project.slug, store: '*', panel: el.panel, what: 'apply to all stores' };
  if (el.added) {
    const a = addOf(el.id);
    return run({ ...base, do: { adds: [{ id: a.id, value: { ...a, store: '*' } }] }, undo: { adds: [{ id: a.id, value: a }] } },
      'Added element now on every store → layout.json');
  }
  const own = entryOf(f.store, el.panel, el.id);
  const all = entryOf('*', el.panel, el.id);
  const merged = { ...(all || {}), ...(own || {}) };
  delete merged.of;
  if (!Object.keys(merged).length) return toast('Nothing to apply: this element is where the config puts it');
  const stores = Object.keys(doc()).filter((S) => S !== 'add' && S !== '*' && S !== 'feature' && entryOf(S, el.panel, el.id));
  const entry = (S, value) => ({ store: S, panel: el.panel, id: el.id, value });
  return run({
    ...base,
    do: { entries: [entry('*', { ...merged, of: el.of }), ...stores.map((S) => entry(S, null))] },
    undo: { entries: [entry('*', all), ...stores.map((S) => entry(S, entryOf(S, el.panel, el.id)))] },
  }, 'Applied to all stores → layout.json');
}

// a screen dropped on an image: element = { type, screen, w, x, y, r, z }
export function addElement(f, panel, element) {
  const n = Math.max(0, ...(doc().add || []).map((a) => Number(String(a.id).replace(/\D/g, '')) || 0)) + 1;
  const id = `add-${n}`;
  const entry = { id, store: f.store, panel, ...element };
  const el = { ...element, id, $panel: panel };
  return run({
    slug: state.project.slug, store: f.store, panel, what: `add ${element.screen}`,
    live: { frame: f.key, after: { ss: 'add', element: el }, before: { ss: 'remove', panel, id } },
    do: { adds: [{ id, value: entry }] }, undo: { adds: [{ id, value: null }] },
  }, `Added “${element.screen}” → layout.json`).then(() => id);
}

export function remove(f, el) {
  const a = addOf(el.id);
  if (!a) return Promise.resolve();
  const back = { id: a.id, type: a.type, screen: a.screen, ...pick(a, KEYS.filter((k) => a[k] !== undefined)), $panel: a.panel };
  return run({
    slug: state.project.slug, store: f.store, panel: el.panel, what: `remove ${a.screen || a.id}`,
    live: { frame: f.key, after: { ss: 'remove', panel: el.panel, id: a.id }, before: { ss: 'add', element: back } },
    do: { adds: [{ id: a.id, value: null }] }, undo: { adds: [{ id: a.id, value: a }] },
  }, 'Removed the added element → layout.json');
}

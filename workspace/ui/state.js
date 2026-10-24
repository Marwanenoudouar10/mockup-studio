// App state + a tiny event bus. Everything else reads `state` and listens with on().
//   'project'  a project (re)loaded          'rows'    the board was rebuilt
//   'view'     pan / zoom changed            'boxes'   a frame reported its element boxes
//   'select'   the selection changed         'layout'  layout.json changed   'notes'  notes.json changed
export const state = {
  projects: [], // [{ slug, folder, name, color, error }]
  slug: null,
  project: null, // ui/model.js
  tab: 'all',
  locale: null,
  view: { x: 40, y: 40, z: 0.4 },
  selection: null, // { frame: key, panel, id }  id 'copy' = the headline block, null = the image itself
  hover: null,
  live: false,
};

const bus = new EventTarget();
export const on = (name, fn) => bus.addEventListener(name, (e) => fn(e.detail));
export const emit = (name, detail) => bus.dispatchEvent(new CustomEvent(name, { detail }));

// the frames on the board, by key (ui/canvas/frame.js)
export const frames = new Map();

export function selected() {
  const s = state.selection;
  if (!s) return { frame: null, el: null };
  const frame = frames.get(s.frame) || null;
  const boxes = frame && frame.boxes;
  let el = null;
  if (boxes && s.id === 'copy') {
    const c = boxes.copies.find((x) => x.panel === s.panel);
    el = c ? { ...c, id: 'copy', type: 'text', values: null } : null;
  } else if (boxes && s.id != null) {
    el = boxes.elements.find((e) => e.panel === s.panel && String(e.id) === String(s.id)) || null;
  }
  return { frame, el };
}

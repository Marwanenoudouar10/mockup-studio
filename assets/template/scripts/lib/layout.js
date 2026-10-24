// layout.json: position overrides made in Store Studio (workspace/) by dragging, or written by hand.
// Applied right after the config is resolved for one target, by the live pages and by every render,
// so the final PNGs match what the workspace shows. Pure ESM (imported by Node scripts and pages).
//
//   {
//     "*":        { "<panel>": { "<element id>": { "x": 1010, "y": 410, "r": 4 } } },   every store
//     "appstore": { "1": { "2": { "x": 980, "of": "lift:insights:streak" } } },          one store (wins over "*")
//     "feature":  { "1": { "3": { "x": 800 } } },                                        the Play feature graphic
//     "add": [ { "id": "add-1", "store": "appstore", "panel": 2,
//                "type": "phone", "screen": "entry", "w": 560, "x": 980, "y": 260, "r": 0, "z": 50 } ]
//   }
//   panel    the panel's position in the config's `panels` array, 1-based (the feature graphic is always 1)
//   element  its explicit `id` in the config, else its 1-based position in that panel's `stage` array
//   values   config units: x, y, w, h in stage units, r in degrees, z, radius, size (badge font size)
//   of       optional fingerprint "type:screen:box": when the element at that id no longer matches
//            (the stage was reordered), the override is skipped with a warning instead of moving the wrong thing
//   add      elements added in the workspace (a screen dropped onto an image); store "*" = every store
// `npm run bake` folds the file into studio.config.js and empties it.

export const MOVABLE = ['x', 'y', 'w', 'h', 'r', 'z', 'radius', 'size'];
export const FEATURE = 'feature';

// studio.config.js -> layout.json; examples/web.config.js -> examples/web.layout.json
export function layoutFile(configRel = 'studio.config.js') {
  const rel = String(configRel).replace(/^\.?\//, '');
  if (rel === 'studio.config.js') return 'layout.json';
  return `${rel.replace(/(\.config)?\.[cm]?js$/, '')}.layout.json`;
}

export const elementId = (e, i) => (e && e.id != null ? String(e.id) : String(i + 1));

export const fingerprint = (e) => [e.type || e.t || '', e.screen || e.src || e.icon || '', e.box || ''].join(':');

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// only known keys with finite numbers survive
export function cleanValues(v) {
  const out = {};
  if (!isObj(v)) return out;
  for (const k of MOVABLE) {
    const n = Number(v[k]);
    if (v[k] !== undefined && v[k] !== null && Number.isFinite(n)) out[k] = Math.round(n * 100) / 100;
  }
  return out;
}

// { id: values } for one store + panel: "*" first, then the store's own (the feature graphic never takes "*")
export function overridesFor(layout, store, panel) {
  if (!isObj(layout)) return {};
  const pick = (k) => (isObj(layout[k]) && isObj(layout[k][String(panel)]) ? layout[k][String(panel)] : {});
  const all = store === FEATURE ? {} : pick('*');
  const own = pick(store);
  const out = {};
  for (const id of new Set([...Object.keys(all), ...Object.keys(own)])) {
    const a = isObj(all[id]) ? all[id] : {};
    const o = isObj(own[id]) ? own[id] : {};
    out[id] = { ...cleanValues(a), ...cleanValues(o), of: o.of || a.of || null };
  }
  return out;
}

export function addsFor(layout, store, panel) {
  if (!isObj(layout) || !Array.isArray(layout.add)) return [];
  return layout.add.filter((a) => isObj(a) && a.type && Number(a.panel) === Number(panel)
    && (store === FEATURE ? a.store === FEATURE : (a.store === '*' || a.store === store || a.store == null)));
}

// stage: one target's resolved elements (each with its id) -> the stage with overrides and adds applied.
export function applyLayout(stage, layout, store, panel) {
  const over = overridesFor(layout, store, panel);
  const out = stage.map((e) => {
    const o = over[e.id];
    if (!o) return e;
    if (o.of && o.of !== fingerprint(e)) {
      console.warn(`layout.json: ${store} panel ${panel} element ${e.id} is now ${fingerprint(e)}, not ${o.of}: override skipped (move it again, or fix the id)`);
      return e;
    }
    const { of, ...vals } = o;
    return { ...e, ...vals, moved: true };
  });
  for (const a of addsFor(layout, store, panel)) {
    const { store: s, panel: p, ...el } = a;
    const id = String(a.id || `add-${out.length + 1}`);
    out.push({ ...el, ...cleanValues(el), ...(over[id] ? cleanValues(over[id]) : {}), id, added: true });
  }
  return out;
}

// The whole file, read defensively: anything that is not an object becomes {}.
export function parseLayout(text) {
  if (!text || !String(text).trim()) return {};
  const v = JSON.parse(text);
  return isObj(v) ? v : {};
}

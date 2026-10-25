// edits.json from the Studio: one element's edit inside a mock screen, a headline or a sub line. Every change is
// a patch with its inverse in the one undo history (ui/edits.js run()). A screen edit shows at once in every
// frame that has that screen (the kit applies it in place: { ss: 'screen-set' }); lifts and tiles measure their
// card when their page loads, so the images with a lift or tile of that screen reload after the save, one at a
// time (double-buffered, so nothing flashes). A copy edit reloads the images of that panel. Format: the template's
// scripts/lib/edits.js.
import { state, frames } from '../state.js';
import { run } from '../edits.js';

const SAVED = 'Saved → edits.json · renders, captures and exports use it';
const clone = (v) => (v == null ? null : JSON.parse(JSON.stringify(v)));
const doc = () => (state.project && state.project.edits) || {};

export const screenEdits = (screen) => ((doc().screens || {})[screen]) || {};
export const editOf = (screen, eid) => clone(screenEdits(screen)[eid]);
export const copyKey = (f, panel) => (f.store === 'feature' ? 'feature' : String(panel));
export function copyOf(key, field, locale) {
  const c = (doc().copy || {})[key];
  return c && c[field] && typeof c[field][locale] === 'string' ? c[field][locale] : null;
}
// the languages of a headline or sub line not retyped since another language changed (copy.<key>.stale.<field>)
export function staleOf(key, field) {
  const c = (doc().copy || {})[key];
  return c && c.stale && Array.isArray(c.stale[field]) ? c.stale[field].slice() : [];
}
const others = (locale) => ((state.project && state.project.locales) || []).filter((l) => l !== locale);

// frames whose stage shows the screen (types: only those element types)
export const showing = (screen, types) => [...frames.values()].filter((f) => f.iframe && f.boxes
  && f.boxes.elements.some((e) => e.screen === screen && (!types || types.includes(e.type))));

export function panelFrames(key) {
  return [...frames.values()].filter((f) => f.editable && (key === 'feature' ? f.store === 'feature'
    : f.store !== 'feature' && f.panels.some((p) => String(p.id) === key)));
}

// value: the element's whole edit (null = none); to: one frame (a drag or a nudge in progress), else all of them
export function preview(screen, eid, value, to = null) {
  for (const f of to ? [to] : showing(screen)) f.post({ ss: 'screen-set', screen, eid, value });
}

// the saved edit with `partial` merged in (null / false / 0 nudge removes a key; text is the current locale's
// words, and the screen's own words remove the override) -> the new edit, or null when nothing is left
export function merged(item, partial, prev = editOf(state.screen.screen, item.eid)) {
  const out = { ...(prev || {}) };
  delete out.of;
  for (const [k, v] of Object.entries(partial)) {
    if (k === 'text') continue;
    if (v === null || v === undefined || v === false || ((k === 'dx' || k === 'dy') && !v)) delete out[k];
    else out[k] = v;
  }
  if (partial.text !== undefined) {
    const t = { ...(out.text || {}) };
    if (partial.text === null || partial.text === item.base) delete t[state.locale];
    else t[state.locale] = partial.text;
    if (Object.keys(t).length) out.text = t; else delete out.text;
  }
  if (!Object.keys(out).some((k) => k !== 'only')) return null;
  const of = item.of || (prev && prev.of);
  return of ? { ...out, of } : out;
}

// frames to reload once the file is saved: the one being edited first, never while text is typed in it
const queue = new Set();
let timer = 0;
let busy = false;
const typingIn = (k) => !!(state.screen && state.screen.typing && state.screen.frame === k) || !!(state.copyTyping && state.copyTyping.frame === k);
const swapped = (f) => new Promise((resolve) => {
  const t0 = Date.now();
  const tick = () => (!f.next || Date.now() - t0 > 20000 ? resolve() : setTimeout(tick, 60));
  tick();
});

async function drain() {
  if (busy) return;
  busy = true;
  try {
    for (;;) {
      const cur = state.screen && state.screen.frame;
      const keys = [...queue].filter((k) => !typingIn(k)).sort((a, b) => (b === cur) - (a === cur));
      if (!keys.length) break;
      for (const k of keys) {
        queue.delete(k);
        const f = frames.get(k);
        if (!f || !f.iframe) continue;
        f.reload();
        await swapped(f);
      }
    }
  } finally {
    busy = false;
  }
}

export function reloadLater(list) {
  for (const f of list) queue.add(f.key);
  clearTimeout(timer);
  timer = setTimeout(drain, 300);
}

export const resume = () => reloadLater([]); // typing ended: the frames held back reload now

// list: [[eid, before, after]] for one screen
function change(screen, list, what, msg = SAVED) {
  const apply = (dir) => {
    for (const [eid, before, after] of list) preview(screen, eid, dir === 'after' ? after : before);
    reloadLater(showing(screen, ['lift', 'tile']));
  };
  return run({
    file: 'edits', slug: state.project.slug, what, apply,
    do: { screens: list.map(([eid, , after]) => ({ screen, eid, value: after })) },
    undo: { screens: list.map(([eid, before]) => ({ screen, eid, value: before })) },
  }, msg);
}

export function setEdit(item, partial, what = 'edit') {
  const s = state.screen;
  if (!s || !item) return Promise.resolve();
  const before = editOf(s.screen, item.eid);
  const after = merged(item, partial, before);
  if (JSON.stringify(before) === JSON.stringify(after)) return Promise.resolve();
  return change(s.screen, [[item.eid, before, after]], what);
}

export function resetElement(item) {
  const s = state.screen;
  const before = editOf(s.screen, item.eid);
  if (!before) return Promise.resolve();
  return change(s.screen, [[item.eid, before, null]], 'reset element', 'Reset to the screen → edits.json');
}

export function resetScreen() {
  const s = state.screen;
  const list = Object.keys(screenEdits(s.screen)).map((eid) => [eid, editOf(s.screen, eid), null]);
  if (!list.length) return Promise.resolve();
  return change(s.screen, list, `reset ${s.screen}`, `Reset every edit of “${s.screen}” → edits.json`);
}

// a headline (HTML: <em>, <br>) or sub line, in the current locale. An empty headline goes back to the config;
// an empty sub line is kept (no sub on this panel). New words in one language mark the other languages "stale"
// (their words still say the old thing): the toast and the inspector say so, validate warns until each one is
// retyped here or kept as is (keepCopy). Back to the config in every language clears the marker.
export function setCopy(f, panel, field, value) {
  const key = copyKey(f, panel);
  const locale = state.locale;
  const before = copyOf(key, field, locale);
  const after = value == null || (field === 'headline' && !String(value).trim()) ? null : String(value);
  if (before === after) return Promise.resolve();
  const was = staleOf(key, field);
  const anyLeft = after !== null || others(locale).some((l) => copyOf(key, field, l) !== null);
  const now = !anyLeft ? [] : after === null ? was.filter((l) => l !== locale) : [...new Set([...was, ...others(locale)])].filter((l) => l !== locale);
  const entry = (v, st) => ({ copy: [{ panel: key, field, locale, value: v }], stale: [{ panel: key, field, locales: st }] });
  const fresh = now.filter((l) => !was.includes(l));
  const name = field === 'sub' ? 'sub line' : 'headline';
  return run({
    file: 'edits', slug: state.project.slug, what: name,
    apply: () => reloadLater(panelFrames(key)), do: entry(after, now), undo: entry(before, was),
  }, `Saved ${name} (${locale}) → edits.json${fresh.length ? ` · ${fresh.join(', ')} not updated: retype ${fresh.length > 1 ? 'them' : 'it'} there, or keep it` : ''}`);
}

// "Keep as is": this language's words stay, its stale marker goes
export function keepCopy(f, panel, field) {
  const key = copyKey(f, panel);
  const locale = state.locale;
  const was = staleOf(key, field);
  if (!was.includes(locale)) return Promise.resolve();
  const entry = (st) => ({ stale: [{ panel: key, field, locales: st }] });
  return run({
    file: 'edits', slug: state.project.slug, what: 'keep words', apply: () => {},
    do: entry(was.filter((l) => l !== locale)), undo: entry(was),
  }, `Kept the ${locale} ${field === 'sub' ? 'sub line' : 'headline'} as is → edits.json`);
}

export function resetCopy(f, panel) {
  const key = copyKey(f, panel);
  const locale = state.locale;
  const fields = ['headline', 'sub'].filter((k) => copyOf(key, k, locale) !== null);
  if (!fields.length) return Promise.resolve();
  // a field with no edit left in any language has nothing to be stale against
  const staleAfter = (k) => (others(locale).some((l) => copyOf(key, k, l) !== null) ? staleOf(key, k).filter((l) => l !== locale) : []);
  const entry = (pick, st) => ({ copy: fields.map((k) => ({ panel: key, field: k, locale, value: pick(k) })),
    stale: fields.map((k) => ({ panel: key, field: k, locales: st(k) })) });
  return run({
    file: 'edits', slug: state.project.slug, what: 'reset copy', apply: () => reloadLater(panelFrames(key)),
    do: entry(() => null, staleAfter), undo: entry((k) => copyOf(key, k, locale), (k) => staleOf(key, k)),
  }, `Copy back to studio.config.js (${locale})`);
}

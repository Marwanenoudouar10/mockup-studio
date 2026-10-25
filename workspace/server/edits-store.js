// Writes edits.json inside a registered project (the content edits of an editable project: text and colours
// inside the mock screens, headlines and sub lines), with the same atomic writer as layout.json (store.js).
// Only <project root>/edits.json, only known keys, only checked values (server/edit-rules.js). The format is
// documented in the template: scripts/lib/edits.js.
//   patch: { screens: [{ screen, eid, value | null }],               value = the element's whole edit
//            copy:    [{ panel: '1' | 'feature', field: 'headline' | 'sub', locale, value: string | null }],
//            stage:   [{ panel, id, locale, value: string | null }],  a badge or text element's words
//            stale:   [{ panel, field, locales: ['es'] }] }  the languages not retyped since another one changed
//                     (copy.<panel>.stale.<field>; [] removes the marker; validate warns while it is there)
import path from 'node:path';
import { readJson, writeJson, isObj, bad } from './store.js';
import { SCREEN_KEY, EID, LOCALE, cleanScreenEdit, sanitizeHeadline, plainText } from './edit-rules.js';

const PANEL = /^([1-9]\d{0,2}|feature)$/;
const STAGE_ID = /^[\w*.-]{1,64}$/;
const FIELDS = new Set(['headline', 'sub']);

export const editsPath = (root) => path.join(root, 'edits.json');
export const readEdits = (root) => readJson(editsPath(root), {});

// a nested key path, made on the way: dig(doc, ['copy', '1', 'headline']) -> that object
function dig(o, keys) {
  let at = o;
  for (const k of keys) at = isObj(at[k]) ? at[k] : (at[k] = {});
  return at;
}

// drop empty objects, bottom up
function tidy(o) {
  for (const [k, v] of Object.entries(o)) {
    if (!isObj(v)) continue;
    tidy(v);
    if (!Object.keys(v).length) delete o[k];
  }
  return o;
}

function screenEntry(doc, e) {
  const screen = String(e.screen ?? '');
  const eid = String(e.eid ?? '');
  if (!SCREEN_KEY.test(screen) || !EID.test(eid)) throw bad('bad screen name or element id');
  const S = dig(doc, ['screens', screen]);
  if (e.value === null) { delete S[eid]; return; }
  const { clean, errors } = cleanScreenEdit(e.value);
  if (errors.length) throw bad(`${screen} › ${eid}: ${errors.join('; ')}`);
  if (Object.keys(clean).some((k) => k !== 'of' && k !== 'only')) S[eid] = clean;
  else delete S[eid];
}

function textEntry(doc, keys, locale, value, clean) {
  if (!LOCALE.test(String(locale))) throw bad(`"${locale}" is not a locale`);
  const at = dig(doc, keys);
  if (value === null) delete at[locale];
  else if (typeof value !== 'string') throw bad('a text must be a string or null');
  else at[locale] = clean(value);
}

export function patchEdits(root, patch) {
  if (!isObj(patch)) throw bad('expected a JSON object');
  const doc = readEdits(root);
  for (const e of patch.screens || []) screenEntry(doc, e);
  for (const c of patch.copy || []) {
    if (!PANEL.test(String(c.panel)) || !FIELDS.has(c.field)) throw bad('bad copy panel or field');
    const clean = c.field === 'headline' ? (v) => sanitizeHeadline(v).trim() : (v) => plainText(v, 300).trim();
    textEntry(doc, ['copy', String(c.panel), c.field], c.locale, c.value, clean);
  }
  for (const m of patch.stale || []) {
    if (!PANEL.test(String(m.panel)) || !FIELDS.has(m.field) || !Array.isArray(m.locales)) throw bad('bad stale marker');
    const locales = [...new Set(m.locales.map(String))].filter((l) => LOCALE.test(l)).sort();
    const at = dig(doc, ['copy', String(m.panel), 'stale']);
    if (locales.length) at[m.field] = locales; else delete at[m.field];
  }
  for (const s of patch.stage || []) {
    if (!/^[1-9]\d{0,2}$/.test(String(s.panel)) || !STAGE_ID.test(String(s.id))) throw bad('bad stage panel or element id');
    textEntry(doc, ['stage', String(s.panel), String(s.id), 'text'], s.locale, s.value, (v) => plainText(v, 300).trim());
  }
  delete doc.version;
  return writeJson(editsPath(root), { version: 1, ...tidy(doc) });
}

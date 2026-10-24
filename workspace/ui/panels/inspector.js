// Right inspector: what is selected (element, panel, source), its X / Y / W / R / Z / Radius (typing a value
// is a move like any other), Reset to config, Apply to all stores, and the notes for Claude on that image.
// It never edits copy, colours or layouts: the violet note says so.
import { state, selected, on } from '../state.js';
import { panelName } from '../model.js';
import { commit, reset, applyAll, sourceOf, addOf } from '../edits.js';
import { nameOf } from './sidebar.js';
import { notesFor, numberOf, addNote, setDone, deleteNote } from './notes.js';

let box;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const kv = (k, v) => `<div class="kv"><span>${esc(k)}</span><b title="${esc(v)}">${esc(v)}</b></div>`;
const NOTE = '<div class="note"><b>Text, colours, new layouts:</b> ask Claude. This board only previews and moves things. It refreshes by itself when Claude edits files.</div>';
const HELP = `<div class="help">Drag an element to move it. Corners resize, the round knob rotates.<br>
  <kbd>←↑→↓</kbd> nudge (<kbd>Shift</kbd> ×10) · <kbd>⌘Z</kbd> undo · <kbd>⇧⌘Z</kbd> redo<br>
  <kbd>Space</kbd>+drag pan · pinch or <kbd>⌘</kbd>+scroll zoom · <kbd>⇧1</kbd> fit</div>`;

function source(el) {
  if (el.type === 'badge' || el.type === 'text') return `text “${el.text || ''}”`;
  const file = el.screen ? `${el.screen}.png` : el.src || '';
  if (el.box) return `${file} › box “${el.box}”`;
  return el.crop ? `${file} › crop` : file;
}

const fmt = (v) => (v == null ? '' : String(Math.round(v * 100) / 100));

function fields(el) {
  const v = el.values;
  const badge = el.type === 'badge' || el.type === 'text'; // sized by font size
  const radius = el.type === 'lift' || el.type === 'tile';
  const f = (k, label, val, off) => `<label class="fld${off ? ' off' : ''}"><span>${label}</span><input data-k="${k}" value="${esc(fmt(val))}"${off ? ' disabled' : ''}`
    + `${k === 'radius' && !off ? ' placeholder="auto"' : ''} inputmode="decimal" aria-label="${label}"></label>`;
  return `<div class="fields">${f('x', 'X', v.x)}${f('y', 'Y', v.y)}${badge ? f('size', 'Size', v.size) : f('w', 'W', v.w, v.w == null)}${f('r', 'R', v.r)}`
    + `${f('z', 'Z', v.z)}${f('radius', 'Radius', v.radius, !radius)}</div>`;
}

function status(f, el) {
  const s = sourceOf(f, el);
  if (s === 'added') {
    const a = addOf(el.id);
    return `Added in Store Studio${a && a.store === '*' ? ' for <b>every store</b>' : ''} · layout.json`;
  }
  if (s === 'store') return `Moved for <b>${esc(panelName(state.project, f, el.panel).replace(/ \d+$/, ''))}</b> · layout.json`;
  if (s === 'all') return 'Moved for <b>all stores</b> · layout.json';
  return 'Where studio.config.js puts it';
}

function notesHtml(f, panel) {
  if (!f || !f.editable) return '';
  const list = notesFor(f, panel).map((n) => `<div class="note-row${n.done ? ' done' : ''}"><span class="n">${numberOf(n)}</span><p>${esc(n.text)}</p>
    <button data-note="${esc(n.id)}" data-act="done">${n.done ? 'reopen' : 'done'}</button><button data-note="${esc(n.id)}" data-act="del">delete</button></div>`).join('');
  return `<div class="notes"><div class="h">Notes for Claude</div>${list}
    <textarea id="note-text" placeholder="e.g. make this card bigger, or try the entry screen here"></textarea>
    <button class="btn" data-act="add-note">Pin note to this ${state.selection.id != null ? 'element' : 'image'}</button></div>`;
}

function render() {
  const draft = box.querySelector('#note-text');
  const keep = draft ? draft.value : '';
  paint();
  const next = box.querySelector('#note-text');
  if (next && keep) next.value = keep;
}

function paint() {
  const { frame: f, el } = selected();
  const p = state.project;
  if (!p) { box.innerHTML = `<div class="h">Selected</div>${NOTE}`; return; }
  if (!f) {
    box.innerHTML = `<div class="h">Project</div>${kv('Name', p.name)}${kv('Locales', p.locales.join(', '))}${kv('Images', p.rows.reduce((n, r) => n + r.frames.length, 0))}${NOTE}${HELP}`;
    return;
  }
  const panel = state.selection.panel;
  const name = panelName(p, f, panel);
  if (!el) {
    const [W, H] = [f.kind === 'strip' ? f.slice : f.W, f.H];
    const n = f.panels.find((x) => x.id === panel);
    const file = f.kind === 'feature' ? `final/${state.locale}/playstore/feature-graphic.png`
      : f.editable && n ? `final/${state.locale}/${f.store}/${String(n.n).padStart(2, '0')}.png` : '';
    box.innerHTML = `<div class="h">Selected</div>${kv('Image', name || 'Brand board')}${kv('Size', `${Math.round(W)}×${Math.round(H)}`)}${file ? kv('File', file) : ''}`
      + `${f.editable ? '' : '<div class="status">Preview only: the brand board is made by npm run brand -- board.</div>'}${NOTE}${notesHtml(f, panel)}`;
    return;
  }
  if (el.type === 'text') {
    box.innerHTML = `<div class="h">Selected</div>${kv('Element', 'headline')}${kv('Panel', name)}${kv('Source', 'studio.config.js')}`
      + `<div class="status">The headline and sub line are text: ask Claude to change them.</div>${NOTE}${notesHtml(f, panel)}`;
    return;
  }
  const src = sourceOf(f, el);
  const canAll = f.store !== 'feature' && (el.added ? (addOf(el.id) || {}).store !== '*' : src !== 'config');
  box.innerHTML = `<div class="h">Selected</div>${kv('Element', nameOf(el))}${kv('Panel', name)}${kv('Source', source(el))}${fields(el)}`
    + `<div class="status">${status(f, el)}</div>`
    + `<button class="btn" data-act="reset"${src === 'config' ? ' disabled' : ''}>${el.added ? 'Remove added element' : 'Reset to config'}</button>`
    + `<button class="btn" data-act="all"${canAll ? '' : ' disabled'}>Apply to all stores</button>${NOTE}${notesHtml(f, panel)}`;
}

function typed(input) {
  const { frame: f, el } = selected();
  if (!f || !el || !el.values) return;
  const k = input.dataset.k;
  const v = Number(String(input.value).replace(',', '.').replace(/[^\d.+-]/g, ''));
  if (!Number.isFinite(v) || v === el.values[k]) { input.value = fmt(el.values[k]); return; }
  commit(f, el, el.values, { ...el.values, [k]: v }, `set ${k}`);
}

export function initInspector(el) {
  box = el;
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('input[data-k]')) { e.preventDefault(); typed(e.target); e.target.blur(); }
    if (e.key === 'Escape' && e.target.matches('input, textarea')) e.target.blur();
  });
  box.addEventListener('focusout', (e) => { if (e.target.matches('input[data-k]')) typed(e.target); });
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const { frame: f, el: sel } = selected();
    const act = b.dataset.act;
    if (act === 'reset' && f && sel) reset(f, sel);
    else if (act === 'all' && f && sel) applyAll(f, sel);
    else if (act === 'add-note' && f) {
      const text = box.querySelector('#note-text').value.trim();
      if (!text) return box.querySelector('#note-text').focus();
      const size = f.boxes ? f.boxes.size : { w: f.W, h: f.H, slice: f.W };
      const at = sel && sel.rect ? { x: (sel.rect.cx % size.slice) / size.slice, y: sel.rect.cy / size.h } : { x: 0.9, y: 0.06 };
      box.querySelector('#note-text').value = '';
      addNote(f, state.selection.panel, sel && sel.id != null ? String(sel.id) : null, at, text);
    } else if (b.dataset.note) {
      const note = state.project.notes.find((n) => n.id === b.dataset.note);
      if (note && act === 'done') setDone(note, !note.done);
      if (note && act === 'del') deleteNote(note);
    }
  });
  for (const ev of ['select', 'project', 'layout', 'notes']) on(ev, render);
  // live values while dragging, without stealing focus from a field being typed in
  on('boxes', (f) => {
    if (!state.selection || f.key !== state.selection.frame) return;
    if (box.contains(document.activeElement) && document.activeElement.matches('input, textarea')) return;
    render();
  });
}

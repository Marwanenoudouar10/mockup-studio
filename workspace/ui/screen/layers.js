// The sidebar's layers in screen mode: the elements of the entered screen that it shows (a lift only lists its
// card), as a tree in the screen's order, like a design tool: the top level open, the path to the selected layer
// opened by itself, a caret opens or closes a group. Click selects, hover outlines on the canvas, double-click a
// text types it. A dot marks an element with an edit in edits.json; a hidden one is dimmed. The first row leaves.
import { state, frames, on } from '../state.js';
import { panelName } from '../model.js';
import { selectLayer, hoverLayer, leave } from './enter.js';
import { startText } from './text.js';
import { screenEdits } from './patches.js';
import { labelOf } from './names.js';
import { setList, showing, markRows, setText } from '../panels/list.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const opened = new Map(); // screen name -> Set of open group eids (kept while the Studio runs)
let tree = { parent: new Map(), kids: new Set() };
let els;

// parent of each layer (the closest earlier layer with a smaller depth) and the layers that have children
function treeOf(items) {
  const parent = new Map();
  const kids = new Set();
  const stack = [];
  for (const it of items) {
    while (stack.length && stack[stack.length - 1].depth >= it.depth) stack.pop();
    const p = stack[stack.length - 1];
    if (p) { parent.set(it.eid, p.eid); kids.add(p.eid); }
    stack.push(it);
  }
  return { parent, kids };
}

function openSet(s) {
  if (!opened.has(s.screen)) opened.set(s.screen, new Set(s.items.filter((i) => i.depth === 0).map((i) => i.eid)));
  const open = opened.get(s.screen);
  for (let p = tree.parent.get(s.sel); p; p = tree.parent.get(p)) open.add(p);
  return open;
}

function shown(eid, open) {
  for (let p = tree.parent.get(eid); p; p = tree.parent.get(p)) if (!open.has(p)) return false;
  return true;
}

export function renderScreenLayers(e) {
  els = e;
  const s = state.screen;
  const f = frames.get(s.frame);
  setText(els.layersTitle, `Layers · ${s.screen}`);
  const back = `<button class="layer back" data-leave title="Esc"><span>‹ ${esc(f ? panelName(state.project, f, s.panel) : 'Back')}</span></button>`;
  const key = `screen|${s.frame}|${s.screen}`;
  if (!s.items.length) {
    if (!s.error && showing(els.layers, key)) return; // the screen is being re-read after an edit: keep the rows
    setList(els.layers, `${back}<div class="hint">${esc(s.error || 'Reading the screen…')}</div>`, key);
    return;
  }
  tree = treeOf(s.items);
  const open = openSet(s);
  const edited = screenEdits(s.screen);
  const rows = s.items.filter((it) => shown(it.eid, open)).map((it) => {
    const cls = ['layer slayer', it.eid === s.sel && 'on', it.eid === s.hover && 'hov', edited[it.eid] && 'edited', it.hidden && 'off'];
    const caret = tree.kids.has(it.eid) ? `<i class="caret${open.has(it.eid) ? ' open' : ''}" data-caret></i>` : '<i class="caret none"></i>';
    return `<button class="${cls.filter(Boolean).join(' ')}" data-eid="${esc(it.eid)}" style="--d:${Math.min(it.depth, 7)}" title="${esc(it.eid)}">`
      + `${caret}<i class="k k-${it.kind}"></i><span>${esc(labelOf(it))}</span>${it.hidden ? '<small>hidden</small>' : ''}</button>`;
  });
  if (!setList(els.layers, back + rows.join(''), key)) return; // nothing changed: no rebuild, no flash
  markRows(els.layers);
  const on1 = els.layers.querySelector('.slayer.on');
  if (on1) on1.scrollIntoView({ block: 'nearest' });
}

// hover and selection: only the row classes change (no rebuild, so the list keeps its scroll), unless the
// selected layer sits in a closed group
function mark(scroll) {
  const s = state.screen;
  if (!s || !els) return;
  if (s.sel && !els.layers.querySelector(`.slayer[data-eid="${CSS.escape(s.sel)}"]`) && s.items.some((i) => i.eid === s.sel)) {
    renderScreenLayers(els);
    return;
  }
  for (const b of els.layers.querySelectorAll('.slayer')) {
    b.classList.toggle('on', b.dataset.eid === s.sel);
    b.classList.toggle('hov', b.dataset.eid === s.hover);
  }
  const on1 = scroll && els.layers.querySelector('.slayer.on');
  if (on1) on1.scrollIntoView({ block: 'nearest' });
}

export function initScreenLayers(e) {
  els = e;
  els.layers.addEventListener('click', (ev) => {
    const s = state.screen;
    if (!s) return;
    if (ev.target.closest('[data-leave]')) { leave(); return; }
    const b = ev.target.closest('[data-eid]');
    if (!b) return;
    if (ev.target.closest('[data-caret]')) {
      const open = opened.get(s.screen);
      if (open.has(b.dataset.eid)) open.delete(b.dataset.eid); else open.add(b.dataset.eid);
      renderScreenLayers(els);
      return;
    }
    selectLayer(b.dataset.eid);
  });
  els.layers.addEventListener('dblclick', (ev) => {
    const b = state.screen && !ev.target.closest('[data-caret]') && ev.target.closest('[data-eid]');
    if (b) startText(b.dataset.eid, { quiet: true });
  });
  els.layers.addEventListener('mousemove', (ev) => {
    if (!state.screen) return;
    const b = ev.target.closest('[data-eid]');
    hoverLayer(b ? b.dataset.eid : null);
  });
  els.layers.addEventListener('mouseleave', () => hoverLayer(null));
  on('screen-sel', () => mark(true));
  on('screen-hover', () => mark(false)); // never scrolls: the list may be being scrolled by hand
}

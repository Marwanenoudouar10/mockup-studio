// Left sidebar: the projects (brand colour dot + name), the layers of the selected image (z order, the
// headline as a text layer), and the project's captures as thumbnails to drag onto an image.
import { state, frames, on, emit, selected } from '../state.js';
import { panelName } from '../model.js';
import { select } from '../canvas/pointer.js';
import { startDrop, screensPlatform } from '../canvas/drop.js';

let els;
let openProject = () => {};
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function nameOf(el) {
  if (el.type === 'text') return 'headline';
  const what = el.box || (el.type === 'badge' || el.type === 'text' ? el.text : null) || el.screen || (el.src ? el.src.split('/').pop() : null) || el.id;
  return `${el.type} · ${what}${el.crop && !el.box ? ' crop' : ''}`;
}

function renderProjects() {
  const twins = (p) => state.projects.filter((x) => (x.name || x.folder) === (p.name || p.folder)).length > 1;
  els.projects.innerHTML = state.projects.map((p) => `<button class="item${p.slug === state.slug ? ' on' : ''}${p.error ? ' err' : ''}" data-slug="${esc(p.slug)}" title="${esc(p.error || p.folder)}">
    <span class="dot" style="background:${esc(p.color || '#55575e')}"></span>${esc(p.name || p.folder)}${twins(p) ? ` <small>${esc(p.slug)}</small>` : ''}</button>`).join('')
    || '<div class="hint">No projects: npm start -- &lt;folder&gt;</div>';
}

// the image whose layers we list: the selected one, else nothing
function renderLayers() {
  const { frame } = selected();
  const sel = state.selection;
  const p = state.project;
  if (!frame || !p) {
    els.layersTitle.textContent = 'Layers';
    els.layers.innerHTML = '<div class="hint">Select an image or an element</div>';
    return;
  }
  const panel = sel.panel ?? (frame.panels[0] && frame.panels[0].id);
  els.layersTitle.textContent = `Layers · ${panelName(p, frame, panel)}`;
  if (!frame.boxes) {
    els.layers.innerHTML = `<div class="hint">${frame.editable ? 'Loading…' : 'Preview only'}</div>`;
    return;
  }
  const items = frame.boxes.elements.filter((e) => e.panel === panel).sort((a, b) => (a.values.z ?? 0) - (b.values.z ?? 0));
  const rows = items.map((e) => {
    const on = sel.id != null && String(sel.id) === String(e.id) ? ' on' : '';
    const moved = e.moved || e.added ? ' moved' : '';
    return `<button class="layer${on}${moved}" data-id="${esc(e.id)}" data-panel="${e.panel}" title="${esc(e.added ? 'added in Store Studio' : e.moved ? 'moved (layout.json)' : 'from the config')}">
      <span>${esc(nameOf(e))}</span><small>z ${esc(e.values.z)}</small></button>`;
  });
  if (frame.boxes.copies.some((c) => c.panel === panel)) {
    rows.push(`<button class="layer text${sel.id === 'copy' ? ' on' : ''}" data-id="copy" data-panel="${panel}"><span>headline</span><small>text</small></button>`);
  }
  els.layers.innerHTML = rows.join('') || '<div class="hint">No elements</div>';
}

let shown = '';
function renderScreens(force) {
  const p = state.project;
  const plat = screensPlatform();
  const key = `${p && p.slug}|${plat}|${p && JSON.stringify(p.screens[plat] || [])}`;
  if (key === shown && force !== true) return; // keep the loaded thumbnails
  shown = key;
  els.screensTitle.textContent = plat ? 'Screens · drag onto an image' : 'Screens';
  if (!p || !plat) {
    els.screens.innerHTML = '<div class="hint">No captures in raw/ yet</div>';
    return;
  }
  const wide = plat === 'web' || plat === 'mac' || plat === 'ipad';
  els.screens.innerHTML = p.screens[plat].map((s) => `<div class="thumb${wide ? ' wide' : ''}" data-name="${esc(s.name)}" data-file="${esc(s.file)}" title="raw/${esc(plat)}/ · drag “${esc(s.name)}” onto an image">
    <div class="img"><img src="${esc(p.base + s.file)}" alt="" loading="lazy" draggable="false"></div><div class="cap">${esc(s.name)}</div></div>`).join('');
}

export function initSidebar(e, opts) {
  els = e;
  openProject = opts.openProject;
  els.projects.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-slug]');
    if (b && b.dataset.slug !== state.slug) openProject(b.dataset.slug);
  });
  els.layers.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-id]');
    if (!b || !state.selection) return;
    select({ frame: state.selection.frame, panel: Number(b.dataset.panel), id: b.dataset.id });
  });
  els.layers.addEventListener('mousemove', (ev) => {
    const b = ev.target.closest('[data-id]');
    const next = b && b.dataset.id !== 'copy' && state.selection ? { frame: state.selection.frame, panel: Number(b.dataset.panel), id: b.dataset.id } : null;
    if (JSON.stringify(next) !== JSON.stringify(state.hover)) { state.hover = next; emit('hover', next); }
  });
  els.layers.addEventListener('mouseleave', () => { state.hover = null; emit('hover', null); });
  els.screens.addEventListener('pointerdown', (ev) => {
    const t = ev.target.closest('.thumb');
    if (!t || ev.button !== 0) return;
    startDrop(ev, { name: t.dataset.name, file: t.dataset.file, platform: screensPlatform() }, t.querySelector('img'));
  });
  on('projects', renderProjects);
  on('project', () => { renderProjects(); renderLayers(); renderScreens(); });
  on('select', () => { renderLayers(); renderScreens(); });
  on('boxes', (f) => { if (state.selection && f.key === state.selection.frame) renderLayers(); });
  on('screens', () => renderScreens(true));
  on('rows', () => { if (state.selection && !frames.get(state.selection.frame)) select(null); });
}

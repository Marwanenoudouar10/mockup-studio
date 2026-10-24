// Store Studio boot: wires the panels and the canvas, opens a project, and keeps it live:
// a change in a project's files (server SSE) reloads only that project's frames, keeping zoom, pan and the
// selection. Frames talk to the page through the edit bridge (engine/core/edit.js) with postMessage.
import { state, frames, on, emit } from './state.js';
import { api, listen } from './api.js';
import { loadProject, projectSummary, shape } from './model.js';
import { initViewport, fit } from './canvas/viewport.js';
import { initBoard, build, clearBoard, reloadAll } from './canvas/board.js';
import { initOverlay } from './canvas/overlay.js';
import { initPointer } from './canvas/pointer.js';
import { initKeys } from './canvas/keys.js';
import { initDrop } from './canvas/drop.js';
import { initTopbar, setLive, pulse } from './panels/topbar.js';
import { initSidebar } from './panels/sidebar.js';
import { initInspector } from './panels/inspector.js';
import { initNotes } from './panels/notes.js';
import { toast } from './panels/toast.js';

const $ = (id) => document.getElementById(id);
const els = {
  canvas: $('canvas'), world: $('world'), overlay: $('overlay'), chip: $('zoom'), banner: $('banner'),
  crumb: $('crumb'), tabs: $('tabs'), locale: $('locale'), live: $('live'),
  projects: $('projects'), layers: $('layers'), layersTitle: $('layers-title'), screens: $('screens'), screensTitle: $('screens-title'),
};

function banner(text) {
  els.banner.hidden = !text;
  els.banner.textContent = text || '';
}

function remember(slug) {
  try { localStorage.setItem('store-studio.project', slug); } catch { /* private mode */ }
}

async function openProject(slug) {
  state.slug = slug;
  state.selection = null;
  clearBoard();
  remember(slug);
  try {
    state.project = await loadProject(slug);
    banner(null);
  } catch (err) {
    state.project = null;
    banner(`${slug}: ${err.message}`);
    emit('project', null);
    return;
  }
  if (!state.project.locales.includes(state.locale)) state.locale = state.project.defaultLocale;
  emit('project', state.project);
  build();
  fit(true);
  emit('select', null);
}

// a project's files changed: reload what that change can affect, nothing else
async function changed({ slug, kinds }) {
  if (slug !== state.slug) {
    if (kinds.includes('config')) summary(slug);
    return;
  }
  pulse();
  const p = state.project;
  if (!p || kinds.some((k) => ['config', 'engine', 'brand'].includes(k))) {
    let next;
    try {
      next = await loadProject(slug);
      banner(null);
    } catch (err) {
      banner(`studio.config.js: ${err.message} (the board keeps the last good version)`);
      return reloadAll();
    }
    const rebuilt = !p || shape(p) !== shape(next);
    state.project = next;
    if (!next.locales.includes(state.locale)) state.locale = next.defaultLocale;
    emit('project', next);
    if (rebuilt) build();
    reloadAll();
    return;
  }
  const info = await api.project(slug).catch(() => null);
  if (!info) return;
  if (kinds.includes('layout')) {
    p.layout = info.layout;
    emit('layout', p.layout);
    toast('layout.json changed on disk: refreshed');
  }
  if (kinds.includes('notes')) { p.notes = info.notes; emit('notes', p.notes); }
  if (kinds.some((k) => ['raw', 'screens'].includes(k))) { p.screens = info.screens; emit('screens'); }
  if (kinds.some((k) => ['layout', 'raw', 'screens'].includes(k))) reloadAll((f) => f.editable);
  if (kinds.includes('briefs')) reloadAll((f) => f.store === 'brand');
}

async function summary(slug) {
  const p = state.projects.find((x) => x.slug === slug);
  if (!p) return;
  try {
    Object.assign(p, await projectSummary(slug), { error: null });
  } catch (err) {
    p.error = err.message;
  }
  emit('projects');
}

async function main() {
  initViewport(els);
  initBoard(els);
  initOverlay(els);
  initPointer(els);
  initKeys(els);
  initDrop(els);
  initTopbar(els);
  initSidebar(els, { openProject });
  initInspector($('insp'));
  initNotes(els);
  on('tab', () => { state.selection = null; build(); fit(state.tab === 'all'); emit('select', null); });
  on('locale', () => reloadAll());
  on('resized', () => build());
  window.addEventListener('message', (ev) => {
    if (ev.origin !== location.origin || !ev.data || typeof ev.data.ss !== 'string') return;
    const f = frames.get(ev.data.key);
    if (f) f.receive(ev.data, ev.source);
  });
  listen(changed, setLive);
  state.projects = await api.projects();
  emit('projects');
  if (!state.projects.length) {
    els.world.innerHTML = '';
    els.canvas.insertAdjacentHTML('beforeend', '<div class="empty-state"><div>No projects yet.<br>Stop the server and start it with a folder:<br><code>npm start -- ~/path/to/project</code></div></div>');
    return;
  }
  let last = null;
  try { last = localStorage.getItem('store-studio.project'); } catch { /* private mode */ }
  const want = new URLSearchParams(location.search).get('project');
  const first = [want, last].find((s) => s && state.projects.some((p) => p.slug === s)) || state.projects[0].slug;
  await openProject(first);
  for (const p of state.projects) summary(p.slug);
  window.__studio = { state, frames }; // for tests and the curious
}

main().catch((err) => banner(`Store Studio failed to start: ${err.message}`));

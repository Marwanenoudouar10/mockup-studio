// Pan + zoom of the infinite canvas. The world is one transformed layer; the dot grid moves with it.
//   wheel / trackpad scroll = pan     pinch or ctrl/cmd + wheel = zoom at the pointer
//   space + drag or middle drag = pan (ui/canvas/pointer.js)     fit, 100%, +/- from the zoom chip and keys
import { state, emit } from '../state.js';

const MIN = 0.05;
const MAX = 4;
let canvas;
let world;
let chip;
let bounds = { x: 0, y: 0, w: 1000, h: 800 };
let start = null; // the opening view: the first two rows

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function apply() {
  const { x, y, z } = state.view;
  world.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
  world.style.setProperty('--iz', String(1 / z));
  const g = 22 * z >= 8 ? 22 * z : 22 * z * Math.ceil(8 / (22 * z));
  canvas.style.backgroundSize = `${g}px ${g}px`;
  canvas.style.backgroundPosition = `${x}px ${y}px`;
  chip.querySelector('.pct').textContent = `${Math.round(z * 100)}%`;
  emit('view', state.view);
}

export function setView(v) {
  state.view = { ...state.view, ...v, z: clamp(v.z ?? state.view.z, MIN, MAX) };
  apply();
}

// zoom by factor k keeping the screen point (sx, sy) still
export function zoomAt(sx, sy, k) {
  const { x, y, z } = state.view;
  const nz = clamp(z * k, MIN, MAX);
  const wx = (sx - x) / z;
  const wy = (sy - y) / z;
  setView({ z: nz, x: sx - wx * nz, y: sy - wy * nz });
}

export function zoomBy(k) {
  const r = canvas.getBoundingClientRect();
  zoomAt(r.width / 2, r.height / 2, k);
}

export function setBounds(all, first) {
  bounds = all;
  start = first || all;
}

// fit everything, or (first = true) the opening view: the first rows, top-left, like a page
export function fit(first = false, pad = 48) {
  const r = canvas.getBoundingClientRect();
  const b = first ? start : bounds;
  if (!r.width || !b.w) return;
  const z = clamp(Math.min((r.width - 2 * pad) / b.w, (r.height - 2 * pad - 30) / b.h, 1), MIN, MAX);
  setView({ z, x: first ? pad - b.x * z : (r.width - b.w * z) / 2 - b.x * z, y: pad - b.y * z });
}

// screen (canvas-relative) <-> world
export const toWorld = (sx, sy) => ({ x: (sx - state.view.x) / state.view.z, y: (sy - state.view.y) / state.view.z });
export const toScreen = (wx, wy) => ({ x: state.view.x + wx * state.view.z, y: state.view.y + wy * state.view.z });
export function local(ev) {
  const r = canvas.getBoundingClientRect();
  return { x: ev.clientX - r.left, y: ev.clientY - r.top };
}

function buildChip() {
  chip.innerHTML = '<button data-z="out" title="Zoom out (-)">−</button><span class="pct">100%</span>'
    + '<button data-z="in" title="Zoom in (+)">+</button><span class="dotsep">·</span><button data-z="fit" title="Fit (Shift+1)">fit</button>';
  chip.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.z === 'in') zoomBy(1.25);
    else if (b.dataset.z === 'out') zoomBy(0.8);
    else fit();
  });
  chip.querySelector('.pct').addEventListener('dblclick', () => zoomBy(1 / state.view.z));
}

export function initViewport(els) {
  ({ canvas, world, chip } = els);
  buildChip();
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = local(e);
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    const dx = e.deltaMode === 1 ? e.deltaX * 16 : e.deltaX;
    if (e.ctrlKey || e.metaKey) zoomAt(p.x, p.y, Math.exp(-dy * (e.ctrlKey && !e.metaKey ? 0.01 : 0.002)));
    else if (e.shiftKey && !dx) setView({ x: state.view.x - dy });
    else setView({ x: state.view.x - dx, y: state.view.y - dy });
  }, { passive: false });
  // Safari pinch
  let g0 = 1;
  canvas.addEventListener('gesturestart', (e) => { e.preventDefault(); g0 = 1; });
  canvas.addEventListener('gesturechange', (e) => {
    e.preventDefault();
    const p = local(e);
    zoomAt(p.x, p.y, e.scale / g0);
    g0 = e.scale;
  });
  window.addEventListener('resize', () => apply());
  apply();
}

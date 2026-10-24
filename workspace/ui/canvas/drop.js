// Drag a capture from the sidebar's Screens onto an image: a green dashed target shows where it lands, and
// on release a new device for that screen is added there (layout.json "add", ui/edits.js), centred on the
// drop point. Its frame follows the target: a phone on phone stores, a browser or tablet on wide targets.
import { state, selected } from '../state.js';
import { local } from './viewport.js';
import { hit, toImage, panelAt } from './geometry.js';
import { ui, redraw } from './overlay.js';
import { addElement } from '../edits.js';
import { select } from './pointer.js';
import { panelName } from '../model.js';

let canvas;

function elementFor(f, screen, aspect) {
  let type = 'phone';
  let w = f.store === 'ipad-13' ? 760 : 560;
  if (f.kind === 'feature') w = 200;
  else if (f.space === 'landscape') {
    if (screen.platform === 'web' || screen.platform === 'mac') { type = 'browser'; w = 900; } else if (screen.platform === 'ipad') { type = 'tablet'; w = 460; } else w = 300;
  }
  return { type, w, h: w * aspect * (type === 'browser' ? 1.08 : 1.04) };
}

function target(ev, screen) {
  const r = canvas.getBoundingClientRect();
  if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) return null;
  const p = local(ev);
  const h = hit(p.x, p.y);
  if (!h.frame || !h.frame.editable || !h.frame.boxes || !h.frame.boxes.map) return null;
  return { frame: h.frame, p, panel: h.panel ?? panelAt(h.frame, toImage(h.frame, p.x, p.y).x), screen };
}

// e: pointerdown on a thumbnail; screen: { name, file, platform }; img: the thumbnail <img>
export function startDrop(e, screen, img) {
  e.preventDefault();
  const ghost = document.createElement('div');
  ghost.className = 'drag-ghost';
  ghost.innerHTML = `<img src="${img.src}" alt="">`;
  document.body.appendChild(ghost);
  const aspect = img.naturalWidth ? img.naturalHeight / img.naturalWidth : 2.17;
  let tgt = null;
  const move = (ev) => {
    Object.assign(ghost.style, { left: `${ev.clientX}px`, top: `${ev.clientY}px` });
    tgt = target(ev, screen);
    ui.ghost = tgt ? { frame: tgt.frame, name: screen.name, what: elementFor(tgt.frame, screen, aspect).type,
      label: panelName(state.project, tgt.frame, tgt.panel) } : null;
    redraw();
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    ghost.remove();
    ui.ghost = null;
    redraw();
    if (!tgt) return;
    const f = tgt.frame;
    const m = f.boxes.map;
    const ip = toImage(f, tgt.p.x, tgt.p.y);
    const { type, w, h } = elementFor(f, screen, aspect);
    const zs = f.boxes.elements.filter((x) => x.panel === tgt.panel).map((x) => x.values.z || 0);
    const el = {
      type, screen: screen.name, w, x: Math.round((ip.x - m.ox) / m.ux), y: Math.round((ip.y - m.oy) / m.uy - h / 2),
      r: 0, z: Math.max(10, ...zs) + 1,
    };
    addElement(f, tgt.panel, el).then((id) => {
      if (id) select({ frame: f.key, panel: tgt.panel, id });
    });
  };
  move(e);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

export function initDrop(els) {
  ({ canvas } = els);
}

// the platform whose captures the sidebar shows: the selected image's, else the first row's
export function screensPlatform() {
  const { frame } = selected();
  const p = state.project;
  if (!p) return null;
  const want = frame && frame.platform ? frame.platform : (p.rows[0] && p.rows[0].frames[0] && p.rows[0].frames[0].platform);
  if (want && p.screens[want]) return want;
  return Object.keys(p.screens)[0] || null;
}

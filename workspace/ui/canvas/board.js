// Lays the current project's rows out on the world: one row per target (App Store sizes, Google Play +
// feature graphic, web targets), the brand board in a column on the right. Frames load when they come
// near the screen. Rebuilding keeps every frame whose key still exists (no reload), so a config change
// that only adds an image does not refresh the rest.
import { state, frames, emit } from '../state.js';
import { Frame } from './frame.js';
import { setBounds } from './viewport.js';

const PHONE_W = 250;
const WIDE_H = 300;
const GAP = 24;
const ROW_GAP = 44; // + TOP: room for the labels, which keep their screen size at any zoom
const TOP = 76;
const SIDE_GAP = 110;
const BOARD_W = 380;
const TABS = { all: null, appstore: ['appstore'], play: ['play'], web: ['web'], brand: ['brand'] };

let world;
let io;

function width(f) {
  if (f.kind === 'feature') return PHONE_W * 1.6;
  if (f.kind === 'board' || f.kind === 'image' || f.kind === 'placeholder') return BOARD_W;
  if (f.space === 'landscape') return (WIDE_H * f.W) / f.H;
  const one = f.kind === 'strip' ? f.slice : f.W;
  const w = one / f.H > 0.62 ? (540 * one) / f.H : PHONE_W; // tablets: same height as a phone row, not the same width
  return f.kind === 'strip' ? w * (f.W / f.slice) : w;
}

// labels sit `lift` screen px above a world y and keep their screen size (styles: scale(var(--iz)))
function label(html, x, y, lift, cls = 'row-label') {
  const d = document.createElement('div');
  d.className = cls;
  d.innerHTML = html;
  Object.assign(d.style, { left: `${x}px`, top: `calc(${y}px - ${lift}px * var(--iz, 1))` });
  world.appendChild(d);
  return d;
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function seams(f) {
  f.el.querySelectorAll('.seam').forEach((s) => s.remove());
  if (f.kind !== 'strip') return;
  for (let i = 1; i < f.W / f.slice; i++) {
    const s = document.createElement('div');
    s.className = 'seam';
    s.style.left = `${i * f.slice * f.s}px`;
    f.el.appendChild(s);
  }
}

export function visibleRows() {
  const p = state.project;
  if (!p) return [];
  const want = TABS[state.tab];
  return p.rows.filter((r) => !want || want.includes(r.group));
}

export function build() {
  for (const n of [...world.querySelectorAll('.row-label, .fname')]) n.remove();
  const rows = visibleRows();
  const keep = new Set(rows.flatMap((r) => r.frames.map((f) => f.key)));
  for (const [k, f] of frames) if (!keep.has(k)) { io.unobserve(f.el); f.destroy(); frames.delete(k); }
  const main = rows.filter((r) => r.group !== 'brand' || rows.length === 1);
  const side = rows.filter((r) => !main.includes(r));
  let y = 0;
  let maxX = 0;
  const lay = (r, x0, y0) => {
    const top = y0 + TOP;
    label(`<b>${esc(r.title)}</b> ${esc(r.meta)}`, x0, top, r.frames.some((f) => f.label) ? 24 : 8);
    let x = x0;
    let bottom = y0;
    for (const spec of r.frames) {
      let f = frames.get(spec.key);
      if (!f) {
        f = new Frame(spec);
        frames.set(spec.key, f);
        world.appendChild(f.el);
        io.observe(f.el);
      } else {
        f.page = spec.page; // the spec may have changed (board image -> live board)
        f.panels = spec.panels;
      }
      const w = width(f);
      if (f.label) label(esc(f.label), x, top, 5, 'fname');
      f.place(x, top, w);
      seams(f);
      x += w + GAP;
      bottom = Math.max(bottom, top + f.h);
    }
    return { right: x - GAP, bottom };
  };
  const spans = [];
  for (const r of main) {
    const b = lay(r, 0, y);
    spans.push({ top: y, bottom: b.bottom, right: b.right });
    maxX = Math.max(maxX, b.right);
    y = b.bottom + ROW_GAP;
  }
  // the brand board sits beside the rows it lines up with (not after the widest row further down)
  const sideH = side.reduce((h, r) => h + TOP + BOARD_W * 0.8 + ROW_GAP, 0);
  const sideX = Math.max(0, ...spans.filter((s) => s.top < sideH).map((s) => s.right)) + SIDE_GAP;
  let sideBottom = 0;
  let sy = 0;
  for (const r of side) {
    const b = lay(r, sideX, sy);
    sy = b.bottom + ROW_GAP;
    sideBottom = b.bottom;
    maxX = Math.max(maxX, b.right);
  }
  const startW = Math.max(sideX + BOARD_W, ...spans.slice(0, 2).map((s) => s.right));
  const first = main.length > 1 ? main[1] : main[0];
  const firstBottom = first ? Math.max(...first.frames.map((s) => { const f = frames.get(s.key); return f.y + f.h; })) : 1;
  setBounds({ x: 0, y: 40, w: Math.max(maxX, 1), h: Math.max(y - ROW_GAP, sideBottom, 1) - 40 },
    { x: 0, y: 40, w: side.length ? startW : Math.max(...spans.slice(0, 2).map((s) => s.right), 1), h: Math.max(firstBottom, sideBottom) - 40 });
  emit('rows', rows);
}

export function reloadAll(filter = () => true) {
  for (const f of frames.values()) if (filter(f) && f.iframe) f.reload();
}

// frame under a world point
export function frameAt(wx, wy) {
  for (const f of frames.values()) if (wx >= f.x && wx <= f.x + f.w && wy >= f.y && wy <= f.y + f.h) return f;
  return null;
}

export function initBoard(els) {
  ({ world } = els);
  io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) frames.get(e.target.dataset.key)?.load();
  }, { root: els.canvas, rootMargin: '300px' });
}

export function clearBoard() {
  for (const f of frames.values()) { io.unobserve(f.el); f.destroy(); }
  frames.clear();
  world.innerHTML = '';
}

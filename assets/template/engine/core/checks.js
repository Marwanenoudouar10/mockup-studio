// Layout checks, run after every element is drawn (sharpness is quality.js). Findings are issues
// (core/issues.js): printed in the render log and listed by `npm run validate`.
//   edges   lifts, badges, stage text and the copy keep EDGE (40) design units from the image edges (SKILL
//           rule 14); an element with bleed: true is cut on purpose. Devices and tiles may bleed (fans, big phones),
//           but not by their TOP: devices turn around their bottom centre (devices/device.css), so a strong tilt
//           swings the status bar and the title off the side; tops() flags a top band cut by an edge.
//           A panorama strip is checked against its outer edges here, and against its seams in seams.js.
//   doubles a lift whose card is also visible in a phone, tablet or tile of the same image.
//   ui      per image (each slice of a panorama): does it show the app? A screen drawn over 2% or more of
//           the image counts. render-report.json keeps it, so the store rule "real UI on most images" is
//           checked on the pixels, not the config.
//   images  an image that failed to load (a tile's src, a badge icon, a logo file): an issue, and a tile shows
//           the magenta placeholder instead of an empty band (a missing file must never pass validate).
//   seams   (panorama) a lift, badge or copy block that stops within EDGE of a seam without crossing it, and
//           a device or tile that crosses a seam with only a sliver (under a quarter of its width, more than
//           its bezel) on one side: that sliver is clipped text on the next image (bridge: true = on purpose).
import { issue } from './issues.js';
import { seamCheck } from './seams.js';

const EDGE = 40;
const UI_SHARE = 0.02;

function rectOf(node, cv, c) {
  const r = node.getBoundingClientRect();
  return { l: (r.left - c.left) / cv.k, r: (r.right - c.left) / cv.k, t: (r.top - c.top) / cv.k, b: (r.bottom - c.top) / cv.k };
}

const area = (a) => Math.max(0, a.r - a.l) * Math.max(0, a.b - a.t);
const clip = (a, b) => ({ l: Math.max(a.l, b.l), r: Math.min(a.r, b.r), t: Math.max(a.t, b.t), b: Math.min(a.b, b.b) });
const what = (n) => n.dataset.what || (n.classList.contains('copy') ? 'the copy' : n.className.split(' ')[0]);

function edges(cv, c, W, H) {
  const nodes = [...cv.el.querySelectorAll('.lift, .badge, .stage-text, .copy')].filter((n) => n.dataset.bleed !== '1');
  for (const n of nodes) {
    const a = rectOf(n, cv, c);
    const slice = Math.max(0, Math.min(cv.slices - 1, Math.floor((a.l + a.r) / 2 / cv.designW)));
    const gaps = { left: a.l, right: W - a.r, top: a.t, bottom: H - a.b };
    const bad = Object.entries(gaps).filter(([, g]) => g < EDGE - 0.5);
    if (!bad.length) continue;
    const text = bad.map(([side, g]) => (g < 0 ? `cut by the ${side} edge` : `${Math.round(g)} units from the ${side} edge`)).join(', ');
    issue(`${what(n)} is ${text} (keep ${EDGE}, or set bleed: true when the cut is on purpose)`, cv.slices > 1 ? { slice } : {});
  }
}

// A device's top band (status bar + title: its top 12%) cut by an image edge, from its own box and rotation:
// .device turns around its bottom centre, so a tilt of r moves its top sideways by about h x sin(r).
// Warns when over TOP_CUT of the top edge or of the 12% line lies outside the image (bleed: true = on purpose).
const TOP_CUT = 0.15;
function tops(cv, W, H) {
  for (const n of cv.el.querySelectorAll('.device')) {
    if (n.dataset.bleed === '1') continue;
    const [L, T, w, h] = [n.offsetLeft, n.offsetTop, n.offsetWidth, n.offsetHeight];
    const r = ((parseFloat((n.style.transform.match(/rotate\((-?[\d.]+)deg\)/) || [])[1]) || 0) * Math.PI) / 180;
    const [px, py] = [L + w / 2, T + h];
    const at = (x, y) => ({ x: px + (x - px) * Math.cos(r) - (y - py) * Math.sin(r), y: py + (x - px) * Math.sin(r) + (y - py) * Math.cos(r) });
    const sides = new Set();
    let worst = 0;
    for (const y of [T, T + h * 0.12]) {
      let out = 0;
      for (let i = 0; i <= 20; i++) {
        const p = at(L + (w * i) / 20, y);
        const side = p.x < 0 ? 'left' : p.x > W ? 'right' : p.y < 0 ? 'top' : p.y > H ? 'bottom' : null;
        if (side) { out++; sides.add(side); }
      }
      worst = Math.max(worst, out / 21);
    }
    if (worst <= TOP_CUT) continue;
    const slice = Math.max(0, Math.min(cv.slices - 1, Math.floor(px / cv.designW)));
    issue(`${what(n)} has ${Math.round(worst * 100)}% of its top (status bar, title) cut by the ${[...sides].join(' + ')} edge: devices turn `
      + 'around their bottom centre, so a tilt swings the top by about h x sin(r); move x against the lean, or set bleed: true',
    cv.slices > 1 ? { slice } : {});
  }
}

// the part of the capture a device or tile shows, in capture pixels (a live screen says it: data-view)
function visibleSource(node) {
  if (node.dataset.view) {
    const [l, t, r, b] = node.dataset.view.split(',').map(Number);
    return { l, t, r, b };
  }
  const img = node.querySelector('img');
  if (!img || !img.naturalWidth) return null;
  if (!node.classList.contains('tile')) return { l: 0, t: 0, r: img.naturalWidth, b: img.naturalHeight };
  const bw = img.offsetWidth;
  const bh = img.offsetHeight;
  const fit = getComputedStyle(img).objectFit;
  const s = fit === 'contain' ? Math.min(bw / img.naturalWidth, bh / img.naturalHeight) : Math.max(bw / img.naturalWidth, bh / img.naturalHeight);
  const [px, py] = getComputedStyle(img).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
  const vw = Math.min(img.naturalWidth, bw / s);
  const vh = Math.min(img.naturalHeight, bh / s);
  const x0 = (img.naturalWidth - vw) * (Number.isFinite(px) ? px : 0.5);
  const y0 = (img.naturalHeight - vh) * (Number.isFinite(py) ? py : 0.5);
  return { l: x0, t: y0, r: x0 + vw, b: y0 + vh };
}

function doubles(cv, c) {
  const sliceOf = (n) => {
    const a = rectOf(n, cv, c);
    return Math.floor((a.l + a.r) / 2 / cv.designW);
  };
  const shows = [...cv.el.querySelectorAll('.device[data-src], .tile[data-src]')];
  for (const lift of cv.el.querySelectorAll('.lift[data-src][data-crop]')) {
    const [x, y, w, h] = lift.dataset.crop.split(',').map(Number);
    const card = { l: x, t: y, r: x + w, b: y + h };
    for (const d of shows) {
      if (d.dataset.src !== lift.dataset.src || sliceOf(d) !== sliceOf(lift)) continue;
      const v = visibleSource(d);
      if (v && area(clip(card, v)) > 0.5 * area(card)) {
        issue(`${what(lift)} is also visible in ${what(d)} on the same image: lift a card from another screen`,
          cv.slices > 1 ? { slice: sliceOf(lift) } : {});
      }
    }
  }
}

// -> [true|false per image]
function uiPerImage(cv, c, H) {
  const out = [];
  const nodes = [...cv.el.querySelectorAll('[data-ui="1"]')].map((n) => rectOf(n, cv, c));
  for (let i = 0; i < cv.slices; i++) {
    const img = { l: i * cv.designW, r: (i + 1) * cv.designW, t: 0, b: H };
    out.push(nodes.some((a) => area(clip(a, img)) >= UI_SHARE * area(img)));
  }
  return out;
}

// <img> load errors do not bubble: catch them on the way down, from the first element on (an SVG without an
// intrinsic size also has naturalWidth 0, so the error event, not the size, says a file is missing)
document.addEventListener('error', (ev) => {
  if (ev.target && ev.target.tagName === 'IMG') ev.target.dataset.failed = '1';
}, true);

// run after waitImages(): every image has loaded or failed by then
function brokenImages(cv, c) {
  for (const img of cv.el.querySelectorAll('img[data-failed="1"]')) {
    const src = img.getAttribute('src') || '';
    const holder = img.closest('.tile');
    const a = rectOf(holder || img, cv, c);
    const slice = Math.max(0, Math.min(cv.slices - 1, Math.floor((a.l + a.r) / 2 / cv.designW)));
    issue(`image not found: ${src} (${holder ? what(holder) : 'an image'}): check the path, or render what it shows first`,
      cv.slices > 1 ? { slice } : {});
    if (holder) holder.innerHTML = `<div class="missing">missing image<br>${src.split('/').pop().replace(/[<>&"]/g, '')}</div>`;
  }
}

export function layoutCheck(cv) {
  const c = cv.el.getBoundingClientRect();
  const W = cv.designW * cv.slices;
  const H = cv.DH;
  brokenImages(cv, c);
  edges(cv, c, W, H);
  tops(cv, W, H);
  if (cv.slices > 1) seamCheck(cv, c, { rectOf, what, EDGE });
  doubles(cv, c);
  const ui = uiPerImage(cv, c, H);
  if (cv.slices > 1) {
    ui.forEach((has, i) => {
      if (!has) {
        issue(`panorama image ${i + 1} shows no screen: in a panorama, stage x is GLOBAL (image ${i + 1} spans x `
          + `${i * cv.designW}-${(i + 1) * cv.designW}); give this store its own stage, stage: { <store id>: [...], default: [...] }`, { slice: i });
      }
    });
  }
  return { ui };
}

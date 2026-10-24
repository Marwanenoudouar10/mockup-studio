// Gallery: every image of one store in a row (portrait) or a grid of up to 3 per row (landscape).
// Final mode (npm run sheet) prefers the hi-res portfolio files (final/portfolio/<locale>/<store>/) when they
// exist and are not older than the upload images (sheet.js passes hires=0 otherwise), and reports window.__dpr:
// the pixel ratio that makes the sheet sheet.width (3840) wide without ever drawing an image larger than its
// own pixels (below 1 when the row is wider than sheet.width at sheet.height: sheet.width is a real maximum).
import { STORES } from '../scripts/lib/stores.js';
import { pad2, panelsFor } from '../scripts/lib/config.js';
import { q, loadConfig, ready, fail, el, esc, setPageSize } from './core/boot.js';
import { loadFonts } from './core/theme.js';
import { waitImages } from './core/assets.js';
import { at } from './core/root.js';

const head = (url) => fetch(url, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);

function frameReady(iframe) {
  return new Promise((resolve) => {
    const tick = () => {
      const w = iframe.contentWindow;
      if (w && (w.__ready || w.__error)) resolve();
      else setTimeout(tick, 100);
    };
    tick();
  });
}

function nav(cfg, storeId, locale, cfgFile) {
  const box = el('div', 'nav');
  for (const s of cfg.stores) for (const l of cfg.locales) {
    const a = el('a', s.id === storeId && l === locale ? 'on' : '', `${esc(s.id)} / ${esc(l)}`);
    a.href = `?config=${encodeURIComponent(cfgFile)}&store=${s.id}&locale=${l}`;
    box.appendChild(a);
  }
  return box;
}

function liveFrame(src, W, H, scale, slices = 1) {
  const shot = el('div', 'shot');
  Object.assign(shot.style, { width: `${W * slices * scale}px`, height: `${H * scale}px` });
  const f = el('iframe');
  Object.assign(f.style, { width: `${W * slices}px`, height: `${H}px`, transform: `scale(${scale})` });
  f.src = src;
  shot.appendChild(f);
  for (let i = 1; i < slices; i++) {
    const seam = el('div', 'seam');
    seam.style.left = `${W * i * scale - 1}px`;
    shot.appendChild(seam);
  }
  return { shot, frame: f };
}

async function main() {
  const cfg = await loadConfig();
  const cfgFile = q.get('config') || 'studio.config.js';
  const storeId = q.get('store') || cfg.stores[0].id;
  const st = cfg.stores.find((s) => s.id === storeId) || { id: storeId, ...STORES[storeId] };
  if (!st.size) throw new Error(`unknown store "${storeId}"`);
  const locale = q.get('locale') || cfg.defaultLocale;
  const live = q.get('mode') !== 'final';
  const S = cfg.sheet;
  const [W, H] = st.size;
  const wide = W > H;
  // portrait sets: a fixed row height; landscape sets: a fixed tile width
  // never wider/taller than the images themselves (a 440 x 280 promo tile stays 440 wide)
  const scale = wide ? Math.min(W, Number(q.get('w') || (live ? 900 : S.wideWidth))) / W
    : Math.min(H, Number(q.get('h') || (live ? 760 : S.height))) / H;
  const h = Math.round(H * scale);
  const root = document.documentElement.style;
  root.setProperty('--sheet-bg', S.background);
  root.setProperty('--pad', `${S.padding}px`);
  root.setProperty('--gap', `${S.gap}px`);
  root.setProperty('--r', `${Math.round((wide ? H * 0.06 : W * 0.05) * scale)}px`);
  if (live) document.body.classList.add('live');
  await loadFonts(cfg.brand, cfg.brand.name);

  if (live) document.body.appendChild(nav(cfg, storeId, locale, cfgFile));
  if (S.title) {
    const label = `${st.label || st.id} · ${locale}`;
    document.body.appendChild(el('div', 'head', `<div class="name">${esc(cfg.brand.name)}</div><div class="meta">${esc(label)}</div>`));
  }
  const row = el('div', wide ? 'row grid' : 'row');
  document.body.appendChild(row);
  const mine = panelsFor(cfg, st);
  const base = `${at('engine/panel.html')}?config=${encodeURIComponent(cfgFile)}&store=${st.id}&locale=${locale}`;
  const frames = [];
  if (live && st.panorama) {
    const { shot, frame } = liveFrame(`${base}&strip=1`, W, H, scale, mine.length);
    row.appendChild(shot);
    frames.push(frame);
  } else if (live) {
    for (const p of mine) {
      const { shot, frame } = liveFrame(`${base}&panel=${p.id}`, W, H, scale);
      row.appendChild(shot);
      frames.push(frame);
    }
  } else {
    const out = (q.get('out') || 'final').replace(/^\/+|\/+$/g, '');
    const n = Array.from({ length: 10 }, (_, i) => pad2(i + 1));
    const hires = n.map((x) => at(`${out}/portfolio/${locale}/${st.id}/${x}.png`));
    const upload = n.map((x) => at(`${out}/${locale}/${st.id}/${x}.png`));
    const useHires = q.get('hires') !== '0';
    const [okH, okU] = await Promise.all([Promise.all(hires.map((u) => (useHires ? head(u) : false))), Promise.all(upload.map(head))]);
    const found = n.map((_, i) => (okH[i] ? hires[i] : okU[i] ? upload[i] : null)).filter(Boolean);
    if (!found.length) row.appendChild(el('div', 'empty', `No images in ${esc(out)}/${esc(locale)}/${esc(st.id)}/ yet: run npm run render.`));
    for (const url of found) {
      const shot = el('div', 'shot', `<img src="${url}" alt="">`);
      Object.assign(shot.style, { width: `${Math.round(W * scale)}px`, height: `${h}px` });
      row.appendChild(shot);
    }
  }
  if (wide) {
    // up to 3 per row (an inline-block body would otherwise wrap a flex row at its narrowest)
    const cols = Math.max(1, Math.min(3, row.querySelectorAll('.shot').length));
    row.style.width = `${Math.round(W * scale) * cols + S.gap * (cols - 1)}px`;
  }
  await Promise.all(frames.map(frameReady));
  await waitImages();
  const size = { w: Math.ceil(document.body.scrollWidth), h: Math.ceil(document.body.scrollHeight) };
  if (!live) setPageSize(size.w, size.h);
  window.__size = size;
  // sharpest pixel ratio that never upscales a source image, capped at sheet.width
  const limits = [...document.querySelectorAll('.shot img')].map((i) => i.naturalWidth / i.getBoundingClientRect().width);
  window.__dpr = Math.max(0.25, Math.min(S.width / size.w, ...limits.filter((x) => x > 0)));
  // the scale of the files shown (1 = upload size, 2 = portfolio --scale 2): sheet.js works out the export it needs
  const first = document.querySelector('.shot img');
  window.__srcScale = first && first.naturalWidth ? first.naturalWidth / W : 1;
  ready();
}

main().catch(fail);

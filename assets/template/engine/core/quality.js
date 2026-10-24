// Sharpness check: a raster screen must never be drawn larger than its own pixels.
// Runs after layout. For every <img> in a device, lift or tile it computes
//   drawn px per source px = CSS scale inside the canvas (object-fit aware) x canvas scale k x devicePixelRatio
// and warns when it is above 1.05 (the image would be upscaled, so soft). The render log prints the warnings;
// window.__info.upscale feeds final/render-report.json, which `npm run validate` reads.

const LIMIT = 1.05;

function drawnScale(img) {
  const sx = img.offsetWidth / img.naturalWidth;
  const sy = img.offsetHeight / img.naturalHeight;
  const fit = getComputedStyle(img).objectFit;
  if (fit === 'contain') return Math.min(sx, sy);
  if (fit === 'none') return 1;
  return Math.max(sx, sy); // cover, fill, or an explicit width (lifts)
}

export function upscaleCheck(cv) {
  const dpr = window.devicePixelRatio || 1;
  const worst = new Map();
  for (const img of cv.el.querySelectorAll('.device img, .lift img, .tile img')) {
    if (!img.naturalWidth || /\.svg(\?|$)/i.test(img.getAttribute('src') || '')) continue;
    if (img.closest('.bar, .m-top, .m-bottom')) continue; // favicons and browser chrome
    const ratio = drawnScale(img) * cv.k * dpr;
    const host = img.closest('[data-what]');
    const what = host ? host.dataset.what : img.getAttribute('src');
    if (ratio > (worst.get(what) || { ratio: 0 }).ratio) worst.set(what, { what, ratio, src: img.getAttribute('src'), px: img.naturalWidth });
  }
  const found = [...worst.values()].filter((w) => w.ratio > LIMIT).map((w) => ({ ...w, ratio: +w.ratio.toFixed(2) }));
  for (const w of found) {
    console.warn(`${w.what} is upscaled ${w.ratio}x (${w.src}, ${w.px} px wide, drawn at ${Math.round(w.px * w.ratio)} px):`
      + ` capture it ${Math.ceil(w.ratio)}x larger (npm run screens -- --scale ${Math.ceil(w.ratio)}, capture --dpr) or draw it smaller`);
  }
  return found;
}

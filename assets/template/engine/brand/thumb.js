// A real store image, small: built with the engine's own modules (field preset, grain, watermark,
// logo, headline with its ornament, phones and lifts), so every brand option is judged on what the
// store images will actually look like, not on loose swatches.
//   miniPanel(slot, { W, H, cfg, colors?, field?, vars?, panel: {headline, sub, logo}, stage: [...] })
// W x H is the thumbnail in CSS px; the design canvas is 1320 wide as in a real render (k = W / 1320).
import { makeCanvas } from '../layout/canvas.js';
import { buildCopy, fitCopy, copyBottom } from '../layout/copy.js';
import { stageFrame } from '../layout/stage.js';
import { addWatermarks } from '../layout/watermark.js';
import { buildElements } from '../elements/index.js';
import { applyOrnament } from '../ornaments/index.js';
import { applyColors } from '../core/theme.js';
import { waitImages } from '../core/assets.js';

export async function miniPanel(slot, { W, H, cfg, colors, field, vars = {}, panel, stage = [] }) {
  const brand = cfg.brand;
  const cv = makeCanvas({ W, H, field: field || brand.field, grain: brand.grain });
  slot.appendChild(cv.el);
  applyColors(colors || brand.colors, cv.el);
  for (const [k, v] of Object.entries(vars)) cv.el.style.setProperty(k, v);
  if (!panel.wordmark) await addWatermarks(cv, brand); // no logo chosen yet: no symbol to watermark with
  const ornament = panel.ornament || brand.ornament;
  const block = await buildCopy({ logo: true, ...panel }, { cv, brand, layout: cfg.layout, ornament });
  await waitImages(cv.el);
  await document.fonts.ready;
  fitCopy(block, cv, cfg.layout, panel.lines);
  const gap = cv.tall ? cfg.layout.gap : cfg.layout.gapShort;
  const fr = stageFrame({ DH: cv.DH, top: copyBottom(block, cv) + gap });
  await buildElements(stage, { cv, fr, brand, device: 'iphone', platform: 'ios', locale: cfg.defaultLocale });
  applyOrnament(ornament, block, cv, {});
  await waitImages(cv.el);
  return cv;
}

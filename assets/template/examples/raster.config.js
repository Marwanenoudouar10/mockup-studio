// Screenshots (raster) example: the demo's first three images as a SCREENSHOTS project. Every device, lift and
// tile draws a PNG capture from raw/<platform>/ (npm run screens), the way a project made from real app
// screenshots (Mode A) always works. Compare with the demo itself (studio.config.js), an EDITABLE project whose
// mock screens are drawn live, can be edited in Mockup Studio (edits.json) and exported as layered SVG.
//   npm run screens                                                     the captures (raw/), once
//   npm run render -- --config examples/raster.config.js --out out/qa/raster
//   npm run vector -- --config examples/raster.config.js --store appstore  (captures stay images in the SVG)
// The project type is screens.mode: 'raster' here; 'live' in the demo. A one-off run in the other type:
// --screens live | raster on render, export and vector (the parity test renders both ways).
// Screen edits (examples/raster.edits.json, if any) reach a raster project through `npm run screens --
// --config examples/raster.config.js`: the kit applies them before the capture.
import base from '../studio.config.js';

export default {
  ...base,
  screens: { ...(base.screens || {}), mode: 'raster' },
  stores: ['appstore', 'playstore'],
  panels: base.panels.slice(0, 3),
  feature: base.feature,
};

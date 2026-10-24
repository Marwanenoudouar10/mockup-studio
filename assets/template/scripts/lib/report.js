// <out>/render-report.json: what the renderer learned that the files cannot tell, keyed by file (f = the stage scale)
// (relative to the project): { "final/en/og/01.png": { "scale": 1, "upscale": [{ what, ratio, src, px }],
//   "ui": true, "issues": ["lift \"streak\" (insights) is cut by the right edge ..."] } }.
// ui = the image shows the app (a screen over 2% of it, engine/core/checks.js); issues = the page's findings
// (bad crops, screens not localized, cut or doubled cards, empty panorama images).
// render.js / feature.js merge their findings in; validate.js turns upscale findings and issues into warnings
// and uses `ui` for the store rule on real UI.
import fs from 'node:fs';
import path from 'node:path';

const NAME = 'render-report.json';

export function readQuality(out) {
  try {
    return JSON.parse(fs.readFileSync(path.join(out, NAME), 'utf8'));
  } catch {
    return {};
  }
}

export function recordQuality(out, entries) {
  if (!Object.keys(entries).length) return;
  fs.mkdirSync(out, { recursive: true });
  const all = { ...readQuality(out), ...entries };
  const sorted = Object.fromEntries(Object.keys(all).sort().map((k) => [k, all[k]]));
  fs.writeFileSync(path.join(out, NAME), `${JSON.stringify(sorted, null, 2)}\n`);
}

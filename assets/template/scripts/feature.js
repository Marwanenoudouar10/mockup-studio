// Renders the Google Play feature graphic per locale: final/<locale>/playstore/feature-graphic.png (1024x500, RGB).
//   node scripts/feature.js [--locale en] [--out final] [--config file] [--scale 2|3]
// --scale N: the portfolio copy at N x (2048 x 1000 at 2x) in final/portfolio/<locale>/playstore/.
import fs from 'node:fs';
import path from 'node:path';
import { flattenPng } from './lib/png.js';
import { parseArgs, list, loadConfig, outDir, rel, isMain, fail } from './lib/cli.js';
import { openSession, capture } from './lib/session.js';
import { printFile, scaleOf, storeDir, pageFlags } from './render.js';
import { recordQuality } from './lib/report.js';
import { liftEdgeIssues } from './lib/lift-edge.js';

export async function runFeature(session, cfg, cfgRel, flags = {}) {
  if (!cfg.feature) {
    console.log('  no `feature` block in the config: skipped');
    return 0;
  }
  const locales = list(flags.locale) || cfg.locales;
  const scale = scaleOf(flags);
  const report = {};
  for (const locale of locales) {
    const t0 = Date.now();
    const [b] = await capture(session, `engine/feature.html?config=${encodeURIComponent(cfgRel)}&locale=${locale}${pageFlags(flags)}`, { width: 1024, height: 500, dpr: scale });
    const info = await session.info();
    const dir = storeDir(flags, locale, 'playstore');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'feature-graphic.png');
    const png = flattenPng(b);
    fs.writeFileSync(file, png);
    const edges = liftEdgeIssues(png, info && info.lifts, { scale }); // a card that dissolves into its field
    printFile(file, png, Date.now() - t0, [...session.drain(), ...edges]);
    report[rel(file)] = { scale, upscale: (info && info.upscale) || [], ui: info && info.ui ? !!info.ui[0] : null,
      issues: [...((info && info.issues) || []).map((x) => x.text), ...edges] };
  }
  recordQuality(outDir(flags), report);
  return locales.length;
}

if (isMain(import.meta)) {
  (async () => {
    const flags = parseArgs();
    const { cfg, rel } = await loadConfig(flags);
    const session = await openSession();
    try {
      console.log('feature graphic');
      await runFeature(session, cfg, rel, flags);
    } finally {
      await session.close();
    }
  })().catch(fail);
}

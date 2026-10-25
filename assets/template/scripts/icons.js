// Store icons from config.icon.src (default brand/icon.svg), full-bleed squares (the stores round them), for the
// stores the config has (scripts/lib/stores.js iconsFor: an App Store-only set gets no Play icon):
//   final/icons/appstore-1024.png   1024x1024, 24-bit RGB, no alpha (App Store rejects transparency)
//   final/icons/playstore-512.png   512x512, 32-bit RGBA (Google Play asks for a 32-bit PNG)
// No icon file yet (the logo step skipped): a warning, no icons, and the export goes on (validate lists them as
// missing); a quick one: npm run brand -- apply --logo wordmark.
//   node scripts/icons.js [--out final] [--config file]
import fs from 'node:fs';
import path from 'node:path';
import { flattenPng, rgbaPng } from './lib/png.js';
import { iconsFor } from './lib/stores.js';
import { ROOT, parseArgs, loadConfig, outDir, isMain, fail } from './lib/cli.js';
import { openSession, capture } from './lib/session.js';
import { printFile } from './render.js';

export async function runIcons(session, cfg, cfgRel, flags = {}) {
  const dir = path.join(outDir(flags), 'icons');
  const jobs = iconsFor(cfg);
  if (!jobs.length) {
    console.log('  no App Store or Google Play target: no store icons');
    return 0;
  }
  const src = cfg.icon && cfg.icon.src;
  if (!src || !fs.existsSync(path.join(ROOT, src))) {
    console.log(`  warn: no ${src || 'icon'} yet: store icons skipped (draw the logo, npm run brand -- logos, or make a quick one:`
      + ' npm run brand -- apply --logo wordmark)');
    return 0;
  }
  fs.mkdirSync(dir, { recursive: true });
  const base = `engine/icon.html?config=${encodeURIComponent(cfgRel)}`;
  for (const j of jobs) {
    const t0 = Date.now();
    const [b] = await capture(session, `${base}&size=${j.size}&alpha=${j.alpha ? 1 : 0}`, {
      width: j.size, height: j.size, omitBackground: j.alpha,
    });
    const png = j.alpha ? rgbaPng(b) : flattenPng(b, cfg.icon.background);
    const file = path.join(dir, j.file);
    fs.writeFileSync(file, png);
    printFile(file, png, Date.now() - t0, session.drain());
  }
  return jobs.length;
}

if (isMain(import.meta)) {
  (async () => {
    const flags = parseArgs();
    const { cfg, rel } = await loadConfig(flags);
    const session = await openSession();
    try {
      console.log('icons');
      await runIcons(session, cfg, rel, flags);
    } finally {
      await session.close();
    }
  })().catch(fail);
}

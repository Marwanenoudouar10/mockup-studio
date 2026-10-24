// Store icons from config.icon.src (default brand/icon.svg), full-bleed squares (the stores round them):
//   final/icons/appstore-1024.png   1024x1024, 24-bit RGB, no alpha (App Store rejects transparency)
//   final/icons/playstore-512.png   512x512, 32-bit RGBA (Google Play asks for a 32-bit PNG)
//   node scripts/icons.js [--out final] [--config file]
import fs from 'node:fs';
import path from 'node:path';
import { flattenPng, rgbaPng } from './lib/png.js';
import { parseArgs, loadConfig, outDir, isMain, fail } from './lib/cli.js';
import { openSession, capture } from './lib/session.js';
import { printFile } from './render.js';

export async function runIcons(session, cfg, cfgRel, flags = {}) {
  const dir = path.join(outDir(flags), 'icons');
  fs.mkdirSync(dir, { recursive: true });
  const base = `engine/icon.html?config=${encodeURIComponent(cfgRel)}`;
  const jobs = [
    { file: 'appstore-1024.png', size: 1024, alpha: false },
    { file: 'playstore-512.png', size: 512, alpha: true },
  ];
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

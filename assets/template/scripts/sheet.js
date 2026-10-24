// Overview sheets: every final image of a store side by side -> final/<locale>/overview-<store>.jpg
// (README images, portfolio covers, client review). Renders engine/gallery.html in final mode.
//   node scripts/sheet.js [--store appstore] [--locale en] [--out final] [--config file] [--png]
// Sharp when zoomed: shot at the pixel ratio that makes the sheet sheet.width (3840) px wide, capped so no
// image is drawn larger than its pixels (render --scale 2 first for 4K landscape sheets: the gallery prefers
// final/portfolio/). JPEG quality sheet.quality (94); --png also writes a lossless overview-<store>.png.
// Hi-res copies OLDER than their upload images (a 1x export after a --scale 2 one) are skipped with a note,
// so a sheet never shows a layout that is no longer in final/<locale>/ (validate warns about them too).
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, loadConfig, outDir, rel, isMain, fail } from './lib/cli.js';
import { openSession, capture } from './lib/session.js';
import { pick, printFile } from './render.js';
import { jpegInfo } from './lib/jpeg.js';
import { staleHires } from './lib/stale.js';

export async function runSheet(session, cfg, cfgRel, flags = {}) {
  const { stores, locales } = pick(cfg, flags);
  const out = outDir(flags);
  let n = 0;
  for (const locale of locales) {
    for (const st of stores) {
      const dir = path.join(out, locale, st.id);
      if (!fs.existsSync(dir) || !fs.readdirSync(dir).some((f) => /^\d+\.(png|jpe?g)$/i.test(f))) continue;
      const t0 = Date.now();
      const old = staleHires(out, locale, st.id);
      if (old.length) console.log(`  note: ${rel(path.join(out, 'portfolio', locale, st.id))}/ is older than the upload images (${old.join(', ')}): the sheet uses the upload images; run npm run export -- --scale 2`);
      const url = `engine/gallery.html?config=${encodeURIComponent(cfgRel)}&store=${st.id}&locale=${locale}`
        + `&mode=final&out=${encodeURIComponent(rel(out))}${old.length ? '&hires=0' : ''}`;
      const [b] = await capture(session, url, {
        width: 1600, height: 1000, type: 'jpeg', quality: Math.max(92, cfg.sheet.quality), sizeFrom: '__size', dprFrom: '__dpr',
      });
      const file = path.join(out, locale, `overview-${st.id}.jpg`);
      fs.writeFileSync(file, b);
      const i = jpegInfo(b);
      printFile(file, b, Date.now() - t0, session.drain());
      if (i && i.width < cfg.sheet.width * 0.9) {
        const src = (await session.page.evaluate(() => window.__srcScale || 1).catch(() => 1)) || 1;
        const need = Math.ceil((src * cfg.sheet.width * 0.9) / i.width - 1e-6); // the export that clears this note
        const hint = need <= 4 ? `export --scale ${need} for a ${cfg.sheet.width} px sheet`
          : `export --scale 4 makes it about ${Math.round((i.width * 4) / src)} px (the most it gets)`;
        console.log(`      note: ${i.width} px wide, limited by the images (never upscaled); ${hint}`);
      }
      if (flags.png) {
        const png = Buffer.from(await session.page.screenshot({ type: 'png', captureBeyondViewport: false }));
        const pfile = file.replace(/\.jpg$/, '.png');
        fs.writeFileSync(pfile, png);
        printFile(pfile, png, 0);
      }
      n++;
    }
  }
  return n;
}

if (isMain(import.meta)) {
  (async () => {
    const flags = parseArgs();
    const { cfg, rel: cfgRel } = await loadConfig(flags);
    const session = await openSession();
    try {
      console.log('overview sheets');
      const n = await runSheet(session, cfg, cfgRel, flags);
      if (!n) console.log('  nothing rendered yet: run npm run render first');
    } finally {
      await session.close();
    }
  })().catch(fail);
}

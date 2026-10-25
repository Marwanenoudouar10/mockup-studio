// Everything, with ONE Chrome: render -> feature graphic -> icons -> [portfolio] -> [vector] -> validate -> sheets.
//   node scripts/export.js [--store ..] [--locale ..] [--out final] [--config file] [--scale 2|3] [--png] [--strict]
//     [--vector] [--screens raster|live]
// --vector adds the editable files (scripts/vector.js): final/vector/<locale>/<target>/NN.svg + NN.pdf.
// --scale N adds the hi-res portfolio pass (every image at N x into final/portfolio/<locale>/<target>/), and the
// overview sheets use those files, so they come out 3840 px wide and sharp when zoomed.
// First it removes output the config no longer makes (a dropped locale or target, the demo's renders in a
// new project: scripts/lib/stale.js), so the final/ folder can be zipped as it is.
// Exits non-zero when validation fails (the sheets are still made so you can look).
import { parseArgs, loadConfig, outDir, rel, fail } from './lib/cli.js';
import { openSession } from './lib/session.js';
import { runRender, scaleOf } from './render.js';
import { runFeature } from './feature.js';
import { runIcons } from './icons.js';
import { runValidate } from './validate.js';
import { runSheet } from './sheet.js';
import { pruneStale } from './lib/stale.js';
import { runVector } from './vector.js';

(async () => {
  const flags = parseArgs();
  delete flags.panel;
  const scale = scaleOf(flags);
  const base = { ...flags, scale: 1 };
  const { cfg, rel: cfgRel } = await loadConfig(flags);
  const t0 = Date.now();
  const steps = 5 + (scale > 1 ? 1 : 0) + (flags.vector ? 1 : 0);
  let n = 0;
  const step = (text) => console.log(`${++n}/${steps} ${text}`);
  const session = await openSession();
  let ok = false;
  try {
    step(`render (${cfgRel}) -> ${rel(outDir(flags))}/`);
    pruneStale(cfg, outDir(flags));
    await runRender(session, cfg, cfgRel, base);
    step('feature graphic');
    await runFeature(session, cfg, cfgRel, base);
    step('icons');
    await runIcons(session, cfg, cfgRel, base);
    if (scale > 1) {
      step(`portfolio at ${scale}x -> ${rel(outDir(flags))}/portfolio/`);
      await runRender(session, cfg, cfgRel, flags);
      await runFeature(session, cfg, cfgRel, flags);
    }
    if (flags.vector) {
      step(`vector (SVG + PDF) -> ${rel(outDir(flags))}/vector/`);
      await runVector(session, cfg, cfgRel, base);
    }
    step(`validate ${rel(outDir(flags))}/`);
    const v = runValidate(cfg, flags);
    console.log(v.rows.join('\n'));
    ok = v.ok;
    step('overview sheets');
    await runSheet(session, cfg, cfgRel, base);
  } finally {
    await session.close();
  }
  console.log(`\n  ${ok ? 'done' : 'done WITH VALIDATION PROBLEMS'} in ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
  process.exit(ok ? 0 : 1);
})().catch(fail);

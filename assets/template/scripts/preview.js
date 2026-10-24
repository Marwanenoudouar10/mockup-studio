// Live preview: serves the project and prints the gallery URL. Edit studio.config.js, reload the page.
//   node scripts/preview.js [--port 5178] [--config file]
import { serve } from './lib/server.js';
import { ROOT, parseArgs, loadConfig, fail } from './lib/cli.js';

(async () => {
  const flags = parseArgs();
  const { cfg, rel } = await loadConfig(flags);
  const c = encodeURIComponent(rel);
  const home = `/engine/gallery.html?config=${c}`;
  let srv;
  try {
    srv = await serve(ROOT, { port: Number(flags.port || 5178), home });
  } catch {
    srv = await serve(ROOT, { port: 0, home });
  }
  const o = srv.origin;
  console.log(`\n  preview (${rel})  ->  ${o}${home}\n`);
  for (const st of cfg.stores) {
    console.log(`  ${st.id.padEnd(14)} ${o}/engine/gallery.html?config=${c}&store=${st.id}`);
  }
  console.log(`  one panel      ${o}/engine/panel.html?config=${c}&store=${cfg.stores[0].id}&panel=1`);
  if (cfg.feature) console.log(`  feature        ${o}/engine/feature.html?config=${c}`);
  console.log(`  web kit        ${o}/screens/kit/web-demo.html?platform=web   (&theme=dark, &size=ios)`);
  console.log('\n  Ctrl+C to stop.\n');
})().catch(fail);

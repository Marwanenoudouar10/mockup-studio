// npm run brand -- fonts [--pairs "Poppins/Inter,Newsreader/Inter,Space Grotesk/Inter"]
// Each pair is Display/Text in fontsource family names: display = store headlines, the wordmark and
// in-app titles; text = sub lines and UI copy. A family that is not installed is skipped with the
// exact npm command to add it (nothing crashes); the board shows the pairs that are installed.
// -> out/brand/fonts/fonts.json + out/brand/fonts/font-board.png
import { parsePairs, resolvePairs } from './lib/fontsource.js';
import { readBrief, sampleCopy } from './lib/brief.js';
import { writeJson, OUT } from './lib/tokens-io.js';
import { shootBoard } from './lib/shoot.js';
import { openSession } from '../lib/session.js';

const DEFAULT_PAIRS = 'Poppins/Inter,Newsreader/Inter,Roboto/Roboto';

export async function run(flags, { cfg, tokens, rel }) {
  const brief = readBrief();
  const asked = flags.pairs && flags.pairs !== true ? String(flags.pairs) : DEFAULT_PAIRS;
  const { pairs, missing } = resolvePairs(parsePairs(asked));
  console.log(`fonts  ${pairs.length} pair(s)`);
  for (const p of pairs) {
    console.log(`  ${p.id}  ${p.label.padEnd(28)} ${p.missing ? 'NOT INSTALLED' : `display ${p.display.weights.join('/')}, headline ${p.headlineWeight}`}`);
  }
  if (missing.length) {
    console.log('\n  not installed (fontsource). Add them, then run this again:');
    for (const f of missing) console.log(`    ${f.install}      (static files instead: ${f.fallback})`);
    console.log('  Family names: https://fontsource.org (the npm name is the family in lower case, spaces -> dashes)\n');
  }
  const shown = pairs.filter((p) => !p.missing);
  if (!shown.length) {
    console.log('  nothing to show yet: install a pair above.');
    process.exitCode = 1;
    return;
  }
  const dir = `${OUT}/fonts`;
  writeJson(`${dir}/fonts.json`, { sample: sampleCopy(brief, cfg, tokens), pairs });
  const session = await openSession();
  try {
    await shootBoard(session, rel, 'fonts', { data: `${dir}/fonts.json` }, `${dir}/font-board.png`);
  } finally {
    await session.close();
  }
  console.log(`\n  next: look at ${dir}/font-board.png, then  npm run brand -- apply --fonts <N>\n`);
}

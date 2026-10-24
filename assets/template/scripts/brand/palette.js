// npm run brand -- palette [--seed "#6C5CE7"] [--mood warm] [--options 3] [--look dark] [--accent "#C6F432"] [--theme dark]
// Seed: --seed, else the brief's "Seed colour", else the current primary. Mood: --mood, else the brief's.
// --look dark: three dark directions (night, graphite, deep) instead of drenched, night, paper (a dark brief).
// --accent: pin the accent colour (a client's real accent; an electric lime) instead of deriving it.
// --theme dark: the sample screens in dark mode, on the option's dark app surfaces (a dark-first app);
//   default: the config's screens.theme.
// -> out/brand/palette/palettes.json        every option: colours, ramp, neutrals, UI tokens, checks
//    out/brand/palette/option-N.tokens.json  each option as a token file (previews: ?tokens=...)
//    out/brand/palette/sample-N.png          the kit's sample screen in that option (+ sample-N-phone.png without
//                                            its hero card, for the phone beside the lifted card)
//    out/brand/palette/palette-board.png     the board to show the client
import { generate, MOODS } from './lib/generate.js';
import { normHex } from './lib/color.js';
import { readBrief, sampleCopy } from './lib/brief.js';
import { writeJson, currentFonts, paletteTokens, mergeTokens, OUT } from './lib/tokens-io.js';
import { shootBoard, shootSample } from './lib/shoot.js';
import { openSession } from '../lib/session.js';

const val = (v) => (v === undefined || v === true ? null : String(v));

export async function run(flags, { cfg, tokens, rel }) {
  const brief = readBrief();
  const seed = normHex(val(flags.seed) || brief.seed || cfg.brand.colors.primary);
  const mood = (val(flags.mood) || brief.mood || 'balanced').toLowerCase();
  if (!MOODS[mood]) throw new Error(`--mood ${mood}: use ${Object.keys(MOODS).join(', ')}`);
  const count = Number(val(flags.options) || 3);
  if (!(count >= 1 && count <= 3)) throw new Error('--options takes 1, 2 or 3 (one per direction: drenched, night, paper)');
  const look = val(flags.look);
  const accent = val(flags.accent);
  const theme = val(flags.theme) || (cfg.screens && cfg.screens.theme) || null;
  const options = generate(seed, { mood, count, look, accent });
  const dir = `${OUT}/palette`;
  const name = brief.name || cfg.brand.name;
  const { fonts, headlineWeight } = currentFonts(tokens, cfg);
  for (const o of options) {
    writeJson(`${dir}/option-${o.id}.tokens.json`, mergeTokens({ name, fonts, headlineWeight }, paletteTokens(o, { seed, mood })));
  }
  writeJson(`${dir}/palettes.json`, { seed, mood, dir, sample: sampleCopy(brief, cfg, tokens), options });

  console.log(`palette  seed ${seed} · mood ${mood}${look ? ` · look ${look}` : ''}${accent ? ` · accent ${normHex(accent)}` : ''} · ${options.length} option(s)`);
  for (const o of options) {
    const bad = o.checks.filter((c) => !c.pass);
    console.log(`  ${o.id}  ${o.name.padEnd(28)} primary ${o.colors.primary}  accent ${o.colors.accent}  field ${o.field.padEnd(9)}`
      + ` ${bad.length ? `watch: ${bad.map((c) => `${c.label} ${c.ratio}`).join(', ')}` : 'all checks pass'}`);
  }
  const session = await openSession();
  try {
    for (const o of options) {
      const tokensFile = `${dir}/option-${o.id}.tokens.json`;
      await shootSample(session, `${dir}/sample-${o.id}.png`, { tokens: tokensFile, theme });
      await shootSample(session, `${dir}/sample-${o.id}-phone.png`, { tokens: tokensFile, hide: 'card', theme });
    }
    await shootBoard(session, rel, 'palette', { data: `${dir}/palettes.json` }, `${dir}/palette-board.png`);
  } finally {
    await session.close();
  }
  console.log(`\n  next: look at ${dir}/palette-board.png, then  npm run brand -- apply --palette <N>\n`);
}

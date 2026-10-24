// The brand step: runs BEFORE any screen or store image, in both modes (from screenshots / from a
// description). Fill briefs/brand-brief.md first, then:
//   npm run brand -- palette [--seed "#6C5CE7"] [--mood warm] [--options 3]    colour directions board
//   npm run brand -- fonts [--pairs "Poppins/Inter,Newsreader/Inter"]          type pairings board
//   npm run brand -- apply --palette N --fonts N                                write brand/tokens.json
//   npm run brand -- logos [--dir brand/logo-options] [--icon-style gradient]   logo directions board
//   npm run brand -- apply --logo <id> [--icon-style s] [--icon-scale 0.56]     logo, mark, icon -> brand/
//   npm run brand -- board [--screen today --box tasks | --crop x,y,w,h] [--phone home] [--platform ios]
//                                                                               final/brand/brand-board.png
// Option boards go to out/brand/<topic>/, the approved board and the logo PNGs to final/brand/.
// Every render uses the same libs as the store images: one server, one Chrome, one page, in order.
// Moods: balanced calm bold warm fresh serious. Icon styles: gradient solid night paper.
import { parseArgs, loadConfig, fail } from './lib/cli.js';

const COMMANDS = {
  palette: './brand/palette.js',
  fonts: './brand/fonts.js',
  logos: './brand/logos.js',
  apply: './brand/apply.js',
  board: './brand/board.js',
};

function usage() {
  console.log([
    '',
    '  npm run brand -- <command> [flags]',
    '',
    '  palette  --seed "#hex" --mood balanced|calm|bold|warm|fresh|serious --options 1-3',
    '  fonts    --pairs "Display/Text,Display/Text"   (fontsource family names)',
    '  logos    --dir brand/logo-options --icon-style gradient|solid|night|paper',
    '  apply    --palette N --fonts N --logo <id> --icon-style <s> --icon-scale 0.56',
    '  board    [--screen <capture> --box <box name> | --crop x,y,w,h] [--phone <capture>] [--platform ios|android|web]',
    '',
    '  Order: brief -> palette -> fonts -> apply -> logos -> apply --logo -> board. See brand/README.md.',
    '',
  ].join('\n'));
}

(async () => {
  const cmd = process.argv[2];
  if (!COMMANDS[cmd]) {
    usage();
    if (cmd && cmd !== 'help' && cmd !== '--help') throw new Error(`unknown brand command "${cmd}"`);
    return;
  }
  const flags = parseArgs(process.argv.slice(3));
  const ctx = await loadConfig(flags, { draft: true });
  const { run } = await import(COMMANDS[cmd]);
  await run(flags, ctx);
})().catch(fail);

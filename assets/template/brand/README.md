# Brand

The brand comes first, in both ways in (from screenshots, from a description). Nobody builds a mock
screen or a store image until the client approves `final/brand/brand-board.png` (Mode A's captures of
the real app come first: they are the brand's source). The method is in the skill's `references/brand.md`;
this file holds the file rules and the logo recipes.

```
brand/
  tokens.json        THE brand colours + fonts (written by `npm run brand -- apply`, do not hand-edit)
  logo.svg           lockup: symbol + wordmark (inlined: currentColor, var(--accent), the display font)
  mark.svg           symbol alone (watermark, small sizes, the icon is derived from it)
  icon.svg           store icon artwork, 1024 full-bleed (derived from mark.svg, or drawn by hand)
  theme.css          project CSS overrides for the store images (custom field presets, device tweaks)
  logo-options/      the 2-3 directions shown to the client: <id>.svg, <id>.mark.svg [, <id>.icon.svg]
```

## The five steps

| # | step | command | output | the client sees |
|---|---|---|---|---|
| 1 | brief | fill `briefs/brand-brief.md`, set `brand.name` in `studio.config.js` | name, one-liner, audience, 3 words, seed colour, mood, hero line | - |
| 2 | colours | `npm run brand -- palette [--seed "#hex"] [--mood warm]` | `out/brand/palette/palette-board.png` | 3 palettes on a real store image and app screen, with WCAG checks |
| 3 | fonts | `npm run brand -- fonts --pairs "Poppins/Inter,Newsreader/Inter"` | `out/brand/fonts/font-board.png` | each pair on the top of a store image, specimen, UI card |
|   | apply | `npm run brand -- apply --palette 1 --fonts 1` | `brand/tokens.json` | - |
| 4 | logo + icon | draw `logo-options/`, then `npm run brand -- logos` | `out/brand/logos/logo-board.png` | each lockup on paper, ink, the field, at 16-64 px, as an app icon |
|   | apply | `npm run brand -- apply --logo a [--icon-style gradient]` | `brand/logo.svg`, `mark.svg`, `icon.svg` | - |
| 5 | board | `npm run brand -- board` | `final/brand/brand-board.png` + `logo.png`, `logo-white.png`, `mark.png` | one page to approve |

Until `apply --logo` has chosen a logo for this name, the boards set the name as text in the display face.

Mode A (the app exists): the client's captures are in `raw/<platform>/` first. Write what the brand
already has into the brief, start the palette from its real primary (`--seed`, sampled from a flat
control, never a gradient), skip the logo board if the client has a logo (save it as
`logo-options/client.svg` + `client.mark.svg`, then `npm run brand -- apply --logo client`), and show a
real capture on the board: `npm run brand -- board --screen today --crop x,y,w,h` (or `--box <name>`;
`--phone <capture>` picks the thumbnail's phone, `--platform android` the folder).

Palette moods: `balanced` (default), `calm`, `bold`, `warm`, `fresh`, `serious`. The three options are
always three directions from the same seed: **Drenched** (the seed as a gradient field), **Night**
(near-black field lit by the seed) and **Paper** (warm paper, the seed as ink). Every option is
checked: headline, accent word and sub line on the field, button labels, text on paper, badge text.
The accent is nudged until it reads on the field; a check that still fails is shown in red.

## How a choice reaches every image

```
palettes.json  option N --+
fonts.json     pair N   --+-- npm run brand -- apply --> brand/tokens.json
logo-options/<id>       --+          |                       |
                                     v                       +--> studio.config.js  brand.tokens
                    brand/logo.svg, mark.svg, icon.svg       |      store images, feature graphic, icons
                                                             +--> screens/*.html  <meta name="kit-tokens">
                                                                    mock screens (kit CSS variables)
```

| token | store images (engine) | mock screens (kit) |
|---|---|---|
| `colors.primary secondary deep` | field gradient, shadows | `--brand-primary` ... |
| `colors.accent` | `<em>` word, highlight band, accent badge | `--accent` |
| `colors.ink paper onField` | text on light fields, badges, copy on the field | `--brand-ink` ... |
| `ui.tint tint2 onTint bg` | - | `--tint`, `--tint-2`, `--on-tint`, `--app-bg` |
| `fonts.display` | headlines, badges, the wordmark | `--font-display`, `--font-app` |
| `fonts.text` | sub lines | `--font-text` |
| `field`, `headlineWeight` | field preset, headline weight | - |

Override on purpose, never by accident: a value set in `studio.config.js` (`brand.colors.accent`,
`brand.fonts.display`, `brand.field`) wins over the token, and `apply` lists every override it finds.
In the kit, `screens/app.css` is loaded after the tokens, so it holds only what is specific to the app
(the demo keeps its editorial serif for entry titles there). After any `apply`: `npm run screens`,
then `npm run export`.

## Logo recipes

Draw by hand in SVG, from simple geometry: 2-3 shapes for a symbol, one font for the wordmark.

**Rules for every file**
- `fill="currentColor"` on the root for the main ink; `style="fill: var(--accent, #FFC27A)"` for the
  one accent shape. The same file then works on paper, on ink and on the field.
- A tight `viewBox` with a 4-unit margin; no `transform`, no strokes (draw them as shapes: a stroke
  under 1/12 of the symbol's height disappears at 16 px), no `id`s, and never `--` inside a comment
  (that makes the file invalid XML).
- A `<title>` (the direction's name) and a `<desc>` (one sentence of rationale): the logo board
  prints both.

**1. Letterform monogram** (`logo-options/b.mark.svg`). A heavy capital from rectangles and arcs, the
counters cut with `fill-rule="evenodd"`, one idea placed in a counter:
```svg
<path fill-rule="evenodd" d="M8 0H38A22 22 0 0 1 38 44H42A26 26 0 0 1 42 96H8A8 8 0 0 1 0 88V8A8 8 0 0 1 8 0z
  M22 14V30H38A8 8 0 0 0 38 14zM22 58V82H42A12 12 0 0 0 42 58z"/>               <!-- a B: stem, two bowls -->
<path d="M25 82a10 10 0 0 1 20 0z" style="fill: var(--accent, #FFC27A)"/>    <!-- a sun rising in its lower counter -->
```

**2. Abstract mark** (`logo-options/c.mark.svg`). One familiar silhouette plus one accent shape:
```svg
<path d="M10 0h60a10 10 0 0 1 10 10v90L40 76 0 100V10A10 10 0 0 1 10 0z"/>       <!-- a bookmark -->
<circle cx="40" cy="38" r="17" style="fill: var(--accent, #FFC27A)"/>            <!-- holding a sun -->
```

**3. Symbol + wordmark lockup** (`logo-options/a.svg`). With the symbol H units tall: wordmark
font size about 0.8 H, gap about 0.2 H, baseline near the symbol's bottom, the viewBox wide and deep
enough for the last letter and the descenders:
```svg
<text x="146" y="108" textLength="392" lengthAdjust="spacing"
  style="font-family: var(--font-display, 'Poppins', sans-serif); font-weight: 700; font-size: 80px; letter-spacing: -2px">Brimpage</text>
```
`textLength` pins the width so the lockup never clips; set it to the wordmark's natural width in the
chosen display font. The logo board measures it and warns when it is off by more than 4%, or when
anything is drawn outside the viewBox. Lowercase reads friendlier, title case more formal; weight
600-700 with slightly tight tracking.

**Clear space and minimum size.** Keep a margin of a quarter of the symbol's height around the
lockup; the smallest lockup is 120 px wide, the smallest symbol 16 px (the board shows both).

**The wordmark is live text.** The engine inlines the SVG and loads the display font, so it always
renders right in the store images, and `npm run brand -- board` exports it as `final/brand/logo.png`,
`logo-white.png` and `mark.png` (transparent). Before handing the client an editable vector logo,
convert the text to outlines in a vector editor.

**The app icon** is derived by `apply --logo <id>`: `mark.svg` centred on a 1024 square in the brand
colours (`--icon-style gradient | solid | night | paper`, `--icon-scale 0.56` = symbol width / icon
width). Full-bleed and square: the App Store rounds it and rejects transparency (`npm run icons`
flattens it); Google Play takes a 512 px 32-bit PNG and rounds its corners. Launchers may mask it as
a circle, so keep what matters inside the centre two thirds (the board shows both masks). To draw
the icon yourself, save it as `logo-options/<id>.icon.svg`: `apply` copies it and never overwrites
an icon that was not generated.

# Step 1: Brand

The brand comes first, in both ways in. Nobody builds a screen or a store image until the person approves
`final/brand/brand-board.png`. Why: on the source project, colours and fonts that changed after the
screens existed meant re-capturing every screen and re-rendering every image. One approved board
avoids that.

This page is the method. The project's `brand/README.md` holds the SVG file rules and the logo recipes
(the one copy of them), next to the files you draw.

## The five steps

| # | step | command (from the project root) | the person sees |
|---|---|---|---|
| 1 | brief | fill `briefs/brand-brief.md`, set `brand.name` in `studio.config.js` | nothing yet |
| 2 | colours | `npm run brand -- palette --seed "#6C5CE7" --mood warm` | `out/brand/palette/palette-board.png` |
|   | choose | `npm run brand -- apply --palette 1` | |
| 3 | fonts | `npm run brand -- fonts --pairs "Poppins/Inter,Newsreader/Inter,Space Grotesk/Inter"` | `out/brand/fonts/font-board.png` |
|   | choose | `npm run brand -- apply --fonts 1` | |
| 4 | logo + icon | draw `brand/logo-options/{a,b,c}.svg` + `.mark.svg`, then `npm run brand -- logos` | `out/brand/logos/logo-board.png` |
|   | choose | `npm run brand -- apply --logo a --icon-style gradient` | |
| 5 | board | `npm run brand -- board` | `final/brand/brand-board.png` (approve this) |

`apply` takes any mix of `--palette N --fonts N --logo <id>`, and writes `brand/tokens.json` (the one
source of colours and fonts for the store images AND the mock screens, named after the brief's Name)
plus `brand/logo.svg`, `mark.svg` and `icon.svg`. Read each board image before showing it. Record each
choice in the "Brand decisions" table of the brief, so anyone can rebuild the brand with the same commands.

**Before a logo exists** (steps 2 and 3, or a board before `apply --logo`), every board sets the name as
live text in the display face being judged, with no symbol and no watermark: the font board shows the
client's name in each candidate face. A logo appears once `apply --logo <id>` has chosen one for this
name; tokens made for another name (a template copied without its setup clean-up) never show their logo.

## 1. The brief
Fields the boards read: Name, One-liner, Personality (3 words), Seed colour, Mood, Hero line. Also fill:
Audience, Category, Competitors to stand apart from, Must keep, Avoid, Mode. One line each.
- **Competitors** decide the colour more than taste does: if the category is blue, a calm violet or a
  warm green stands out in search results.
- **Avoid** stops repeat mistakes: "no hearts or brains as symbols", "nothing clinical".

## 2. Colours: three directions from one seed
`palette` works in OKLCH (even lightness steps across hues) and always makes three directions:
- **Drenched:** the seed as a gradient field, white headlines, a warm accent. Loud and friendly.
- **Night:** a near-black field lit by the seed. Premium, focused.
- **Paper:** warm paper with a soft mesh, the seed darkened into ink. Calm, editorial.

Moods tune the chroma and the accent: `balanced` (default), `calm`, `bold`, `warm`, `fresh`, `serious`.
Each option has the engine's colours (`primary`, `secondary`, `deep`, `accent`, `ink`, `paper`,
`onField`), a tint ramp, neutrals and UI tokens for the mock screens.

**Contrast checks** (WCAG ratios, printed on the board, a failing check in red):

| check | needs | why |
|---|---|---|
| Headline on field | 3:1 | large text |
| Accent word on field | 3:1 | the `<em>` word is large text too |
| Sub line on field | 4.5:1 | smaller text |
| Button label on tint | 4.5:1 | mock-screen buttons |
| Tint text on paper | 4.5:1 | links and tinted labels in the app |
| Body text on paper | 4.5:1 | app body text |
| Badge text on accent | 4.5:1 | accent badges |

The accent is nudged lighter or darker until it reads on the field. A light seed (yellow, mint) gets dark
text on the field (`onField`). The colour behind the headline is estimated per field preset, so treat
the ratios as close, not exact, and read the store image itself.

**Mode A: take the colours from the real app.** The client's captures go in `raw/<platform>/` before
this step (Step 2's capture, done first in Mode A). Look in the code first: iOS
`Assets.xcassets/AccentColor.colorset/Contents.json`, Android `res/values/colors.xml` or the Material
theme, Flutter `ThemeData` / `ColorScheme.fromSeed(seedColor: ...)`, web CSS custom properties. Or sample
one pixel of a capture, on a FLAT control filled with the primary (a filled button, the selected tab, a
switch): never a gradient card, a shadow edge or a photo, which give a wrong seed (a gradient card in a
test gave #33845C where the button gave the real #168355):
```bash
node -e "const {PNG}=require('pngjs');const p=PNG.sync.read(require('fs').readFileSync('raw/ios/today.png'));const [x,y]=[150,2250];const i=(p.width*y+x)*4;console.log('#'+[0,1,2].map(k=>p.data[i+k].toString(16).padStart(2,'0')).join(''))"
```
Then `npm run brand -- palette --seed "#hex"` and recommend the option closest to the app.

**One accent colour.** The accent marks the one word that carries the benefit, the highlight band and
accent badges. Never a second accent: two accents fight, and the eye stops knowing where to look.

## 3. Fonts: a display face and a text face
The display face sets the headlines, badges and wordmark (weights 600-800). The text face sets the sub
lines. In the mock screens, iOS uses Inter and Android Roboto for the UI, so the app still looks native;
`--font-app` can carry the display face into titles.

| personality | display | text | install (display) |
|---|---|---|---|
| friendly, warm, consumer | Poppins | Inter | `@fontsource/poppins` (in the template) |
| calm, editorial, reflective | Newsreader | Inter | `@fontsource-variable/newsreader` (in the template) |
| technical, modern, AI | Space Grotesk | Inter | `@fontsource-variable/space-grotesk` (in the template) |
| bold, sporty, energetic | Archivo | Inter | `@fontsource-variable/archivo` |
| playful, young, family | Fredoka | Nunito | `@fontsource-variable/fredoka` + `@fontsource-variable/nunito` |
| premium, fashion, food | DM Serif Display | DM Sans | `@fontsource/dm-serif-display` + `@fontsource-variable/dm-sans` |
| trustworthy, finance, B2B | Manrope | Inter | `@fontsource-variable/manrope` |
| clean, productivity | Plus Jakarta Sans | Inter | `@fontsource-variable/plus-jakarta-sans` |
| warm serif, wellness | Fraunces | Figtree | `@fontsource-variable/fraunces` + `@fontsource-variable/figtree` |
| geometric, crisp | Outfit | Inter | `@fontsource-variable/outfit` |

Other scripts go in `brand.fonts.extra` as fallbacks: Arabic `Noto Sans Arabic Variable` or `Cairo
Variable`, Hebrew `Noto Sans Hebrew Variable`, Japanese `Noto Sans JP Variable`, Hindi `Noto Sans
Devanagari Variable` (each `@fontsource-variable/<slug>`).

`npm run brand -- fonts --pairs "Archivo/Inter"` prints the exact `npm i` line when a family is missing
and shows the pairs that are installed. Only fontsource fonts: they are open-licensed and load from
`node_modules`, so renders never depend on the network. Check the licence of any other font first.

## 4. Logo and icon
Draw 2-3 directions by hand in SVG, from simple geometry: 2-3 shapes for a symbol, one font for the
wordmark. Each direction is `logo-options/<id>.svg` (lockup) and `<id>.mark.svg` (symbol). Three
families work: a letterform monogram (the name's capital with one idea in its counter), an abstract mark
(one familiar silhouette plus one accent shape) and a symbol + wordmark lockup. The file rules (currentColor,
one accent shape, no strokes or transforms, `textLength`, title and desc) and copy-paste recipes are in the
project's `brand/README.md`; `npm run brand -- logos` checks the wordmark width and the viewBox.

**The icon** is derived from the chosen symbol by `apply --logo <id>` (`--icon-style gradient | solid |
night | paper`, `--icon-scale 0.56`). It must work as a full-bleed square that each store masks: keep what
matters in the centre two thirds, no text, no screenshot, no fake notification dot, no black background
(Apple). Sizes and formats: `store-specs.md`; a hand-drawn icon: `brand/README.md`.

Mode A with an existing logo: ask the client for SVG (trace a PNG only as a last resort), save it as
`logo-options/client.svg` + `client.mark.svg`, then `npm run brand -- apply --logo client` (skip the
logo board): `apply` records the choice, so the boards show it.

## 5. The brand board
`npm run brand -- board` puts everything on one page for approval: the lockup on paper and on the
field, the app icon (square, rounded, circle, small), the palette with its contrast scores, the type
pair, a UI card, and a store-image thumbnail made by the real engine. It also exports the brand kit:
`final/brand/logo.png`, `logo-white.png`, `mark.png` (transparent).
- Mode B: the UI card comes from the kit's sample screen dressed in the tokens; the thumbnail's phone shows
  that screen without the card it lifts out (never the same card twice on one image).
- Mode A: show a client capture: `npm run brand -- board --screen today --crop 60,480,1200,700 --platform ios`
  (capture pixels; `--box name` once `raw/ios/today.boxes.json` names it). The thumbnail's phone shows
  another capture (`--phone home`, default: the first other one), so the lifted card is not also in it.

Approval means: the person said yes to this board. Write "approved" in the brief's decision table. A
later change of colour or font goes through `apply` again, then `npm run screens` (Mode B) and
`npm run export`.

## How the tokens reach every image
`brand/tokens.json` -> `studio.config.js` (`brand.tokens`) -> store images, feature graphic, icons;
and -> `screens/*.html` (`<meta name="kit-tokens">`) -> mock screens. A value set in `studio.config.js`
(`brand.colors.accent`, `brand.fonts.display`, `brand.field`) wins over its token, on purpose; `apply`
lists every such override. Never hard-code brand colours in `screens/app.css` or the config.
Preview any palette option on a live image: `/engine/panel.html?panel=1&tokens=out/brand/palette/option-2.tokens.json`.

# Editable projects: live screens, edits.json, SVG and PDF

A project has one of two types, set once at intake in `studio.config.js`:

| | editable (`screens: { mode: 'live' }`) | screenshots (`screens: { mode: 'raster' }`) |
|---|---|---|
| screens come from | the mock screen pages, `screens/<name>.html`, drawn LIVE in every device, lift and tile | PNG captures in `raw/<platform>/` |
| use it for | Mode B: mock screens built with the kit (phones, tablets, web pages) | real captures: Mode A (Simulator, emulator, device, the client's screenshots) and `npm run capture` of a live URL. Required there |
| sharp at `--scale 2` or 3 | always, with no recapture (no `... is upscaled` warning) | only after `npm run screens -- --scale 2` or larger captures |
| Mockup Studio | move and resize, retype headlines, AND edit text and colours inside the screens | move and resize, retype headlines; screen content is fixed |
| `npm run vector` | every screen is real layers: text, shapes, icons | each screen is one embedded image, with layers around it |

A missing `screens.mode` means `'raster'`, so older projects keep working unchanged. The demo is editable;
`examples/raster.config.js` holds the demo's first three images (App Store and Play) as a screenshots project.

**Mixed projects.** An editable project draws every screen that HAS a page live, and every screen without
one (a real capture in `raw/`) from `raw/`, as a picture. So "real app captures + mock web pages" can be
one editable project. When a page and a capture share a name, the page wins.

**Switching type** is the one line in the config; layouts do not change (the live screen uses the
capture's CSS size and the same boxes). A one-off run in the other type: `--screens raster` or
`--screens live` on `render`, `export` and `vector`.

## How live screens work
- A device, lift or tile loads `screens/<name>.html?platform=ios&locale=en` in a frame at the capture's
  CSS size (iOS 440x956, Android 360x800, iPad 1032x1376, web 1440x900) and scales it to fit. The page
  chosen for a name and platform follows the same rules as `npm run screens` (a platform override, the
  shared page, a web page whose `kit-sizes` lists the platform), so a live screen IS the page a capture
  would show.
- Boxes (`data-box`) are measured in the live page by the same code the capture uses, after the kit has
  applied `edits.json`, so a lift shows the edited card.
- The render waits for every live screen (`window.__ready`, fonts, images). One that is not ready after
  30 s is an issue in the render log; the render goes on.
- Pixels match the screenshots path: the repo's parity test renders demo images both ways; the only
  differences are glyph anti-aliasing (a capture lays text out at 3x, a live screen at the image's size).
- **Still run `npm run screens`** after building or changing screens: it prints the box warnings (a card
  under the tab bar, a box cut by the edge), and its captures feed the brand board (`board --screen`) and
  Mockup Studio's Screens list. The renders themselves never need it in an editable project.

## edits.json: changes made inside screens and copy
Mockup Studio writes the person's edits here; Claude may write it too. It sits next to the config, like
`layout.json`: `studio.config.js` -> `edits.json`; `examples/web.config.js` -> `examples/web.edits.json`.
```json
{
  "version": 1,
  "screens": {
    "home": {
      "nav:title":       { "text": { "en": "Good evening, Sam" } },
      "@prompt/p.q:1":   { "color": "accent", "size": 26, "of": "9c1e2a07" },
      "entry":           { "hidden": true },
      "greeting":        { "dx": 0, "dy": -6, "only": "ios" }
    }
  },
  "copy":  { "2": { "headline": { "en": "Write it down in <em>a minute</em>" } }, "feature": { "sub": { "es": "..." } } },
  "stage": { "1": { "4": { "text": { "en": "Yours alone" } } } }
}
```
| key | what it changes |
|---|---|
| `screens.<screen>.<element id>` | one element inside a mock screen: `text` (per locale, plain text), `color` and `bg` (a token name such as `tint`, `accent`, `text-2`, `surface`, `brand-primary`, or `#hex` / `rgb()`; `bg` also `none`), `size` (font size, CSS px), `weight`, `hidden: true` (the space stays, like a hidden layer), `dx` / `dy` (nudge, CSS px), `only: 'ios'` (one platform), `of` (the fingerprint) |
| `copy.<panel>` | a panel's `headline` (`<em>`, `<br>`, `&nbsp;` only) and `sub`, per locale; `copy.feature` is the feature graphic; `stale: { "headline": ["es"] }` = languages not retyped since another one changed in Mockup Studio (validate warns until each is retyped there or kept with "Keep as is"; bake leaves it) |
| `stage.<panel>.<element id>` | the `text` of a badge or a stage `text` element (panel and id as in `layout.json`) |

**Element ids.** `data-id="greeting"` on the element, else its `data-box` name, else an automatic path
from the nearest of those (`@prompt/p.q:1` = the first `p.q` inside the `prompt` box). Chrome the kit
builds has fixed ids: `nav:title`, `nav:subtitle`, `tabs:1`..`tabs:N`, `status:time`, `fab:label`. Ids
are the same on iOS and Android and in every language. Mockup Studio's inspector shows each element's id
under its name; in a page opened from `npm run preview` (`/screens/home.html?platform=ios`) every element
carries it as `data-eid`. Give `data-id` to texts you expect the person to edit: an explicit id always
applies.

**Fingerprints.** `of` records what the element was (its tag, classes, icon and authored words) when the
edit was made. If the screen changes and an automatic id now points at another element, the edit moves to
the one element with that fingerprint ("re-anchored"), or is skipped with a warning, never applied to the
wrong element. A skipped edit prints `warn: edits.json: home › @prompt/div.eyebrow:1 no longer matches
(...): skipped` in the render log, lands in `final/render-report.json` and is listed by `npm run
validate` (in a screenshots project the capture prints it and writes `raw/screens-report.json`).

**Who applies it.** The kit applies screen edits in the page, before every capture and every live
screen; the engine applies copy and stage edits right after the config loads. So renders, captures,
`npm run vector`, exports, validate's copy rules and Mockup Studio all show the same words. A screenshots
project gets screen edits only through a new capture (`npm run screens`). `--edits 0` on `render`,
`export`, `vector` and `screens` runs without the file (to compare).

### Rules for Claude
1. **Read `edits.json` before changing a screen or the copy** (with `layout.json` and `notes.json`). An edit
   wins over the file it overrides: a headline re-typed in the config does nothing while `copy` overrides it.
2. **When you rewrite an element that has an edit, fold the edit in and remove it:** put the words, the token
   colour or the size into `screens/<name>.html` (or the config), then delete that entry from `edits.json`.
   Left behind, an explicit-id edit keeps overriding your change, and an automatic one is skipped with a warning.
3. **Copy edits: `npm run bake`** (`--dry` first) folds headlines, subs and stage texts into `studio.config.js`
   and removes them from `edits.json`, with the same check as for moves. A `stale` marker stays: write the
   other language's new words (the config, or Mockup Studio), then remove that language from the marker.
   Screen edits stay in `edits.json` on purpose: the kit applies them everywhere. Fold one into the HTML by
   hand (rule 2) when the screen is next rewritten, or when the person asks for clean HTML.
4. Colours by token name (`accent`, `tint`, `brand-primary`), not hex, so a later brand change follows.
5. Never test in a project the person has open in Mockup Studio: work on a copy (`workspace.md`).

## Editing in Mockup Studio
In an editable project the person double-clicks a phone, tablet, browser, lift or tile to enter its screen:
a layer tree, click to select, double-click a text to type in place (Enter saves, Esc cancels), colour and
fill swatches from the screen's tokens, font size and weight, nudge with the arrows, hide, reset element or
screen, undo and redo shared with moves. Headlines and sub lines are retyped in place in both types. Every
change lands in `edits.json` at once and shows in every image with that screen. How to use it, and its
limits: `workspace.md`.

## Vector export: SVG for Figma, PDF for print
```bash
npm run vector                                        # every store and language, SVG + PDF
npm run vector -- --store appstore --locale en --panel 1   # one image while you check
npm run export -- --vector                            # the whole export, then the vector files, one Chrome
```
Files: `final/vector/<locale>/<target>/01.svg` + `01.pdf` ..., the feature graphic as
`final/vector/<locale>/playstore/feature-graphic.{svg,pdf}`, and `final/vector/vector-report.json`
(per file: texts, layers, images, fonts, warnings, what was left out). A panorama gives one file per image.
Flags: `--svg-only`, `--pdf-only` (each keeps the other kind's files), `--fonts embed|none`,
`--shadows filter|none`, `--outline-text` (the SVG's text becomes paths), `--config`, `--out`,
`--screens raster|live`, `--edits 0`. `npm run validate` checks `final/vector/`: well-formed SVG with no
`<foreignObject>`, one-page PDFs at the right size, and a warning when a vector file is older than its
PNG (run `npm run vector` again after every change).

**The SVG** (measured on the demo: 17-210 texts per image, 0.2-0.6 MB; 1.0-1.8 MB with real captures, from
`examples/raster.config.js`):
- **No `<foreignObject>`** (Figma drops it): every box, text, icon and image is a plain SVG element.
- **Layers with readable names**, from the element's id: `phone-home`, `screen-home`, `card-streak`,
  `badge-private-default`, `headline`, `text-recent`, `icon-flame`. Figma names imported layers after them.
- **Text stays text**, one `<text>` per line as Chrome wrapped it, fonts embedded as `@font-face` (woff2
  subsets under the names design tools use: "Inter", not "Inter Variable").
- Gradients as SVG gradients, rounded screens and cards as `clipPath`, shadows as the filter pattern Figma
  itself exports (`--shadows none` leaves them out), a box shadow with no fill as a separate shape.
- Real captures (Mode A, or a screen with no page) are embedded PNGs inside the layers.
- **What a clip hides is left out.** A lifted card's layer holds that card only, not the rest of the screen it
  was cut from (no hidden navbar, tab bar or other cards in Figma's layer list or text search), a screen drops
  what lies below its fold, and a raster lift embeds only its card's pixels, not the whole capture again.

**The PDF** is Chrome's own print of the image: vector text and shapes, real selectable text, blurred
shadows as soft masks. Variable fonts (Inter, Newsreader) embed as Type 3 fonts and Poppins as TrueType.

## Into Figma
1. `npm run vector` (or `npm run export -- --vector`).
2. Drag `final/vector/en/appstore/01.svg` onto a Figma canvas. Figma turns an SVG into editable vector
   layers (its help centre: "the SVG is no longer treated as an image"), at the image's size (1320x2868).
3. **Fonts.** Figma does not use fonts embedded in an SVG: it sets each text in its own copy of that
   family. The kit's fonts (Inter, Roboto, Poppins, Newsreader, Space Grotesk, Noto Sans Arabic) are
   Google Fonts Figma has. For a brand font Figma lacks, install it on the computer (the Figma desktop app
   and font installer use local fonts) or export with `--outline-text` (shapes look exact, words are no
   longer editable).
4. Read the import once next to the PNG: shadows, the tile fades and glass bars are where it may differ.
5. It is one way: changes made in Figma never come back to the project. Edits that must reach the store
   images are made in Mockup Studio or in the files.

Figma has no native PDF import (only community plugins): use the PDF in Illustrator, Affinity, Acrobat or
for print, and the SVG in Figma.

## Limits (stated honestly)
| feature | in the SVG | in Figma | in the PDF |
|---|---|---|---|
| text | `<text>` lines, fonts embedded | editable when Figma has the font; lines do not re-wrap by themselves (each line is its own text), and a line can come out slightly longer or shorter where Figma's copy of the font differs | real text; variable fonts as Type 3 |
| gradients, clip paths | SVG gradients, `clipPath` | usually native fills and masks (reported widely; not checked here) | kept |
| drop shadows | Figma's own export filter pattern | not checked here; if Figma does not map it, the shadow is missing | soft image masks |
| `mask-image` (a tile's fade, iOS's scroll edge) | an SVG `<mask>` | may arrive as a plain group, without the fade | kept |
| backdrop blur (glass bars) | left out; the tint stays, so what lies under the bar shows sharp | same | kept |
| grain texture | left out (`feTurbulence`) | same | kept |
| blend modes | kept only as a style | may be ignored | kept |
| blurred inset shadows | left out | same | kept |
| conic and repeating gradients | not converted (a warning) | same | kept |
| real captures | embedded PNG | an image fill | an image |

Each file lists what it left out in `vector-report.json` (`omitted`), and validate prints one note per
kind. Nobody has checked a Figma import of these files yet: before promising Figma files to a client,
import one image and look at it.

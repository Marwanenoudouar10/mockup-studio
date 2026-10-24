# Lessons: what went wrong, and the rule that prevents it

These come from a real client project (a full App Store and Google Play set, two languages, made in code)
and from building and testing this skill. Read this before the first render, and again whenever an image
looks wrong. Add the project's own lessons to the "Project notes" of its `CLAUDE.md`.

## Store files
**Alpha in the PNG**
- **Mistake:** screenshots exported straight from the browser kept an alpha channel. App Store Connect
  rejects alpha; the 1024 icon fails upload with ITMS-90717.
- **Rule:** every render is flattened to 24-bit RGB (`pngjs`), and `validate` fails any alpha. Only the
  Play 512 icon is RGBA, because Play asks for a 32-bit PNG.

**Wrong exact size**
- **Mistake:** an image one pixel off, or resized by an image viewer, is refused.
- **Rule:** render at the exact store size, never resize after. `validate` checks every file.

**Store rules move**
- **Mistake:** the required iPhone slot changed in October 2026 (from the 6.9"/6.5" set to the medium
  Dynamic Island class, 1206x2622).
- **Rule:** check `store-specs.md` against the official pages at the start of each client job.

## Layout
**One design for every size**
- **Mistake:** laying out each store size by hand drifted: a card moved on one size and not the other.
- **Rule:** author on a 1320-wide design canvas and scale by width (k = W / 1320). Every size comes from
  the same numbers.

**9:16 is shorter**
- **Mistake:** the Play canvas (1080x1920, 2347 design units tall) is much shorter than the iPhone one
  (2868). The same copy block left no room for the phone.
- **Rule:** on canvases under 2600 design units the engine uses a tighter copy block (headline 106,
  top 150, gap 100) and scales the stage to the room left: f = min(1.08, room / 1900). Render both
  canvases every time.

**Lifts must stay readable**
- **Mistake:** a whole phone shrunk to fit showed nothing legible at store-thumbnail size.
- **Rule:** lift the card that proves the headline out of the screen at reading size. Name it with a box.

**Crop numbers break**
- **Mistake:** a hand-measured crop no longer matched after the screen layout changed.
- **Rule:** prefer named boxes (`data-box` in mock screens, `<name>.boxes.json` for captures) over crops.

**Bleed by accident**
- **Mistake:** lifted cards and a rotated phone ran off the image edge.
- **Rule:** keep text and key UI 40 design units inside the edges. Bleed only on purpose.

**The same card twice; a callout over its own phone**
- **Mistake:** one image showed the same card in the phone and as a lift; a hero callout hid the card
  the phone was meant to show.
- **Rule:** read every image for duplicates and covered UI. Per-store `y` values fix most of these.

**Feature graphic copy in the cutoff zone**
- **Mistake:** the copy started at x 64, inside the band Google may crop.
- **Rule:** the copy column starts at x 154 (380 px wide), and the page warns when it leaves x 154-872, y 76-424.

## Capture and content
**Debug UI in the shot**
- **Mistake:** warnings, debug banners and a chat bubble appeared in captures and had to be cropped.
- **Rule:** a "screenshots" build flag hides them at the source (`capture.md`).

**Two personas**
- **Mistake:** different names and dates on different screens made the set look like several apps.
- **Rule:** one demo persona, one "today", numbers that add up, the same on iOS and Android.

**A messy status bar**
- **Rule:** 9:41 (iOS) or a fixed time (Android), full signal, Wi-Fi and battery, no carrier, no
  notifications, the same on every image.

**Double camera**
- **Mistake:** a capture that already showed a Dynamic Island got a second one from the frame.
- **Rule:** `island: false` / `camera: false` for such captures; mock screens leave that area empty.

**Long translations**
- **Mistake:** a Spanish date title truncated in the Android editor.
- **Rule:** use the short form a real app would use, and read every language's captures.

## Rendering
**Fixed sleeps**
- **Mistake:** waiting a fixed time before a screenshot was slow when the Mac was idle and too short when
  it was busy (half-loaded fonts).
- **Rule:** never a fixed sleep. Pages wait for fonts, decoded images and an explicit `window.__ready`.

**Many browsers**
- **Mistake:** parallel renders with several Chrome instances made the laptop unusable.
- **Rule:** one Chrome, one reused page, renders in order, closed at the end.

**Silent blanks**
- **Rule:** a missing screen or box draws a magenta placeholder and prints `warn:`. Fix every warning.

**Soft images**
- **Mistake:** a lift drawn larger than its capture looked blurry; the overview sheet was blurry when
  zoomed.
- **Rule:** the upscale check warns; capture larger (`--scale 2`). Sheets render at up to 3840 px, JPEG 94.

## Brand and code
**Invalid SVG**
- **Mistake:** `--` inside an XML comment made the logo fail to parse.
- **Rule:** never `--` in SVG comments. The engine falls back to an image and warns.

**Clipped wordmark**
- **Mistake:** the last letter of the wordmark was cut ("Brimpag").
- **Rule:** `textLength` at the natural width and a viewBox with room; the logo board checks both.

**RTL surprises**
- **Mistake:** an Arabic set shifted the canvas (a dark band down one side) and mirrored the logo text.
- **Rule:** read every RTL render. Stages are not mirrored: place devices yourself.

**CSS that leaks**
- **Mistake:** an unscoped `.hero` class from the web kit broke the brand board's sample card.
- **Rule:** scope page-specific CSS (the web kit lives under `.web`).

**Another brand on the client's boards**
- **Mistake:** a new project kept the template's demo files: the colour and font boards showed the demo's
  lockup, `apply` kept the demo's name in `tokens.json`, and the demo's renders sat in `final/` next to
  the client's set, ready to be zipped.
- **Rule:** the setup removes the demo's renders, captures, screens and brand files; boards set the name
  as text until `apply --logo` chose a logo for this name; `export` removes stale folders, validate warns.

**Demo names are checked**
- **Mistake:** the first demo brand was the name of a real journaling app with the same positioning; a
  later concept passed the exact-name search, but a red-orange running app named "Str...a" read as a copy
  of the category leader.
- **Rule:** search both stores and the web, then compare with the category leaders: no shared prefix or
  ending, never a sound-alike in their colour (`brand.md`). Use reserved domains (`<name>.example`,
  RFC 2606) in browser bars.

**Checks that read the config, not the pixels**
- **Mistake:** a panorama store mixed with normal stores piled every device onto image 1, and the
  "real UI" rule passed because it read the config; a crop past the capture rendered blank bands silently.
- **Rule:** the pages measure what they drew (UI per image, edges, doubles, crop bounds) and the report
  carries it to validate.

**Tests against a live project**
- **Mistake:** the workspace test was run on a project the person had open in Store Studio. Both wrote
  `layout.json`, and the test restores its own backup of that file at the end, which drops any move the
  person made during the run.
- **Rule:** test on a copy of the project, never on one open in the workspace.

**A test that read the disk too early**
- **Mistake:** the workspace test pressed Ctrl+Z as soon as `layout.json` changed on disk, but the page
  records a move for undo only when the server's answer arrives, a moment later. About one run in four
  failed with "timed out waiting for undo".
- **Rule:** wait for the signal the user sees (the "Saved position" toast), not for a side effect.
  Compare redrawn positions with 1 px of tolerance: a redo redraws from the stored (rounded) numbers.
  Read a dragged element only once it stops moving (two equal reads): the frame paints the drag's last
  step after the pointer, so an early read failed the redo check on a busy machine.

## A set that passed every check, then a review
These come from a dark finance concept set: every size exact, validate 0 problems, and still a list of
"must fix" items from a critique. The checklist that catches them is in `design.md` ("The set checklist").

**Green checks, stale pictures**
- **Mistake:** a 1x export after a `--scale 2` one left the overview sheets showing the OLD hi-res copies
  (a removed card, an old date); a cover tile whose `src` did not exist yet rendered as an empty band.
  Validate passed both.
- **Rule:** sheets skip hi-res copies older than the upload images and validate warns about them; a
  missing image is an issue. After any change with hi-res copies around: `export -- --scale 2` (1x and 2x).

**Seams are edges**
- **Mistake:** bridging phones left "pending" and "and transac" on the next image, and a card stopped
  23 units short of a seam; the edge check looked at the outer edges only.
- **Rule:** the render checks seams too (slivers, cards near a seam); judge the strip with `--strip`.

**Small numbers, big doubts**
- **Mistake:** "Ready by Mar 15" for $860 at $40 a week (22 weeks: Mar 29); every card tilted 1-4
  degrees; the same goal ring proved four images.
- **Rule:** re-do the sums and the date sums; straight cards; one proof per image.

**Two brands in one delivery**
- **Mistake:** the brand board's sample used a blue accent and generic habit screens, the store images
  a lime accent and finance screens; the icon was a bright gradient next to near-black screenshots.
- **Rule:** re-render the board from the real captures (`--screen --box`), set the specimen on the field,
  make the icon from the field the screenshots use.

## A bold brief that passed every check, then a review
From a light, sportswear-style fitness concept: sizes, icons and policy all clean, believable data, and
still "a clean premium template, not the campaign the brief asked for". The checklist that catches these
is `design.md` ("The set checklist"); the composition rules are in `layouts.md`.

**Safe is a defect when the brief asked for energy**
- **Mistake:** six images with one build (headline top left, a centred stack), phones at 8 degrees,
  cards at 3, nothing bleeding, small badges.
- **Rule:** match the brief: a bold brief commits on 2-3 images (10-15 degree diagonals, one bleed, a
  stat over its phone's edge, a giant number, a loud badge) and one image moves the copy (`copy: 'bottom'`).

**A giant number cut at the waist**
- **Mistake:** a card across the middle of a "100" left stumps that read "IOO", with the card's own
  "100 kg" right under it.
- **Rule:** the card covers the foot (20-25%) on a diagonal; the numeral bleeds both sides (`type: 'text'`,
  recipe 12); never the same number twice on one axis.

**Phones turn around their feet**
- **Mistake:** a phone tilted 15 degrees swung its top 470 units sideways and cut its status bar and title
  off the left edge; no check said so (devices may bleed).
- **Rule:** devices turn around their bottom centre; past 8 degrees move `x` against the lean by about
  h x sin(r) / 2. The render now warns when a device's top band is cut (`bleed: true` = on purpose).

**One accent, many traps**
- **Mistake:** with accent = primary (one hot colour on bone white) the palette darkened the seed to rust,
  the board printed twin swatches, the icon's and the feature graphic logo's accent halves vanished on
  the red, and the `light` field turned pink at the corners.
- **Rule:** `--look light` (paper field, the seed kept hot), `--icon-style ink` (accent shapes swap by
  themselves), `--swatches`, `--logo-accent` on accent fields (the render warns), `field: 'paper'`.

## Symptom -> cause -> fix
| symptom | likely cause | fix |
|---|---|---|
| App Store upload: "dimensions are wrong" | not an exact accepted size | `validate`; render the target id, never resize |
| ITMS-90717 "Invalid App Store Icon" | alpha in the 1024 icon | use `final/icons/appstore-1024.png` (RGB) |
| Play rejects a screenshot | long side over 2x the short side, or alpha | use the `playstore` target (9:16), never a raw capture |
| magenta box with "missing screen" | no capture under that name for this platform | `npm run screens`, or check `raw/<platform>/<name>.png` |
| `warn: lift: box "x" not found` | box name not in `<name>.boxes.json` | add `data-box="x"` and re-capture, or fix the name |
| lifted card shows the tab bar | the box sits under system chrome | move the card up in the screen; `screens` warns |
| `... is upscaled 1.6x` | a capture smaller than it is drawn | `screens --scale 2`, a bigger device, or a smaller `w` |
| text clipped or tiny on Play only | copy too long for the shorter canvas | shorter headline; per-store `size` or `layout` |
| a card hides UI on Play only | the same `y` on both canvases | `y: { playstore: 200, default: 330 }` |
| a move in the config does nothing | `layout.json` overrides it | edit `layout.json` or `npm run bake` first |
| headline in Arabic shows boxes | the display font has no Arabic letters | `brand.fonts.extra: ['Noto Sans Arabic Variable']` |
| logo shows as a flat image, warning in log | the SVG does not parse (`--` in a comment) | fix the SVG |
| two islands on the iPhone | the capture already has one | `island: false` |
| render hangs, then times out | the page never sets `window.__ready` | read the page error in the log; fix the page |
| `copy appstore ... a ranking word` | "best", "top" in the copy | rewrite (`policy.md`) |
| feature graphic warns about the cutoff zone | copy too wide or tall for 154-872 x 76-424 | shorter line, `feature.copyWidth`, `size` |
| colours differ between screens and images | a hard-coded colour in `app.css` or the config | `npm run brand -- apply`; remove the override |
| render fails "brand.tokens ... not found" | a new project before the brand step | `npm run brand -- apply`, or remove `brand.tokens` |
| the overview sheet is narrow | single wide images limit it | the scale the note names: `npm run export -- --scale 3` |
| `panorama image 2 shows no screen` | normal stores' per-image `x` read as global | `stage: { <panorama store>: [...], default: [...] }` |
| `screen "home" is not localized for "fr"` | no `raw/<platform>/fr/` capture | `npm run screens -- --locale fr`, or capture in French |
| `... is 12 units from the right edge` | a card or badge too close to the edge | move it in, or `bleed: true` when on purpose |
| `lift ... crop has no "android" key` | an iOS pixel crop reused on Android | add `crop.android`, or name a box |
| Chrome not found | no Chrome, Chromium or Edge installed | install Chrome, or `CHROME_PATH=/path/to/chrome` |
| Mac slow during renders | parallel renders or many agents | one command at a time; close other heavy apps |
| the overview sheet shows an older layout | hi-res copies from an earlier `--scale 2` | `npm run export -- --scale 2` (sheets now skip stale copies, validate warns) |
| `image not found: ...` | a tile `src` that does not exist (yet) | fix the path; for a cover from rendered images, export once more |
| `... shows a 130-unit sliver of its screen on image 5` | a bridging device mostly on one side of a seam | bezel only across, or a real share of the screen; `bridge: true` if meant |
| `... is 23 units from the seam at x 2640` | a panorama card placed from `w`, but sizes scale by `f` | move its centre `(w x 1.08) / 2 + 40` from the seam |
| a hi-res panorama has a flat colour band | `mask` / `filter` / `opacity` on a full-strip layer at 2x | per-slice backgrounds in `brand/theme.css` (`layouts.md`, thread) |
| a line chart of big values is flat (older kit) | its y axis started at 0 | update the kit, or `data-min` / `data-max` |
| the iOS navbar turned into a coloured band | app CSS styles a kit class (`.bar`) | rename the app class (reserved names: `mock-screens.md`) |
| dark-app captures came back light | a plain `npm run screens` | `screens: { theme: 'dark' }` in the config, or `data-theme` on each page |
| text cut in half at the bottom of an Android image | the opaque nav bar over a row | end the content above it, or align a row edge with it |
| the watermark reads as dirty rings | a cropped giant mark on a glowing dark field | `brand.watermark` per store, a panel's `watermark: false` |
| the board's field tile is white | (older engine) a per-store `brand.field` object | update the engine; it resolves the field per store now |
| a lifted Android list has square corners | (older kit) the list's own radius is 0 | update; or `data-box-radius` / `radius: { android: 72 }` |
| `... has 33% of its top (status bar, title) cut by the right edge` | a tilted device turns around its bottom centre | move `x` against the lean (h x sin r / 2), or `bleed: true` when meant |
| a badge with `bleed: true` still warns about the edge | (older engine) badges ignored `bleed` | update: `bleed` works on every element |
| `the accent word is 1.00:1 on this field` | a field painted in the accent (one-accent brand) | another field, or `--em` for it in `brand/theme.css` |
| `the logo's accent shapes are 1.00:1 on this field` | the logo's accent half is the field's colour | `--logo-accent: var(--paper)` on that field |
| `the headline and sub line cover 24% of the image` (Play) | a bigger headline (condensed face) plus a sub | `sub: { playstore: '', default: ... }` or a smaller `headlineShort` |
| `npm run screens`: "studio config has no panels" | (older scripts) screens loaded the panels | update; Step 2 needs no panels |
| the font board sits on the template's purple | fonts ran before `apply --palette` | apply the palette first, then `fonts` |
| `apply --logo` replaced a hand-drawn icon | (older apply) | update: it copies `<id>.icon.svg` and keeps it |
| the brand board shows two identical swatches | accent = primary | update (folded into one), or `--swatches "primary:Name,ink,paper"` |
| the same card twice on the brand board | (older board) the thumbnail lifted the Interface card | update; `--lift <capture>#<box>` for another card |
| a light field turns pink at the corners | `light` glows the primary and accent | `field: 'paper'`, or lower `--glow-1` / `--glow-2` |
| a squeezed wordmark on the palette board | (older engine) the palette view skipped the brand fonts | update |
| a white ring on a line chart's end dot on a coloured card | the ring is `--surface` | `data-ring` or `--chart-ring` = the card's colour |
| an avatar stack reads "TI M PI" | (older kit) a fixed -10px overlap | update: the overlap scales with the size |
| one screen's CSS restyles every other screen | every `css/<part>.css` loads on every screen | prefix each rule with the screen's own class |
| the overview sheet's background reads lilac | (older default) a fixed cool grey | update (the paper a step darker), or `sheet.background` |

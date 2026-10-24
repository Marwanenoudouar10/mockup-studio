# Art direction: a set that sells

The store images are an ad that people scroll past in a second. Most people never open the product
page: they see the first one to three images in search results and decide there. Every rule below
serves that second.

## The story of a set
- **Image 1 is the hero.** It sells the whole app in one line: what it is and why it matters. Logo on
  top, the strongest screen, two or three proof cards around it.
- **Images 2 to 4 are the top features**, one per image, in the order a new user cares about them.
- **The last image is trust:** privacy, sync across devices, offline, accessibility, a real named
  testimonial or press quote (never "#1" or an award; see `policy.md`).
- **The first three do most of the work.** Put the best screens there. On Play, they must show real UI.
- **5 images** is a good default: hero, three features, trust. 3 still tells a story; 8 is Play's maximum.

| # | role | headline pattern | proof on the image |
|---|---|---|---|
| 1 | hero | the core promise | the main screen in a phone + 2-3 lifted cards + logo |
| 2 | feature A | verb + benefit | the screen that does it + its key card at reading size |
| 3 | feature B | outcome the user sees | a result screen (chart, map, summary) |
| 4 | feature C | the habit or the ease | a flow, a reminder, a widget |
| 5 | trust | what the user can rely on | a settings or privacy screen + a badge |

## One idea per image
- **One benefit per headline,** in the user's words: "Write it down in seconds", not "Fast entry editor".
- **Headline: 3 lines at most, about 6 words or fewer** where the language allows. One `<em>` accent
  word, on the word that carries the benefit.
- **Sub line: optional, 2 lines at most.** It explains how, or adds the detail the headline left out.
- The image under the headline must prove it: the screen that does what the headline says.
- If the headline needs "and", it is two images.

## Real UI at reading size
- A whole phone at store-thumbnail size is too small to read. Lift the one card that proves the
  headline (`type: 'lift'`) out of the screen at reading size, and let the phone show the context.
- A rule of thumb for the proof card of a feature image: draw it at half its capture width or more
  (`w` in stage units >= 0.5 x the card's width in capture pixels). Its body text then stays about 20 px
  or taller on the 1320 px image. The hero's orbit cards can be smaller: they support, the phone leads.
- Never shrink a whole phone to fit more. Fewer, bigger elements read better.
- Never the same card twice on one image (the render warns), and never a card that covers the part of
  the phone it belongs to or the proof (amounts, progress) the headline promises.
- **One proof, one image.** A card or screen that proves image 4 is not also the hero's lift, a fan's
  side phone and the feature graphic's card: repeats make the app look like it has fewer features.

## Contrast and colour
- Headline on the field: 3:1 at least, 4.5:1 for the sub line (the palette board checks it).
- **One accent colour** for the accent word, the highlight band and accent badges. Never a second accent.
- The field (background) is the same preset on every image of a set. A light field for one image and a
  dark one for the next breaks the set into strangers. A deliberate exception (a dark-mode image) uses
  the same layout grid.
- Shadows are soft and the same direction everywhere (the engine's callout shadows are).

## Consistency across the set
- The same copy position, size and alignment on every image. The engine does this; do not override
  `layout` per panel without a reason. One deliberate break (`copy: 'bottom'` on the image that leads
  with a picture or a number) gives the row rhythm; two or three look undecided.
- Alternate the composition from image to image (straight phone, tilted phone, tile + phone, cards),
  so the row has rhythm, but keep the same scale of devices.
- The same persona, date and data in every screen (`capture.md`, `mock-screens.md`).
- The same status bar time on every image.
- Check the set as a row: `npm run sheet`, then read `final/<locale>/overview-<store>.jpg` at full size
  and at thumbnail size. A set reads well when each image is clear alone AND the row looks like one family.

## Both canvases
The same stage serves the tall iPhone canvas (1320x2868) and the shorter 9:16 Play canvas (1080x1920).
On 9:16 the copy block is tighter and the stage is scaled down to fit the room left. Always render both
before calling a layout done. Use variants for the few values that differ: `y: { playstore: 200, default: 330 }`.

## Bleed and margins
- Keep text and important UI 40 design units or more from the image edges. Every render checks the lifts,
  badges and the copy and warns (`lift "streak" (insights) is 12 units from the right edge`).
- A device or tile cut by the edge is fine when it is on purpose (a fan, a big straight phone). A card cut
  on purpose says so with `bleed: true`. A cut headline, a cut button label or a card cut by accident is
  a defect.
- In a panorama, every seam is an image edge too (`layouts.md`, "Seams"); the render checks both.
- In the feature graphic, keep the logo, name and slogan inside x 154-872, y 76-424 (`policy.md`); the
  check measures the logo too, which drops its optical overhang there.

## Localization
- **Lengths:** compared with English, Spanish runs about 20-25% longer, French 15-20%, German 30% or
  more, Italian and Portuguese about 20%. Japanese and Chinese are shorter but need their own font.
- The engine shrinks a headline to fit 3 lines, so nothing clips. But a smaller headline reads worse:
  rewrite long translations shorter instead of trusting the shrink.
- Use `&nbsp;` to keep a phrase together ("one&nbsp;page") and `<br>` for a deliberate break.
- Translations come from a native speaker or are checked by one. Keep the `<em>` on the benefit word.
- Screens must be localized too: mock screens through `strings.json`, real captures by switching the
  app's language. An English screen under a Spanish headline looks unfinished. The render warns for every
  screen that falls back to the default language's capture and for every line with no text in a locale
  (or one plain string in a multi-language config); validate lists both and `--strict` fails on them.

## Right to left (Arabic, Hebrew, Persian, Urdu)
- The copy block, the brush and the feature graphic mirror by themselves. **Panel stages are not
  mirrored:** place the devices and cards yourself (usually the mirror image of the LTR stage).
- Add a font with the script: `brand.fonts.extra: ['Noto Sans Arabic Variable']`. Most display fonts
  have no Arabic letters.
- The brush and highlight offsets are tuned for Poppins-like fonts: read the RTL images; the highlight
  can sit a little high on Arabic text. `examples/rtl.config.js` is a working starting point.

## Light, dark and the device frames
- One theme per set, matching what most users see. A dark-mode image is a feature image of its own.
- **The watermark on a dark field:** the giant mark is cropped by the canvas edge, and over strong glows
  the field left between its arcs reads as "murky rings and wedges", not a motif. Read it at 25%; turn it
  off where it does not read (`brand.watermark: { playstore: false, default: true }`, a panel's
  `watermark: false`, `feature.watermark: true` to keep it only on the feature graphic).
- The frames draw a Dynamic Island (iPhone) and a punch-hole camera (Android). Screens must leave those
  areas empty; captures that already show them need `island: false` / `camera: false`.

## Sharpness
Store uploads keep their EXACT sizes (the App Store rejects anything else). Sharpness comes from never
drawing a raster image larger than its pixels, and from separate hi-res copies for portfolios.
- **The upscale check.** Every render checks every screen it draws. A line such as
  `lift "streak" (insights) is upscaled 1.6x` means that card is soft. The finding goes to
  `final/render-report.json`, and `npm run validate` lists it (`--strict` fails on it).
- **The fix:** capture larger (`npm run screens -- --scale 2`, `npm run capture -- --scale 2`, or a larger
  device), or draw the element smaller. A lift of a small card at a big `w` is the usual cause.
- **Hi-res portfolio copies:** `npm run export -- --scale 2` (or 3) also renders every image at 2x/3x
  into `final/portfolio/<locale>/<target>/`, never mixed with the upload folders. An iPhone image at 3x
  is 3960x8604. Capture the screens at the same scale first, or the copies will warn.
- **Overview sheets** come out up to 3840 px wide as JPEG quality 94 (`--png` for lossless), at the
  sharpest pixel ratio that never upscales an image. Single wide images (og, portfolio) make narrower
  sheets unless `--scale 2` copies exist.
- **`playstore-4k`** (2160x3840) is a crisper Play set under the same rules; upload it OR `playstore`.
- Fonts, gradients and frames are vector: they are always sharp at any scale.

## The feature graphic
- One line of copy (the hero line or a shorter one), the logo, and devices or cards in the right third.
- Copy inside the safe zone (the engine's default), vivid field colour, no device imagery if the client
  wants to be featured (use lifts or a tile instead).
- It shows small and wide: 3 to 6 words, nothing smaller than 20 px.
- It is never the plainest asset of the set: one bold diagonal (a dark card and a big-number card at -8
  to -10 degrees, overlapping on purpose) beats two modest cards on a flat field (`layouts.md`).

## Read every image like a stranger
Before calling an image done, read it at full size and at 25%:
1. In one second, what is this app? (image 1 only)
2. What does this image promise, and does the screen under it prove it?
3. Can you read the lifted card at 25%?
4. Is anything cut, covered, doubled, misspelled or untranslated?
5. Does it look like the other images of the set?

## The set checklist (what reviewers found on sets that passed every check)
Validate passing means the files are legal, not that the set is good. Before delivery, tick each line:
- **Hero corner:** no more than three layers overlap anywhere on image 1; no glass badge on live UI.
- **Energy fits the brief:** a calm brief keeps cards straight (a fan, one accent card per image); a bold,
  sport or campaign brief commits on two or three images (10-15 degree phones on opposing diagonals, one
  bleeding off an edge, a stat over its phone's edge, a giant number, a loud badge: `layouts.md`). At
  least one image breaks the "headline top left, stack below" build (`copy: 'bottom'`).
- **Contact:** cards 24+ units apart or overlapping 60+ on purpose (read the 9:16 render: stacks tighten
  there); devices 60+ units inside an edge or bleeding 10-15% on purpose; no device top (status bar,
  title) cut by an edge, no lone badge in empty field; no lift or badge that slices a text line of the
  phone under it ("6 of 28 km" left as "6 o": cover a whole line or none; no check measures this yet).
- **Proof:** every image's proof card is visible, uncovered and not repeated elsewhere in the set; the
  sub line promises only what a card on that image shows ("...and what it means for the next run" needs
  a card that says it: Apple 2.3.1).
- **Giant numbers** read whole at sheet size: a card covers the foot, never the waist, and never repeats
  the same number right under it.
- **Arithmetic:** donut slices add up to the total, budgets left add up, "ready by" dates match the
  weekly amount times the weeks, paces match distance and time, projections match the days gone, every
  count matches what is listed ("6 friends" with five rows plus You is wrong). A sharp client checks.
- **Both platforms:** the same data on iOS and Android (avatar stacks, counts, labels); no row sliced in
  half by Android's opaque nav bar; no frameless window that starts with a status bar.
- **Finished screens:** no orphan heading or link above the tab bar with nothing under it.
- **Rhythm:** no dead band of 250+ units over or under the stage; cards as big as the room allows.
- **Panorama:** read the uncut strip (`render --strip`); no text slivers across seams; the thread is a
  hero element or absent.
- **One brand everywhere:** the brand board, the cover and the icon use the delivered accent and the
  delivered screens (re-render the board from the real captures; `brand.md`); the board shows only the
  real colours (`--swatches`), each card once, and the reversed lockup where the set really uses it.
- **The feature graphic** is not the plainest asset: one bold diagonal, a big number, no context-free
  sliver of a card; the accent word and the logo's accent shapes read on its field.
- **The cover:** fans the strongest images (hero in front, the most distinctive two behind) with every
  headline readable; shows what its sub line claims (both stores, or say which), a strip flush.
- **The name** (a concept or portfolio brand) shares no prefix, ending or signature colour with the
  category leader (`brand.md`, the name check).

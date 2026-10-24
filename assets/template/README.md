# Store screenshots studio (template)

App Store and Google Play screenshot sets, the Play feature graphic and both store icons, plus web,
social and desktop images (Open Graph, X, LinkedIn, Product Hunt, Chrome Web Store, Mac App Store,
landing-page heroes, portfolio covers), built from HTML/CSS and rendered by your installed Chrome.
One file to edit: `studio.config.js`. The demo is "Brimpage", an invented journaling app with a small
web app (its site is the reserved `brimpage.example`): replace its brand, screens and copy.

## Start a project
```bash
mkdir -p ~/store-projects && cp -R ~/.claude/skills/store-screenshots/assets/template ~/store-projects/my-app
cd ~/store-projects/my-app
rm -rf node_modules final out raw layout.json notes.json   # leftovers, if the skill folder was used to test
npm install                    # Node 18+. Uses your Chrome/Chromium/Edge (CHROME_PATH=... to override);
                               # its audit notes are in unused download code (the skill README, "What you need")
npm run screens && npm run export   # the demo: captures -> final/ (render, feature, icons, validate, sheets)
# then start clean, so no demo file reaches a client (SKILL.md "Set up the project"):
rm -rf final out raw screens/web brand/logo-options brand/logo.svg brand/mark.svg brand/icon.svg brand/tokens.json
find screens -maxdepth 1 -name '*.html' -delete && echo '{}' > screens/strings.json
mv CLAUDE.template.md CLAUDE.md
npm run preview                # live gallery: edit studio.config.js, reload the page
```
The skill's `SKILL.md` and `references/` explain the method; this file is the config reference (keys,
elements, flags). The demo ships no captures: `npm run screens` makes them from `screens/`.

## The order (both ways in)
0. **Intake**: the answers (mode, targets, languages, images, brand, look, tone) go into
   `briefs/brand-brief.md`, `briefs/copy.md` and `studio.config.js` (`locales`, `stores`, `panels`).
1. **Brand first**: `briefs/brand-brief.md`, then `npm run brand -- palette`, `fonts`, `apply`,
   `logos`, `apply --logo`, `board` -> `final/brand/brand-board.png` for approval (`brand/README.md`).
2. **Screens**: Mode A, from screenshots: `briefs/capture-plan.md` -> `raw/<platform>/`
   (websites: `npm run capture -- --url https://...`). Mode B, from a description:
   `briefs/app-spec.md` -> `screens/<name>.html` (web pages: `screens/web/<name>.html`) -> `npm run screens`.
3. **Story and copy**: `briefs/copy.md`, one benefit per image.
4. **Layout**: one `panels[]` entry per image in `studio.config.js`.
5. **Render**: `npm run export`.  6. **Look and fix**: read every image.
7. **Validate**: `npm run validate` exits 0.  8. **Deliver**: the `final/` folders, overview sheets first.

## Folder map
```
studio.config.js     brand, locales, stores, panels, feature graphic, icon, sheet  (the only file you edit)
layout.json          moves made in Store Studio (applied after the config); notes.json: notes for Claude
briefs/              brand-brief.md, app-spec.md (Mode B), capture-plan.md (Mode A), copy.md
brand/               tokens.json (colours + fonts, from npm run brand -- apply), logo.svg (inlined,
                     currentColor), mark.svg (watermark), icon.svg (store icon), theme.css, logo-options/
raw/ios/ raw/android/ raw/ipad/ raw/web/   captures: <name>.png (+ <name>.boxes.json); per locale raw/ios/de/
                     (the demo's come from npm run screens; served to the pages with a listing, raw/index.json)
screens/             mock screens: <name>.html (phones) + web/<name>.html (desktop pages) + kit/ -> raw/
examples/            panorama.config.js (devices bridging images), rtl.config.js (Arabic, light field),
                     web.config.js (web-only: X, LinkedIn, Chrome Web Store, Mac App Store, hero, square)
engine/              runs in Chrome: panel, feature, icon, gallery pages; layout/ elements/ devices/ ornaments/
                     styles/; brand/ (the brand boards)
scripts/             runs in Node: brand, render, feature, icons, validate, sheet, preview, export, screens,
                     capture; brand/ (palette, fonts, logos, apply, board + lib/), lib/ (stores.js, targets.js ...)
final/               output (git-ignored): <locale>/<target>/, portfolio/ (hi-res), icons/, brand/,
                     render-report.json         out/brand/  option boards      out/qa/  scratch renders
                     out/bake/  config backups from npm run bake
```

## Commands
| command | what it does |
|---|---|
| `npm run brand -- <step>` | the brand step: `palette`, `fonts`, `logos`, `apply`, `board` (see `brand/README.md`) |
| `npm run screens` | `screens/<name>.html` -> `raw/ios/` + `raw/android/`, `screens/web/<name>.html` -> `raw/web/` (and the sizes in its `kit-sizes`), `<name>.png` + `<name>.boxes.json` from `data-box` |
| `npm run capture` | Mode A for websites: a live URL -> `raw/web/<name>.png` (+ `--mobile`, `--tablet`, `--full`) |
| `npm run render` | `final/<locale>/<store>/01.png ...` (24-bit RGB, no alpha) |
| `npm run feature` | `final/<locale>/playstore/feature-graphic.png` (1024x500) |
| `npm run icons` | `final/icons/appstore-1024.png` (RGB) + `final/icons/playstore-512.png` (RGBA) |
| `npm run validate` | checks every file in `final/` against the target rules (size, 24-bit, alpha, bytes, counts), the render report (soft screens, cut or doubled cards, bad crops, screens not localized), untranslated copy, stale folders and the store content rules (copy words, real UI measured on the renders); exits 1 on a problem |
| `npm run sheet` | `final/<locale>/overview-<store>.jpg`, up to 3840 px wide, JPEG quality 94 (`--png` too) |
| `npm run preview` | serves the project, prints the live gallery URL |
| `npm run export` | removes stale output (a locale or target no longer in the config), then render + feature + icons (+ portfolio with `--scale`) + validate + sheet with one Chrome |
| `npm run bake` | folds `layout.json` (moves made in Store Studio) into `studio.config.js`, then empties it (`--dry` to check first) |

Flags (after `--`, e.g. `npm run render -- --store playstore --panel 2`; `--key=value` works too):
`--store a,b` `--locale en,de` `--out dir` `--config file`;
`--panel N` (render only): N is the CONFIG panel number (its position in `panels`, the number `layout.json`
uses), not a target's image number: og shows one image, e.g. panel 6, so `--store og --panel 6` (a note
says which panels a target shows when N is not one of them);
`--config other.js` without `--out` writes to `out/qa/<name>/`, never into `final/`;
`--scale 2|3` (render, feature, export: the hi-res portfolio copies); `--strict` (validate, export: warnings fail);
`--png` (sheet); screens: `--platform ios,web` (web also captures each page's kit-sizes) `--screen home`
`--locale de|all` `--theme dark` `--scale 2`; capture: see "Websites" below; preview: `--port 5178`.

## Targets
Phone stores (portrait layout):

| id | size | screens | frame | count |
|---|---|---|---|---|
| `appstore-6.3` | 1206x2622 (iPhone 6.3", the slot App Store Connect requires) | raw/ios | iphone | 1-10 |
| `appstore` | 1320x2868 (iPhone 6.9", optional, the sharpest) | raw/ios | iphone | 1-10 |
| `appstore-6.5` | 1284x2778 (iPhone 6.5", optional) | raw/ios | iphone | 1-10 |
| `ipad-13` | 2064x2752 (iPad 13") | raw/ipad | ipad | 1-10 |
| `playstore` | 1080x1920 (9:16 phone) | raw/android | pixel | 2-8 |
| `playstore-4k` | 2160x3840 (same Play rules, max side 3840) | raw/android | pixel | 2-8 |

Web, social and desktop targets (wide layout; every rule and source URL in `scripts/lib/targets.js`):

| id | size | rule | count |
|---|---|---|---|
| `og` | 1200x630 | recommended, 8 MB max | 1 |
| `x-card` | 1200x600 (2:1 summary_large_image) | recommended, 5 MB max | 1 |
| `x` | 1600x900 (16:9 image post) | recommended, 5 MB max | 1-4 |
| `linkedin` | 1200x627 (1.91:1) | recommended | 1 |
| `square` / `portrait` | 1080x1080 / 1080x1350 (4:5) | recommended | 1-10 |
| `producthunt` | 1270x760 gallery | recommended | 2-8 |
| `chrome-webstore` | 1280x800 (or 640x400) | required | 1-5 |
| `chrome-promo` / `chrome-marquee` | 440x280 / 1400x560 | required | 1 |
| `mac-appstore` | 2880x1800 (also 2560x1600, 1440x900, 1280x800; 16:10) | required | 1-10 |
| `web-hero` / `web-hero-wide` | 2880x1800 (16:10) / 2560x1440 (16:9) | our default | 1-10 |
| `portfolio` | 1600x1200 (4:3 Upwork / Dribbble / Behance cover) | recommended, 10 MB max | 1-10 |

Upload `appstore-6.3` and `appstore`; App Store Connect scales them down for the smaller iPhones.
Object form: `{ id: 'appstore', panorama: true }`, `{ id: 'mac-appstore', screens: 'web' }` (a web app's
captures in Mac frames); a custom target: `{ id: 'banner', size: [1500, 500], platform: 'web' }` (wide when
W > H). Keep each store's own UI: never iPhone frames or iOS screens on Google Play (`policy.md`).

## Panels and elements
Each panel = one image: `{ headline, sub?, logo?, align?, field?, ornament?, gap?, lines?, stage: [...] }`.
The stage is 1320 x 1900 design units hung under the copy and scaled to the room left.
`x` = centre, `y` = top edge, `w`/`h` = size, `r` = rotation (deg), `z` = stacking order.
```js
{ type: 'phone', screen: 'home', w: 700, x: 660, y: 30, r: 0, z: 20, device: 'pixel', island: false, camera: false }
{ type: 'lift',  screen: 'entry', box: 'photo', w: 460, x: 300, y: 800, r: -5, z: 32 }       // box from entry.boxes.json
{ type: 'lift',  screen: 'home', crop: { ios: [60, 726, 1200, 532], android: [40, 538, 1000, 423] }, w: 820, x: 540, y: 1010 }
{ type: 'lift',  screen: 'home', box: 'mood', w: 680, x: 1100, y: 1150, bleed: true }        // cut by the edge on purpose
{ type: 'tile',  screen: 'insights', w: 840, h: 1240, x: 490, y: 0, r: -3, radius: 70, pos: 'top', fade: false }
{ type: 'tile',  src: 'brand/photo.jpg', w: 1000, h: 1400, x: 560, y: 0, fit: 'cover', shadow: false }
{ type: 'badge', text: { en: 'Works offline', de: 'Funktioniert offline' }, icon: 'offline', x: 330, y: 1340, style: 'solid' }
```
Badge icons: check lock star heart bolt cloud shield flame bell clock sparkle leaf offline (or an image path).
Badge styles: solid, glass, accent, dark.
A pixel `crop` belongs to one capture: give every platform its own key (a missing key or a crop outside the
capture draws the magenta placeholder and an issue). Lifts, badges and the copy keep 40 design units from
the edges; `bleed: true` on a lift or badge says the cut is on purpose. Devices and tiles may bleed.

Any text can be per locale (`{ en, de }`); any value can vary by store or platform
(`w: { playstore: 640, default: 720 }`, `stage: { playstore: [...], default: [...] }`).
Headlines take `<em>` (accent word or highlight band), `<br>` and `&nbsp;`; they shrink to fit
`layout.maxLines` (3) so long translations never clip. RTL locales (ar, he, fa, ur...) mirror the copy.

## Feature graphic
`feature: { headline, sub?, logo?, stage: [...] }` renders `final/<locale>/playstore/feature-graphic.png`
(1024x500). Stage coordinates are plain pixels of that image. Optional keys: `platform` (`android`, the
captures used), `device`, `side` (copy inset, 154), `copyWidth` (380), `size` (headline, 54), `subSize`
(22), `logoWidth` (190), `maxLines` (4), `nudge` (moves the copy down), `field`, `ornament`, `align`.
Google may crop about 15% per side: the defaults keep the copy inside x 154-534, and the page warns
(`feature graphic: the copy crosses the ... cutoff zone`) when the copy leaves x 154-872, y 76-424.
RTL locales mirror the whole graphic.

## How screens are found
A screen NAME resolves, first hit wins: `raw/<platform>/<locale>/<name>.png` ->
`raw/<platform>/<name>.png` -> the same two in the other platform (drawn in that platform's frame,
with a warning). `.jpg`/`.webp` work too; a value with a `/` or `.` is a path from the project root.
`<name>.boxes.json` next to the file found holds named crops in capture pixels:
`{ "photo": { "x": 40, "y": 1240, "w": 1000, "h": 750, "r": 45 } }` (or `[x, y, w, h]`).
`npm run screens` writes it from every `data-box="name"` element of a mock screen (a card in a grid or
flex row at its own content height, not the height the row stretched it to; `data-box-fit="cell"` keeps
the cell). A missing screen, box or platform crop, or a crop outside the capture, renders a magenta
placeholder and prints a warning, never a silent blank. A locale other than the default that has no
`raw/<platform>/<locale>/<name>.png` warns `screen ... is not localized` (validate lists it).

## Brand
`brand.tokens: 'brand/tokens.json'` brings in the colours and fonts chosen in the brand step; the
same file dresses the mock screens (`<meta name="kit-tokens" content="/brand/tokens.json">`), so one
`npm run brand -- apply` changes both. A value set in `brand` wins over its token.
The colours (primary, secondary, deep, accent, ink, paper, onField) drive every field preset:
`gradient` (default), `solid`, `light`, `dark`, `mesh`, or your own `.canvas.field-<name>` in
`brand/theme.css`. `brand.fonts` takes fontsource family names (`npm i @fontsource/<name>` or
`@fontsource-variable/<name>`); `extra` adds fallbacks for other scripts. `ornament`: brush,
highlight, none. `watermark`: the giant faint mark (true, false or `{ src, opacity }`).
Preview any token file on the live panels: `/engine/panel.html?panel=1&tokens=out/brand/palette/option-2.tokens.json`.

## Panorama
`{ id: 'appstore', panorama: true }` renders all panels on one wide strip with one continuous
field and cuts it into the images. Stage `x` is then GLOBAL (0..N x 1320, `x: 1320` = first seam),
so a device can bridge two images. See `examples/panorama.config.js`.
When only some stores are panoramas, the same panels serve both: give each panel a per-store stage,
`stage: { playstore: [ ...x from (n-1) x 1320 to n x 1320... ], default: [ ...x from 0 to 1320... ] }`.
Without it every device piles onto image 1; the render warns `panorama image 2 shows no screen`.

## Store Studio: preview and drag (layout.json)
The skill ships a local workspace app, Store Studio (`~/.claude/skills/store-screenshots/workspace/`),
that shows every image of every project live on one canvas (App Store, Google Play + feature graphic, web
targets, the brand board). There you can drag, rotate and resize stage elements, nudge them with the arrow
keys, drop a capture onto an image, and pin a note for Claude. Text, colours and new layouts are still
changed by Claude in the project files; the board refreshes by itself within a second when they change.
```bash
cd ~/.claude/skills/store-screenshots/workspace && npm install && npm start -- ~/store-projects/my-app   # prints the URL
```
Every move is saved to `layout.json` in the project root. The pages apply it right after the config is
resolved, for the live preview and for every render, so `final/` matches what the workspace shows:
```json
{
  "*":        { "1": { "2": { "x": 1010, "y": 410, "r": 4 } } },
  "appstore": { "1": { "2": { "x": 980, "of": "lift:insights:streak" } } },
  "feature":  { "1": { "3": { "x": 800 } } },
  "add": [ { "id": "add-1", "store": "appstore", "panel": 2, "type": "phone", "screen": "entry", "w": 560, "x": 980, "y": 260, "z": 50 } ]
}
```
- Keys: a store id or `"*"` (every store; the store's own entry wins), then the **panel** number (its position
  in `panels`, 1-based; the feature graphic is `"feature"` / `"1"`), then the **element id**: its `id` in the
  config, else its 1-based position in that `stage` array (counted before store or locale variants drop any).
- Values are config units: `x`, `y`, `w`, `h` (stage units), `r` (degrees), `z`, `radius`, `size` (badge text).
- `of` is the element's fingerprint (`type:screen:box`). If the stage was reordered and that id now points at
  something else, the override is skipped with a warning instead of moving the wrong element. Give elements an
  explicit `id: 'hero'` when you plan to reorder a stage that has overrides.
- `add` holds elements added in the workspace (a capture dropped onto an image); `"store": "*"` = every store.
- `/engine/panel.html?...&layout=0` shows the config alone. Another config file has its own file:
  `examples/web.config.js` -> `examples/web.layout.json`.
- `npm run bake` writes the moves into `studio.config.js` (numbers changed in place, comments and formatting
  kept; a per-store move becomes `{ appstore: 980, default: 1000 }`; added elements are appended with their id),
  checks that every element of every store and locale lands exactly where it did, keeps a backup in
  `out/bake/`, and empties `layout.json`. Anything it cannot write safely stays in `layout.json` and is listed.
- `notes.json` holds the notes pinned in the workspace:
  `{ "notes": [{ "id", "store", "panel", "locale", "element", "x", "y", "text", "done", "created" }] }`
  (`x`, `y` = position on the image, 0..1).

## Wide layout (web, social, desktop targets)
Wide targets use their own design space: a canvas 1200 units HIGH (`og` is 2286 x 1200 units, 16:10 is
1920, 4:3 is 1600, a square 1200), scaled to the image like the phone canvas. Two compositions:
`side` (copy column on the left, right in RTL, vertically centred; the stage beside it) and `stack`
(copy centred on top, the stage under it). `mode: 'auto'` picks side from W/H >= 1.5, so og, X,
LinkedIn, Product Hunt, Chrome and Mac images go side by side; portfolio covers, squares and 4:5 stack.
The stage is a 1600 x 1200 box (`x` = centre, `y` = top edge), scaled to the room and centred in it.
Panels say which layout they belong to and, optionally, which targets show them:
```js
{
  space: 'landscape',                 // 'portrait' (phone stores, the default) | 'landscape' | 'any'
  only: ['og', 'producthunt'],        // optional; og takes one image, so name the panel you want there
  mode: 'side',                       // optional: side | stack (default: auto); also copyWidth, size, zoom, gap, nudge
  logo: true,
  headline: { en: 'Your journal, now on the <em>web</em>' },
  sub: 'Write on any screen. Pick up where you left off.',
  stage: [
    { type: 'browser', screen: 'journal', url: 'brimpage.example/journal', title: 'Journal', w: 1500, x: 880, y: 150 },
    { type: 'lift', screen: 'journal', box: 'prompt', w: 500, x: 230, y: 760, r: -4, z: 30 },
  ],
}
```
A panel used everywhere can switch stages by space: `space: 'any', stage: { portrait: [...], landscape: [...] }`.
Tuning for every wide image: `layout: { wide: { headline: 96, sub: 38, copyWidth: 0.36, stageW: 1600, stageH: 1200 } }`
(the defaults).

## Devices
All drawn in CSS (no images, no trademarks), `w` = SCREEN width in stage units:
`iphone`, `pixel`, `ipad` (phones and tablet), `browser` (window with traffic lights, a tab and an address bar
showing the real domain; `theme: 'dark'`, `style: 'compact'` for a one-row bar), `laptop` (aluminium lid, hinge,
base; `finish: 'graphite'`), `monitor` (display on a stand). `url` on a laptop or monitor adds the browser bar;
on a phone or tablet it adds the mobile browser UI (status bar + address pill).
```js
{ type: 'browser', screen: 'dashboard', url: 'app.example/insights', theme: 'dark', w: 1400, x: 820, y: 160 }
{ type: 'laptop',  screen: 'journal', url: 'brimpage.example', w: 1120, x: 640, y: 150, z: 10 }    // responsive trio:
{ type: 'tablet',  screen: 'journal', url: 'brimpage.example', w: 470, x: 1250, y: 400, z: 20 }    //   raw/web/, raw/ipad/
{ type: 'phone', device: 'iphone', screen: 'journal', url: 'brimpage.example', w: 236, x: 1450, y: 590, z: 30 } // raw/ios/
```
`type: 'device', device: '<name>'` works for any frame. A frame looks in its own platform first
(`browser`/`laptop`/`monitor` -> raw/web/ then raw/mac/, `iphone` -> raw/ios/, `tablet` -> raw/ipad/);
`platform: 'ios'` on an element forces one. Defaults per project: `brand.devices.browser: { theme: 'dark' }`.
A browser tab shows the brand icon as favicon only on the brand's own site: no `url`, or a `url` on
`brand.domain` (`'brimpage.example'` in the demo); another site gets a neutral dot. Per element:
`favicon: false` or `favicon: 'brand/other.png'`.

## Websites and web apps: two ways in
**Mode A, a live site** (`briefs/capture-plan.md`, Websites):
```bash
npm run capture -- --url https://example.com --name home            # raw/web/home.png, 1440x900 @2x = 2880x1800
npm run capture -- --url https://example.com/pricing --full         # + raw/web/pricing-full.png (whole page)
npm run capture -- --url https://example.com --mobile --tablet      # + raw/ios, raw/android, raw/ipad (responsive trio)
npm run capture -- --url https://example.com --name dash --cookies cookies.json --headers headers.json   # logged in
npm run capture -- --url https://example.com --hide ".cookie-banner,#chat-widget" --wait "body p"
npm run capture -- --url https://example.com --box "intro=body p"                              # boxes for lifts
```
Flags: `--viewport 1440x900` `--dpr 2` `--scale 2` `--theme dark` `--locale es` (raw/<platform>/es/)
`--wait networkidle|load|<ms>|<selector>` `--delay 800` `--dir raw`; several pages: `--url a,b --name a,b`.
Animations are frozen and the caret hidden. `cookies*.json` / `headers*.json` are git-ignored and never served
by `npm run preview` (which also refuses requests that do not name 127.0.0.1 or localhost).
**Mode B, from a description** (`briefs/app-spec.md`, Web screens): write `screens/web/<name>.html` with the
web kit (sidebar app shell, top bar, dashboard grid + charts, tables, hero, pricing cards, forms, modals;
`/screens/kit/web-demo.html?platform=web` shows them all), then `npm run screens`. A page with
`<meta name="kit-sizes" content="web,ipad,ios">` is also captured at tablet and phone width (the layout
reflows at 1100 and 640 px), ready for a responsive trio.

## Sharpness
The method is in the skill's `references/design.md` ("Sharpness"). The switches: `npm run export --
--scale 2|3` (hi-res copies in `final/portfolio/<locale>/<target>/`, never uploaded), `npm run screens --
--scale 2` / `npm run capture -- --scale 2` (larger captures, when a render warns `... is upscaled 1.6x`),
`sheet.width` (3840) and `sheet.quality` (94) for the overview sheets, `--png` for a lossless sheet, and
the `playstore-4k` target (2160x3840; upload it OR `playstore`).

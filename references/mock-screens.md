# Step 2, Mode B: build the screens with the kit

Use this when there is no app build: a pre-launch idea, a description without designs, or a portfolio
concept. You build each key screen as one HTML file with the mock-screen kit, and `npm run screens`
captures it for iOS and Android into `raw/`, exactly where Mode A captures go. From there, both modes
are the same. Web pages use the web kit: see `web.md`.

## Start from the app spec
`briefs/app-spec.md` (the demo version shows the shape) gets the intake description at Step 0; write the
rest after the brand board is approved:
- **5-8 key screens**, each with its purpose and realistic content.
- **One demo persona** (name, "today", numbers that add up), the same on every screen.
- **A story map:** which screen proves which store image, and which card each image lifts out. Those
  cards become `data-box` names. One proof per image: a card (a goal ring, a chart) that proves image 4
  is not also the hero's lift, a fan's side phone and the feature graphic's card; that set looks thin.
  A lifted card comes from a screen that no phone or tile on THAT image shows (else the render warns "is
  also visible in ..."): give every screen one support box for the hero, and when the art direction says
  "stats breaking out of the phone", lift a stat from another screen over the phone's edge.
- Invented names only: no real people, brands or customer data.

## Files
```
screens/
  home.html  entry.html  insights.html   one file per screen, rendered for BOTH platforms
  app.css                                 this app's own pieces (brand colours come from tokens, not here)
  strings.json                            translations: { "es": { "Today": "Hoy", ... } }
  ios/<name>.html  android/<name>.html    optional: one screen overridden for one platform
  web/<name>.html                         desktop pages (web.md)
  kit/                                    the kit: kit.css, kit.js, chrome, components, icons, charts, art
  css/<part>.css  js/icons.js              optional: app CSS split by job (app.css only @imports them, so no
                                          file passes 300 lines); extra icons (`ICONS.x = '...'` in a module
                                          loaded right after kit.js). EVERY part loads on every screen:
                                          prefix each rule with its screen's own class (`.t-main`, `.w-main`)
                                          or `.android main.stack { ... }` in today.css restyles all screens
  _sample.html                            optional: the brand boards' sample in this app's words (brand.md)
```
A folder in `screens/` is read as a platform override only when it is a platform name (`ios`, `android`,
`ipad`) and as web pages when it is `web` or `mac`; `css/`, `js/` and files starting with `_` are never
captured.

**Reserved class names.** The kit builds its chrome from generic classes: `bar` (the navbar row), `head`,
`tabs`, `tab`, `ind`, `body`, `title`, `sub`, `trail`, `label`, `value`, `spacer`, `accessory`, `glass`.
App CSS must not style them globally: a progress bar named `.bar` turned the whole iOS navbar into a band.
Prefix the app's own classes (`.s-meter`, `.goal-bar`) or scope them (`.card .meter`).

## A new screen
```html
<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="kit-strings" content="strings.json">
<meta name="kit-tokens" content="/brand/tokens.json">
<link rel="stylesheet" href="kit/kit.css"><link rel="stylesheet" href="app.css">
<script type="module" src="kit/kit.js"></script></head>
<body>
<header class="navbar" data-large="ios" data-title="Settings" data-back></header>
<main class="content pad stack">
  <div class="list icons" data-box="prefs">
    <div class="item"><span class="lead-icon" style="background:var(--orange)"><i data-icon="bell"></i></span>
      <div class="body"><div class="title">Reminders</div><div class="sub">Daily at 9:00</div></div><span class="switch on"></span></div>
  </div>
  <section class="card" data-box="week"><h3 class="t-headline">This week</h3>
    <div class="chart mt-m" data-chart="bars" data-values="3,5,4,6,7" data-labels="M,T,W,T,F" data-hl="4" style="height:120px"></div></section>
</main>
<nav class="tabbar" data-tabs="Today:sun,Journal:book,Settings:gear" data-on="2"></nav>
</body></html>
```
Then:
```bash
npm run screens -- --screen settings          # raw/ios/settings.png + raw/android/settings.png + boxes
```
and use it in a panel: `{ type: 'lift', screen: 'settings', box: 'week', w: 600, x: 660, y: 900 }`.

## What the kit gives you
**System parts (built from attributes)**
- `body[data-status=light|none][data-time="9:41"][data-indicator=none]`: the status bar and home indicator.
- `header.navbar[data-title][data-subtitle][data-large="ios"][data-back|data-close][data-actions="search,more"][data-avatar="S"][data-done="Save"]`
- `nav.tabbar[data-tabs="Label:icon,..."][data-on="0"]`, `.fab > i[data-icon] + .label`, `.toolbar`

**Components**
- Surfaces `.card` `.tinted` `.soft` `.flat`; lists `.list > .item` (`.lead-icon` `.body .title .sub` `.trail` `.chev`)
- Buttons `.btn` (`.tonal` `.outline` `.plain` `.light` `.small` `.block` `.icon`)
- Chips `.chips > .chip.on`, `.chip.tag`; `.segmented > span.on`; `.switch.on`
- Inputs `.field(.focus) .label .value .placeholder`, `.search`, `.caret`
- People `.avatar.s|.l|.xl`, `.avatars` (overlap scales with the size; initials stay whole), `.badge`, `.pill.good|.bad|.glass`
- Data `.progress > i`, `.stat .value .label`; modals `.sheet` `.scrim` `.grabber`; `.section-head .link`, `.divider`

**Drawn by attribute**
- `i[data-icon=name]`: about 80 icons, money and security too (bank, cart, bus, receipt, repeat, shield,
  faceid, fingerprint, target, coffee); selected tabs use the filled form.
- `.chart[data-chart=bars|line|spark|ring|donut]` with `data-values`, `data-labels`, `data-hl`. A line's
  y range is its data's own range (`data-min` / `data-max` to set it); `data-label-at="0,7,14,25"` ties
  labels to data points; `data-colors` takes `color-mix(...)` and `var(--x, #fff)` (one colour per bar:
  no fade). Zones (heart rate, pace): `data-bands="113,132,151,170"` + `data-band-colors` draw bands
  behind a line, `data-line-by-band` colours the line by zone, `data-avg` adds a dashed average. On a
  coloured card set `data-ring` (or `--chart-ring`) to the card's colour, else the end dot gets a white
  ring. The header of `kit/charts.js` lists every attribute.
- `.art[data-art=dusk|forest|sea|mountain|city|bloom|map|bowl][data-seed]`: invented photo stand-ins,
  nothing to license, no real places or faces. The map takes the brand: `--map-land`, `--map-water`,
  `--map-park`, `--map-road`, `--map-major`, `--map-route` in app.css, and `data-route="M70 230C..."`
  (absolute commands, 400 x 300 box) for your own route; km markers in a `kit:ready` script.

**Helpers**
- Type (HIG sizes on iOS, M3 on Android): `t-hero` `t-large` `t-title` `t-headline` `t-body` `t-callout`
  `t-sub` `t-caption` `t-label` `t-micro`
- Layout: `pad` `stack` `row` `between` `grow` `grid-2` `grid-3` `mt-xs..xl` `clamp-2` `ellipsis`
- Colour: `tint` `muted` `faint` `good` `bad` `app-font` `num`

See every component live: `npm run preview`, then open `/screens/kit/demo.html?platform=android&theme=dark`
(and `platform=ios`, `theme=light`).

## iOS vs Android: the kit follows each platform's conventions

| part | iOS (HIG) | Android (Material 3) |
|---|---|---|
| canvas | 440x956 pt @3x = 1320x2868 | 360x800 dp @3x = 1080x2400 |
| status bar | 9:41, Dynamic Island area left empty | 12:00, punch-hole area left empty |
| UI font | Inter (stands in for the system font) | Roboto |
| top bar | large title, glass circle buttons | top app bar: title on the left, icon buttons |
| back | chevron | arrow |
| bottom bar | floating glass tab bar, the main action merged into it | navigation bar with a pill on the active tab, extended FAB |
| lists | inset grouped, rounded groups | connected lists |
| switch | capsule | M3 switch with a check in the thumb |
| segmented | segmented control | segmented button with a check |
| text field | filled, rounded | outlined |
| sheet | grabber, large corner radius | drag handle |
| themes | light and dark | light and dark |

Do not fight the kit to make one platform look like the other. A store set looks native when each
platform's images show that platform's UI. The App Store never shows Android UI (Apple 2.3.10).

## Hooks for one screen
- `data-only="ios"` (or `android`) keeps an element on one platform only.
- `data-ios=".."`, `data-android=".."`, `data-es=".."` swap an element's HTML per platform or language.
- `window.kit` gives `{ platform, family, theme, locale, icon(), t() }`.
- `document.addEventListener('kit:ready', ...)` runs before the capture. A page that loads something
  late sets `window.__ready = false` and then `true` itself. Never a fixed sleep.
- `screens/ios/<name>.html` overrides one screen for one platform when a layout really differs.

## Boxes
Every element with `data-box="name"` is measured after the page is ready and written, in capture pixels
with its corner radius, to `raw/<platform>/[<locale>/]<name>.boxes.json`. The engine reads the file next
to the capture it uses, so boxes follow each platform's and each language's layout by themselves.
`npm run screens` warns when a box runs off the screen, has no size, is used twice, or sits under the tab
bar, the FAB, the toolbar, the home indicator or anything marked `data-chrome` (a pinned button, a
banner, a custom bottom bar: mark it). Fix every warning: a lifted card with a tab bar across it looks
broken. A box's radius is its own, else its first child's (an M3 connected list rounds its rows, not
the list); `data-box-radius="24"` (CSS px) sets it by hand.

## Languages, themes and sizes
- **Languages:** UI strings go in `screens/strings.json` (the English text is the key). The default locale
  writes to `raw/<platform>/`, every other config locale that `strings.json` translates to
  `raw/<platform>/<locale>/`. `--locale es` captures one, `--locale all` every one.
- **Long translations:** use the short form a real app would use ("Dom, 12 de mayo", not the full date),
  and look at every language's captures for truncation.
- **Right to left:** `ar`, `he`, `fa` and `ur` set `dir="rtl"`; the kit mirrors the layout.
- **Dark mode:** `npm run screens -- --theme dark` OVERWRITES the light captures. For a set that shows
  both, copy the screen to `screens/home-dark.html` with `<html lang="en" data-theme="dark">`. An app
  that is dark only: `screens: { theme: 'dark' }` in `studio.config.js` (the default of every run; a
  page's own `data-theme` still wins), so a plain `npm run screens` never re-captures it in light.
- **A branded dark app:** tokens from `brand apply` carry dark surfaces (`--app-bg-dark`,
  `--app-surface-dark`, `--app-raised-dark`, the Android twins). The rest has hooks with Apple / M3
  defaults: `--app-glass-dark`, `--app-segment-dark`, `--switch-on` (iOS switches are system green next
  to a lime brand otherwise). Set them in `screens/app.css` under `.dark { ... }`, derived from the
  brand: `--app-glass-dark: color-mix(in oklab, var(--brand-deep) 70%, transparent)`.
- **Dark pills:** `.pill.good` / `.pill.bad` have dark variants; read every dark capture anyway.
- **Sharpness:** `npm run screens -- --scale 2` captures at 2x the pixel ratio (iOS 2640x5736) for
  hi-res portfolio exports, so no screen is upscaled (`design.md`, "Sharpness").

## Rules for good mock screens
- Leave the island and punch-hole area empty: the frames draw them.
- Real-length content in the persona's voice. Charts with believable, uneven data. One "today".
- Every screen must look like a finished app: no empty states unless the image is about one, and no
  orphan section head or link at the end of the scroll ("Up next" with nothing under it above the tab
  bar): show one row, or end the content before it.
- The same data on both platforms: an avatar stack, a count or a label that differs between the iOS and
  the Android capture breaks the set (fit a long Android label rather than dropping an avatar).
- Android's nav bar is opaque: a row it cuts in half (only the top of "Recent" showing) looks like a
  render glitch. End the content above it, or let a row boundary meet its top edge (`data-only="ios"`
  on the last section works: the iOS glass tab bar hides the cut, Android cannot).
- After every edit: `npm run screens`, then read the changed captures in `raw/ios/` and `raw/android/`
  before any render. The capture is what the store image shows.
- Brand colours and fonts come only from `brand/tokens.json` (`npm run brand -- apply`). `app.css` holds
  only what is specific to this app, such as an editorial serif for entry titles.

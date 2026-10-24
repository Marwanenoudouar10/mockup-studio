# Websites, web apps and desktop apps

The same project makes images for websites, SaaS products, dashboards, browser extensions and desktop
apps: link previews, social posts, Product Hunt, Chrome Web Store, Mac App Store, landing-page heroes and
portfolio covers. The same two ways in, the same brand-first step, the same render, look and validate.

## Targets
Add the ids to `stores` in `studio.config.js`. Sizes, rules and sources: `store-specs.md`.

| want | ids |
|---|---|
| link previews (Slack, iMessage, Facebook, most sites) | `og` |
| X | `x-card` (the link card), `x` (an image post, up to 4) |
| LinkedIn | `linkedin`, `square`, `portrait` |
| Instagram | `square`, `portrait` |
| Product Hunt launch | `producthunt` (2-8 images; the first is the thumbnail) |
| Chrome extension | `chrome-webstore` (1-5), `chrome-promo`, `chrome-marquee` |
| Mac app | `mac-appstore` (1-10, 16:10) |
| landing page | `web-hero` (16:10), `web-hero-wide` (16:9) |
| Upwork, Dribbble, Behance | `portfolio` (4:3 cover) |
| anything else | `{ id: 'banner', label: 'Site banner', size: [1500, 500], platform: 'web' }` |

A config can mix phone stores and wide targets (the demo does). With no phone store, every panel is
wide by default (`examples/web.config.js`).

## Mode A: capture a live site
The same Chrome captures the page; no screenshot tool needed.
```bash
npm run capture -- --url https://example.com --name home            # raw/web/home.png, 1440x900 @2x = 2880x1800
npm run capture -- --url https://example.com/pricing --name pricing --full   # + raw/web/pricing-full.png
npm run capture -- --url https://example.com --name home --mobile --tablet  # + raw/ios, raw/android, raw/ipad
npm run capture -- --url https://example.com --name dash --cookies cookies.json --headers headers.json   # logged in
npm run capture -- --url https://example.com --name home --hide ".cookie-banner,#chat-widget" --wait "body p"
npm run capture -- --url https://example.com --name home --box "intro=body p"   # name=CSS selector: boxes for lifts
```
- Every flag (viewport, dpr, scale, theme, locale, wait, delay, several pages at once): the template
  README, "Websites and web apps".
- Prefer `--wait "<selector of the late content>"` over `--wait <ms>` or `--delay`: a selector waits
  exactly as long as needed (30 s at most, then a clear error). A box whose selector matches nothing
  prints `warn: box ...: no visible element at this size`.
- Animations and transitions are frozen, the caret hidden, `prefers-reduced-motion` set.
- **Hide what users would not want in a marketing image:** cookie banners, chat bubbles, promo bars,
  "we're hiring" toasts. Find their selectors in the browser's inspector.
- **Logged-in pages:** `--cookies` takes a JSON array of `{ name, value, domain, path }` exported from the
  browser's dev tools; `--headers` a JSON object such as `{ "Authorization": "Bearer ..." }`. Both file
  patterns are git-ignored. Never commit them, and use a demo account with demo data, never a client's
  real customer records.
- **Names are shared across platforms:** `--mobile --name home` writes `raw/ios/home.png` and
  `raw/android/home.png`, replacing a mock screen or an app capture with that name. Give site captures
  their own names (`site-home`, `pricing`).
- Read every capture: no half-loaded images, no hover states, no personal data.

## Mode B: build the pages with the web kit
Desktop pages live in `screens/web/<name>.html` and are captured at 1440x900 @2x into `raw/web/`.
```html
<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="kit-sizes" content="web,ipad,ios">      <!-- also capture at tablet and phone width -->
<meta name="kit-strings" content="../strings.json">
<meta name="kit-tokens" content="/brand/tokens.json">
<link rel="stylesheet" href="../kit/kit.css"><link rel="stylesheet" href="../app.css">
<link rel="stylesheet" href="app-web.css"><script type="module" src="../kit/kit.js"></script></head>
<body><div class="app">
  <aside class="sidebar" data-logo="/brand/logo.svg" data-items="Today:sun,Journal:book:128,Insights:chart" data-on="1"></aside>
  <main class="main"><header class="topbar" data-title="Journal" data-search="Search"></header> ... </main>
</div></body></html>
```
Copy `screens/web/journal.html` for a complete page (sidebar groups, user, call to action). The kit gives:
- **App shells:** `.app` + `.sidebar` + `.topbar`, `.main`, `.page`; `.cols` with `.col-list`,
  `.col-main`, `.col-rail`.
- **Dashboards:** `.dash` grid with `.span-3` ... `.span-12`, `.kpi`, `.panel-head`, `.legend`, and every
  chart (`.chart[data-chart=bars|line|spark|ring|donut]`).
- **Marketing pages:** `.site-nav`, `.hero`, `.logos`, `.features`, `.pricing > .plan.featured`, `.footer`.
- **Data and forms:** `.table`, `.form`, `.check`, `.modal` with `.scrim`, `.toast`, `.empty`.
- Every phone component (cards, lists, buttons, chips, avatars) restyled for the desktop, light and dark.
- `data-box` on a grid card is measured at its own content height, not the row's stretched height, so a
  lifted card has no blank bottom (`data-box-fit="cell"` keeps the cell).
- **Responsive:** at 1100 px and below the sidebar becomes an icon rail; at 640 px and below a top bar
  with a menu button and a two-column dashboard grid (`.kpi-tile` takes one column, every other card
  both; `.hide-phone` / `.hide-tablet` drop a card). A page with `<meta name="kit-sizes" content="web,ipad,ios">` is also captured at
  tablet and phone width into `raw/ipad/` and `raw/ios/`, ready for a responsive trio.
- Reference page with every block: `npm run preview`, then `/screens/kit/web-demo.html?platform=web`
  (`&theme=dark`, `&size=ios`).

`npm run screens` captures phone screens AND web pages; `--platform web` only the web pages.

## The wide layout
Wide targets use their own design space: a canvas 1200 units HIGH (og is 2286 x 1200 units, 16:10 is
1920, 4:3 is 1600, square 1200), scaled to the image like the phone canvas.
- **`side`** (W/H >= 1.5: og, X, LinkedIn, Product Hunt, Chrome, Mac, heroes): the copy column on the
  left (right in RTL), vertically centred; the stage beside it.
- **`stack`** (portfolio 4:3, square, 4:5): the copy centred on top, the stage under it.
- The stage is a 1600 x 1200 box (`x` = centre, `y` = top edge), scaled to the room and centred in it.

Panels say which space they belong to and which targets show them:
```js
{ space: 'landscape', only: ['og', 'producthunt'], mode: 'side', logo: true,
  headline: { en: 'Your journal, now on the <em>web</em>' }, sub: 'Write on any screen.',
  stage: [ { type: 'browser', screen: 'journal', url: 'brimpage.example/journal', w: 1500, x: 880, y: 150 } ] }
```
- `space`: `'portrait'` (phone stores, the default while the config has one), `'landscape'`, or `'any'`
  with `stage: { portrait: [...], landscape: [...] }` to use one panel for both.
- `only`: the targets that show the panel. `og`, `x-card`, `linkedin` and the Chrome promo tiles take
  one image each: the first matching panel wins and the render prints a note.
- Per panel: `mode` (`side` | `stack`), `copyWidth`, `size`, `zoom`, `gap`, `nudge`, `align`.
- For every wide image: `layout: { wide: { headline: 96, sub: 38, copyWidth: 0.36, stageW: 1600, stageH: 1200 } }`.

## Devices (pure CSS, no images, no trademark names)
`w` is the SCREEN width in stage units; the frame grows around it.

| type | looks in | options |
|---|---|---|
| `browser` | `raw/web/`, then `raw/mac/` | `url` (the address bar domain), `title`, `theme: 'dark'`, `style: 'compact'` |
| `laptop` | `raw/web/`, then `raw/mac/` | `url` adds a browser bar, `finish: 'graphite'` |
| `monitor` | `raw/web/`, then `raw/mac/` | `url`, `finish` |
| `tablet` (iPad frame) | `raw/ipad/` | `url` adds the mobile browser UI |
| `phone` (iPhone or Pixel by target) | `raw/ios/` or `raw/android/` | `url` adds the mobile browser UI; `device: 'iphone'` |

`platform: 'ios'` on an element forces where its screen comes from. Project-wide defaults:
`brand.devices.browser: { theme: 'dark' }`. A browser tab shows the brand icon as its favicon only on the
brand's own site (no `url`, or a `url` on `brand.domain`); a third-party site such as a client's
customer gets a neutral dot, or `favicon: 'brand/their-icon.png'`, `favicon: false`.

## The responsive trio
The same page on a laptop, a tablet and a phone: one stage, three captures of one page.
```bash
npm run screens -- --platform web --screen journal    # kit-sizes web,ipad,ios -> raw/web, raw/ipad, raw/ios
npm run capture -- --url https://example.com --name home --mobile --tablet   # or a live site
```
`--platform web` captures each page at every size its `kit-sizes` lists. Read the phone capture of a
dashboard in particular: at 640 px the grid becomes two columns (KPI tiles side by side, every other card
full width), and cards marked `hide-phone` drop out.
```js
stage: [ { type: 'laptop', screen: 'journal', url: 'brimpage.example/journal', w: 1120, x: 640, y: 150, z: 10 },
         { type: 'tablet', screen: 'journal', url: 'brimpage.example/journal', w: 470, x: 1250, y: 400, z: 20 },
         { type: 'phone', screen: 'journal', url: 'brimpage.example/journal', w: 236, x: 1450, y: 590, z: 30 } ]
```
Small devices on a 1200 px image lose fine text in the downscale; that is fine for a trio, whose point is
"it works everywhere". Lift one card at reading size if the image must also show a detail.

## Per target notes
- **og / X card / LinkedIn:** read at thumbnail size in a feed. 3 to 6 words, the product visible, the
  logo. No small text.
- **Product Hunt:** the first image is the thumbnail; 3 to 5 images that walk through the product.
- **Chrome Web Store:** show the extension working on a page, at 1280x800. The promo tile (440x280) is
  tiny: logo, 2-4 words, one shape. The marquee (1400x560) is a banner, not a screenshot.
- **Mac App Store:** Apple's App Store rules apply (`policy.md`), including real UI in most images.
  Capture the Mac app window into `raw/mac/` (or `{ id: 'mac-appstore', screens: 'web' }` for a web app).
- **Portfolio cover:** the strongest single image of the project: a responsive trio or the hero phone
  and its two best cards. Make a hi-res copy: `npm run export -- --scale 2`.

## Render and check
```bash
npm run render -- --store og,producthunt --out out/qa/web       # wide targets only, while iterating
npm run render -- --config examples/web.config.js --out out/qa/web-only
npm run export                                                  # everything, then read every image
```

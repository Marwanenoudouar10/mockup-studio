# Layout recipes

Proven stage configs to copy into `panels[]`. Every one was rendered for the App Store (1320x2868) and
Google Play (1080x1920) on the Brimpage demo and looked at. Swap the screen and box names for yours.

**Coordinates.** Portrait stage: 1320 x 1900 design units, hung under the copy and scaled to the room
left. Wide stage: 1600 x 1200. `x` = centre, `y` = top edge, `w` = width (a device's SCREEN width),
`h` = height (tiles), `r` = degrees, `z` = stacking order. Any value can vary per store:
`y: { playstore: 200, default: 330 }`.

**Element types:** `phone` (a capture in a device frame), `lift` (one card of a screen at reading size,
by `box` name or `crop`), `tile` (a frameless screen or an image as a window), `badge` (a short chip),
and on wide targets `browser`, `laptop`, `monitor`, `tablet` (`web.md`).

## 1. Hero orbit (image 1)
```
+------------------+   the main screen straight, 2-3 proof cards
| [logo]           |   "orbiting" on its edges, one badge.
| Your day, one    |
| page at a time   |
|   +------+ [==]  |   <- lift: streak
| (o|      |       |   <- badge
|   | home |  [==] |   <- lift: lifts
+---+------+-------+
```
```js
{ logo: true, headline: 'Your day, <em>one&nbsp;page</em> at a time', stage: [
  { type: 'phone', screen: 'home', w: 760, x: 660, y: 40, z: 20 },
  { type: 'lift', screen: 'insights', box: 'streak', w: 520, x: 960, y: { playstore: 200, default: 330 }, r: 4, z: 31 },
  { type: 'lift', screen: 'insights', box: 'lifts', w: 560, x: 930, y: 1250, r: 3, z: 33 },
  { type: 'badge', text: 'Private by default', icon: 'lock', x: 400, y: 1130, r: -4, z: 40 } ] }
```

## 2. Macro lift (a feature at reading size)
```
+------------------+   a tilted phone for context, the ONE card
| Write it down    |   that proves the headline lifted out big,
| in seconds       |   across the phone's lower half.
|      +------+    |
|      |entry |    |
| +==========+|    |   <- lift: prompt, w 820
| |  prompt  ||    |
+-+==========++----+
```
```js
{ headline: 'Write it down in <em>seconds</em>', sub: 'Prompts, photos and moods.', stage: [
  { type: 'phone', screen: 'entry', w: 700, x: 750, y: 0, r: 5, z: 10 },
  { type: 'lift', screen: 'home', box: 'prompt', w: 820, x: 540, y: 1010, r: -4, z: 30 } ] }
```

## 3. Window (a screen, photo or map behind a phone)
```
+------------------+   a frameless screen as a big window, a phone
| See what lifts   |   in front of it, one card at the bottom.
| your mood        |   Works with a photo or map: src: 'brand/map.jpg'
| +--------+       |
| |insights| +---+ |
| |  tile  | |ph.| |
| +[=====]-+ +---+ |   <- lift: mood
+------------------+
```
```js
{ headline: 'See what <em>lifts</em> your mood', stage: [
  { type: 'tile', screen: 'insights', w: 840, h: 1240, x: 490, y: 0, r: -3, z: 5, radius: 70, pos: 'top' },
  { type: 'phone', screen: 'entry', w: 600, x: 1010, y: 460, r: 7, z: 20 },
  { type: 'lift', screen: 'home', box: 'mood', w: 680, x: 460, y: 1150, r: -3, z: 30 } ] }
```

## 4. Single straight phone (the classic)
```
+------------------+   one big screen, nothing else; it bleeds off
| Headline         |   the bottom on purpose. For a screen that
|  +------------+  |   speaks for itself (a chart, a map).
|  |  insights  |  |
|  |            |  |
+--+------------+--+
```
```js
{ headline: 'Patterns you can <em>see</em>', stage: [
  { type: 'phone', screen: 'insights', w: 900, x: 660, y: 40, z: 20 } ] }
```

## 5. Fan of three (breadth)
```
+------------------+   three screens at once: the centre one in
| Headline         |   front and straight, two tilted behind it.
|     +----+       |   The side phones bleed off the edges on purpose.
| +--+|home|+--+   |
| |en||    ||in|   |
| +--+|    |+--+   |
+-----+----+-------+
```
```js
{ headline: 'Everything in <em>one</em> place', stage: [
  { type: 'phone', screen: 'entry', w: 520, x: 370, y: 320, r: -8, z: 10 },
  { type: 'phone', screen: 'insights', w: 520, x: 950, y: 320, r: 8, z: 11 },
  { type: 'phone', screen: 'home', w: 600, x: 660, y: 60, z: 20 } ] }
```

## 6. Flow trio (steps)
```
+------------------+   a sequence read top left to bottom right,
| Three steps      |   a numbered badge on each phone. For "how it
| (1)+--+          |   works". Small screens: the steps carry it,
|    |  |(2)+--+   |   not the detail.
|    +--+   |  |(3)|
|           +--+[] |
+------------------+
```
```js
{ headline: 'Three steps, <em>one</em> minute', stage: [
  { type: 'phone', screen: 'home', w: 480, x: 300, y: 110, r: -3, z: 10 },
  { type: 'phone', screen: 'entry', w: 480, x: 660, y: 400, z: 11 },
  { type: 'phone', screen: 'insights', w: 480, x: 1020, y: 690, r: 3, z: 12 },
  { type: 'badge', text: '1  Pick a prompt', x: 300, y: 20, r: -3, z: 40, size: 36 },
  { type: 'badge', text: '2  Write', x: 660, y: 310, z: 40, size: 36 },
  { type: 'badge', text: '3  See patterns', x: 1020, y: 600, r: 3, z: 40, size: 36 } ] }
```

## 7. Duo (two screens, one story)
```
+------------------+   two phones overlapping: before and after,
| Headline         |   list and detail, or light and dark (make a
|        +-----+   |   home-dark.html screen: mock-screens.md).
| +-----+|     |   |   Same platform only.
| |     ||     |   |
+-+-----+------+---+
```
```js
{ headline: 'Two screens, <em>one</em> story', stage: [
  { type: 'phone', screen: 'insights', w: 620, x: 920, y: 0, r: 6, z: 10 },
  { type: 'phone', screen: 'home', w: 660, x: 450, y: 330, r: -4, z: 20 } ] }
```

## 8. Light field, minimal
```
+------------------+   a light field, dark headline, highlight band
| Calm by design   |   instead of the brush, one phone, lots of air.
|   ==========     |   For calm, premium or B2B sets.
|   +--------+     |
|   |  home  |[b]  |
+---+--------+-----+
```
```js
{ field: 'light', ornament: 'highlight', headline: 'Calm by <em>design</em>', stage: [
  { type: 'phone', screen: 'home', w: 780, x: 660, y: 60, z: 20 },
  { type: 'badge', text: 'Private by default', icon: 'lock', x: 1000, y: 1200, r: 3, z: 40, style: 'dark' } ] }
```
For a whole light set, set `brand.field: 'light'` and `brand.ornament: 'highlight'` once instead.

## 9. Frameless (Google Play friendly)
```
+------------------+   the screen itself as a rounded tile, no
| No frame, all    |   device: Google discourages device imagery.
| app              |   One card lifted over it.
| +--------------+ |
| |   home tile  | |
| |      [=====] | |   <- lift
+-+--------------+-+
```
```js
{ headline: 'No frame, <em>all</em> app', stage: [
  { type: 'tile', screen: 'home', w: 940, h: 1700, x: 660, y: 20, z: 10, radius: 80, pos: 'top' },
  { type: 'lift', screen: 'insights', box: 'streak', w: 620, x: 860, y: 1160, r: 4, z: 30 } ] }
```
Frameless on Play only, phones elsewhere: `stage: { playstore: [ ...this... ], default: [ ...phones... ] }`.

## 10. Card stack (no device)
```
+------------------+   three lifted cards, big and slightly
| The cards that   |   rotated. Every element is real UI, so it
| matter           |   still counts as "the app in use".
| [=============]  |
|  [============]  |
| [=============]  |
+------------------+
```
```js
{ headline: 'The cards that <em>matter</em>', stage: [
  { type: 'lift', screen: 'home', box: 'prompt', w: 1060, x: 660, y: 60, r: -3, z: 10 },
  { type: 'lift', screen: 'insights', box: 'streak', w: 980, x: 700, y: 640, r: 2, z: 20 },
  { type: 'lift', screen: 'insights', box: 'lifts', w: 1000, x: 640, y: 1150, r: -2, z: 30 } ] }
```

## 11. Panorama bridge
All images of a store on ONE strip with one continuous field, cut into files. Devices can sit on a seam.
Set it per store: `stores: [{ id: 'appstore', panorama: true }]`. Stage `x` is then GLOBAL (0..N x 1320;
`x: 1320` is the first seam) and not scaled; sizes are. Full example: `examples/panorama.config.js`.

**A panorama store next to normal stores** reads the same panels, but a normal store's `x` is per image
(0..1320) and a panorama's is global. Give every panel a stage per store, or every device of the
panorama piles onto image 1 (the render then warns `panorama image 2 shows no screen`, and validate
counts the images without UI from the renders):
```js
// panel 2 of 3, with stores ['appstore', { id: 'playstore', panorama: true }]
stage: {
  playstore: [ { type: 'phone', screen: 'entry', w: 640, x: 2020, y: 0, r: 5, z: 10 } ],  // image 2 spans x 1320-2640
  default:   [ { type: 'phone', screen: 'entry', w: 700, x: 750, y: 0, r: 5, z: 10 } ],
}
```
```
+--------+--------+--------+
| Head 1 | Head 2 | Head 3 |
|  +--+ +|-+  +--+|-+      |   phones crossing the seams
|  |  | ||  | |  || |      |
+--+--+-+--+--+--+--+------+
```
```js
{ type: 'phone', screen: 'entry', w: 640, x: 1320, y: 420, r: 8, z: 15 }   // bridges images 1 and 2
```

## Feature graphic (1024 x 500, plain pixel coordinates)
Copy on the left inside the safe zone (x 154-534 by default), devices in the right third.
```js
// fan of three phones (the demo)
stage: [ { type: 'phone', screen: 'entry', w: 196, x: 668, y: 120, r: -8, z: 10 },
         { type: 'phone', screen: 'insights', w: 196, x: 932, y: 120, r: 8, z: 11 },
         { type: 'phone', screen: 'home', w: 236, x: 800, y: 52, z: 20 } ]
// one phone and one card
stage: [ { type: 'phone', screen: 'home', w: 230, x: 700, y: 50, r: -6, z: 10 },
         { type: 'lift', screen: 'insights', box: 'streak', w: 250, x: 800, y: 300, r: 4, z: 20 } ]
```

## Wide recipes (web, social, desktop)
Wide panels say `space: 'landscape'` and which targets show them (`only`). Copy goes beside the stage
(`side`, W/H >= 1.5) or above it (`stack`). Details in `web.md`.

**W1. Browser hero** (og, X, LinkedIn, Product Hunt):
```
+-------------------------------+
| [logo]       +--------------+ |
| Your journal,|  browser     | |
| now on the   |  journal     | |
| web   [=====]|              | |   <- lift: prompt
+-------------------------------+
```
```js
{ space: 'landscape', only: ['og', 'producthunt'], logo: true,
  headline: 'Your journal, now on the <em>web</em>', sub: 'Write on any screen.', stage: [
  { type: 'browser', screen: 'journal', url: 'brimpage.example/journal', w: 1500, x: 880, y: 150, z: 10 },
  { type: 'lift', screen: 'journal', box: 'prompt', w: 500, x: 230, y: 760, r: -4, z: 30 } ] }
```
**W2. Laptop + lift:** `{ type: 'laptop', screen: 'dashboard', url: 'brimpage.example/insights', w: 1240, x: 820, y: 170, z: 10 }`
and `{ type: 'lift', screen: 'dashboard', box: 'lifts', w: 500, x: 1260, y: 720, r: 3, z: 30 }`.

**W3. Responsive trio** (the same page on three devices; Product Hunt, portfolio cover):
```js
stage: [ { type: 'laptop', screen: 'journal', url: 'brimpage.example/journal', w: 1120, x: 640, y: 150, z: 10 },
         { type: 'tablet', screen: 'journal', url: 'brimpage.example/journal', w: 470, x: 1250, y: 400, z: 20 },
         { type: 'phone', screen: 'journal', url: 'brimpage.example/journal', w: 236, x: 1450, y: 590, z: 30 } ]
```
**W4. Monitor** (Mac App Store, web hero): `{ type: 'monitor', screen: 'dashboard', w: 1340, x: 760, y: 60, z: 10 }`
plus a lift of one KPI card (`examples/web.config.js`).

## Tuning a recipe
- Render one image while you tune: `npm run render -- --store appstore --panel 2 --out out/qa/p2`, then
  the same for `playstore`. Read both. `--panel` is the config's panel number (its position in `panels`).
- Cards, badges and the copy keep 40 units from the edges; the render warns otherwise. A card cut on
  purpose says so: `bleed: true`. Never lift a card that the phone on the same image already shows.
- Higher `z` draws on top. Lifts 30+, badges 40, phones 10-20, tiles 5.
- Small rotations (3-9 degrees) look designed; more looks like an accident.
- A card's `y` that works on the tall iPhone canvas can hide UI on 9:16: give it a per-store value.
- Moving things by hand is faster in Store Studio (`workspace.md`); `npm run bake` writes the moves back.

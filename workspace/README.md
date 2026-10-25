# Mockup Studio

A local workspace that shows every mockup-studio project live, like a design canvas. Every App Store, Google
Play, web and brand image of a project sits on one infinite canvas as a live page of the project's own engine.
Move, rotate and resize elements by hand, retype headlines, and, in an **editable** project, edit the text and
colours INSIDE the mock screens (double-click a phone). New layouts are still made by Claude in the project
files, and the board refreshes by itself when they change.

```
┌ Mockup Studio  Projects / Brimpage   All · App Store · Google Play · Web · Brand       EN ▾  ● Live ┐
│ PROJECTS       │          ┌ App Store 01 › phone · home › Nav title   Esc  Done ┐   │ T Nav title    │
│ ■ Brimpage     │                    ┌───────────────┐                              │ TEXT        en │
│ LAYERS · HOME  │                    │ 9:41          │                              │ Good evening…  │
│ ‹ App Store 01 │                    │ Good evening, │ ← typed in place             │ COLOUR         │
│ ▾ navbar       │                    │ ┌───────────┐ │                              │ ■■■■■■■■■ ◐    │
│   Nav title    │                    │ │ prompt    │ │                              │ FILL · TYPE    │
│ ▾ content      │                    │ └───────────┘ │                              │ NUDGE dX dY    │
│   prompt  ●    │                    └───────────────┘               − 237% + · fit │ Hide · Reset   │
└────────────────┴──────────────────────────────────────────────────────────────────┴────────────────┘
```

## Start
```bash
cd workspace
npm install                                   # no dependencies: node:http, fs.watch and server-sent events
npm start -- ~/clients                        # a folder of projects (searched two levels deep, again on each page load)
npm start -- ~/clients/acme ~/clients/nova    # or project folders (each has a studio.config.js)
npm start                                     # the projects from last time (workspace.json)
```
It prints the URL (default `http://127.0.0.1:4400/`, `--port 4410` for another, a free one if busy) and
binds 127.0.0.1 only. A second instance next to one that is already running (an agent's checks on a copy)
takes its own list too: `npm start -- <copy> --port 4410 --state <scratch>/workspace.json`, so the copy never
lands in the person's list and the two servers never write the same file. The registered projects are remembered per user, never in this folder (they are
local paths): `~/.config/mockup-studio/workspace.json` (`$XDG_CONFIG_HOME`, or `%APPDATA%` on Windows);
`--state <file>` uses another file. A list kept under the workspace's earlier name is copied over once
(`server/state.js`). `--forget <slug>` drops one, `--reset` starts the list over. Node 18 or newer. A project
needs its own `npm install` (its engine and fonts are what the board shows).

## Use it
| do | how |
|---|---|
| pan | scroll or two-finger drag; Space + drag; middle button; drag on empty canvas |
| zoom | pinch, or Cmd/Ctrl + scroll; `+` `-`; the zoom chip (− % + · fit); `Shift+1` fit all; `Cmd/Ctrl+0` 100 % |
| select | click an element (blue box); click an image to list its layers; layers in the sidebar |
| move | drag the element (Shift locks the axis); arrow keys nudge 1, Shift + arrow 10 |
| resize / rotate | corner handles keep the aspect; the round knob rotates (Shift snaps to 15°) |
| exact values | type X, Y, W, R, Z, Radius in the inspector, Enter |
| undo / redo | Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z (or Ctrl+Y): one history for moves and edits |
| add a device | drag a capture from Screens onto an image (green target); Delete removes an added one |
| one store vs all | a move applies to the image's store; **Apply to all stores** makes it the rule for every store |
| back to the config | **Reset to config** removes the override (for this store and "all stores") |
| retype a headline | double-click it (Enter saves, Shift+Enter breaks the line, Esc cancels), or its fields in the inspector (`<em>` = the accent word) |
| ask Claude | pin a note to an element or image in the inspector; it goes to the project's `notes.json` |
| filter | tabs All · App Store · Google Play · Web · Brand; the locale picker reloads every image in that language |

Each move is saved at once to the project's `layout.json` (toast: "Saved position → layout.json"). The
project's renders read the same file, so `npm run render` and `npm run export` produce what you see.
When the moves are final, Claude runs `npm run bake` in the project: the positions are written into
`studio.config.js` and `layout.json` is emptied. The file format is documented in the template README
and in `assets/template/scripts/lib/layout.js`.

### Editing inside a screen (editable projects)
A project is **editable** when its config says `screens: { mode: 'live' }`: every device, lift and tile draws
the mock screen page itself (`screens/<name>.html`), not a capture. Then:

| do | how |
|---|---|
| enter a screen | double-click a phone, tablet, browser, lift or tile (or select it and press Enter, or **Edit screen**). The board zooms to it, fades the other elements and hides the cards floating over it, so nothing covers the screen (they come back on leave) |
| select | click an element of the screen, or a row of the layer tree in the sidebar (top level open, the path to the selection opens by itself) |
| type | double-click a text (or Enter): the words are typed in place, in the real font; Enter saves, Esc cancels, a click elsewhere saves |
| colour, fill | the inspector's swatches are the screen's brand and kit tokens (saved as the token name, so a new brand colour follows); the rainbow swatch or the field takes any colour; × goes back to the screen's own |
| size, weight | the inspector's Type fields (CSS px of the screen) |
| nudge | drag the element, or arrows 1 px, Shift + arrow 10 px (CSS px of the screen) |
| hide | **Hide** / **Show** (or Shift+Cmd/Ctrl+H): the space stays, like hiding a layer |
| reset | **Reset element**, **Reset screen** |
| leave | Esc, **Done**, or a click outside the element; the view goes back to where it was |

Every edit is saved to the project's `edits.json` (by screen and element id, with a fingerprint) and shows at
once in **every** image with that screen; images whose lifts or tiles cut that screen reload one after
another, so a lifted card shows the edit too. Renders, captures, `npm run vector` and exports all apply
`edits.json`. Screens without a page (real captures in `raw/`) stay pictures. In a **screenshots** project
(`screens.mode` 'raster', the default) a double-click explains that the screen content is fixed; moving,
resizing and headlines work as usual. The format of `edits.json` is in `assets/template/scripts/lib/edits.js`.

## How it works
- **Serving**: each registered project's root is served under `/p/<slug>/`. The engine loads every file
  relative to its own location (`engine/core/root.js`), so its pages run unchanged under that prefix.
  Mock screens written for a project served at `/` (`/brand/tokens.json`, `/node_modules/...` fonts) are
  redirected into the project their page belongs to (its Referer). `/p/<slug>/raw/index.json` and
  `/p/<slug>/screens/index.json` list the captures and the screen pages (no 404 probing), a missing
  `layout.json` or `edits.json` answers 204, and `cookies*.json` / `headers*.json` are never served.
- **Live images**: every image is an iframe of the project's own page (`engine/panel.html`,
  `feature.html`, the brand board) at its native size, scaled with a CSS transform. Images load when they
  come near the screen.
- **Live files**: `fs.watch` on `studio.config.js`, `layout.json`, `notes.json`, `edits.json`, `brand/`,
  `screens/`, `raw/`, `briefs/`, `engine/` and `scripts/` -> server-sent events -> only that project's frames
  reload, double-buffered (the new page renders behind the old one, then swaps), so zoom, pan, the selection
  and screen mode stay. A config change that adds or removes images rebuilds the rows; one with an error shows
  a red banner and keeps the last good board. The workspace's own writes do not trigger a reload.
- **Edit bridge**: with `?edit=1` the engine tags every stage element (`data-el` = its id) and posts each
  element's box, its config values, the config-to-pixel mapping and the headline's box to the workspace
  (`engine/core/edit.js`). A drag sends `{ ss: 'set' }` back and the page redraws that one element with the
  same code a render uses. Mirrored RTL layouts and panorama strips (global x) are handled by that mapping.
- **Screen bridge** (`engine/core/edit-screen.js`): `{ ss: 'enter' }` makes the page post the layers of that
  element's live screen (the kit's `kit.edit.layers()`), each element's CSS box mapped to page px through the
  exact affine transform of its iframe (read from three zero-size markers, so rotated and scaled lifts line
  up), the visible part of the screen, its token colours and any edit the kit skipped. `pick` asks the screen
  which element is under a point (its own z order), `screen-set` previews an edit in every live frame of that
  screen, and `text-start` / `copy-start` type in place (contenteditable) and answer with the words.
- **Writes**: `POST /api/layout`, `/api/notes` and `/api/edits` change only `layout.json` / `notes.json` /
  `edits.json`, only inside a registered project, only known keys and checked values (`server/edit-rules.js`:
  token or colour, numbers in range, plain text, headlines with `<em>` and `<br>` only). Requests must name
  this server in `Host` and, for writes, come as JSON from this page's origin, so no other web page can
  write into a project.

## Files
```
server/   index.js (CLI, start), state.js (where the project list lives), app.js (routes), registry.js
          (workspace.json), files.js (static, traversal-safe), watch.js (fs.watch + batching), store.js
          (layout.json / notes.json writes), edits-store.js + edit-rules.js (edits.json writes)
ui/       index.html, main.js (wiring + live reload), state.js, api.js, model.js (rows from the project's config),
          edits.js (patches with their inverses: one undo history for layout.json and edits.json)
ui/canvas/  viewport.js (pan, zoom, fit), board.js (rows), frame.js (one live image), geometry.js, overlay.js
            (selection, handles, tooltip, pins), pointer.js (drag, rotate, resize), keys.js, drop.js
ui/screen/  enter.js (screen mode, layers, zoom, breadcrumb), pointer.js, keys.js, text.js (typing in place),
            layers.js (the layer tree), inspector.js, copy.js (headline fields), marks.js (canvas marks),
            patches.js (edits.json changes, previews, reloads), names.js
ui/panels/  topbar.js, sidebar.js (projects, layers, screens), inspector.js, notes.js, toast.js
ui/styles/  base, topbar, sidebar, canvas, inspector, screen
test/     e2e.js + e2e-edit.js (+ lib/): drives the workspace with one Chrome on a project
```

## Test
```bash
npm test                                   # on a temporary copy of ../assets/template (the Brimpage demo)
node test/e2e.js --project ~/clients/acme  # on another project (its layout.json, notes.json, edits.json are put back)
```
The server runs on a free port with its own temporary project list (never 4400). Never point the test at a
project that is open in a running Mockup Studio: moves made there during the run would be dropped. The test
uses the project's own `puppeteer-core` and `pngjs`, one Chrome at a time, renders run in order. Moves: the
HTTP guards, dragging a lift into `layout.json`, the frame moving, undo / redo, an outside edit of `layout.json`
reloading live (zoom, pan and selection kept), dropping a capture onto an image and undoing it, a note in
`notes.json`, `npm run render` with the move, Reset to config. Editing (editable projects): double-click the
phone into screen mode, type a title in place (Enter saves, Esc cancels), a colour swatch, Hide, an arrow
nudge (the lifted card in another image follows), undo / redo, a headline typed in place and in the
inspector, one history across `layout.json` and `edits.json`, `npm run render` and `npm run vector` showing
every edit (the SVG has the new words as text), Reset element / screen / copy, a hand edit of `edits.json`
reloading the frames, and a screenshots project explaining instead of entering. It saves the screenshots
`workspace.png` and `editing.png` in `../assets/template/out/qa/workspace/` (git-ignored) after a run on the
temporary copy, or in the project's `out/qa/workspace/` with `--project`; the run's last line prints the path.

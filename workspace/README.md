# Store Studio

A local workspace that shows every store-screenshots project live, like a design canvas, for **preview and
drag only**. Every App Store, Google Play, web and brand image of a project sits on one infinite canvas as
a live page of the project's own engine. Move, rotate and resize elements by hand. Text, colours and new
layouts are still changed by Claude in the project files, and the board refreshes by itself when they change.

```
┌ Store Studio  Projects / Brimpage   All · App Store · Google Play · Web · Brand        EN ▾  ● Live ┐
│ PROJECTS      │  App Store  iPhone 6.9" · 1320×2868                    Brand board │ SELECTED       │
│ ■ Brimpage     │  ┌────┐ ┌────┐ ┌────┐                                  ┌────────┐ │ lift · streak  │
│ LAYERS        │  │ 01 │ │ 02 │ │ 03 │                                  │        │ │ X 1010  Y 410  │
│ phone · home  │  └────┘ └────┘ └────┘                                  └────────┘ │ W 520   R 4°   │
│ lift · streak │  Google Play  Phone · 1080×1920        Feature graphic            │ Reset to config│
│ SCREENS       │  ┌────┐ ┌────┐ ┌────┐  ┌───────────┐                              │ Apply to all   │
│ [home][entry] │  └────┘ └────┘ └────┘  └───────────┘           − 48% + · fit      │ stores         │
└───────────────┴───────────────────────────────────────────────────────────────────┴────────────────┘
```

## Start
```bash
cd workspace
npm install                                   # no dependencies: node:http, fs.watch and server-sent events
npm start -- ~/clients                        # a folder of projects (searched two levels deep)
npm start -- ~/clients/acme ~/clients/fenna   # or project folders (each has a studio.config.js)
npm start                                     # the projects from last time (workspace.json)
```
It prints the URL (default `http://127.0.0.1:4400/`, `--port 4410` for another, a free one if busy) and
binds 127.0.0.1 only. The registered projects are remembered per user, never in this folder (they are
local paths): `~/.config/store-studio/workspace.json` (`$XDG_CONFIG_HOME`, or `%APPDATA%` on Windows);
`--state <file>` uses another file. `--forget <slug>` drops one, `--reset` starts the list over. Node 18 or
newer. A project needs its own `npm install` (its engine and fonts are what the board shows).

## Use it
| do | how |
|---|---|
| pan | scroll or two-finger drag; Space + drag; middle button; drag on empty canvas |
| zoom | pinch, or Cmd/Ctrl + scroll; `+` `-`; the zoom chip (− % + · fit); `Shift+1` fit all; `Cmd/Ctrl+0` 100 % |
| select | click an element (blue box); click an image to list its layers; layers in the sidebar |
| move | drag the element (Shift locks the axis); arrow keys nudge 1, Shift + arrow 10 |
| resize / rotate | corner handles keep the aspect; the round knob rotates (Shift snaps to 15°) |
| exact values | type X, Y, W, R, Z, Radius in the inspector, Enter |
| undo / redo | Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z (or Ctrl+Y) |
| add a device | drag a capture from Screens onto an image (green target); Delete removes an added one |
| one store vs all | a move applies to the image's store; **Apply to all stores** makes it the rule for every store |
| back to the config | **Reset to config** removes the override (for this store and "all stores") |
| ask Claude | pin a note to an element or image in the inspector; it goes to the project's `notes.json` |
| filter | tabs All · App Store · Google Play · Web · Brand; the locale picker reloads every image in that language |

Each move is saved at once to the project's `layout.json` (toast: "Saved position → layout.json"). The
project's renders read the same file, so `npm run render` and `npm run export` produce what you see.
When the moves are final, Claude runs `npm run bake` in the project: the positions are written into
`studio.config.js` and `layout.json` is emptied. The file format is documented in the template README
("Store Studio") and in `assets/template/scripts/lib/layout.js`.

## How it works
- **Serving**: each registered project's root is served under `/p/<slug>/`. The engine loads every file
  relative to its own location (`engine/core/root.js`), so its pages run unchanged under that prefix.
  `/p/<slug>/raw/index.json` lists the captures (no 404 probing), a missing `layout.json` answers 204,
  and `cookies*.json` / `headers*.json` (capture login files) are never served.
- **Live images**: every image is an iframe of the project's own page (`engine/panel.html`,
  `feature.html`, the brand board) at its native size, scaled with a CSS transform. Images load when they
  come near the screen.
- **Live files**: `fs.watch` on `studio.config.js`, `layout.json`, `notes.json`, `brand/`, `screens/`,
  `raw/`, `briefs/`, `engine/` and `scripts/` -> server-sent events -> only that project's frames reload,
  double-buffered (the new page renders behind the old one, then swaps), so zoom, pan and the selection stay.
  A config change that adds or removes images rebuilds the rows; one with an error shows a red banner and
  keeps the last good board. The workspace's own writes do not trigger a reload.
- **Edit bridge**: with `?edit=1` the engine tags every stage element (`data-el` = its id) and posts each
  element's box, its config values and the config-to-pixel mapping to the workspace (`engine/core/edit.js`).
  A drag sends `{ ss: 'set' }` back and the page redraws that one element with the same code a render uses.
  Mirrored RTL layouts and panorama strips (global x) are handled by that mapping.
- **Writes**: `POST /api/layout` and `POST /api/notes` change only `layout.json` / `notes.json`, only inside
  a registered project, only known keys and finite numbers. Requests must name this server in `Host` and,
  for writes, come as JSON from this page's origin, so no other web page can write into a project.

## Files
```
server/   index.js (CLI, start), app.js (routes), registry.js (workspace.json), files.js (static, traversal-safe),
          watch.js (fs.watch + batching), store.js (layout.json / notes.json writes)
ui/       index.html, main.js (wiring + live reload), state.js, api.js, model.js (rows from the project's config),
          edits.js (layout patches, undo / redo)
ui/canvas/  viewport.js (pan, zoom, fit), board.js (rows), frame.js (one live image), geometry.js, overlay.js
            (selection, handles, tooltip, pins), pointer.js (drag, rotate, resize), keys.js, drop.js
ui/panels/  topbar.js, sidebar.js (projects, layers, screens), inspector.js, notes.js, toast.js
ui/styles/  base, topbar, sidebar, canvas, inspector
test/     e2e.js (+ lib/): drives the workspace with one Chrome on a real project
```

## Test
```bash
npm test                                   # on ../assets/template (the Brimpage demo; captures it first if raw/ is empty)
node test/e2e.js --project ~/clients/acme  # on another project
```
The test moves things in the project it drives and restores the project's `layout.json` and `notes.json`
from its backup at the end. Never point it at a project that is open in a running Store Studio (yours or
the person's): moves made there during the run would be dropped. Test on a copy of the project instead.
The test uses the project's own `puppeteer-core` and `pngjs`, one Chrome at a time, renders run in order:
it checks the HTTP guards, drags a lift and reads `layout.json`, checks the frame moved, undo / redo, an
outside edit of `layout.json` reloading the frame live (with zoom, pan and selection kept), dropping a capture
onto an image and undoing it, a note in `notes.json`, `npm run render` producing the moved element, and
Reset to config. It saves `out/qa/workspace/workspace.png` in the project and restores the project's own
`layout.json` and `notes.json` exactly.

# Store Studio: the live workspace

Store Studio is a small local app that ships with the skill (`<skill>/workspace/`). It shows every image
of every studio project live on one canvas, like a design tool: App Store and Google Play rows, the
feature graphic, the web targets and the brand board. It is for **preview and drag only**. The person
can move, rotate and resize elements, drop a screen onto an image, and pin notes for Claude. Text,
colours and new layouts are still changed by Claude in the project files; the board refreshes by itself
within about a second when they change.

![Store Studio](../docs/workspace.jpg)

## Start it
```bash
cd ~/.claude/skills/store-screenshots/workspace
npm install                                   # no dependencies: node:http, fs.watch and server-sent events
npm start -- ~/store-projects/my-app           # one project (a folder with studio.config.js)
npm start -- ~/store-projects                 # or a folder of projects (searched two levels deep; a project
                                              # made there later shows up when the page is reloaded)
npm start                                     # the projects from last time
```
- It prints the URL (default `http://127.0.0.1:4400/`; `--port 4410` for another, a free one if busy) and
  binds 127.0.0.1 only.
- Registered projects are remembered per user, outside the skill folder (it holds local paths):
  `~/.config/store-studio/workspace.json` (`$XDG_CONFIG_HOME/store-studio/`, `%APPDATA%\store-studio\` on
  Windows). `--state <file>` uses another file (tests use a temporary one); `--forget <slug>` drops one
  project, `--reset` starts the list over.
- Each project needs its own `npm install` first: the board shows the project's own engine and fonts.
- Offer it to the person after the first full render: "Want to see every image live and nudge things by
  hand? Run ... and open the URL."

## What the person can do
| do | how |
|---|---|
| pan, zoom | scroll or drag the empty canvas; pinch or Cmd/Ctrl + scroll; Shift+1 fits all |
| select | click an element (blue box with handles), or pick it in the Layers list |
| move | drag (Shift locks the axis); arrow keys nudge 1, Shift + arrow 10 |
| resize, rotate | corner handles; the round knob rotates (Shift snaps to 15 degrees) |
| exact values | type X, Y, W, R, Z, Radius in the inspector, then Enter |
| undo, redo | Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z |
| add a device | drag a capture from Screens onto an image |
| one store or all | a move applies to that image's store; **Apply to all stores** makes it the rule for every store |
| back to the config | **Reset to config** removes the override |
| ask Claude | pin a note to an element or an image; it goes to the project's `notes.json` |
| filter | tabs All, App Store, Google Play, Web, Brand; the locale picker reloads every image in that language |

## layout.json and notes.json
Every move is saved at once to `layout.json` in the project root; the engine applies it right after the
config is resolved, for the live preview AND for every render, so `npm run render` and `npm run export`
produce exactly what the workspace shows. Notes pinned for Claude go to `notes.json`. Both formats (keys:
store or `"*"`, then the config panel number, then the element id; values in config units; `of`
fingerprints; `add`) are in the template README, "Store Studio: preview and drag".

## How Claude works with it (rules)
1. **Read `layout.json` and `notes.json` BEFORE changing any layout.** The person may have moved things.
2. **Never re-type a position that `layout.json` overrides:** the override wins anyway, so the edit seems
   to do nothing. Either edit `layout.json` itself, or bake first.
3. **Act on each open note**, then set its `"done": true`. Answer in the chat what you changed.
4. **Bake when the person is happy:** `npm run bake -- --dry` (shows the plan), then `npm run bake`. It
   writes the moves into `studio.config.js` (numbers changed in place, comments and formatting kept; a
   per-store move becomes `{ appstore: 980, default: 1000 }`; added elements are appended with their id),
   re-imports the config and checks that every element of every store, locale and panel lands exactly
   where it did, keeps a backup in `out/bake/`, and empties `layout.json`. Anything it cannot write safely
   (a per-store radius, a computed value) stays in `layout.json` and is listed.
5. **Before reordering a stage** that has overrides, give its elements an `id: 'hero'` first: overrides
   are keyed by id or position.
6. **Never run tests or scripts that write `layout.json` in a project the person has open** in Store
   Studio: the workspace test restores its backup of `layout.json` at the end, which drops any move the
   person made during the run. Test on a copy of the project.

## How it works
- The server serves each registered project under `/p/<slug>/`. Every image is an iframe of the
  project's own engine page (`engine/panel.html`, `feature.html`, the brand board) at its native size,
  scaled with CSS. Images load when they come near the screen. The engine finds screens through one
  listing (`/p/<slug>/raw/index.json`) instead of probing every name, and a missing `layout.json` answers
  204, so the browser console shows only real errors.
- `fs.watch` on `studio.config.js`, `layout.json`, `notes.json`, `brand/`, `screens/`, `raw/`, `briefs/`,
  `engine/` and `scripts/` sends server-sent events; only that project's frames reload, double-buffered,
  so zoom, pan and the selection stay. A config with an error shows a red banner and keeps the last board.
- With `?edit=1` the engine tags every stage element, posts its box and config values to the workspace,
  and redraws a dragged element live with the same code a render uses (`engine/core/edit.js`). RTL
  layouts and panorama strips are handled by the same mapping.
- Writes (`POST /api/layout`, `POST /api/notes`) change only `layout.json` and `notes.json`, only inside a
  registered project, only known keys and finite numbers, only from the workspace's own page.

## Test
```bash
cd <skill>/workspace
npm test                                          # drives the template's Brimpage demo with one Chrome
node test/e2e.js --project ~/store-projects/copy-of-my-app      # any project (use a copy, rule 6)
```
22 checks: HTTP guards, drag and `layout.json`, undo and redo, an outside edit reloading live, drop a
screen, a note, the render showing the move, Reset to config. It keeps its project list in a temporary
`--state` file, captures the demo's mock screens first when `raw/` is empty, restores the project's own
`layout.json` and `notes.json` at the end and saves `out/qa/workspace/workspace.png` in the project.

## Limits
- An element dragged so its centre leaves its image can only be selected again from the Layers list.
- Projects copied from a template older than the workspace do not load under `/p/<slug>/`.
- The workspace never edits copy, colours or the config itself: that is Claude's job.

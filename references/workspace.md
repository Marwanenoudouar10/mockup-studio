# Mockup Studio: the live workspace

Mockup Studio is a small local app that ships with the skill (`<skill>/workspace/`). It shows every image
of every project live on one canvas, like a design tool: App Store and Google Play rows, the feature
graphic, the web targets and the brand board. Every image is the project's own engine page, so what the
person sees is what `npm run render` produces. The person can:
- move, rotate and resize stage elements, drop a screen onto an image, pin notes for Claude (`layout.json`,
  `notes.json`), in both project types;
- retype headlines and sub lines in place (`edits.json`, both types);
- in an **editable** project (`screens: { mode: 'live' }`, `editable.md`), enter a screen and edit the text,
  colours, size, position and visibility of the elements INSIDE it (`edits.json`).
New layouts, new screens and brand changes stay Claude's job, in the files; the board refreshes by itself
within about a second when they change.

![Mockup Studio](../docs/workspace.jpg)
![Editing inside a screen](../docs/editing.jpg)

## Start it
```bash
cd ~/.claude/skills/mockup-studio/workspace
npm install                                   # no dependencies: node:http, fs.watch and server-sent events
npm start -- ~/store-projects/my-app          # one project (a folder with studio.config.js)
npm start -- ~/store-projects                 # or a folder of projects (searched two levels deep; a project
                                              # made there later shows up when the page is reloaded)
npm start                                     # the projects from last time
```
- It prints the URL (default `http://127.0.0.1:4400/`; `--port 4410` for another, a free one if busy) and
  binds 127.0.0.1 only. If a Mockup Studio is already running for the person, leave it alone: start a
  second one on another port, with its own project list, for your own checks:
  `npm start -- <copy of the project> --port 4410 --state <scratch>/workspace.json`. Without `--state` the
  copy joins the person's list in `~/.config/mockup-studio/workspace.json` (and stays there after it is
  deleted), and two servers writing that file overwrite each other.
- Registered projects are remembered per user, outside the skill folder (it holds local paths):
  `~/.config/mockup-studio/workspace.json` (`$XDG_CONFIG_HOME/mockup-studio/`, `%APPDATA%\mockup-studio\`
  on Windows). A list kept under the workspace's earlier name is copied over once, on the first start.
  `--state <file>` uses another file (tests use a temporary one); `--forget <slug>` drops one project,
  `--reset` starts the list over.
- Each project needs its own `npm install` first: the board shows the project's own engine and fonts.
- After a skill update that changed the workspace, restart it (Ctrl+C, `npm start`): a page reload alone
  keeps the old server.
- Offer it to the person after the first full render: "Want to see every image live and change things by
  hand? Run ... and open the URL."

## What the person can do
| do | how |
|---|---|
| pan, zoom | scroll or drag the empty canvas; pinch or Cmd/Ctrl + scroll; Shift+1 fits all |
| select | click an element (blue box with handles), or pick it in the Layers list |
| move | drag (Shift locks the axis); arrow keys nudge 1, Shift + arrow 10 |
| resize, rotate | corner handles; the round knob rotates (Shift snaps to 15 degrees) |
| exact values | type X, Y, W, R, Z, Radius in the inspector, then Enter |
| retype a headline | double-click it (Enter saves, Shift+Enter breaks the line, Esc cancels), or the inspector's Headline and Sub line fields (`<em>` = the accent word) |
| undo, redo | Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z: one history for moves and edits |
| add a device | drag a capture from Screens onto an image |
| one store or all | a move applies to that image's store; **Apply to all stores** makes it the rule for every store |
| back to the config | **Reset to config** removes the override |
| ask Claude | pin a note to an element or an image; it goes to the project's `notes.json` |
| filter | tabs All, App Store, Google Play, Web, Brand; the locale picker reloads every image in that language |

**Inside a screen (editable projects only):**
| do | how |
|---|---|
| enter | double-click a phone, tablet, browser, lift or tile (or select it and press Enter, or **Edit screen**); the view zooms in, fades the rest of the image and hides the cards floating over the screen (they come back on leave) |
| select | click an element of the screen, or a row of the layer tree in the sidebar (edited layers have a dot) |
| type | double-click a text (or Enter): typed in place in the real font; Enter saves, Esc cancels |
| colour, fill | swatches from the screen's brand and kit tokens (saved as the token name), a custom colour, × for the screen's own |
| size, weight, nudge | the inspector's Type and Nudge fields; arrows 1 px, Shift + arrow 10 px; drag nudges too |
| hide | **Hide** / **Show** (Shift+Cmd/Ctrl+H): the space stays |
| reset | **Reset element**, **Reset screen** |
| leave | Esc, **Done**, or a click outside the screen |

Each change shows at once in every image with that screen; images whose lifts or tiles cut that screen
reload one after another, so lifted cards show it too. In a **screenshots** project a double-click on a
screen explains that its content is fixed (the screen is a capture); moves and headlines work as usual.
A screen that is a real capture in an editable project (no page in `screens/`) cannot be entered either.

## The files it writes
| file | what | format |
|---|---|---|
| `layout.json` | moves, sizes, rotations, added devices | the template README, "Mockup Studio" |
| `edits.json` | text and colours inside screens, headlines and sub lines, badge texts | `editable.md` |
| `notes.json` | notes pinned for Claude | the template README |

Every change is saved at once; the engine applies all three right after the config is resolved, for the
live board AND for every render, capture and vector export, so `final/` matches what the person sees.

## How Claude works with it (rules)
1. **Read `layout.json`, `edits.json` and `notes.json` BEFORE changing any layout, screen or copy.** The
   person may have moved or retyped things.
2. **Never re-type a value that an override holds:** the override wins, so the change seems to do nothing.
   Edit the override itself, or bake first.
3. **Act on each open note**, then set its `"done": true`. Say in the chat what you changed.
4. **Bake when the person is happy:** `npm run bake -- --dry` (shows the plan), then `npm run bake`. It
   writes the moves and the copy edits (headlines, subs, badge texts) into `studio.config.js` (numbers and
   texts changed in place, comments and formatting kept; a per-store move becomes
   `{ appstore: 980, default: 1000 }`; added elements are appended with their id), re-imports the config
   and checks that every element of every store, locale and panel lands exactly where it did with the same
   words, keeps a backup in `out/bake/`, and removes what it folded. Anything it cannot write safely stays
   and is listed. Screen edits stay in `edits.json` (the kit applies them on every render).
5. **When you rewrite a screen element that has an edit, fold the edit into the HTML and delete it from
   `edits.json`** (`editable.md`, "Rules for Claude").
6. **Before reordering a stage** that has overrides, give its elements an `id: 'hero'` first: overrides are
   keyed by id or position.
7. **Never run tests or scripts that write `layout.json` or `edits.json` in a project the person has open**
   in Mockup Studio: the workspace test puts its backups back at the end, which drops any change the
   person made during the run. Test on a copy of the project.

## How it works
- The server serves each registered project under `/p/<slug>/`. Every image is an iframe of the project's
  own engine page (`engine/panel.html`, `feature.html`, the brand board) at its native size, scaled with
  CSS; images load when they come near the screen.
- `fs.watch` on the config, `layout.json`, `edits.json`, `notes.json`, `brand/`, `screens/`, `raw/`,
  `briefs/`, `engine/` and `scripts/` sends server-sent events; only that project's frames reload,
  double-buffered, so zoom, pan, the selection and screen mode stay. A config with an error shows a red
  banner and keeps the last board.
- With `?edit=1` the engine tags every stage element and posts its box to the workspace
  (`engine/core/edit.js`); inside a screen, `engine/core/edit-screen.js` maps each element of the live
  screen exactly onto the image, rotated and scaled lifts included.
- Writes (`POST /api/layout`, `/api/notes`, `/api/edits`) change only those three files, only inside a
  registered project, only known keys and checked values, only as JSON from the workspace's own page.
- Every detail (keys, files, the bridges): `workspace/README.md`.

## Test
```bash
cd <skill>/workspace
npm test                                          # on a temporary copy of the template's Brimpage demo
node test/e2e.js --project ~/store-projects/copy-of-my-app      # any project (use a copy, rule 7)
```
50 checks with one Chrome, on a free port and a temporary project list (never 4400): the HTTP guards,
moves and `layout.json`, undo and redo, live reloads, dropping a screen, a note, the render showing the
move, Reset to config; then (editable projects) entering a screen, typing in place, a colour swatch, Hide,
a nudge that the lifted card follows, a headline typed in place, one history across both files, the render
and `npm run vector` showing every edit, Reset element and screen, and a screenshots project that
explains instead of entering. It saves the screenshots `workspace.png` and `editing.png` in the skill's
`assets/template/out/qa/workspace/` (git-ignored) when it ran on the temporary copy, else in the project's
`out/qa/workspace/`; the last line of the run prints the path.

## Limits
- Typing into a text with mixed content (a bold word inside a line) changes only its first run of words.
- A headline edit applies to that panel in every store, in the language shown. The other languages keep
  their words and are marked "not updated" (`stale` in `edits.json`): the save message and the inspector
  say so, validate warns, until each is retyped there or kept with "Keep as is".
- Badge texts can be stored in `edits.json` (`stage`), but the inspector has no field for them yet.
- A selected phone's rotate knob can sit over the headline: double-click the headline away from it.
- An element dragged so its centre leaves its image can only be selected again from the Layers list.
- Projects copied from a template older than the workspace do not load under `/p/<slug>/`.
- The workspace never writes the config itself, the screens or the brand: that is Claude's job (bake
  folds the overrides in).

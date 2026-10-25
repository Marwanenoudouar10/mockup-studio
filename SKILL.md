---
name: mockup-studio
description: >-
  Make studio-quality mockups in code (HTML/CSS rendered by Chrome): App Store and Google Play screenshot
  sets in every store size and language (ASO screenshots, the Play feature graphic, app icons), device
  mockups, web and social images (Open Graph, X, Product Hunt, landing heroes, portfolio covers) and brand
  boards. Works from screenshots of an existing app or site, or designs the brand and app UI mockups from
  a description. Projects can be editable: live screens whose text and colours change in Mockup Studio, a
  local Figma-like workspace, plus layered SVG for Figma and PDF for print. Use it whenever the user wants
  App Store or Play Store screenshots, marketing screenshots, device or website mockups, a feature
  graphic, social images, a brand board, editable or Figma-ready mockups, screenshot localization, or to
  "make my app look good in the store", even without saying "skill". Not for app preview videos or editing
  the app's own UI code.
---

# Mockup Studio

Make the images an app or a website needs to sell itself: App Store and Google Play screenshot sets, the
Play feature graphic, store icons, device mockups, web and social images, brand boards, all from HTML/CSS
layouts rendered by the user's own Chrome. One file describes a project (`studio.config.js`), so every
store size and language comes from the same design. Projects are **editable** (the mock screens are drawn
live: editable in Mockup Studio, exported as layered SVG for Figma and PDF for print) or **screenshots**
(real captures as PNGs). The method comes from a real client project; its mistakes are in
`references/lessons.md`.

Keep the steps in order. Brand first, then screens, then copy, then layout: most rework comes from
changing an earlier step after a later one was built (new colours mean new screens and new renders).

## What you deliver
- `final/<locale>/<target>/01.png ...`: upload-ready images at the exact store sizes, 24-bit RGB, no alpha.
- `final/<locale>/playstore/feature-graphic.png` (1024x500) and `final/icons/` (App Store 1024, Play 512).
- `final/<locale>/overview-<target>.jpg`: overview sheets (up to 3840 px wide) to present the set.
- `final/brand/`: the approved brand board, logo and mark PNGs (when the brand was part of the job).
- Editable projects, when asked: `final/vector/<locale>/<target>/01.svg` (for Figma) + `01.pdf` (print,
  Illustrator, Affinity). Import one SVG into Figma yourself before promising Figma files (`editable.md`).
- A validation report with 0 problems, and a short delivery note (what was made, what to upload where).

## Two ways in, two project types
Both start with the brand and end with the same layouts, renders and checks. Only Step 2 differs.

| | Mode A: from screenshots | Mode B: from a description |
|---|---|---|
| when | the app exists (live, TestFlight, internal test) or the client sends screenshots | no build: a pre-launch idea, a description, a portfolio concept |
| brand | extract and confirm it: logo file, colours from the app, fonts | design it: palettes, font pairs, logo directions to choose from |
| screens | capture the Simulator, emulator or device into `raw/` (`references/capture.md`) | write an app spec, build mock screens with the kit (`references/mock-screens.md`) |
| project type | **screenshots** (`screens: { mode: 'raster' }`): required for real captures | **editable** (`screens: { mode: 'live' }`): recommended (`references/editable.md`) |

Websites and web apps follow the same two ways: capture a live URL with `npm run capture` (screenshots),
or build pages with the web kit (editable); then browser, laptop and monitor frames (`references/web.md`).
An editable project may also hold real captures: a screen with no page in `screens/` is drawn from `raw/`.

## Step 0: ask first (one or two clicks)
Before creating anything, ask with the **AskUserQuestion** tool: at most 4 questions per call, 2-4 options
each, the recommended option first with "(Recommended)" in its label ("Other" is added for you), two
rounds at most. Skip every question the request already answers. A skipped question takes its default.
The exact JSON for both calls is in `references/intake.md`.

**Round 1**
| header | question | options (first = recommended) | multi |
|---|---|---|---|
| Making | What are we making store images for? | An existing app · An app that is not built yet · A website or web app · App and website | no |
| Targets | Which stores and places are the images for? | App Store · Google Play (both recommended) · iPad · Web and desktop | yes |
| Languages | Which languages? | English · French · Arabic (RTL) · Spanish | yes |
| Images | How many images per store? | 5 · 3 · 8 · 10 | no |

**Round 2** (Mode B: Type replaces Output)
| header | question | options (first = recommended) | multi |
|---|---|---|---|
| Brand | What do we have for the brand? | Use the existing brand (first for an existing app) · Logo only · Create a new brand (first for an app not built yet) | no |
| Look | Which visual direction? | Bold and bright · Dark and premium · Calm and soft · Clean and light | no |
| Tone | What tone for the headlines? | Short and benefit-led · Playful · Formal | no |
| Output | Where should I create the project, and what should the delivery include? | New folder, standard delivery · New folder, plus hi-res copies · Inside the app's repo | no |
| Type | Editable project or screenshots? | Editable · Editable, plus Figma and hi-res files · Screenshots | no |

**Type** is asked only when the screens will be mock screens (Mode B, or web pages built with the kit):
real captures can only be screenshots. Editable = live screens, sharp at any size, text and colours
editable in Mockup Studio, layered SVG/PDF on request; screenshots = the mock screens captured once as
PNGs, only when the person asks for that. Type takes Output's place in Mode B: there is no app repo, the
folder is a new one, and its second option carries the extra files.

**Defaults:** Mode A if the request names an existing app (a URL means a website), else Mode B; App
Store + Google Play; English; 5 images; existing brand in Mode A, new brand in Mode B; bold and bright;
short and benefit-led; `~/store-projects/<app-slug>`, standard delivery; editable in Mode B, screenshots
in Mode A.

Then show a one-screen summary (project, mode, type, targets, languages, images, brand, look, tone,
folder, next step) and start Step 1. The answers go into `briefs/brand-brief.md` (+ the description in
`briefs/app-spec.md` in Mode B), `briefs/copy.md` (tone) and `studio.config.js` (`screens.mode`,
`locales`, `stores`, one panel per image).

## Set up the project
```bash
SKILL=~/.claude/skills/mockup-studio            # the folder that holds this SKILL.md
NEW=~/store-projects/my-app                     # a NEW folder for the project, never inside the skill
mkdir -p "$(dirname "$NEW")" && cp -R "$SKILL/assets/template" "$NEW" && cd "$NEW"
rm -rf node_modules final out raw layout.json notes.json edits.json   # leftovers from testing the skill
find examples -name '*.layout.json' -delete -o -name '*.edits.json' -delete
npm install                                     # Node 18+; uses the installed Chrome (CHROME_PATH to override)
npm run export                                  # toolchain check, about 40 s: read final/en/overview-appstore.jpg
# start clean: the demo's renders, captures, mock screens and brand files must never reach the client
rm -rf final out raw screens/web brand/logo-options brand/logo.svg brand/mark.svg brand/icon.svg brand/tokens.json
find screens -maxdepth 1 -name '*.html' -delete && echo '{}' > screens/strings.json   # demo screens + translations
mv CLAUDE.template.md CLAUDE.md                 # fill its TODOs: agents read this file, not the skill
git rev-parse --is-inside-work-tree >/dev/null 2>&1 \
  || { git init -q && git add -A && git commit -qm "Start from the mockup-studio template"; }
```
The template is a working demo ("Brimpage", an invented journaling app with a web app, editable); the
check renders it once, then the clean-up keeps the engine, the kits (`screens/kit/`), the briefs and
`studio.config.js`, whose demo values you replace step by step. Set `screens.mode` now: `'raster'` in Mode
A, `'live'` (the demo's) in Mode B; replace `screens/app.css` (the demo app's styles) in Mode B. Inside
the app's own repo the last line makes no nested repo. The demo stays readable in
`$SKILL/assets/template/`; the template's `README.md` is the full config reference.

## Resume a project
Read `CLAUDE.md` ("Project notes"), the briefs, then `layout.json`, `edits.json` and `notes.json` (what the
person changed in Mockup Studio). Run `git status --short` and `npm run validate`. Continue from the first
step that is not done; never restart at Step 0.

## The pipeline
**Step 1: Brand** (`references/brand.md`). Brief -> colours -> fonts -> logo + icon -> brand board.
First write the app's name in `briefs/brand-brief.md` (Name, One-liner, Hero line) and in
`studio.config.js` (`brand.name`): every board prints it until a logo exists. An invented name is checked
in both stores AND against the category leaders (no shared prefix or ending, not their colour: `brand.md`).
```bash
npm run brand -- palette --seed "#6C5CE7" --mood warm      # 3 palettes with contrast checks -> out/brand/palette/
npm run brand -- apply --palette 1                          # brand/tokens.json: the one source of colours and fonts
npm run brand -- fonts --pairs "Poppins/Inter,Newsreader/Inter,Space Grotesk/Inter"   # shown in those colours
npm run brand -- apply --fonts 1
npm run brand -- logos                                      # after drawing brand/logo-options/{a,b,c}.svg + .mark.svg
npm run brand -- apply --logo a                             # logo.svg, mark.svg, icon.svg
npm run brand -- board                                      # final/brand/brand-board.png
```
A dark brief: `palette --look dark --mood electric --theme dark`; a bold brief on a light field: `--look
light`; a client's or the brief's accent: `--accent "#hex"`; a dark-only app also sets `screens: { theme:
'dark' }`. Show each board and let the person choose. Done when the person approves the brand board.
**Quick brand** (no logo step wanted, a fast job): palette, apply, fonts, apply, then
`npm run brand -- apply --logo wordmark` (the name in the display font with an accent dot; its initial is
the symbol and the icon), then the board. Say in the delivery note that it is a placeholder lockup.
**Mode A starts with the captures:** collect the client's screenshots (or capture the app, Step 2) into
`raw/<platform>/` FIRST: they are the brand's source. Seed the palette from a flat control in them (a
filled button, a selected tab: never a gradient or a photo), put the client's logo in
`brand/logo-options/client.svg` + `client.mark.svg` and `apply --logo client`, and show the board on a real
capture: `board --screen today --crop x,y,w,h` (or `--box name` once boxes exist).

**Step 2: Screens.** The demo's screens are gone since setup (`screens/kit/` stays).
- Mode A: plan in `briefs/capture-plan.md`, capture at the largest device with a clean status bar and
  demo data, name the cards to lift in `<name>.boxes.json` (`references/capture.md`).
- Mode B: finish `briefs/app-spec.md` (5-8 screens, one persona, a story map), build `screens/<name>.html`
  with the kit, mark liftable cards with `data-box` and texts the person may edit with `data-id`, then
  `npm run screens` (box warnings, captures for the brand board and Mockup Studio). In an editable project
  the renders draw the pages live, edits included (`references/mock-screens.md`, `editable.md`).
- Websites: `npm run capture -- --url ...`, or `screens/web/<name>.html` (`references/web.md`).
Done when every screen is read and clean, on every platform and language (in a screenshots project every
language but the default has its own captures in `raw/<platform>/<locale>/`; the render warns otherwise).

**Step 3: Story and copy** (`references/design.md`). One benefit per image, hero first, trust last.
Write `briefs/copy.md`: per image and language, a headline (3 lines at most, about 6 words), an optional
sub line, and the proof (screen + card). Check it against `references/policy.md`. Get the words approved
before layout work when copy approval is part of the job.

**Step 4: Layout per panel** (`references/layouts.md`). One `panels[]` entry per image in
`studio.config.js`: copy plus a stage from a proven recipe (hero orbit, macro lift, window, fan, duo, giant
number...). Match the brief's energy and vary the build: a bold brief commits on 2-3 images (strong
diagonals, a bleed, a `text` numeral), and one image breaks the copy position (`copy: 'bottom'`).
Iterate one image at a time: `npm run render -- --store appstore --panel 2 --out out/qa/p2` (N is the
config's panel number, its position in `panels`). A panorama: add `--strip` and read
`out/qa/strip/<locale>-<store>.png`, the set as one picture.

**Step 5: Render.** `npm run export`: every store and language, the feature graphic, icons, validation,
overview sheets, with one Chrome. `--vector` adds the SVG and PDF files (`editable.md`); `--scale 2` adds
hi-res copies (a screenshots project captures larger first: `npm run screens -- --scale 2`). Once those
exist, every change ends with the same export (validate warns about stale ones). Re-render the brand
board from the real screens (`board --screen <name> --box <card>`).

**Step 6: Look and fix.** Read EVERY image: each store size, each language, the feature graphic, both
icons, the sheets. Ask the five questions at the end of `references/design.md`. Fix, re-render that
panel, read it again. Every `warn:` line in the render log is a defect: a card within 40 units of an edge
or a seam, or cut by it (`bleed: true` when on purpose), a sliver of a screen across a seam, the same card
twice on an image, a crop outside its capture, a missing image, a screen or line not translated, a soft
screen, a device top swung off an edge, an accent that vanishes on its field, a lifted card that dissolves
into its field, a feature-graphic card in Google's cutoff zone, a missing logo file, a Play tagline over
20%, an `edits.json` edit skipped. Then tick "The set checklist" in `references/design.md`.

**Step 7: Validate.** `npm run validate` must exit 0 (`--strict` before delivery: every warning fails).
Read every warning (store content, real UI measured on the renders, the render issues above, untranslated
copy, sharpness, stale folders, missing renders, vector files) and fix it or say why it stays.

**Step 8: Deliver** (`references/client-brief.md`). Present the overview sheets first, then deliver the
`final/` folders as a zip with a README (what goes where, upload order, alt texts); editable projects add
`final/vector/` and the Figma notes (`editable.md`). Zip only after a fresh `npm run export`: it removes
folders the config no longer makes. Write the delivery note, delete scratch renders, commit.

## Mockup Studio (preview, drag and edit)
The skill ships a local workspace app, `workspace/` (`references/workspace.md`). It shows every image of
a project live on one canvas; the person can drag, rotate and resize elements, drop a screen onto an
image, retype headlines, pin notes for you and, in an editable project, double-click a device to edit the
text and colours inside its screen. New layouts, screens and brand changes stay your job, in the files.
```bash
cd "$SKILL/workspace" && npm install && npm start -- ~/store-projects/my-app   # prints http://127.0.0.1:4400/
```
Moves land in `layout.json`, edits in `edits.json`, notes in `notes.json`; every render applies them
(rule 19). Act on open notes, then mark them `"done": true`; run `npm run bake` when the person is happy
(moves and copy edits move into `studio.config.js`; screen edits stay in `edits.json`).

## The 20 rules that matter most
1. Ask the Step 0 questions first; never ask what the request already answered.
2. Brand first: no mock screen or store image before the brand board is approved (Mode A's captures
   of the real app come first: they are the brand's source).
3. Colours and fonts change only through `npm run brand -- apply`; never hard-code them.
4. Store sizes come from the target ids; never resize an image after rendering.
5. Upload the iPhone 6.3" set (required) and the 6.9" set; Play gets 4+ images to be eligible for promotion.
6. One benefit per image, proved by its own card (never the same proof on two images); headline 3 lines
   and about 6 words at most; one accent word.
7. The first three images do most of the work: the hero and the two strongest features, all real UI.
   The hero's corners stay clear: three layers at most, badges in open field, never glass on live UI.
8. Most of every set shows the real app (Apple: more than half; Play: the first three).
9. Never: rankings, awards, prices, "free", calls to action, emoji, or another store's names and devices.
10. Lift the card that proves the headline at reading size; never shrink a whole phone to fit more, never
    cover the proof, and keep cards straight (tilt a fan, one accent card, or a bold brief's phones, on purpose).
11. Prefer named boxes (`data-box`, `.boxes.json`) over crop numbers.
12. One demo persona, one "today", the same data and the same clean status bar on every screen; re-do
    every sum and every date sum in the mock data.
13. Mock screens make editable projects; real captures make screenshots projects, captured at the largest
    device (a `... is upscaled` warning is a defect).
14. Keep text and key UI 40 design units inside the edges and the panorama seams (`bleed: true` /
    `bridge: true` mark a cut on purpose), and the feature graphic copy, logo and cards in x 154-872, y 76-424.
15. Render both canvases (tall iPhone and 9:16 Play) before calling a layout done.
16. Every language is localized, screens included (render, screens and validate flag each mock-screen
    string left untranslated, untranslated copy and a borrowed screen); read every RTL image.
17. LOOK at every image you produce before calling it done.
18. A magenta placeholder or a `warn:` line is a bug; `npm run validate` exits 0 before delivery.
19. Read `layout.json`, `edits.json` and `notes.json` before changing a layout, screen or copy; fold an
    edit in when you rewrite its element; bake when the moves are final.
20. No real customer data, real people or private paths in anything shown publicly.

## Output folders
`final/<locale>/<target>/` upload images only · `final/<locale>/overview-<target>.jpg` sheets ·
`final/portfolio/<locale>/<target>/` hi-res copies (never uploaded) · `final/vector/<locale>/<target>/`
SVG + PDF · `final/icons/` · `final/brand/` · `out/brand/<topic>/` option boards · `out/qa/<topic>/`
scratch renders · `out/bake/` config backups. Captures live in `raw/<platform>/[<locale>/]`. Name scratch
folders by what they test, and delete them when done.

## Keep the laptop responsive
- One command at a time. Each render command runs ONE Chrome with one reused page, in order, and closes it.
- Never run two renders, exports or captures in parallel; never start several agents that render.
- Iterate on one image (`--store x --panel N --out out/qa/...`), not the whole export.
- Pages signal when they are ready (`window.__ready`): never add a fixed sleep.
- A full export of the demo takes about 40 s on an idle laptop (about a minute with `--vector`).
- If the person has Mockup Studio running, never stop it; test on a copy of the project, on another port
  and with your own project list: `npm start -- <copy> --port 4410 --state <scratch>/workspace.json`.

## References: read them when the step comes up
| file | read it when |
|---|---|
| `references/intake.md` | Step 0: the exact questions (tool JSON), defaults, where the answers go |
| `references/brand.md` | Step 1: palette method, contrast, font pairs, logo and icon recipes, brand board |
| `references/capture.md` | Step 2, Mode A: Simulator and emulator commands, clean status bars, demo data, boxes |
| `references/mock-screens.md` | Step 2, Mode B: the kit, authoring screens, iOS vs Android conventions |
| `references/editable.md` | editable projects: live screens, `edits.json`, SVG/PDF export, Figma import and limits |
| `references/web.md` | websites and web apps: targets, URL capture, web kit, wide layouts, responsive trio |
| `references/design.md` | Steps 3 and 6: the story of a set, copy rules, consistency, localization, sharpness |
| `references/layouts.md` | Step 4: proven stage recipes with sketches and configs |
| `references/store-specs.md` | choosing targets, and before delivery: every size, format, count and limit, with sources |
| `references/policy.md` | Step 3 and Step 7: what the stores allow on the images, the pre-delivery checklist |
| `references/workspace.md` | Mockup Studio, or when `layout.json`, `edits.json` or `notes.json` exist |
| `references/client-brief.md` | a paying client: what to ask for, revision rounds, presenting, delivery naming |
| `references/lessons.md` | before the first render, and whenever an image looks wrong |

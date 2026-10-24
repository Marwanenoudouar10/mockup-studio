---
name: store-screenshots
description: >-
  Make studio-quality App Store and Google Play screenshot sets entirely in code (HTML/CSS rendered by
  headless Chrome): store listing and ASO screenshots in every store size and language, the Play
  feature graphic, app icons and a brand board, validated against the current store rules. Two ways in:
  screenshots of an existing app, or an app that only exists as a description (brand, logo and mock app
  screens designed first). Also websites and web apps: browser, laptop and responsive device mockups,
  Open Graph and social images, Product Hunt gallery, Chrome Web Store and Mac App Store images, landing
  heroes and portfolio covers. Use it whenever the user wants App Store or Play Store screenshots, store
  listing or marketing screenshots, app preview images, device mockups, a feature graphic, screenshot
  localization, or to "make my app look good in the store", even without saying "skill". Not for app
  preview videos or editing the app's own UI code.
---

# Store screenshots

Make the images an app or a website needs to sell itself: App Store and Google Play screenshot sets,
the Play feature graphic, store icons, web and social images, all from HTML/CSS layouts rendered by the
user's own Chrome. One file describes a project (`studio.config.js`), so every store size and language
comes from the same design. The method comes from a real client project (a full App Store and Google
Play set in two languages); its mistakes are written down in `references/lessons.md`.

Keep the steps in order. Brand first, then screens, then copy, then layout: most rework comes from
changing an earlier step after a later one was built (new colours mean new screens and new renders).

## What you deliver
- `final/<locale>/<target>/01.png ...`: upload-ready images at the exact store sizes, 24-bit RGB, no alpha.
- `final/<locale>/playstore/feature-graphic.png` (1024x500) and `final/icons/` (App Store 1024, Play 512).
- `final/<locale>/overview-<target>.jpg`: overview sheets (up to 3840 px wide) to present the set.
- `final/brand/`: the approved brand board, logo and mark PNGs (when the brand was part of the job).
- A validation report with 0 problems, and a short delivery note (what was made, what to upload where).

## Two ways in
Both start with the brand and end with the same layouts, renders and checks. Only Step 2 differs.

| | Mode A: from screenshots | Mode B: from a description |
|---|---|---|
| when | the app exists (live, TestFlight, internal test) or the client sends screenshots | no build: a pre-launch idea, a description, a portfolio concept |
| brand | extract and confirm it: logo file, colours from the app, fonts | design it: palettes, font pairs, logo directions to choose from |
| screens | capture the Simulator, emulator or device into `raw/` (`references/capture.md`) | write an app spec, build mock screens with the kit, `npm run screens` (`references/mock-screens.md`) |

Websites and web apps follow the same two ways: capture a live URL with `npm run capture`, or build web
pages with the web kit; then browser, laptop and monitor frames on wide targets (`references/web.md`).

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

**Round 2**
| header | question | options (first = recommended) | multi |
|---|---|---|---|
| Brand | What do we have for the brand? | Use the existing brand (first for an existing app) · Logo only · Create a new brand (first for an app not built yet) | no |
| Look | Which visual direction? | Bold and bright · Dark and premium · Calm and soft · Clean and light | no |
| Tone | What tone for the headlines? | Short and benefit-led · Playful · Formal | no |
| Output | Where should I create the project, and what should the delivery include? | New folder, standard delivery · New folder, plus hi-res copies · Inside the app's repo | no |

**Defaults:** Mode A if the request names an existing app (a URL means a website), else Mode B; App
Store + Google Play; English; 5 images; existing brand in Mode A, new brand in Mode B; bold and bright;
short and benefit-led; `~/store-projects/<app-slug>` with the standard delivery.

Then show a one-screen summary (project, mode, targets, languages, images, brand, look, tone, folder,
next step) and start Step 1. The answers go into `briefs/brand-brief.md` (+ the description in
`briefs/app-spec.md` in Mode B), `briefs/copy.md` (tone) and `studio.config.js` (`locales`, `stores`, one
panel per image).

## Set up the project
```bash
SKILL=~/.claude/skills/store-screenshots       # the folder that holds this SKILL.md
NEW=~/store-projects/my-app                     # a NEW folder for the project, never inside the skill
mkdir -p "$(dirname "$NEW")" && cp -R "$SKILL/assets/template" "$NEW" && cd "$NEW"
rm -rf node_modules final out raw layout.json notes.json   # leftovers, if the skill folder was ever used to test
npm install                                     # Node 18+; uses the installed Chrome (CHROME_PATH to override)
npm run screens && npm run export               # toolchain check, about 40 s: read final/en/overview-appstore.jpg
# start clean: the demo's renders, captures, mock screens and brand files must never reach the client
rm -rf final out raw screens/web brand/logo-options brand/logo.svg brand/mark.svg brand/icon.svg brand/tokens.json
find screens -maxdepth 1 -name '*.html' -delete && echo '{}' > screens/strings.json   # demo screens + translations
mv CLAUDE.template.md CLAUDE.md                 # fill its TODOs: agents read this file, not the skill
git rev-parse --is-inside-work-tree >/dev/null 2>&1 \
  || { git init -q && git add -A && git commit -qm "Start from the store-screenshots template"; }
```
The template is a working demo ("Brimpage", an invented journaling app with a web app); the check above
renders it once, then the clean-up keeps only the engine, the kits (`screens/kit/`), the briefs and
`studio.config.js`, whose demo values you replace step by step: the brand in Step 1, the screens in Step
2, the copy and panels in Steps 3-4. `screens/app.css` holds the demo app's own styles: replace its
contents in Mode B. Inside the app's own repository (intake "Inside the app's repo") the last line makes
no nested repository: commit with the app's own flow. The demo itself stays readable in
`$SKILL/assets/template/` (its screens are good models). The template's `README.md` is the full config
reference (every key, element and flag).

## Resume a project
Read `CLAUDE.md` ("Project notes"), the briefs, then `layout.json` and `notes.json` (moves and notes the
person made in Store Studio). Run `git status --short` and `npm run validate`. Continue from the first
step that is not done; never restart at Step 0.

## The pipeline
**Step 1: Brand** (`references/brand.md`). Brief -> colours -> fonts -> logo + icon -> brand board.
First write the app's name in `briefs/brand-brief.md` (Name, One-liner, Hero line) and in
`studio.config.js` (`brand.name`): every board prints it, set in each candidate face, until a logo exists.
```bash
npm run brand -- palette --seed "#6C5CE7" --mood warm      # 3 palettes with contrast checks -> out/brand/palette/
npm run brand -- fonts --pairs "Poppins/Inter,Newsreader/Inter,Space Grotesk/Inter"
npm run brand -- apply --palette 1 --fonts 1                # brand/tokens.json: the one source of colours and fonts
npm run brand -- logos                                      # after drawing brand/logo-options/{a,b,c}.svg + .mark.svg
npm run brand -- apply --logo a                             # logo.svg, mark.svg, icon.svg
npm run brand -- board                                      # final/brand/brand-board.png
```
A dark brief: `palette --look dark --mood electric --theme dark` (three dark options); a client's or the
brief's accent: `--accent "#hex"`; a dark-only app also sets `screens: { theme: 'dark' }` in the config.
Show each board and let the person choose. Done when the person approves `final/brand/brand-board.png`.
**Mode A starts with the captures:** collect the client's screenshots (or capture the app, Step 2) into
`raw/<platform>/` FIRST: they are the brand's source. Seed the palette from a flat control in them (a
filled button, a selected tab: never a gradient or a photo), put the client's logo in
`brand/logo-options/client.svg` + `client.mark.svg` and `apply --logo client` (skip the logo board), and
show the board on a real capture: `board --screen today --crop x,y,w,h` (or `--box name` once boxes exist).

**Step 2: Screens.** The demo's screens are gone since setup (`screens/kit/` stays).
- Mode A: plan in `briefs/capture-plan.md`, capture at the largest device with a clean status bar and
  demo data, name the cards to lift in `<name>.boxes.json` (`references/capture.md`).
- Mode B: finish `briefs/app-spec.md` (5-8 screens, one persona, a story map), build `screens/<name>.html`
  with the kit, mark liftable cards with `data-box`, then `npm run screens` (`references/mock-screens.md`).
- Websites: `npm run capture -- --url ...`, or `screens/web/<name>.html` (`references/web.md`).
Done when every capture is read and clean, on every platform and language (every language but the
default has its own captures in `raw/<platform>/<locale>/`; the render warns `screen ... is not
localized` otherwise).

**Step 3: Story and copy** (`references/design.md`). One benefit per image, hero first, trust last.
Write `briefs/copy.md`: per image and language, a headline (3 lines at most, about 6 words), an optional
sub line, and the proof (screen + card). Check it against `references/policy.md`. Get the words approved
before layout work when copy approval is part of the job.

**Step 4: Layout per panel** (`references/layouts.md`). One `panels[]` entry per image in
`studio.config.js`: copy plus a stage from a proven recipe (hero orbit, macro lift, window, fan, duo...).
Iterate one image at a time: `npm run render -- --store appstore --panel 2 --out out/qa/p2` (N is the
config's panel number, its position in `panels`; a wide target's image 01 may be panel 6). A panorama:
add `--strip` and read `out/qa/strip/<locale>-<store>.png`, the set as one picture.

**Step 5: Render.** `npm run export`: every store and language, the feature graphic, icons, validation,
overview sheets, with one Chrome. Hi-res portfolio copies: `npm run screens -- --scale 2` (or captures
from a larger device), then `npm run export -- --scale 2`; once they exist, every change ends with that
export again (sheets skip stale copies and validate warns). Re-render the brand board from the real
captures (`board --screen <name> --box <card>`), so board and set show one brand.

**Step 6: Look and fix.** Read EVERY image: each store size, each language, the feature graphic, both
icons, the sheets. Ask the five questions at the end of `references/design.md`. Fix, re-render that
panel, read it again. Every `warn:` line in the render log is a defect: a card within 40 units of an
edge or a panorama seam, or cut by it (`bleed: true` when the cut is on purpose), a sliver of a screen
across a seam, the same card twice on an image, a crop outside its capture, a missing image, a screen
or a line not translated, an empty panorama image, a soft screen. Then go through "The set checklist"
in `references/design.md`: validate checks the files, the checklist checks the set.

**Step 7: Validate.** `npm run validate` must exit 0 (`--strict` before delivery: every warning fails).
Read every warning (store content, real UI measured on the renders, the render issues above, untranslated
copy, sharpness, stale folders, missing renders) and fix it or say why it stays.

**Step 8: Deliver** (`references/client-brief.md`). Present the overview sheets first, then deliver the
`final/` folders as a zip with a README (what goes where, upload order, alt texts). Zip only after a
fresh `npm run export`: it removes folders the config no longer makes (a dropped language or target),
and validate warns about any left. Write the delivery note, delete scratch renders, commit.

## Store Studio (preview and drag)
The skill ships a local workspace app, `workspace/` (`references/workspace.md`). It shows every image of a
project live on one canvas; the person can drag, rotate and resize elements, drop a screen onto an image
and pin notes for you. Text, colours and new layouts stay your job, in the files.
```bash
cd "$SKILL/workspace" && npm install && npm start -- ~/store-projects/my-app   # prints http://127.0.0.1:4400/
```
Moves land in the project's `layout.json`, which every render applies. Read `layout.json` and `notes.json`
before changing any layout; act on open notes and mark them `"done": true`; run `npm run bake` when the
person is happy, so the moves move into `studio.config.js`.

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
    cover the proof, and keep cards straight (tilt a fan, or one accent card, on purpose).
11. Prefer named boxes (`data-box`, `.boxes.json`) over crop numbers.
12. One demo persona, one "today", the same data and the same clean status bar on every screen; re-do
    every sum and every date sum in the mock data.
13. Capture at the largest device; a `... is upscaled` warning is a defect.
14. Keep text and key UI 40 design units inside the edges and the panorama seams (render checks lifts,
    badges, copy and screen slivers; `bleed: true` / `bridge: true` mark a cut on purpose), and the
    feature graphic copy, logo and cards in x 154-872, y 76-424.
15. Render both canvases (tall iPhone and 9:16 Play) before calling a layout done.
16. Every language is localized, screens included (render and validate flag a missing translation or a
    borrowed screen); read every RTL image.
17. LOOK at every image you produce before calling it done.
18. A magenta placeholder or a `warn:` line is a bug; `npm run validate` exits 0 before delivery.
19. Read `layout.json` and `notes.json` before changing a layout; bake when the moves are final.
20. No real customer data, real people or private paths in anything shown publicly.

## Output folders
`final/<locale>/<target>/` upload images only · `final/<locale>/overview-<target>.jpg` sheets ·
`final/portfolio/<locale>/<target>/` hi-res copies (never uploaded) · `final/icons/` · `final/brand/` ·
`out/brand/<topic>/` option boards · `out/qa/<topic>/` scratch renders · `out/bake/` config backups.
Captures live in `raw/<platform>/[<locale>/]`. Name scratch folders by what they test, and delete them
when done.

## Keep the laptop responsive
- One command at a time. Each render command runs ONE Chrome with one reused page, in order, and closes it.
- Never run two renders, exports or captures in parallel; never start several agents that render.
- Iterate on one image (`--store x --panel N --out out/qa/...`), not the whole export.
- Pages signal when they are ready (`window.__ready`): never add a fixed sleep.
- A full export of the demo takes about 20 s on an idle laptop; much longer means something else is busy.

## References: read them when the step comes up
| file | read it when |
|---|---|
| `references/intake.md` | Step 0: the exact questions (tool JSON), defaults, where the answers go |
| `references/brand.md` | Step 1: palette method, contrast, font pairs, logo and icon recipes, brand board |
| `references/capture.md` | Step 2, Mode A: Simulator and emulator commands, clean status bars, demo data, boxes |
| `references/mock-screens.md` | Step 2, Mode B: the kit, authoring screens, iOS vs Android conventions |
| `references/web.md` | websites and web apps: targets, URL capture, web kit, wide layouts, responsive trio |
| `references/design.md` | Steps 3 and 6: the story of a set, copy rules, consistency, localization, sharpness |
| `references/layouts.md` | Step 4: proven stage recipes with sketches and configs |
| `references/store-specs.md` | choosing targets, and before delivery: every size, format, count and limit, with sources |
| `references/policy.md` | Step 3 and Step 7: what the stores allow on the images, the pre-delivery checklist |
| `references/workspace.md` | when the person wants to preview and drag, or `layout.json` / `notes.json` exist |
| `references/client-brief.md` | a paying client: what to ask for, revision rounds, presenting, delivery naming |
| `references/lessons.md` | before the first render, and whenever an image looks wrong |

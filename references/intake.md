# Step 0: intake questions

When a new project starts, ask these BEFORE creating any folder or file. Use the **AskUserQuestion** tool:
clickable multiple choice, at most 4 questions per call, 2 to 4 options each, the recommended option first
with "(Recommended)" at the end of its label. The tool adds "Other" by itself, so never add it. Ask in
two rounds at most.

- **Skip what is already answered.** "Play and App Store screenshots for my Flutter app, in English and
  German" answers what, targets and languages: ask only the rest. If everything is answered, go straight
  to the summary.
- **A skipped question takes its default** (table below). Never ask the same question twice.
- **"Other"** answers are free text: read them, and map them to the closest setting.
- A `header` is 12 characters at most. `multiSelect: true` lets the person tick several options.

## Round 1: what we are making

```json
{ "questions": [
  { "header": "Making", "multiSelect": false,
    "question": "What are we making store images for?",
    "options": [
      { "label": "An existing app (Recommended)", "description": "Mode A: I capture screens from the Simulator, an emulator or a device, or use screenshots you send." },
      { "label": "An app that is not built yet", "description": "Mode B: I design the brand and build the app's screens as mock-ups from your description (editable)." },
      { "label": "A website or web app", "description": "A live URL I capture (Mode A) or pages I mock up (Mode B), in browser and laptop frames." },
      { "label": "App and website", "description": "Both: phone store images plus web and social images in one project." } ] },
  { "header": "Targets", "multiSelect": true,
    "question": "Which stores and places are the images for? Tick all that apply.",
    "options": [
      { "label": "App Store (Recommended)", "description": "iPhone sets at 6.3\" (required) and 6.9\", plus the 1024 app icon." },
      { "label": "Google Play (Recommended)", "description": "Phone set 1080x1920, the 1024x500 feature graphic and the 512 icon." },
      { "label": "iPad", "description": "The 13\" set (2064x2752). Only if the app runs on iPad." },
      { "label": "Web and desktop", "description": "Open Graph, X, LinkedIn, Product Hunt, Chrome Web Store, Mac App Store, a landing-page hero or a portfolio cover." } ] },
  { "header": "Languages", "multiSelect": true,
    "question": "Which languages? Tick all that apply.",
    "options": [
      { "label": "English (Recommended)", "description": "The default set." },
      { "label": "French", "description": "About 15-20% longer than English: headlines get shorter words or a smaller size." },
      { "label": "Arabic (RTL)", "description": "Right to left: the copy mirrors and an Arabic font is added." },
      { "label": "Spanish", "description": "About 20-25% longer than English." } ] },
  { "header": "Images", "multiSelect": false,
    "question": "How many images per store?",
    "options": [
      { "label": "5 (Recommended)", "description": "Hero, three key features, trust. The first three do most of the work." },
      { "label": "3", "description": "The shortest set that still tells a story. Fine for a portfolio piece." },
      { "label": "8", "description": "Google Play's maximum. For apps with many distinct features." },
      { "label": "10", "description": "The App Store's maximum (Play gets the first 8)." } ] }
] }
```

## Round 2: brand, look, tone, and output or type

Put the brand option that fits the mode first: **"Use the existing brand"** for an existing app,
**"Create a new brand"** for an app that is not built yet. Mark that one "(Recommended)".

The fourth question depends on Round 1:
- **Real captures** (an existing app, a live URL): ask **Output** (below). The project is a screenshots
  project (`screens: { mode: 'raster' }`): real captures can only be pictures.
- **Mock screens** (an app that is not built yet, web pages to design): ask **Type** in place of Output.
  There is no app repo to build inside, the folder is a new one, and the Type options carry the extra files.
- **App and website**: real app captures plus designed web pages can still be editable (a screen without a
  page is drawn from its capture); ask Type when anything will be designed, else Output.

```json
{ "questions": [
  { "header": "Brand", "multiSelect": false,
    "question": "What do we have for the brand?",
    "options": [
      { "label": "Use the existing brand (Recommended)", "description": "You send the logo, colours and fonts (or a brand guide), and I follow them." },
      { "label": "Logo only", "description": "I take the colours from the logo and the app, and propose font pairs." },
      { "label": "Create a new brand", "description": "I show 2-3 palettes, font pairs and logo directions to choose from, then a brand board to approve." } ] },
  { "header": "Look", "multiSelect": false,
    "question": "Which visual direction?",
    "options": [
      { "label": "Bold and bright (Recommended)", "description": "A saturated gradient in the brand colour, white headlines, one warm accent." },
      { "label": "Dark and premium", "description": "A near-black field lit by the brand colour. Good for finance, pro tools, media." },
      { "label": "Calm and soft", "description": "A soft paper field with gentle colour. Good for health, journaling, family." },
      { "label": "Clean and light", "description": "A white or very light field, dark text, lots of space. Good for productivity and B2B." } ] },
  { "header": "Tone", "multiSelect": false,
    "question": "What tone for the headlines?",
    "options": [
      { "label": "Short and benefit-led (Recommended)", "description": "What the user gets, in 3-6 words: \"Write it down in seconds\"." },
      { "label": "Playful", "description": "Warm, a little witty: \"Your brain, minus the clutter\"." },
      { "label": "Formal", "description": "Precise and calm, for finance, health or B2B: \"Every payment, checked twice\"." } ] },
  { "header": "Output", "multiSelect": false,
    "question": "Where should I create the project, and what should the delivery include?",
    "options": [
      { "label": "New folder, standard delivery (Recommended)", "description": "~/store-projects/<app>: upload-ready PNGs per store and language, overview sheets, icons and the brand board." },
      { "label": "New folder, plus hi-res copies", "description": "The same, plus 2x copies for Behance, Dribbble or Upwork and 4K overview sheets (screens and export at --scale 2)." },
      { "label": "Inside the app's repo", "description": "A store-assets/ folder in the current repository (no nested git repo), standard delivery." } ] }
] }
```

**Type** (mock screens only, in place of Output):
```json
  { "header": "Type", "multiSelect": false,
    "question": "Should the project be editable, or made of screenshots?",
    "options": [
      { "label": "Editable (Recommended)", "description": "I draw the mock screens live: sharp at any size, and you can change their text and colours yourself in Mockup Studio. PNGs per store and language, sheets, icons, brand board." },
      { "label": "Editable, plus Figma and hi-res files", "description": "The same, plus every image as layered SVG (drag into Figma) and PDF, and 2x copies for Behance, Dribbble or Upwork." },
      { "label": "Screenshots", "description": "The mock screens are captured once as PNGs, like real app screenshots: screen content is fixed, and SVG files hold each screen as one picture." } ] }
```
When to pick which:
| type | pick it when | config |
|---|---|---|
| editable | the screens are mock screens (Mode B, web pages from the kit): almost always | `screens: { mode: 'live' }` |
| screenshots | the screens are real captures (Mode A, `npm run capture`): required; or the person asks for plain captures | `screens: { mode: 'raster' }` |

## Defaults (when a question is skipped or the person says "just do it")

| question | default | note |
|---|---|---|
| Making | Mode A if the request names an existing app, store listing or repo; otherwise Mode B | a URL means website |
| Targets | App Store + Google Play | stores: `appstore-6.3`, `appstore`, `playstore` |
| Languages | English | `locales: ['en']` |
| Images | 5 | 3 for a portfolio concept |
| Brand | existing brand in Mode A (extract it), new brand in Mode B | |
| Look | bold and bright | palette mood `bold`, field `gradient` |
| Tone | short and benefit-led | |
| Output | `~/store-projects/<app-slug>`, standard delivery | never inside the skill folder |
| Type | editable for mock screens, screenshots for real captures | `screens.mode`: `'live'` or `'raster'` |

## The summary (one screen, then start)

Show this and go on to Step 1 without waiting, unless something is unclear:
```
Project   Brimpage, a five-minute journal (Mode B: no build yet, mock screens)
Type      editable: live screens you can edit in Mockup Studio (Figma files on request)
Targets   App Store 6.3" + 6.9", Google Play phone + feature graphic, icons
Languages English, Spanish          Images  5 per store
Brand     new: palettes, fonts and logo options first, then a brand board to approve
Look      bold and bright           Tone    short, benefit-led
Folder    ~/store-projects/brimpage  Delivery PNGs per store/language, overview sheets, icons, brand board
Next      Step 1, Brand: the brief, then 3 palettes to choose from
```

## Where the answers go

| answer | file | field |
|---|---|---|
| Making | `briefs/brand-brief.md` | `- **Mode:**` (A, B, web) |
| Targets | `studio.config.js` | `stores: [...]` (ids in `store-specs.md`); no Play: `feature: null` |
| Languages | `studio.config.js` | `locales: ['en', 'fr', 'ar', 'es']`; Arabic also `brand.fonts.extra` |
| Images | `studio.config.js` + `briefs/copy.md` | one `panels[]` entry and one copy row per image |
| Brand | `briefs/brand-brief.md` | `Must keep`, the seed colour, the logo files in `brand/` |
| Look | `briefs/brand-brief.md` | `Mood` and the palette option to recommend (below) |
| Tone | `briefs/copy.md` | the header comment: tone and two example headlines |
| Output | the project folder; `CLAUDE.md` | the delivery list in "Project notes" |
| Type | `studio.config.js` + `CLAUDE.md` | `screens: { mode: 'live' }` or `{ mode: 'raster' }`; the extra files (`--vector`, `--scale 2`) in the delivery list |

Mode B also gets `briefs/app-spec.md`: the description now (name, one-liner, audience, platforms); the
persona, screens and story map after the brand board is approved.

**Look -> palette.** The palette board shows three directions from the seed: Drenched (gradient field),
Night (dark field), Paper (soft mesh field), or with `--look dark` three dark ones (Night, Graphite, Deep),
or with `--look light` three light ones (Chalk, Bone, Sand: off-white field, black type, one hot accent).
The look answer picks the flags and the option to recommend first:

| look | `npm run brand -- palette` | recommend | field |
|---|---|---|---|
| Bold and bright | `--mood bold` | 1 Drenched (or the option palette's `next:` line names when 1 fails a check) | `gradient` |
| Bold, on a light field (the brief says off-white, black type, one hot accent: sportswear, food) | `--look light --mood bold` | 2 Bone | `paper` |
| Dark and premium | `--look dark --mood electric` (vivid accent) or `--mood serious` (muted gold) | 1 Night | `dark` |
| Calm and soft | `--mood calm` | 3 Paper | `mesh` |
| Clean and light | `--mood fresh` | 3 Paper, then set `brand.field: 'light'` | `light` |

**When the recommended option fails a check** (palette ends with a `next:` line naming the option that
passes): recommend that option instead, or keep the look and run palette again with a darker `--seed`
(`brand.md`, "When the recommended option fails"). Say which one you recommend and why in the summary.

A client accent (Mode A) or an accent the brief names ("electric lime"): `--accent "#hex"` pins it.
A dark-first app also gets `--theme dark` (dark sample screens) and `screens: { theme: 'dark' }` in
`studio.config.js`, so every capture stays dark.

**Language codes:** English `en`, French `fr`, Arabic `ar` (right to left: add
`npm i @fontsource-variable/noto-sans-arabic` and `fonts: { extra: ['Noto Sans Arabic Variable'] }`),
Spanish `es`, German `de`, Portuguese `pt`, Italian `it`, Hebrew `he` (right to left), Japanese `ja`
(add `@fontsource-variable/noto-sans-jp`).

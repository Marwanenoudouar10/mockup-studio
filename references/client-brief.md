# Working for a client (freelance)

How to run a mockup-studio job for a paying client, from the first message to the final zip. The
Step 0 questions (`intake.md`) are for the person in the chat. This page is what that person asks THEIR
client, and how they deliver.

## The first reply to a job post
Keep it short and concrete. Show one finished set (a portfolio cover or an overview sheet) and ask the
questions that change the price:
1. Is the app live or in TestFlight / internal testing, or is it an idea or a design only?
2. Which stores: App Store, Google Play, both? iPad? Web or social images too?
3. How many images per store (5 is the usual), and in how many languages?
4. Do you have a brand kit (logo SVG, colours, fonts), or should the brand be designed too?
5. Do you have the headlines, or should I write them? Who approves the copy?
6. Your deadline, and a store listing you like the look of.

## Packages (a starting point for pricing)
| package | what is in it |
|---|---|
| Basic | one store, one language, 5 images, the client's screenshots and brand, 1 revision round |
| Standard | both stores (iPhone 6.3" + 6.9", Play + feature graphic), up to 2 languages, copy written, icons, 2 revision rounds |
| Premium | the brand designed (palette, fonts, logo, icon, brand board), mock screens from a description (Mode B, an editable project), web and social images, hi-res portfolio copies, layered SVG files for Figma and PDF for print (import one SVG into Figma yourself before you sell this: `editable.md`), 3 revision rounds |
| Add-ons | another language (copy translated by a native speaker or supplied), iPad set, extra images, Product Hunt or Chrome Web Store set, layered SVG for Figma + PDF for print of every image (editable projects only; check one Figma import first, `editable.md` lists what it may drop) |

## What to request from the client
- **Access:** a TestFlight invite or simulator build, an APK or internal-testing invite, and a demo
  account seeded with demo data. Or, at minimum, screenshots taken with the checklist in `capture.md`.
- **Brand:** logo as SVG (or the source file), the colour hex values, the font names, any brand guide.
- **Store listing:** the current listing links and its text (title, subtitle, description), so the copy
  matches the store page.
- **Languages:** which ones, and who translates. Machine translation is a draft, never the delivery.
- **Copy:** their feature list in priority order, the one sentence that sells the app, words to avoid.
- **Competitors:** 2-3 apps they compete with, to stand apart from.
- **Permission** to show the work in a portfolio (or not). Without a yes in writing, the portfolio piece
  is an invented demo app.

Write all of it into `briefs/brand-brief.md`, `briefs/copy.md` and `briefs/capture-plan.md` (or
`app-spec.md` for Mode B). The briefs are the contract: what the images will say and show.

## The rounds
1. **Brand board** (only when the brand is part of the job): approve before anything else.
2. **Copy:** send `briefs/copy.md` as a table (image, headline, sub, proof). Approve the words before any
   layout work: a word changed after the layout can mean a new layout.
3. **First full set:** the overview sheets of every store in the main language. This is revision round 1.
4. **Fixes and the other languages.** Round 2.
5. **Final export**, validated, zipped.

**What counts as a revision:** changes to copy, order, composition or emphasis on existing images. New
images, a new language, new screens or a brand change after approval are new work. Say this in the
offer. Let the client mark changes as notes in Mockup Studio (`workspace.md`) during a screen share, or
as numbered points on the overview sheet. In an editable project the client can also retype a headline or
a screen text themselves there; their edits land in `edits.json` and count as part of the round.

## Presenting the work
- Send the overview sheets first (`final/<locale>/overview-<store>.jpg`), one message per store, with one
  line per image: "1 Hero: the daily page. 2 Writing in seconds. ..." The sheet shows the set as the store
  will: a row, read left to right.
- Then the brand board (if made) and the feature graphic.
- Mention the checks: "Exact store sizes, no transparency, validated against the October 2026 App Store
  and Google Play rules."
- Never send a single image out of context first: the set sells as a row.

## Delivery folder and naming
Deliver a zip whose folders say where each file goes. Upload order is the file number.
```
Brimpage-store-images-2026-10-24/
  README.txt                     what is where, the upload order, the sizes, the alt texts
  app-store/en/iphone-6.3/01.png ... 05.png
  app-store/en/iphone-6.9/01.png ...
  google-play/en/phone/01.png ...
  google-play/en/feature-graphic.png
  icons/app-store-1024.png  google-play-512.png
  brand/brand-board.png  logo.png  logo-white.png  mark.png  logo.svg  mark.svg
  overview/en-app-store.jpg  en-google-play.jpg
  figma/en/iphone-6.9/01.svg  01.pdf ...     editable projects, when Figma files are part of the job
```
The project's `final/` already holds every file (`final/<locale>/<target>/01.png ...`). Build the
delivery folder from it with plain copies, never re-saving an image (re-saving can add alpha or
recompress). A simple zip of `final/` works too, without `render-report.json`, right after a fresh
`npm run export` (it removes folders of languages or targets the config no longer makes; `npm run
validate` warns about any that remain):
```bash
cd final && zip -r ../Brimpage-store-images.zip . -x "render-report.json" -x "vector/vector-report.json" -x "portfolio/*" -x "*.DS_Store" && cd ..
```
Add `-x "vector/*"` when Figma files are not part of the job. When they are, export them fresh
(`npm run export -- --vector`; validate warns about vector files older than their PNGs, or left over
from images the set no longer has).
Hi-res portfolio copies (`final/portfolio/`) are for the portfolio, not the client: the command leaves
them out. Drop `-x "portfolio/*"` when the client asked for print or press sizes.

## The README.txt for the client
- Which folder goes to which slot in App Store Connect and the Play Console.
- "Upload in file order: 01 is the first image."
- The alt text for each Play image (140 characters or less).
- For the App Store: "Upload the 6.3" set (required) and the 6.9" set; the smaller iPhone sizes are
  scaled from them automatically."
- For Play: "4 or more images make the listing eligible for promotion."
- Fonts used and their licence (fontsource fonts are open-licensed).
- Figma files, only after you imported one SVG into Figma yourself and compared it with the PNG: "Drag an
  SVG onto a Figma canvas: layers are named, text stays editable when Figma has the font. Glass blur and
  grain are left out of the SVG, and shadows or fades may come out differently in Figma; the PNG is the
  reference and the PDF (for print, Illustrator or Affinity) keeps them" (the full list: `editable.md`).

## Handover and after
- Keep the project folder: a new app version means new captures and `npm run export`, not a new job
  from zero. Offer updates per release.
- Never publish the client's screens or brand without written permission. Portfolio pieces use invented
  apps (Mode B) or approved work.
- No real customer data in any image, ever. If a client's screenshots contain some, stop and ask for
  demo data.

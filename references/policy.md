# Store content rules for images

What the stores allow ON the images: copy, UI, devices, badges. Checked 2026-10-24 against Apple's App
Review Guidelines (section 2.3 and the 2.3.3 help page), Apple's marketing and asset guidelines, and
Google Play's Metadata policy and preview-asset page. Sizes and formats are in `store-specs.md`.

`npm run validate` catches the obvious copy problems (English word lists) and missing UI. It cannot judge
whether a claim is true or a screen is honest: read every image against the checklist at the end.

## Rules for both stores
- **Show the real app.** Most of the set must be the app in use, not splash screens, login screens or
  title art. Mock screens (Mode B) must match what the shipped app will show.
- **No rankings or awards:** "#1", "best", "top", "leading", "app of the year", award icons, "Editor's choice".
- **No prices or promotions:** "free", "% off", "sale", "discount", "cash back", "limited time", prices.
  The store page shows the price; the images never do (Apple 2.3.7, Play Metadata policy).
- **No calls to action:** "Download now", "Install now", "Get it today", "Try now", "Play now".
- **No other store's imagery:** no Play badge, Android phone or Android UI on App Store images, and no
  App Store badge or iPhone on Play images. The engine draws an iPhone frame for App Store targets and a
  generic Android frame for Play by default; keep it that way.
- **No unverifiable claims and no unattributed testimonials.** A quote needs a real, named source.
- **No celebrity names or other brands' logos** without written permission.
- **Suitable for a 4+ rating** on Apple, even when the app is rated higher. "For Kids" and "For Children"
  are reserved for Apple's Kids category.
- **Localize** headlines and overlays for every market you ship in.
- **Export without alpha** (both stores' screenshots and the Play feature graphic). Only the Play 512
  icon may carry alpha.

## Apple
- **2.3.3:** "Screenshots should show the app in use, and not merely the title art, login page, or splash
  screen." Text and image overlays are allowed. **More than half of the screenshots for each device size
  must show the app in use** (3 images: 2 must; 4 images: 3 must).
  - Do: show the main features in most images, update with each version, include Dark Mode if the app has it.
  - Do not: show only login or splash screens, misrepresent the interface, let overlays crowd out the app.
- **2.3.7:** no prices, terms or descriptions that do not fit the metadata type; no trademarked terms or
  names of popular apps.
- **2.3.1:** do not promote content or features the app does not have. Misleading marketing can end the
  developer account.
- **2.3.10:** no names, icons or imagery of other mobile platforms or app marketplaces.
- **Text (asset best practices):** "use a short phrase that enhances your visual rather than describes
  it. Be sure to localize." Do not spend a whole image on accolades or a call to action.
- **Safe area:** keep the focal artwork near the centre so nothing important is clipped.
- **First images:** the first one to three screenshots show in search results when there is no preview
  video. The product page shows up to 10.
- **Status bar** (marketing guidelines): full network or product designator, full Wi-Fi, full battery.
  The 9:41 time is a convention, not a rule. Our iOS mock screens draw this; for real captures use the
  `simctl status_bar` override in `capture.md`.
- **Device frames.** Apple's marketing guidelines ask that real Apple product images (its own bezels) be
  used "as is": no tilting, cropping, shadows or reflections. The engine's frames are generic CSS shapes,
  not Apple product images, and store screenshots with stylised generic frames are common and accepted.
  If a client wants the strict reading, use the frameless recipes in `layouts.md` (tiles and lifts).

## Google Play
**Metadata policy: never in the icon, title, developer name or promo images**
- store performance or ranking: "App of the year", "#1", "Best of Play 20XX", "Popular", award icons;
- price and promotion: "10% off", "$50 cash back", "free for limited time only";
- Google Play programs: "Editor's choice", "New";
- emoji, emoticons, repeated special characters, and ALL CAPS unless the brand is written that way;
- misleading symbols in icons (a fake notification dot, a download arrow);
- unattributed testimonials; sexual content, graphic violence, illicit drugs; celebrity names or brand
  logos without permission.

**Screenshot guidance (preview-assets page)**
- "must demonstrate the actual in-app or in-game experience". Use captured footage of the app.
- No people holding or tapping the device (no fingers).
- Stylised sets that break UI across several images are allowed, but **put UI in the first three images**.
- **"Taglines should not take up more than 20% of the image."** Every Play render measures the box of
  the headline and sub lines and warns above 20% (`the headline and sub line cover 24% of the image`).
  The default copy block stays near 15%; a bigger `layout.headlineShort` (condensed faces) trips it:
  shorten, or drop the Play sub line (`sub: { playstore: '', default: '...' }`).
- Banned words in images: "Best", "#1", "Top", "New", "Discount", "Sale", "Million Downloads", and for the
  feature graphic also "Free". No call to action ("Download now", "Install now", "Play now", "Try now").
- No small text in large amounts. No time-sensitive copy; rotate seasonal images.
- Status bar: no carrier name, no notifications; battery, Wi-Fi and signal full (`capture.md`).
- Never blurry, stretched or skewed. The engine never stretches a screen, and it warns when a screen is
  drawn larger than its pixels.
- **Avoid device imagery** ("can become obsolete quickly or alienate some users") and any store's badge.
  Device frames are discouraged on Play (they affect featuring, not acceptance) and forbidden for Wear OS.
  For a client who wants to be featured, use frameless Play stages:
  `stage: { playstore: [ ...tiles and lifts... ], default: [ ...phones... ] }` (`layouts.md`, "Frameless").
- Localize taglines and overlays. In-game UI does not need localizing.
- Give every image alt text of 140 characters or less in the Console. Write it in `briefs/copy.md`.

**Feature graphic**
- Keep the focal point near the centre. Keep the logo, app name, slogan and main UI out of the cutoff
  zones. Measured on Google's diagram, the cutoff bands are about 15% per side: on 1024x500 that is about
  152 px left and right and 76 px top and bottom, so key elements stay inside **x 154-872, y 76-424**.
- The engine starts the copy at x 154 in a 380 px column and warns in the render log when the copy block
  leaves the safe zone ("feature graphic: the copy crosses the left cutoff zone ...").
- If the listing has a preview video, the play button covers the exact centre: keep text away from it.
- Use vivid colours. Avoid pure white, black or dark grey backgrounds (they melt into Play's UI).
- No prominent branding that only repeats the icon, no device imagery, no store badges. Our default puts
  devices in the right third; for strict compliance use lifted cards or a tile instead of phones.

## What `npm run validate` flags (warnings)
| check | example line |
|---|---|
| ranking, award, program words | `copy appstore en image 1   headline "#1": a ranking ("#1")` |
| price or promotion | `copy playstore en image 3   badge "Free on ..." "Free": a price or a promotion` |
| call to action | `copy appstore en image 1   sub "Download now": a call to action` |
| download or user counts | `headline "millions of users": a download or user count` |
| emoji, ALL CAPS (Play) | `headline ALL CAPS text (Play)` |
| another store's name | `badge "Best of Android": another platform's name (Apple 2.3.10)` |
| too little real UI | `ui appstore (en, rendered)   1 of 4 images show the app's UI: Apple wants more than half (2.3.3)` |
| Play's first three | `ui playstore (en, rendered)   image 1 shows no app screen: Play wants UI in the first three` |

The UI count is measured on the rendered images (render-report.json: a device, tile or lifted card drawn
over 2% or more of the image), so a panorama whose devices all landed on image 1 is caught. Before the
first render it falls back to the config (`(config)`: a panel with any element that has a screen).

The word lists are English (plus "nº 1"). For other languages, read the translations against the same
rules. A warning is a prompt to re-read, not a verdict: "New York" on a travel app is fine.

## Checklist before delivery
- [ ] Every claim is true of the app today. No feature shown that ships "soon".
- [ ] More than half of each App Store set, and Play images 1-3, show the app's real UI.
- [ ] No ranking, award, price, promotion, call to action, emoji or other store's name, in any language.
- [ ] No real customer data, real people's photos or other brands' logos in the screens.
- [ ] Status bars clean and full; the same time on every image of a set.
- [ ] Play headlines take 20% of the image or less (the render warns); the feature graphic copy sits in
      the safe zone.
- [ ] Every image is localized; alt text written for Play.
- [ ] `npm run validate` shows 0 problems, and every warning has been read and answered.

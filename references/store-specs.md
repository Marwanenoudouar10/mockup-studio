# Store specs: sizes, formats, counts, limits

Checked on **2026-10-24** against the official pages listed at the end. Store rules change: re-check this
file at the start of every client project, and fix `scripts/lib/stores.js` (phone stores) or
`scripts/lib/targets.js` (web targets) in the project if a number moved. `npm run validate` reads those
two files, so the validator follows the fix.

## App Store (Apple)

**Every screenshot set**
- At least 1 and at most 10 screenshots per device size, per language.
- `.png`, `.jpg` or `.jpeg`. **No alpha channel and no transparency.** The engine flattens every image to
  24-bit RGB, and `validate` fails any file that still has alpha.
- Exact pixel sizes only. A wrong size fails the upload with "The dimensions of one or more screenshots are wrong".
- Apple states no file-size limit for screenshots.
- Portrait or landscape (landscape is the same numbers swapped). The engine renders portrait.

**iPhone slots.** In October 2026 Apple renamed the slots by device class instead of inches, and made
the medium Dynamic Island class the required iPhone set.

| target id | Apple's slot name (was) | accepted sizes | status |
|---|---|---|---|
| `appstore-6.3` | iPhone with Dynamic Island, medium display (6.3") | **1206x2622**, 1179x2556 | **required** |
| `appstore` | iPhone with Dynamic Island, large display (6.9") | **1320x2868**, 1290x2796, 1260x2736 | optional, the sharpest |
| `appstore-6.5` | iPhone with Face ID, large display (6.5") | **1284x2778**, 1242x2688 | optional |
| custom | iPhone with Face ID, medium display (6.1", 5.8") | 1170x2532, 1125x2436, 1080x2340 | optional, scaled down |
| custom | iPhone with Home Button (5.5" / 4.7") | 1242x2208 / 750x1334 | optional, scaled down |

What to upload: **`appstore-6.3` and `appstore`**. App Store Connect scales them down for the smaller
classes. The page still contains one old line that calls the 6.5" set "required if the large display set
is missing"; uploading the large set covers it. The engine renders the bold size in each row.

**iPhone Duo** (new, accepted since 2026-10-05): outer display 1398x2034, inner display 2007x2853.
Screenshots become required in April 2027 for apps built with the iOS 27.1 SDK or later, and they add a
"Made for iPhone Duo" badge. Not built in yet; add it as a custom target when a client needs it:
```js
stores: ['appstore', 'appstore-6.3', { id: 'duo-inner', label: 'iPhone Duo inner', size: [2007, 2853], platform: 'ios' }]
```

**iPad** (only if the app runs on iPad): `ipad-13` renders **2064x2752** (2048x2732 also accepted). One
set is "required if the app runs on iPad". Smaller iPads (11": 1668x2420, 1640x2360 ...) are scaled down.

**Mac** (`mac-appstore`, 16:10): 2880x1800, 2560x1600, 1440x900 or 1280x800; 1 to 10 per language.

**Other Apple platforms** (not built in): Apple TV 1920x1080 or 3840x2160; Vision Pro 3840x2160; Watch
422x514, 410x502, 416x496, 396x484, 368x448 or 312x390 (the same Watch size across all languages).

**Scaling rule (Apple, verbatim):** "If your app's user interface is consistent across multiple device
sizes and localizations, you only need to provide screenshots for the highest required resolution."

**App icon (1024).** 1024x1024, square, no rounded corners (the system applies the mask), sRGB or
Display P3, **no alpha** (else upload error ITMS-90717 "Invalid App Store Icon"). It ships inside the
build (asset catalog or an Icon Composer `.icon` file); our `final/icons/appstore-1024.png` is the
artwork for that. Apple's icon rules: text only if essential, no screenshots or copied UI, no Apple
hardware, avoid a black background. The system can generate the dark, clear and tinted variants.

**App previews** (video, not made by this skill): 15-30 s, up to 3 per device size and language, 500 MB
max, H.264 or ProRes 422 HQ, 30 fps max. Dynamic Island and Face ID classes take 886x1920 portrait. A
preview plays before the screenshots and autoplays muted.

**New on 2026-10-05: creative assets** (product page header and search images). Header: 21:9 at
3840x1646 (JPEG or PNG) or 16:9 at 5244x2950 (PNG). Search: 3:2, from 1920x1280 to 3840x2560. In-app
event cards 16:9 1920x1080 to 3840x2160; event details 9:16 1080x1920 to 2160x3840. No alpha. These are
wide images: add them as custom targets and they get the wide layout (`references/web.md`):
```js
{ id: 'ios-header', label: 'App Store header 21:9', size: [3840, 1646], platform: 'ios', device: 'iphone' }
```

**Names:** app name 30 characters at most.

## Google Play

"Requirements" are mandatory. "Highly recommended" items only affect whether Google may feature the app.

**App icon (required):** 512x512, **32-bit PNG with alpha**, 1024 KB at most, sRGB, full square with no
drop shadow and no rounded corners (Play masks it with a radius of 30% of the size and adds its own
shadow). `npm run icons` writes `final/icons/playstore-512.png` as RGBA. No badges or text that suggest
a ranking, a price or a Play program.

**Feature graphic (required to publish):** 1024x500, JPEG or 24-bit PNG, **no alpha**. The help page
states no size limit; the Console uploader takes up to 15 MB (aim for under 1 MB; ours are about 0.5 MB).
It is also the cover of the preview video. Safe zone: see `references/policy.md` (keep the logo, name
and slogan inside about x 154-872, y 76-424; the engine's default copy column starts at x 154).

**Screenshots**
- JPEG or 24-bit PNG, **no alpha**.
- Each side 320 px to 3840 px, and **the long side at most 2x the short side**. Raw modern phone captures
  fail this (1080x2400 is 2.22:1, 1206x2622 is 2.17:1), which is one reason we compose onto a 9:16 canvas.
- At least 2 screenshots across all device types to publish; up to 8 per device type.
- 8 MB each (the Console uploader's limit; the help page states none for phones).
- **Promotion eligibility:** at least 4 screenshots at 1080 px or more, 9:16 portrait (at least
  1080x1920) or 16:9 landscape (at least 1920x1080). Games: at least 3. `validate` prints a `note` when a
  Play set has fewer than 4.

| target id | size | notes |
|---|---|---|
| `playstore` | 1080x1920 (9:16) | the default phone set |
| `playstore-4k` | 2160x3840 (9:16, the 3840 maximum) | crisper on large screens; upload it OR `playstore`, not both |

**Other Play device types** (not built in; add custom targets when needed):
- Tablets and Chromebook: at least 4 screenshots, 1080 px to 7680 px, 16:9 or 9:16. Leave out extra text
  that is not part of the app, because it can be cut off.
- Wear OS: 1:1, at least 384x384, no device frames, no extra text or backgrounds, no transparency.
- Android TV: at least 1 TV screenshot plus a 1280x720 banner (JPEG or 24-bit PNG).
- Automotive: at least 2 portrait (800x1280) and 2 landscape (1024x768), from the generic system image.
- XR: 4 to 8 screenshots, 8:5, 3840x2400 recommended (at least 1920x1200), 8 MB each.

**Preview video** (not made by this skill): one YouTube URL, public or unlisted, ads off, embeddable. It
autoplays muted for up to 30 s. Show real UI in the first 10 s.

**Text limits:** title 30 characters, short description 80. Alt text for each image: 140 characters or less.

## Web, social and desktop targets

The wide layout draws these (`references/web.md`). "Required" means the destination rejects other sizes,
so `validate` fails a mismatch; "recommended" only warns.

| target id | size | rule | count | source |
|---|---|---|---|---|
| `og` | 1200x630 | recommended, 8 MB | 1 | developers.facebook.com/docs/sharing/webmasters/images/ |
| `x-card` | 1200x600 (2:1) | recommended, 5 MB | 1 | developer.x.com, summary card with large image (page blocked our fetch; 2:1 is long documented) |
| `x` | 1600x900 (16:9) | recommended, 5 MB | 1-4 | help.x.com, posting pictures (1600x900 is the common figure, not an official rule) |
| `linkedin` | 1200x627 (1.91:1) | recommended | 1 | linkedin.com/help/linkedin/answer/a521928 |
| `square` / `portrait` | 1080x1080 / 1080x1350 | recommended | 1-10 | help.instagram.com/1631821640426723 |
| `producthunt` | 1270x760 | recommended | 2-8 | help.producthunt.com, how to post media (the 8 maximum is not confirmed) |
| `chrome-webstore` | 1280x800 (or 640x400) | required | 1-5 | developer.chrome.com/docs/webstore/images |
| `chrome-promo` / `chrome-marquee` | 440x280 / 1400x560 | required | 1 | same page |
| `mac-appstore` | 2880x1800 (also 2560x1600, 1440x900, 1280x800) | required | 1-10 | Apple screenshot specifications |
| `web-hero` / `web-hero-wide` | 2880x1800 / 2560x1440 | our own default | 1-10 | none |
| `portfolio` | 1600x1200 (4:3) | recommended, 10 MB | 1-10 | support.upwork.com, project catalog images (Upwork 1000x750 at 4:3; Dribbble shows 1600x1200) |

## What `npm run validate` checks
- Every file in `final/<locale>/<target>/`: an accepted size (or Play's size range), PNG or JPEG matching
  its extension, no alpha, 24-bit (PNG colour type 2: no palette or grayscale PNG; a 3-channel JPEG),
  8 bits per channel, no CMYK JPEG, under the byte limit, and the image count.
- The feature graphic (1024x500, no alpha, 24-bit), both icons (1024 RGB; 512 RGBA), missing renders.
- The render report (`final/render-report.json`): any screen drawn larger than its pixels, and every issue
  a page found (a crop outside its capture or without a key for the platform, a screen not localized, a
  card cut by the edge or shown twice, an empty panorama image, the feature graphic's cutoff zone).
- Copy not translated for a locale the config renders; stale folders (a locale or target the config no
  longer makes, which `npm run export` removes).
- Store content: rankings, prices, calls to action and other stores' names in the copy; App Store sets
  where half or fewer images show the app; Play sets whose first three images show no app screen (both
  measured on the rendered images: a screen over 2% of the image counts).
- Hi-res copies in `final/portfolio/` must be exactly 2x, 3x or 4x a target size.
- Exit code 1 on any problem. `--strict` turns warnings into problems.

## Sources
- developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
  (live page, plus Wayback snapshots of 2026-09-16 and 2026-10-06 for the change)
- developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications
- developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications
- developer.apple.com/news/?id=ljpl7kyn (creative assets, 2026-10-05) and developer.apple.com/iphone-duo/
- developer.apple.com/design/human-interface-guidelines/app-icons
- support.google.com/googleplay/android-developer/answer/9866151 (preview assets)
- support.google.com/googleplay/android-developer/answer/9898842 (Metadata policy)
- developer.android.com/distribute/google-play/resources/icon-design-specifications
- Secondary, for numbers the official pages leave out: the Play Console uploader limits (8 MB per
  screenshot, 15 MB feature graphic) and the ITMS-90717 alpha-icon error.

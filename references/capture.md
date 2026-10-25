# Step 2, Mode A: capture the real app

Use this when the app exists. You capture its screens from the iOS Simulator, an Android emulator or a
device, or the client sends screenshots. The captures go in `raw/<platform>/`, and the engine draws every
store size from them inside its own frames. Write the plan in `briefs/capture-plan.md` first (the demo
version shows the shape). Websites and web apps: `npm run capture`, see `web.md`.

**A project of real captures is a screenshots project:** set `screens: { mode: 'raster' }` in
`studio.config.js` (the demo's `'live'` draws mock screen pages, `editable.md`). The person can still move
things and retype headlines in Mockup Studio; the screens themselves stay pictures, also in the SVG export.

**In Mode A the captures come before the brand board** (SKILL.md Step 1): collect or capture them first,
since the brand's colours are sampled from them and the board shows one. The project setup already removed
the demo's `raw/`, so nothing here deletes the client's files.

## What to ask the client for
In order of preference:
1. **A build you can run:** a TestFlight invite or a simulator build (`.app`) for iOS; an APK or AAB, or
   an internal-testing invite, for Android. Plus a demo account with demo data.
2. **The source code**, if you are trusted with it: you then build for the Simulator and emulator yourself.
3. **Screenshots they take**, as a last resort. Send them the checklist at the end of this page.

## Capture once, at the largest size
One iOS size and one Android size are enough. Capture on the LARGEST device, so no store size ever draws
a screen larger than its pixels (the render log warns when one does).

| platform | device | capture | folder |
|---|---|---|---|
| iOS | iPhone 17 Pro Max simulator (or 16 Pro Max) | 1320x2868 | `raw/ios/<name>.png` |
| iPad | "iPad Pro 13-inch (M5)" simulator | 2064x2752 | `raw/ipad/<name>.png` |
| Android | a 1080x2400 emulator (a Pixel 8 profile) | 1080x2400 | `raw/android/<name>.png` |
| another language | the same devices, app in that language | same | `raw/<platform>/<locale>/<name>.png` |

Name each capture by what it shows (`home`, `entry`, `insights`), the same name on both platforms. The
config refers to screens by these names.

## Set up the iOS Simulator
```bash
xcrun simctl list devices available | grep "Pro Max"
xcrun simctl boot "iPhone 17 Pro Max" && open -a Simulator
xcrun simctl install booted path/to/App.app          # a simulator build from the client or from Xcode
xcrun simctl status_bar booted override --time "9:41" --dataNetwork wifi --wifiMode active --wifiBars 3 \
  --cellularMode active --cellularBars 4 --operatorName '' --batteryState charged --batteryLevel 100
xcrun simctl status_bar booted list                   # check the override
xcrun simctl ui booted appearance light               # or dark, for a dark set
xcrun simctl ui booted content_size large             # the default text size
xcrun simctl privacy booted grant photos <bundle id>  # no permission pop-up in the shot
xcrun simctl io booted screenshot --type=png --mask=ignored raw/ios/home.png
```
- `--mask=ignored` saves the plain rectangle. Never `--mask=alpha`: App Store Connect rejects alpha.
- Another language: `xcrun simctl launch booted <bundle id> -AppleLanguages "(es)" -AppleLocale es_ES`.
- When done: `xcrun simctl status_bar booted clear`.
- Check a file: `sips -g pixelWidth -g pixelHeight -g hasAlpha raw/ios/home.png`.

## Set up the Android emulator
SystemUI demo mode gives a clean, full status bar with no notifications:
```bash
adb shell settings put global sysui_demo_allowed 1
adb shell am broadcast -a com.android.systemui.demo -e command enter
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 1200
adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
adb shell am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4
adb shell am broadcast -a com.android.systemui.demo -e command network -e mobile show -e datatype none -e level 4
adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
adb shell am broadcast -a com.android.systemui.demo -e command status -e volume hide -e bluetooth hide -e location hide -e alarm hide
adb shell cmd uimode night no                         # or yes
adb shell pm grant <package> android.permission.POST_NOTIFICATIONS   # no permission pop-up
adb exec-out screencap -p > raw/android/home.png      # exec-out, not shell: shell corrupts the PNG
adb shell am broadcast -a com.android.systemui.demo -e command exit   # when done
```
- Another language (Android 13+): `adb shell cmd locale set-app-locales <package> --locales es-ES`.
- The clock: 12:00 is the Android convention, 9:41 the iOS one. Any fixed time works; keep it the same
  on every image of a set.
- Demo-mode broadcasts usually work without root on emulators. If one is ignored, use a "Google APIs"
  system image (not "Google Play") and run `adb root` first.
- Raw 1080x2400 captures break Play's 2:1 rule if uploaded as they are. You never upload them: the engine
  composes them onto 9:16 (1080x1920) images.

## Demo data: one persona, the same on both platforms
Seed the app before capturing. Write the persona in the capture plan:
- **One person**, invented: a first name, a plausible avatar (an illustration or initials, never a real
  person's photo), the same name on every screen.
- **One "today":** a fixed date and time. Entries, charts and streaks agree with it.
- **Numbers that add up:** a 12-day streak shows 12 checked days; a total equals its parts.
- **Real-length content:** real sentences, real place names that are generic ("Riverside Park"), no lorem
  ipsum, no "Test 1".
- **Invented brands only:** no client's real customers, no real people, no other company's logo.
- **The same state on iOS and Android:** same persona, same data, same screens in the same order. A
  set that shows different content per platform looks like two apps.

## Clean the build (a build flag, not a crop)
Ask the developer for a "screenshots" build flag, or set it yourself, that hides everything a user would
not see:
- debug banners and ribbons (Flutter: `debugShowCheckedModeBanner: false`), dev menus, FPS meters, layout bounds;
- React Native LogBox warnings (`LogBox.ignoreAllLogs()`), Android StrictMode flashes, Xcode's debug overlays;
- chat bubbles and support widgets, feedback buttons, beta banners, "what's new" sheets;
- rating prompts, cookie or analytics consent dialogs, onboarding tooltips, permission dialogs;
- the keyboard (unless the image is about typing), loading spinners, half-loaded images, toasts.

Cropping these out later costs more and fails when the layout moves. Fix them at the source.

## Boxes: the cards a store image lifts out
A `lift` element shows one card of a screen at reading size. Name the cards in
`raw/<platform>/<name>.boxes.json`, in capture pixels; the Android layout differs, so it has its own file:
```json
{ "prompt": { "x": 60, "y": 834, "w": 1200, "h": 525, "r": 78 }, "mood": [60, 1392, 1200, 390] }
```
`r` is the card's corner radius (used for the lifted card's corners). Measure in an image viewer, or read
the capture and estimate, then check with one render and adjust:
```bash
npm run render -- --store appstore --panel 2 --out out/qa/boxes
```
A missing box draws a magenta placeholder and a `warn:` line; it is never a silent blank. Without a
boxes file, crop in the config instead: `crop: { ios: [60, 834, 1200, 525], android: [48, 540, 984, 486] }`.
A crop belongs to one capture: give every platform its own key (the iOS numbers never carry over to the
narrower Android capture). A missing key, or a crop or box that leaves the capture, draws the same
placeholder plus an issue that `npm run validate` lists.

## The Dynamic Island and the punch-hole camera
The iPhone frame draws a Dynamic Island and the Android frame a punch-hole camera. A real capture does
not include them, so the default is right. If a capture already shows one (a photo of a device, a
mock-up), switch the frame's own off: `brand.devices.iphone.island: false` or `pixel.camera: false`, or
per element `island: false`.

## Screenshots sent by the client: the checklist to send them
- The device sizes above (or larger at the same aspect), PNG, straight from the device: not re-saved as
  JPEG, not resized, no device frame baked in.
- The same status bar time on every screen, full battery and signal, no notifications or carrier name.
- One theme (light or dark) for the whole set.
- Demo data only: no real customer names, emails, phone numbers, faces or addresses.
- No keyboards, pop-ups, toasts or debug banners.
- The same screens in the same state on iOS and Android.
- For every language: the same screens again, with the app set to that language.

## Look before you use
Read every capture before any render: the right screen, no half-loaded content, no personal data, the
same persona everywhere, clean status bar. Then show the brand board with a real capture:
`npm run brand -- board --screen today --crop 60,480,1200,700 --platform ios` (or `--box tasks` once the
boxes file names it).

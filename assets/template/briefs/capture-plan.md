# Capture plan (Mode A: from screenshots)

<!-- Use this when the app exists: you capture its screens from the iOS Simulator, an Android emulator
     or a device, or the client sends them. Write it AFTER the brand board is approved.
     One iOS capture size and one Android size are enough: the engine draws every store size
     (6.9", 6.3", 6.5", Play) from them, inside its own device frames. Capture on the LARGEST device,
     so no store size ever draws a screen larger than its pixels.
     The values below are the demo ("Brimpage", an invented journaling app), as if it had a build. -->

## Devices

| platform | device | capture size | saved to |
|---|---|---|---|
| iOS | iPhone 17 Pro Max simulator (or 16 Pro Max) | 1320 x 2868 | `raw/ios/<name>.png` |
| iPad (if the app runs on iPad) | "iPad Pro 13-inch (M5)" simulator | 2064 x 2752 | `raw/ipad/<name>.png` |
| Android | a 1080 x 2400 emulator (e.g. a Pixel 8 profile) | 1080 x 2400 | `raw/android/<name>.png` |
| per locale | same devices, app in that language | same | `raw/<platform>/<locale>/<name>.png` |

## Clean status bar

```bash
# iOS Simulator: 9:41, full Wi-Fi, full bars, full battery, no carrier name
xcrun simctl boot "iPhone 17 Pro Max" && open -a Simulator
xcrun simctl status_bar booted override --time "9:41" --dataNetwork wifi --wifiMode active --wifiBars 3 \
  --cellularMode active --cellularBars 4 --operatorName '' --batteryState charged --batteryLevel 100
xcrun simctl ui booted appearance light          # or dark, for a dark-mode set

# Android emulator: SystemUI demo mode (fixed clock, full battery and signal, no notifications)
adb shell settings put global sysui_demo_allowed 1
adb shell am broadcast -a com.android.systemui.demo -e command enter
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 1200
adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
adb shell am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4
adb shell am broadcast -a com.android.systemui.demo -e command network -e mobile show -e datatype none -e level 4
adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
adb shell am broadcast -a com.android.systemui.demo -e command status -e volume hide -e bluetooth hide -e location hide -e alarm hide
adb shell cmd uimode night no                    # or yes
```

## Capture

```bash
xcrun simctl io booted screenshot --type=png --mask=ignored raw/ios/home.png   # never --mask=alpha
adb exec-out screencap -p > raw/android/home.png                               # exec-out, not shell
# another language: iOS, relaunch with  xcrun simctl launch booted <bundle id> -AppleLanguages "(es)" -AppleLocale es_ES
#                   Android 13+:        adb shell cmd locale set-app-locales <package> --locales es-ES
```
End demo mode afterwards: `adb shell am broadcast -a com.android.systemui.demo -e command exit`,
`xcrun simctl status_bar booted clear`. The engine flattens any alpha when it renders, so a capture
with alpha still works, but `sips -g pixelWidth -g pixelHeight -g hasAlpha raw/ios/home.png` should say
`hasAlpha: no` for a clean source.

## Demo data (seed it before capturing)

Persona Sam, "today" Tuesday May 14, 12-day streak, last entry "A quiet Sunday walk" (Sunday May 12,
Riverside Park, mood Good, one photo, three tags), insights with three mood lifts. No real names,
emails, phone numbers, faces or locations; no debug banners, toasts, keyboards or permission dialogs.

## Screens

| name | where in the app | state to set up | boxes for the store images (capture px) |
|---|---|---|---|
| `home` | Today tab | prompt card visible, mood Good selected, two recent entries | `prompt`, `mood`, `entry` |
| `entry` | open "A quiet Sunday walk" | scrolled to show photo and tags, cursor after the last word | `photo`, `moodPicker`, `tags` |
| `insights` | Insights tab, Week | streak card and mood chart on screen | `streak`, `chart`, `lifts` |

Boxes for real captures: measure each card in an image viewer and write `raw/ios/home.boxes.json`
(and the Android one, the layout differs):
```json
{ "prompt": { "x": 60, "y": 834, "w": 1200, "h": 525, "r": 78 } }
```
or crop in the config instead: `crop: { ios: [60, 834, 1200, 525], android: [48, 540, 984, 486] }`.

## Screenshots sent by the client: check before use
- the sizes above (or larger, same aspect), PNG, not re-compressed, no device frame baked in;
- the same status bar time and data on every screen, one theme (light or dark) for the whole set;
- no real customer data; the Dynamic Island / camera hole not drawn in (the frames add them; if they
  are, set `brand.devices.iphone.island: false` or `pixel.camera: false`).

## Websites and web apps (Mode A for the web)

The same Chrome captures the live site; no screenshot tool needed. Use demo data (a demo account, a
staging site), never a client's real customer records.

| what | command | saved to |
|---|---|---|
| desktop, 1440 x 900 @2x | `npm run capture -- --url https://site.example --name home` | `raw/web/home.png` (2880 x 1800) |
| the whole page | `... --full` | `raw/web/home-full.png` |
| phone + tablet (responsive trio) | `... --mobile --tablet` | `raw/ios/`, `raw/android/`, `raw/ipad/` `home.png` |
| logged in | `... --cookies cookies.json` (a JSON array exported from the browser) or `--headers headers.json` | |
| another language / dark | `... --locale es` / `--theme dark` | `raw/<platform>/es/home.png` |

Before capturing: hide cookie banners, chat bubbles and promo bars with `--hide ".cookie,#chat"`;
wait for late content with `--wait ".chart svg"` or `--delay 800`; name the cards a store image will
lift with `--box "pricing=.pricing,hero=main .hero"` (writes `home.boxes.json`). Animations are frozen.
Look at every capture before using it: no half-loaded images, no hover states, no personal data.
Keep cookie and header files out of the repository (`.gitignore` them).

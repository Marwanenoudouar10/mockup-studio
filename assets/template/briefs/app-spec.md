# App spec (Mode B: from a description)

<!-- Use this when there is NO app build: a pre-launch idea, a description without designs, or a
     portfolio concept. It is the brief for the mock screens (screens/<name>.html, built with the kit,
     captured by `npm run screens`). Two passes: at Step 0 record the intake description (name,
     one-liner, audience, platforms, locales); AFTER the brand board is approved write the persona,
     the screens and the story map.
     Rules: 5-8 key screens; realistic, consistent content for ONE demo persona (same name, same dates,
     numbers that add up: re-do every sum, date sums too: $40 every Monday from Nov 2 is $800 by
     Mar 15 and $880 by Mar 29); for each screen, the element a store image will lift out at reading size
     becomes a data-box name. Each store image gets its OWN proof card: never the same card or ring as
     the proof of two images. A lifted box comes from a screen that NO phone or tile on that image
     shows (the render warns "is also visible in ..."): plan one support box per screen for the hero, and
     when the art direction says "stats breaking out of the phone", lift a stat from ANOTHER screen.
     Same data on iOS and Android (an avatar stack, a count, a label: check both captures). Every number
     a card shows adds up with the others (a total, a pace, a projection, a date range).
     Invented names only: no real people, brands or customer data.
     The values below are the demo ("Brimpage", an invented journaling app): replace them. -->

- **App name:** Brimpage
- **One-liner:** A five-minute journal that turns small daily notes into clear patterns.
- **Audience:** busy adults, 25 to 45, who want to journal but never keep it up
- **Platforms:** iOS first (iPhone 6.9" and 6.3" sets), Android (Google Play phone set), web app (og, Product Hunt, portfolio)
- **Locales:** en (default), es
- **Look:** brand tokens from `brand/tokens.json`; in-app titles in an editorial serif (`screens/app.css`)

## Demo persona

Sam, 31, journals on the bus home. "Today" is **Tuesday, May 14**. Current streak: **12 days**
(longest yet). Last entry: **"A quiet Sunday walk"**, Sunday May 12 at 7:48 PM, Riverside Park,
mood Good. What lifts Sam's mood: walks outside (+32%), seeing friends (+27%), reading (+18%).

## Screens

| # | name | purpose | realistic content | data-box (lifted in the store images) | status |
|---|---|---|---|---|---|
| 1 | `home` | the daily entry point | "Good morning, Sam", week strip May 13-19 with mood dots, today's prompt "What made you smile today, even for a second?", mood check-in (Good selected), two recent entries | `prompt`, `mood`, `entry` | built |
| 2 | `entry` | writing an entry | "A quiet Sunday walk", Riverside Park, 18° clear, mood chips Good / Calm / Grateful, a dusk photo, two short paragraphs, tags #walk #slow sunday #gratitude | `photo`, `moodPicker`, `tags` | built |
| 3 | `insights` | patterns over time | 12-day streak with this week's checks, mood by day (best day Saturday), "What lifts your mood" with three bars | `streak`, `chart`, `lifts` | built |
| 4 | `journal` | browse past entries | May calendar with a mood dot per day, search, the month's entries as a list | `calendar` | not needed for 3 images |
| 5 | `reminder` | onboarding: pick a time | "When do you want to write?", time wheel at 9:00 PM, gentle-nudge switch on | `reminder` | not needed |
| 6 | `privacy` | supports "Private by default" | Face ID lock on, "Only you can read your journal", export and delete rows | `lock` | not needed |

## Story map (which screen proves which image)

| image | headline | proof (phone + lifted boxes) |
|---|---|---|
| 1 hero | Your day, one page at a time | `home` in the phone; `insights#streak`, `insights#lifts`; badge "Private by default" |
| 2 | Write it down in seconds | `entry` in the phone; `home#prompt` lifted |
| 3 | See what lifts your mood | `insights` as a tile; `entry` in a phone; `home#mood` lifted |

## Web screens (when the product is also a website or web app)

Desktop pages live in `screens/web/<name>.html` (platform=web, captured at 1440 x 900 @2x into `raw/web/`).
Build them from the web kit: `.app` + `.sidebar` + `.topbar` (app shell), `.dash` + `.span-N` + `.kpi`
(dashboards), `.chart[data-chart]`, `.table`, `.form`, `.modal`, and for marketing pages `.site-nav`,
`.hero`, `.features`, `.pricing`. Reference page: `/screens/kit/web-demo.html?platform=web` (npm run preview).
`<meta name="kit-sizes" content="web,ipad,ios">` also captures the page at tablet and phone width.

| # | name | purpose | realistic content | data-box | sizes |
|---|---|---|---|---|---|
| W1 | `journal` | write and browse on the desktop | sidebar with collections, today's prompt, six May entries, "A quiet Sunday walk" open with photo and three paragraphs, streak and mood rail | `prompt`, `entry`, `editor`, `photo`, `streak`, `week`, `memory` | web, ipad, ios |
| W2 | `dashboard` | insights for the month | streak 12 days, 23 entries, 6.4k words, mood 4.1; mood over time vs April; what lifts your mood; moods donut; recent entries table | `kpiStreak`, `trend`, `lifts`, `moods`, `recent` | web |

Wide images (og, Product Hunt, portfolio cover): W1 in a browser frame with `prompt` lifted (og, PH 1);
W2 on a laptop with `lifts` lifted (PH 2); W1 on laptop + tablet + phone, the responsive trio (PH 3, cover).

After editing a screen: `npm run screens`, look at `raw/ios/`, `raw/android/` and `raw/web/`, then `npm run export`.

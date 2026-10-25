# Brand brief

<!-- Step 1 of the brand flow, in BOTH modes (from screenshots / from a description).
     Fill every field before `npm run brand -- palette`. Keep each answer to one line: the boards read
     Name, One-liner, Personality, Seed colour, Mood and Hero line from the "- **Field:** value" lines.
     The values below are the demo ("Brimpage", an invented journaling app): replace them.
     Mode A (the app exists): confirm what the brand already has (logo file, colours sampled from the
     screenshots, fonts) and write it here; the palette step then starts from the real primary. -->

- **Name:** Brimpage
- **One-liner:** A five-minute journal that turns small daily notes into clear patterns.
- **Audience:** Busy adults, 25 to 45, who want to journal but never keep it up; mostly iPhone, a third Android.
- **Personality (3 words):** calm, warm, honest
- **Category:** Health & Fitness (secondary: Lifestyle)
- **Competitors to stand apart from:** the big blue journaling apps (cool blue, dense screens, stock photos) and the gamified mood trackers (neon, cartoon mascots, badges everywhere).
- **Seed colour:** #6C5CE7 (a soft violet: evening calm, not the category's usual blue)
- **Mood:** warm (one of: balanced, calm, bold, warm, fresh, serious, electric)
- **Hero line:** Your day, <em>one&nbsp;page</em> at a time
- **Must keep:** nothing yet (pre-launch, no existing logo)
- **Avoid:** blue as the main colour; hearts and brains as symbols; anything clinical.
- **Mode:** B, from a description (no build yet; mock screens from `briefs/app-spec.md`)

## Brand decisions

<!-- One line per approved step, so anyone can rebuild the brand with the same commands. -->

| step | choice | command |
|---|---|---|
| colours | 1 Drenched · amber (seed #6C5CE7, warm) | `npm run brand -- palette` then `apply --palette 1` |
| fonts | 1 Poppins / Inter | `npm run brand -- fonts --pairs "Poppins/Inter,Newsreader/Inter,Space Grotesk/Inter"` then `apply --fonts 1` |
| logo | a Sunrise page, gradient icon | `npm run brand -- logos` then `apply --logo a` |
| board | approved | `npm run brand -- board` -> `final/brand/brand-board.png` |

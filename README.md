# Fat to Fit

A public daily scoreboard for losing **0.75 kg every week**: 10,000 steps a day, evening gym, calories in target and a daily vlog.
The public page is a **Weight Loss Journal** with no day limit: it runs from the first logged day to today and grows every day.

| Route | What it is |
|---|---|
| `/` | **Public dashboard** (your Instagram bio link). Scrollable day strip, KPIs, weight / weekly-change / sleep / calories / steps charts, macro, sleep and outcome donuts, habit rings, body-part counts, GitHub-style consistency frame, full journal table. Reads the daily sheet every minute. |
| `/app` | Private day tracker (stopwatch, plan, notes, reel card). Not linked from the public page, not indexed. |
| `/api/sheet` | Tiny relay that serves your published Google Sheet (CSV) to the public page. |
| `/fat-to-fit-daily-sheet.xlsx` | The blank daily sheet. |

## The one data source: the daily sheet

One row per day, in a Google Sheet. The public page works out every number, chart and badge from it.

| Column | What to enter |
|---|---|
| Date | Pre-filled. Never type it. |
| Rest day / Gym done / Vlog posted | Yes / No dropdowns. A rest day counts the run and gym as done. |
| Weight (kg) | Morning weigh-in. The first one is your start weight. |
| Sleep (h) | Hours slept the night before (target 7 h). |
| Steps, Notes | Steps count as done at the target (10,000; `11k` and `11,000` both work). Notes is free text and is not shown. |
| Workout, Body parts | e.g. `Leg day`, `quads, glutes, calves` (also `legs`, `arms`, `core`). |
| Calories, Protein, Carbs, Fat | Day totals. Calories count when at or under target. |
| Vlog link | The Instagram reel link (instagram.com only). |

A **perfect day** = steps at target + gym + calories in target + vlog posted. Targets live in `src/config.js` (`TARGETS`).

### One-time setup
1. Upload `fat-to-fit-daily-sheet.xlsx` to Google Drive → open with Google Sheets → **File → Save as Google Sheets**.
2. **Share → General access → Anyone with the link → Viewer** (never Editor, or anyone could change your public numbers).
3. The site reads the sheet given in `api/sheet.js` (`DEFAULT_URL`, the sheet's `export?format=csv` address: first tab, "Daily log").
   To use a different sheet, set `SHEET_CSV_URL` in Vercel (Settings → Environment Variables) and redeploy.
4. Instagram bio link: your site's root address. Preview with sample data first: `…/?demo`. Check the live feed: `…/api/sheet` should show CSV text.

New colour-coded template later? In the same Google Sheet: **File → Import → Upload → Replace spreadsheet** keeps the link and sharing settings.

Colours: green = target met, amber = close, red = missed, blue = rest day, a pale-green row = perfect day. Columns O–Q (target weight, vs target, score of 4) calculate themselves; the public page reads columns A–N only.

Edits appear on the page within a minute or two. The template pre-lists dates from 16 Oct 2026, so past days can be back-filled by typing into those rows.

## Rename the Vercel address
Vercel → Project → **Settings → Domains** → add `fat-to-fit.vercel.app` (or any free name) → set it as primary.
(Optional) **Settings → General → Project Name** and the GitHub repo name.

## Develop
```
npm install
npm run dev       # the /api relay only runs on Vercel
npm run build
npm run sheet     # regenerate public/fat-to-fit-daily-sheet.xlsx from the dates in config.js
```

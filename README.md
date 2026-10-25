# Fat to Fit

A public daily scoreboard for losing **0.75 kg every week**: a 10 km morning run, evening gym, calories in target and a daily vlog.
21-day challenge: Day 1 = Mon 26 Oct 2026 → Sun 15 Nov (change `START` / `END` in `src/config.js`).

| Route | What it is |
|---|---|
| `/` | **Public page** (your Instagram bio link). Weight vs target pace, today's checklist, body map, macros, a GitHub-style frame of perfect days, run chart. Reads the daily sheet. |
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
| Run (km), Run time (min) | The run counts as done at the target distance (10 km). |
| Workout, Body parts | e.g. `Leg day`, `quads, glutes, calves` (also `legs`, `arms`, `core`). |
| Calories, Protein, Carbs, Fat | Day totals. Calories count when at or under target. |
| Vlog link | The Instagram reel link (instagram.com only). |

A **perfect day** = run at target + gym + calories in target + vlog posted. Targets live in `src/config.js` (`TARGETS`).

### One-time setup
1. Upload `fat-to-fit-daily-sheet.xlsx` to Google Drive → open with Google Sheets → **File → Save as Google Sheets**.
2. **File → Share → Publish to web** → pick the **Daily log** tab → **Comma-separated values (.csv)** → **Publish** → copy the link.
3. Vercel → Project → **Settings → Environment Variables** → add `SHEET_CSV_URL` = that link → **Redeploy**.
4. Instagram bio link: your site's root address. Preview with sample data first: `…/?demo`.

Edits to the sheet appear on the page within a few minutes (Google refreshes published sheets about every 5 minutes).

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

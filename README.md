# Winter Arc · 21 Days Hard Challenge

A 21-day discipline + fitness tracker (Day 1 = Mon 26 Oct → 15 Nov 2026; change `START` / `END` in `src/config.js`).
React + Vite. Your data lives in your browser; only the fitness numbers you choose to publish go to the public page.

| Route | What it is |
|---|---|
| `/` | **Public fitness page** (put this in your Instagram bio). Weight vs target pace, today's checklist (10 km run, gym, calories in target, vlog posted), body map, macros, and a GitHub-style frame of **perfect days**. Fitness only, no "Day N". `/show` is an alias. |
| `/app` | **Private tracker.** Today, Plan, Reel, Journey. |
| `/api/publish`, `/api/public` | Serverless functions that store and serve the published fitness numbers. |

## Make the bio link show your real data (one-time setup on Vercel)

Followers open the link on their own phones, so the page reads your published numbers from Vercel Blob.

1. Vercel project → **Storage** → **Create** → **Blob** → connect it to this project (adds `BLOB_READ_WRITE_TOKEN`).
2. Project → **Settings → Environment Variables** → add `ADMIN_TOKEN` = a password you choose.
3. **Deployments → … → Redeploy** so the functions pick up both.
4. Open `https://YOUR-SITE.vercel.app/app` → **Journey → Public page**, enter the same password, **Save & publish**.
   After that it auto-publishes a few seconds after you change weight, run, gym or nutrition.
5. Instagram bio link: `https://YOUR-SITE.vercel.app/`

Only these fields are ever published: weight, run done/km/min, gym done/workout name/body parts, calories and macros, rest day, vlog posted (+ an optional Instagram link), your weekly loss target and calorie/protein targets. Notes, plans, work hours, habits and the stopwatch log are never sent (the server also drops anything else).

## Where the data lives

| What | Where |
|---|---|
| Numbers you type in `/app` (weight, km, calories, workout, rest day, vlog tick) | Your browser (localStorage) |
| Published copy of the fitness numbers | Vercel Blob: `public/fitness.json` (what `/` reads) |
| Screenshots and photos (Strava, HealthifyMe, gym, scale) | Vercel Blob: `proofs/<date>/…` (shrunk to ≤1400 px JPEG in the browser first) |
| Password | `ADMIN_TOKEN` in Vercel env vars, and saved once in your browser (Journey → Public page) |

Strava / HealthifyMe are not connected automatically: you type the numbers and attach the screenshot as proof.
Crop Strava maps (home location) and HealthifyMe screens (name, email) before uploading. Anyone with the link can open an uploaded image.

## Daily update (2 minutes, from your phone, at `/app`)

Today tab → **Fitness** panel: morning weight, run km, workout + body parts, calories, vlog link (and tick "Daily vlog posted"). Use **Rest day** on a planned rest day: it waives the run and gym only; calories and vlog still count. The public page updates itself a few seconds later.
A **perfect day** = run at your daily target + gym + calories logged and within target + vlog posted. Change the run target (default 10 km), weight target and calorie target in Journey → Targets.
Your data lives in the browser you update from, so always update from the same phone.

## Excel

Journey → Public page → **Download Excel (.xlsx)**: Summary, Daily log (with target weight each day) and Weekly sheets. Fitness only, so it is safe to share or upload to Google Sheets.

## Run locally

```
npm install
npm run dev      # the /api functions only run on Vercel
npm run build
```

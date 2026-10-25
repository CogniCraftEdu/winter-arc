# Winter Arc · 21 Days Hard Challenge

A 21-day discipline + fitness tracker (22 Oct → 11 Nov 2026; change `START` / `END` in `src/config.js`).
React + Vite. Your data lives in your browser; only the fitness numbers you choose to publish go to the public page.

| Route | What it is |
|---|---|
| `/` | **Public fitness page** (put this in your Instagram bio). Weight vs target pace, morning run, evening gym, body parts, calories, macros, run + gym consistency frame. Fitness only, no "Day N". `/show` is an alias. |
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

Only these fields are ever published: weight, run done/km/min, gym done/workout name/body parts, calories and macros, your weekly loss target and calorie/protein targets. Notes, plans, work hours, habits and the stopwatch log are never sent (the server also drops anything else).

## Excel

Journey → Public page → **Download Excel (.xlsx)**: Summary, Daily log (with target weight each day) and Weekly sheets. Fitness only, so it is safe to share or upload to Google Sheets.

## Run locally

```
npm install
npm run dev      # the /api functions only run on Vercel
npm run build
```

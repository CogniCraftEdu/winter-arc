# Winter Arc

76-day discipline tracker: 4 Oct → 18 Dec 2026. React + Vite, no backend; data lives in the browser (localStorage).

```
npm install
npm run dev      # local
npm run build    # static site in dist/ — host anywhere (Netlify, Vercel, GitHub Pages)
```

- **Today** – the 6 non-negotiables, live schedule (current block highlighted), planned tasks
- **Timer** – all-day stopwatch; every session is logged and categorised. Work + Study count toward the 10h rule
- **Plan** – fill the flexible blocks (9–1, 2–9) the night before
- **Food** – calorie/protein log; a logged junk meal fails the day
- **Notes** – daily learnings, wins, mistakes, evening reflection, searchable
- **Journey** – 76-day grid, streaks, targets, JSON export/import

Rules: only today is editable (the past is locked), a day is "won" only when all 6 rules pass. Dates and rules are in `src/config.js`.

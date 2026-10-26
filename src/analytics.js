import { MUSCLES } from './config.js';
import { addDays, diffDays, fromKey } from './lib.js';
import { dayStatus } from './fitness.js';

// Everything the dashboard shows is computed here from a journal (see sheet.js):
// { target: { perWeek, startWeight, steps, kcal, protein, sleep }, days: { 'YYYY-MM-DD': row } }.
// There is no fixed length: the range runs from the first logged day to today and grows every day.

const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const r1 = (n) => (n == null ? null : Math.round(n * 10) / 10);
const r2 = (n) => (n == null ? null : Math.round(n * 100) / 100);

export function dateRange(a, b) { const out = []; for (let d = a; d <= b; d = addDays(d, 1)) out.push(d); return out; }

// One entry per calendar day from the first logged day to today (days with no row are kept so gaps are visible).
export function buildDays(journal, today) {
  const keys = Object.keys(journal.days).filter((k) => k <= today).sort();
  if (!keys.length) return [];
  const t = journal.target;
  const dates = dateRange(keys[0], today);
  const startEntry = t.startWeight != null ? { date: keys[0], w: t.startWeight } : (() => { const k = keys.find((x) => journal.days[x].w != null); return k ? { date: k, w: journal.days[k].w } : null; })();
  const days = dates.map((k) => {
    const row = journal.days[k] || null;
    return {
      k, row, st: row ? dayStatus(row, t) : null, w: row?.w ?? null, ma7: null,
      target: startEntry && k >= startEntry.date ? r2(startEntry.w - t.perWeek * (diffDays(k, startEntry.date) / 7)) : null,
    };
  });
  // 7-day moving average over calendar days (needs at least one weigh-in in the window)
  days.forEach((d, i) => { const ws = days.slice(Math.max(0, i - 6), i + 1).map((x) => x.w).filter((x) => x != null); d.ma7 = ws.length ? r2(avg(ws)) : null; });
  return days;
}

// Least-squares slope of weight over the last `window` calendar days -> kg per week (negative = losing).
export function weightTrend(days, window = 14) {
  const pts = days.slice(-window).map((d, i, a) => ({ x: i - (a.length - 1), y: d.w })).filter((p) => p.y != null);
  if (pts.length < 4 || pts[pts.length - 1].x - pts[0].x < 5) return null;
  const mx = avg(pts.map((p) => p.x)); const my = avg(pts.map((p) => p.y));
  const den = pts.reduce((t, p) => t + (p.x - mx) ** 2, 0);
  if (!den) return null;
  const slope = pts.reduce((t, p) => t + (p.x - mx) * (p.y - my), 0) / den;
  return { perWeek: r2(slope * 7), now: r2(my + slope * (0 - mx)), n: pts.length };
}

// Monday-start weeks. change = last weigh-in of the week minus the last weigh-in of the previous week
// (the first week is measured from the first weigh-in). partial = the week is not over yet, or it is the first week.
export function weeklyChange(days, today) {
  const mondayOf = (k) => addDays(k, -((fromKey(k).getDay() + 6) % 7));
  const weeks = new Map();
  for (const d of days) { const m = mondayOf(d.k); if (!weeks.has(m)) weeks.set(m, []); weeks.get(m).push(d); }
  const out = []; let prev = null; let first = true;
  for (const [start, ds] of weeks) {
    const ws = ds.filter((d) => d.w != null);
    const last = ws.length ? ws[ws.length - 1].w : null;
    const base = prev ?? (ws.length ? ws[0].w : null);
    out.push({ start, end: addDays(start, 6), n: ws.length, last, change: last != null && base != null ? r2(last - base) : null, partial: first || addDays(start, 6) >= today });
    if (last != null) prev = last;
    first = false;
  }
  return out;
}

export function overview(days, journal) {
  const t = journal.target;
  const ws = days.filter((d) => d.w != null);
  if (!ws.length) return null;
  const first = ws[0]; const last = ws[ws.length - 1];
  const start = t.startWeight ?? first.w;
  const trend = weightTrend(days);
  const diff = last.target != null ? r2(last.w - last.target) : null; // negative = ahead of the target pace
  return {
    start, startDate: first.k, current: last.w, currentDate: last.k,
    lost: r2(start - last.w), pctOfStart: r1(((start - last.w) / start) * 100),
    targetNow: last.target, diff, status: diff == null ? null : diff <= -0.05 ? 'ahead' : diff >= 0.05 ? 'behind' : 'on pace',
    trend, weighIns: ws.length,
    // where the 14-day trend would put you in 4 weeks
    in4weeks: trend ? r1(trend.now + trend.perWeek * 4) : null,
  };
}

// Stats over the last `n` days (or everything when n is null). Only days that have a row count as tracked.
export function aggregates(days, journal, n = null) {
  const t = journal.target;
  const slice = (n ? days.slice(-n) : days);
  const tracked = slice.filter((d) => d.row);
  const rows = tracked.map((d) => d.row);

  const withMacros = rows.filter((r) => r.p != null || r.c != null || r.f != null);
  const grams = { p: avg(withMacros.map((r) => r.p ?? 0)) ?? 0, c: avg(withMacros.map((r) => r.c ?? 0)) ?? 0, f: avg(withMacros.map((r) => r.f ?? 0)) ?? 0 };
  const macroKcal = { p: grams.p * 4, c: grams.c * 4, f: grams.f * 9 };
  const mk = macroKcal.p + macroKcal.c + macroKcal.f;

  const outcome = { perfect: 0, rest: 0, three: 0, low: 0 };
  for (const d of tracked) { const s = d.st; if (s.rest) outcome.rest += 1; else if (s.perfect) outcome.perfect += 1; else if (s.n === 3) outcome.three += 1; else outcome.low += 1; }

  const pct = (c, of) => (of ? Math.round((c / of) * 100) : null);
  const T = tracked.length;
  const hit = {
    steps: pct(tracked.filter((d) => d.st.steps).length, T), gym: pct(tracked.filter((d) => d.st.gym).length, T),
    cal: pct(tracked.filter((d) => d.st.cal).length, T), vlog: pct(tracked.filter((d) => d.st.vlog).length, T),
    sleep: pct(rows.filter((r) => r.sleep != null && r.sleep >= t.sleep).length, rows.filter((r) => r.sleep != null).length),
  };

  const sl = rows.map((r) => r.sleep).filter((x) => x != null);
  const sleep = { avg: r1(avg(sl)), n: sl.length, buckets: { under6: sl.filter((x) => x < 6).length, s6to7: sl.filter((x) => x >= 6 && x < 7).length, s7to8: sl.filter((x) => x >= 7 && x < 8).length, over8: sl.filter((x) => x >= 8).length } };

  const stepRows = rows.filter((r) => r.steps != null && r.steps > 0);
  const total = stepRows.reduce((x, r) => x + r.steps, 0);
  const steps = { count: stepRows.length, total, avg: stepRows.length ? Math.round(total / stepRows.length) : null, best: stepRows.length ? Math.max(...stepRows.map((r) => r.steps)) : null };

  const kc = rows.map((r) => r.kcal).filter((x) => x != null);
  const calories = { avg: kc.length ? Math.round(avg(kc)) : null, n: kc.length, overDays: kc.filter((x) => t.kcal && x > t.kcal).length };

  const parts = Object.fromEntries(MUSCLES.map((m) => [m.id, 0]));
  for (const r of rows) for (const p of r.trained || []) if (p in parts) parts[p] += 1;

  return {
    days: slice.length, tracked: T, outcome, hit, sleep, steps, calories, parts,
    macros: { grams, share: mk ? { p: macroKcal.p / mk, c: macroKcal.c / mk, f: macroKcal.f / mk } : null, n: withMacros.length },
    gyms: rows.filter((r) => r.gymDone && !r.rest).length, rests: rows.filter((r) => r.rest).length, vlogs: rows.filter((r) => r.vlog).length,
    perfect: outcome.perfect + tracked.filter((d) => d.st.perfect && d.st.rest).length,
  };
}

// Current and best run of consecutive perfect days. Today is still open, so an unfinished today doesn't break the current run.
export function perfectStreaks(days, today) {
  let cur = 0; let best = 0; let run = 0;
  for (const d of days) {
    if (d.st?.perfect) { run += 1; best = Math.max(best, run); } else if (d.k !== today) run = 0;
  }
  for (let i = days.length - 1; i >= 0; i -= 1) {
    const d = days[i];
    if (d.st?.perfect) cur += 1; else if (d.k === today) continue; else break;
  }
  return { cur, best };
}

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
      score: row ? kaizenScore(row, dayStatus(row, t), t) : null,
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

// Badges earned so far, each with the day it was reached, plus how far away the next one in every category is.
const LADDERS = [
  { cat: 'weight', unit: 'kg lost', steps: [1, 2, 3, 5, 7.5, 10, 15, 20], title: (n) => `${n} kg down` },
  { cat: 'streak', unit: 'perfect days in a row', steps: [3, 7, 14, 30, 60], title: (n) => `${n}-day perfect streak` },
  { cat: 'steps', unit: 'steps walked', steps: [50000, 100000, 250000, 500000, 1000000], title: (n) => `${n.toLocaleString('en-IN')} steps` },
  { cat: 'vlogs', unit: 'vlogs posted', steps: [7, 14, 30, 60, 100], title: (n) => `${n} vlogs posted` },
  { cat: 'days', unit: 'days logged', steps: [7, 14, 30, 60, 100], title: (n) => `${n} days logged` },
];

export function milestones(days, journal) {
  const start = overview(days, journal)?.start ?? null;
  const reached = Object.fromEntries(LADDERS.map((l) => [l.cat, new Map()]));
  const mark = (cat, value, date) => { for (const n of LADDERS.find((l) => l.cat === cat).steps) if (value >= n - 1e-9 && !reached[cat].has(n)) reached[cat].set(n, date); };
  let run = 0; let best = 0; let stepsTotal = 0; let vlogs = 0; let logged = 0; let bestLost = 0;
  for (const d of days) {
    if (!d.row) { run = 0; continue; }
    logged += 1; mark('days', logged, d.k);
    if (d.w != null && start != null) { bestLost = Math.max(bestLost, start - d.w); mark('weight', bestLost, d.k); }
    run = d.st.perfect ? run + 1 : 0; best = Math.max(best, run); mark('streak', best, d.k);
    stepsTotal += d.row.steps || 0; mark('steps', stepsTotal, d.k);
    if (d.row.vlog) { vlogs += 1; mark('vlogs', vlogs, d.k); }
  }
  const have = { weight: Math.max(0, +bestLost.toFixed(2)), streak: best, steps: stepsTotal, vlogs, days: logged };
  const earned = []; const next = [];
  for (const l of LADDERS) {
    for (const n of l.steps) if (reached[l.cat].has(n)) earned.push({ cat: l.cat, n, title: l.title(n), date: reached[l.cat].get(n) });
    const up = l.steps.find((n) => !reached[l.cat].has(n));
    if (up != null) next.push({ cat: l.cat, n: up, title: l.title(up), have: have[l.cat], unit: l.unit });
  }
  earned.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.n - a.n));
  return { earned, next, have };
}

// The days that mattered, found automatically: start, biggest drop, scale bounces, new lows, best streak,
// best steps / sleep / week, first missed goals, weight and steps milestones, and the latest day.
// Each is { id, date, kind, tone: 'good' | 'info' | 'warn', title, detail }, ordered by date.
export function highlights(days, journal, today) {
  const t = journal.target;
  const ev = [];
  const add = (e) => ev.push({ tone: 'info', ...e });
  const ws = days.filter((d) => d.w != null);
  const logged = days.filter((d) => d.row);
  if (!logged.length) return [];
  const sgn1 = (n, d = 1) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(d)}`;
  const name = { steps: 'steps', gym: 'gym', cal: 'calories', vlog: 'vlog' };

  if (ws.length) add({ id: 'start', date: ws[0].k, kind: 'Start', tone: 'info', title: `Started at ${ws[0].w.toFixed(1)} kg`, detail: `Day one of the journal. Target: −${t.perWeek} kg every week.` });

  const steps = ws.slice(1).map((d, i) => ({ d, delta: +(d.w - ws[i].w).toFixed(2) }));
  const drop = steps.reduce((a, s) => (!a || s.delta < a.delta ? s : a), null);
  if (drop && drop.delta <= -0.2) add({ id: 'drop', date: drop.d.k, kind: 'Biggest drop', tone: 'good', title: `${sgn1(drop.delta)} kg between weigh-ins`, detail: `Down to ${drop.d.w.toFixed(1)} kg, the biggest single fall so far.` });
  const up = steps.reduce((a, s) => (!a || s.delta > a.delta ? s : a), null);
  if (up && up.delta >= 0.3) add({ id: 'bounce', date: up.d.k, kind: 'Scale bounce', tone: 'warn', title: `${sgn1(up.delta)} kg on the scale`, detail: 'Daily weight swings with water, salt and timing. The trend line is what counts.' });
  if (ws.length > 2) { const low = ws.reduce((a, d) => (d.w < a.w ? d : a), ws[0]); if (low.k !== ws[0].k) add({ id: 'low', date: low.k, kind: 'Lowest weight', tone: 'good', title: `${low.w.toFixed(1)} kg, a new low`, detail: `${(ws[0].w - low.w).toFixed(1)} kg below the starting weight.` }); }

  let run = 0; let best = { n: 0, end: null, start: null }; let startK = null;
  for (const d of days) {
    if (d.st?.perfect) { if (!run) startK = d.k; run += 1; if (run > best.n) best = { n: run, end: d.k, start: startK }; } else if (d.k !== today) run = 0;
  }
  if (best.n >= 3) add({ id: 'streak', date: best.end, kind: 'Longest streak', tone: 'good', title: `${best.n} perfect days in a row`, detail: `${fmtShortDate(best.start)} to ${fmtShortDate(best.end)}: steps, gym, calories and vlog every day.` });

  const stepRows = logged.filter((d) => d.row.steps > 0);
  if (stepRows.length > 2) {
    const top = stepRows.reduce((a, d) => (d.row.steps > a.row.steps ? d : a), stepRows[0]);
    const mean = stepRows.reduce((a, d) => a + d.row.steps, 0) / stepRows.length;
    if (top.row.steps > mean * 1.05) add({ id: 'steps', date: top.k, kind: 'Most steps', tone: 'good', title: `${top.row.steps.toLocaleString('en-IN')} steps`, detail: `${Math.round((top.row.steps / mean - 1) * 100)}% above the usual day.` });
  }
  const sleepRows = logged.filter((d) => d.row.sleep != null);
  if (sleepRows.length > 2) { const top = sleepRows.reduce((a, d) => (d.row.sleep > a.row.sleep ? d : a), sleepRows[0]); add({ id: 'sleep', date: top.k, kind: 'Best sleep', tone: 'good', title: `${top.row.sleep} hours of sleep`, detail: `The longest night recorded${top.row.sleep >= t.sleep ? `, above the ${t.sleep} h target` : ''}.` }); }

  const wk = weeklyChange(days, today).filter((w) => w.change != null && w.change < 0 && w.n >= 2);
  if (wk.length) {
    const w = wk.reduce((a, x) => (x.change < a.change ? x : a), wk[0]);
    const last = days.filter((d) => d.k >= w.start && d.k <= w.end && d.w != null).pop();
    if (last && w.change <= -0.3) add({ id: 'week', date: last.k, kind: 'Best week', tone: 'good', title: `${sgn1(w.change)} kg in a week`, detail: `Week of ${fmtShortDate(w.start)}${w.partial ? ' (still in progress)' : ''}.` });
  }

  const miss = logged.find((d) => !d.st.perfect && !d.st.rest && d.k !== today);
  if (miss) { const lost = ['steps', 'gym', 'cal', 'vlog'].filter((k) => !miss.st[k]).map((k) => name[k]); add({ id: 'miss', date: miss.k, kind: 'First miss', tone: 'warn', title: `${miss.st.n} of 4 goals done`, detail: `Missed: ${lost.join(', ')}. Kaizen is about getting back on track the next day.` }); }

  for (const m of milestones(days, journal).earned.filter((e) => e.cat === 'weight' || e.cat === 'steps')) add({ id: `ms-${m.cat}-${m.n}`, date: m.date, kind: 'Milestone', tone: 'good', title: m.title, detail: m.cat === 'weight' ? 'Weight milestone reached.' : 'Total steps milestone reached.' });

  const latest = logged[logged.length - 1];
  add({ id: 'now', date: latest.k, kind: latest.k === today ? 'Today' : 'Latest', tone: 'info', title: latest.w != null ? `${latest.w.toFixed(1)} kg, ${latest.st.rest ? 'rest day' : `${latest.st.n} of 4 goals`}` : `${latest.st.rest ? 'Rest day' : `${latest.st.n} of 4 goals`}`, detail: `${logged.length} days logged so far.` });

  const order = { Start: 0, Milestone: 1, Today: 9, Latest: 9 };
  return ev.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (order[a.kind] ?? 5) - (order[b.kind] ?? 5)));
}
const fmtShortDate = (k) => fromKey(k).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

// ---------- Kaizen score, insights, comparisons, estimates, sheet checks ----------

// One 0-100 number per day: 70% goals met (of 4), 15% steps vs target, 15% sleep vs target.
// Without a sleep entry the score is out of the other 85 points, so not tracking sleep never costs points.
export function kaizenScore(row, st, t) {
  const goals = (st.n / 4) * 70;
  const stepsPart = st.rest ? 15 : Math.min(1, (row.steps || 0) / (t.steps || 1)) * 15;
  if (row.sleep == null) return Math.round(((goals + stepsPart) / 85) * 100);
  return Math.round(goals + stepsPart + Math.min(1, row.sleep / (t.sleep || 1)) * 15);
}

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const mondayOf = (k) => addDays(k, -((fromKey(k).getDay() + 6) % 7));
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const sg = (n, d = 1) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(d)}`;

// Patterns in the journal's own numbers. Only shown from 14 logged days, and every line carries its sample size.
export function insights(days, t, need = 14) {
  const logged = days.filter((d) => d.row);
  if (logged.length < need) return { ready: false, have: logged.length, need, items: [] };
  const byKey = new Map(days.map((d) => [d.k, d]));
  const into = (d) => { const p = byKey.get(addDays(d.k, -1)); return d.w != null && p?.w != null ? +(d.w - p.w).toFixed(2) : null; }; // change from the day before
  const items = [];
  const pairs = days.map((d) => ({ d, delta: into(d) })).filter((x) => x.delta != null);

  const sl = pairs.filter((x) => x.d.row?.sleep != null);
  const longN = sl.filter((x) => x.d.row.sleep >= t.sleep); const shortN = sl.filter((x) => x.d.row.sleep < t.sleep);
  if (longN.length >= 4 && shortN.length >= 4) {
    const a = mean(longN.map((x) => x.delta)); const b = mean(shortN.map((x) => x.delta));
    items.push({ id: 'sleep', icon: 'sleep', title: 'Sleep and the scale', n: `${longN.length} vs ${shortN.length} mornings`, text: Math.abs(a - b) >= 0.15 ? `Mornings after ${t.sleep}+ hours of sleep: the scale moved ${sg(a, 2)} kg on average. After shorter nights: ${sg(b, 2)} kg.` : `No clear link yet: ${sg(a, 2)} kg after ${t.sleep}+ hours vs ${sg(b, 2)} kg after less.` });
  }
  const stepsBy = Array.from({ length: 7 }, () => []);
  for (const d of logged) if (d.row.steps > 0) stepsBy[fromKey(d.k).getDay()].push(d.row.steps);
  const wd = stepsBy.map((a, i) => ({ i, n: a.length, avg: mean(a) })).filter((x) => x.n >= 2);
  if (wd.length >= 5) {
    const hi = wd.reduce((a, x) => (x.avg > a.avg ? x : a)); const lo = wd.reduce((a, x) => (x.avg < a.avg ? x : a));
    if (hi.avg > lo.avg * 1.08) items.push({ id: 'weekday', icon: 'steps', title: 'Walking by weekday', n: `${logged.length} days`, text: `${WEEKDAYS[hi.i]} is the best walking day (${Math.round(hi.avg).toLocaleString('en-IN')} steps on average), ${WEEKDAYS[lo.i]} the quietest (${Math.round(lo.avg).toLocaleString('en-IN')}).` });
  }
  const afterRest = pairs.filter((x) => byKey.get(addDays(x.d.k, -1))?.st?.rest);
  const afterTrain = pairs.filter((x) => { const p = byKey.get(addDays(x.d.k, -1)); return p?.st && !p.st.rest; });
  if (afterRest.length >= 2 && afterTrain.length >= 4) {
    const a = mean(afterRest.map((x) => x.delta)); const b = mean(afterTrain.map((x) => x.delta));
    items.push({ id: 'rest', icon: 'rest', title: 'Rest days', n: `${afterRest.length} rest days`, text: `The morning after a rest day the scale moved ${sg(a, 2)} kg on average, vs ${sg(b, 2)} kg after a training day.${afterRest.length < 4 ? ' (Small sample.)' : ''}` });
  }
  const over = pairs.filter((x) => { const p = byKey.get(addDays(x.d.k, -1)); return p?.row?.kcal != null && t.kcal && p.row.kcal > t.kcal; });
  const under = pairs.filter((x) => { const p = byKey.get(addDays(x.d.k, -1)); return p?.row?.kcal != null && t.kcal && p.row.kcal <= t.kcal; });
  if (over.length >= 3 && under.length >= 4) {
    const a = mean(over.map((x) => x.delta)); const b = mean(under.map((x) => x.delta));
    items.push({ id: 'cal', icon: 'cal', title: 'Calories and the scale', n: `${over.length} vs ${under.length} days`, text: `The morning after going over ${t.kcal} kcal the scale moved ${sg(a, 2)} kg. After a day within target: ${sg(b, 2)} kg.` });
  }
  const perf = logged.filter((d) => d.st.perfect).length;
  items.push({ id: 'perf', icon: 'perfect', title: 'Consistency', n: `${logged.length} days`, text: `${perf} of ${logged.length} days hit every goal (${Math.round((perf / logged.length) * 100)}%).` });
  return { ready: true, have: logged.length, need, items };
}

// This (Monday-start) week so far against the previous full week.
export function weekCompare(days, today) {
  const m = mondayOf(today); const pm = addDays(m, -7);
  const pick = (a, b) => days.filter((d) => d.k >= a && d.k <= b);
  const sum = (ds) => {
    const rows = ds.filter((d) => d.row);
    return { n: rows.length, weight: mean(ds.map((d) => d.w).filter((x) => x != null)), steps: mean(rows.map((d) => d.row.steps).filter((x) => x > 0)), kcal: mean(rows.map((d) => d.row.kcal).filter((x) => x != null)), sleep: mean(rows.map((d) => d.row.sleep).filter((x) => x != null)), perfect: rows.filter((d) => d.st.perfect).length };
  };
  const cur = sum(pick(m, today)); const prev = sum(pick(pm, addDays(m, -1)));
  if (!cur.n || !prev.n) return null;
  return { cur, prev, curStart: m, prevStart: pm };
}

// One line per Monday-start week.
export function weeklyReports(days, today) {
  const weeks = new Map();
  for (const d of days) { const m = mondayOf(d.k); if (!weeks.has(m)) weeks.set(m, []); weeks.get(m).push(d); }
  const out = []; let prevW = null;
  for (const [start, ds] of weeks) {
    const rows = ds.filter((d) => d.row); const ws = ds.filter((d) => d.w != null);
    const last = ws.length ? ws[ws.length - 1].w : null;
    const base = prevW ?? (ws.length ? ws[0].w : null);
    out.push({ start, end: addDays(start, 6), open: addDays(start, 6) >= today, days: rows.length, change: last != null && base != null && (prevW != null || ws.length > 1) ? +(last - base).toFixed(2) : null, perfect: rows.filter((d) => d.st.perfect).length, steps: mean(rows.map((d) => d.row.steps).filter((x) => x > 0)), score: mean(rows.map((d) => d.score)) });
    if (last != null) prevW = last;
  }
  return out.reverse();
}

// Rough weekly fat-loss estimate from calories in vs calories out. Needs sex, age and height in config (PROFILE); otherwise null.
export function estimateBurn(profile, weight, avgKcal, avgSteps, gymShare = 0) {
  if (!profile || !profile.sex || !profile.ageYears || !profile.heightCm || weight == null || avgKcal == null) return null;
  const bmr = 10 * weight + 6.25 * profile.heightCm - 5 * profile.ageYears + (profile.sex === 'male' ? 5 : -161);
  const tdee = bmr * 1.2 + (avgSteps || 0) * 0.045 * (weight / 70) + gymShare * 300;
  const deficit = tdee - avgKcal;
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), deficit: Math.round(deficit), weeklyKg: +((deficit * 7) / 7700).toFixed(2) };
}

// Warnings for the owner (open the page with ?check): values that look like typos before they confuse the public page.
export function sheetChecks(days, today) {
  const out = []; let prev = null;
  for (const d of days) {
    const r = d.row;
    if (!r) { if (d.k < today) out.push({ k: d.k, msg: 'No entry for this day.' }); continue; }
    if (r.w != null) {
      if (r.w < 30 || r.w > 250) out.push({ k: d.k, msg: `Weight ${r.w} kg looks wrong.` });
      if (prev && Math.abs(r.w - prev.w) > 3 && diffDays(d.k, prev.k) <= 3) out.push({ k: d.k, msg: `Weight jumped ${sg(r.w - prev.w)} kg since ${prev.k}.` });
      prev = { k: d.k, w: r.w };
    }
    if (r.steps != null && r.steps > 60000) out.push({ k: d.k, msg: `${r.steps.toLocaleString('en-IN')} steps looks too high.` });
    if (r.steps != null && r.steps > 0 && r.steps < 100) out.push({ k: d.k, msg: `Steps = ${r.steps}: did you enter kilometres?` });
    if (r.kcal != null && (r.kcal < 800 || r.kcal > 6000)) out.push({ k: d.k, msg: `${r.kcal} kcal looks wrong.` });
    if (r.sleep != null && (r.sleep < 2 || r.sleep > 14)) out.push({ k: d.k, msg: `${r.sleep} hours of sleep looks wrong.` });
    if (r.rest && r.steps > 0 && r.steps >= 8000) out.push({ k: d.k, msg: 'Marked as a rest day but has a lot of steps.' });
  }
  return out;
}

// A weekly experiment from config (EXPERIMENTS): the week under test against the 7 days before it.
export function experimentResult(exp, days, today, t) {
  const status = today < exp.start ? 'upcoming' : today <= exp.end ? 'running' : 'done';
  const inWin = days.filter((d) => d.k >= exp.start && d.k <= exp.end);
  const before = days.filter((d) => d.k >= addDays(exp.start, -7) && d.k < exp.start);
  const net = (ds) => { const ws = ds.filter((d) => d.w != null); return ws.length >= 2 ? +(ws[ws.length - 1].w - ws[0].w).toFixed(2) : null; };
  const rows = inWin.filter((d) => d.row);
  const ok = { sleep: (d) => d.row.sleep != null && d.row.sleep >= t.sleep, steps: (d) => d.st.steps, calories: (d) => d.st.cal }[exp.metric] || (() => false);
  const days7 = Math.max(1, Math.min(7, diffDays(exp.end, exp.start) + 1));
  const adherent = rows.filter(ok).length;
  const a = net(inWin); const b = net(before);
  return { ...exp, status, logged: rows.length, adherent, of: days7, change: a, baseChange: b, better: a != null && b != null ? a < b : null };
}

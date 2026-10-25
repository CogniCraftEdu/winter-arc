import { CATS, RULES } from './config.js';
import { addDays, allDays, buildFrame, dayNumber, dayResult, diffDays } from './lib.js';

// Everything the public page, the Excel export and the publish step need, in one plain shape:
// { target: { perWeek, startWeight }, days: { 'YYYY-MM-DD': { w, runDone, runKm, runMin, gymDone, workout, trained, kcal, p, c, f } } }
// Only fitness data goes in: no notes, plans, work hours, habits or quotes.

const num = (v) => (v === '' || v == null || Number.isNaN(+v) ? null : +v);

export function journalFromState(state, today) {
  const { days, settings } = state;
  const out = {};
  for (const [date, d] of Object.entries(days || {})) {
    if (date > today || !d) continue;
    const r = dayResult(d, settings, CATS, RULES);
    const nut = d.nutrition || {};
    const row = {
      w: num(d.weight),
      runDone: !!r.checks.run, runKm: num(d.run?.km), runMin: num(d.run?.min),
      gymDone: !!r.checks.gym, workout: (d.workout || '').trim(), trained: d.trained || [],
      kcal: num(nut.kcal), p: num(nut.p), c: num(nut.c), f: num(nut.f),
    };
    const any = row.w != null || row.runDone || row.gymDone || row.kcal != null || row.workout || row.trained.length;
    if (any) out[date] = row;
  }
  return { target: { perWeek: num(settings.targetLossPerWeek) ?? 0.75, startWeight: num(settings.startWeight), kcal: num(settings.calorieTarget), protein: num(settings.proteinTarget) }, days: out };
}

// Weight progress against the target pace (e.g. 0.75 kg lost per week).
export function paceInfo(journal, today, startDateFallback) {
  const entries = Object.entries(journal.days).filter(([d, v]) => d <= today && v.w != null).sort(([a], [b]) => (a < b ? -1 : 1));
  if (!entries.length) return null;
  const perWeek = journal.target.perWeek;
  const hasStart = journal.target.startWeight != null;
  const startDate = hasStart ? startDateFallback : entries[0][0];
  const start = hasStart ? journal.target.startWeight : entries[0][1].w;
  const [curDate, { w: current }] = entries[entries.length - 1];
  const weeks = Math.max(0, diffDays(curDate, startDate) / 7);
  const targetNow = start - perWeek * weeks;
  const diff = +(current - targetNow).toFixed(2); // negative = ahead of the target pace
  const prior = [...entries].reverse().find(([d]) => diffDays(curDate, d) >= 7);
  return {
    start, startDate, current, curDate, perWeek,
    lost: +(start - current).toFixed(2),
    targetNow: +targetNow.toFixed(2),
    diff,
    status: diff <= -0.05 ? 'ahead' : diff >= 0.05 ? 'behind' : 'on pace',
    weekChange: prior ? +(current - prior[1].w).toFixed(2) : null,
    points: entries.map(([date, v]) => ({ date, w: v.w })),
    targetAt: (date) => start - perWeek * (diffDays(date, startDate) / 7),
  };
}

// Frame for the fitness page: a day is "consistent" when both the morning run and the evening gym happened.
export function fitnessFrame(journal, today) {
  return buildFrame(allDays().map((k) => {
    const d = journal.days[k];
    const both = !!(d?.runDone && d?.gymDone);
    const one = !!(d?.runDone || d?.gymDone);
    return { date: k, n: dayNumber(k), done: both ? 2 : one ? 1 : 0, level: both ? 4 : one ? 2 : 0, won: both };
  }), today);
}

export function totals(journal) {
  const v = Object.values(journal.days);
  return {
    runs: v.filter((d) => d.runDone).length,
    km: +v.reduce((t, d) => t + (d.runKm || 0), 0).toFixed(1),
    gyms: v.filter((d) => d.gymDone).length,
  };
}

// Default weekly buckets (Monday-first) from the first logged day: used by the Excel export.
export function weekly(journal, today) {
  const dates = Object.keys(journal.days).filter((d) => d <= today).sort();
  if (!dates.length) return [];
  const first = dates[0];
  const rows = [];
  for (let s = first, i = 1; s <= today; s = addDays(s, 7), i += 1) {
    const e = addDays(s, 6);
    const inWeek = dates.filter((d) => d >= s && d <= e).map((d) => journal.days[d]);
    const ws = inWeek.map((d) => d.w).filter((x) => x != null);
    const ks = inWeek.map((d) => d.kcal).filter((x) => x != null);
    rows.push({
      week: i, start: s, end: e,
      avgW: ws.length ? ws.reduce((a, b) => a + b, 0) / ws.length : null,
      lastW: ws.length ? ws[ws.length - 1] : null,
      runs: inWeek.filter((d) => d.runDone).length,
      km: inWeek.reduce((t, d) => t + (d.runKm || 0), 0),
      gyms: inWeek.filter((d) => d.gymDone).length,
      avgKcal: ks.length ? ks.reduce((a, b) => a + b, 0) / ks.length : null,
    });
  }
  return rows;
}

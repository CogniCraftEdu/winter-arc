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
      rest: !!d.rest, vlog: !!r.checks.vlog, vlogUrl: /^https:\/\/(www\.)?instagram\.com\//.test(d.vlogUrl || '') ? d.vlogUrl.trim() : '',
    };
    const any = row.w != null || row.runDone || row.gymDone || row.kcal != null || row.workout || row.trained.length || row.rest || row.vlog;
    if (any) out[date] = row;
  }
  return { target: { perWeek: num(settings.targetLossPerWeek) ?? 0.75, startWeight: num(settings.startWeight), runKm: num(settings.runTargetKm) ?? 10, kcal: num(settings.calorieTarget), protein: num(settings.proteinTarget) }, days: out };
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

// The four daily commitments shown publicly: the run, the gym, calories logged within target, the vlog posted.
// A planned rest day waives the run and gym.
export function dayStatus(d, target) {
  const rest = !!d?.rest;
  const run = rest || !!d?.runDone;
  const gym = rest || !!d?.gymDone;
  const cal = d?.kcal != null && (!target?.kcal || d.kcal <= target.kcal);
  const vlog = !!d?.vlog;
  const n = [run, gym, cal, vlog].filter(Boolean).length;
  return { run, gym, cal, vlog, n, rest, perfect: n === 4 };
}

// Frame for the fitness page: a day lights up by how many of the four commitments were met; all four = a perfect (darkest) day.
export function fitnessFrame(journal, today) {
  return buildFrame(allDays().map((k) => {
    const s = dayStatus(journal.days[k], journal.target);
    return { date: k, n: dayNumber(k), done: s.n, level: s.n, won: s.perfect };
  }), today);
}

export function totals(journal, today = '9999-12-31') {
  const v = Object.entries(journal.days).filter(([d]) => d <= today).map(([, x]) => x);
  return {
    runs: v.filter((d) => d.runDone && !d.rest).length,
    km: +v.reduce((t, d) => t + (d.runKm || 0), 0).toFixed(1),
    gyms: v.filter((d) => d.gymDone && !d.rest).length,
    rests: v.filter((d) => d.rest).length,
    vlogs: v.filter((d) => d.vlog).length,
    perfect: v.filter((d) => dayStatus(d, journal.target).perfect).length,
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
      runs: inWeek.filter((d) => d.runDone && !d.rest).length,
      km: inWeek.reduce((t, d) => t + (d.runKm || 0), 0),
      gyms: inWeek.filter((d) => d.gymDone && !d.rest).length,
      avgKcal: ks.length ? ks.reduce((a, b) => a + b, 0) / ks.length : null,
      rests: inWeek.filter((d) => d.rest).length,
      perfect: inWeek.filter((d) => dayStatus(d, journal.target).perfect).length,
    });
  }
  return rows;
}

import { addDays, allDays, buildFrame, dayNumber, diffDays } from './lib.js';

// Analytics over a "journal": { target, days: { 'YYYY-MM-DD': { w, runKm, runMin, runDone, gymDone, workout, trained, kcal, p, c, f, rest, vlog, vlogUrl } } }.
// The journal is built from the daily sheet (see sheet.js).

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

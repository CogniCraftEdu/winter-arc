import { MUSCLES, START } from './config.js';
import { addDays, diffDays } from './lib.js';
import { dayStatus, journalFromState, paceInfo, totals, weekly } from './fitness.js';
import { buildXlsx, dec, int } from './xlsx.js';

const label = Object.fromEntries(MUSCLES.map((m) => [m.id, m.label]));
const r2 = (n) => (n == null ? null : +n.toFixed(2));

// A fitness-only workbook (no work hours, notes or plans), safe to share or upload to Google Sheets.
export function excelBytes(state, today) {
  const j = journalFromState(state, today);
  const pace = paceInfo(j, today, START);
  const dates = Object.keys(j.days).sort();
  const first = dates[0] || today;

  const daily = [['Date', 'Weight (kg)', 'Target weight (kg)', 'vs target (kg)', 'Rest day', 'Run target met', 'Run (km)', 'Run (min)', 'Gym done', 'Workout', 'Body parts', 'Calories', 'Calories in target', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Vlog posted', 'Perfect day']];
  for (let d = first; d <= today; d = addDays(d, 1)) {
    const v = j.days[d] || {};
    const target = pace ? pace.targetAt(d) : null;
    const s = dayStatus(j.days[d], j.target);
    const yn = (b) => (b ? 'Yes' : 'No');
    daily.push([
      { date: d }, dec(v.w), dec(r2(target)), v.w != null && target != null ? dec(r2(v.w - target)) : null,
      yn(v.rest), v.rest ? 'Rest' : yn(s.run), dec(v.runKm), dec(v.runMin), v.rest ? 'Rest' : yn(s.gym), v.workout || '', (v.trained || []).map((m) => label[m] || m).join(', '),
      int(v.kcal), v.kcal == null ? '' : yn(s.cal), int(v.p), int(v.c), int(v.f), yn(s.vlog), yn(s.perfect),
    ]);
  }

  const wk = [['Week', 'From', 'To', 'Avg weight (kg)', 'Last weight (kg)', 'Target change (kg)', 'Runs', 'Run (km)', 'Gym sessions', 'Rest days', 'Perfect days', 'Avg calories']];
  for (const w of weekly(j, today)) {
    wk.push([int(w.week), { date: w.start }, { date: w.end }, dec(r2(w.avgW)), dec(w.lastW), dec(-j.target.perWeek), int(w.runs), dec(r2(w.km)), int(w.gyms), int(w.rests), int(w.perfect), int(w.avgKcal == null ? null : Math.round(w.avgKcal))]);
  }

  const t = totals(j, today);
  const summary = [['Metric', 'Value'],
    ['Target', `Lose ${j.target.perWeek} kg per week`],
    ['Start weight (kg)', pace ? dec(pace.start) : ''], ['Current weight (kg)', pace ? dec(pace.current) : ''],
    ['Lost so far (kg)', pace ? dec(pace.lost) : ''], ['Target weight today (kg)', pace ? dec(pace.targetNow) : ''],
    ['Ahead (−) or behind (+) target (kg)', pace ? dec(pace.diff) : ''], ['Status', pace ? pace.status : ''],
    ['Weeks tracked', pace ? dec(+(diffDays(pace.curDate, pace.startDate) / 7).toFixed(1)) : ''],
    ['Daily run target (km)', dec(j.target.runKm)], ['Perfect days (run + gym + calories + vlog)', int(t.perfect)], ['Rest days', int(t.rests)],
    ['Runs completed', int(t.runs)], ['Total run distance (km)', dec(t.km)], ['Gym sessions', int(t.gyms)], ['Vlogs posted', int(t.vlogs)],
  ];

  return buildXlsx([
    { name: 'Summary', rows: summary, widths: [36, 28] },
    { name: 'Daily log', rows: daily, widths: [16, 12, 17, 13, 10, 14, 9, 9, 10, 20, 30, 10, 17, 11, 10, 8, 11, 12] },
    { name: 'Weekly', rows: wk, widths: [7, 16, 16, 15, 15, 17, 7, 10, 13, 11, 13, 13] },
  ]);
}

export function downloadExcel(state, today) {
  const blob = new Blob([excelBytes(state, today)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `fitness-journey-${today}.xlsx` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

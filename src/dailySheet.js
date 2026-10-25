import { BRAND, END, START, TARGETS } from './config.js';
import { addDays, diffDays } from './lib.js';
import { buildXlsx } from './xlsx.js';

// The one sheet you fill in each day. Dates are pre-filled (as text) so nothing is ever typed wrong.
// Columns A-N are yours to fill; O-Q calculate themselves. The public page reads A-N only.
export const SHEET_HEADERS = ['Date', 'Rest day', 'Weight (kg)', 'Run (km)', 'Run time (min)', 'Gym done', 'Workout', 'Body parts', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Vlog posted', 'Vlog link'];
const AUTO_HEADERS = ['Target weight (auto)', 'Vs target (auto)', 'Score of 4 (auto)'];

// dxf indexes (see xlsx.js): 0 green, 1 amber, 2 red, 3 blue, 4 pale green row, 5 today
const G = 0; const A = 1; const R = 2; const B = 3; const ROW = 4; const TODAY = 5;

export function dailySheetBytes() {
  const days = diffDays(END, START) + 1;
  const last = days + 40; // formulas, colours and dropdowns keep working if you add rows later
  const { perWeek, runKm, kcal } = TARGETS;

  const log = [[...SHEET_HEADERS, ...AUTO_HEADERS]];
  for (let r = 2; r <= last; r += 1) {
    log.push([
      r - 2 < days ? addDays(START, r - 2) : '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      { f: `IF(OR($C$2="",A${r}=""),"",ROUND($C$2-${perWeek}*(DATEVALUE(A${r})-DATEVALUE($A$2))/7,2))`, s: 6 },
      { f: `IF(OR(C${r}="",O${r}=""),"",ROUND(C${r}-O${r},2))`, s: 6 },
      { f: `IF(COUNTA(B${r}:N${r})=0,"",IF(OR(B${r}="Yes",AND(D${r}<>"",D${r}>=${runKm})),1,0)+IF(OR(B${r}="Yes",F${r}="Yes",G${r}<>""),1,0)+IF(AND(I${r}<>"",I${r}<=${kcal}),1,0)+IF(M${r}="Yes",1,0))`, s: 4 },
    ]);
  }

  const rng = (c) => `${c}2:${c}${last}`;
  const cf = [
    { sqref: rng('A'), rules: [{ f: 'A2=TEXT(TODAY(),"yyyy-mm-dd")', dxf: TODAY }] },
    { sqref: rng('B'), rules: [{ f: 'B2="Yes"', dxf: B }] },
    { sqref: rng('D'), rules: [{ f: `AND(D2<>"",D2>=${runKm})`, dxf: G }, { f: `AND(D2<>"",D2>0,D2<${runKm})`, dxf: A }] },
    { sqref: rng('F'), rules: [{ f: 'F2="Yes"', dxf: G }] },
    { sqref: rng('I'), rules: [{ f: `AND(I2<>"",I2<=${kcal})`, dxf: G }, { f: `AND(I2<>"",I2>${kcal})`, dxf: R }] },
    { sqref: rng('M'), rules: [{ f: 'M2="Yes"', dxf: G }] },
    { sqref: rng('P'), rules: [{ f: 'AND(ISNUMBER(P2),P2<=0)', dxf: G }, { f: 'AND(ISNUMBER(P2),P2>0,P2<=0.3)', dxf: A }, { f: 'AND(ISNUMBER(P2),P2>0.3)', dxf: R }] },
    { sqref: rng('Q'), rules: [{ f: 'AND(ISNUMBER(Q2),Q2=4)', dxf: G }, { f: 'AND(ISNUMBER(Q2),Q2=3)', dxf: A }, { f: 'AND(ISNUMBER(Q2),Q2<=2)', dxf: R }] },
    { sqref: `A2:N${last}`, rules: [{ f: 'AND(ISNUMBER($Q2),$Q2=4)', dxf: ROW }] }, // a perfect day tints the whole row
  ];

  const help = [
    [`${BRAND}: how this sheet works`],
    ['Fill ONE row per day in the "Daily log" tab. Columns A to N are yours; leave anything you did not do blank. Columns O to Q calculate themselves.'],
    ['Rest day, Gym done and Vlog posted have a Yes/No dropdown. A rest day counts the run and gym as done.'],
    [`A perfect day = run at ${runKm} km or more + gym + calories at or under ${kcal} + vlog posted (score 4 of 4).`],
    [`Weight target: lose ${perWeek} kg every week, measured from your Day 1 weight (row 2). Enter your Day 1 weight first.`],
    ['Body parts: names separated by commas, e.g. chest, triceps (or "legs", "arms", "core"). Vlog link: an instagram.com reel link.'],
    [''],
    ['Colours'],
    ['Green = target met (run, gym, calories in target, vlog, weight on or ahead of pace). Amber = close (short run, or up to 0.3 kg behind pace). Red = missed (over calories, more than 0.3 kg behind pace, score 2 or less).'],
    ['Blue = rest day. A fully green row is a perfect day. The blue bold date is today.'],
    [''],
    ['To make the public page read this sheet'],
    ['1. Google Sheets: File > Share > General access > "Anyone with the link" and set the role to Viewer (never Editor).'],
    ['2. The public page reads the first tab (Daily log). Keep that tab first and keep the header row as it is.'],
    ['3. Edits show on the public page within a minute or two.'],
  ];

  return buildXlsx([
    {
      name: 'Daily log', rows: log, cf, freezeCols: 1,
      headStyles: [...SHEET_HEADERS.map(() => 1), ...AUTO_HEADERS.map(() => 5)],
      widths: [13, 10, 12, 10, 14, 10, 22, 28, 10, 11, 10, 8, 12, 40, 14, 12, 12],
      validations: [{ sqref: `B2:B${last}`, list: 'Yes,No' }, { sqref: `F2:F${last}`, list: 'Yes,No' }, { sqref: `M2:M${last}`, list: 'Yes,No' }],
    },
    { name: 'How to use', rows: help, widths: [150] },
  ]);
}

export function downloadDailySheet() {
  const blob = new Blob([dailySheetBytes()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'fat-to-fit-daily-sheet.xlsx' });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

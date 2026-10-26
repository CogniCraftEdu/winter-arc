import { BRAND, SHEET_FIRST_DATE, SHEET_ROWS, TARGETS } from './config.js';
import { addDays } from './lib.js';
import { buildXlsx } from './xlsx.js';

// The one sheet you fill in each day. Dates are pre-filled (as text) so nothing is ever typed wrong.
// Columns A-O are yours to fill; P-R calculate themselves; S-T are hidden helpers. The dashboard reads A-O only.
export const SHEET_HEADERS = ['Date', 'Rest day', 'Weight (kg)', 'Sleep (hrs)', 'Run (km)', 'Run time (min)', 'Gym done', 'Workout', 'Body parts', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Vlog posted', 'Vlog link'];
const AUTO_HEADERS = ['Target weight (auto)', 'Vs target (auto)', 'Score of 4 (auto)'];
const HELPER_HEADERS = ['First weigh-in (helper)', 'Day number (helper)'];

// dxf indexes (see xlsx.js): 0 green, 1 amber, 2 red, 3 blue, 4 pale green row, 5 today
const G = 0; const A = 1; const R = 2; const B = 3; const ROW = 4; const TODAY = 5;

export function dailySheetBytes() {
  const last = SHEET_ROWS + 41; // formulas, colours and dropdowns keep working past the prefilled dates
  const { perWeek, runKm, kcal, sleep } = TARGETS;
  const S = `$S$2:$S$${last}`; const C = `$C$2:$C$${last}`; const T = `$T$2:$T$${last}`;
  const startW = `SUMIF(${S},1,${C})`; const startD = `SUMIF(${S},1,${T})`;

  const log = [[...SHEET_HEADERS, ...AUTO_HEADERS, ...HELPER_HEADERS]];
  for (let r = 2; r <= last; r += 1) {
    log.push([
      r - 2 < SHEET_ROWS ? addDays(SHEET_FIRST_DATE, r - 2) : '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      // target weight: from your FIRST weigh-in, losing perWeek kg per week
      { f: `IF(OR(A${r}="",SUM(${S})=0),"",IF(T${r}<${startD},"",ROUND(${startW}-${perWeek}*(T${r}-${startD})/7,2)))`, s: 6 },
      { f: `IF(OR(C${r}="",P${r}=""),"",ROUND(C${r}-P${r},2))`, s: 6 },
      { f: `IF(COUNTA(B${r}:O${r})=0,"",IF(OR(B${r}="Yes",AND(E${r}<>"",E${r}>=${runKm})),1,0)+IF(OR(B${r}="Yes",G${r}="Yes",H${r}<>""),1,0)+IF(AND(J${r}<>"",J${r}<=${kcal}),1,0)+IF(N${r}="Yes",1,0))`, s: 4 },
      { f: `IF(AND(ISNUMBER(C${r}),COUNT($C$2:C${r})=1),1,0)`, s: 4 },
      { f: `IF(A${r}="","",DATEVALUE(A${r}))`, s: 4 },
    ]);
  }

  const rng = (c) => `${c}2:${c}${last}`;
  const cf = [
    { sqref: rng('A'), rules: [{ f: 'A2=TEXT(TODAY(),"yyyy-mm-dd")', dxf: TODAY }] },
    { sqref: rng('B'), rules: [{ f: 'B2="Yes"', dxf: B }] },
    { sqref: rng('D'), rules: [{ f: `AND(D2<>"",D2>=${sleep})`, dxf: G }, { f: `AND(D2<>"",D2>=6,D2<${sleep})`, dxf: A }, { f: 'AND(D2<>"",D2<6)', dxf: R }] },
    { sqref: rng('E'), rules: [{ f: `AND(E2<>"",E2>=${runKm})`, dxf: G }, { f: `AND(E2<>"",E2>0,E2<${runKm})`, dxf: A }] },
    { sqref: rng('G'), rules: [{ f: 'G2="Yes"', dxf: G }] },
    { sqref: rng('J'), rules: [{ f: `AND(J2<>"",J2<=${kcal})`, dxf: G }, { f: `AND(J2<>"",J2>${kcal})`, dxf: R }] },
    { sqref: rng('N'), rules: [{ f: 'N2="Yes"', dxf: G }] },
    { sqref: rng('Q'), rules: [{ f: 'AND(ISNUMBER(Q2),Q2<=0)', dxf: G }, { f: 'AND(ISNUMBER(Q2),Q2>0,Q2<=0.3)', dxf: A }, { f: 'AND(ISNUMBER(Q2),Q2>0.3)', dxf: R }] },
    { sqref: rng('R'), rules: [{ f: 'AND(ISNUMBER(R2),R2=4)', dxf: G }, { f: 'AND(ISNUMBER(R2),R2=3)', dxf: A }, { f: 'AND(ISNUMBER(R2),R2<=2)', dxf: R }] },
    { sqref: `A2:O${last}`, rules: [{ f: 'AND(ISNUMBER($R2),$R2=4)', dxf: ROW }] }, // a perfect day tints the whole row
  ];

  const help = [
    [`${BRAND}: how this sheet works`],
    ['Fill ONE row per day in the "Daily log" tab. Columns A to O are yours; leave anything you did not do blank. Columns P to R calculate themselves (S and T are hidden helpers).'],
    ['The dashboard has no end date: it starts at the first row you fill and grows every day. Add past days (backfill) by filling the earlier dated rows.'],
    ['Rest day, Gym done and Vlog posted have a Yes/No dropdown. A rest day counts the run and gym as done.'],
    [`A perfect day = run at ${runKm} km or more + gym + calories at or under ${kcal} + vlog posted (score 4 of 4). Sleep is tracked separately (target ${sleep} hours).`],
    [`Weight target: lose ${perWeek} kg every week, counted from your FIRST weigh-in (whichever row it is in).`],
    ['Body parts: names separated by commas, e.g. chest, triceps (or "legs", "arms", "core"). Vlog link: an instagram.com reel link.'],
    ['Need more days? Copy the last dated row down; formulas, colours and dropdowns already cover 40 rows past the dates.'],
    [''],
    ['Colours'],
    ['Green = target met. Amber = close (short run, sleep 6 to 7 hours, up to 0.3 kg behind pace). Red = missed (over calories, sleep under 6, more than 0.3 kg behind pace, score 2 or less).'],
    ['Blue = rest day. A fully green row is a perfect day. The blue bold date is today.'],
    [''],
    ['Sharing'],
    ['Google Sheets: Share > General access > "Anyone with the link" > Viewer (never Editor). The public dashboard reads the first tab (Daily log): keep it first and keep the header row.'],
    ['Edits show on the dashboard within about a minute.'],
  ];

  return buildXlsx([
    {
      name: 'Daily log', rows: log, cf, freezeCols: 1,
      headStyles: [...SHEET_HEADERS.map(() => 1), ...AUTO_HEADERS.map(() => 5), ...HELPER_HEADERS.map(() => 5)],
      widths: [13, 10, 12, 11, 10, 14, 10, 22, 28, 10, 11, 10, 8, 12, 40, 14, 12, 12, { w: 12, hidden: true }, { w: 12, hidden: true }],
      validations: [{ sqref: `B2:B${last}`, list: 'Yes,No' }, { sqref: `G2:G${last}`, list: 'Yes,No' }, { sqref: `N2:N${last}`, list: 'Yes,No' }],
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

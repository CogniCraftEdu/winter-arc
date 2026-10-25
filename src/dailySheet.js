import { BRAND, END, START, TARGETS } from './config.js';
import { addDays, diffDays } from './lib.js';
import { buildXlsx } from './xlsx.js';

// The one sheet you fill in each day. Dates are pre-filled (as text) so nothing is ever typed wrong;
// the public page reads these rows and works out every number and chart from them.
export const SHEET_HEADERS = ['Date', 'Rest day', 'Weight (kg)', 'Run (km)', 'Run time (min)', 'Gym done', 'Workout', 'Body parts', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Vlog posted', 'Vlog link'];

export function dailySheetBytes() {
  const days = diffDays(END, START) + 1;
  const last = days + 60; // dropdowns also work if you add rows later
  const log = [SHEET_HEADERS, ...Array.from({ length: days }, (_, i) => [addDays(START, i)])];
  const help = [
    [`${BRAND}: how this sheet works`],
    ['Fill ONE row per day, in the "Daily log" tab. Only the Date column is needed; leave anything you did not do blank.'],
    ['Rest day, Gym done and Vlog posted have a Yes/No dropdown. A rest day counts the run and gym as done.'],
    [`Run counts as done at ${TARGETS.runKm} km or more. Calories count when they are at or under ${TARGETS.kcal}. A perfect day = run + gym + calories in target + vlog posted.`],
    [`Weight target: lose ${TARGETS.perWeek} kg every week. The first weight you enter is your start weight.`],
    ['Body parts: type names separated by commas, e.g. chest, triceps (or "legs", "arms", "core").'],
    ['Vlog link: paste the Instagram reel link (instagram.com links only).'],
    [''],
    ['To make the public page read this sheet (one time):'],
    ['1. Upload this file to Google Drive, open it with Google Sheets, then File > Save as Google Sheets.'],
    ['2. File > Share > Publish to web. Pick the "Daily log" tab, choose "Comma-separated values (.csv)", press Publish, copy the link.'],
    ['3. Put that link in Vercel as SHEET_CSV_URL (Settings > Environment Variables) and redeploy.'],
    ['Edits show on the public page within about 5 minutes (Google refreshes published sheets that often).'],
  ];
  return buildXlsx([
    {
      name: 'Daily log', rows: log,
      widths: [13, 10, 12, 10, 14, 10, 22, 28, 10, 11, 10, 8, 12, 40],
      validations: [{ sqref: `B2:B${last}`, list: 'Yes,No' }, { sqref: `F2:F${last}`, list: 'Yes,No' }, { sqref: `M2:M${last}`, list: 'Yes,No' }],
    },
    { name: 'How to use', rows: help, widths: [130] },
  ]);
}

export function downloadDailySheet() {
  const blob = new Blob([dailySheetBytes()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'fat-to-fit-daily-sheet.xlsx' });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// Regenerates public/fat-to-fit-daily-sheet.xlsx from the dates in src/config.js:  npm run sheet
import { writeFileSync } from 'node:fs';
import { dailySheetBytes } from '../src/dailySheet.js';

writeFileSync(new URL('../public/fat-to-fit-daily-sheet.xlsx', import.meta.url), dailySheetBytes());
console.log('wrote public/fat-to-fit-daily-sheet.xlsx');
writeFileSync(new URL('../public/fat-to-fit-sample-week.xlsx', import.meta.url), dailySheetBytes({ sample: true }));
console.log('wrote public/fat-to-fit-sample-week.xlsx (19-25 Oct sample data)');

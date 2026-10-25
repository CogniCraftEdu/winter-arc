// Regenerates public/fat-to-fit-daily-sheet.xlsx from the dates in src/config.js:  npm run sheet
import { writeFileSync } from 'node:fs';
import { dailySheetBytes } from '../src/dailySheet.js';

writeFileSync(new URL('../public/fat-to-fit-daily-sheet.xlsx', import.meta.url), dailySheetBytes());
console.log('wrote public/fat-to-fit-daily-sheet.xlsx');

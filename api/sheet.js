import { createSheetHandler } from './_sheet.js';

// The daily sheet. It must be shared as "Anyone with the link: Viewer". Override with SHEET_CSV_URL in Vercel if you ever move it
// (e.g. a File > Share > Publish to web CSV link). With no tab id, Google serves the first tab, "Daily log".
const DEFAULT_URL = 'https://docs.google.com/spreadsheets/d/18r0lkAq3kQRMKVtkRzZR1ls1K5cMwWZoTlevcaspTnU/export?format=csv';

async function fetchText(url) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(url, { redirect: 'follow', signal: ctl.signal });
    if (!r.ok) throw new Error(`sheet ${r.status}`);
    return await r.text();
  } finally { clearTimeout(timer); }
}

export default createSheetHandler({ url: process.env.SHEET_CSV_URL || DEFAULT_URL, fetchText });

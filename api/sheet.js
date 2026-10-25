import { createSheetHandler } from './_sheet.js';

// Set SHEET_CSV_URL in Vercel (Settings -> Environment Variables), or paste the link below.
const DEFAULT_URL = '';

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

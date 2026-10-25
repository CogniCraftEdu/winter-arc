// Relays the published Google Sheet (CSV) to the browser. Server-side so there are no CORS surprises,
// results are cached at the edge, and only Google Sheets URLs are ever fetched.
const OK_URL = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)?\/(?:pub|export)\?[^\s]*$/;
const MAX_BYTES = 1_000_000;

export function createSheetHandler({ url, fetchText }) {
  return async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
    if (!url) return res.status(501).json({ error: 'SHEET_CSV_URL is not set' });
    if (!OK_URL.test(url)) return res.status(500).json({ error: 'SHEET_CSV_URL must be a Google Sheets published-CSV link' });
    try {
      const text = await fetchText(url);
      if (typeof text !== 'string' || text.length > MAX_BYTES) return res.status(502).json({ error: 'Unexpected sheet response' });
      if (/^\s*<(!doctype|html)/i.test(text)) return res.status(502).json({ error: 'The sheet link returned a web page, not CSV. Publish the sheet as CSV.' });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      return res.status(200).send(text);
    } catch {
      return res.status(502).json({ error: 'Could not read the sheet' });
    }
  };
}

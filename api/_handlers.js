// Publish/read handlers for the public fitness page. Storage is injected so this can be tested without Vercel.
// Only whitelisted fitness fields are ever stored, whatever the client sends.
import { timingSafeEqual } from 'node:crypto';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BYTES = 250_000;
const MAX_DAYS = 400;
const IG_URL = /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9_\-./?=&%]{0,180}$/;
const MUSCLES = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs', 'glutes', 'quads', 'hamstrings', 'calves'];

const num = (v, lo, hi) => (v == null || v === '' || !Number.isFinite(+v) ? null : Math.min(hi, Math.max(lo, +v)));
const str = (v, n) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n) : '');

export function sanitize(input) {
  if (!input || typeof input !== 'object' || typeof input.days !== 'object' || !input.days) return null;
  const days = {};
  for (const [date, d] of Object.entries(input.days).slice(0, MAX_DAYS)) {
    if (!DATE.test(date) || !d || typeof d !== 'object') continue;
    days[date] = {
      w: num(d.w, 20, 400),
      runDone: !!d.runDone, runKm: num(d.runKm, 0, 500), runMin: num(d.runMin, 0, 2000),
      gymDone: !!d.gymDone, workout: str(d.workout, 60),
      trained: Array.isArray(d.trained) ? d.trained.filter((m) => MUSCLES.includes(m)) : [],
      kcal: num(d.kcal, 0, 20000), p: num(d.p, 0, 2000), c: num(d.c, 0, 3000), f: num(d.f, 0, 2000),
      rest: !!d.rest, vlog: !!d.vlog, vlogUrl: typeof d.vlogUrl === 'string' && IG_URL.test(d.vlogUrl.trim()) ? d.vlogUrl.trim() : '',
    };
  }
  const t = input.target || {};
  return {
    updatedAt: Date.now(),
    target: { perWeek: num(t.perWeek, 0, 5) ?? 0.75, startWeight: num(t.startWeight, 20, 400), runKm: num(t.runKm, 0, 200) ?? 10, kcal: num(t.kcal, 0, 20000), protein: num(t.protein, 0, 2000) },
    days,
  };
}

const sameToken = (a, b) => {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && timingSafeEqual(x, y);
};

export function createHandlers({ put, head, fetchJson, isNotFound, adminToken, pathname = 'public/fitness.json' }) {
  async function publish(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    if (!adminToken) return res.status(501).json({ error: 'ADMIN_TOKEN is not set on the server' });
    if (!sameToken(req.headers['x-admin-token'], adminToken)) return res.status(401).json({ error: 'Wrong password' });
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); } }
    if (JSON.stringify(body ?? '').length > MAX_BYTES) return res.status(413).json({ error: 'Too large' });
    const clean = sanitize(body);
    if (!clean) return res.status(400).json({ error: 'Nothing to publish' });
    try {
      await put(pathname, JSON.stringify(clean), { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 30 });
    } catch (err) {
      return res.status(502).json({ error: 'Storage is not ready. Create a Blob store in Vercel and connect it to this project.', detail: String(err?.message || err) });
    }
    return res.status(200).json({ ok: true, days: Object.keys(clean.days).length, updatedAt: clean.updatedAt });
  }

  async function read(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
    try {
      const meta = await head(pathname);
      const data = await fetchJson(meta.url);
      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
      return res.status(200).json(data);
    } catch (err) {
      if (isNotFound?.(err)) return res.status(404).json({ empty: true });
      return res.status(502).json({ error: 'Could not read published data' });
    }
  }

  return { publish, read };
}

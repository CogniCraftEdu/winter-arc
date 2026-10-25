import { journalFromState } from './fitness.js';

// Publishing sends ONLY the fitness journal (weights, runs, gym, calories) to /api/publish.
const KEY = 'winterarc:publish';
export const getPublish = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
export const savePublish = (patch) => { try { localStorage.setItem(KEY, JSON.stringify({ ...getPublish(), ...patch })); } catch { /* storage blocked */ } };

export const journalHash = (j) => JSON.stringify([j.target, j.days]);

export async function publishJournal(journal, token) {
  try {
    const res = await fetch('/api/publish', { method: 'POST', headers: { 'content-type': 'application/json', 'x-admin-token': token }, body: JSON.stringify(journal) });
    let body = null; try { body = await res.json(); } catch { /* not json */ }
    if (res.ok) return { ok: true, message: `Published ${body?.days ?? ''} days`, at: Date.now() };
    const why = {
      401: 'Wrong password. It must match ADMIN_TOKEN in Vercel.',
      501: 'Server password is not set. Add ADMIN_TOKEN in Vercel, then redeploy.',
      502: 'Storage is not ready. Create a Blob store in Vercel and connect it to this project.',
      404: 'Publishing is not available here (it only works on your Vercel site).',
      413: 'Too much data to publish.',
    }[res.status];
    return { ok: false, status: res.status, message: why || body?.error || `Publish failed (${res.status})`, at: Date.now() };
  } catch {
    return { ok: false, message: 'No connection to the server.', at: Date.now() };
  }
}

export { journalFromState };

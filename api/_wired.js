import { BlobNotFoundError, head, put } from '@vercel/blob';
import { createHandlers } from './_handlers.js';

export default createHandlers({
  put,
  head,
  fetchJson: async (url) => {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`fetch ${r.status}`);
    return r.json();
  },
  isNotFound: (err) => err instanceof BlobNotFoundError || /does not exist/i.test(String(err?.message)),
  adminToken: process.env.ADMIN_TOKEN,
});

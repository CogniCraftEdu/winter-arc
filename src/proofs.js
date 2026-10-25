// Screenshots and photos ("proofs"): compressed in the browser, uploaded to the Blob store through /api/upload.
export const PROOF_URL = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/proofs\/[A-Za-z0-9_\-./]+$/;
export const isProofUrl = (u) => typeof u === 'string' && PROOF_URL.test(u.trim());

export const PROOF_KINDS = {
  run: { label: 'Strava screenshot', warn: 'Crop out the map and your start point (it can reveal where you live).' },
  cal: { label: 'HealthifyMe screenshot', warn: 'Crop out your name, email and anything private.' },
  gym: { label: 'Gym photo', warn: '' },
  scale: { label: 'Scale photo', warn: '' },
};

// Resize to at most 1400 px and re-encode as JPEG (phone screenshots shrink from MBs to a few hundred KB).
export async function compressImage(file, maxDim = 1400, quality = 0.82) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * k));
  c.height = Math.max(1, Math.round(bmp.height * k));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); // flatten transparency for JPEG
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', quality));
}

const WHY = { 401: 'Wrong password.', 501: 'Server password is not set (ADMIN_TOKEN in Vercel).', 502: 'Storage is not ready. Create a Blob store in Vercel and connect it to this project.', 413: 'Image is too large.', 415: 'Only JPEG, PNG or WebP images.', 404: 'Uploads only work on your Vercel site.' };

export async function uploadProof({ file, kind, date, token }) {
  let blob;
  try { blob = await compressImage(file); } catch { return { ok: false, message: "Couldn't read that image. Try a screenshot or JPEG/PNG." }; }
  try {
    const res = await fetch(`/api/upload?kind=${encodeURIComponent(kind)}&date=${encodeURIComponent(date)}`, { method: 'POST', headers: { 'content-type': 'application/octet-stream', 'x-admin-token': token }, body: blob });
    let body = null; try { body = await res.json(); } catch { /* not json */ }
    if (res.ok && isProofUrl(body?.url)) return { ok: true, url: body.url, bytes: blob.size };
    return { ok: false, status: res.status, message: WHY[res.status] || body?.error || `Upload failed (${res.status})` };
  } catch { return { ok: false, message: 'No connection to the server.' }; }
}

export async function deleteProof(url, token) {
  try { const r = await fetch('/api/upload', { method: 'DELETE', headers: { 'content-type': 'application/json', 'x-admin-token': token }, body: JSON.stringify({ url }) }); return r.ok; } catch { return false; }
}

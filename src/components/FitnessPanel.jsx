import { useRef, useState } from 'react';
import { MUSCLES } from '../config.js';
import { getPublish } from '../publish.js';
import { PROOF_KINDS, deleteProof, isProofUrl, uploadProof } from '../proofs.js';

// One screenshot/photo slot: pick an image, it is shrunk and uploaded, and the link is saved on today's entry.
function ProofSlot({ kind, today, day, actions }) {
  const meta = PROOF_KINDS[kind];
  const url = day.proofs?.[kind];
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const input = useRef(null);
  const setUrl = (u) => actions.setProof(today, kind, u);

  const pick = async (file) => {
    if (!file) return;
    const { token } = getPublish();
    if (!token) { setMsg('Save your publish password first (Journey → Public page).'); return; }
    setBusy(true); setMsg('');
    const r = await uploadProof({ file, kind, date: today, token });
    setBusy(false);
    if (!r.ok) { setMsg(r.message); return; }
    if (url && isProofUrl(url)) deleteProof(url, token); // replace: drop the old file
    setUrl(r.url);
  };
  const remove = async () => {
    const { token } = getPublish();
    if (token && isProofUrl(url)) await deleteProof(url, token);
    setUrl('');
  };

  return (
    <div className="proof">
      <div className="proof-row">
        {isProofUrl(url) && <a href={url} target="_blank" rel="noopener noreferrer" className="proof-thumb"><img src={url} alt={meta.label} loading="lazy" /></a>}
        <div className="proof-main">
          <button type="button" className="btn small" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Uploading…' : isProofUrl(url) ? `Replace ${meta.label.toLowerCase()}` : `+ ${meta.label}`}</button>
          {isProofUrl(url) && <button type="button" className="btn small ghost" onClick={remove}>Remove</button>}
          <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </div>
      {meta.warn && <div className="dim small">{meta.warn}</div>}
      {msg && <div className="bad small">{msg}</div>}
    </div>
  );
}

const FIELDS = [['kcal', 'Calories', 'kcal'], ['p', 'Protein', 'g'], ['c', 'Carbs', 'g'], ['f', 'Fat', 'g']];

// Today's body parts, workout name and nutrition totals. Feeds the public /show page.
export default function FitnessPanel({ actions, today, day, settings }) {
  const trained = day.trained || [];
  const nut = day.nutrition || {};
  const toggle = (id) => actions.setField(today, 'trained', trained.includes(id) ? trained.filter((x) => x !== id) : [...trained, id]);
  const setRun = (k, v) => actions.setField(today, 'run', { ...(day.run || {}), [k]: v === '' ? '' : Math.max(0, +v) });
  const setNut = (k, v) => actions.setField(today, 'nutrition', { ...nut, [k]: v === '' ? '' : Math.max(0, +v) });

  return (
    <section className="panel">
      <h2>Fitness <span className="count">feeds your public page</span></h2>
      <label className="check" style={{ marginBottom: 6 }}>
        <input type="checkbox" checked={!!day.rest} onChange={(e) => actions.setField(today, 'rest', e.target.checked)} />
        <span>Rest day <span className="dim">(run and gym count as done; calories and vlog still matter)</span></span>
      </label>
      <h3>Morning run <span className="dim">target {settings.runTargetKm} km{+day.run?.km > 0 ? ` · ${(+day.run.km).toFixed(1)} logged` : ''}</span></h3>
      <div className="nut-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <label className="field">Distance (km)
          <input type="number" min="0" step="0.1" inputMode="decimal" value={day.run?.km ?? ''} onChange={(e) => setRun('km', e.target.value)} />
        </label>
        <label className="field">Time (min)
          <input type="number" min="0" inputMode="numeric" value={day.run?.min ?? ''} onChange={(e) => setRun('min', e.target.value)} />
        </label>
      </div>
      <ProofSlot kind="run" today={today} day={day} actions={actions} />
      <h3>Evening gym</h3>
      <label className="field">Workout
        <input placeholder="e.g. Leg day, Push, Pull" value={day.workout || ''} onChange={(e) => actions.setField(today, 'workout', e.target.value)} />
      </label>
      <ProofSlot kind="gym" today={today} day={day} actions={actions} />
      <div className="dim small" style={{ marginTop: 10 }}>Body parts hit</div>
      <div className="pills" style={{ marginTop: 6 }}>
        {MUSCLES.map((m) => (
          <button type="button" key={m.id} className={`pill ${trained.includes(m.id) ? 'on' : ''}`} onClick={() => toggle(m.id)}>{m.label}</button>
        ))}
      </div>
      <h3>Weigh-in</h3>
      <ProofSlot kind="scale" today={today} day={day} actions={actions} />
      <h3>Daily vlog</h3>
      <label className="field">Link to today's vlog (optional, Instagram only)
        <input type="url" placeholder="https://www.instagram.com/reel/…" value={day.vlogUrl || ''} onChange={(e) => actions.setField(today, 'vlogUrl', e.target.value)} />
      </label>
      <div className="dim small" style={{ marginTop: 6 }}>Tick "Daily vlog posted" in the rules above when it's live.</div>
      <h3>Nutrition <span className="dim">target {settings.calorieTarget} kcal · {settings.proteinTarget} g protein</span></h3>
      <div className="nut-grid">
        {FIELDS.map(([k, label, unit]) => (
          <label key={k} className="field">{label} ({unit})
            <input type="number" min="0" inputMode="numeric" value={nut[k] ?? ''} onChange={(e) => setNut(k, e.target.value)} />
          </label>
        ))}
      </div>
      <ProofSlot kind="cal" today={today} day={day} actions={actions} />
    </section>
  );
}

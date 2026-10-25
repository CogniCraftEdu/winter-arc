import { useRef, useState } from 'react';
import { CATS, HABITS, RULES, SETTINGS_DEFAULT } from '../config.js';
import Odds from './Odds.jsx';
import { downloadDailySheet } from '../dailySheet.js';
import { allDays, dayNumber, dayResult, fmtDate, fmtHM, streaks, workMs } from '../lib.js';

export default function Journey({ state, actions, today, settings }) {
  const [open, setOpen] = useState(null);
  const fileRef = useRef();
  const days = allDays();
  const results = Object.fromEntries(days.map((k) => [k, dayResult(state.days[k], settings, CATS, RULES)]));
  const past = days.filter((k) => k < today);
  const won = past.filter((k) => results[k].won).length;
  const totalWork = days.reduce((t, k) => t + (state.days[k] ? workMs(state.days[k], CATS) : 0), 0);
  const { best } = streaks(state.days, today, settings, CATS, RULES);

  const download = () => {
    const url = URL.createObjectURL(new Blob([actions.exportData()], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `fat-to-fit-backup-${today}.json` });
    a.click();
    URL.revokeObjectURL(url);
  };
  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try { actions.importData(await file.text()); alert('Backup restored.'); } catch (err) { alert(`Import failed: ${err.message}`); }
    e.target.value = '';
  };

  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, w) => {
    const ks = days.slice(w * 7, w * 7 + 7);
    const started = ks[0] <= today;
    const done = ks.filter((k) => k < today);
    const weights = ks.map((k) => state.days[k]?.weight).filter((x) => x !== '' && x != null);
    return {
      w, ks, started,
      won: done.filter((k) => results[k].won).length,
      played: done.length,
      work: ks.reduce((t, k) => t + (state.days[k] ? workMs(state.days[k], CATS) : 0), 0),
      rate: ['energy', 'mood', 'focus'].map((id) => {
        const v = ks.map((k) => state.days[k]?.ratings?.[id]).filter(Boolean);
        return v.length ? [id, (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)] : null;
      }).filter(Boolean),
      habits: ks.reduce((t, k) => t + HABITS.filter((h) => state.days[k]?.habits?.[h.id]).length, 0),
      delta: weights.length > 1 ? +(weights[weights.length - 1] - weights[0]).toFixed(1) : null,
    };
  }).filter((x) => x.started);

  const sel = open && state.days[open];
  return (
    <div className="grid">
      <section className="card wide">
        <h2>The {days.length} days</h2>
        <div className="stats">
          <div><b>{won}</b><span>days won</span></div>
          <div><b>{past.length - won}</b><span>days missed</span></div>
          <div><b>{best}</b><span>best streak</span></div>
          <div><b>{Math.round(totalWork / 3600000)}h</b><span>total work</span></div>
        </div>
        <div className="cal">
          {days.map((k) => {
            const r = results[k];
            const cls = k > today ? 'future' : k === today ? 'today' : r.won ? 'won' : 'lost';
            return (
              <button key={k} className={`cell ${cls}`} title={fmtDate(k)} onClick={() => setOpen(k === open ? null : k)}>
                {dayNumber(k)}{k <= today && <small>{r.done}/{RULES.length}</small>}
              </button>
            );
          })}
        </div>

        {open && (
          <div className="detail">
            <h3>Day {dayNumber(open)} · {fmtDate(open)}</h3>
            <ul className="rules compact">
              {RULES.map((r) => <li key={r.id} className={results[open].checks[r.id] ? 'ok' : 'miss'}>{results[open].checks[r.id] ? '✓' : '✗'} {r.label}</li>)}
            </ul>
            {sel ? (
              <>
                <p className="dim">Work {fmtHM(workMs(sel, CATS))} · {sel.sessions.length} sessions</p>
                {sel.notes.map((n) => <p key={n.id} className="note">• {n.text}</p>)}
                {sel.reflection && <p className="note reflect">🌙 {sel.reflection}</p>}
              </>
            ) : <p className="dim">No data for this day.</p>}
          </div>
        )}
      </section>

      <Odds state={state} actions={actions} today={today} settings={settings} />

      <section className="card wide">
        <h2>Weekly review</h2>
        {weeks.length === 0 && <p className="dim">Week 1 starts on {fmtDate(days[0])}.</p>}
        {[...weeks].reverse().map((x) => (
          <div key={x.w} className="detail" style={{ marginBottom: 10 }}>
            <h3 style={{ marginTop: 0 }}>Week {x.w + 1} · {fmtDate(x.ks[0])} – {fmtDate(x.ks[x.ks.length - 1])}</h3>
            <div className="cats">
              <span className="tag">{x.won}/{x.played} days won</span>
              <span className="tag">{fmtHM(x.work)} work</span>
              {x.habits > 0 && <span className="tag">{x.habits} habit ticks</span>}
              {x.rate.map(([id, v]) => <span key={id} className="tag">{id} {v}</span>)}
              {x.delta != null && <span className="tag">{x.delta > 0 ? '+' : ''}{x.delta} kg</span>}
            </div>
            <textarea rows="3" placeholder="What worked? What broke? One fix for next week…" value={state.reviews[x.w] || ''} onChange={(e) => actions.setReview(x.w, e.target.value)} />
          </div>
        ))}
      </section>

      <section className="card wide">
        <h2>Arc goals <span className="count">{state.goals.filter((g) => g.done).length}/{state.goals.length}</span></h2>
        <p className="dim">What must be true on {fmtDate(days[days.length - 1], { day: 'numeric', month: 'long' })}? Keep it to a few measurable outcomes.</p>
        <ul className="rules compact">
          {state.goals.map((g) => (
            <li key={g.id} className={g.done ? 'ok' : ''}>
              <label>
                <input type="checkbox" checked={g.done} onChange={() => actions.toggleGoal(g.id)} />
                <span className="rl"><b>{g.text}</b></span>
                <button type="button" className="x" aria-label="Remove goal" onClick={(e) => { e.preventDefault(); actions.removeGoal(g.id); }}>×</button>
              </label>
            </li>
          ))}
        </ul>
        <form className="row" style={{ marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); const t = e.target.goal.value.trim(); if (t) { actions.addGoal(t); e.target.reset(); } }}>
          <input name="goal" placeholder="e.g. Reach 74 kg · Ship 2 projects · 100k followers" />
          <button className="btn primary">Add</button>
        </form>
      </section>

      <SheetPanel />

      <section className="card">
        <h2>Targets</h2>
        <div className="stack">
          {[
            ['workTargetHours', 'Work hours / day', 1, 1, '1'],
          ].map(([key, label, , min, step]) => (
            <label key={key} className="field">{label}
              <input type="number" min={min} step={step} inputMode="decimal" value={settings[key] ?? ''} onChange={(e) => actions.setSettings({ [key]: e.target.value === '' ? (key === 'startWeight' ? '' : SETTINGS_DEFAULT[key]) : +e.target.value })} />
            </label>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Backup</h2>
        <p className="dim">Everything lives in this browser only. Export regularly. Clearing site data erases the arc.</p>
        <div className="row">
          <button className="btn" onClick={download}>Export JSON</button>
          <button className="btn ghost" onClick={() => fileRef.current.click()}>Import</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={upload} />
        </div>
      </section>
    </div>
  );
}

function SheetPanel() {
  const url = `${window.location.origin}/`;
  const [msg, setMsg] = useState('');
  const copy = async () => { try { await navigator.clipboard.writeText(url); setMsg('Link copied. Paste it in your Instagram bio.'); } catch { setMsg(`Copy this: ${url}`); } };
  return (
    <section className="card wide">
      <h2>Daily sheet <span className="count">your data source for the public page</span></h2>
      <p className="dim">Fill one row a day in a Google Sheet (weight, run, gym, calories, vlog). The public page reads it and works out every number and chart. Nothing else to publish.</p>
      <div className="row wrap" style={{ margin: '12px 0' }}>
        <button className="btn primary" onClick={downloadDailySheet}>⬇ Download the daily sheet (.xlsx)</button>
        <span className="dim small">Dates are pre-filled. Open it in Google Sheets, then File → Share → Publish to web → CSV.</span>
      </div>
      <h3>Your Instagram bio link</h3>
      <div className="row wrap">
        <input readOnly value={url} className="grow" onFocus={(e) => e.target.select()} aria-label="Public link" />
        <button className="btn" onClick={copy}>Copy link</button>
        <a className="btn" style={{ textDecoration: 'none' }} href="/" target="_blank" rel="noopener">Open ↗</a>
      </div>
      {msg && <p className="ok-text" style={{ margin: '10px 0 0', fontSize: 13.5 }}>{msg}</p>}
    </section>
  );
}

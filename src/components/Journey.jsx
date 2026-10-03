import { useRef, useState } from 'react';
import { CATS, RULES, SETTINGS_DEFAULT } from '../config.js';
import { allDays, dayNumber, dayResult, fmtDate, fmtHM, streaks, workMs, sumMeals } from '../lib.js';

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
    const a = Object.assign(document.createElement('a'), { href: url, download: `winter-arc-backup-${today}.json` });
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
    const logged = ks.filter((k) => state.days[k]);
    const kcalDays = logged.filter((k) => state.days[k].meals.length);
    const weights = ks.map((k) => state.days[k]?.weight).filter((x) => x !== '' && x != null);
    return {
      w, ks, started,
      won: done.filter((k) => results[k].won).length,
      played: done.length,
      work: ks.reduce((t, k) => t + (state.days[k] ? workMs(state.days[k], CATS) : 0), 0),
      kcal: kcalDays.length ? Math.round(kcalDays.reduce((t, k) => t + sumMeals(state.days[k]).kcal, 0) / kcalDays.length) : null,
      delta: weights.length > 1 ? +(weights[weights.length - 1] - weights[0]).toFixed(1) : null,
    };
  }).filter((x) => x.started);

  const sel = open && state.days[open];
  return (
    <div className="grid">
      <section className="card wide">
        <h2>The 76 days</h2>
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
                <p className="dim">Work {fmtHM(workMs(sel, CATS))} · {sumMeals(sel).kcal} kcal · {sumMeals(sel).protein}g protein · {sel.sessions.length} sessions</p>
                {sel.notes.map((n) => <p key={n.id} className="note">• {n.text}</p>)}
                {sel.reflection && <p className="note reflect">🌙 {sel.reflection}</p>}
              </>
            ) : <p className="dim">No data for this day.</p>}
          </div>
        )}
      </section>

      <section className="card wide">
        <h2>Weekly review</h2>
        {weeks.length === 0 && <p className="dim">Week 1 starts on {fmtDate(days[0])}.</p>}
        {[...weeks].reverse().map((x) => (
          <div key={x.w} className="detail" style={{ marginBottom: 10 }}>
            <h3 style={{ marginTop: 0 }}>Week {x.w + 1} · {fmtDate(x.ks[0])} – {fmtDate(x.ks[x.ks.length - 1])}</h3>
            <div className="cats">
              <span className="tag">{x.won}/{x.played} days won</span>
              <span className="tag">{fmtHM(x.work)} work</span>
              {x.kcal != null && <span className="tag">{x.kcal} kcal avg</span>}
              {x.delta != null && <span className="tag">{x.delta > 0 ? '+' : ''}{x.delta} kg</span>}
            </div>
            <textarea rows="3" placeholder="What worked? What broke? One fix for next week…" value={state.reviews[x.w] || ''} onChange={(e) => actions.setReview(x.w, e.target.value)} />
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Targets</h2>
        <div className="stack">
          {[['workTargetHours', 'Work hours / day'], ['calorieTarget', 'Calorie limit'], ['proteinTarget', 'Protein target (g)']].map(([key, label]) => (
            <label key={key} className="field">{label}
              <input type="number" min="1" value={settings[key]} onChange={(e) => actions.setSettings({ [key]: +e.target.value || SETTINGS_DEFAULT[key] })} />
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

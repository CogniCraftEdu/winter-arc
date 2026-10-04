import { useState } from 'react';
import { CATS, catOf } from '../config.js';
import { fmtClock, fmtHM, fmtTime, pad2, planFor, workMs } from '../lib.js';

export default function Stopwatch({ state, actions, today, now, day, running, settings }) {
  const timer = state.timer;
  const [label, setLabel] = useState('');
  const [cat, setCat] = useState('work');
  const sessions = [...day.sessions].sort((a, b) => b.start - a.start);
  const worked = workMs(day, CATS, running);
  const target = settings.workTargetHours * 3600000;
  const hourNow = new Date(now).getHours();
  const openTasks = planFor(day).filter((p) => p.title.trim() && !p.done && p.hour >= hourNow).slice(0, 4);
  const totals = CATS.map((c) => [c, [...sessions, ...(running ? [running] : [])].filter((s) => s.cat === c.id).reduce((t, s) => t + (s.end - s.start), 0)]).filter(([, ms]) => ms > 0);

  const start = (l = label, c = cat) => { actions.startTimer(l, c); setLabel(''); };

  return (
    <section className="panel">
      <h2>Stopwatch <span className="count">{fmtHM(worked)} / {settings.workTargetHours}h worked</span></h2>

      <div className={`bigclock mono ${timer ? '' : 'idle'}`}>{timer ? fmtClock(now - timer.startedAt) : '00:00:00'}</div>
      {timer && (
        <p className="center"><b>{timer.label}</b> · <span style={{ color: catOf(timer.cat).color }}>{catOf(timer.cat).label}</span> · since {fmtTime(timer.startedAt)}</p>
      )}

      {timer ? (
        <div className="row center-row">
          <button className="btn danger" onClick={actions.stopTimer}>■ Stop &amp; log</button>
          <button className="btn ghost" onClick={() => confirm('Throw away this running session?') && actions.discardTimer()}>Discard</button>
        </div>
      ) : null}

      <form className="stack" onSubmit={(e) => { e.preventDefault(); start(); }}>
        <input placeholder={timer ? 'Switch to something else…' : 'What are you working on?'} value={label} onChange={(e) => setLabel(e.target.value)} />
        <div className="pills">
          {CATS.map((c) => (
            <button type="button" key={c.id} className={`pill ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)}>{c.label}</button>
          ))}
        </div>
        <button className="btn primary">▶ {timer ? 'Switch' : 'Start'}</button>
      </form>

      {openTasks.length > 0 && (
        <>
          <h3>Up next in your plan</h3>
          <div className="pills">
            {openTasks.map((p) => <button key={p.hour} className="pill" onClick={() => start(p.title, p.cat)}>{pad2(p.hour)}:00 · {p.title}</button>)}
          </div>
        </>
      )}

      <div className="bar"><i style={{ width: `${Math.min(100, (worked / target) * 100)}%` }} /></div>
      <div className="cats">
        {totals.map(([c, ms]) => <span key={c.id} className="tag"><i style={{ background: c.color }} />{c.label} {fmtHM(ms)}</span>)}
        {totals.length === 0 && <span className="dim small">Start the stopwatch whenever you begin something. Every hour ends up in the schedule below.</span>}
      </div>

      <details className="fold">
        <summary>Session log <span className="count">{sessions.length + (running ? 1 : 0)}</span></summary>
        <ul className="log">
          {running && <li><span className="dot" style={{ background: catOf(running.cat).color }} /><span className="time">{fmtTime(running.start)}–now</span><b>{running.label}</b><span className="dim">{fmtHM(running.end - running.start)}</span></li>}
          {sessions.map((s) => (
            <li key={s.id}>
              <span className="dot" style={{ background: catOf(s.cat).color }} />
              <span className="time">{fmtTime(s.start)}–{fmtTime(s.end)}</span>
              <input className="inline" value={s.label} onChange={(e) => actions.renameSession(today, s.id, e.target.value)} />
              <span className="dim">{fmtHM(s.end - s.start)}</span>
              <button className="x" title="Delete" onClick={() => confirm('Delete this session?') && actions.removeSession(today, s.id)}>×</button>
            </li>
          ))}
          {sessions.length === 0 && !running && <li className="dim">Nothing logged yet.</li>}
        </ul>
      </details>
    </section>
  );
}

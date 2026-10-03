import { useState } from 'react';
import { CATS, catOf } from '../config.js';
import { fmtClock, fmtHM, fmtTime } from '../lib.js';

export default function Timer({ state, actions, today, now, day, running }) {
  const timer = state.timer;
  const [label, setLabel] = useState('');
  const [cat, setCat] = useState('work');
  const sessions = [...day.sessions].sort((a, b) => b.start - a.start);
  const totals = CATS.map((c) => [c, sessions.filter((s) => s.cat === c.id).reduce((t, s) => t + (s.end - s.start), 0)]).filter(([, ms]) => ms > 0);
  const openTasks = day.plan.filter((p) => !p.done);

  const start = (l = label, c = cat) => {
    actions.startTimer(l, c);
    setLabel('');
  };

  return (
    <div className="grid">
      <section className="card">
        <h2>Stopwatch</h2>
        {timer ? (
          <>
            <div className="bigclock mono">{fmtClock(now - timer.startedAt)}</div>
            <p><b>{timer.label}</b> · <span style={{ color: catOf(timer.cat).color }}>{catOf(timer.cat).label}</span> · since {fmtTime(timer.startedAt)}</p>
            <div className="row">
              <button className="btn danger" onClick={actions.stopTimer}>■ Stop &amp; log</button>
              <button className="btn ghost" onClick={() => confirm('Throw away this running session?') && actions.discardTimer()}>Discard</button>
            </div>
            <p className="dim">Starting something else stops this one automatically, so no gaps get lost.</p>
          </>
        ) : (
          <div className="bigclock mono dim">00:00:00</div>
        )}

        <form className="stack" onSubmit={(e) => { e.preventDefault(); start(); }}>
          <input placeholder="What are you doing right now?" value={label} onChange={(e) => setLabel(e.target.value)} />
          <div className="pills">
            {CATS.map((c) => (
              <button type="button" key={c.id} className={`pill ${cat === c.id ? 'on' : ''}`} style={cat === c.id ? { background: c.color, borderColor: c.color } : {}} onClick={() => setCat(c.id)}>{c.label}</button>
            ))}
          </div>
          <button className="btn primary">▶ {timer ? 'Switch to this' : 'Start'}</button>
        </form>

        {openTasks.length > 0 && (
          <>
            <h3>From today's plan</h3>
            <div className="pills">
              {openTasks.map((p) => (
                <button key={p.id} className="pill" onClick={() => start(p.title, p.cat || 'work')}>▶ {p.title}</button>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="card">
        <h2>Today's log <span className="dim">{sessions.length} sessions</span></h2>
        <div className="cats">
          {totals.map(([c, ms]) => <span key={c.id} className="tag" style={{ borderColor: c.color }}>{c.label} {fmtHM(ms)}</span>)}
        </div>
        {sessions.length === 0 && <p className="dim">Nothing logged yet. Every hour of the day should end up here.</p>}
        <ul className="log">
          {running && (
            <li><span className="dot" style={{ background: catOf(running.cat).color }} /><span className="time">{fmtTime(running.start)}–now</span><b>{running.label}</b><span className="dim">{fmtHM(running.end - running.start)}</span></li>
          )}
          {sessions.map((s) => (
            <li key={s.id}>
              <span className="dot" style={{ background: catOf(s.cat).color }} />
              <span className="time">{fmtTime(s.start)}–{fmtTime(s.end)}</span>
              <input className="inline" value={s.label} onChange={(e) => actions.renameSession(today, s.id, e.target.value)} />
              <span className="dim">{fmtHM(s.end - s.start)}</span>
              <button className="x" title="Delete" onClick={() => confirm('Delete this session?') && actions.removeSession(today, s.id)}>×</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

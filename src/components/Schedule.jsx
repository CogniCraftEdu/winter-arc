import { CATS, SLEEP } from '../config.js';
import { fmtShort, hourSegments, hourStart, pad2, planFor } from '../lib.js';

const catColor = (id) => CATS.find((c) => c.id === id)?.color || '#64748b';
const HOUR = 3600000;

export default function Schedule({ actions, today, now, day, running }) {
  const sessions = [...day.sessions, ...(running ? [running] : [])];

  const rows = planFor(day).map((slot) => {
    const h = slot.hour;
    const started = hourStart(today, h) <= now;
    const ended = hourStart(today, h + 1) <= now;
    const live = started && !ended;
    const segs = started ? hourSegments(sessions, today, h) : [];
    const logged = segs.reduce((t, s) => t + s.ms, 0);
    const note = day.actuals?.[h]?.trim();
    const planned = !!slot.title.trim();

    // A ticked hour or a written note also counts as accounted for.
    const accounted = Math.min(HOUR, Math.max(logged, slot.done || note ? HOUR : 0));

    let status = null;
    if (planned && started) {
      if (slot.done || logged >= 45 * 60000) status = 'hit';
      else if (live) status = 'live';
      else if (logged >= 10 * 60000) status = 'partial';
      else status = 'miss';
    }
    return { ...slot, started, ended, live, segs, logged, accounted, status, planned, note };
  });

  const plannedRows = rows.filter((r) => r.planned && r.started);
  const settled = plannedRows.filter((r) => r.status !== 'live');
  const hits = plannedRows.filter((r) => r.status === 'hit').length;
  const pct = settled.length ? Math.round((settled.filter((r) => r.status === 'hit').length / settled.length) * 100) : null;
  const endedRows = rows.filter((r) => r.ended);
  const loggedMs = rows.reduce((t, r) => t + r.logged, 0);
  const unaccounted = endedRows.length * HOUR - endedRows.reduce((t, r) => t + r.accounted, 0);

  return (
    <section className="panel">
      <h2>Schedule <span className="count">expected vs actual</span></h2>

      <div className="sumstrip">
        <div><b>{pct == null ? '—' : `${pct}%`}</b><span>plan adherence</span></div>
        <div><b>{hits}/{plannedRows.length}</b><span>planned hours hit</span></div>
        <div><b>{fmtShort(loggedMs)}</b><span>logged today</span></div>
        <div className={unaccounted > 30 * 60000 ? 'bad' : ''}><b>{endedRows.length ? fmtShort(unaccounted) : '—'}</b><span>unaccounted</span></div>
      </div>

      <div className="sg">
        <div className="sg-head"><span /><span>Expected</span><span>Actual</span><span /></div>
        {rows.map((r) => (
          <div key={r.hour} className={`sg-row ${r.live ? 'live' : ''} ${r.ended ? 'past' : ''} ${r.status || ''}`}>
            <span className="time">{pad2(r.hour)}:00</span>

            <div className="exp">
              {r.planned ? (
                <label className="task">
                  <input type="checkbox" checked={r.done} onChange={() => actions.toggleHour(today, r.hour)} />
                  <span className={r.done ? 'struck' : ''}>{r.title}</span>
                </label>
              ) : (
                <span className="warn">Unplanned</span>
              )}
              {r.live && r.planned && !(running && running.label === r.title) && (
                <button className="go" title="Start the stopwatch for this" onClick={() => actions.startTimer(r.title, r.cat)}>▶</button>
              )}
            </div>

            <div className="act">
              {r.segs.map((s, i) => (
                <span key={i} className={`chip ${s.running ? 'run' : ''}`}>
                  <i style={{ background: catColor(s.cat) }} />{s.label}<em>{fmtShort(s.ms)}</em>
                </span>
              ))}
              {r.started && r.segs.length === 0 && !r.note && (
                <span className={r.ended && r.planned ? 'bad small' : 'dim small'}>{r.ended ? 'Nothing logged' : 'Waiting for you…'}</span>
              )}
              {r.started && (
                <input
                  className="note-in"
                  placeholder="note…"
                  aria-label={`What did you do at ${pad2(r.hour)}:00`}
                  value={day.actuals?.[r.hour] || ''}
                  onChange={(e) => actions.setActual(today, r.hour, e.target.value)}
                />
              )}
            </div>

            <span className={`verdict ${r.status || ''}`} title={r.status || ''}>
              {r.status === 'hit' && '✓'}
              {r.status === 'partial' && '◐'}
              {r.status === 'miss' && '✕'}
              {r.status === 'live' && '●'}
            </span>
          </div>
        ))}
        <div className="sg-row sleep">
          <span className="time">{SLEEP.from}</span>
          <div className="exp"><span className="fixedtxt">{SLEEP.label} · {SLEEP.from} → {SLEEP.to}</span></div>
          <div className="act"><span className="dim small">{day.checks?.sleep ? 'Sleep rule ticked ✓' : 'Tick “7 hours sleep” tomorrow morning'}</span></div>
          <span />
        </div>
      </div>
    </section>
  );
}

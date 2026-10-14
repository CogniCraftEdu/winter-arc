import { CATS, SLEEP } from '../config.js';
import { fmtShort, slotRange } from '../lib.js';
import { scheduleRows, scheduleSummary } from '../stats.js';

const catColor = (id) => CATS.find((c) => c.id === id)?.color || '#64748b';

export default function Schedule({ actions, today, now, day, running }) {
  const rows = scheduleRows(day, today, now, running);
  const { pct, hits, planned, loggedMs, unaccounted, endedCount } = scheduleSummary(rows);

  return (
    <section className="panel">
      <h2>Schedule <span className="count">expected vs actual</span></h2>

      <div className="sumstrip">
        <div><b>{pct == null ? '—' : `${pct}%`}</b><span>plan adherence</span></div>
        <div><b>{hits}/{planned}</b><span>planned slots hit</span></div>
        <div><b>{fmtShort(loggedMs)}</b><span>logged today</span></div>
        <div className={unaccounted > 30 * 60000 ? 'bad' : ''}><b>{endedCount ? fmtShort(unaccounted) : '—'}</b><span>unaccounted</span></div>
      </div>

      <div className="sg">
        <div className="sg-head"><span /><span>Expected</span><span>Actual</span><span /></div>
        {rows.map((r) => (
          <div key={r.start} className={`sg-row ${r.live ? 'live' : ''} ${r.ended ? 'past' : ''} ${r.status || ''}`}>
            <span className="time">{slotRange(r.start)}</span>

            <div className="exp">
              {r.planned ? (
                <label className="task">
                  <input type="checkbox" checked={r.done} onChange={() => actions.toggleSlot(today, r.start)} />
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
                  aria-label={`What did you do ${slotRange(r.start)}`}
                  value={day.actuals?.[r.start] || ''}
                  onChange={(e) => actions.setActual(today, r.start, e.target.value)}
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
          <span className="time">{SLEEP.from}–{SLEEP.to}</span>
          <div className="exp"><span className="fixedtxt">{SLEEP.label} · 7 hours</span></div>
          <div className="act"><span className="dim small">{day.checks?.sleep ? 'Sleep rule ticked ✓' : 'Tick “7 hours sleep” tomorrow morning'}</span></div>
          <span />
        </div>
      </div>
    </section>
  );
}

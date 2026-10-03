import { CATS, SCHEDULE } from '../config.js';
import { fmtShort, hourSegments, hourStart, pad2 } from '../lib.js';

const FIRST = 6;
const LAST = 22; // 22:00–23:00 is the last waking row; sleep is summarised below
const HOURS = Array.from({ length: LAST - FIRST + 1 }, (_, i) => FIRST + i);
const toMin = (t) => { const [a, b] = t.split(':').map(Number); return a * 60 + b; };
const catColor = (id) => CATS.find((c) => c.id === id)?.color || '#64748b';
const workish = (c) => c === 'work' || c === 'study';

// What the fixed schedule expects in a given hour (a block can start or end mid-hour).
const fixedFor = (h) => SCHEDULE.filter((b) => b.kind === 'fixed' && toMin(b.start) < (h + 1) * 60 && toMin(b.end) > h * 60);
const isFlex = (h) => SCHEDULE.some((b) => b.kind === 'flex' && toMin(b.start) <= h * 60 && toMin(b.end) > h * 60);

export default function Schedule({ actions, today, now, day, running }) {
  const sessions = [...day.sessions, ...(running ? [running] : [])];
  const nowHour = new Date(now).getHours();

  const rows = HOURS.map((h) => {
    const started = hourStart(today, h) <= now;
    const ended = hourStart(today, h + 1) <= now;
    const live = started && !ended;
    const segs = started ? hourSegments(sessions, today, h) : [];
    const logged = segs.reduce((t, s) => t + s.ms, 0);
    const flex = isFlex(h);
    const item = flex ? day.plan.find((p) => p.hour === h && p.title?.trim()) : null;
    const fixed = flex ? [] : fixedFor(h);
    const expectedCat = item ? item.cat : fixed.find((b) => b.cat)?.cat;

    // Verdict only for hours where something specific was planned.
    let status = null;
    if (item && started) {
      const match = segs.filter((s) => (workish(item.cat) ? workish(s.cat) : s.cat === item.cat)).reduce((t, s) => t + s.ms, 0);
      if (item.done || match >= 45 * 60000) status = 'hit';
      else if (live) status = 'live';
      else if (logged >= 10 * 60000) status = 'partial';
      else status = 'miss';
    }
    return { h, started, ended, live, segs, logged, flex, item, fixed, expectedCat, status };
  });

  const planned = rows.filter((r) => r.item && r.started);
  const hits = planned.filter((r) => r.status === 'hit').length;
  const settled = planned.filter((r) => r.status !== 'live');
  const pct = settled.length ? Math.round((settled.filter((r) => r.status === 'hit').length / settled.length) * 100) : null;
  const elapsedWaking = rows.filter((r) => r.ended).length;
  const loggedMs = rows.filter((r) => r.started).reduce((t, r) => t + r.logged, 0);
  const unlogged = Math.max(0, rows.filter((r) => r.ended).length * 3600000 - rows.filter((r) => r.ended).reduce((t, r) => t + r.logged, 0));

  return (
    <section className="panel">
      <h2>Schedule <span className="count">expected vs actual</span></h2>

      <div className="sumstrip">
        <div><b>{pct == null ? '—' : `${pct}%`}</b><span>plan adherence</span></div>
        <div><b>{hits}/{planned.length}</b><span>planned hours hit</span></div>
        <div><b>{fmtShort(loggedMs)}</b><span>logged today</span></div>
        <div className={unlogged > 30 * 60000 ? 'bad' : ''}><b>{elapsedWaking ? fmtShort(unlogged) : '—'}</b><span>unaccounted</span></div>
      </div>

      <div className="sg">
        <div className="sg-head"><span /><span>Expected</span><span>Actual</span><span /></div>
        {rows.map((r) => {
          const free = r.flex && !r.item;
          return (
            <div key={r.h} className={`sg-row ${r.live ? 'live' : ''} ${r.ended ? 'past' : ''} ${r.status || ''}`}>
              <span className="time">{pad2(r.h)}:00</span>

              <div className="exp">
                {r.item ? (
                  <label className="task">
                    <input type="checkbox" checked={r.item.done} onChange={() => actions.togglePlan(today, r.item.id)} />
                    <span className={r.item.done ? 'struck' : ''}>{r.item.title}</span>
                  </label>
                ) : free ? (
                  <span className="warn">Unplanned</span>
                ) : (
                  <span className="fixedtxt">{r.fixed.map((b) => b.title.split(' — ')[0]).join(' · ')}</span>
                )}
                {r.live && (r.item || r.fixed.some((b) => b.cat)) && !(running && running.label === (r.item?.title || '')) && (
                  <button className="go" title="Start the stopwatch for this" onClick={() => actions.startTimer(r.item ? r.item.title : r.fixed.find((b) => b.cat).title.split(' — ')[0], r.expectedCat || 'other')}>▶</button>
                )}
              </div>

              <div className="act">
                {r.segs.map((s, i) => (
                  <span key={i} className={`chip ${s.running ? 'run' : ''}`}>
                    <i style={{ background: catColor(s.cat) }} />{s.label}<em>{fmtShort(s.ms)}</em>
                  </span>
                ))}
                {r.started && r.segs.length === 0 && !day.actuals?.[r.h] && (
                  <span className={r.ended && (r.item || r.fixed.length) ? 'bad small' : 'dim small'}>{r.ended ? 'Nothing logged' : 'Waiting for you…'}</span>
                )}
                {r.started && (
                  <input
                    className="note-in"
                    placeholder="note…"
                    aria-label={`What did you do at ${pad2(r.h)}:00`}
                    value={day.actuals?.[r.h] || ''}
                    onChange={(e) => actions.setActual(today, r.h, e.target.value)}
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
          );
        })}
        <div className="sg-row sleep">
          <span className="time">23:00</span>
          <div className="exp"><span className="fixedtxt">Sleep · 11 PM → 6 AM</span></div>
          <div className="act"><span className="dim small">{day.checks?.sleep ? 'Sleep rule ticked ✓' : 'Tick “7 hours sleep” tomorrow morning'}</span></div>
          <span />
        </div>
      </div>
    </section>
  );
}

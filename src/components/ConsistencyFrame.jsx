import { RULES } from '../config.js';
import { fmtDate } from '../lib.js';

const ROW_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

// GitHub-style contribution frame: one square per challenge day, darker = more rules done.
export default function ConsistencyFrame({ frame: f, caption = 'days consistent', maxLabel = RULES.length, compact = false }) {
  return (
    <section className={`frame ${compact ? 'compact' : ''}`} aria-label={`Consistency: ${f.consistent} of ${f.total} days`}>
      <div className="frame-graph">
        <div className="frame-rowlabels" aria-hidden="true">
          <span className="frame-spacer" />
          {ROW_LABELS.map((l, i) => <span key={i}>{l}</span>)}
        </div>
        <div>
          <div className="frame-months" style={{ gridTemplateColumns: `repeat(${f.weeks.length}, var(--cell))` }} aria-hidden="true">
            {f.weeks.map((_, i) => <span key={i}>{f.months.find((m) => m.col === i)?.label || ''}</span>)}
          </div>
          <div className="frame-cols">
            {f.weeks.map((w, i) => (
              <div className="frame-col" key={i}>
                {w.map((c, r) => (c ? (
                  <i
                    key={r}
                    className={`fc lv${c.state === 'future' ? 'x' : c.level} ${c.state === 'today' ? 'tod' : ''}`}
                    title={`${fmtDate(c.date)}${c.state === 'future' ? '' : ` · ${c.done}/${maxLabel}`}`}
                  />
                ) : <i key={r} className="fc blank" />))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="frame-stats">
        <div className="frame-big"><b>{f.consistent}</b><span> / {f.total}</span></div>
        <div className="frame-cap">{caption}</div>
        <div className="frame-sub">Streak {f.streak} · Best {f.best} · {f.left} to go</div>
        <div className="frame-legend" aria-hidden="true"><span>Less</span><i className="fc lv0" /><i className="fc lv1" /><i className="fc lv2" /><i className="fc lv3" /><i className="fc lv4" /><span>More</span></div>
      </div>
    </section>
  );
}

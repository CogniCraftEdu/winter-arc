import { useRef, useState } from 'react';
import { CATS, RULES, SETTINGS_DEFAULT } from '../config.js';
import { TOTAL_DAYS, allDays, dayNumber, dayResult, fmtDate, inChallenge } from '../lib.js';
import { finishHistory, finishOdds, posterior, priorOf, streakOdds } from '../odds.js';
import { useMemo } from 'react';

const pct = (p, d = 0) => `${(p * 100).toFixed(d)}%`;

// A small single-series line chart: 2px line, hairline grid, end dot with surface ring,
// crosshair + tooltip on hover/focus, direct label on the last point.
function LineChart({ title, points, xTicks, color, xLabel, fmtX }) {
  const W = 560; const H = 230; const m = { l: 40, r: 56, t: 14, b: 30 };
  const [hover, setHover] = useState(null);
  const ref = useRef(null);
  if (points.length === 0) return null;
  const x0 = points[0].x; const x1 = points[points.length - 1].x;
  const X = (x) => m.l + ((x - x0) / Math.max(1, x1 - x0)) * (W - m.l - m.r);
  const Y = (y) => m.t + (1 - y) * (H - m.t - m.b);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
  const area = `${d} L${X(x1)},${Y(0)} L${X(x0)},${Y(0)} Z`;
  const last = points[points.length - 1];

  const move = (e) => {
    const r = ref.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = points[0];
    for (const p of points) if (Math.abs(X(p.x) - px) < Math.abs(X(best.x) - px)) best = p;
    setHover(best);
  };
  const key = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const i = hover ? points.indexOf(hover) : points.length - 1;
    setHover(points[Math.min(points.length - 1, Math.max(0, i + (e.key === 'ArrowRight' ? 1 : -1)))]);
    e.preventDefault();
  };

  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}. Ends at ${pct(last.y)}.`} tabIndex={0}
        onPointerMove={move} onPointerLeave={() => setHover(null)} onFocus={() => setHover(last)} onBlur={() => setHover(null)} onKeyDown={key}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line className="grid" x1={m.l} x2={W - m.r} y1={Y(t)} y2={Y(t)} />
            <text className="tick" x={m.l - 8} y={Y(t) + 4} textAnchor="end">{t * 100}%</text>
          </g>
        ))}
        {xTicks.map((t) => <text key={t} className="tick" x={X(t)} y={H - 8} textAnchor="middle">{t}</text>)}
        <text className="tick" x={m.l} y={H - 8} textAnchor="start" opacity="0">{xLabel}</text>
        <path d={area} fill={color} opacity="0.1" />
        <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={X(last.x)} cy={Y(last.y)} r="4.5" fill={color} stroke="var(--panel)" strokeWidth="2" />
        <text className="endlabel" x={X(last.x) + 9} y={Y(last.y) + 4}>{pct(last.y, last.y < 0.1 ? 1 : 0)}</text>
        {hover && (
          <g>
            <line className="cross" x1={X(hover.x)} x2={X(hover.x)} y1={m.t} y2={H - m.b} />
            <circle cx={X(hover.x)} cy={Y(hover.y)} r="4.5" fill={color} stroke="var(--panel)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover && (
        <div className="tip" style={{ left: `${(X(hover.x) / W) * 100}%` }}>
          <b>{pct(hover.y, hover.y < 0.1 ? 1 : 0)}</b>
          <span>{fmtX(hover.x)}</span>
        </div>
      )}
      <details className="fold tableview">
        <summary>Table</summary>
        <table><tbody>{points.filter((p, i) => i % Math.ceil(points.length / 12) === 0 || i === points.length - 1).map((p) => <tr key={p.x}><td>{fmtX(p.x)}</td><td>{pct(p.y, p.y < 0.1 ? 1 : 0)}</td></tr>)}</tbody></table>
      </details>
    </figure>
  );
}

export default function Odds({ state, actions, today, settings }) {
  const days = allDays();
  const prior = priorOf(settings.oddsP0 / 100, settings.oddsN0);
  const delta = settings.oddsDecay / 100;
  const dn = inChallenge(today) ? dayNumber(today) : today > days[days.length - 1] ? TOTAL_DAYS : 1;

  // Days that are already over, in order. Today is still open, so it is not counted yet.
  const resolved = days.filter((k) => k < today).map((k) => dayResult(state.days[k], settings, CATS, RULES).won);
  const post = posterior({ results: resolved, prior });
  const missed = resolved.filter((r) => !r).length;
  const remaining = TOTAL_DAYS - dn + 1;

  const cleanFinish = streakOdds({ ...post, day: dn, k: remaining, delta });
  const next7 = streakOdds({ ...post, day: dn, k: Math.min(7, remaining), delta });

  const target = settings.oddsTarget / 100;
  const wins = resolved.filter(Boolean).length;
  const resolvedKey = resolved.map((r) => (r ? 1 : 0)).join('');
  const past = useMemo(
    () => finishHistory({ results: resolved, prior, total: TOTAL_DAYS, delta, target, upToDay: dn }).map((h) => ({ x: h.day, y: h.p })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolvedKey, settings.oddsP0, settings.oddsN0, delta, target, dn],
  );
  const finishNow = finishOdds({ ...post, wins, day: dn, total: TOTAL_DAYS, delta, target });
  const needWins = Math.ceil(target * TOTAL_DAYS - 1e-9);
  const forward = Array.from({ length: remaining + 1 }, (_, k) => ({ x: dn - 1 + k, y: streakOdds({ ...post, day: dn, k, delta }) }));
  const dayLabel = (x) => (x >= 1 ? `Day ${x} · ${fmtDate(days[Math.min(days.length, x) - 1], { day: 'numeric', month: 'short' })}` : 'Start');
  const ticks = (a, b) => { const out = []; const step = b - a > 45 ? 15 : b - a > 20 ? 10 : 5; for (let t = Math.ceil(a / step) * step; t <= b; t += step) out.push(t); return out; };

  const set = (key, raw, lo, hi) => {
    const v = raw === '' ? SETTINGS_DEFAULT[key] : Math.min(hi, Math.max(lo, +raw));
    actions.setSettings({ [key]: Number.isFinite(v) ? v : SETTINGS_DEFAULT[key] });
  };

  return (
    <section className="card wide">
      <h2>Odds <span className="count">will I keep winning every day?</span></h2>
      <p className="dim">
        A transparent model, not a measurement. It starts from your assumed daily win chance and updates after every finished day.
        {missed > 0 ? ` ${missed} day${missed === 1 ? '' : 's'} missed so far, so a perfect ${TOTAL_DAYS} is gone; the streak odds below are for the run from here.` : resolved.length ? ' Perfect run still intact.' : ''}
      </p>

      <div className="stats odds-stats">
        <div><b>{pct(finishNow, finishNow < 0.1 ? 1 : 0)}</b><span>finish with {needWins}+ of {TOTAL_DAYS} days won</span></div>
        <div><b>{pct(post.mean, 1)}</b><span>daily win chance</span></div>
        <div><b>{pct(next7)}</b><span>win the next {Math.min(7, remaining)} days in a row</span></div>
        <div><b>{pct(cleanFinish, cleanFinish < 0.1 ? 1 : 0)}</b><span>win all {remaining} remaining days</span></div>
      </div>

      <div className="charts">
        <LineChart title={`Odds over time: chance of finishing with ${settings.oddsTarget}%+ of days won, as of each morning`} points={past} xTicks={ticks(1, Math.max(2, dn))} color="var(--text)" fmtX={dayLabel} xLabel="day" />
        <LineChart title="Streak survival from today: chance of still being unbroken" points={forward} xTicks={ticks(dn - 1, TOTAL_DAYS)} color="var(--accent)" fmtX={(x) => (x < dn ? 'Start of today' : `Through ${dayLabel(x)}`)} xLabel="day" />
      </div>

      <details className="fold">
        <summary>Model assumptions</summary>
        <div className="assume">
          <label className="field">Assumed daily win chance (%)
            <input type="number" min="1" max="99" value={settings.oddsP0} onChange={(e) => set('oddsP0', e.target.value, 1, 99)} />
          </label>
          <label className="field">Prior strength (days of evidence)
            <input type="number" min="1" max="200" value={settings.oddsN0} onChange={(e) => set('oddsN0', e.target.value, 1, 200)} />
          </label>
          <label className="field">"Finished" means this % of days won
            <input type="number" min="1" max="100" value={settings.oddsTarget} onChange={(e) => set('oddsTarget', e.target.value, 1, 100)} />
          </label>
          <label className="field">Weekly fatigue (% drop per week)
            <input type="number" min="0" max="20" step="0.5" value={settings.oddsDecay} onChange={(e) => set('oddsDecay', e.target.value, 0, 20)} />
          </label>
        </div>
        <p className="dim small">
          p is the daily win chance, believed to follow Beta(a, b): it starts from your assumption and adds one per won or missed day.
          Streak odds = E[pᵏ]. "Finish" odds average the chance of reaching the win count over that belief about p.
          Fatigue multiplies each later week's daily odds by (1 − drop). Raise it to model "consistency decays over time".
        </p>
      </details>
    </section>
  );
}

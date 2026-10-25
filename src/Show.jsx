import { useEffect, useState } from 'react';
import { END, HANDLE, IG_URL, MUSCLES, START } from './config.js';
import { dayStatus, fitnessFrame, journalFromState, paceInfo, totals } from './fitness.js';
import { addDays, diffDays, fmtDate, todayKey } from './lib.js';
import { useSnapshot } from './store.js';
import { isProofUrl } from './proofs.js';
import BodyMap from './components/BodyMap.jsx';
import ConsistencyFrame from './components/ConsistencyFrame.jsx';

// A small tappable screenshot/photo. Only URLs from our own proofs/ storage are ever rendered.
function Proof({ url, label }) {
  if (!isProofUrl(url)) return null;
  return <a className="sh-proof" href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${label}`}><img src={url} alt={label} loading="lazy" /><span>{label} ↗</span></a>;
}

const EMPTY = { target: { perWeek: 0.75, startWeight: null }, days: {} };
const sgn = (n, d = 1) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(d)}`;

// Published data for everyone; falls back to this browser's own data (the owner previewing, or local dev).
function usePublished() {
  const [s, setS] = useState({ status: 'loading' });
  useEffect(() => {
    let on = true;
    const load = () => fetch('/api/public').then((r) => (r.status === 404 ? { empty: true } : r.ok ? r.json() : Promise.reject()))
      .then((d) => on && setS(d.empty ? { status: 'empty' } : { status: 'ok', data: d }))
      .catch(() => on && setS((p) => (p.status === 'ok' ? p : { status: 'error' })));
    load();
    const id = setInterval(load, 60000);
    return () => { on = false; clearInterval(id); };
  }, []);
  return s;
}

function PaceChart({ pace, endKey }) {
  const W = 480; const H = 190; const m = { l: 44, r: 50, t: 16, b: 26 };
  const x1 = Math.max(1, diffDays(endKey, pace.startDate));
  const X = (date) => m.l + (diffDays(date, pace.startDate) / x1) * (W - m.l - m.r);
  const tEnd = pace.targetAt(endKey);
  const vals = [...pace.points.map((p) => p.w), pace.start, tEnd];
  const lo = Math.min(...vals); const hi = Math.max(...vals); const pad = Math.max(0.4, (hi - lo) * 0.15);
  const Y = (v) => m.t + (1 - (v - (lo - pad)) / (hi - lo + 2 * pad)) * (H - m.t - m.b);
  const line = pace.points.map((p, i) => `${i ? 'L' : 'M'}${X(p.date).toFixed(1)},${Y(p.w).toFixed(1)}`).join(' ');
  const last = pace.points[pace.points.length - 1];
  return (
    <figure className="sh-fig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Weight versus target pace. Now ${last.w} kg, target ${pace.targetNow} kg.`} className="sh-svg">
        {[lo, hi].map((v) => <g key={v}><line x1={m.l} x2={W - m.r} y1={Y(v)} y2={Y(v)} className="sh-grid" /><text x={m.l - 6} y={Y(v) + 4} textAnchor="end" className="sh-tick">{v.toFixed(1)}</text></g>)}
        <line x1={X(pace.startDate)} y1={Y(pace.start)} x2={X(endKey)} y2={Y(tEnd)} className="sh-target" />
        <path d={line} fill="none" className="sh-line" />
        {pace.points.map((p) => <circle key={p.date} cx={X(p.date)} cy={Y(p.w)} r="3" className="sh-pt" />)}
        <circle cx={X(last.date)} cy={Y(last.w)} r="5.5" className="sh-dot" />
        <text x={X(last.date) + 9} y={Y(last.w) + 4} className="sh-end">{last.w.toFixed(1)}</text>
        <text x={m.l} y={H - 6} className="sh-tick">{fmtDate(pace.startDate, { day: 'numeric', month: 'short' })}</text>
        <text x={W - m.r} y={H - 6} textAnchor="end" className="sh-tick">{fmtDate(endKey, { day: 'numeric', month: 'short' })}</text>
      </svg>
      <figcaption className="sh-legend"><span><i className="a" />Weight</span><span><i className="b" />Target pace (−{pace.perWeek} kg / week)</span></figcaption>
    </figure>
  );
}

function RunBars({ days, today }) {
  const items = Array.from({ length: 14 }, (_, i) => { const k = addDays(today, i - 13); return { k, v: days[k]?.runKm || 0, today: k === today }; });
  const max = Math.max(5, ...items.map((i) => i.v));
  const W = 480; const H = 120; const pad = { l: 34, r: 6, t: 10, b: 22 }; const bw = (W - pad.l - pad.r) / items.length;
  const Y = (v) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Run distance, last 14 days" className="sh-svg">
      <text x={pad.l - 6} y={Y(max) + 4} textAnchor="end" className="sh-tick">{max} km</text>
      <text x={pad.l - 6} y={Y(0) + 4} textAnchor="end" className="sh-tick">0</text>
      <line x1={pad.l} x2={W - pad.r} y1={Y(0)} y2={Y(0)} className="sh-grid" />
      {items.map((it, i) => <rect key={it.k} x={pad.l + i * bw + bw * 0.2} y={Y(it.v)} width={bw * 0.6} height={Math.max(0, Y(0) - Y(it.v))} rx="4" className={it.today ? 'sh-bar today' : 'sh-bar'} />)}
      <text x={pad.l + bw * 0.5} y={H - 5} textAnchor="middle" className="sh-tick">{fmtDate(items[0].k, { day: 'numeric', month: 'short' })}</text>
      <text x={W - pad.r - bw * 0.5} y={H - 5} textAnchor="middle" className="sh-tick">{fmtDate(items[13].k, { day: 'numeric', month: 'short' })}</text>
    </svg>
  );
}

export default function Show() {
  const today = todayKey();
  const published = usePublished();
  const local = journalFromState(useSnapshot(), today);
  const hasLocal = Object.keys(local.days).length > 0;
  const journal = published.status === 'ok' ? published.data : hasLocal ? local : EMPTY;
  const preview = published.status !== 'ok' && hasLocal;

  useEffect(() => { document.title = `Fitness Journey · ${HANDLE}`; }, []);

  const pace = paceInfo(journal, today, START);
  const frame = fitnessFrame(journal, today);
  const tot = totals(journal, today);
  const t = journal.target;
  const dates = Object.keys(journal.days).filter((d) => d <= today).sort();
  const focus = journal.days[today] ? today : dates[dates.length - 1];
  const d = focus ? journal.days[focus] : null;
  const st = d ? dayStatus(d, t) : null;
  const scaleDate = [...dates].reverse().find((k) => isProofUrl(journal.days[k]?.proofs?.scale));
  const scaleUrl = scaleDate ? journal.days[scaleDate].proofs.scale : null;
  const endKey = today > END ? today : END;
  const kcal = d?.kcal || 0; const P = d?.p || 0; const Cb = d?.c || 0; const F = d?.f || 0;
  const labels = MUSCLES.filter((m) => (d?.trained || []).includes(m.id)).map((m) => m.label);
  const pacePerKm = d?.runKm && d?.runMin ? d.runMin / d.runKm : null;
  const mmss = (m) => `${Math.floor(m)}:${String(Math.round((m % 1) * 60)).padStart(2, '0')}`;
  const updated = published.status === 'ok' && published.data.updatedAt ? new Date(published.data.updatedAt) : new Date();

  return (
    <div className="sh">
      <header className="sh-top">
        <span className="sh-eyebrow">Fitness journey</span>
        <a className="sh-chip" href={IG_URL} target="_blank" rel="noopener noreferrer">{HANDLE}</a>
      </header>

      <section className="sh-hero">
        <h1>Losing {t.perWeek} kg<span> every week</span></h1>
        <div className="sh-date">Updated {fmtDate(updated.toISOString().slice(0, 10), { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        {preview && <div className="sh-preview">Preview: showing the data in this browser. Followers see it once you publish.</div>}
      </section>

      <section className="sh-card">
        <h2>Weight</h2>
        {pace ? (
          <>
            <div className="sh-weightrow">
              <div className="sh-big">{pace.current.toFixed(1)}<small> kg</small></div>
              <div className={`sh-pace ${pace.status === 'ahead' ? 'good' : pace.status === 'behind' ? 'warn' : ''}`}>
                {pace.status === 'on pace' ? 'On target pace' : `${Math.abs(pace.diff).toFixed(2)} kg ${pace.status} of pace`}
              </div>
            </div>
            {scaleUrl && <Proof url={scaleUrl} label={`Scale · ${fmtDate(scaleDate, { day: 'numeric', month: 'short' })}`} />}
            <div className="sh-sub">{sgn(-pace.lost)} kg since {fmtDate(pace.startDate, { day: 'numeric', month: 'short' })}{pace.weekChange != null && <> · {sgn(pace.weekChange)} kg in the last 7 days (target −{t.perWeek})</>}</div>
            {pace.points.length > 1 ? <PaceChart pace={pace} endKey={endKey} /> : <p className="sh-dim">The chart appears after a second weigh-in.</p>}
          </>
        ) : <p className="sh-dim">First weigh-in coming soon.</p>}
      </section>

      <section className="sh-card">
        <h2>{!focus ? 'Daily checklist' : focus === today ? 'Today' : `Last logged · ${fmtDate(focus)}`}</h2>
        {d?.rest && <div className="sh-rest">Rest day · recovery is part of the plan</div>}
        {st?.perfect && !d?.rest && <div className="sh-perfect">Perfect day · all four done</div>}
        <div className="sh-check">
          <div className={`it ${st?.run ? 'done' : ''}`}>
            <span className="sh-k">{t.runKm} km run</span>
            <b>{d?.rest ? 'Rest' : st?.run ? '✓ Done' : d?.runKm ? 'Short of target' : 'Not yet'}</b>
            <em>{d?.runKm ? `${d.runKm} / ${t.runKm} km` : '—'}{d?.runMin ? ` · ${d.runMin} min` : ''}{pacePerKm ? ` · ${mmss(pacePerKm)} /km` : ''}</em>
            <i className="sh-mini"><u style={{ width: `${Math.min(100, ((d?.runKm || 0) / t.runKm) * 100)}%` }} /></i>
            <Proof url={d?.proofs?.run} label="Strava" />
          </div>
          <div className={`it ${st?.gym ? 'done' : ''}`}>
            <span className="sh-k">Gym session</span>
            <b>{d?.rest ? 'Rest' : st?.gym ? '✓ Done' : 'Not yet'}</b>
            <em>{d?.workout || (labels.length ? 'Training' : '—')}</em>
            <Proof url={d?.proofs?.gym} label="Gym photo" />
          </div>
          <div className={`it ${st?.cal ? 'done' : kcal > (t.kcal || Infinity) ? 'over' : ''}`}>
            <span className="sh-k">Calories</span>
            <b>{kcal ? (st?.cal ? '✓ In target' : 'Over target') : 'Not logged'}</b>
            <em>{kcal ? `${kcal}${t.kcal ? ` / ${t.kcal}` : ''} kcal` : '—'}</em>
            <Proof url={d?.proofs?.cal} label="HealthifyMe" />
          </div>
          <div className={`it ${st?.vlog ? 'done' : ''}`}>
            <span className="sh-k">Daily vlog</span>
            <b>{st?.vlog ? '✓ Posted' : 'Not yet'}</b>
            <em>{d?.vlogUrl ? <a href={d.vlogUrl} target="_blank" rel="noopener noreferrer">Watch it ↗</a> : '—'}</em>
          </div>
        </div>
        {!d?.rest && <BodyMap trained={d?.trained || []} />}
        {!d?.rest && <div className="sh-tags">{labels.length ? labels.map((l) => <span key={l}>{l}</span>) : <em>Body parts hit show up here</em>}</div>}
      </section>

      <section className="sh-card">
        <h2>Nutrition</h2>
        <div className="sh-big">{kcal || '—'}<small>{t.kcal ? ` / ${t.kcal} kcal` : ' kcal'}</small></div>
        {t.kcal > 0 && <div className="sh-bar-track"><i style={{ width: `${Math.min(100, (kcal / t.kcal) * 100)}%` }} className={kcal > t.kcal ? 'over' : ''} /></div>}
        <div className="sh-macros" aria-label="Macro split">{P * 4 + Cb * 4 + F * 9 > 0 ? <><i style={{ flex: P * 4 }} className="p" /><i style={{ flex: Cb * 4 }} className="c" /><i style={{ flex: F * 9 }} className="f" /></> : <i style={{ flex: 1 }} className="none" />}</div>
        <div className="sh-macro-legend"><span><b className="p" />Protein {P} g{t.protein ? ` / ${t.protein}` : ''}</span><span><b className="c" />Carbs {Cb} g</span><span><b className="f" />Fat {F} g</span></div>
      </section>

      <ConsistencyFrame frame={frame} caption="perfect days" maxLabel={4} compact />

      <p className="sh-legend-note">A perfect day = {t.runKm} km run + gym + calories in target + vlog posted. A planned rest day waives the run and gym.</p>

      <div className="sh-tiles">
        <div><b>{tot.runs}</b><span>runs</span></div>
        <div><b>{tot.km}</b><span>km run</span></div>
        <div><b>{tot.gyms}</b><span>gym</span></div>
        <div><b>{tot.vlogs}</b><span>vlogs</span></div>
      </div>

      <section className="sh-card">
        <h2>Run distance · last 14 days</h2>
        <RunBars days={journal.days} today={today} />
      </section>

      <section className="sh-cta">
        <div>Follow the journey</div>
        <a className="sh-follow" href={IG_URL} target="_blank" rel="noopener noreferrer">Follow {HANDLE}</a>
        <p>New update every day: weight, run, gym and food.</p>
      </section>

      {hasLocal && <footer className="sh-foot"><a href="/app">open tracker</a></footer>}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { BRAND, END, HANDLE, IG_URL, MUSCLES, START, TARGETS } from './config.js';
import { dayStatus, fitnessFrame, paceInfo, totals } from './fitness.js';
import { journalFromCsv } from './sheet.js';
import { addDays, diffDays, fmtDate, todayKey } from './lib.js';
import BodyMap from './components/BodyMap.jsx';
import ConsistencyFrame from './components/ConsistencyFrame.jsx';

const EMPTY = { target: { ...TARGETS }, days: {} };
const sgn = (n, d = 1) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(d)}`;

// Sample data for previewing the page (add ?demo to the address). Never shown to visitors by default.
function demoJournal(today) {
  const days = {};
  const start = new Date(`${START}T00:00:00`);
  const n = Math.max(0, Math.min(20, Math.round((new Date(`${today}T00:00:00`) - start) / 86400000)));
  for (let i = 0; i <= n; i += 1) {
    const k = new Date(start.getTime() + i * 86400000); const key = `${k.getFullYear()}-${String(k.getMonth() + 1).padStart(2, '0')}-${String(k.getDate()).padStart(2, '0')}`;
    const rest = i % 7 === 6;
    days[key] = { w: +(80 - 0.11 * i - (i % 3) * 0.05).toFixed(1), runKm: rest ? null : 10 + (i % 3) * 0.4, runMin: rest ? null : 56, runDone: true, gymDone: true, workout: rest ? '' : ['Push', 'Pull', 'Legs'][i % 3], trained: rest ? [] : [['chest', 'shoulders', 'triceps'], ['back', 'biceps'], ['quads', 'hamstrings', 'glutes', 'calves']][i % 3], kcal: 1950 + (i % 4) * 60, p: 150, c: 200, f: 58, rest, vlog: i % 5 !== 4, vlogUrl: '' };
  }
  return { target: { ...TARGETS }, days };
}

// The public data comes from the daily sheet, relayed by /api/sheet.
function useSheet() {
  const [s, setS] = useState({ status: 'loading' });
  useEffect(() => {
    let on = true;
    const load = () => fetch('/api/sheet')
      .then(async (r) => { if (r.status === 501) return { status: 'unlinked' }; if (!r.ok) throw new Error(String(r.status)); return { status: 'ok', journal: journalFromCsv(await r.text()) }; })
      .then((v) => on && setS(v))
      .catch(() => on && setS((p) => (p.status === 'ok' ? p : { status: 'error' })));
    load();
    const id = setInterval(load, 120000);
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
  const sheet = useSheet();
  const demo = new URLSearchParams(window.location.search).has('demo');
  const journal = demo ? demoJournal(today) : sheet.status === 'ok' ? sheet.journal : EMPTY;
  const hasLocal = (() => { try { return !!localStorage.getItem('winterarc:v1'); } catch { return false; } })(); // only the owner's browser has this

  useEffect(() => { document.title = `${BRAND} · −${TARGETS.perWeek} kg a week · ${HANDLE}`; }, []);

  const pace = paceInfo(journal, today, START);
  const frame = fitnessFrame(journal, today);
  const tot = totals(journal, today);
  const t = journal.target;
  const dates = Object.keys(journal.days).filter((d) => d <= today).sort();
  const focus = journal.days[today] ? today : dates[dates.length - 1];
  const d = focus ? journal.days[focus] : null;
  const st = d ? dayStatus(d, t) : null;
  const lastDate = dates[dates.length - 1];
  const endKey = today > END ? today : END;
  const kcal = d?.kcal || 0; const P = d?.p || 0; const Cb = d?.c || 0; const F = d?.f || 0;
  const labels = MUSCLES.filter((m) => (d?.trained || []).includes(m.id)).map((m) => m.label);
  const pacePerKm = d?.runKm && d?.runMin ? d.runMin / d.runKm : null;
  const mmss = (m) => `${Math.floor(m)}:${String(Math.round((m % 1) * 60)).padStart(2, '0')}`;

  return (
    <div className="sh">
      <header className="sh-top">
        <span className="sh-eyebrow">{TARGETS.perWeek > 0 ? `Losing ${TARGETS.perWeek} kg every week` : 'Fitness journey'}</span>
        <a className="sh-chip" href={IG_URL} target="_blank" rel="noopener noreferrer">{HANDLE}</a>
      </header>

      <section className="sh-hero">
        <h1>Fat <span>to</span> Fit</h1>
        <p className="sh-tag">A daily, public scoreboard: run, gym, calories, vlog, weight.</p>
        <div className="sh-date">{lastDate ? `Last update · ${fmtDate(lastDate, { weekday: 'long', day: 'numeric', month: 'long' })}` : today < START ? `Starts ${fmtDate(START, { weekday: 'long', day: 'numeric', month: 'long' })}` : 'First update coming soon'}</div>
        {demo && <div className="sh-preview">Sample data (preview). Real numbers come from your daily sheet.</div>}
        {!demo && sheet.status === 'error' && <div className="sh-preview">Couldn't load the latest numbers. Refresh in a minute.</div>}
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
          </div>
          <div className={`it ${st?.gym ? 'done' : ''}`}>
            <span className="sh-k">Gym session</span>
            <b>{d?.rest ? 'Rest' : st?.gym ? '✓ Done' : 'Not yet'}</b>
            <em>{d?.workout || (labels.length ? 'Training' : '—')}</em>
          </div>
          <div className={`it ${st?.cal ? 'done' : kcal > (t.kcal || Infinity) ? 'over' : ''}`}>
            <span className="sh-k">Calories</span>
            <b>{kcal ? (st?.cal ? '✓ In target' : 'Over target') : 'Not logged'}</b>
            <em>{kcal ? `${kcal}${t.kcal ? ` / ${t.kcal}` : ''} kcal` : '—'}</em>
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

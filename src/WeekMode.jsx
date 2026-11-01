import { useEffect, useMemo } from 'react';
import { DETOX, HANDLE, TARGETS } from './config.js';
import { fmtDate, todayKey } from './lib.js';
import { buildDays, overview, weekMilestones } from './analytics.js';
import { EMPTY, Num, demoJournal, useSheet } from './Dashboard.jsx';

const STATE = { perfect: 'Perfect', good: '3 of 4', low: 'Low', rest: 'Rest', none: 'No log', future: '', before: '' };
const LETTER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// /?week (latest finished week) or /?week=3 : the weekly dashboard as a clean poster to screen-record or screenshot on Sunday.
export default function WeekMode() {
  const today = todayKey();
  const [sheet] = useSheet();
  const q = new URLSearchParams(window.location.search);
  const demo = q.has('demo');
  const journal = demo ? demoJournal(today) : sheet.status === 'ok' ? sheet.journal : EMPTY;
  const days = useMemo(() => buildDays(journal, today), [journal, today]);
  const ov = useMemo(() => overview(days, journal), [days, journal]);
  const data = useMemo(() => weekMilestones(days, journal, today), [days, journal, today]);
  useEffect(() => { document.documentElement.classList.add('reel-on'); return () => document.documentElement.classList.remove('reel-on'); }, []);
  const want = parseInt(q.get('week'), 10);
  const w = (Number.isFinite(want) ? data.weeks.find((x) => x.n === want) : null) || data.weeks[data.weeks.length - 1] || data.current;
  const goal = journal.target.goalWeight || TARGETS.goalWeight;
  if (!w) return <div className="reel"><div className="reel-in"><div className="reel-top"><span>FAT TO FIT</span><em>{HANDLE}</em></div><div className="reel-day">Week 1</div><div className="reel-foot">The first week closes on Sunday.</div></div></div>;
  return (
    <div className="reel weekview">
      <div className="reel-in">
        <div className="reel-top"><span>FAT TO FIT · {DETOX.label.toUpperCase()}</span><em>{HANDLE}</em></div>
        <div className="reel-day">WEEK {w.n}<small>{w.complete ? 'COMPLETE' : 'IN PROGRESS'}</small></div>
        <div className="wv-range">{fmtDate(w.start, { day: 'numeric', month: 'short' })} – {fmtDate(w.end, { day: 'numeric', month: 'short' })}</div>
        <div className={`reel-w wv-change ${w.change != null && w.change <= 0 ? '' : 'up'}`}>{w.change != null ? <Num v={w.change} d={1} sign delay={300} /> : '–'}<small> kg</small></div>
        {w.weightStart != null && w.weightEnd != null && <div className="reel-lost" style={{ color: '#f4f4f5' }}>{w.weightStart.toFixed(1)} → {w.weightEnd.toFixed(1)} kg</div>}
        <ul className="wv-days">{w.states.map((s, i) => <li key={s.k} className={s.state} style={{ '--i': i }}><b>{s.state === 'perfect' ? '✓' : s.state === 'rest' ? 'R' : s.n ?? '–'}</b><span>{LETTER[i]}</span><em>{STATE[s.state]}</em></li>)}</ul>
        <ul className="wv-stats"><li><b>{w.perfect}/7</b>perfect days</li><li><b>{w.avgSteps != null ? w.avgSteps.toLocaleString('en-IN') : '–'}</b>avg steps</li><li><b>{w.score ?? '–'}</b>Kaizen score</li></ul>
        <div className="reel-foot">{ov && goal ? `${ov.current.toFixed(1)} kg now · ${(ov.current - goal).toFixed(1)} kg to the ${goal} kg goal` : w.verdict}</div>
        <div className="reel-url">{window.location.host}</div>
      </div>
    </div>
  );
}

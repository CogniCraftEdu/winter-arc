import { useEffect, useMemo } from 'react';
import { HANDLE } from './config.js';
import { addDays, fmtDate, todayKey } from './lib.js';
import { buildDays, overview, perfectStreaks } from './analytics.js';
import { EMPTY, Num, demoJournal, useSheet } from './Dashboard.jsx';

// /?reel : a clean, no-scroll, phone-shaped view to screen-record as the opening or closing shot of a vlog.
// It shows today's goals live, so at the start of the day they are empty and by the end they are filled.
export default function ReelMode() {
  const today = todayKey();
  const [sheet] = useSheet();
  const demo = new URLSearchParams(window.location.search).has('demo');
  const journal = demo ? demoJournal(today) : sheet.status === 'ok' ? sheet.journal : EMPTY;
  const days = useMemo(() => buildDays(journal, today), [journal, today]);
  const ov = useMemo(() => overview(days, journal), [days, journal]);
  const streak = useMemo(() => perfectStreaks(days, today), [days, today]);
  useEffect(() => { document.documentElement.classList.add('reel-on'); return () => document.documentElement.classList.remove('reel-on'); }, []);

  const day = days.find((d) => d.k === today); const s = day?.st;
  const last = [...days].reverse().find((d) => d.row);
  const dayNo = days.length ? days.length : 1;
  const goals = [['Steps', s?.steps], ['Gym', s?.gym], ['Calories', s?.cal], ['Vlog', s?.vlog]];
  const pts = days.filter((d) => d.w != null);
  const W = 400; const H = 110;
  let path = '';
  if (pts.length > 1) {
    const lo = Math.min(...pts.map((p) => p.w)); const hi = Math.max(...pts.map((p) => p.w)); const span = Math.max(0.5, hi - lo);
    path = pts.map((p, i) => `${i ? 'L' : 'M'}${((i / (pts.length - 1)) * W).toFixed(1)},${(8 + (1 - (p.w - lo) / span) * (H - 16)).toFixed(1)}`).join(' ');
  }
  return (
    <div className="reel">
      <div className="reel-in">
        <div className="reel-top"><span>FAT TO FIT</span><em>{HANDLE}</em></div>
        <div className="reel-day">DAY {dayNo}</div>
        <div className="reel-w">{ov ? <Num v={ov.current} d={1} delay={300} /> : '–'}<small> kg</small></div>
        {ov && ov.lost > 0 && <div className="reel-lost">−{ov.lost.toFixed(1)} kg since {fmtDate(ov.startDate, { day: 'numeric', month: 'short' })}</div>}
        {path && <svg viewBox={`0 0 ${W} ${H}`} className="reel-spark" aria-hidden="true"><path d={path} pathLength="1" /></svg>}
        <ul className="reel-goals">{goals.map(([k, v], i) => <li key={k} className={v ? 'on' : ''} style={{ '--i': i }}><span>{k}</span><b>{v ? '✓' : '–'}</b></li>)}</ul>
        <div className="reel-foot">{last?.score != null ? `Kaizen score ${last.score}` : 'Kaizen'} · streak {streak.cur}</div>
        <div className="reel-url">{window.location.host}</div>
      </div>
    </div>
  );
}

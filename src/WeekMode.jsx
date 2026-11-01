import { useEffect, useMemo } from 'react';
import { EXPERIMENTS, HANDLE, IG_URL, MUSCLES, TARGETS } from './config.js';
import { addDays, fmtDate, todayKey } from './lib.js';
import { buildDays, overview, weekMilestones } from './analytics.js';
import { EMPTY, Num, demoJournal, useSheet } from './Dashboard.jsx';
import BodyMap from './components/BodyMap.jsx';
import { Dumbbell } from './components/Protocol.jsx';

const LETTER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const sgn = (n, d = 1) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(d)}`;
const day = (k, o) => fmtDate(k, o || { day: 'numeric', month: 'short' });

// /?week (latest finished week) or /?week=3 : "how was our week", one screen per topic, built from the sheet.
// Scroll it by hand, or add &auto (or &auto=6 for 6 seconds a screen) and it scrolls by itself so it can be screen-recorded as a reel.
export default function WeekMode() {
  const today = todayKey();
  const [sheet] = useSheet();
  const q = new URLSearchParams(window.location.search);
  const demo = q.has('demo');
  const journal = demo ? demoJournal(today) : sheet.status === 'ok' ? sheet.journal : EMPTY;
  const days = useMemo(() => buildDays(journal, today), [journal, today]);
  const ov = useMemo(() => overview(days, journal), [days, journal]);
  const data = useMemo(() => weekMilestones(days, journal, today), [days, journal, today]);
  const want = parseInt(q.get('week'), 10);
  const withData = data.weeks.filter((x) => x.days > 0);
  const w = (Number.isFinite(want) ? data.weeks.find((x) => x.n === want) : null) || withData[withData.length - 1] || data.current;
  const goal = journal.target.goalWeight || TARGETS.goalWeight;
  const t = journal.target;

  const secs = [];
  if (w) {
    const trained = MUSCLES.filter((m) => w.trained[m.id]);
    const trainDays = w.detail.filter((d) => d.row && d.row.workout && !d.st?.rest);
    const stepRows = w.detail.filter((d) => d.row?.steps > 0);
    const maxSteps = Math.max(t.steps, ...stepRows.map((d) => d.row.steps));
    const bestDay = w.best ? w.detail.find((d) => d.k === w.best.k) : null;
    const nextExp = EXPERIMENTS.find((e) => e.start > w.end) || null;

    secs.push(<section key="cover" className="wr-s cover"><Dumbbell size={64} className="wr-db" /><span className="wr-k">FAT TO FIT · WEEKLY REVIEW</span><h1>How was<br />our week?</h1><div className="wr-big sm">Week {w.n}</div><p>{day(w.start)} – {day(w.end)}{w.complete ? '' : ' (so far)'}</p><i className="wr-scroll" aria-hidden="true">scroll ↓</i></section>);
    if (w.change != null) secs.push(<section key="weight" className="wr-s"><span className="wr-k">The scale</span><div className={`wr-big ${w.change <= 0 ? 'good' : 'warn'}`}><Num v={w.change} d={1} sign delay={200} /><small> kg</small></div>{w.weightStart != null && <p className="wr-line">{w.weightStart.toFixed(1)} → {w.weightEnd.toFixed(1)} kg</p>}<p>{w.verdict}</p>{ov && goal && <p className="wr-dim">{ov.current.toFixed(1)} kg now · {(ov.current - goal).toFixed(1)} kg to the {goal} kg goal</p>}</section>);
    secs.push(<section key="days" className="wr-s"><span className="wr-k">The seven days</span><div className="wr-big sm">{w.perfect} of 7<small> perfect</small></div><ul className="wv-days big">{w.states.map((s, i) => <li key={s.k} className={s.state} style={{ '--i': i }}><b>{s.state === 'perfect' ? '✓' : s.state === 'rest' ? 'R' : s.n ?? '–'}</b><span>{LETTER[i]}</span></li>)}</ul><p className="wr-dim">✓ all four goals · R rest day · number = goals done</p></section>);
    if (trainDays.length || trained.length) secs.push(<section key="train" className="wr-s"><span className="wr-k">Training</span><div className="wr-big sm">{trainDays.length}<small> sessions</small></div>{trained.length > 0 && <BodyMap trained={trained.map((m) => m.id)} />}<ul className="wr-list">{trainDays.map((d) => <li key={d.k}><span>{day(d.k, { weekday: 'short' })}</span><b>{d.row.workout}</b></li>)}</ul></section>);
    if (stepRows.length) secs.push(<section key="steps" className="wr-s"><span className="wr-k">Steps</span><div className="wr-big sm">{w.avgSteps != null ? w.avgSteps.toLocaleString('en-IN') : '–'}<small> a day</small></div><div className="wr-bars" role="img" aria-label="Steps per day">{w.detail.map((d, i) => <div key={d.k} style={{ '--h': `${Math.min(100, ((d.row?.steps || 0) / maxSteps) * 100)}%`, '--i': i }} className={d.row?.steps >= t.steps ? 'hit' : ''}><i /><span>{LETTER[i][0]}</span></div>)}</div><p className="wr-dim">Goal {t.steps.toLocaleString('en-IN')} a day · {stepRows.filter((d) => d.row.steps >= t.steps).length} of {stepRows.length} days hit</p></section>);
    if (w.avgKcal != null) secs.push(<section key="food" className="wr-s"><span className="wr-k">Food</span><div className="wr-big sm">{w.avgKcal.toLocaleString('en-IN')}<small> kcal a day</small></div><p>Target {t.kcal.toLocaleString('en-IN')}</p>{w.macros.p != null && <ul className="wr-chips"><li>Protein {w.macros.p} g</li><li>Carbs {w.macros.c ?? '–'} g</li><li>Fat {w.macros.f ?? '–'} g</li></ul>}</section>);
    if (w.avgSleep != null) secs.push(<section key="sleep" className="wr-s"><span className="wr-k">Sleep</span><div className="wr-big sm">{w.avgSleep}<small> h a night</small></div><p>Target {t.sleep} h</p></section>);
    if (bestDay || w.notes.length) secs.push(<section key="notes" className="wr-s"><span className="wr-k">What happened</span>{bestDay && <div className="wr-best"><b>Best day · {day(bestDay.k, { weekday: 'long' })}</b><span>Kaizen score {w.best.score}{bestDay.row?.workout ? ` · ${bestDay.row.workout}` : ''}</span></div>}{w.notes.length > 0 ? <ul className="wr-notes">{w.notes.map((n) => <li key={n.k}><span>{day(n.k, { weekday: 'short' })}</span>{n.note}</li>)}</ul> : <p className="wr-dim">Add a line in the sheet's Notes column and it shows up here.</p>}</section>);
    secs.push(<section key="next" className="wr-s"><span className="wr-k">Next week</span><div className="wr-big sm">Week {w.n + 1}</div><p>{nextExp ? `Experiment: ${nextExp.title}. ${nextExp.question}` : `Same four goals. 1% better, every single day.`}</p><ul className="wr-chips"><li>{t.steps.toLocaleString('en-IN')} steps</li><li>Gym</li><li>Under {t.kcal.toLocaleString('en-IN')} kcal</li><li>Vlog</li></ul></section>);
    secs.push(<section key="end" className="wr-s end"><Dumbbell size={56} className="wr-db" /><h2>Follow the journey</h2><p>{HANDLE}</p><a href={IG_URL} target="_blank" rel="noopener noreferrer">Instagram</a><em>{window.location.host}</em></section>);
  }

  useEffect(() => { document.documentElement.classList.add('wr-on'); return () => document.documentElement.classList.remove('wr-on'); }, []);
  // &auto : glide from screen to screen, then stop on the last one
  const nSecs = secs.length;
  useEffect(() => {
    if (!q.has('auto') || nSecs < 2) return undefined;
    const sec = Math.max(2, parseFloat(q.get('auto')) || 4);
    let i = 0;
    const id = setInterval(() => {
      i += 1; const els = document.querySelectorAll('.wr-s');
      if (i >= els.length) { clearInterval(id); return; }
      els[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, sec * 1000);
    return () => clearInterval(id);
  }, [nSecs]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!w) return <div className="wr"><section className="wr-s cover"><Dumbbell size={64} className="wr-db" /><h1>Week 1</h1><p>The first week closes on its Sunday. Check back then.</p></section></div>;
  return <div className="wr">{secs}</div>;
}

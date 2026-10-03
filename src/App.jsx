import { useEffect, useState } from 'react';
import { CATS, END, RULES, START } from './config.js';
import { useStore } from './store.js';
import { useNow } from './hooks.js';
import {
  TOTAL_DAYS, addDays, dayNumber, dayResult, diffDays, emptyDay, fmtClock, fmtDate, inChallenge, streaks, todayKey,
} from './lib.js';
import Icon from './components/Icon.jsx';
import Today from './components/Today.jsx';
import Timer from './components/Timer.jsx';
import Plan from './components/Plan.jsx';
import Food from './components/Food.jsx';
import Notes from './components/Notes.jsx';
import Journey from './components/Journey.jsx';

const TABS = [
  ['today', 'Today'],
  ['timer', 'Timer'],
  ['plan', 'Plan'],
  ['food', 'Food'],
  ['notes', 'Notes'],
  ['journey', 'Journey'],
];

export default function App() {
  const [state, actions] = useStore();
  const [tab, setTab] = useState(() => { try { return localStorage.getItem('winterarc:tab') || 'today'; } catch { return 'today'; } });
  const now = useNow();
  const today = todayKey();
  const { settings, timer, days } = state;

  useEffect(() => { try { localStorage.setItem('winterarc:tab', tab); } catch { /* ignore */ } }, [tab]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [tab]);

  // Running timer shows in the browser tab title.
  useEffect(() => {
    document.title = timer ? `⏱ ${fmtClock(now - timer.startedAt)} · ${timer.label}` : 'Winter Arc';
  }, [timer, now]);

  const day = { ...emptyDay(), ...(days[today] || {}) };
  const running = timer ? { id: 'running', label: timer.label, cat: timer.cat, start: timer.startedAt, end: now } : null;
  const result = dayResult(day, settings, CATS, RULES);
  const { current, best } = streaks(days, today, settings, CATS, RULES);
  const before = today < START;
  const after = today > END;
  const dn = dayNumber(today);
  const progress = inChallenge(today) ? (dn / TOTAL_DAYS) * 100 : after ? 100 : 0;

  const ctx = { state, actions, today, now, day, running, result, settings, dn };

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="eyebrow">Winter Arc</span>
          <span className="eyebrow dim">{fmtDate(START, { day: 'numeric', month: 'short' })} – {fmtDate(END, { day: 'numeric', month: 'short' })}</span>
        </div>
        <div className="hero-row">
          <h1>
            {before && <>Starts in {diffDays(START, today)}<span className="unit"> day{diffDays(START, today) === 1 ? '' : 's'}</span></>}
            {inChallenge(today) && <>Day {dn}<span className="unit"> of {TOTAL_DAYS}</span></>}
            {after && <>Complete</>}
          </h1>
          <dl className="mini">
            <div><dt>Streak</dt><dd>{current}</dd></div>
            <div><dt>Best</dt><dd>{best}</dd></div>
            <div><dt>Today</dt><dd>{result.done}<span className="dim">/{RULES.length}</span></dd></div>
          </dl>
        </div>
        <div className="progress" aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>
      </header>

      {running && (
        <button className="timerbar" onClick={() => setTab('timer')}>
          <span className="pulse" />
          <span className="tl">{running.label}</span>
          <span className="mono">{fmtClock(now - timer.startedAt)}</span>
          <span className="btn small danger" role="button" onClick={(e) => { e.stopPropagation(); actions.stopTimer(); }}>Stop</span>
        </button>
      )}

      <nav className="tabs" aria-label="Sections">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            <Icon name={id} /><span>{label}</span>
          </button>
        ))}
      </nav>

      <main>
        {tab === 'today' && <Today {...ctx} />}
        {tab === 'timer' && <Timer {...ctx} />}
        {tab === 'plan' && <Plan {...ctx} tomorrow={addDays(today, 1)} />}
        {tab === 'food' && <Food {...ctx} />}
        {tab === 'notes' && <Notes {...ctx} />}
        {tab === 'journey' && <Journey {...ctx} />}
      </main>
    </div>
  );
}

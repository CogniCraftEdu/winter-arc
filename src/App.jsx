import { useEffect, useState } from 'react';
import { CATS, END, RULES, START } from './config.js';
import { useStore } from './store.js';
import { useNow } from './hooks.js';
import {
  TOTAL_DAYS, addDays, dayNumber, dayResult, diffDays, emptyDay, fmtClock, fmtDate, inChallenge, streaks, todayKey,
} from './lib.js';
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
  const [tab, setTab] = useState(() => localStorage.getItem('winterarc:tab') || 'today');
  const now = useNow();
  const today = todayKey();
  const { settings, timer, days } = state;

  useEffect(() => { try { localStorage.setItem('winterarc:tab', tab); } catch { /* ignore */ } }, [tab]);

  // Running timer shows in the browser tab title.
  useEffect(() => {
    document.title = timer ? `⏱ ${fmtClock(now - timer.startedAt)} · ${timer.label}` : 'Winter Arc';
  }, [timer, now]);

  const day = days[today] || emptyDay();
  const running = timer ? { id: 'running', label: timer.label, cat: timer.cat, start: timer.startedAt, end: now } : null;
  const result = dayResult(day, settings, CATS, RULES);
  const { current, best } = streaks(days, today, settings, CATS, RULES);
  const before = today < START;
  const after = today > END;
  const dn = dayNumber(today);

  const ctx = { state, actions, today, now, day, running, result, settings };

  return (
    <div className="app">
      <header className="top">
        <div>
          <div className="eyebrow">WINTER ARC · {fmtDate(START, { day: 'numeric', month: 'short' })} → {fmtDate(END, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          <h1>
            {before && <>Starts in {diffDays(START, today)} day{diffDays(START, today) === 1 ? '' : 's'}</>}
            {inChallenge(today) && <>Day {dn} <span className="dim">/ {TOTAL_DAYS}</span></>}
            {after && <>Arc complete 🏁</>}
          </h1>
        </div>
        <div className="chips">
          <span className="chip">🔥 {current} streak</span>
          <span className="chip">🏆 best {best}</span>
          <span className="chip">{result.done}/{RULES.length} today</span>
        </div>
      </header>

      {running && (
        <div className="timerbar" onClick={() => setTab('timer')}>
          <span className="pulse" /> <b>{running.label}</b>
          <span className="mono">{fmtClock(now - timer.startedAt)}</span>
          <button className="btn small danger" onClick={(e) => { e.stopPropagation(); actions.stopTimer(); }}>Stop</button>
        </div>
      )}

      <nav className="tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
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

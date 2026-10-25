import { useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CATS, END, HABITS, RULES, START, WATER_TARGET } from '../config.js';
import { TOTAL_DAYS, dayNumber, dayResult, diffDays, fmtDate, frameData, streaks, workMs } from '../lib.js';
import { scheduleRows, scheduleSummary } from '../stats.js';
import DayCard from './DayCard.jsx';

const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

function cardData({ state, today, now, day, running, settings, dn }) {
  const result = dayResult(day, settings, CATS, RULES);
  const { current, best } = streaks(state.days, today, settings, CATS, RULES);
  const sum = scheduleSummary(scheduleRows(day, today, now, running));
  const frame = frameData(state.days, settings, today, CATS, RULES);
  const before = today < START;
  const after = today > END;
  const dnc = Math.max(1, Math.min(dn, TOTAL_DAYS));
  return {
    dn: dnc,
    before,
    dayText: before ? `Starts in ${diffDays(START, today)}` : after ? 'Complete' : `Day ${dnc}`,
    dayUnit: before ? (diffDays(START, today) === 1 ? 'day' : 'days') : after ? '' : `of ${TOTAL_DAYS}`,
    progress: before ? 0 : after ? 1 : dnc / TOTAL_DAYS,
    total: TOTAL_DAYS,
    range: `${fmtDate(START, { day: 'numeric', month: 'short' })} – ${fmtDate(END, { day: 'numeric', month: 'short' })}`,
    dateLabel: fmtDate(today),
    rules: RULES.map((r) => ({ id: r.id, label: r.label, on: !!result.checks[r.id] })),
    done: result.done,
    won: result.won,
    workMs: workMs(day, CATS, running),
    targetMs: settings.workTargetHours * 3600000,
    targetH: settings.workTargetHours,
    planPct: sum.pct,
    water: Math.min(day.water || 0, WATER_TARGET),
    waterTarget: WATER_TARGET,
    habitsDone: HABITS.filter((h) => day.habits?.[h.id]).length,
    habitsTotal: HABITS.length,
    streak: current,
    best,
    frame,
  };
}

// Draws the card (filled or empty) to a 1080x1920 PNG and downloads it.
function downloadPng(data, t, hook, name) {
  const svg = renderToStaticMarkup(<DayCard data={data} t={t} hook={hook} />);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = 1080; c.height = 1920;
    c.getContext('2d').drawImage(img, 0, 0, 1080, 1920);
    c.toBlob((blob) => {
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, 'image/png');
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function Reel(props) {
  const { settings, actions, dn } = props;
  const data = cardData(props);
  const vars = { day: data.dn, next: data.dn + 1, total: data.total };
  const startHook = fill(settings.reelStart, vars);
  const endHook = fill(settings.reelEnd, vars);

  const [mode, setMode] = useState('live'); // what the card shows when idle: live data or the empty morning card
  const [focus, setFocus] = useState(false); // full-screen, nothing but the card, for screen recording
  const [t, setT] = useState(null); // null = idle; 0..1 = replaying
  const raf = useRef(0);

  const stop = () => { cancelAnimationFrame(raf.current); setT(null); };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // Hold the empty card for a beat, fill it over `dur`, then hold the finished card.
  const play = ({ wait = 1500, dur = 9000 } = {}) => {
    cancelAnimationFrame(raf.current);
    setFocus(true);
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setT(1); return; }
    setT(0);
    const t0 = performance.now();
    const tick = (nowMs) => {
      const e = nowMs - t0 - wait;
      setT(Math.min(1, Math.max(0, e / dur)));
      if (e < dur) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  const exitFocus = () => { stop(); setFocus(false); };

  const idleT = mode === 'empty' ? 0 : 1;
  const shownT = t ?? idleT;
  const hook = shownT <= 0.02 ? startHook : shownT < 0.98 ? 'Filling it in…' : (mode === 'live' && t == null && !data.won ? `${data.dayText}: ${data.done}/${data.rules.length} so far` : endHook);

  const card = <DayCard data={data} t={shownT} hook={hook} />;

  if (focus) {
    return (
      <div className="reel-focus" onClick={exitFocus} role="button" aria-label="Tap to exit recording view">
        <div className="reel-frame">{card}</div>
        <span className="reel-exit">Tap to exit</span>
      </div>
    );
  }

  return (
    <div className="reel">
      <div className="reel-card">{card}</div>

      <div className="stack-lg reel-side">
        <section className="panel">
          <h2>Daily reel hook <span className="count">works on today's data</span></h2>
          <p className="dim">Open the reel with the empty dashboard, show your day, then close with it filled in. It rebuilds from your real numbers every day.</p>
          <div className="stack" style={{ marginTop: 14 }}>
            <button className="btn primary" onClick={() => play()}>▶ Record the fill (empty → filled)</button>
            <button className="btn" onClick={() => { setMode('empty'); setFocus(true); }}>Morning hook: show the empty dashboard</button>
            <button className="btn ghost" onClick={() => { setMode('live'); setFocus(true); }}>Evening reveal: show it filled</button>
          </div>
          <p className="dim small">Tip: start your phone's screen recording, tap a button, and tap the screen to exit when you're done. The fill takes about 11 seconds.</p>
        </section>

        <section className="panel">
          <h2>Public fitness page</h2>
          <p className="dim">Your Instagram bio link: weight vs your target pace, the daily checklist, calories and macros. It reads your daily sheet.</p>
          <a className="btn primary" style={{ display: "inline-block", textDecoration: "none", marginTop: 10 }} href="/" target="_blank" rel="noopener">Open public page ↗</a>
        </section>

        <section className="panel">
          <h2>Preview &amp; download</h2>
          <div className="seg">
            <button className={mode === 'live' ? 'on' : ''} onClick={() => setMode('live')}>Filled (live)</button>
            <button className={mode === 'empty' ? 'on' : ''} onClick={() => setMode('empty')}>Empty (morning)</button>
          </div>
          <div className="row wrap" style={{ marginTop: 10 }}>
            <button className="btn" onClick={() => downloadPng(data, 0, startHook, `fat-to-fit-day-${data.dn}-empty.png`)}>⬇ Empty PNG</button>
            <button className="btn" onClick={() => downloadPng(data, 1, endHook, `fat-to-fit-day-${data.dn}-filled.png`)}>⬇ Filled PNG</button>
          </div>
          <p className="dim small">1080 × 1920, story size.</p>
        </section>

        <section className="panel">
          <h2>Hook lines</h2>
          <label className="field">Start of the reel
            <input value={settings.reelStart} onChange={(e) => actions.setSettings({ reelStart: e.target.value })} />
          </label>
          <label className="field" style={{ marginTop: 12 }}>End of the reel
            <input value={settings.reelEnd} onChange={(e) => actions.setSettings({ reelEnd: e.target.value })} />
          </label>
          <p className="dim small">{'{day}'}, {'{next}'} and {'{total}'} fill in automatically.</p>
        </section>
      </div>
    </div>
  );
}

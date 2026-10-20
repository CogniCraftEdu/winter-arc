import { CATS, END, HANDLE, IG_URL, MUSCLES, RULES, START } from './config.js';
import { useNow } from './hooks.js';
import { TOTAL_DAYS, addDays, diffDays, dayNumber, dayResult, emptyDay, fmtDate, fmtHM, hhmm, inChallenge, planFor, streaks, todayKey, workMs } from './lib.js';
import { finishOdds, posterior, priorOf } from './odds.js';
import { quoteFor } from './quotes.js';
import { useSnapshot } from './store.js';
import BodyMap from './components/BodyMap.jsx';
import ConsistencyFrame from './components/ConsistencyFrame.jsx';

const DAYS_SHOWN = 14;

function WorkBars({ items, targetH }) {
  const W = 480; const H = 150; const pad = { l: 30, r: 8, t: 10, b: 24 };
  const max = Math.max(targetH, ...items.map((i) => i.v), 1);
  const bw = (W - pad.l - pad.r) / items.length;
  const Y = (v) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Hours worked, last 14 days" className="sh-svg">
      <line x1={pad.l} x2={W - pad.r} y1={Y(targetH)} y2={Y(targetH)} className="sh-grid" />
      <text x={pad.l - 6} y={Y(targetH) + 4} textAnchor="end" className="sh-tick">{targetH}h</text>
      <text x={pad.l - 6} y={Y(0) + 4} textAnchor="end" className="sh-tick">0</text>
      {items.map((it, i) => {
        const h = Math.max(0, Y(0) - Y(it.v));
        const x = pad.l + i * bw + bw * 0.2;
        return <rect key={it.k} x={x} y={Y(0) - h} width={bw * 0.6} height={h} rx={Math.min(4, bw * 0.3)} className={it.today ? 'sh-bar today' : 'sh-bar'} />;
      })}
      <text x={pad.l + bw * 0.5} y={H - 6} textAnchor="middle" className="sh-tick">{items[0].label}</text>
      <text x={W - pad.r - bw * 0.5} y={H - 6} textAnchor="middle" className="sh-tick">{items[items.length - 1].label}</text>
    </svg>
  );
}

function WeightLine({ items }) {
  const pts = items.filter((i) => i.w != null);
  if (pts.length < 2) return <p className="sh-dim">Log your weight on 2 days to see the trend.</p>;
  const W = 480; const H = 150; const pad = { l: 40, r: 44, t: 14, b: 24 };
  const lo = Math.min(...pts.map((p) => p.w)); const hi = Math.max(...pts.map((p) => p.w));
  const span = Math.max(1, hi - lo); const y0 = lo - span * 0.2; const y1 = hi + span * 0.2;
  const X = (i) => pad.l + (i / (items.length - 1)) * (W - pad.l - pad.r);
  const Y = (v) => pad.t + (1 - (v - y0) / (y1 - y0)) * (H - pad.t - pad.b);
  const d = pts.map((p, n) => `${n ? 'L' : 'M'}${X(p.i).toFixed(1)},${Y(p.w).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Weight, last 14 days" className="sh-svg">
      {[lo, hi].map((v) => <g key={v}><line x1={pad.l} x2={W - pad.r} y1={Y(v)} y2={Y(v)} className="sh-grid" /><text x={pad.l - 6} y={Y(v) + 4} textAnchor="end" className="sh-tick">{v.toFixed(1)}</text></g>)}
      <path d={d} fill="none" className="sh-line" />
      <circle cx={X(last.i)} cy={Y(last.w)} r="5" className="sh-dot" />
      <text x={X(last.i) + 9} y={Y(last.w) + 4} className="sh-end">{last.w.toFixed(1)}</text>
      <text x={pad.l} y={H - 6} className="sh-tick">{items[0].label}</text>
      <text x={W - pad.r} y={H - 6} textAnchor="end" className="sh-tick">{items[items.length - 1].label}</text>
    </svg>
  );
}

export default function Show() {
  const state = useSnapshot();
  const now = useNow(1000);
  const today = todayKey();
  const { settings, days, timer } = state;
  const day = { ...emptyDay(), ...(days[today] || {}) };
  const running = timer ? { id: 'running', label: timer.label, cat: timer.cat, start: timer.startedAt, end: now } : null;
  const result = dayResult(day, settings, CATS, RULES);
  const { current, best } = streaks(days, today, settings, CATS, RULES);
  const inRange = inChallenge(today);
  const dn = inRange ? dayNumber(today) : today > END ? TOTAL_DAYS : 1;
  const [quote, author] = quoteFor(dn, today);

  // Weight: latest logged on or before today, change since the first logged day.
  const logged = Object.keys(days).filter((k) => k <= today && days[k]?.weight !== '' && days[k]?.weight != null).sort();
  const wNow = logged.length ? days[logged[logged.length - 1]].weight : null;
  const wDelta = logged.length > 1 ? wNow - days[logged[0]].weight : null;

  // Nutrition
  const nut = day.nutrition || {};
  const kcal = +nut.kcal || 0; const P = +nut.p || 0; const Cb = +nut.c || 0; const F = +nut.f || 0;
  const macroKcal = P * 4 + Cb * 4 + F * 9;

  // Odds of finishing (same model as the Journey tab)
  const resolved = Array.from({ length: Math.max(0, dn - 1) }, (_, i) => dayResult(days[addDays(START, i)], settings, CATS, RULES).won);
  const post = posterior({ results: resolved, prior: priorOf(settings.oddsP0 / 100, settings.oddsN0) });
  const finish = finishOdds({ ...post, wins: resolved.filter(Boolean).length, day: dn, total: TOTAL_DAYS, delta: settings.oddsDecay / 100, target: settings.oddsTarget / 100 });

  // Last 14 days series
  const series = Array.from({ length: DAYS_SHOWN }, (_, i) => {
    const k = addDays(today, i - (DAYS_SHOWN - 1));
    const d = days[k];
    const w = d?.weight !== '' && d?.weight != null ? +d.weight : null;
    return { k, i, v: d ? workMs(d, CATS) / 3600000 : 0, w, today: k === today, label: fmtDate(k, { day: 'numeric', month: 'short' }) };
  });
  const worked = workMs(day, CATS, running);

  // Countdown + milestones
  const daysLeft = Math.max(0, TOTAL_DAYS - dn);
  const pctDone = Math.round((dn / TOTAL_DAYS) * 100);
  const milestone = inRange && dn % 25 === 0 ? `Milestone: day ${dn}` : inRange && dn === 1 ? 'Day one' : null;

  // Best work day so far (only meaningful once there is something to beat)
  const priorWork = Object.keys(days).filter((k) => k < today && inChallenge(k)).map((k) => workMs(days[k], CATS));
  const bestBefore = priorWork.length ? Math.max(...priorWork) : 0;
  const bestWorkDay = priorWork.length > 0 && worked > 0 && worked >= bestBefore;

  // Tomorrow teaser: only slots you typed yourself (not the suggested defaults)
  const tomorrow = addDays(today, 1);
  const tomorrowItems = planFor(days[tomorrow]).filter((p) => p.id && p.title.trim()).slice(0, 3);

  // Same weekday last week
  const lwKey = addDays(today, -7);
  const lw = days[lwKey] && inChallenge(lwKey) ? days[lwKey] : null;
  const lwResult = lw ? dayResult(lw, settings, CATS, RULES) : null;
  const lwWork = lw ? workMs(lw, CATS) : 0;
  const lwWeight = lw && lw.weight !== '' && lw.weight != null ? +lw.weight : null;
  const delta = (a, b, unit = '', digits = 0) => { const d = a - b; return d === 0 ? 'same' : `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(digits)}${unit}`; };
  const trainedLabels = MUSCLES.filter((m) => (day.trained || []).includes(m.id)).map((m) => m.label);

  return (
    <div className="sh">
      <header className="sh-top">
        <span className="sh-eyebrow">{TOTAL_DAYS} Days Hard Challenge</span>
        <a className="sh-chip" href={IG_URL} target="_blank" rel="noopener noreferrer">{HANDLE}</a>
      </header>

      <section className="sh-hero">
        <h1>
          {today < START ? <>Starts in {diffDays(START, today)}<span> day{diffDays(START, today) === 1 ? '' : 's'}</span></> : <>Day {dn}<span> / {TOTAL_DAYS}</span></>}
        </h1>
        <div className="sh-date">{fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        <div className="sh-progress"><i style={{ width: `${today < START ? 0 : (dn / TOTAL_DAYS) * 100}%` }} /></div>
        <ConsistencyFrame days={days} settings={settings} today={today} compact />
        <div className="sh-count">
          <span>{daysLeft === 0 ? 'Final day' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} to go`}</span>
          <span>{pctDone}% done</span>
          {milestone && <b>{milestone}</b>}
        </div>
        <blockquote>“{quote}”{author && <cite>{author}</cite>}</blockquote>
      </section>

      <section className="sh-card">
        <h2>Today's session</h2>
        <div className="sh-session">{day.workout?.trim() || (trainedLabels.length ? 'Training' : 'No session logged yet')}</div>
        <BodyMap trained={day.trained || []} />
        <div className="sh-tags">{trainedLabels.length ? trainedLabels.map((l) => <span key={l}>{l}</span>) : <em>Body parts hit show up here</em>}</div>
      </section>

      <div className="sh-row">
        <section className="sh-card">
          <h2>Weight</h2>
          <div className="sh-big">{wNow != null ? (+wNow).toFixed(1) : '—'}<small> kg</small></div>
          <div className="sh-sub">{wDelta == null ? 'since day 1: log 2 weigh-ins' : `${wDelta > 0 ? '+' : ''}${wDelta.toFixed(1)} kg since day 1`}</div>
        </section>
        <section className="sh-card">
          <h2>Calories</h2>
          <div className="sh-big">{kcal || '—'}<small> / {settings.calorieTarget}</small></div>
          <div className="sh-bar-track"><i style={{ width: `${Math.min(100, (kcal / settings.calorieTarget) * 100)}%` }} className={kcal > settings.calorieTarget ? 'over' : ''} /></div>
          <div className="sh-sub">Protein {P || '—'} g · target {settings.proteinTarget}</div>
        </section>
      </div>

      <section className="sh-card">
        <h2>Macros</h2>
        <div className="sh-macros" aria-label="Macro split">
          {macroKcal > 0 ? (
            <>
              <i style={{ flex: P * 4 }} className="p" /><i style={{ flex: Cb * 4 }} className="c" /><i style={{ flex: F * 9 }} className="f" />
            </>
          ) : <i style={{ flex: 1 }} className="none" />}
        </div>
        <div className="sh-macro-legend">
          <span><b className="p" />Protein {P} g</span><span><b className="c" />Carbs {Cb} g</span><span><b className="f" />Fat {F} g</span>
        </div>
      </section>

      <div className="sh-tiles">
        <div><b>{result.done}<small>/{RULES.length}</small></b><span>score</span></div>
        <div><b>{fmtHM(worked).replace(' ', '')}</b><span>worked</span></div>
        <div><b>{current}</b><span>streak</span></div>
        <div><b>{Math.round(finish * 100)}%</b><span>finish odds</span></div>
      </div>

      {bestWorkDay && <div className="sh-badge">Best work day so far · {fmtHM(worked)}</div>}

      {lwResult && (
        <section className="sh-card">
          <h2>Vs last {fmtDate(lwKey, { weekday: 'long' })}</h2>
          <div className="sh-vs">
            <div><span>Work</span><b>{fmtHM(worked).replace(' ', '')}</b><em>{fmtHM(lwWork).replace(' ', '')} · {delta(worked / 3600000, lwWork / 3600000, 'h', 1)}</em></div>
            <div><span>Score</span><b>{result.done}/{RULES.length}</b><em>{lwResult.done}/{RULES.length} · {delta(result.done, lwResult.done)}</em></div>
            <div><span>Weight</span><b>{wNow != null ? (+wNow).toFixed(1) : '—'}</b><em>{lwWeight != null ? `${lwWeight.toFixed(1)}${wNow != null ? ` · ${delta(+wNow, lwWeight, ' kg', 1)}` : ''}` : '—'}</em></div>
          </div>
        </section>
      )}

      <section className="sh-card">
        <h2>Hours worked · last {DAYS_SHOWN} days</h2>
        <WorkBars items={series} targetH={settings.workTargetHours} />
      </section>
      <section className="sh-card">
        <h2>Weight trend</h2>
        <WeightLine items={series} />
      </section>

      <section className="sh-cta">
        <div>{today < START ? `Starts ${fmtDate(START, { weekday: 'long', day: 'numeric', month: 'long' })}.` : `Day ${dn} filled. Day ${dn + 1} tomorrow.`}</div>
        {tomorrowItems.length > 0 && (
          <ul className="sh-tmrw" aria-label="Tomorrow's plan">
            {tomorrowItems.map((p) => <li key={p.start}><span>{hhmm(p.start)}</span>{p.title}</li>)}
          </ul>
        )}
        <a className="sh-follow" href={IG_URL} target="_blank" rel="noopener noreferrer">Follow {HANDLE}</a>
        <p>Every day the dashboard starts empty and I fill it in.</p>
      </section>

      <footer className="sh-foot"><a href="/">open tracker</a></footer>
    </div>
  );
}

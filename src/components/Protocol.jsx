import { useState } from 'react';
import { fmtDate } from '../lib.js';
import { XYChart } from './charts.jsx';
import { currentTheme, setTheme } from '../theme.js';
import { drawProgressCard } from '../shareCard.js';

const short = (k) => fmtDate(k, { day: 'numeric', month: 'short' });
const n1 = (v, d = 1) => (v == null ? '–' : v.toFixed(d));
const sgn = (v, d = 1) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(d)}`;

export const Panel = ({ title, sub, right, className = '', children }) => (
  <section className={`dx-card rv ${className}`}>
    {(title || right) && <header><div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>{right}</header>}
    {children}
  </section>
);

// "4 daily goals. No exceptions. Everything public." The promise, visible at the top of the page.
export function RulesStrip({ t, positioning }) {
  const rules = [`${t.steps.toLocaleString('en-IN')} steps`, 'Evening gym', `Calories under ${t.kcal.toLocaleString('en-IN')}`, 'Daily vlog'];
  return (
    <div className="rules">
      <div className="rules-main"><b>The Kaizen Protocol</b><span>4 daily goals · no exceptions · everything public</span></div>
      <ul>{rules.map((r, i) => <li key={r}><i>{i + 1}</i>{r}</li>)}</ul>
      {positioning && <p>{positioning}</p>}
    </div>
  );
}

// Today at a glance: how many of the four goals are done right now.
export function TodayRing({ day, today }) {
  const s = day?.row ? day.st : null; const goals = [['Steps', s?.steps], ['Gym', s?.gym], ['Calories', s?.cal], ['Vlog', s?.vlog]];
  const done = goals.filter(([, v]) => v).length; const R = 26; const C = 2 * Math.PI * R;
  return (
    <div className="today" aria-label={`Today: ${done} of 4 goals done`}>
      <svg viewBox="0 0 64 64" className="today-ring"><circle cx="32" cy="32" r={R} className="rg-track" /><circle cx="32" cy="32" r={R} className="rg-arc" strokeDasharray={`${(done / 4) * C} ${C}`} transform="rotate(-90 32 32)" /><text x="32" y="37" textAnchor="middle" className="rg-pct" style={{ fontSize: 15 }}>{done}/4</text></svg>
      <div className="today-main"><b>{s ? (s.rest ? 'Rest day today' : `Today · ${done} of 4 done`) : 'Today · nothing logged yet'}</b><span>{fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
      <ul>{goals.map(([k, v]) => <li key={k} className={v ? 'on' : ''}><i aria-hidden="true">{v ? '✓' : '○'}</i>{k}</li>)}</ul>
    </div>
  );
}

export function KaizenCard({ days, view, xs, t, onPick, selected }) {
  const scored = days.filter((d) => d.score != null);
  if (!scored.length) return null;
  const last = scored[scored.length - 1]; const last7 = scored.slice(-7); const avg7 = Math.round(last7.reduce((a, d) => a + d.score, 0) / last7.length);
  return (
    <Panel title="Kaizen score" sub="One number per day: 70% goals met, 15% steps, 15% sleep (sleep only counts once tracked)">
      <div className="ks">
        <div className="ks-big"><b>{last.score}</b><small>/ 100</small><span>{short(last.k)}</span></div>
        <div className="ks-big sm"><b>{avg7}</b><small>/ 100</small><span>7-day average</span></div>
      </div>
      <XYChart xs={xs} label="Kaizen score per day" height={190} fmt={(v) => v} onPick={onPick} selected={selected} guide={{ v: 80, name: 'Strong day (80)' }}
        lines={[{ name: 'Kaizen score', values: view.map((d) => d.score), color: 'var(--c1)', dots: true }]}
        tip={(i) => [{ name: 'Score', text: view[i].score != null ? `${view[i].score} / 100` : 'not logged' }]} />
    </Panel>
  );
}

export function ExperimentCard({ results }) {
  if (!results.length) return null;
  const cur = results.find((r) => r.status === 'running') || results.find((r) => r.status === 'upcoming') || results[results.length - 1];
  const verdict = cur.status === 'done' && cur.change != null && cur.baseChange != null
    ? `The scale moved ${sgn(cur.change, 2)} kg this week vs ${sgn(cur.baseChange, 2)} kg the week before: ${cur.better ? 'better' : 'not better'}. One week is one data point, not proof, but it is real data.`
    : cur.status === 'done' ? 'Not enough weigh-ins in the week to call it.' : null;
  return (
    <Panel title="This week's experiment" sub="One variable a week, tested in public" right={<span className={`badge ${cur.status === 'running' ? 'ok' : cur.status === 'done' ? 'warn' : 'rest'}`}>{cur.status === 'running' ? 'Running' : cur.status === 'done' ? 'Finished' : 'Up next'}</span>}>
      <div className="ex">
        <b>{cur.title}</b><p>{cur.question}</p>
        <div className="ex-days" aria-hidden="true">{Array.from({ length: cur.of }, (_, i) => <i key={i} className={i < cur.adherent ? 'on' : ''} />)}</div>
        <span className="ex-meta">{cur.status === 'upcoming' ? `Starts ${fmtDate(cur.start, { weekday: 'long', day: 'numeric', month: 'short' })}` : `${cur.adherent} of ${cur.of} days on protocol · ${short(cur.start)} to ${short(cur.end)}`}</span>
        {verdict && <p className="ex-verdict">{verdict}</p>}
      </div>
      {results.length > 1 && <ul className="ex-hist">{results.filter((r) => r.id !== cur.id).map((r) => <li key={r.id}><span>{r.title}</span><em>{r.status === 'done' && r.change != null ? `${sgn(r.change, 2)} kg` : r.status}</em></li>)}</ul>}
    </Panel>
  );
}

const ICON = { sleep: '☾', steps: '👟', rest: '◌', cal: '🔥', perfect: '✓' };
export function InsightsCard({ ins }) {
  return (
    <Panel title="What the data says" sub={ins.ready ? 'Patterns in my own numbers. Small samples, so read them as hints, not rules.' : 'Unlocks after 14 logged days, so it never presents noise as insight.'}>
      {!ins.ready ? (
        <div className="unlock"><div className="goalbar" role="img" aria-label={`${ins.have} of ${ins.need} days`}><u style={{ width: `${Math.min(100, (ins.have / ins.need) * 100)}%` }} /></div><p className="rule">Day {ins.have} of {ins.need}. Insights appear automatically.</p></div>
      ) : (
        <ul className="insights">{ins.items.map((i) => <li key={i.id}><span className="ic" aria-hidden="true">{ICON[i.icon] || '•'}</span><div><b>{i.title}</b><p>{i.text}</p><em>{i.n}</em></div></li>)}</ul>
      )}
    </Panel>
  );
}

// good: 'down' (lower is better), 'up' (higher is better), null (neutral)
export function WeekCompareCard({ wc }) {
  if (!wc) return null;
  const rows = [['Avg weight', 'weight', 'kg', 1, 'down'], ['Avg steps', 'steps', '', 0, 'up'], ['Avg calories', 'kcal', 'kcal', 0, null], ['Avg sleep', 'sleep', 'h', 1, 'up'], ['Perfect days', 'perfect', '', 0, 'up']];
  return (
    <Panel title="This week vs last week" sub={`Week of ${short(wc.curStart)} (so far) against the week of ${short(wc.prevStart)}`}>
      <table className="wc"><thead><tr><th /><th>Last week</th><th>This week</th><th>Change</th></tr></thead>
        <tbody>{rows.map(([label, k, unit, d, good]) => {
          const a = wc.cur[k]; const b = wc.prev[k]; const has = a != null && b != null; const diff = has ? a - b : null;
          const tone = !has || good == null || Math.abs(diff) < (d ? 0.05 : 0.5) ? '' : (good === 'down' ? diff < 0 : diff > 0) ? 'good' : 'warn';
          const f = (v) => (v == null ? '–' : d ? v.toFixed(d) : Math.round(v).toLocaleString('en-IN'));
          return <tr key={k}><td>{label}</td><td>{f(b)}{b != null && unit ? ` ${unit}` : ''}</td><td>{f(a)}{a != null && unit ? ` ${unit}` : ''}</td><td className={`chg ${tone}`}>{has ? `${diff > 0 ? '▲' : diff < 0 ? '▼' : '='} ${d ? Math.abs(diff).toFixed(d) : Math.round(Math.abs(diff)).toLocaleString('en-IN')}` : '–'}</td></tr>;
        })}</tbody></table>
    </Panel>
  );
}

export function BurnCard({ est, avgKcal, avgSteps, target }) {
  if (!est) return null;
  return (
    <Panel title="Estimated fat loss" sub="An estimate from calories in vs out, not a measurement">
      <div className="ks"><div className="ks-big"><b>{est.deficit > 0 ? '−' : '+'}{Math.abs(est.deficit)}</b><small>kcal / day</small><span>deficit</span></div>
        <div className="ks-big sm"><b>{est.weeklyKg > 0 ? '−' : '+'}{Math.abs(est.weeklyKg).toFixed(2)}</b><small>kg / week</small><span>{`target −${target}`}</span></div></div>
      <p className="rule">Eating about {Math.round(avgKcal).toLocaleString('en-IN')} kcal and burning about {est.tdee.toLocaleString('en-IN')} (base {est.bmr.toLocaleString('en-IN')} + {Math.round(avgSteps).toLocaleString('en-IN')} steps + gym).</p>
    </Panel>
  );
}

export function VlogGallery({ days, handle }) {
  const v = [...days].reverse().filter((d) => d.row?.vlogUrl);
  return (
    <Panel title="Vlogs" sub="Every day's video, one tap away">
      {v.length ? <ul className="vlogs">{v.map((d) => <li key={d.k}><a href={d.row.vlogUrl} target="_blank" rel="noopener noreferrer"><span className="hl-k">{fmtDate(d.k, { weekday: 'short', day: 'numeric', month: 'short' })}</span><b>{d.row.workout || (d.st.rest ? 'Rest day' : 'Daily vlog')}</b><em>Watch on Instagram ↗</em></a></li>)}</ul>
        : <p className="dim">Vlog links show up here once they are added in the sheet (Vlog link column). Until then, watch them on <b>{handle}</b>.</p>}
    </Panel>
  );
}

export function WeeklyReports({ reports }) {
  if (!reports.length) return null;
  return (
    <Panel title="Weekly reports" sub="Written automatically from the sheet every Monday–Sunday">
      <ul className="reports">{reports.map((r) => (
        <li key={r.start}><b>Week of {short(r.start)}{r.open ? ' (in progress)' : ''}</b>
          <span>{r.change != null ? `${sgn(r.change, 2)} kg` : 'no change measured'} · {r.perfect} of {r.days} perfect days{r.steps != null ? ` · ${Math.round(r.steps).toLocaleString('en-IN')} steps a day` : ''}{r.score != null ? ` · score ${Math.round(r.score)}` : ''}</span></li>))}</ul>
    </Panel>
  );
}

export function SheetCheck({ warnings }) {
  return (
    <Panel title="Sheet check (only you see this)" sub="Open the page with ?check to see it. Fix these in the sheet before they confuse visitors.">
      {warnings.length ? <ul className="checks">{warnings.map((w, i) => <li key={i}><b>{short(w.k)}</b>{w.msg}</li>)}</ul> : <p className="dim">All values look sensible.</p>}
    </Panel>
  );
}

export function ThemeToggle() {
  const [v, setV] = useState(currentTheme);
  const flip = () => { const n = v === 'dark' ? 'light' : 'dark'; setTheme(n); setV(n); };
  return <button className="theme" onClick={flip} aria-label={`Switch to ${v === 'dark' ? 'light' : 'dark'} mode`} title="Light / dark">{v === 'dark' ? '☀' : '☾'}</button>;
}

export function ShareButton({ data, className = '' }) {
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('');
  const go = async () => {
    setBusy(true); setMsg('');
    try {
      const blob = await drawProgressCard(data);
      if (!blob) throw new Error('no image');
      const file = new File([blob], `fat-to-fit-day-${data.day}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Fat to Fit' }); } else {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); setMsg('Saved to your downloads');
      }
    } catch (e) { if (e?.name !== 'AbortError') setMsg('Could not create the image'); }
    setBusy(false);
  };
  return <span className={`sharewrap ${className}`}><button className="play" onClick={go} disabled={busy}><span aria-hidden="true">⤓</span><b>{busy ? 'Making…' : 'Share progress card'}</b></button>{msg && <em role="status">{msg}</em>}</span>;
}

export function Dumbbell({ className = '', size = 44 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={`db ${className}`} aria-hidden="true">
      <g className="db-bar"><rect x="17" y="29" width="30" height="6" rx="3" /></g>
      <g className="db-l"><rect x="11" y="19" width="7" height="26" rx="2.5" /><rect x="5" y="24" width="6" height="16" rx="2" /></g>
      <g className="db-r"><rect x="46" y="19" width="7" height="26" rx="2.5" /><rect x="53" y="24" width="6" height="16" rx="2" /></g>
    </svg>
  );
}

// "Fat -> Fit": the whole journey as one bar from the starting weight to the goal weight, with a dumbbell marking where I am.
export function FatToFitTrack({ start, current, goal, perWeek, trend, today }) {
  if (start == null || current == null || !goal || start <= goal) return null;
  const pct = Math.max(0, Math.min(100, ((start - current) / (start - goal)) * 100));
  const togo = Math.max(0, current - goal);
  const eta = (perKg) => { const d = new Date(`${today}T00:00:00`); d.setDate(d.getDate() + Math.ceil((togo / perKg) * 7)); return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const pace = trend && trend.perWeek < -0.05 ? -trend.perWeek : null;
  return (
    <section className="track rv" style={{ '--p': `${pct}%` }} aria-label={`${pct.toFixed(0)}% of the way from ${start} kg to ${goal} kg`}>
      <div className="track-top"><b>Fat <i>→</i> Fit</b><span>{pct.toFixed(1)}% of the way · {togo.toFixed(1)} kg to go</span></div>
      <div className="track-bar"><div className="track-fill" /><div className="track-marker"><Dumbbell size={34} /><em>{current.toFixed(1)}</em></div></div>
      <div className="track-ends"><span>{start.toFixed(1)} kg<small>start</small></span><span>{goal} kg<small>goal</small></span></div>
      <p className="track-eta">{perWeek ? `At −${perWeek} kg a week: about ${eta(perWeek)}.` : ''}{pace ? ` At my recent pace (−${pace.toFixed(2)} kg a week): about ${eta(pace)}.` : ''}</p>
    </section>
  );
}

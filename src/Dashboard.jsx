import { useEffect, useMemo, useRef, useState } from 'react';
import { HANDLE, IG_URL, MUSCLES, TARGETS } from './config.js';
import { addDays, buildFrame, fmtDate, fromKey, todayKey } from './lib.js';
import { aggregates, buildDays, overview, perfectStreaks, weeklyChange } from './analytics.js';
import { journalFromCsv } from './sheet.js';
import BodyMap from './components/BodyMap.jsx';
import ConsistencyFrame from './components/ConsistencyFrame.jsx';
import { Donut, HBars, Legend, Ring, XYChart } from './components/charts.jsx';

const EMPTY = { target: { ...TARGETS }, days: {} };
const sgn = (n, d = 1) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(d)}`;
const short = (k) => fmtDate(k, { day: 'numeric', month: 'short' });
const mmss = (m) => `${Math.floor(m)}:${String(Math.round((m % 1) * 60)).padStart(2, '0')}`;
const RANGES = [[14, '14 days'], [30, '30 days'], [90, '90 days'], [null, 'All time']];

// Sample data for previewing the page (add ?demo to the address). Never shown to visitors by default.
function demoJournal(today) {
  const days = {};
  for (let i = 0; i < 42; i += 1) {
    const k = addDays(today, i - 41); const rest = i % 7 === 6;
    days[k] = {
      w: i % 5 === 3 ? null : +(84 - 0.1 * i - (i % 3) * 0.06).toFixed(1), sleep: +(6 + ((i * 7) % 25) / 10).toFixed(1),
      runKm: rest ? null : i % 11 === 5 ? 6.2 : 10 + (i % 3) * 0.4, runMin: rest ? null : 58 - (i % 4), runDone: rest ? false : i % 11 !== 5, gymDone: true,
      workout: rest ? '' : ['Push', 'Pull', 'Legs'][i % 3], trained: rest ? [] : [['chest', 'shoulders', 'triceps'], ['back', 'biceps'], ['quads', 'hamstrings', 'glutes', 'calves']][i % 3],
      kcal: 1900 + ((i * 53) % 420), p: 150, c: 200, f: 58, rest, vlog: i % 5 !== 4, vlogUrl: '',
    };
  }
  return { target: { ...TARGETS }, days };
}

// The public numbers come from the daily Google Sheet, relayed by /api/sheet. Re-read every minute.
function useSheet() {
  const [s, setS] = useState({ status: 'loading' });
  const load = useRef(() => {});
  useEffect(() => {
    let on = true;
    load.current = () => fetch('/api/sheet', { cache: 'no-store' })
      .then(async (r) => { if (r.status === 501) return { status: 'unlinked' }; if (!r.ok) throw new Error(String(r.status)); return { status: 'ok', journal: journalFromCsv(await r.text()), at: Date.now() }; })
      .then((v) => on && setS(v))
      .catch(() => on && setS((p) => (p.status === 'ok' ? { ...p, stale: true } : { status: 'error' })));
    load.current();
    const id = setInterval(() => load.current(), 60000);
    const vis = () => { if (!document.hidden) load.current(); };
    document.addEventListener('visibilitychange', vis);
    return () => { on = false; clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, []);
  return [s, () => load.current()];
}

const Card = ({ title, sub, className = '', children, right }) => (
  <section className={`dx-card ${className}`}>
    {(title || right) && <header><div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>{right}</header>}
    {children}
  </section>
);

function Kpi({ k, big, unit, note, tone }) {
  return <div className="kpi"><span className="k">{k}</span><div className="v">{big}{unit && <small> {unit}</small>}</div><div className={`n ${tone || ''}`}>{note}</div></div>;
}

function DayStrip({ days, selected, today, onSelect }) {
  const ref = useRef(null);
  useEffect(() => { const el = ref.current?.querySelector('[aria-current="true"]'); if (el) el.scrollIntoView({ inline: 'center', block: 'nearest' }); }, [selected, days.length]);
  const go = (n) => { const i = days.findIndex((d) => d.k === selected); const j = Math.max(0, Math.min(days.length - 1, i + n)); if (days[j]) onSelect(days[j].k); };
  return (
    <nav className="strip" aria-label="Pick a day">
      <button className="arr" onClick={() => go(-1)} aria-label="Previous day">‹</button>
      <div className="strip-scroll" ref={ref} onKeyDown={(e) => { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); }}>
        {days.map((d) => {
          const s = d.st; const lv = !s ? 'none' : s.rest ? 'rest' : s.perfect ? 'perfect' : s.n >= 3 ? 'good' : 'low';
          return (
            <button key={d.k} className={`chip ${lv}`} aria-current={d.k === selected} onClick={() => onSelect(d.k)} title={s ? (s.rest ? 'Rest day' : `${s.n}/4 done`) : 'Not logged'}>
              <span>{d.k === today ? 'Today' : fmtDate(d.k, { weekday: 'short' })}</span>
              <b>{fromKey(d.k).getDate()}</b>
              <em>{fmtDate(d.k, { month: 'short' })}</em>
              <i className="pips" aria-hidden="true">{[s?.run, s?.gym, s?.cal, s?.vlog].map((v, i) => <u key={i} className={v ? 'on' : ''} />)}</i>
            </button>
          );
        })}
      </div>
      <button className="arr" onClick={() => go(1)} aria-label="Next day">›</button>
    </nav>
  );
}

function DayPanel({ d, t, prevW, today }) {
  const row = d.row; const s = d.st;
  const labels = MUSCLES.filter((m) => (row?.trained || []).includes(m.id)).map((m) => m.label);
  const pace = row?.runKm && row?.runMin ? row.runMin / row.runKm : null;
  const macroKcal = row ? (row.p || 0) * 4 + (row.c || 0) * 4 + (row.f || 0) * 9 : 0;
  const head = d.k === today ? 'Today' : fmtDate(d.k, { weekday: 'long' });
  return (
    <Card className="daypanel" title={`${head} · ${fmtDate(d.k, { day: 'numeric', month: 'long', year: 'numeric' })}`}
      right={s && <span className={`badge ${s.rest ? 'rest' : s.perfect ? 'ok' : s.n >= 3 ? 'warn' : 'bad'}`}>{s.rest ? 'Rest day' : s.perfect ? 'Perfect day · 4/4' : `${s.n}/4 done`}</span>}>
      {!row ? <p className="dim">{d.k === today ? 'Nothing logged yet today. This fills in as soon as the sheet is updated.' : 'Nothing was logged for this day.'}</p> : (
        <>
          <div className="dtiles">
            <div className="dt"><span className="k">Weight</span><b>{row.w != null ? row.w.toFixed(1) : '–'}<small> kg</small></b><em>{row.w != null && prevW != null ? `${sgn(row.w - prevW)} kg vs last weigh-in` : row.w != null ? 'First weigh-in' : 'Not weighed'}</em></div>
            <div className={`dt ${row.sleep != null && row.sleep >= t.sleep ? 'done' : ''}`}><span className="k">Sleep</span><b>{row.sleep != null ? row.sleep : '–'}<small> h</small></b><em>{row.sleep == null ? 'Not logged' : row.sleep >= t.sleep ? `Target ${t.sleep} h met` : `${(t.sleep - row.sleep).toFixed(1)} h under target`}</em></div>
            <div className={`dt ${s.run ? 'done' : ''}`}><span className="k">Morning run</span><b>{s.rest ? 'Rest' : row.runKm ? row.runKm : '–'}{!s.rest && row.runKm ? <small> km</small> : null}</b><em>{s.rest ? 'Planned recovery' : row.runKm ? `${s.run ? '✓ target met' : `short of ${t.runKm} km`}${row.runMin ? ` · ${row.runMin} min` : ''}${pace ? ` · ${mmss(pace)} /km` : ''}` : 'No run logged'}</em></div>
            <div className={`dt ${s.gym ? 'done' : ''}`}><span className="k">Evening gym</span><b>{s.rest ? 'Rest' : s.gym ? '✓' : '–'}</b><em>{row.workout || (s.gym && !s.rest ? 'Trained' : s.rest ? 'Planned recovery' : 'No session')}</em></div>
            <div className={`dt ${s.cal ? 'done' : row.kcal > (t.kcal || Infinity) ? 'over' : ''}`}><span className="k">Calories</span><b>{row.kcal ?? '–'}<small> kcal</small></b><em>{row.kcal == null ? 'Not logged' : t.kcal ? `${s.cal ? '✓ within' : 'over'} ${t.kcal}` : ''}</em></div>
            <div className={`dt ${s.vlog ? 'done' : ''}`}><span className="k">Vlog</span><b>{s.vlog ? '✓' : '–'}</b><em>{row.vlogUrl ? <a href={row.vlogUrl} target="_blank" rel="noopener noreferrer">Watch it ↗</a> : s.vlog ? 'Posted' : 'Not posted'}</em></div>
          </div>
          {macroKcal > 0 && (
            <div className="macrobar" aria-label="Macros">
              <div className="mb">{[['p', row.p, 4], ['c', row.c, 4], ['f', row.f, 9]].map(([id, g, m]) => <i key={id} className={id} style={{ flex: (g || 0) * m }} />)}</div>
              <div className="mb-lg"><span><i className="sw box p" />Protein {row.p || 0} g</span><span><i className="sw box c" />Carbs {row.c || 0} g</span><span><i className="sw box f" />Fat {row.f || 0} g</span></div>
            </div>
          )}
          {!s.rest && (
            <div className="bodywrap"><BodyMap trained={row.trained || []} />
              <div className="tags">{labels.length ? labels.map((l) => <span key={l}>{l}</span>) : <em>No body parts recorded</em>}</div></div>
          )}
        </>
      )}
    </Card>
  );
}

export default function Dashboard() {
  const today = todayKey();
  const [sheet, refresh] = useSheet();
  const demo = new URLSearchParams(window.location.search).has('demo');
  const journal = demo ? demoJournal(today) : sheet.status === 'ok' ? sheet.journal : EMPTY;
  const t = journal.target;
  const [range, setRange] = useState(30);
  const [sel, setSel] = useState(null);
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(id); }, []);
  useEffect(() => { document.title = `Weight Loss Journal · Fat to Fit · ${HANDLE}`; }, []);

  const days = useMemo(() => buildDays(journal, today), [journal, today]);
  const view = range ? days.slice(-range) : days;
  const ov = useMemo(() => overview(days, journal), [days, journal]);
  const agAll = useMemo(() => aggregates(days, journal), [days, journal]);
  const ag = useMemo(() => aggregates(days, journal, range), [days, journal, range]);
  const a7 = useMemo(() => aggregates(days, journal, 7), [days, journal]);
  const streak = useMemo(() => perfectStreaks(days, today), [days, today]);
  const weeks = useMemo(() => weeklyChange(days, today), [days, today]);

  const lastLogged = [...days].reverse().find((d) => d.row);
  const selKey = sel && days.some((d) => d.k === sel) ? sel : (lastLogged || days[days.length - 1])?.k;
  const selDay = days.find((d) => d.k === selKey);
  const selIdx = days.findIndex((d) => d.k === selKey);
  const prevW = selDay ? [...days.slice(0, selIdx)].reverse().find((d) => d.w != null)?.w ?? null : null;

  const frame = useMemo(() => {
    if (!days.length) return null;
    const end = addDays(today, 6 - ((fromKey(today).getDay() + 6) % 7));
    const rows = [];
    for (let k = days[0].k, i = 1; k <= end; k = addDays(k, 1), i += 1) { const s = days.find((d) => d.k === k)?.st; rows.push({ date: k, n: i, done: s?.n || 0, level: s?.n || 0, won: !!s?.perfect }); }
    const f = buildFrame(rows, today);
    return { ...f, total: days.length, left: 0 };
  }, [days, today]);

  const xs = view.map((d) => ({ k: d.k, label: short(d.k), full: fmtDate(d.k, { weekday: 'short', day: 'numeric', month: 'short' }) }));
  const rangeLabel = range ? `Last ${range} days` : 'All time';
  const wk = range ? weeks.slice(-Math.max(4, Math.ceil(range / 7))) : weeks;
  const first = days[0]?.k;
  const ago = sheet.at ? Math.max(0, Math.round((Date.now() - sheet.at) / 60000)) : null;
  const trendTone = ov?.trend ? (ov.trend.perWeek <= -t.perWeek + 0.05 ? 'good' : ov.trend.perWeek < 0 ? 'warn' : 'bad') : '';

  return (
    <div className="dx">
      <header className="hero">
        <a className="handle" href={IG_URL} target="_blank" rel="noopener noreferrer">{HANDLE}</a>
        <h1>Weight Loss Journal</h1>
        <p className="subtag"><b>Fat to Fit</b>{` · losing ${t.perWeek} kg every week · every day logged in public`}</p>
        <div className="meta">
          {first ? <span>Journal started {fmtDate(first, { day: 'numeric', month: 'long', year: 'numeric' })} · {days.length} day{days.length === 1 ? '' : 's'} and counting</span> : <span>First entry coming soon</span>}
          {!demo && sheet.status === 'ok' && <span className="live"><i />Live from the daily sheet · {ago === 0 ? 'updated just now' : `updated ${ago} min ago`}{sheet.stale ? ' (couldn’t refresh)' : ''} <button onClick={refresh}>Refresh</button></span>}
        </div>
        {demo && <div className="note">Sample data (preview). Real numbers come from the daily sheet.</div>}
        {!demo && sheet.status === 'error' && <div className="note">Couldn’t load the latest numbers. <button onClick={refresh}>Try again</button></div>}
        {!demo && sheet.status === 'unlinked' && <div className="note">The daily sheet isn’t linked yet.</div>}
      </header>

      {days.length > 0 && <div className="strip-wrap"><DayStrip days={days} selected={selKey} today={today} onSelect={setSel} /></div>}

      {!days.length ? (
        <Card><p className="dim">{sheet.status === 'loading' ? 'Loading the journal…' : 'No entries yet. Once the first day is added to the sheet, everything appears here automatically.'}</p></Card>
      ) : (
        <main>
          <div className="kpis">
            <Kpi k="Weight now" big={ov ? ov.current.toFixed(1) : '–'} unit="kg" note={ov ? `${short(ov.currentDate)} · started ${ov.start.toFixed(1)}` : 'First weigh-in coming'} />
            <Kpi k="Lost so far" big={ov ? sgn(-ov.lost) : '–'} unit="kg" tone={ov && ov.lost > 0 ? 'good' : ''} note={ov ? `${ov.pctOfStart}% of starting weight` : ''} />
            <Kpi k="Weekly trend" big={ov?.trend ? sgn(ov.trend.perWeek, 2) : '–'} unit="kg/wk" tone={trendTone} note={ov?.trend ? `Target −${t.perWeek} · 14-day trend` : 'Needs two weeks of weigh-ins'} />
            <Kpi k="Perfect days" big={agAll.perfect} unit={`of ${agAll.tracked}`} note={`Streak ${streak.cur} · best ${streak.best}`} />
            <Kpi k="Avg sleep" big={a7.sleep.avg ?? '–'} unit="h" tone={a7.sleep.avg != null && a7.sleep.avg >= t.sleep ? 'good' : 'warn'} note={`Last 7 days · target ${t.sleep} h`} />
            <Kpi k="Distance run" big={agAll.run.km} unit="km" note={`${agAll.run.count} runs${agAll.run.pace ? ` · ${mmss(agAll.run.pace)} /km` : ''}`} />
          </div>

          <div className="grid">
            {selDay && <div className="c5"><DayPanel d={selDay} t={t} prevW={prevW} today={today} /></div>}
            <div className="c7 stack">
              <div className="rangebar" role="group" aria-label="Chart range"><span>Trends</span>
                {RANGES.map(([v, l]) => <button key={l} className={range === v ? 'on' : ''} onClick={() => setRange(v)}>{l}</button>)}</div>
              <Card title="Weight" sub={ov ? `${ov.status === 'on pace' ? 'On target pace' : `${Math.abs(ov.diff).toFixed(2)} kg ${ov.status} of the −${t.perWeek} kg/week line`}${ov.in4weeks != null ? ` · trend points to ${ov.in4weeks} kg in 4 weeks` : ''}` : 'Needs a first weigh-in'}>
                <XYChart xs={xs} label={`Weight over ${rangeLabel.toLowerCase()}`} fmt={(v) => v.toFixed(1)} onPick={setSel} selected={selKey}
                  lines={[{ name: 'Weight', values: view.map((d) => d.w), color: 'var(--c1)', dots: true }, { name: '7-day average', values: view.map((d) => d.ma7), color: 'var(--c2)', thin: true }, { name: `Target −${t.perWeek} kg/week`, values: view.map((d) => d.target), color: 'var(--muted)', dash: true }]}
                  tip={(i) => [view[i].w != null && { name: 'Weight', text: `${view[i].w.toFixed(1)} kg`, color: 'var(--c1)' }, view[i].ma7 != null && { name: '7-day avg', text: `${view[i].ma7.toFixed(1)} kg`, color: 'var(--c2)' }, view[i].target != null && { name: 'Target', text: `${view[i].target.toFixed(1)} kg` }].filter(Boolean)} />
              </Card>
              <Card title="Change per week" sub="Kilos gained or lost each Monday–Sunday week; dashed line is the weekly goal">
                <XYChart xs={wk.map((w) => ({ k: w.start, label: short(w.start), full: `Week of ${short(w.start)}` }))} label="Weight change per week" fmt={(v) => sgn(v)} height={190}
                  bars={[{ name: 'Weekly change (kg)', values: wk.map((w) => w.change), color: 'var(--c1)', colorAt: (i) => (wk[i].partial ? 'color-mix(in srgb, var(--c1) 45%, transparent)' : 'var(--c1)') }]}
                  guide={{ v: -t.perWeek, name: `Goal −${t.perWeek} kg` }}
                  tip={(i) => [{ name: 'Change', text: wk[i].change == null ? 'no weigh-in' : `${sgn(wk[i].change, 2)} kg` }, wk[i].partial && { name: 'Status', text: 'week in progress' }].filter(Boolean)} />
              </Card>
            </div>
          </div>

          {frame && <Card title="Consistency" sub="Every square is a day. The darker, the more of the four daily goals were met."><div className="framewrap"><ConsistencyFrame frame={frame} caption="perfect days" maxLabel={4} compact hideLeft /></div>
            <p className="rule">Perfect day = {t.runKm} km morning run + evening gym + calories under {t.kcal} + vlog posted. A planned rest day waives the run and gym.</p></Card>}

          <Card title={`Daily habits · ${rangeLabel.toLowerCase()}`} sub={`Share of ${ag.tracked} logged days where each goal was met`}>
            <div className="rings">
              <Ring pct={ag.hit.run} label="Morning run" sub={`${t.runKm} km`} />
              <Ring pct={ag.hit.gym} label="Evening gym" sub="session done" />
              <Ring pct={ag.hit.cal} label="Calories" sub={`under ${t.kcal}`} />
              <Ring pct={ag.hit.vlog} label="Vlog" sub="posted" />
              <Ring pct={ag.hit.sleep} label="Sleep" sub={`${t.sleep} h+`} />
            </div>
          </Card>

          <div className="grid">
            <div className="c6"><Card title="Sleep" sub={`Hours per night · ${rangeLabel.toLowerCase()}${ag.sleep.avg != null ? ` · average ${ag.sleep.avg} h` : ''}`}>
              <XYChart xs={xs} label="Hours of sleep per night" fmt={(v) => v} height={220} onPick={setSel} selected={selKey}
                bars={[{ name: 'Sleep (h)', values: view.map((d) => d.row?.sleep ?? null), color: 'var(--c1)', colorAt: (i) => (view[i].row?.sleep != null && view[i].row.sleep < t.sleep ? 'color-mix(in srgb, var(--c1) 50%, transparent)' : 'var(--c1)') }]}
                guide={{ v: t.sleep, name: `Target ${t.sleep} h` }}
                tip={(i) => [{ name: 'Sleep', text: view[i].row?.sleep != null ? `${view[i].row.sleep} h` : 'not logged' }]} />
              <p className="rule">Lighter bars = under the {t.sleep} h target.</p>
            </Card></div>
            <div className="c3"><Card title="Sleep spread" sub={`${ag.sleep.n} nights`}>
              <Donut label="Nights by hours of sleep" center={ag.sleep.avg ?? '–'} sub="avg hours" parts={[
                { name: 'Under 6 h', value: ag.sleep.buckets.under6, color: 'var(--bad)' }, { name: '6–7 h', value: ag.sleep.buckets.s6to7, color: 'var(--warn)' },
                { name: '7–8 h', value: ag.sleep.buckets.s7to8, color: 'var(--ok)' }, { name: '8 h+', value: ag.sleep.buckets.over8, color: 'var(--c1)' }]} />
            </Card></div>
            <div className="c3"><Card title="Day outcomes" sub={`${ag.tracked} logged days`}>
              <Donut label="Days by how many goals were met" center={ag.perfect} sub="perfect days" parts={[
                { name: 'Perfect (4/4)', value: ag.outcome.perfect, color: 'var(--ok)' }, { name: '3 of 4', value: ag.outcome.three, color: 'var(--c1)' },
                { name: '2 or fewer', value: ag.outcome.low, color: 'var(--warn)' }, { name: 'Rest days', value: ag.outcome.rest, color: 'var(--faint)' }]} />
            </Card></div>
          </div>

          <div className="grid">
            <div className="c6"><Card title="Calories" sub={`${rangeLabel}${ag.calories.avg != null ? ` · average ${ag.calories.avg} kcal` : ''}${ag.calories.overDays ? ` · ${ag.calories.overDays} day${ag.calories.overDays === 1 ? '' : 's'} over` : ''}`}>
              <XYChart xs={xs} label="Calories per day" height={220} fmt={(v) => v} onPick={setSel} selected={selKey}
                bars={[{ name: 'Within target', values: view.map((d) => d.row?.kcal ?? null), color: 'var(--c1)', colorAt: (i) => (view[i].row?.kcal > t.kcal ? 'var(--warn)' : 'var(--c1)') }]}
                guide={{ v: t.kcal, name: `Target ${t.kcal} kcal` }}
                tip={(i) => [{ name: 'Calories', text: view[i].row?.kcal != null ? `${view[i].row.kcal} kcal` : 'not logged' }, view[i].row?.p != null && { name: 'Protein', text: `${view[i].row.p} g` }].filter(Boolean)} />
              <Legend items={[{ name: 'Over target', color: 'var(--warn)' }]} />
            </Card></div>
            <div className="c3"><Card title="Macros" sub="Share of calories">
              {ag.macros.share ? <Donut label="Macro split by calories" center={`${Math.round(ag.macros.grams.p)} g`} sub="protein / day" parts={[
                { name: 'Protein', value: ag.macros.share.p, text: `${Math.round(ag.macros.grams.p)} g`, color: 'var(--c1)' }, { name: 'Carbs', value: ag.macros.share.c, text: `${Math.round(ag.macros.grams.c)} g`, color: 'var(--c2)' },
                { name: 'Fat', value: ag.macros.share.f, text: `${Math.round(ag.macros.grams.f)} g`, color: 'var(--c3)' }]} /> : <p className="dim">Add protein, carbs and fat in the sheet to see this.</p>}
            </Card></div>
            <div className="c3"><Card title="Body parts hit" sub={rangeLabel}>
              <HBars items={MUSCLES.map((m) => ({ name: m.label, value: ag.parts[m.id] || 0 })).sort((a, b) => b.value - a.value)} />
            </Card></div>
          </div>

          <div className="grid">
            <div className="c6"><Card title="Running" sub={`Distance per day · ${ag.run.count} runs · ${ag.run.km} km${ag.run.best ? ` · best ${ag.run.best} km` : ''}`}>
              <XYChart xs={xs} label="Run distance per day" height={210} fmt={(v) => v} onPick={setSel} selected={selKey}
                bars={[{ name: 'Distance (km)', values: view.map((d) => d.row?.runKm ?? null), color: 'var(--c1)', colorAt: (i) => (view[i].row?.runKm >= t.runKm ? 'var(--c1)' : 'color-mix(in srgb, var(--c1) 50%, transparent)') }]}
                guide={{ v: t.runKm, name: `Target ${t.runKm} km` }}
                tip={(i) => [{ name: 'Distance', text: view[i].row?.runKm != null ? `${view[i].row.runKm} km` : 'no run' }, view[i].row?.runKm && view[i].row?.runMin && { name: 'Pace', text: `${mmss(view[i].row.runMin / view[i].row.runKm)} /km` }].filter(Boolean)} />
            </Card></div>
            <div className="c6"><Card title="Pace" sub="Minutes per kilometre on run days; lower is faster">
              <XYChart xs={xs} label="Running pace per kilometre" height={210} fmt={(v) => mmss(v)} onPick={setSel} selected={selKey}
                lines={[{ name: 'Pace (min/km)', values: view.map((d) => (d.row?.runKm && d.row?.runMin ? +(d.row.runMin / d.row.runKm).toFixed(2) : null)), color: 'var(--c1)', dots: true }]}
                tip={(i) => [{ name: 'Pace', text: view[i].row?.runKm && view[i].row?.runMin ? `${mmss(view[i].row.runMin / view[i].row.runKm)} /km` : 'no timed run' }]} />
            </Card></div>
          </div>

          <div className="grid">
            <div className="c5"><Card title="What I track" sub="Everything below is filled in daily from one sheet">
              <ul className="track">
                <li><b>Weight</b>morning weigh-in, 7-day average, pace vs −{t.perWeek} kg/week</li>
                <li><b>Morning run</b>{t.runKm} km a day: distance, time and pace</li>
                <li><b>Evening gym</b>session and the body parts trained</li>
                <li><b>Calories & macros</b>under {t.kcal} kcal, protein / carbs / fat</li>
                <li><b>Sleep</b>hours per night, target {t.sleep} h</li>
                <li><b>Daily vlog</b>posted on Instagram, with the link</li>
                <li><b>Rest days</b>planned recovery waives the run and gym</li>
              </ul>
            </Card></div>
            <div className="c7"><Card title="Journal" sub="Every day, newest first. Tap a row to open it above.">
              <div className="tablewrap"><table>
                <thead><tr><th>Date</th><th>Weight</th><th>Sleep</th><th>Run</th><th>Gym</th><th>kcal</th><th>Vlog</th><th>Score</th></tr></thead>
                <tbody>{[...days].reverse().map((d) => { const r = d.row; const s = d.st; return (
                  <tr key={d.k} className={d.k === selKey ? 'sel' : ''} onClick={() => { setSel(d.k); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                    <td>{fmtDate(d.k, { weekday: 'short', day: 'numeric', month: 'short' })}</td><td>{r?.w != null ? r.w.toFixed(1) : '–'}</td><td>{r?.sleep ?? '–'}</td>
                    <td>{s?.rest ? 'Rest' : r?.runKm ?? '–'}</td><td>{s ? (s.rest ? 'Rest' : s.gym ? '✓' : '–') : '–'}</td><td>{r?.kcal ?? '–'}</td><td>{s ? (s.vlog ? '✓' : '–') : '–'}</td>
                    <td>{s ? <span className={`sc ${s.perfect ? 'ok' : s.rest ? 'rest' : ''}`}>{s.rest ? 'Rest' : `${s.n}/4`}</span> : '–'}</td>
                  </tr>); })}</tbody>
              </table></div>
            </Card></div>
          </div>
        </main>
      )}

      <section className="cta">
        <div>Follow the journey</div>
        <a href={IG_URL} target="_blank" rel="noopener noreferrer">Follow {HANDLE}</a>
        <p>A new vlog and an updated dashboard every single day.</p>
      </section>
    </div>
  );
}

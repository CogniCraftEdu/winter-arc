import { useEffect, useMemo, useRef, useState } from 'react';
import { HANDLE, IG_URL, MUSCLES, TARGETS } from './config.js';
import { addDays, buildFrame, fmtDate, fromKey, todayKey } from './lib.js';
import { aggregates, buildDays, highlights, milestones, overview, perfectStreaks, weeklyChange } from './analytics.js';
import { journalFromCsv } from './sheet.js';
import BodyMap from './components/BodyMap.jsx';
import ConsistencyFrame from './components/ConsistencyFrame.jsx';
import { Donut, HBars, Legend, Ring, XYChart } from './components/charts.jsx';

const EMPTY = { target: { ...TARGETS }, days: {} };
const sgn = (n, d = 1) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(d)}`;
const short = (k) => fmtDate(k, { day: 'numeric', month: 'short' });
const RANGES = [[14, '14 days'], [30, '30 days'], [90, '90 days'], [null, 'All time']];

// Sample data for previewing the page (add ?demo to the address). Never shown to visitors by default.
function demoJournal(today) {
  const days = {};
  for (let i = 0; i < 42; i += 1) {
    const k = addDays(today, i - 41); const rest = i % 7 === 6;
    days[k] = {
      w: i % 5 === 3 ? null : +(84 - 0.1 * i - (i % 3) * 0.06).toFixed(1), sleep: +(6 + ((i * 7) % 25) / 10).toFixed(1),
      steps: rest ? null : i % 11 === 5 ? 6200 : 10000 + (i % 4) * 650, stepsDone: rest ? false : i % 11 !== 5, gymDone: true,
      workout: rest ? '' : ['Push', 'Pull', 'Legs'][i % 3], trained: rest ? [] : [['chest', 'shoulders', 'triceps'], ['back', 'biceps'], ['quads', 'hamstrings', 'glutes', 'calves']][i % 3],
      kcal: 1900 + ((i * 53) % 420), p: 150, c: 200, f: 58, rest, vlog: i % 5 !== 4, vlogUrl: '',
    };
  }
  return { target: { ...TARGETS }, days };
}

// The public numbers come from the daily Google Sheet, relayed by /api/sheet. Re-read every minute.
// The last good copy is kept in this browser, so a Google or network hiccup never blanks the page.
const CACHE = 'f2f:sheet:v1';
const readCache = () => { try { const c = JSON.parse(localStorage.getItem(CACHE) || 'null'); return c && typeof c.csv === 'string' ? c : null; } catch { return null; } };
function useSheet() {
  const [s, setS] = useState({ status: 'loading' });
  const load = useRef(() => {});
  useEffect(() => {
    let on = true;
    const fromCache = () => { const c = readCache(); return c ? { status: 'ok', journal: journalFromCsv(c.csv), at: c.at, stale: true } : null; };
    load.current = () => fetch('/api/sheet', { cache: 'no-store' })
      .then(async (r) => {
        if (r.status === 501) return { status: 'unlinked' };
        if (!r.ok) throw new Error(String(r.status));
        const csv = await r.text(); const at = Date.now();
        const journal = journalFromCsv(csv);
        try { localStorage.setItem(CACHE, JSON.stringify({ csv, at })); } catch { /* private mode: the page still works */ }
        return { status: 'ok', journal, at };
      })
      .then((v) => on && setS(v))
      .catch(() => on && setS((p) => (p.status === 'ok' ? { ...p, stale: true } : fromCache() || { status: 'error' })));
    load.current();
    const id = setInterval(() => load.current(), 60000);
    const vis = () => { if (!document.hidden) load.current(); };
    document.addEventListener('visibilitychange', vis);
    return () => { on = false; clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, []);
  return [s, () => load.current()];
}

const reduced = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };

// Welcome screen: shown once per browser session, tap to skip. Skipped entirely for reduced-motion visitors.
function Intro() {
  const [on, setOn] = useState(() => { try { return !reduced() && !sessionStorage.getItem('f2f:intro'); } catch { return false; } });
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (!on) return undefined;
    try { sessionStorage.setItem('f2f:intro', '1'); } catch { /* ignore */ }
    const a = setTimeout(() => setLeaving(true), 2300); const b = setTimeout(() => setOn(false), 3100);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [on]);
  if (!on) return null;
  return (
    <div className={`intro ${leaving ? 'out' : ''}`} onClick={() => { setLeaving(true); setTimeout(() => setOn(false), 700); }} role="presentation">
      <div className="intro-in">
        <span className="i1" lang="ja">改善</span>
        <span className="i2">Kaizen</span>
        <span className="i3">1% better, every single day</span>
        <span className="i4">Weight Loss Journal · @whey.to.lift</span>
      </div>
    </div>
  );
}

// Counts up to its value when it first appears, and glides to the new value when the sheet changes.
function Num({ v, d = 0, sign = false, loc = false, delay = 0 }) {
  const [shown, setShown] = useState(() => (reduced() ? v : 0));
  const from = useRef(reduced() ? v : 0);
  useEffect(() => {
    if (reduced()) { setShown(v); return undefined; }
    let raf; let t0 = null; const start = from.current; const ms = 1100;
    const run = (now) => {
      if (t0 == null) t0 = now;
      const k = Math.min(1, (now - t0) / ms); const e = 1 - (1 - k) ** 3;
      setShown(start + (v - start) * e);
      if (k < 1) raf = requestAnimationFrame(run); else from.current = v;
    };
    const t = setTimeout(() => { raf = requestAnimationFrame(run); }, delay);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); from.current = v; };
  }, [v, delay]);
  const txt = loc ? Math.round(Math.abs(shown)).toLocaleString('en-IN') : Math.abs(shown).toFixed(d);
  const sg = sign ? (v > 0 ? '+' : v < 0 ? '−' : '') : (v < 0 ? '−' : '');
  return <span>{sg}{txt}</span>;
}

// Cards fade and rise as they scroll into view. One observer lives for the whole page and picks up cards that mount later
// (new data, a different range), so nothing can stay hidden.
function useReveal() {
  const io = useRef(null);
  const seen = useRef(new WeakSet());
  useEffect(() => {
    const plain = reduced() || typeof IntersectionObserver === 'undefined';
    if (!plain && !io.current) io.current = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.current.unobserve(en.target); } }), { threshold: 0.08 });
    document.querySelectorAll('.dx .rv:not(.in)').forEach((el) => {
      if (plain) { el.classList.add('in'); return; }
      if (!seen.current.has(el)) { seen.current.add(el); io.current.observe(el); }
    });
  });
  useEffect(() => () => io.current?.disconnect(), []);
}

const Card = ({ title, sub, className = '', children, right, reveal = true }) => (
  <section className={`dx-card ${reveal ? 'rv' : ''} ${className}`}>
    {(title || right) && <header><div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>{right}</header>}
    {children}
  </section>
);

function Kpi({ k, big, unit, note, tone }) {
  return <div className="kpi rv"><span className="k">{k}</span><div className="v">{big}{unit && <small> {unit}</small>}</div><div className={`n ${tone || ''}`}>{note}</div></div>;
}

function DayStrip({ days, selected, today, onSelect, playing, onPlay, canPlay }) {
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
              <i className="pips" aria-hidden="true">{[s?.steps, s?.gym, s?.cal, s?.vlog].map((v, i) => <u key={i} className={v ? 'on' : ''} />)}</i>
            </button>
          );
        })}
      </div>
      <button className="arr" onClick={() => go(1)} aria-label="Next day">›</button>
      {canPlay && <button className={`play ${playing ? 'on' : ''}`} onClick={onPlay} aria-pressed={playing}><span aria-hidden="true">{playing ? '■' : '▶'}</span><b>{playing ? 'Stop' : 'Play highlights'}</b></button>}
    </nav>
  );
}

function DayPanel({ d, t, prevW, today, dayNo }) {
  const row = d.row; const s = d.st;
  const labels = MUSCLES.filter((m) => (row?.trained || []).includes(m.id)).map((m) => m.label);
  const macroKcal = row ? (row.p || 0) * 4 + (row.c || 0) * 4 + (row.f || 0) * 9 : 0;
  const head = d.k === today ? 'Today' : fmtDate(d.k, { weekday: 'long' });
  return (
    <Card className="daypanel" reveal={false} title={`Day ${dayNo} · ${head} · ${fmtDate(d.k, { day: 'numeric', month: 'long' })}`}
      right={s && <span className={`badge ${s.rest ? 'rest' : s.perfect ? 'ok' : s.n >= 3 ? 'warn' : 'bad'}`}>{s.rest ? 'Rest day' : s.perfect ? 'Perfect day · 4/4' : `${s.n}/4 done`}</span>}>
      {!row ? <p className="dim">{d.k === today ? 'Nothing logged yet today. This fills in as soon as the sheet is updated.' : 'Nothing was logged for this day.'}</p> : (
        <>
          <div className="dtiles">
            <div className="dt"><span className="k">Weight</span><b>{row.w != null ? row.w.toFixed(1) : '–'}<small> kg</small></b><em>{row.w != null && prevW != null ? `${sgn(row.w - prevW)} kg vs last weigh-in` : row.w != null ? 'First weigh-in' : 'Not weighed'}</em></div>
            <div className={`dt ${row.sleep != null && row.sleep >= t.sleep ? 'done' : ''}`}><span className="k">Sleep</span><b>{row.sleep != null ? row.sleep : '–'}<small> h</small></b><em>{row.sleep == null ? 'Not logged' : row.sleep >= t.sleep ? `Target ${t.sleep} h met` : `${(t.sleep - row.sleep).toFixed(1)} h under target`}</em></div>
            <div className={`dt ${s.steps ? 'done' : ''}`}><span className="k">Steps</span><b>{s.rest ? 'Rest' : row.steps ? row.steps.toLocaleString('en-IN') : '–'}</b><em>{s.rest ? 'Planned recovery' : row.steps ? (s.steps ? `✓ ${t.steps.toLocaleString('en-IN')} goal met` : `${(t.steps - row.steps).toLocaleString('en-IN')} short of ${t.steps.toLocaleString('en-IN')}`) : 'No steps logged'}</em></div>
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
  const [story, setStory] = useState(null); // { i, paused } while the highlight reel plays
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
  const ms = useMemo(() => milestones(days, journal), [days, journal]);

  const lastLogged = [...days].reverse().find((d) => d.row);
  const selKey = sel && days.some((d) => d.k === sel) ? sel : (lastLogged || days[days.length - 1])?.k;
  const selDay = days.find((d) => d.k === selKey);
  const selIdx = days.findIndex((d) => d.k === selKey);
  const hl = useMemo(() => highlights(days, journal, today), [days, journal, today]);
  const startStory = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setStory({ i: 0, paused: false }); };
  const goStory = (i) => setStory((st) => (st ? { ...st, i: Math.max(0, Math.min(hl.length - 1, i)) } : st));
  useEffect(() => {
    if (!story || !hl[story.i]) return undefined;
    setSel(hl[story.i].date);
    if (story.paused) return undefined;
    const id = setTimeout(() => (story.i + 1 >= hl.length ? setStory({ i: story.i, paused: true, done: true }) : setStory({ i: story.i + 1, paused: false })), 4200);
    return () => clearTimeout(id);
  }, [story?.i, story?.paused, hl]); // eslint-disable-line react-hooks/exhaustive-deps
  useReveal();
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
  const wkSteps = useMemo(() => { const m = new Map(); for (const d of days) { if (d.row?.steps == null) continue; const st = addDays(d.k, -((fromKey(d.k).getDay() + 6) % 7)); const e = m.get(st) || { start: st, total: 0, n: 0 }; e.total += d.row.steps; e.n += 1; m.set(st, e); } const all = [...m.values()]; return range ? all.slice(-Math.max(4, Math.ceil(range / 7))) : all; }, [days, range]);
  const wk = range ? weeks.slice(-Math.max(4, Math.ceil(range / 7))) : weeks;
  const first = days[0]?.k;
  const ago = sheet.at ? Math.max(0, Math.round((Date.now() - sheet.at) / 60000)) : null;
  const trendTone = ov?.trend ? (ov.trend.perWeek <= -t.perWeek + 0.05 ? 'good' : ov.trend.perWeek < 0 ? 'warn' : 'bad') : '';

  return (
    <div className="dx">
      <Intro />
      <header className="hero">
        <a className="handle" href={IG_URL} target="_blank" rel="noopener noreferrer">{HANDLE}</a>
        <h1>Weight Loss Journal</h1>
        <p className="kaizen"><span lang="ja">改善</span> Kaizen · 1% better, every single day</p>
        <p className="subtag"><b>Fat to Fit</b>{` · losing ${t.perWeek} kg every week · every day logged in public`}</p>
        <div className="meta">
          {first ? <span>Journal started {fmtDate(first, { day: 'numeric', month: 'long', year: 'numeric' })} · {days.length} day{days.length === 1 ? '' : 's'} and counting</span> : <span>First entry coming soon</span>}
          {!demo && sheet.status === 'ok' && <span className={`live ${sheet.stale ? 'stale' : ''}`}><i />{sheet.stale ? `Showing the last saved copy · ${ago < 60 ? `${ago} min` : ago < 1440 ? `${Math.round(ago / 60)} h` : `${Math.round(ago / 1440)} d`} old · reconnecting` : `Live from the daily sheet · ${ago === 0 ? 'updated just now' : `updated ${ago} min ago`}`} <button onClick={refresh}>Refresh</button></span>}
        </div>
        {demo && <div className="note">Sample data (preview). Real numbers come from the daily sheet.</div>}
        {!demo && sheet.status === 'error' && <div className="note">Couldn’t load the latest numbers. <button onClick={refresh}>Try again</button></div>}
        {!demo && sheet.status === 'unlinked' && <div className="note">The daily sheet isn’t linked yet.</div>}
      </header>

      {days.length > 0 && <div className="strip-wrap"><DayStrip days={days} selected={selKey} today={today} onSelect={(k) => { setStory(null); setSel(k); }} playing={!!story} onPlay={() => (story ? setStory(null) : startStory())} canPlay={hl.length > 2} /></div>}

      {!days.length ? (
        <Card><p className="dim">{sheet.status === 'loading' ? 'Loading the journal…' : 'No entries yet. Once the first day is added to the sheet, everything appears here automatically.'}</p></Card>
      ) : (
        <main>
          <div className="kpis">
            <Kpi k="Weight now" big={ov ? <Num v={ov.current} d={1} delay={600} /> : '–'} unit="kg" note={ov ? `${short(ov.currentDate)} · started ${ov.start.toFixed(1)}` : 'First weigh-in coming'} />
            <Kpi k="Lost so far" big={ov ? <Num v={-ov.lost} d={1} sign delay={700} /> : '–'} unit="kg" tone={ov && ov.lost > 0 ? 'good' : ''} note={ov ? `${ov.pctOfStart}% of starting weight` : ''} />
            <Kpi k="Weekly trend" big={ov?.trend ? <Num v={ov.trend.perWeek} d={2} sign delay={800} /> : '–'} unit="kg/wk" tone={trendTone} note={ov?.trend ? `Target −${t.perWeek} · 14-day trend` : 'Needs two weeks of weigh-ins'} />
            <Kpi k="Perfect days" big={<Num v={agAll.perfect} delay={900} />} unit={`of ${agAll.tracked}`} note={`Streak ${streak.cur} · best ${streak.best}`} />
            <Kpi k="Avg sleep" big={a7.sleep.avg ?? '–'} unit={a7.sleep.avg != null ? 'h' : ''} tone={a7.sleep.avg != null && a7.sleep.avg >= t.sleep ? 'good' : a7.sleep.avg != null ? 'warn' : ''} note={a7.sleep.avg != null ? `Last 7 days · target ${t.sleep} h` : 'Not tracked yet · add Sleep (hrs) in the sheet'} />
            <Kpi k="Steps" big={agAll.steps.avg != null ? <Num v={agAll.steps.avg} loc delay={1000} /> : '–'} unit="/ day" note={`${agAll.steps.total.toLocaleString('en-IN')} total · goal ${t.steps.toLocaleString('en-IN')}`} />
          </div>

          <div className="grid">
            {selDay && <div className="c5" key={selDay.k}><DayPanel d={selDay} t={t} prevW={prevW} today={today} dayNo={selIdx + 1} /></div>}
            <div className="c7 stack">
              <div className="rangebar" role="group" aria-label="Chart range"><span>Trends</span>
                {RANGES.map(([v, l]) => <button key={l} className={range === v ? 'on' : ''} onClick={() => setRange(v)}>{l}</button>)}</div>
              <Card title="Weight" sub={ov ? `${ov.status === 'on pace' ? 'On target pace' : `${Math.abs(ov.diff).toFixed(2)} kg ${ov.status} of the −${t.perWeek} kg/week line`}${ov.in4weeks != null ? ` · trend points to ${ov.in4weeks} kg in 4 weeks` : ''}` : 'Needs a first weigh-in'}>
                <XYChart xs={xs} label={`Weight over ${rangeLabel.toLowerCase()}`} fmt={(v) => v.toFixed(1)} onPick={setSel} selected={selKey}
                  lines={[{ name: 'Weight', values: view.map((d) => d.w), color: 'var(--c1)', dots: true }, { name: '7-day average', values: view.map((d) => d.ma7), color: 'var(--c2)', thin: true }, { name: `Target −${t.perWeek} kg/week`, values: view.map((d) => d.target), color: 'var(--muted)', dash: true }]}
                  tip={(i) => [view[i].w != null && { name: 'Weight', text: `${view[i].w.toFixed(1)} kg`, color: 'var(--c1)' }, view[i].ma7 != null && { name: '7-day avg', text: `${view[i].ma7.toFixed(1)} kg`, color: 'var(--c2)' }, view[i].target != null && { name: 'Target', text: `${view[i].target.toFixed(1)} kg` }].filter(Boolean)} />
              </Card>
              <Card title="Change per week" sub="Kilos gained or lost each Monday–Sunday week. Faded bars are weeks still in progress; the dashed line is the weekly goal">
                <XYChart xs={wk.map((w) => ({ k: w.start, label: short(w.start), full: `Week of ${short(w.start)}` }))} label="Weight change per week" fmt={(v) => sgn(v)} height={190}
                  bars={[{ name: 'Weekly change (kg)', values: wk.map((w) => w.change), color: 'var(--c1)', colorAt: (i) => (wk[i].partial ? 'color-mix(in srgb, var(--c1) 45%, transparent)' : 'var(--c1)') }]}
                  guide={{ v: -t.perWeek, name: `Goal −${t.perWeek} kg` }}
                  tip={(i) => [{ name: 'Change', text: wk[i].change == null ? 'no weigh-in' : `${sgn(wk[i].change, 2)} kg` }, wk[i].partial && { name: 'Status', text: 'week in progress' }].filter(Boolean)} />
              </Card>
            </div>
          </div>

          {hl.length > 2 && (
            <Card className="hlcard" title="Key moments" sub="The days that mattered, found automatically from the sheet. Tap one to open that day."
              right={<button className="play solid" onClick={startStory}><span aria-hidden="true">▶</span><b>Play highlights</b></button>}>
              <ul className="hl">{hl.map((e, i) => (
                <li key={e.id}><button className={`hl-item ${e.tone}`} onClick={() => { setStory(null); setSel(e.date); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  <span className="hl-k">{e.kind} · {short(e.date)}</span><b>{e.title}</b><em>{e.detail}</em></button></li>))}</ul>
            </Card>
          )}

          <div className="grid">
            <div className="c5"><Card title="Before & after" sub={ov ? `Since ${fmtDate(ov.startDate, { day: 'numeric', month: 'long' })}` : 'Needs a first weigh-in'}>
              {ov ? (
                <>
                  <div className="ba"><div><span className="k">Start</span><b>{ov.start.toFixed(1)}<small> kg</small></b></div><i aria-hidden="true">→</i><div><span className="k">Now</span><b>{ov.current.toFixed(1)}<small> kg</small></b></div><div className="lost"><span className="k">Change</span><b>{sgn(-ov.lost)}<small> kg</small></b></div></div>
                  {t.goalWeight ? (() => { const pct = Math.max(0, Math.min(100, ((ov.start - ov.current) / (ov.start - t.goalWeight)) * 100)); return (<><div className="goalbar" role="img" aria-label={`${Math.round(pct)}% of the way to ${t.goalWeight} kg`}><u style={{ width: `${pct}%` }} /></div><p className="rule">{Math.round(pct)}% of the way to {t.goalWeight} kg · {(ov.current - t.goalWeight).toFixed(1)} kg to go{ov.trend && ov.trend.perWeek < 0 ? ` · about ${Math.ceil((ov.current - t.goalWeight) / -ov.trend.perWeek)} weeks at this pace` : ''}</p></>); })() : ov.in4weeks != null && <p className="rule">At the current 14-day trend: about {ov.in4weeks} kg in four weeks.</p>}
                </>
              ) : <p className="dim">Appears after the first weigh-in.</p>}
            </Card></div>
            <div className="c7"><Card title="Milestones" sub={`${ms.earned.length} earned · each with the day it was reached`}>
              {ms.earned.length ? <ul className="badges">{ms.earned.slice(0, 8).map((e) => <li key={`${e.cat}${e.n}`}><b>{e.title}</b><span>{fmtDate(e.date, { day: 'numeric', month: 'short' })}</span></li>)}</ul> : <p className="dim">The first badge lands soon.</p>}
              <h3 className="nexth">Up next</h3>
              <ul className="nextlist">{ms.next.map((n) => <li key={n.cat}><span>{n.title}</span><i><u style={{ width: `${Math.min(100, (n.have / n.n) * 100)}%` }} /></i><em>{n.cat === 'steps' ? `${Math.round(n.have / 1000)}k / ${n.n / 1000}k` : `${n.have} / ${n.n}`}</em></li>)}</ul>
            </Card></div>
          </div>

          {frame && <Card title="Consistency" sub="Every square is a day. The darker, the more of the four daily goals were met."><div className="framewrap"><ConsistencyFrame frame={frame} caption="perfect days" maxLabel={4} compact hideLeft /></div>
            <p className="rule">Perfect day = {t.steps.toLocaleString('en-IN')} steps + evening gym + calories under {t.kcal} + vlog posted. A planned rest day waives the steps goal and gym.</p></Card>}

          <Card title={`Daily habits · ${rangeLabel.toLowerCase()}`} sub={`Share of ${ag.tracked} logged days where each goal was met`}>
            <div className="rings">
              <Ring pct={ag.hit.steps} label="Steps" sub={`${t.steps / 1000}k a day`} />
              <Ring pct={ag.hit.gym} label="Evening gym" sub="session done" />
              <Ring pct={ag.hit.cal} label="Calories" sub={`under ${t.kcal}`} />
              <Ring pct={ag.hit.vlog} label="Vlog" sub="posted" />
              <Ring pct={ag.hit.sleep} label="Sleep" sub={ag.hit.sleep == null ? 'not tracked yet' : `${t.sleep} h+`} />
            </div>
          </Card>

          <div className="grid">
            <div className="c6"><Card title="Sleep" sub={`Hours per night · ${rangeLabel.toLowerCase()}${ag.sleep.avg != null ? ` · average ${ag.sleep.avg} h` : ''}`}>
              <XYChart xs={xs} label="Hours of sleep per night" fmt={(v) => v} height={220} onPick={setSel} selected={selKey} empty="Sleep isn’t tracked yet. Add Sleep (hrs) in the daily sheet and this chart fills in."
                bars={[{ name: 'Sleep (h)', values: view.map((d) => d.row?.sleep ?? null), color: 'var(--c1)', colorAt: (i) => (view[i].row?.sleep != null && view[i].row.sleep < t.sleep ? 'color-mix(in srgb, var(--c1) 50%, transparent)' : 'var(--c1)') }]}
                guide={{ v: t.sleep, name: `Target ${t.sleep} h` }}
                tip={(i) => [{ name: 'Sleep', text: view[i].row?.sleep != null ? `${view[i].row.sleep} h` : 'not logged' }]} />
              <p className="rule">Lighter bars = under the {t.sleep} h target.</p>
            </Card></div>
            <div className="c3"><Card title="Sleep spread" sub={`${ag.sleep.n} nights`}>
              {ag.sleep.n ? <Donut label="Nights by hours of sleep" center={ag.sleep.avg ?? '–'} sub="avg hours" parts={[
                { name: 'Under 6 h', value: ag.sleep.buckets.under6, color: 'var(--bad)' }, { name: '6–7 h', value: ag.sleep.buckets.s6to7, color: 'var(--warn)' },
                { name: '7–8 h', value: ag.sleep.buckets.s7to8, color: 'var(--ok)' }, { name: '8 h+', value: ag.sleep.buckets.over8, color: 'var(--c1)' }]} /> : <p className="dim">No sleep logged yet.</p>}
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
            <div className="c6"><Card title="Steps" sub={`Per day · average ${ag.steps.avg != null ? ag.steps.avg.toLocaleString('en-IN') : '–'}${ag.steps.best ? ` · best ${ag.steps.best.toLocaleString('en-IN')}` : ''}`}>
              <XYChart xs={xs} label="Steps per day" height={210} fmt={(v) => (v >= 1000 ? `${v / 1000}k` : v)} onPick={setSel} selected={selKey}
                bars={[{ name: 'Steps', values: view.map((d) => d.row?.steps ?? null), color: 'var(--c1)', colorAt: (i) => (view[i].row?.steps >= t.steps ? 'var(--c1)' : 'color-mix(in srgb, var(--c1) 50%, transparent)') }]}
                guide={{ v: t.steps, name: `Goal ${t.steps.toLocaleString('en-IN')}` }}
                tip={(i) => [{ name: 'Steps', text: view[i].row?.steps != null ? view[i].row.steps.toLocaleString('en-IN') : view[i].row?.rest ? 'rest day' : 'not logged' }]} />
              <p className="rule">Lighter bars = under the goal.</p>
            </Card></div>
            <div className="c6"><Card title="Weekly steps" sub="Total steps per Monday–Sunday week">
              <XYChart xs={wkSteps.map((w) => ({ k: w.start, label: short(w.start), full: `Week of ${short(w.start)}` }))} label="Steps per week" height={210} fmt={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
                bars={[{ name: 'Steps', values: wkSteps.map((w) => w.total), color: 'var(--c1)' }]}
                tip={(i) => [{ name: 'Total', text: wkSteps[i].total.toLocaleString('en-IN') }, { name: 'Days logged', text: String(wkSteps[i].n) }]} />
            </Card></div>
          </div>

          <div className="grid">
            <div className="c5"><Card title="What I track" sub="Everything below is filled in daily from one sheet">
              <ul className="track">
                <li><b>Weight</b>morning weigh-in, 7-day average, pace vs −{t.perWeek} kg/week</li>
                <li><b>Steps</b>{t.steps.toLocaleString('en-IN')} a day, weekly totals</li>
                <li><b>Evening gym</b>session and the body parts trained</li>
                <li><b>Calories & macros</b>under {t.kcal} kcal, protein / carbs / fat</li>
                <li><b>Sleep</b>hours per night, target {t.sleep} h</li>
                <li><b>Daily vlog</b>posted on Instagram, with the link</li>
                <li><b>Rest days</b>planned recovery waives the steps goal and gym</li>
              </ul>
            </Card></div>
            <div className="c7"><Card title="Journal" sub="Every day, newest first. Tap a row to open it above.">
              <div className="tablewrap"><table>
                <thead><tr><th>Date</th><th>Weight</th><th>Sleep</th><th>Steps</th><th>Gym</th><th>kcal</th><th>Vlog</th><th>Score</th></tr></thead>
                <tbody>{[...days].reverse().map((d) => { const r = d.row; const s = d.st; return (
                  <tr key={d.k} className={d.k === selKey ? 'sel' : ''} onClick={() => { setSel(d.k); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                    <td>{fmtDate(d.k, { weekday: 'short', day: 'numeric', month: 'short' })}</td><td>{r?.w != null ? r.w.toFixed(1) : '–'}</td><td>{r?.sleep ?? '–'}</td>
                    <td>{s?.rest ? 'Rest' : r?.steps != null ? r.steps.toLocaleString('en-IN') : '–'}</td><td>{s ? (s.rest ? 'Rest' : s.gym ? '✓' : '–') : '–'}</td><td>{r?.kcal ?? '–'}</td><td>{s ? (s.vlog ? '✓' : '–') : '–'}</td>
                    <td>{s ? <span className={`sc ${s.perfect ? 'ok' : s.rest ? 'rest' : ''}`}>{s.rest ? 'Rest' : `${s.n}/4`}</span> : '–'}</td>
                  </tr>); })}</tbody>
              </table></div>
            </Card></div>
          </div>
        </main>
      )}

      {story && hl[story.i] && (
        <aside className={`story ${hl[story.i].tone}`} role="status" aria-live="polite">
          <div className="story-dots" aria-hidden="true">{hl.map((e, i) => <i key={e.id} className={i < story.i ? 'done' : i === story.i ? 'now' : ''} style={i === story.i && !story.paused ? { '--ms': '4200ms' } : undefined} />)}</div>
          <div className="story-main" key={hl[story.i].id}>
            <span className="hl-k">{hl[story.i].kind} · {fmtDate(hl[story.i].date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            <b>{hl[story.i].title}</b><em>{story.done ? 'That is the journey so far. Come back tomorrow for the next chapter.' : hl[story.i].detail}</em>
          </div>
          <div className="story-ctl">
            <button onClick={() => goStory(story.i - 1)} aria-label="Previous moment" disabled={story.i === 0}>‹</button>
            <button onClick={() => (story.done ? startStory() : setStory({ ...story, paused: !story.paused }))} aria-label={story.done ? 'Replay' : story.paused ? 'Resume' : 'Pause'}>{story.done ? '↺' : story.paused ? '▶' : '❚❚'}</button>
            <button onClick={() => goStory(story.i + 1)} aria-label="Next moment" disabled={story.i === hl.length - 1}>›</button>
            <button onClick={() => setStory(null)} aria-label="Close">✕</button>
          </div>
        </aside>
      )}

      <section className="cta">
        <div>Follow the journey</div>
        <a href={IG_URL} target="_blank" rel="noopener noreferrer">Follow {HANDLE}</a>
        <p>A new vlog and an updated dashboard every single day.</p>
      </section>
    </div>
  );
}

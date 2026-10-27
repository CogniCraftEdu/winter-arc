import { useEffect, useRef, useState } from 'react';

// Small hand-built SVG charts for the public dashboard. Colours come from CSS variables (--c1.. in dashboard.css),
// so light/dark follow the page. Every chart has a hover/touch tooltip and a text label for screen readers.

const W = 720;
const M = { l: 46, r: 12, t: 12, b: 26 };

function niceTicks(lo, hi, count = 4) {
  if (hi === lo) { hi = lo + 1; }
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || mag * 10;
  const a = Math.floor(lo / step) * step; const b = Math.ceil(hi / step) * step;
  const out = [];
  for (let v = a; v <= b + step / 2; v += step) out.push(+v.toFixed(6));
  return out;
}

const segments = (vals) => {
  const out = []; let cur = [];
  vals.forEach((v, i) => { if (v == null) { if (cur.length) out.push(cur); cur = []; } else cur.push([i, v]); });
  if (cur.length) out.push(cur);
  return out;
};

export function Legend({ items }) {
  return (
    <ul className="lg">
      {items.map((s) => <li key={s.name}><i className={`sw ${s.kind || 'box'}`} style={{ '--sw': s.color }} />{s.name}</li>)}
    </ul>
  );
}

// bars: [{ name, values, color, colorAt?(i) }]   lines: [{ name, values, color, dash?, dots?, thin? }]
// guide: { v, name } draws a dashed reference line. tip(i) -> [{ name, text, color? }]
export function XYChart({ xs, bars = [], lines = [], guide, tip, selected, onPick, height = 240, fmt = (v) => v, label, minZero = false, empty = 'Nothing to chart yet.' }) {
  const [hover, setHover] = useState(null);
  const scroller = useRef(null);
  const n = xs.length;
  useEffect(() => { const el = scroller.current; if (el) el.scrollLeft = el.scrollWidth; }, [n]);
  const all = [...bars.flatMap((b) => b.values), ...lines.flatMap((l) => l.values)].filter((v) => v != null);
  if (!n || !all.length) return <p className="dim">{empty}</p>;
  if (guide) all.push(guide.v);
  if (bars.length || minZero) all.push(0);
  let lo = Math.min(...all); let hi = Math.max(...all);
  if (!bars.length && !minZero) { const pad = Math.max((hi - lo) * 0.12, 0.2); lo -= pad; hi += pad; }
  const ticks = niceTicks(lo, hi);
  lo = ticks[0]; hi = ticks[ticks.length - 1];
  const H = height;
  const bw = (W - M.l - M.r) / n;
  const X = (i) => M.l + (i + 0.5) * bw;
  const Y = (v) => M.t + (1 - (v - lo) / (hi - lo)) * (H - M.t - M.b);
  const base = Y(Math.max(lo, Math.min(hi, 0)));
  const bw1 = Math.min(26, Math.max(1.5, (bw * 0.7) / Math.max(1, bars.length)));
  const step = Math.ceil(n / 7);
  const legend = [...bars.map((b) => ({ name: b.name, color: b.color })), ...lines.map((l) => ({ name: l.name, color: l.color, kind: l.dash ? 'dash' : 'line' })), ...(guide ? [{ name: guide.name, color: 'var(--muted)', kind: 'dash' }] : [])];

  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.floor((x - M.l) / bw))));
  };
  const hv = hover != null && hover < n ? hover : null;
  const rows = hv != null && tip ? tip(hv) : null;

  return (
    <div className="ch">
      <div className="ch-wrap" ref={scroller}><div className="ch-in">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="ch-svg" onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHover(null)} onClick={() => hv != null && onPick && onPick(xs[hv].k)} style={{ cursor: onPick ? 'pointer' : 'default' }}>
          {ticks.map((v) => <g key={v}><line x1={M.l} x2={W - M.r} y1={Y(v)} y2={Y(v)} className="ch-grid" /><text x={M.l - 8} y={Y(v) + 4} textAnchor="end" className="ch-tick">{fmt(v)}</text></g>)}
          {selected != null && xs.findIndex((x) => x.k === selected) >= 0 && <rect x={M.l + xs.findIndex((x) => x.k === selected) * bw} y={M.t} width={bw} height={H - M.t - M.b} className="ch-sel" />}
          {bars.map((b, bi) => b.values.map((v, i) => (v == null ? null : (
            <rect key={`${bi}-${i}`} className={v < 0 ? 'bar neg' : 'bar'} x={X(i) - (bw1 * bars.length) / 2 + bi * bw1} y={Math.min(Y(v), base)} width={bw1} height={Math.max(0, Math.abs(base - Y(v)))} rx={Math.min(3, bw1 / 2)} style={{ fill: b.colorAt ? b.colorAt(i) : b.color, '--i': Math.min(i, 40) }} />
          ))))}
          {guide && <line x1={M.l} x2={W - M.r} y1={Y(guide.v)} y2={Y(guide.v)} className="ch-guide" />}
          {lines.map((l, li) => (
            <g key={li} style={{ color: l.color }}>
              {l.dash
                ? segments(l.values).map((s, si) => <path key={si} d={s.map(([i, v], k) => `${k ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')} className="ch-line dash" />)
                : segments(l.values).map((s, si) => <path key={si} d={s.map(([i, v], k) => `${k ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')} className={`ch-line ${l.thin ? 'thin' : ''}`} pathLength="1" />)}
              {l.dots && l.values.map((v, i) => (v == null ? null : <circle key={i} cx={X(i)} cy={Y(v)} r={n > 60 ? 1.8 : 3} className="ch-dot" />))}
            </g>
          ))}
          {hv != null && <line x1={X(hv)} x2={X(hv)} y1={M.t} y2={H - M.b} className="ch-cross" />}
          {hv != null && lines.map((l, li) => (l.values[hv] == null ? null : <circle key={li} cx={X(hv)} cy={Y(l.values[hv])} r="4.5" className="ch-hot" style={{ color: l.color }} />))}
          {xs.map((x, i) => (i % step === (n - 1) % step ? <text key={x.k} x={X(i)} y={H - 7} textAnchor="middle" className="ch-tick">{x.label}</text> : null))}
        </svg>
        {rows && (
          <div className={`ch-tip ${hv > n / 2 ? 'left' : ''}`} style={{ left: `${(X(hv) / W) * 100}%` }} role="status">
            <b>{xs[hv].full || xs[hv].label}</b>
            {rows.map((r) => <div key={r.name}><span>{r.color && <i className="sw box" style={{ '--sw': r.color }} />}{r.name}</span><em>{r.text}</em></div>)}
          </div>
        )}
      </div></div>
      {legend.length > 1 && <Legend items={legend} />}
    </div>
  );
}

// parts: [{ name, value, color, text? }]. Legend rows carry the numbers so colour is never the only cue.
export function Donut({ parts, center, sub, label, unit = '' }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  const R = 52; const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="dn">
      <svg viewBox="0 0 140 140" role="img" aria-label={label} className="dn-svg">
        <circle cx="70" cy="70" r={R} className="dn-track" />
        {total > 0 && parts.filter((p) => p.value > 0).map((p) => {
          const len = (p.value / total) * C; const gap = parts.filter((q) => q.value > 0).length > 1 ? Math.min(3, len * 0.25) : 0;
          const el = <circle key={p.name} cx="70" cy="70" r={R} className="dn-arc" style={{ stroke: p.color }} strokeDasharray={`${Math.max(0, len - gap)} ${C}`} strokeDashoffset={-acc} />;
          acc += len; return el;
        })}
        <text x="70" y={sub ? 68 : 75} textAnchor="middle" className="dn-big">{center}</text>
        {sub && <text x="70" y="88" textAnchor="middle" className="dn-sub">{sub}</text>}
      </svg>
      <ul className="dn-lg">
        {parts.map((p) => (
          <li key={p.name}><i className="sw box" style={{ '--sw': p.color }} /><span>{p.name}</span><b>{p.text ?? `${p.value}${unit}`}</b><em>{total ? `${Math.round((p.value / total) * 100)}%` : '–'}</em></li>
        ))}
      </ul>
    </div>
  );
}

export function Ring({ pct, label, sub }) {
  const R = 30; const C = 2 * Math.PI * R; const p = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <div className="rg" role="img" aria-label={`${label}: ${pct == null ? 'no data' : `${pct}%`}`}>
      <svg viewBox="0 0 80 80" className="rg-svg">
        <circle cx="40" cy="40" r={R} className="rg-track" />
        <circle cx="40" cy="40" r={R} className="rg-arc" strokeDasharray={`${(p / 100) * C} ${C}`} transform="rotate(-90 40 40)" />
        <text x="40" y="45" textAnchor="middle" className="rg-pct">{pct == null ? '–' : `${pct}%`}</text>
      </svg>
      <b>{label}</b><span>{sub}</span>
    </div>
  );
}

export function HBars({ items, max }) {
  const m = max || Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="hb">
      {items.map((i) => (
        <li key={i.name}><span>{i.name}</span><i><u style={{ width: `${(i.value / m) * 100}%` }} /></i><b>{i.value}</b></li>
      ))}
    </ul>
  );
}

import { fmtHM } from '../lib.js';

// The daily reel card: one 1080x1920 SVG drawn from `data`. `t` (0..1) is how filled-in the day looks:
// t = 0 is the empty morning dashboard, t = 1 is the day as it actually stands.
// Everything is inline attributes (no CSS classes) so the same markup also renders to a PNG.

const C = { bg: '#09090b', panel: '#101013', line: '#26262b', text: '#f4f4f5', muted: '#9a9aa3', faint: '#5d5d66', ok: '#6ee7b7', bad: '#f87171', accent: '#a5b4fc' };
const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
const ramp = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const ease = (x) => 1 - (1 - x) ** 3;
const PAD = 72;
const W = 1080;
const INNER = W - PAD * 2;

export const ruleRevealAt = (i, n) => 0.06 + 0.5 * (i / n);

export default function DayCard({ data, t, hook }) {
  const n = data.rules.length;
  const shown = data.rules.map((r, i) => (r.on ? ramp(t, ruleRevealAt(i, n), ruleRevealAt(i, n) + 0.05) : 0));
  const score = shown.filter((p) => p >= 1).length;
  const workShown = data.workMs * ease(ramp(t, 0.1, 0.75));
  const workPct = Math.min(1, workShown / data.targetMs);
  const planShown = data.planPct == null ? null : Math.round(data.planPct * ease(ramp(t, 0.35, 0.85)));
  const waterShown = Math.floor(data.water * ease(ramp(t, 0.25, 0.8)) + 1e-6);
  const habitsShown = Math.floor(data.habitsDone * ease(ramp(t, 0.5, 0.9)) + 1e-6);

  const text = (props, children) => <text fontFamily={FONT} fill={C.text} {...props}>{children}</text>;
  const label = (x, y, s, anchor = 'start') => text({ x, y, fontSize: 24, letterSpacing: 5, fill: C.muted, textAnchor: anchor, fontWeight: 500 }, s.toUpperCase());

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} 1920`} role="img" aria-label={`Day ${data.dn} dashboard: ${score} of ${n} rules done`} style={{ display: 'block', width: '100%', height: 'auto', background: C.bg }}>
      <rect width={W} height="1920" fill={C.bg} />

      {/* header */}
      {label(PAD, 118, `Winter Arc · ${data.range}`)}
      {text({ x: PAD, y: 210, fontSize: 66, fontWeight: 700, letterSpacing: -2.5 }, `${data.total} Days Hard Challenge`)}
      {text({ x: PAD, y: 272, fontSize: 30, fill: C.muted }, 'No excuses. 100% execution.')}
      <text x={PAD} y={420} fontFamily={FONT} fill={C.text} fontSize={150} fontWeight={300} letterSpacing={-6}>Day {data.dn}<tspan fontSize={44} fill={C.muted} letterSpacing={0} dx={14}>of {data.total}</tspan></text>
      {text({ x: W - PAD, y: 420, fontSize: 36, fill: C.muted, textAnchor: 'end' }, data.dateLabel)}
      <rect x={PAD} y={462} width={INNER} height={6} rx={3} fill={C.line} />
      <rect x={PAD} y={462} width={Math.max(6, INNER * (data.dn / data.total))} height={6} rx={3} fill={C.text} />

      {/* score + rules */}
      {label(PAD, 566, 'Score')}
      <text x={W - PAD} y={640} fontFamily={FONT} fill={score === n ? C.ok : C.text} fontSize={112} fontWeight={300} textAnchor="end" letterSpacing={-4}>{score}<tspan fill={C.faint} fontSize={64}>/{n}</tspan></text>
      {data.rules.map((r, i) => {
        const y = 700 + i * 76;
        const p = shown[i];
        return (
          <g key={r.id}>
            <line x1={PAD} x2={W - PAD} y1={y + 38} y2={y + 38} stroke={C.line} strokeWidth={1.5} />
            <circle cx={PAD + 20} cy={y + 4} r={19} fill={p > 0 ? C.ok : 'none'} fillOpacity={p} stroke={p > 0 ? C.ok : C.faint} strokeWidth={2.5} />
            {p >= 1 && <path d={`M${PAD + 11},${y + 5} l7,8 l13,-16`} fill="none" stroke={C.bg} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />}
            {text({ x: PAD + 64, y: y + 15, fontSize: 36, fill: p >= 1 ? C.muted : C.text }, r.label)}
          </g>
        );
      })}

      {/* work */}
      {label(PAD, 1236, 'Work')}
      <text x={PAD} y={1352} fontFamily={FONT} fill={C.text} fontSize={116} fontWeight={300} letterSpacing={-4}>{fmtHM(workShown)}<tspan fill={C.faint} fontSize={44} letterSpacing={0} dx={16}>of {data.targetH}h</tspan></text>
      <rect x={PAD} y={1388} width={INNER} height={8} rx={4} fill={C.line} />
      <rect x={PAD} y={1388} width={Math.max(0, INNER * workPct)} height={8} rx={4} fill={C.text} />

      {/* tiles */}
      {[
        { k: 'Plan hit', v: planShown == null ? '—' : `${planShown}%` },
        { k: 'Water', v: `${waterShown}`, sub: `/${data.waterTarget}` },
        { k: 'Habits', v: `${habitsShown}`, sub: `/${data.habitsTotal}` },
      ].map((tile, i) => {
        const w = (INNER - 48) / 3;
        const x = PAD + i * (w + 24);
        return (
          <g key={tile.k}>
            <rect x={x} y={1452} width={w} height={178} rx={22} fill={C.panel} stroke={C.line} strokeWidth={1.5} />
            {label(x + 28, 1502, tile.k)}
            <text x={x + 28} y={1594} fontFamily={FONT} fill={C.text} fontSize={78} fontWeight={300} letterSpacing={-3}>{tile.v}<tspan fill={C.faint} fontSize={36} letterSpacing={0}>{tile.sub || ''}</tspan></text>
          </g>
        );
      })}

      {/* streak + last 7 days */}
      {text({ x: PAD, y: 1716, fontSize: 34, fill: C.muted }, <>Streak <tspan fill={C.text} fontWeight={500}>{data.streak}</tspan>  ·  Best <tspan fill={C.text} fontWeight={500}>{data.best}</tspan></>)}
      {data.last7.map((s, i) => (
        <circle key={i} cx={W - PAD - 14 - (6 - i) * 46} cy={1705} r={14} fill={s === 'won' ? C.ok : s === 'lost' ? C.bad : 'none'} stroke={s === 'none' ? C.faint : 'none'} strokeWidth={2} opacity={s === 'none' ? 0.6 : 1} />
      ))}

      {/* hook line */}
      <line x1={PAD} x2={W - PAD} y1={1766} y2={1766} stroke={C.line} strokeWidth={1.5} />
      {hook && text({ x: PAD, y: 1846, fontSize: 44, fontWeight: 500, letterSpacing: -1 }, hook)}
    </svg>
  );
}

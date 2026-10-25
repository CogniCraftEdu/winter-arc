import { BRAND, TAGLINE } from '../config.js';
import { fmtHM, levelOf } from '../lib.js';

// The daily reel card: one 1080x1920 SVG drawn from `data`. `t` (0..1) is how filled-in the day looks:
// t = 0 is the empty morning dashboard, t = 1 is the day as it actually stands.
// Everything is inline attributes (no CSS classes) so the same markup also renders to a PNG.

const C = { bg: '#09090b', panel: '#101013', line: '#26262b', text: '#f4f4f5', muted: '#9a9aa3', faint: '#5d5d66', ok: '#6ee7b7', bad: '#f87171' };
const LV = ['#202025', '#14402f', '#1f6e51', '#3fb68b', '#6ee7b7']; // frame intensity, 0..4
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

  // The frame's "today" square fills in with the score, and the consistent-days count ticks up when the day is won.
  const f = data.frame;
  const consistentShown = f.pastWon + (f.todayCell && score === n ? 1 : 0);
  const CELL = 26; const PITCH = 32;
  const gx = PAD + 62; const gy = 534;

  const text = (props, children) => <text fontFamily={FONT} fill={C.text} {...props}>{children}</text>;
  const label = (x, y, s, anchor = 'start') => text({ x, y, fontSize: 24, letterSpacing: 5, fill: C.muted, textAnchor: anchor, fontWeight: 500 }, s.toUpperCase());

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} 1920`} role="img" aria-label={`${data.dayText}: ${score} of ${n} rules done, ${consistentShown} days consistent`} style={{ display: 'block', width: '100%', height: 'auto', background: C.bg }}>
      <rect width={W} height="1920" fill={C.bg} />

      {/* header */}
      {label(PAD, 100, `${BRAND} · ${data.range}`)}
      {text({ x: PAD, y: 188, fontSize: 64, fontWeight: 700, letterSpacing: -2.5 }, BRAND)}
      {text({ x: PAD, y: 238, fontSize: 28, fill: C.muted }, TAGLINE)}
      <text x={PAD} y={372} fontFamily={FONT} fill={C.text} fontSize={data.before ? 104 : 132} fontWeight={300} letterSpacing={-5}>{data.dayText}{data.dayUnit && <tspan fontSize={42} fill={C.muted} letterSpacing={0} dx={14}>{data.dayUnit}</tspan>}</text>
      {text({ x: W - PAD, y: 372, fontSize: 34, fill: C.muted, textAnchor: 'end' }, data.dateLabel)}
      <rect x={PAD} y={404} width={INNER} height={6} rx={3} fill={C.line} />
      <rect x={PAD} y={404} width={Math.max(6, INNER * data.progress)} height={6} rx={3} fill={C.text} />

      {/* GitHub-style consistency frame */}
      {label(PAD, 470, 'Consistency')}
      {f.months.map((m) => text({ key: m.label + m.col, x: gx + m.col * PITCH, y: 516, fontSize: 21, fill: C.faint }, m.label))}
      {['Mon', '', 'Wed', '', 'Fri', '', ''].map((l, r) => l && text({ key: l, x: PAD, y: gy + r * PITCH + 20, fontSize: 19, fill: C.faint }, l))}
      {f.weeks.map((w, ci) => w.map((c, r) => {
        if (!c) return null;
        const x = gx + ci * PITCH; const y = gy + r * PITCH;
        const level = c.state === 'today' ? levelOf(score, n) : c.level;
        if (c.state === 'future') return <rect key={`${ci}-${r}`} x={x + 1} y={y + 1} width={CELL - 2} height={CELL - 2} rx={6} fill="none" stroke={C.faint} strokeWidth={1.5} strokeDasharray="4 4" opacity={0.7} />;
        return (
          <g key={`${ci}-${r}`}>
            <rect x={x} y={y} width={CELL} height={CELL} rx={6} fill={LV[level]} />
            {c.state === 'today' && <rect x={x - 3} y={y - 3} width={CELL + 6} height={CELL + 6} rx={9} fill="none" stroke={C.text} strokeWidth={2.5} />}
          </g>
        );
      }))}
      <text x={gx + f.weeks.length * PITCH + 56} y={640} fontFamily={FONT} fill={C.text} fontSize={128} fontWeight={300} letterSpacing={-5}>{consistentShown}<tspan fill={C.faint} fontSize={46} letterSpacing={0} dx={10}>/ {f.total}</tspan></text>
      {label(gx + f.weeks.length * PITCH + 60, 684, 'days consistent')}
      {text({ x: gx + f.weeks.length * PITCH + 60, y: 738, fontSize: 30, fill: C.muted }, <>Streak <tspan fill={C.text} fontWeight={500}>{data.streak}</tspan>  ·  Best <tspan fill={C.text} fontWeight={500}>{data.best}</tspan>  ·  <tspan fill={C.text} fontWeight={500}>{f.left}</tspan> to go</>)}

      {/* score + rules */}
      {label(PAD, 820, 'Score')}
      <text x={W - PAD} y={888} fontFamily={FONT} fill={score === n ? C.ok : C.text} fontSize={100} fontWeight={300} textAnchor="end" letterSpacing={-4}>{score}<tspan fill={C.faint} fontSize={58}>/{n}</tspan></text>
      {data.rules.map((r, i) => {
        const y = 916 + i * 60;
        const p = shown[i];
        return (
          <g key={r.id}>
            <line x1={PAD} x2={W - PAD} y1={y + 31} y2={y + 31} stroke={C.line} strokeWidth={1.5} />
            <circle cx={PAD + 18} cy={y + 2} r={17} fill={p > 0 ? C.ok : 'none'} fillOpacity={p} stroke={p > 0 ? C.ok : C.faint} strokeWidth={2.5} />
            {p >= 1 && <path d={`M${PAD + 10},${y + 3} l6,7 l12,-14`} fill="none" stroke={C.bg} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />}
            {text({ x: PAD + 58, y: y + 14, fontSize: 33, fill: p >= 1 ? C.muted : C.text }, r.label)}
          </g>
        );
      })}

      {/* work */}
      {label(PAD, 1352, 'Work')}
      <text x={PAD} y={1450} fontFamily={FONT} fill={C.text} fontSize={102} fontWeight={300} letterSpacing={-4}>{fmtHM(workShown)}<tspan fill={C.faint} fontSize={40} letterSpacing={0} dx={14}>of {data.targetH}h</tspan></text>
      <rect x={PAD} y={1480} width={INNER} height={8} rx={4} fill={C.line} />
      <rect x={PAD} y={1480} width={Math.max(0, INNER * workPct)} height={8} rx={4} fill={C.text} />

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
            <rect x={x} y={1536} width={w} height={150} rx={22} fill={C.panel} stroke={C.line} strokeWidth={1.5} />
            {label(x + 26, 1582, tile.k)}
            <text x={x + 26} y={1654} fontFamily={FONT} fill={C.text} fontSize={66} fontWeight={300} letterSpacing={-3}>{tile.v}<tspan fill={C.faint} fontSize={32} letterSpacing={0}>{tile.sub || ''}</tspan></text>
          </g>
        );
      })}

      {/* hook line */}
      <line x1={PAD} x2={W - PAD} y1={1736} y2={1736} stroke={C.line} strokeWidth={1.5} />
      {hook && text({ x: PAD, y: 1818, fontSize: 44, fontWeight: 500, letterSpacing: -1 }, hook)}
    </svg>
  );
}

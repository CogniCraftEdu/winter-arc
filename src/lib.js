import { START, END, SLOTS, SLOT_END, TEMPLATE } from './config.js';

const pad = (n) => String(n).padStart(2, '0');

export const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromKey = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (key, n) => {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
};
export const todayKey = () => toKey(new Date());
export const diffDays = (a, b) => Math.round((fromKey(a) - fromKey(b)) / 86400000);

export const TOTAL_DAYS = diffDays(END, START) + 1;
export const dayNumber = (key) => diffDays(key, START) + 1; // 1-based
export const inChallenge = (key) => key >= START && key <= END;
export const allDays = () => Array.from({ length: TOTAL_DAYS }, (_, i) => addDays(START, i));

export const fmtDate = (key, opts = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  fromKey(key).toLocaleDateString('en-IN', opts);

export const fmtClock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};
export const fmtHM = (ms) => {
  const m = Math.round(ms / 60000);
  return `${Math.floor(m / 60)}h ${pad(m % 60)}m`;
};
export const fmtTime = (ts) =>
  new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

export const minutesOfDay = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const nowMinutes = (d = new Date()) => d.getHours() * 60 + d.getMinutes();

export const uid = () => Math.random().toString(36).slice(2, 10);

// ---- per-day data -------------------------------------------------------
export const emptyDay = () => ({ checks: {}, plan: [], sessions: [], notes: [], reflection: '', habits: {}, water: 0, ratings: {}, mit: '', weight: '', actuals: {} });
export const planned = (day) => (day?.plan || []).filter((p) => p.title && p.title.trim());
export const pad2 = (n) => String(n).padStart(2, '0');

export const workMs = (day, CATS, runningSession) => {
  const sessions = runningSession ? [...day.sessions, runningSession] : day.sessions;
  return sessions
    .filter((s) => CATS.find((c) => c.id === s.cat)?.work)
    .reduce((t, s) => t + (s.end - s.start), 0);
};


// A day is "won" only when every rule is true.
export function dayResult(day, settings, CATS, RULES) {
  if (!day) return { done: 0, won: false, checks: {} };
  const checks = { ...day.checks };
  checks.work = workMs(day, CATS) >= settings.workTargetHours * 3600000;
  if (!checks.gym) checks.gym = day.sessions.some((s) => s.cat === 'gym' && s.end - s.start >= 20 * 60000);
  const done = RULES.filter((r) => checks[r.id]).length;
  return { done, won: done === RULES.length, checks };
}

export function streaks(days, today, settings, CATS, RULES) {
  let current = 0;
  let best = 0;
  let run = 0;
  for (const k of allDays()) {
    if (k > today) break;
    const won = dayResult(days[k], settings, CATS, RULES).won;
    if (won) { run += 1; best = Math.max(best, run); }
    else if (k < today) run = 0; // today is still open, doesn't break the streak yet
  }
  current = run;
  return { current, best };
}

export const isLocked = (date, today) => date !== today; // only today is editable; the past is history

// ---- slot-by-slot actuals ------------------------------------------------
export const hhmm = (min) => `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;
export const slotRange = (start) => `${hhmm(start)}–${hhmm(SLOT_END[start])}`;
export const slotMs = (dateKey, startMin) => {
  const b = fromKey(dateKey);
  return new Date(b.getFullYear(), b.getMonth(), b.getDate(), 0, startMin).getTime();
};
// Splits the day's sessions (plus the running one) into the part that falls inside one slot.
export function slotSegments(sessions, dateKey, startMin) {
  const hs = slotMs(dateKey, startMin);
  const he = slotMs(dateKey, SLOT_END[startMin]);
  const out = [];
  for (const s of sessions) {
    const a = Math.max(s.start, hs);
    const b = Math.min(s.end, he);
    if (b > a) out.push({ id: s.id, label: s.label, cat: s.cat, ms: b - a, running: s.id === 'running' });
  }
  return out.sort((x, y) => (x.running ? 1 : 0) - (y.running ? 1 : 0));
}
export const fmtShort = (ms) => {
  const m = Math.round(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${pad2(m % 60)}m` : `${m}m`;
};

// Effective plan for a day: what you typed wins (even if you cleared it); otherwise the suggested default.
export function planFor(day) {
  const stored = new Map((day?.plan || []).filter((p) => p.start != null).map((p) => [p.start, p]));
  return SLOTS.map(({ start, end }) => {
    const p = stored.get(start);
    const t = TEMPLATE[start];
    return {
      start,
      end,
      id: p?.id,
      title: p ? p.title : t?.title || '',
      done: !!p?.done,
      cat: p?.cat || t?.cat || 'work',
      isDefault: !p && !!t,
    };
  });
}

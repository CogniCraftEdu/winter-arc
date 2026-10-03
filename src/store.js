import { useCallback, useEffect, useState } from 'react';
import { SETTINGS_DEFAULT } from './config.js';
import { emptyDay, uid } from './lib.js';

const KEY = 'winterarc:v1';
const fresh = () => ({ days: {}, timer: null, settings: SETTINGS_DEFAULT, reviews: {} });

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw) return { ...fresh(), ...raw, settings: { ...SETTINGS_DEFAULT, ...raw.settings } };
  } catch { /* corrupted or unavailable storage → start clean */ }
  return fresh();
}

export function useStore() {
  const [state, setState] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ }
  }, [state]);

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (e) => e.key === KEY && setState(load());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const update = useCallback((fn) => setState((s) => fn(s)), []);

  const editDay = useCallback((date, fn) => update((s) => {
    const day = s.days[date] || emptyDay();
    return { ...s, days: { ...s.days, [date]: fn(day) } };
  }), [update]);

  const actions = {
    setCheck: (date, id, val) => editDay(date, (d) => ({ ...d, checks: { ...d.checks, [id]: val } })),
    addPlan: (date, item) => editDay(date, (d) => ({ ...d, plan: [...d.plan, { id: uid(), done: false, ...item }] })),
    togglePlan: (date, id) => editDay(date, (d) => ({ ...d, plan: d.plan.map((p) => (p.id === id ? { ...p, done: !p.done } : p)) })),
    removePlan: (date, id) => editDay(date, (d) => ({ ...d, plan: d.plan.filter((p) => p.id !== id) })),
    addMeal: (date, meal) => editDay(date, (d) => ({ ...d, meals: [...d.meals, { id: uid(), ts: Date.now(), ...meal }] })),
    removeMeal: (date, id) => editDay(date, (d) => ({ ...d, meals: d.meals.filter((m) => m.id !== id) })),
    addNote: (date, note) => editDay(date, (d) => ({ ...d, notes: [{ id: uid(), ts: Date.now(), ...note }, ...d.notes] })),
    removeNote: (date, id) => editDay(date, (d) => ({ ...d, notes: d.notes.filter((n) => n.id !== id) })),
    setField: (date, field, val) => editDay(date, (d) => ({ ...d, [field]: val })),
    setReview: (week, text) => update((s) => ({ ...s, reviews: { ...s.reviews, [week]: text } })),
    setReflection: (date, text) => editDay(date, (d) => ({ ...d, reflection: text })),
    removeSession: (date, id) => editDay(date, (d) => ({ ...d, sessions: d.sessions.filter((x) => x.id !== id) })),
    renameSession: (date, id, label) => editDay(date, (d) => ({ ...d, sessions: d.sessions.map((x) => (x.id === id ? { ...x, label } : x)) })),
    setSettings: (patch) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } })),

    // Stopwatch: one running timer at a time. Stored as a start timestamp, so reloads/closed tabs don't lose time.
    startTimer: (label, cat) => update((s) => {
      const stopped = stopInto(s);
      return { ...stopped, timer: { label: label.trim() || 'Untitled', cat, startedAt: Date.now() } };
    }),
    stopTimer: () => update((s) => stopInto(s)),
    discardTimer: () => update((s) => ({ ...s, timer: null })),

    exportData: () => JSON.stringify(state, null, 2),
    importData: (text) => {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || !parsed.days) throw new Error('Not a Winter Arc backup');
      setState({ ...fresh(), ...parsed, settings: { ...SETTINGS_DEFAULT, ...parsed.settings } });
    },
  };

  return [state, actions];
}

// Finishes the running timer and files it under the day it started on.
// A session crossing midnight is split so every day's numbers stay honest.
function stopInto(s) {
  if (!s.timer) return s;
  const { label, cat, startedAt } = s.timer;
  const end = Date.now();
  const days = { ...s.days };
  let cursor = startedAt;
  while (cursor < end) {
    const d = new Date(cursor);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const nextMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
    const segEnd = Math.min(end, nextMidnight);
    const day = days[key] || emptyDay();
    days[key] = { ...day, sessions: [...day.sessions, { id: uid(), label, cat, start: cursor, end: segEnd }] };
    cursor = segEnd;
  }
  return { ...s, days, timer: null };
}

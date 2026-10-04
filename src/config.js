// Challenge definition — edit here, nowhere else.
export const START = '2026-10-05';
export const END = '2026-12-18';

export const SETTINGS_DEFAULT = {
  workTargetHours: 10,
  sleepTargetHours: 7,
};

// The six rules. `auto` ones are derived from data and cannot be ticked by hand.
export const RULES = [
  { id: 'brahma', label: 'Brahmacharya', hint: 'No exceptions.' },
  { id: 'junk', label: 'No junk food', hint: 'Eat clean all day. No exceptions.' },
  { id: 'sleep', label: '7 hours sleep', hint: '11 PM → 6 AM.' },
  { id: 'vlog', label: 'Daily vlog posted', hint: 'Posted between 10 and 11 PM.' },
  { id: 'work', label: '10 hours of work', hint: 'Counted automatically from the stopwatch.', auto: true },
  { id: 'gym', label: 'Gym or run', hint: '6:30–8:30 AM. Counted if you log a Gym session or tick it.' },
];

// The waking day (06:00-23:00) is planned in slots. A slot is identified by its start in
// minutes since midnight (06:30 = 390). The morning routine has its own block sizes; from
// 09:00 onward the day is split into 1-hour slots. Titles below are only suggestions:
// type over any of them, or clear a slot to leave it unplanned.
const t = (h, m = 0) => h * 60 + m;
const hourly = (from, to) => Array.from({ length: to - from }, (_, i) => ({ start: t(from + i), end: t(from + i + 1) }));
export const SLOTS = [
  { start: t(6), end: t(6, 30) },   // brush, freshen up, face wash
  { start: t(6, 30), end: t(8, 30) }, // gym
  { start: t(8, 30), end: t(9) },   // bath
  ...hourly(9, 23),                 // 09:00-23:00, one hour each
];
export const SLOT_END = Object.fromEntries(SLOTS.map((s) => [s.start, s.end]));
export const SLEEP = { from: '23:00', to: '06:00', label: 'Sleep' }; // one long block
export const TEMPLATE = {
  [t(6)]: { title: 'Brush + freshen up + face wash', cat: 'other' },
  [t(6, 30)]: { title: 'Gym', cat: 'gym' },
  [t(8, 30)]: { title: 'Bath + get ready', cat: 'other' },
  [t(13)]: { title: 'Lunch: meal + protein', cat: 'meal' },
  [t(21)]: { title: 'Protein dinner + family + documentary', cat: 'meal' },
  [t(22)]: { title: 'Plan tomorrow + post the vlog', cat: 'vlog' },
};

// Stopwatch categories. `work: true` counts toward the 10-hour target.
export const CATS = [
  { id: 'work', label: 'Work', work: true, color: '#5b8cff' },
  { id: 'study', label: 'Study', work: true, color: '#a78bfa' },
  { id: 'gym', label: 'Gym / Run', color: '#34d399' },
  { id: 'meal', label: 'Meal', color: '#fbbf24' },
  { id: 'vlog', label: 'Vlog / Plan', color: '#f472b6' },
  { id: 'rest', label: 'Rest / Family', color: '#94a3b8' },
  { id: 'other', label: 'Other', color: '#64748b' },
];
export const catOf = (id) => CATS.find((c) => c.id === id) || CATS[CATS.length - 1];

// Optional habits: not part of the win condition, but tracked for a fuller picture.
export const HABITS = [
  { id: 'sun', label: 'Morning sunlight', hint: '10 min outside' },
  { id: 'walk', label: 'Walk / steps', hint: '8k+ steps' },
  { id: 'read', label: 'Read', hint: '20 pages' },
  { id: 'breath', label: 'Meditate / breathwork', hint: '10 min' },
  { id: 'mobility', label: 'Mobility', hint: '10 min stretch' },
  { id: 'phone', label: 'Phone out of bedroom', hint: 'Charge it elsewhere' },
  { id: 'social', label: 'No scrolling before noon', hint: 'Feeds stay closed' },
  { id: 'skill', label: 'Deliberate skill practice', hint: '1 focused hour' },
];
export const WATER_TARGET = 12; // glasses of ~250 ml
export const RATINGS = [
  { id: 'energy', label: 'Energy' },
  { id: 'mood', label: 'Mood' },
  { id: 'focus', label: 'Focus' },
];


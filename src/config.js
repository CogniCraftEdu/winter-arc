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

// The day is planned in 30-minute slots from 06:00 to 23:00. A slot is identified by its
// start in minutes since midnight (06:30 = 390). The defaults below are only suggestions:
// type over any of them, or clear a slot to leave it unplanned.
export const SLOT_MIN = 30;
export const FIRST_MIN = 6 * 60;
export const END_MIN = 23 * 60; // sleep starts here
export const SLEEP = { from: '23:00', to: '06:00', label: 'Sleep' }; // one long block
const range = (from, to) => Array.from({ length: (to - from) / SLOT_MIN }, (_, i) => from + i * SLOT_MIN);
const fill = (from, to, v) => Object.fromEntries(range(from, to).map((m) => [m, v]));
const t = (h, m = 0) => h * 60 + m;
export const TEMPLATE = {
  ...fill(t(6), t(6, 30), { title: 'Brush, freshen up, get ready', cat: 'other' }),
  ...fill(t(6, 30), t(8, 30), { title: 'Gym', cat: 'gym' }),
  ...fill(t(8, 30), t(9), { title: 'Bath', cat: 'other' }),
  ...fill(t(13), t(14), { title: 'Lunch: meal + protein', cat: 'meal' }),
  ...fill(t(21), t(22), { title: 'Protein dinner + family + documentary', cat: 'meal' }),
  ...fill(t(22), t(23), { title: 'Plan tomorrow + post the vlog', cat: 'vlog' }),
};
export const SLOTS = range(FIRST_MIN, END_MIN);

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


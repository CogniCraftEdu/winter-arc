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

// Every waking hour is a plannable slot. These are only the suggested defaults:
// type over any of them, or clear a slot to leave it unplanned.
export const FIRST_HOUR = 6;
export const LAST_HOUR = 22; // 22:00–23:00 is the last waking slot
export const SLEEP = { from: '23:00', to: '06:00', label: 'Sleep' }; // one long block
export const TEMPLATE = {
  6: { title: 'Brush, freshen up, get ready', cat: 'other' },
  7: { title: 'Gym', cat: 'gym' },
  8: { title: 'Gym → bath', cat: 'gym' },
  13: { title: 'Lunch: meal + protein', cat: 'meal' },
  21: { title: 'Protein dinner + family + documentary', cat: 'meal' },
  22: { title: 'Plan tomorrow + post the vlog', cat: 'vlog' },
};
export const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i);

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


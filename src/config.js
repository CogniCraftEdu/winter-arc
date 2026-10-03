// Challenge definition — edit here, nowhere else.
export const START = '2026-10-04';
export const END = '2026-12-18';

export const SETTINGS_DEFAULT = {
  workTargetHours: 10,
  sleepTargetHours: 7,
  calorieTarget: 2200,
  proteinTarget: 140,
};

// The six rules. `auto` ones are derived from data and cannot be ticked by hand.
export const RULES = [
  { id: 'brahma', label: 'Brahmacharya', hint: 'No exceptions.' },
  { id: 'junk', label: 'No junk food', hint: 'Log every meal. Stay inside the calorie target.' },
  { id: 'sleep', label: '7 hours sleep', hint: '11 PM → 6 AM.' },
  { id: 'vlog', label: 'Daily vlog posted', hint: 'Posted between 10 and 11 PM.' },
  { id: 'work', label: '10 hours of work', hint: 'Counted automatically from the stopwatch.', auto: true },
  { id: 'gym', label: 'Gym or run', hint: '6:30–8:30 AM. Counted if you log a Gym session or tick it.' },
];

// Fixed blocks. kind=flex means "planned the night before".
export const SCHEDULE = [
  { start: '06:00', end: '06:30', title: 'Brush, freshen up, get ready', kind: 'fixed' },
  { start: '06:30', end: '08:30', title: 'GYM', kind: 'fixed', cat: 'gym' },
  { start: '08:30', end: '09:00', title: 'Bath', kind: 'fixed' },
  { start: '09:00', end: '13:00', title: 'Flexible block 1', kind: 'flex', slot: 'am' },
  { start: '13:00', end: '14:00', title: 'Lunch — meal + protein', kind: 'fixed', cat: 'meal' },
  { start: '14:00', end: '21:00', title: 'Flexible block 2', kind: 'flex', slot: 'pm' },
  { start: '21:00', end: '22:00', title: 'Protein dinner · family time · documentary', kind: 'fixed', cat: 'meal' },
  { start: '22:00', end: '23:00', title: "Plan tomorrow + post today's vlog", kind: 'fixed', cat: 'vlog' },
  { start: '23:00', end: '30:00', title: 'Sleep (11 → 6)', kind: 'fixed', cat: 'sleep' },
];

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

export const hoursOfBlock = (b) => {
  const s = Number(b.start.slice(0, 2));
  const e = Number(b.end.slice(0, 2));
  return Array.from({ length: e - s }, (_, i) => s + i);
};
export const FLEX_HOURS = SCHEDULE.filter((b) => b.kind === 'flex').flatMap(hoursOfBlock);

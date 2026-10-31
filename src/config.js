// Challenge definition — edit here, nowhere else.
export const START = '2026-10-26';
export const END = '2026-11-15'; // 21 days: 26 Oct -> 15 Nov

export const SETTINGS_DEFAULT = {
  workTargetHours: 10,
  sleepTargetHours: 7,
  runTargetKm: 10, // the morning run counts as done at this distance
  oddsP0: 92, // assumed daily win chance (%)
  oddsN0: 12, // how many days of evidence that assumption is worth
  oddsTarget: 90, // what counts as 'finished': this % of days won
  oddsDecay: 1,
  reelStart: "Today's dashboard: empty. Let's fill it.",
  reelEnd: 'Day {day} filled. Follow for Day {next}.', // weekly fatigue: daily odds drop by this % per week
};

// The six rules. `auto` ones are derived from data and cannot be ticked by hand.
export const RULES = [
  { id: 'brahma', label: 'Brahmacharya', hint: 'No exceptions.' },
  { id: 'junk', label: 'No junk food', hint: 'Eat clean all day. No exceptions.' },
  { id: 'sleep', label: '7 hours sleep', hint: '11 PM → 6 AM.' },
  { id: 'vlog', label: 'Daily vlog posted', hint: 'Posted between 10 and 11 PM.' },
  { id: 'work', label: '10 hours of work', hint: 'Counted automatically from the stopwatch.', auto: true },
  { id: 'run', label: '10k steps', hint: 'Tick it when you have hit your steps, or log a Walk session with the stopwatch.' },
  { id: 'gym', label: 'Evening gym', hint: 'Tick it when done, or log a Gym session with the stopwatch.' },
];

// The waking day (06:00-23:00) is planned in slots. A slot is identified by its start in
// minutes since midnight (06:30 = 390). The morning routine has its own block sizes; from
// 09:00 onward the day is split into 1-hour slots. Titles below are only suggestions:
// type over any of them, or clear a slot to leave it unplanned.
const t = (h, m = 0) => h * 60 + m;
const hourly = (from, to) => Array.from({ length: to - from }, (_, i) => ({ start: t(from + i), end: t(from + i + 1) }));
export const SLOTS = [
  { start: t(6), end: t(6, 30) },   // brush, freshen up, face wash
  { start: t(6, 30), end: t(8, 30) }, // morning steps / walk
  { start: t(8, 30), end: t(9) },   // bath
  ...hourly(9, 23),                 // 09:00-23:00, one hour each
];
export const SLOT_END = Object.fromEntries(SLOTS.map((s) => [s.start, s.end]));
export const SLEEP = { from: '23:00', to: '06:00', label: 'Sleep' }; // one long block
export const TEMPLATE = {
  [t(6)]: { title: 'Brush + freshen up + face wash', cat: 'other' },
  [t(6, 30)]: { title: 'Morning walk · 10k steps', cat: 'run' },
  [t(18)]: { title: 'Evening gym', cat: 'gym' },
  [t(8, 30)]: { title: 'Bath + get ready', cat: 'other' },
  [t(13)]: { title: 'Lunch: meal + protein', cat: 'meal' },
  [t(21)]: { title: 'Protein dinner + family + documentary', cat: 'meal' },
  [t(22)]: { title: 'Plan tomorrow + post the vlog', cat: 'vlog' },
};

// Stopwatch categories. `work: true` counts toward the 10-hour target.
export const CATS = [
  { id: 'work', label: 'Work', work: true, color: '#5b8cff' },
  { id: 'study', label: 'Study', work: true, color: '#a78bfa' },
  { id: 'run', label: 'Steps', color: '#22d3ee' },
  { id: 'gym', label: 'Gym', color: '#34d399' },
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


// Brand + the public targets. Edit here; the public page and the daily sheet both read these.
export const BRAND = 'Fat to Fit';
export const TAGLINE = '21-day challenge · −0.75 kg every week';
export const TARGETS = {
  perWeek: 0.75, // kg lost per week
  startWeight: null, // kg; leave null to use the first weight in the sheet
  goalWeight: 85, // kg; progress towards it is shown on the dashboard
  steps: 10000, // daily steps
  kcal: 2400, // daily calories (at or under)
  protein: 150, // grams
  sleep: 7, // hours per night
};

// The daily sheet starts here (10 days back so you can backfill) and has room for this many dated rows.
export const SHEET_FIRST_DATE = '2026-10-16';
export const SHEET_ROWS = 120;

// Public handle shown on the public page and its follow button.
export const HANDLE = '@whey.to.lift';
export const IG_URL = 'https://www.instagram.com/whey.to.lift/';

// Body parts you can mark as trained. `side` says which figure(s) draw it on the body map.
export const MUSCLES = [
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'biceps', label: 'Biceps' },
  { id: 'triceps', label: 'Triceps' },
  { id: 'forearms', label: 'Forearms' },
  { id: 'abs', label: 'Abs' },
  { id: 'glutes', label: 'Glutes' },
  { id: 'quads', label: 'Quads' },
  { id: 'hamstrings', label: 'Hamstrings' },
  { id: 'calves', label: 'Calves' },
];

// ---- The Kaizen Protocol ----
// One experiment a week. The dashboard compares the week under test with the 7 days before it and shows the result.
// metric: 'sleep' (nights at the sleep target) | 'steps' (days at the steps goal) | 'calories' (days within the calorie target)
export const EXPERIMENTS = [
  { id: 'sleep-7', title: 'Sleep 7+ hours', question: 'Does getting 7+ hours of sleep every night move the scale faster?', metric: 'sleep', start: '2026-11-02', end: '2026-11-08' },
];

// Fill these in to switch on the "estimated fat loss" card (calories in vs out). Leave null to keep it hidden.
export const PROFILE = { sex: 'male', ageYears: 24, heightCm: 175.25 }; // sex: 'male' | 'female'

// Lets followers copy your sheet template ("Make a copy"). Works because the sheet is shared as Viewer.
export const SHEET_COPY_URL = 'https://docs.google.com/spreadsheets/d/1X-PC7_gJUWIUhmjztmm7TO0eWEUe6DIbDDb-ivN7XS8/copy';

export const POSITIONING = 'Quit the 9–5. Losing 0.75 kg a week in public. Every number verifiable, one experiment a week.';

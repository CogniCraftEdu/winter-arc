import { MUSCLES, TARGETS } from './config.js';

// The daily sheet (Google Sheets "published as CSV") is the single source of data.
// One row per day. Only the Date column is required; everything else can be left blank.

export function parseCsv(text) {
  const s = String(text ?? '').replace(/^﻿/, '');
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (q) {
      if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i += 1; } else q = false; } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && s[i + 1] === '\n') i += 1; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const iso = (y, m, d) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

// 2026-10-26 (what the template uses), 26/10/2026 (day first, as in India), or 26 Oct 2026.
export function parseDate(v) {
  const s = String(v ?? '').trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) { const a = +m[1]; const b = +m[2]; return b > 12 ? iso(+m[3], a, b) : iso(+m[3], b, a); }
  m = s.match(/^(?:[A-Za-z]{3,9},?\s+)?(\d{1,2})[\s-]+([A-Za-z]{3,9})[\s,-]+(\d{4})$/);
  if (m && MONTHS[m[2].slice(0, 3).toLowerCase()]) return iso(+m[3], MONTHS[m[2].slice(0, 3).toLowerCase()], +m[1]);
  return null;
}

const num = (v) => {
  let s = String(v ?? '').trim();
  if (!s) return null;
  if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.'); // "78,4"
  s = s.replace(/[^\d.\-]/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};
const yes = (v) => /^(y|yes|true|1|done|✓|✔|x)$/i.test(String(v ?? '').trim());

const PART_ALIASES = {
  pecs: ['chest'], chest: ['chest'], back: ['back'], lats: ['back'], traps: ['back'], shoulders: ['shoulders'], shoulder: ['shoulders'], delts: ['shoulders'],
  biceps: ['biceps'], bicep: ['biceps'], triceps: ['triceps'], tricep: ['triceps'], forearms: ['forearms'], forearm: ['forearms'], arms: ['biceps', 'triceps', 'forearms'],
  abs: ['abs'], core: ['abs'], glutes: ['glutes'], glute: ['glutes'], quads: ['quads'], quad: ['quads'], hamstrings: ['hamstrings'], hamstring: ['hamstrings'], hams: ['hamstrings'],
  calves: ['calves'], calf: ['calves'], legs: ['quads', 'hamstrings', 'glutes', 'calves'], leg: ['quads', 'hamstrings', 'glutes', 'calves'],
};
const known = new Set(MUSCLES.map((m) => m.id));
export const parseParts = (v) => [...new Set(String(v ?? '').toLowerCase().split(/[,;/|&+]+|\band\b/).map((x) => x.trim()).flatMap((x) => PART_ALIASES[x] || (known.has(x) ? [x] : [])))];

// Column order used when the header row can't be recognised (matches the template).
const DEFAULT_COLS = { date: 0, rest: 1, w: 2, km: 3, min: 4, gym: 5, workout: 6, parts: 7, kcal: 8, p: 9, c: 10, f: 11, vlog: 12, vlogUrl: 13 };

export function findColumns(header) {
  const h = header.map((x) => String(x ?? '').toLowerCase().replace(/\s+/g, ' ').trim());
  const find = (fn) => h.findIndex(fn);
  const cols = {
    date: find((x) => /\bdate\b/.test(x)),
    rest: find((x) => /\brest\b/.test(x)),
    w: find((x) => /weight/.test(x) && !/target/.test(x)),
    km: find((x) => /\brun\b/.test(x) && /(km|dist)/.test(x)),
    min: find((x) => /\brun\b/.test(x) && /(min|time)/.test(x)),
    gym: find((x) => /\bgym\b/.test(x) && !/photo/.test(x)),
    workout: find((x) => /workout/.test(x)),
    parts: find((x) => /(body|muscle)/.test(x)),
    kcal: find((x) => /(calor|kcal)/.test(x) && !/target/.test(x)),
    p: find((x) => /protein/.test(x)),
    c: find((x) => /carb/.test(x)),
    f: find((x) => /^fat\b/.test(x)),
    vlog: find((x) => /vlog/.test(x) && !/(link|url)/.test(x)),
    vlogUrl: find((x) => /vlog/.test(x) && /(link|url)/.test(x)),
  };
  return cols.date >= 0 ? cols : null;
}

const IG = /^https:\/\/(www\.)?instagram\.com\//;

// rows -> journal. `report` says how many rows were read, skipped, and which dates were bad.
export function journalFromRows(rows, targets = TARGETS) {
  let headerAt = rows.slice(0, 6).findIndex((r) => findColumns(r));
  const cols = headerAt >= 0 ? findColumns(rows[headerAt]) : DEFAULT_COLS;
  headerAt = Math.max(headerAt, -1);
  const days = {};
  const report = { rows: 0, used: 0, skipped: 0, badDates: [] };
  for (const r of rows.slice(headerAt + 1)) {
    if (!r || r.every((x) => String(x ?? '').trim() === '')) continue;
    report.rows += 1;
    const cell = (k) => (cols[k] >= 0 && cols[k] != null ? r[cols[k]] : '');
    const date = parseDate(cell('date'));
    if (!date) { report.skipped += 1; if (String(cell('date')).trim()) report.badDates.push(String(cell('date')).trim()); continue; }
    const rest = yes(cell('rest'));
    const km = num(cell('km'));
    const workout = String(cell('workout') ?? '').trim().slice(0, 60);
    const link = String(cell('vlogUrl') ?? '').trim();
    const row = {
      w: num(cell('w')), runKm: km, runMin: num(cell('min')),
      runDone: rest || (km != null && km >= targets.runKm - 1e-9),
      gymDone: rest || yes(cell('gym')) || workout !== '',
      workout, trained: parseParts(cell('parts')),
      kcal: num(cell('kcal')), p: num(cell('p')), c: num(cell('c')), f: num(cell('f')),
      rest, vlog: yes(cell('vlog')), vlogUrl: IG.test(link) ? link.slice(0, 200) : '',
    };
    const any = row.w != null || km != null || row.kcal != null || rest || row.vlog || workout || row.trained.length || yes(cell('gym'));
    if (!any) continue; // a prefilled date with nothing entered yet
    days[date] = row; report.used += 1;
  }
  return { target: { ...targets }, days, report };
}

export const journalFromCsv = (text, targets) => journalFromRows(parseCsv(text), targets);

import { planFor, slotMs, slotSegments } from './lib.js';

// Row-by-row view of today's plan vs what actually happened. Shared by the Today schedule and the Reel card.
export function scheduleRows(day, today, now, running) {
  const sessions = [...day.sessions, ...(running ? [running] : [])];
  return planFor(day).map((slot) => {
    const started = slotMs(today, slot.start) <= now;
    const ended = slotMs(today, slot.end) <= now;
    const SLOT_MS = (slot.end - slot.start) * 60000;
    const live = started && !ended;
    const segs = started ? slotSegments(sessions, today, slot.start) : [];
    const logged = segs.reduce((t, s) => t + s.ms, 0);
    const note = day.actuals?.[slot.start]?.trim();
    const planned = !!slot.title.trim();

    // A ticked slot or a written note also counts as accounted for.
    const accounted = Math.min(SLOT_MS, Math.max(logged, slot.done || note ? SLOT_MS : 0));

    let status = null;
    if (planned && started) {
      if (slot.done || logged >= SLOT_MS * 0.75) status = 'hit';
      else if (live) status = 'live';
      else if (logged >= 5 * 60000) status = 'partial';
      else status = 'miss';
    }
    return { ...slot, slotMs: SLOT_MS, started, ended, live, segs, logged, accounted, status, planned, note };
  });
}

export function scheduleSummary(rows) {
  const plannedRows = rows.filter((r) => r.planned && r.started);
  const settled = plannedRows.filter((r) => r.status !== 'live');
  const hits = plannedRows.filter((r) => r.status === 'hit').length;
  const pct = settled.length ? Math.round((settled.filter((r) => r.status === 'hit').length / settled.length) * 100) : null;
  const endedRows = rows.filter((r) => r.ended);
  const loggedMs = rows.reduce((t, r) => t + r.logged, 0);
  const unaccounted = endedRows.reduce((t, r) => t + r.slotMs - r.accounted, 0);
  return { pct, hits, planned: plannedRows.length, loggedMs, unaccounted, endedCount: endedRows.length };
}

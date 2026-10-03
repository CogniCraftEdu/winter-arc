import { useState } from 'react';
import { SCHEDULE, hoursOfBlock } from '../config.js';
import { addDays, fmtDate, pad2 } from '../lib.js';

const PLAN_CATS = [['work', 'Work'], ['study', 'Study'], ['rest', 'Rest'], ['other', 'Other']];

// One row per hour from 06:00 to 23:00. Fixed hours are locked; flexible hours are yours to fill.
const HOURS = Array.from({ length: 17 }, (_, i) => {
  const h = 6 + i;
  const block = SCHEDULE.find((b) => b.kind === 'flex' ? hoursOfBlock(b).includes(h) : h * 60 >= toMin(b.start) && h * 60 < toMin(b.end));
  return { h, block, flex: block?.kind === 'flex' };
});
function toMin(t) { const [a, b] = t.split(':').map(Number); return a * 60 + b; }

export default function Plan({ state, actions, today, tomorrow }) {
  const [date, setDate] = useState(tomorrow);
  const day = state.days[date];
  const plan = day?.plan || [];
  const flexHours = HOURS.filter((x) => x.flex);
  const filled = flexHours.filter((x) => plan.find((p) => p.hour === x.h && p.title?.trim())).length;
  const editable = date >= today;
  const prev = addDays(date, -1);
  const canCopy = (state.days[prev]?.plan || []).some((p) => p.title?.trim());

  return (
    <div className="stack-lg">
      <section className="panel">
        <h2>Plan the day, hour by hour</h2>
        <div className="seg">
          <button className={date === tomorrow ? 'on' : ''} onClick={() => setDate(tomorrow)}>Tomorrow · {fmtDate(tomorrow)}</button>
          <button className={date === today ? 'on' : ''} onClick={() => setDate(today)}>Today · {fmtDate(today)}</button>
        </div>
        <div className="plan-meta">
          <span className={filled === flexHours.length ? 'ok-text' : 'dim'}>{filled}/{flexHours.length} flexible hours planned</span>
          {canCopy && editable && <button className="btn ghost small" onClick={() => actions.copyPlan(prev, date)}>Copy from {fmtDate(prev, { weekday: 'short' })}</button>}
        </div>
        <p className="dim">Do this in the 10–11 PM slot. Be specific: "Finish module 3 + 20 problems" beats "study".</p>

        <ol className="hours">
          {HOURS.map(({ h, block, flex }) => {
            const item = plan.find((p) => p.hour === h);
            if (!flex) {
              const first = block && toMin(block.start) === h * 60;
              return (
                <li key={h} className="hr locked">
                  <span className="time">{pad2(h)}:00</span>
                  <span className="lock">{first ? block.title : '↳'}</span>
                </li>
              );
            }
            return (
              <li key={h} className="hr">
                <span className="time">{pad2(h)}:00</span>
                <select aria-label="Category" value={item?.cat || 'work'} disabled={!editable} onChange={(e) => actions.setSlot(date, h, { cat: e.target.value })}>
                  {PLAN_CATS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
                </select>
                <input
                  placeholder="What will you do this hour?"
                  disabled={!editable}
                  value={item?.title || ''}
                  onChange={(e) => actions.setSlot(date, h, { title: e.target.value })}
                />
                <input type="checkbox" aria-label="Done" title="Done" checked={!!item?.done} disabled={date !== today || !item?.title?.trim()} onChange={() => item && actions.togglePlan(date, item.id)} />
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

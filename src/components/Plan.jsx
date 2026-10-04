import { useState } from 'react';
import { SLEEP } from '../config.js';
import { addDays, fmtDate, planFor, slotRange } from '../lib.js';

export default function Plan({ state, actions, today, tomorrow }) {
  const [date, setDate] = useState(tomorrow);
  const day = state.days[date];
  const slots = planFor(day);
  const filled = slots.filter((s) => s.title.trim()).length;
  const editable = date >= today;
  const prev = addDays(date, -1);
  const canCopy = (state.days[prev]?.plan || []).length > 0;

  return (
    <div className="stack-lg">
      <section className="panel">
        <h2>Plan the day, 30 minutes at a time</h2>
        <div className="seg">
          <button className={date === tomorrow ? 'on' : ''} onClick={() => setDate(tomorrow)}>Tomorrow · {fmtDate(tomorrow)}</button>
          <button className={date === today ? 'on' : ''} onClick={() => setDate(today)}>Today · {fmtDate(today)}</button>
        </div>
        <div className="plan-meta">
          <span className={filled === slots.length ? 'ok-text' : 'dim'}>{filled}/{slots.length} slots planned</span>
          {canCopy && editable && <button className="btn ghost small" onClick={() => actions.copyPlan(prev, date)}>Copy from {fmtDate(prev, { weekday: 'short' })}</button>}
        </div>
        <p className="dim">Do this in the 10–11 PM slot. Every slot is yours to edit, including gym, meals and the evening. Be specific: "Finish module 3 + 20 problems" beats "study".</p>

        <ol className="hours">
          {slots.map((s) => (
            <li key={s.start} className={`hr ${s.start % 60 === 0 ? 'on-hour' : ''}`}>
              <span className="time">{slotRange(s.start)}</span>
              <input
                className={s.isDefault ? 'is-default' : ''}
                placeholder="What is expected in this slot?"
                disabled={!editable}
                value={s.title}
                onChange={(e) => actions.setSlot(date, s.start, { title: e.target.value })}
              />
              <input
                type="checkbox"
                aria-label="Done"
                title="Done"
                checked={s.done}
                disabled={date !== today || !s.title.trim()}
                onChange={() => actions.toggleSlot(date, s.start)}
              />
            </li>
          ))}
          <li className="hr sleep">
            <span className="time">{SLEEP.from}–{SLEEP.to}</span>
            <span className="lock">{SLEEP.label} · 7 hours</span>
            <span />
          </li>
        </ol>
      </section>
    </div>
  );
}

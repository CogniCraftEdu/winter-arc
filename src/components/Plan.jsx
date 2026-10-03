import { useState } from 'react';
import { SCHEDULE } from '../config.js';
import { fmtDate } from '../lib.js';

const SLOTS = SCHEDULE.filter((b) => b.kind === 'flex');

export default function Plan({ state, actions, today, tomorrow }) {
  const [date, setDate] = useState(tomorrow);
  const [slot, setSlot] = useState('am');
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('work');
  const plan = (state.days[date]?.plan) || [];

  const add = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    actions.addPlan(date, { title: title.trim(), slot, cat });
    setTitle('');
  };

  return (
    <div className="grid">
      <section className="card wide">
        <h2>Plan the flexible blocks</h2>
        <div className="pills">
          <button className={`pill ${date === tomorrow ? 'on' : ''}`} onClick={() => setDate(tomorrow)}>Tomorrow · {fmtDate(tomorrow)}</button>
          <button className={`pill ${date === today ? 'on' : ''}`} onClick={() => setDate(today)}>Today · {fmtDate(today)}</button>
        </div>
        <p className="dim">Do this in the 10–11 PM slot. Be specific: "Finish module 3 + 20 problems" beats "study".</p>

        <form className="row wrap" onSubmit={add}>
          <select value={slot} onChange={(e) => setSlot(e.target.value)}>
            {SLOTS.map((b) => <option key={b.slot} value={b.slot}>{b.start}–{b.end}</option>)}
          </select>
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="work">Work</option>
            <option value="study">Study</option>
            <option value="rest">Rest / Family</option>
            <option value="other">Other</option>
          </select>
          <input className="grow" placeholder="Task…" value={title} onChange={(e) => setTitle(e.target.value)} />
          <button className="btn primary">Add</button>
        </form>

        {SLOTS.map((b) => {
          const items = plan.filter((p) => p.slot === b.slot);
          return (
            <div key={b.slot} className="slot">
              <h3>{b.start}–{b.end}</h3>
              {items.length === 0 && <p className="warn">Empty. An empty block is where excuses live.</p>}
              {items.map((p) => (
                <div key={p.id} className="task">
                  <label>
                    <input type="checkbox" checked={p.done} disabled={date !== today} onChange={() => actions.togglePlan(date, p.id)} />
                    <span className={p.done ? 'struck' : ''}>{p.title}</span>
                  </label>
                  <button className="x" onClick={() => actions.removePlan(date, p.id)}>×</button>
                </div>
              ))}
            </div>
          );
        })}
      </section>
    </div>
  );
}

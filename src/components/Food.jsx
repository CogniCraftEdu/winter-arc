import { useState } from 'react';
import { fmtTime, sumMeals } from '../lib.js';

export default function Food({ actions, today, day, settings }) {
  const [f, setF] = useState({ name: '', kcal: '', protein: '', junk: false });
  const t = sumMeals(day);
  const pct = (v, max) => Math.min(100, (v / max) * 100);

  const add = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    actions.addMeal(today, { name: f.name.trim(), kcal: +f.kcal || 0, protein: +f.protein || 0, junk: f.junk });
    setF({ name: '', kcal: '', protein: '', junk: false });
  };

  return (
    <div className="grid">
      <section className="card">
        <h2>Calories &amp; protein</h2>
        <p>Calories <b>{t.kcal}</b> / {settings.calorieTarget}</p>
        <div className={`bar ${t.kcal > settings.calorieTarget ? 'bad' : ''}`}><i style={{ width: `${pct(t.kcal, settings.calorieTarget)}%` }} /></div>
        <p>Protein <b>{t.protein}g</b> / {settings.proteinTarget}g</p>
        <div className="bar"><i style={{ width: `${pct(t.protein, settings.proteinTarget)}%` }} /></div>

        <form className="stack" onSubmit={add}>
          <input placeholder="What did you eat?" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <div className="row">
            <input type="number" min="0" placeholder="kcal" value={f.kcal} onChange={(e) => setF({ ...f, kcal: e.target.value })} />
            <input type="number" min="0" placeholder="protein g" value={f.protein} onChange={(e) => setF({ ...f, protein: e.target.value })} />
          </div>
          <label className="check"><input type="checkbox" checked={f.junk} onChange={(e) => setF({ ...f, junk: e.target.checked })} /> This was junk food (fails today's rule)</label>
          <button className="btn primary">Log meal</button>
        </form>
      </section>

      <section className="card">
        <h2>Today's meals</h2>
        {day.meals.length === 0 && <p className="dim">Nothing logged. Log it before you eat it.</p>}
        <ul className="log">
          {day.meals.map((m) => (
            <li key={m.id}>
              <span className="time">{fmtTime(m.ts)}</span>
              <b>{m.name} {m.junk && <span className="tag bad">junk</span>}</b>
              <span className="dim">{m.kcal} kcal · {m.protein}g</span>
              <button className="x" onClick={() => actions.removeMeal(today, m.id)}>×</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

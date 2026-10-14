import { MUSCLES } from '../config.js';

const FIELDS = [['kcal', 'Calories', 'kcal'], ['p', 'Protein', 'g'], ['c', 'Carbs', 'g'], ['f', 'Fat', 'g']];

// Today's body parts, workout name and nutrition totals. Feeds the public /show page.
export default function FitnessPanel({ actions, today, day, settings }) {
  const trained = day.trained || [];
  const nut = day.nutrition || {};
  const toggle = (id) => actions.setField(today, 'trained', trained.includes(id) ? trained.filter((x) => x !== id) : [...trained, id]);
  const setNut = (k, v) => actions.setField(today, 'nutrition', { ...nut, [k]: v === '' ? '' : Math.max(0, +v) });

  return (
    <section className="panel">
      <h2>Fitness <span className="count">shown on your /show page</span></h2>
      <label className="field">Workout today
        <input placeholder="e.g. Leg day, Push, Rest" value={day.workout || ''} onChange={(e) => actions.setField(today, 'workout', e.target.value)} />
      </label>
      <h3>Body parts hit</h3>
      <div className="pills" style={{ marginTop: 6 }}>
        {MUSCLES.map((m) => (
          <button type="button" key={m.id} className={`pill ${trained.includes(m.id) ? 'on' : ''}`} onClick={() => toggle(m.id)}>{m.label}</button>
        ))}
      </div>
      <h3>Nutrition <span className="dim">target {settings.calorieTarget} kcal · {settings.proteinTarget} g protein</span></h3>
      <div className="nut-grid">
        {FIELDS.map(([k, label, unit]) => (
          <label key={k} className="field">{label} ({unit})
            <input type="number" min="0" inputMode="numeric" value={nut[k] ?? ''} onChange={(e) => setNut(k, e.target.value)} />
          </label>
        ))}
      </div>
    </section>
  );
}

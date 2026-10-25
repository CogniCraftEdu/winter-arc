import { MUSCLES } from '../config.js';

const FIELDS = [['kcal', 'Calories', 'kcal'], ['p', 'Protein', 'g'], ['c', 'Carbs', 'g'], ['f', 'Fat', 'g']];

// Today's body parts, workout name and nutrition totals. Feeds the public /show page.
export default function FitnessPanel({ actions, today, day, settings }) {
  const trained = day.trained || [];
  const nut = day.nutrition || {};
  const toggle = (id) => actions.setField(today, 'trained', trained.includes(id) ? trained.filter((x) => x !== id) : [...trained, id]);
  const setRun = (k, v) => actions.setField(today, 'run', { ...(day.run || {}), [k]: v === '' ? '' : Math.max(0, +v) });
  const setNut = (k, v) => actions.setField(today, 'nutrition', { ...nut, [k]: v === '' ? '' : Math.max(0, +v) });

  return (
    <section className="panel">
      <h2>Fitness <span className="count">feeds your public page</span></h2>
      <h3 style={{ marginTop: 0 }}>Morning run</h3>
      <div className="nut-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <label className="field">Distance (km)
          <input type="number" min="0" step="0.1" inputMode="decimal" value={day.run?.km ?? ''} onChange={(e) => setRun('km', e.target.value)} />
        </label>
        <label className="field">Time (min)
          <input type="number" min="0" inputMode="numeric" value={day.run?.min ?? ''} onChange={(e) => setRun('min', e.target.value)} />
        </label>
      </div>
      <h3>Evening gym</h3>
      <label className="field">Workout
        <input placeholder="e.g. Leg day, Push, Pull" value={day.workout || ''} onChange={(e) => actions.setField(today, 'workout', e.target.value)} />
      </label>
      <div className="dim small" style={{ marginTop: 10 }}>Body parts hit</div>
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

import { CATS, RULES, SCHEDULE } from '../config.js';
import { fmtHM, minutesOfDay, nowMinutes, sumMeals, workMs } from '../lib.js';

export default function Today({ state, actions, today, now, day, running, result, settings }) {
  const mins = nowMinutes(new Date(now));
  const worked = workMs(day, CATS, running);
  const target = settings.workTargetHours * 3600000;
  const meals = sumMeals(day);

  const hasJunk = day.meals.some((m) => m.junk);
  const overKcal = meals.kcal > settings.calorieTarget;

  return (
    <div className="grid">
      <section className="card">
        <h2>Non-negotiables <span className="dim">{result.done}/{RULES.length}</span></h2>
        <ul className="rules">
          {RULES.map((r) => {
            const on = !!result.checks[r.id];
            const locked = r.auto || (r.id === 'junk' && hasJunk);
            return (
              <li key={r.id} className={on ? 'ok' : ''}>
                <label>
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={locked}
                    onChange={(e) => actions.setCheck(today, r.id, e.target.checked)}
                  />
                  <span className="rl">
                    <b>{r.label}</b>
                    <small>
                      {r.id === 'work' && `${fmtHM(worked)} of ${settings.workTargetHours}h`}
                      {r.id === 'junk' && (hasJunk ? 'Junk meal logged — rule broken today.' : overKcal ? `Over calorie target (${meals.kcal}/${settings.calorieTarget}).` : r.hint)}
                      {r.id !== 'work' && r.id !== 'junk' && r.hint}
                    </small>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        {result.won && <div className="win">Day won. Go plan tomorrow. 💪</div>}
      </section>

      <section className="card">
        <h2>Work today</h2>
        <div className="bar big"><i style={{ width: `${Math.min(100, (worked / target) * 100)}%` }} /></div>
        <p className="dim">{fmtHM(worked)} / {settings.workTargetHours}h · {worked >= target ? 'target hit' : `${fmtHM(target - worked)} to go`}</p>
        <div className="cats">
          {CATS.map((c) => {
            const ms = [...day.sessions, ...(running ? [running] : [])].filter((s) => s.cat === c.id).reduce((t, s) => t + (s.end - s.start), 0);
            return ms > 0 && <span key={c.id} className="tag" style={{ borderColor: c.color }}>{c.label} {fmtHM(ms)}</span>;
          })}
        </div>
      </section>

      <section className="card wide">
        <h2>Today's schedule</h2>
        <ol className="sched">
          {SCHEDULE.map((b) => {
            const s = minutesOfDay(b.start);
            const e = minutesOfDay(b.end);
            const live = (mins >= s && mins < e) || (e > 1440 && mins < e - 1440); // sleep wraps past midnight
            const past = mins >= e;
            const items = b.kind === 'flex' ? day.plan.filter((p) => p.slot === b.slot) : [];
            return (
              <li key={b.start} className={`${live ? 'live' : ''} ${past ? 'past' : ''} ${b.kind}`}>
                <span className="time">{b.start}–{b.end > '24' ? '06:00' : b.end}</span>
                <div>
                  <b>{b.title}</b>
                  {b.kind === 'flex' && items.length === 0 && <div className="warn">Nothing planned. Fill this in the Plan tab.</div>}
                  {items.map((p) => (
                    <label key={p.id} className="task">
                      <input type="checkbox" checked={p.done} onChange={() => actions.togglePlan(today, p.id)} />
                      <span className={p.done ? 'struck' : ''}>{p.title}</span>
                    </label>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

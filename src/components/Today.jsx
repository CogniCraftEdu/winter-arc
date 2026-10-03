import { CATS, HABITS, RATINGS, RULES, SCHEDULE, WATER_TARGET, hoursOfBlock } from '../config.js';
import { fmtHM, minutesOfDay, nowMinutes, pad2, sumMeals, workMs } from '../lib.js';
import { quoteFor } from '../quotes.js';

const fmtMin = (m) => `${pad2(Math.floor((m % 1440) / 60))}:${pad2(m % 60)}`;

// Flatten the schedule: fixed blocks are one row, flexible blocks one row per hour.
const ROWS = SCHEDULE.flatMap((b) =>
  b.kind === 'flex'
    ? hoursOfBlock(b).map((h) => ({ key: `${b.start}-${h}`, start: h * 60, end: h * 60 + 60, hour: h, flex: true }))
    : [{ key: b.start, start: minutesOfDay(b.start), end: minutesOfDay(b.end), title: b.title }],
);

export default function Today({ actions, today, now, day, running, result, settings, dn }) {
  const mins = nowMinutes(new Date(now));
  const worked = workMs(day, CATS, running);
  const target = settings.workTargetHours * 3600000;
  const meals = sumMeals(day);
  const hasJunk = day.meals.some((m) => m.junk);
  const overKcal = meals.kcal > settings.calorieTarget;
  const [quote, author] = quoteFor(dn, today);
  const habitsDone = HABITS.filter((h) => day.habits?.[h.id]).length;

  return (
    <div className="stack-lg">
      <section className="quote">
        <p>“{quote}”</p>
        {author && <cite>{author}</cite>}
      </section>

      <section className="panel">
        <h2>The one thing</h2>
        <input
          className="lg"
          placeholder="If I do only one thing today, it is…"
          value={day.mit || ''}
          onChange={(e) => actions.setField(today, 'mit', e.target.value)}
        />
      </section>

      <div className="cols">
        <section className="panel">
          <h2>Non-negotiables <span className="count">{result.done}/{RULES.length}</span></h2>
          <ul className="rules">
            {RULES.map((r) => {
              const on = !!result.checks[r.id];
              const locked = r.auto || (r.id === 'junk' && hasJunk);
              return (
                <li key={r.id} className={on ? 'ok' : ''}>
                  <label>
                    <input type="checkbox" checked={on} disabled={locked} onChange={(e) => actions.setCheck(today, r.id, e.target.checked)} />
                    <span className="rl">
                      <b>{r.label}</b>
                      <small className={r.id === 'junk' && (hasJunk || overKcal) ? 'bad' : ''}>
                        {r.id === 'work' && `${fmtHM(worked)} of ${settings.workTargetHours}h`}
                        {r.id === 'junk' && (hasJunk ? 'Junk meal logged. Rule broken today.' : overKcal ? `Over calorie target (${meals.kcal}/${settings.calorieTarget})` : r.hint)}
                        {r.id !== 'work' && r.id !== 'junk' && r.hint}
                      </small>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {result.won && <div className="win">Day won. Plan tomorrow.</div>}
        </section>

        <div className="stack-lg">
          <section className="panel">
            <h2>Work</h2>
            <div className="stat"><b>{fmtHM(worked)}</b><span>of {settings.workTargetHours}h</span></div>
            <div className="bar"><i style={{ width: `${Math.min(100, (worked / target) * 100)}%` }} /></div>
            <div className="cats">
              {CATS.map((c) => {
                const ms = [...day.sessions, ...(running ? [running] : [])].filter((s) => s.cat === c.id).reduce((t, s) => t + (s.end - s.start), 0);
                return ms > 0 && <span key={c.id} className="tag"><i style={{ background: c.color }} />{c.label} {fmtHM(ms)}</span>;
              })}
            </div>
          </section>

          <section className="panel">
            <h2>Water <span className="count">{day.water || 0}/{WATER_TARGET}</span></h2>
            <div className="glasses">
              {Array.from({ length: WATER_TARGET }, (_, i) => (
                <button key={i} aria-label={`${i + 1} glasses`} className={i < (day.water || 0) ? 'on' : ''} onClick={() => actions.setField(today, 'water', (day.water || 0) === i + 1 ? i : i + 1)} />
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="panel">
        <h2>Schedule</h2>
        <ol className="sched">
          {ROWS.map((r) => {
            const live = (mins >= r.start && mins < r.end) || (r.end > 1440 && mins < r.end - 1440);
            const past = mins >= r.end && r.end <= 1440;
            const item = r.flex ? day.plan.find((p) => p.hour === r.hour && p.title?.trim()) : null;
            return (
              <li key={r.key} className={`${live ? 'live' : ''} ${past ? 'past' : ''} ${r.flex ? 'flex' : ''}`}>
                <span className="time">{r.flex ? `${pad2(r.hour)}:00` : `${fmtMin(r.start)}–${fmtMin(r.end)}`}</span>
                {r.flex ? (
                  item ? (
                    <label className="task">
                      <input type="checkbox" checked={item.done} onChange={() => actions.togglePlan(today, item.id)} />
                      <span className={item.done ? 'struck' : ''}>{item.title}</span>
                    </label>
                  ) : <span className="warn">Unplanned</span>
                ) : <b>{r.title}</b>}
              </li>
            );
          })}
        </ol>
      </section>

      <div className="cols">
        <section className="panel">
          <h2>Bonus habits <span className="count">{habitsDone}/{HABITS.length}</span></h2>
          <ul className="rules compact">
            {HABITS.map((h) => (
              <li key={h.id} className={day.habits?.[h.id] ? 'ok' : ''}>
                <label>
                  <input type="checkbox" checked={!!day.habits?.[h.id]} onChange={() => actions.toggleHabit(today, h.id)} />
                  <span className="rl"><b>{h.label}</b><small>{h.hint}</small></span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>Evening check-in</h2>
          {RATINGS.map((r) => (
            <div key={r.id} className="rating">
              <span>{r.label}</span>
              <div>{[1, 2, 3, 4, 5].map((n) => (
                <button key={n} className={(day.ratings?.[r.id] || 0) >= n ? 'on' : ''} onClick={() => actions.setRating(today, r.id, n)}>{n}</button>
              ))}</div>
            </div>
          ))}
          <label className="field" style={{ marginTop: 18 }}>Morning weight (kg)
            <input type="number" step="0.1" min="0" value={day.weight ?? ''} onChange={(e) => actions.setField(today, 'weight', e.target.value === '' ? '' : +e.target.value)} />
          </label>
        </section>
      </div>
    </div>
  );
}

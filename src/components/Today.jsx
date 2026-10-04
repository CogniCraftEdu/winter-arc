import { CATS, HABITS, RATINGS, RULES, WATER_TARGET } from '../config.js';
import { fmtHM, workMs } from '../lib.js';

import { quoteFor } from '../quotes.js';
import Schedule from './Schedule.jsx';
import Stopwatch from './Stopwatch.jsx';
import NotesPanel from './NotesPanel.jsx';

export default function Today({ state, actions, today, now, day, running, result, settings, dn }) {
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
        <Stopwatch state={state} actions={actions} today={today} now={now} day={day} running={running} settings={settings} />
        <section className="panel">
          <h2>Non-negotiables <span className="count">{result.done}/{RULES.length}</span></h2>
          <ul className="rules">
            {RULES.map((r) => {
              const on = !!result.checks[r.id];
              const locked = r.auto;
              return (
                <li key={r.id} className={on ? 'ok' : ''}>
                  <label>
                    <input type="checkbox" checked={on} disabled={locked} onChange={(e) => actions.setCheck(today, r.id, e.target.checked)} />
                    <span className="rl">
                      <b>{r.label}</b>
                      <small>{r.id === 'work' ? `${fmtHM(workMs(day, CATS, running))} of ${settings.workTargetHours}h` : r.hint}</small>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {result.won && <div className="win">Day won. Plan tomorrow.</div>}
        </section>
      </div>

      <Schedule actions={actions} today={today} now={now} day={day} running={running} />

      <NotesPanel state={state} actions={actions} today={today} day={day} />

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

        <div className="stack-lg">
          <section className="panel">
            <h2>Water <span className="count">{day.water || 0}/{WATER_TARGET}</span></h2>
            <div className="glasses">
              {Array.from({ length: WATER_TARGET }, (_, i) => (
                <button key={i} aria-label={`${i + 1} glasses`} className={i < (day.water || 0) ? 'on' : ''} onClick={() => actions.setField(today, 'water', (day.water || 0) === i + 1 ? i : i + 1)} />
              ))}
            </div>
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
    </div>
  );
}

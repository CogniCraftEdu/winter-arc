import { useMemo, useState } from 'react';
import { allDays, fmtDate, fmtTime } from '../lib.js';

const KINDS = [['learning', '💡 Learning'], ['win', '🏆 Win'], ['mistake', '⚠️ Mistake'], ['note', '📝 Note']];
const kindLabel = (id) => KINDS.find(([k]) => k === id)?.[1];

export default function NotesPanel({ state, actions, today, day }) {
  const [text, setText] = useState('');
  const [kind, setKind] = useState('learning');
  const [q, setQ] = useState('');

  const add = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    actions.addNote(today, { text: text.trim(), kind });
    setText('');
  };

  // Earlier days only; today's entries are shown above.
  const history = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return allDays()
      .filter((k) => k < today)
      .reverse()
      .map((k) => {
        const d = state.days[k];
        const notes = (d?.notes || []).filter((n) => !needle || n.text.toLowerCase().includes(needle));
        const reflection = d?.reflection && (!needle || d.reflection.toLowerCase().includes(needle)) ? d.reflection : '';
        return { k, notes, reflection };
      })
      .filter((x) => x.notes.length || x.reflection);
  }, [state.days, today, q]);

  return (
    <section className="panel">
      <h2>Notes <span className="count">what did I learn today?</span></h2>

      <form className="stack" style={{ marginTop: 0 }} onSubmit={add}>
        <div className="pills" style={{ margin: 0 }}>
          {KINDS.map(([id, label]) => <button type="button" key={id} className={`pill ${kind === id ? 'on' : ''}`} onClick={() => setKind(id)}>{label}</button>)}
        </div>
        <textarea rows="3" placeholder="Write it down while it's fresh…" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn primary">Add entry</button>
      </form>

      {day.notes.map((n) => (
        <div key={n.id} className="note">
          <span className="dim">{kindLabel(n.kind)} · {fmtTime(n.ts)}</span>
          <p>{n.text}</p>
          <button className="x" aria-label="Delete note" onClick={() => actions.removeNote(today, n.id)}>×</button>
        </div>
      ))}

      <h3>Evening reflection</h3>
      <textarea rows="3" placeholder="How did today go? What will I do differently tomorrow?" value={day.reflection} onChange={(e) => actions.setReflection(today, e.target.value)} />

      <details className="fold">
        <summary>Earlier notes <span className="count">{history.reduce((t, x) => t + x.notes.length, 0)}</span></summary>
        <input placeholder="Search all notes…" value={q} onChange={(e) => setQ(e.target.value)} style={{ margin: '12px 0' }} />
        {history.length === 0 && <p className="dim">{q ? 'No matches.' : 'Nothing from earlier days yet.'}</p>}
        {history.map(({ k, notes, reflection }) => (
          <div key={k} className="notegroup">
            <h3>{fmtDate(k)}</h3>
            {notes.map((n) => (
              <div key={n.id} className="note"><span className="dim">{kindLabel(n.kind)} · {fmtTime(n.ts)}</span><p>{n.text}</p></div>
            ))}
            {reflection && <div className="note reflect"><span className="dim">🌙 Reflection</span><p>{reflection}</p></div>}
          </div>
        ))}
      </details>
    </section>
  );
}

import { useMemo, useState } from 'react';
import { allDays, fmtDate, fmtTime } from '../lib.js';

const KINDS = [['learning', '💡 Learning'], ['win', '🏆 Win'], ['mistake', '⚠️ Mistake'], ['note', '📝 Note']];

export default function Notes({ state, actions, today, day }) {
  const [text, setText] = useState('');
  const [kind, setKind] = useState('learning');
  const [q, setQ] = useState('');

  const add = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    actions.addNote(today, { text: text.trim(), kind });
    setText('');
  };

  const history = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return allDays()
      .filter((k) => k <= today)
      .reverse()
      .map((k) => {
        const d = state.days[k];
        const notes = (d?.notes || []).filter((n) => !needle || n.text.toLowerCase().includes(needle));
        return { k, notes, reflection: d?.reflection || '' };
      })
      .filter((x) => x.notes.length || (x.reflection && (!needle || x.reflection.toLowerCase().includes(needle))));
  }, [state.days, today, q]);

  return (
    <div className="grid">
      <section className="card">
        <h2>What did I learn today?</h2>
        <form className="stack" onSubmit={add}>
          <div className="pills">
            {KINDS.map(([id, label]) => <button type="button" key={id} className={`pill ${kind === id ? 'on' : ''}`} onClick={() => setKind(id)}>{label}</button>)}
          </div>
          <textarea rows="3" placeholder="Write it down while it's fresh…" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn primary">Add entry</button>
        </form>

        <h3>Evening reflection</h3>
        <textarea rows="4" placeholder="How did today go? What will I do differently tomorrow?" value={day.reflection} onChange={(e) => actions.setReflection(today, e.target.value)} />
      </section>

      <section className="card">
        <h2>All entries</h2>
        <input placeholder="Search notes…" value={q} onChange={(e) => setQ(e.target.value)} />
        {history.length === 0 && <p className="dim">No entries yet.</p>}
        {history.map(({ k, notes, reflection }) => (
          <div key={k} className="notegroup">
            <h3>{fmtDate(k)}</h3>
            {notes.map((n) => (
              <div key={n.id} className="note">
                <span className="dim">{KINDS.find(([id]) => id === n.kind)?.[1]} · {fmtTime(n.ts)}</span>
                <p>{n.text}</p>
                {k === today && <button className="x" onClick={() => actions.removeNote(k, n.id)}>×</button>}
              </div>
            ))}
            {reflection && <div className="note reflect"><span className="dim">🌙 Reflection</span><p>{reflection}</p></div>}
          </div>
        ))}
      </section>
    </div>
  );
}

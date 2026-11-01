// Draws the "Day N" progress card (1080 x 1920, Instagram Story size) on a canvas and returns a PNG blob.
const FONT = "Inter, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

export function drawProgressCard({ day, weight, lost, since, score, streak, goals, handle, url }) {
  const W = 1080; const H = 1920;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b0b0e'); bg.addColorStop(1, '#14141a');
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  const text = (s, px, py, size, weight = 400, color = '#f4f4f5', align = 'center', spacing = 0) => {
    x.font = `${weight} ${size}px ${FONT}`; x.fillStyle = color; x.textAlign = align; x.textBaseline = 'alphabetic';
    if ('letterSpacing' in x) x.letterSpacing = `${spacing}px`;
    x.fillText(s, px, py);
  };
  text('FAT TO FIT', W / 2, 150, 34, 600, '#a1a1aa', 'center', 10);
  text(handle, W / 2, 205, 36, 400, '#71717a');
  text(`DAY ${day}`, W / 2, 470, 150, 800, '#f4f4f5', 'center', -4);
  if (weight != null) {
    text(weight.toFixed(1), W / 2 - 60, 800, 330, 200, '#f4f4f5', 'center', -12);
    text('kg', W / 2 + 330, 800, 70, 300, '#a1a1aa', 'left');
  }
  if (lost != null && lost > 0) { text(`−${lost.toFixed(1)} kg`, W / 2, 920, 84, 600, '#6ee7b7'); text(since ? `since ${since}` : 'since day one', W / 2, 980, 38, 400, '#a1a1aa'); }
  // goals
  const labels = { steps: 'Steps', gym: 'Gym', cal: 'Calories', vlog: 'Vlog' };
  const bx = 120; const bw = W - 240; let y = 1090;
  x.strokeStyle = 'rgba(255,255,255,.14)'; x.lineWidth = 2; x.beginPath(); x.moveTo(bx, y - 30); x.lineTo(bx + bw, y - 30); x.stroke();
  for (const g of goals) {
    text(labels[g.k], bx, y + 40, 46, 500, '#f4f4f5', 'left');
    text(g.done ? '✓' : '–', bx + bw, y + 40, 52, 700, g.done ? '#6ee7b7' : '#52525b', 'right');
    y += 98;
  }
  x.beginPath(); x.moveTo(bx, y - 20); x.lineTo(bx + bw, y - 20); x.stroke();
  if (score != null) text(`Kaizen score ${score}`, W / 2, y + 90, 56, 600, '#f4f4f5');
  text(`Streak ${streak} · every number public`, W / 2, y + 160, 36, 400, '#a1a1aa');
  text(url, W / 2, H - 110, 38, 500, '#a1a1aa');
  return new Promise((res) => c.toBlob((b) => res(b), 'image/png'));
}

// "Week N complete": a Story-sized weekly dashboard to post every Sunday.
export function drawWeekCard({ w, handle, url, goal, current }) {
  const W = 1080; const H = 1920;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b0b0e'); bg.addColorStop(1, '#14141a');
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  const text = (s, px, py, size, weight = 400, color = '#f4f4f5', align = 'center', spacing = 0) => {
    x.font = `${weight} ${size}px ${FONT}`; x.fillStyle = color; x.textAlign = align; x.textBaseline = 'alphabetic';
    if ('letterSpacing' in x) x.letterSpacing = `${spacing}px`;
    x.fillText(s, px, py);
  };
  const fmt = (k) => new Date(`${k}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  text('FAT TO FIT · WEEKLY REVIEW', W / 2, 140, 30, 600, '#a1a1aa', 'center', 8);
  text(handle, W / 2, 190, 34, 400, '#71717a');
  text(`WEEK ${w.n}`, W / 2, 400, 170, 800, '#f4f4f5', 'center', -5);
  text('COMPLETE', W / 2, 480, 56, 600, '#6ee7b7', 'center', 14);
  text(`${fmt(w.start)} – ${fmt(w.end)}`, W / 2, 545, 38, 400, '#a1a1aa');
  if (w.change != null) {
    text(`${w.change > 0 ? '+' : w.change < 0 ? '−' : ''}${Math.abs(w.change).toFixed(1)} kg`, W / 2, 790, 220, 200, w.change <= 0 ? '#6ee7b7' : '#e5c07b', 'center', -8);
    if (w.weightStart != null && w.weightEnd != null) text(`${w.weightStart.toFixed(1)}  →  ${w.weightEnd.toFixed(1)} kg`, W / 2, 870, 52, 400, '#f4f4f5');
  }
  // seven days
  const names = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const colors = { perfect: '#6ee7b7', good: '#e5c07b', low: '#f87171', rest: '#a5b4fc', none: '#27272a', future: '#18181b', before: '#18181b' };
  const gx = 110; const gw = (W - 220) / 7;
  w.states.forEach((st, i) => {
    const cx = gx + gw * i + gw / 2;
    x.fillStyle = colors[st.state]; x.beginPath(); x.roundRect?.(cx - 44, 960, 88, 88, 22); if (!x.roundRect) x.rect(cx - 44, 960, 88, 88); x.fill();
    text(st.state === 'perfect' ? '✓' : st.state === 'rest' ? 'R' : st.n != null ? String(st.n) : '–', cx, 1020, 44, 700, st.state === 'none' || st.state === 'future' || st.state === 'before' ? '#52525b' : '#09090b');
    text(names[i], cx, 1090, 30, 500, '#a1a1aa');
  });
  text(`${w.perfect} of 7 perfect days`, W / 2, 1200, 56, 600);
  const rows = [['Average steps', w.avgSteps != null ? w.avgSteps.toLocaleString('en-IN') : '–'], ['Kaizen score', w.score != null ? `${w.score} / 100` : '–']];
  rows.forEach(([k, v], i) => { text(k, 150, 1320 + i * 90, 44, 400, '#a1a1aa', 'left'); text(v, W - 150, 1320 + i * 90, 50, 600, '#f4f4f5', 'right'); });
  if (goal && current != null) text(`${current.toFixed(1)} kg now · ${(current - goal).toFixed(1)} kg to the ${goal} kg goal`, W / 2, 1560, 38, 400, '#a1a1aa');
  text(w.verdict, W / 2, 1650, 34, 400, '#71717a');
  text(url, W / 2, H - 100, 38, 500, '#a1a1aa');
  return new Promise((res) => c.toBlob((b) => res(b), 'image/png'));
}

// Stylised front/back body map. Trained regions light up; the rest stay as faint outlines.
// Each region is a simple shape: [id, kind, ...geometry]. Both figures are drawn in a 120 x 285 box.
const FRONT = [
  ['shoulders', 'e', 30, 58, 13, 9], ['shoulders', 'e', 90, 58, 13, 9],
  ['chest', 'r', 36, 50, 22, 24, 9], ['chest', 'r', 62, 50, 22, 24, 9],
  ['biceps', 'r', 13, 69, 14, 34, 7], ['biceps', 'r', 93, 69, 14, 34, 7],
  ['forearms', 'r', 9, 107, 13, 38, 6], ['forearms', 'r', 98, 107, 13, 38, 6],
  ['abs', 'r', 46, 78, 28, 48, 9],
  ['quads', 'r', 35, 131, 23, 72, 11], ['quads', 'r', 62, 131, 23, 72, 11],
  ['calves', 'r', 38, 209, 17, 62, 8], ['calves', 'r', 65, 209, 17, 62, 8],
];
const BACK = [
  ['shoulders', 'e', 30, 58, 13, 9], ['shoulders', 'e', 90, 58, 13, 9],
  ['back', 'r', 38, 47, 44, 28, 12], ['back', 'r', 31, 77, 17, 38, 8], ['back', 'r', 72, 77, 17, 38, 8], ['back', 'r', 49, 77, 22, 38, 6],
  ['triceps', 'r', 13, 69, 14, 34, 7], ['triceps', 'r', 93, 69, 14, 34, 7],
  ['forearms', 'r', 9, 107, 13, 38, 6], ['forearms', 'r', 98, 107, 13, 38, 6],
  ['glutes', 'r', 35, 119, 23, 27, 11], ['glutes', 'r', 62, 119, 23, 27, 11],
  ['hamstrings', 'r', 35, 148, 23, 56, 11], ['hamstrings', 'r', 62, 148, 23, 56, 11],
  ['calves', 'r', 38, 209, 17, 62, 8], ['calves', 'r', 65, 209, 17, 62, 8],
];

function Figure({ parts, hit, title }) {
  return (
    <svg viewBox="0 0 120 285" role="img" aria-label={title} className="bm-fig">
      <circle cx="60" cy="22" r="14" className="bm-base" />
      <rect x="54" y="35" width="12" height="11" rx="4" className="bm-base" />
      {parts.map(([id, kind, a, b, c, d, r], i) => {
        const on = hit.has(id);
        const cls = on ? 'bm-hit' : 'bm-off';
        return kind === 'e'
          ? <ellipse key={i} cx={a} cy={b} rx={c} ry={d} className={cls} />
          : <rect key={i} x={a} y={b} width={c} height={d} rx={r} className={cls} />;
      })}
    </svg>
  );
}

export default function BodyMap({ trained }) {
  const hit = new Set(trained);
  return (
    <div className="bm">
      <figure><Figure parts={FRONT} hit={hit} title="Front view" /><figcaption>Front</figcaption></figure>
      <figure><Figure parts={BACK} hit={hit} title="Back view" /><figcaption>Back</figcaption></figure>
    </div>
  );
}

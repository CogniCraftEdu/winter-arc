const PATHS = {
  today: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4M12 8a4 4 0 100 8 4 4 0 000-8z',
  timer: 'M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z',
  plan: 'M4 6h16M4 12h16M4 18h10',
  food: 'M7 3v8a2 2 0 002 2v8M11 3v8M17 3c-2 2-2 6 0 8v10',
  notes: 'M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3',
  journey: 'M4 19V5M4 19h16M8 15l4-4 3 3 5-6',
};
export default function Icon({ name }) {
  return (
    <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

import { useEffect, useState } from 'react';
import { todayKey } from './lib.js';

// Re-renders every second so clocks and "current block" stay live.
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export const useToday = () => {
  useNow(30000);
  return todayKey();
};

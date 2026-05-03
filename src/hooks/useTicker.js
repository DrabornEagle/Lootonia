import { useEffect, useState } from 'react';

export function useTicker(enabled = false, intervalMs = 1000) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setTick((value) => value + 1), intervalMs);
    return () => clearInterval(timer);
  }, [enabled, intervalMs]);

  return tick;
}

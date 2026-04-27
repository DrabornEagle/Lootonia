import { useEffect, useMemo, useState } from 'react';

function formatCountdown(ms) {
  const safe = Math.max(0, Number(ms || 0));
  const totalSeconds = Math.floor(safe / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}g ${String(remHours).padStart(2, '0')}sa`;
  }

  if (hours > 0) return `${String(hours).padStart(2, '0')}sa ${String(minutes).padStart(2, '0')}dk`;
  if (minutes > 0) return `${String(minutes).padStart(2, '0')}dk ${String(seconds).padStart(2, '0')}sn`;
  return `${String(seconds).padStart(2, '0')}sn`;
}

export function useEventCountdown(endsAtIso, disabled = false) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (disabled || !endsAtIso) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [disabled, endsAtIso]);

  return useMemo(() => {
    if (disabled || !endsAtIso) {
      return { label: 'Süre gizli', expired: false, secondsLeft: null };
    }
    const endMs = new Date(endsAtIso).getTime();
    const diff = Math.max(0, endMs - now);
    return {
      label: diff > 0 ? `Kalan: ${formatCountdown(diff)}` : 'Süre doldu',
      expired: diff <= 0,
      secondsLeft: Math.floor(diff / 1000),
    };
  }, [disabled, endsAtIso, now]);
}

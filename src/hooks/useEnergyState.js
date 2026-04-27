import { useMemo } from 'react';
import { ENERGY_REGEN_SECONDS } from '../constants/game';
import { formatRemain } from '../utils/text';

export function useEnergyState(profile, tick) {
  return useMemo(() => {
    void tick;
    if (!profile) return { energy: 0, max: 0, nextText: '—' };

    const max = Math.max(1, Math.min(10, Number(profile.energy_max ?? 10)));
    const base = Math.max(0, Math.min(Number(profile.energy ?? 0), max));
    const lockUntil = Number(profile._energy_lock_until || 0);
    const now = Date.now();

    if (base >= max) return { energy: base, max, nextText: 'FULL' };
    if (lockUntil > now) {
      const remainLock = Math.max(1, Math.ceil((lockUntil - now) / 1000));
      return { energy: base, max, nextText: formatRemain(remainLock) };
    }

    const updatedMs = new Date(profile.energy_updated_at).getTime();
    const elapsedSec = Math.max(0, Math.floor((now - updatedMs) / 1000));
    const add = Math.floor(elapsedSec / ENERGY_REGEN_SECONDS);
    const computed = Math.min(base + add, max);

    if (computed >= max) return { energy: max, max, nextText: 'FULL' };

    const remain = ENERGY_REGEN_SECONDS - (elapsedSec % ENERGY_REGEN_SECONDS);
    return { energy: computed, max, nextText: formatRemain(remain) };
  }, [profile, tick]);
}

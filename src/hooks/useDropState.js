import { InteractionManager } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { dayKey } from '../utils/date';
import { getDropDistanceState, getDropPriority, haversineMeters } from '../utils/geo';

export function useDropHelpers(loc, userDrops, tick) {
  const isNear = useCallback((drop) => {
    if (drop?.lat == null || drop?.lng == null) return { ok: true, distance: null };
    if (!loc) return { ok: false, distance: null };
    const distance = haversineMeters(loc.lat, loc.lng, drop.lat, drop.lng);
    return { ok: distance <= drop.radius_m, distance };
  }, [loc]);

  const getCooldown = useCallback((drop) => {
    void tick;
    const lastOpenedAt = userDrops[String(drop.id)];
    if (!lastOpenedAt) return { isCooldown: false, remainSec: 0, nextAt: null };

    const nextMs = new Date(lastOpenedAt).getTime() + (drop.cooldown_seconds || 0) * 1000;
    const remainMs = nextMs - Date.now();
    return remainMs > 0
      ? { isCooldown: true, remainSec: remainMs / 1000, nextAt: new Date(nextMs).toISOString() }
      : { isCooldown: false, remainSec: 0, nextAt: null };
  }, [tick, userDrops]);

  return { isNear, getCooldown };
}

export function useDropDerived({ drops, bossState, activeDropId, isNear, getCooldown }) {
  const hiddenBossIdsToday = useMemo(() => {
    if (bossState?.day !== dayKey()) return new Set();

    const escaped = Array.isArray(bossState?.escaped_drop_ids)
      ? bossState.escaped_drop_ids.map((value) => String(value))
      : [];

    const solved = Array.isArray(bossState?.solved_drop_ids)
      ? bossState.solved_drop_ids.map((value) => String(value))
      : [];

    return new Set([...escaped, ...solved]);
  }, [bossState?.day, bossState?.escaped_drop_ids, bossState?.solved_drop_ids]);

  const coalesceDropVisibility = useCallback((drop) => {
    if (!drop) return false;
    if (drop.is_active === false) return false;

    const dropId = String(drop.id || '');
    const type = String(drop.type || '').toLowerCase();

    if (type === 'boss' && hiddenBossIdsToday.has(dropId)) return false;
    return true;
  }, [hiddenBossIdsToday]);

  const visibleDrops = useMemo(() => (
    (drops || []).filter((drop) => coalesceDropVisibility(drop))
  ), [drops, coalesceDropVisibility]);

  const visibleDropEntries = useMemo(() => visibleDrops.map((drop) => {
    const near = isNear(drop);
    const cooldown = getCooldown(drop);
    const priority = getDropPriority(drop, near, cooldown);
    const distance = near?.distance ?? 999999;
    const hasCoords = drop.lat != null && drop.lng != null;
    const stroke = cooldown.isCooldown
      ? 'rgba(155,89,182,0.95)'
      : near.ok
        ? 'rgba(46,204,113,0.9)'
        : 'rgba(241,196,15,0.9)';
    const fill = cooldown.isCooldown
      ? 'rgba(155,89,182,0.14)'
      : near.ok
        ? 'rgba(46,204,113,0.15)'
        : 'rgba(241,196,15,0.12)';

    return {
      drop,
      near,
      cooldown,
      priority,
      distance,
      hasCoords,
      stroke,
      fill,
    };
  }), [visibleDrops, isNear, getCooldown]);

  const [sortedVisibleEntries, setSortedVisibleEntries] = useState(visibleDropEntries);
  const [deferredPreviewReady, setDeferredPreviewReady] = useState(true);

  useEffect(() => {
    if (visibleDropEntries.length <= 1) {
      setSortedVisibleEntries(visibleDropEntries);
      setDeferredPreviewReady(true);
      return undefined;
    }

    let cancelled = false;
    let completed = false;

    const sortEntries = () => visibleDropEntries
      .slice()
      .sort((dkd_left_item, dkd_right_item) => {
        if (dkd_right_item.priority !== dkd_left_item.priority) return dkd_right_item.priority - dkd_left_item.priority;
        return dkd_left_item.distance - dkd_right_item.distance;
      });

    const commitSorted = () => {
      if (cancelled || completed) return;
      completed = true;
      setSortedVisibleEntries(sortEntries());
      setDeferredPreviewReady(true);
    };

    setSortedVisibleEntries(visibleDropEntries);
    setDeferredPreviewReady(false);

    const fallbackId = setTimeout(commitSorted, 48);
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      clearTimeout(fallbackId);
      commitSorted();
    });

    return () => {
      cancelled = true;
      clearTimeout(fallbackId);
      interactionTask?.cancel?.();
    };
  }, [visibleDropEntries]);

  const markerDrops = useMemo(() => visibleDropEntries
    .filter((entry) => entry.hasCoords)
    .map(({ drop, near, cooldown, stroke, fill }) => ({ drop, near, cooldown, stroke, fill })), [visibleDropEntries]);

  const sortedVisibleDrops = useMemo(() => (
    sortedVisibleEntries.map((entry) => entry.drop)
  ), [sortedVisibleEntries]);

  const activeEntry = useMemo(() => (
    activeDropId
      ? visibleDropEntries.find((entry) => String(entry.drop.id) === String(activeDropId)) || null
      : null
  ), [activeDropId, visibleDropEntries]);

  const activeDrop = activeEntry?.drop || null;
  const activeNear = activeEntry?.near || { ok: false, distance: null };
  const activeDropCooldown = activeEntry?.cooldown || { isCooldown: false, remainSec: 0, nextAt: null };

  return {
    hiddenBossIdsToday,
    hiddenBossCountToday: hiddenBossIdsToday.size,
    visibleDrops,
    activeDrop,
    activeNear,
    markerDrops,
    sortedVisibleDrops,
    dockPreview: sortedVisibleEntries[0]?.drop || null,
    dockPreviewPending: !deferredPreviewReady,
    activeDropCooldown,
    activeDropDistanceState: getDropDistanceState(activeNear),
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { haversineMeters } from '../utils/geo';

const FALLBACK_LOCATION = { lat: 39.92077, lng: 32.85411 };
const WATCH_TIME_INTERVAL_MS = 2200;
const WATCH_DISTANCE_INTERVAL_M = 4;
const MIN_STATE_UPDATE_DISTANCE_M = 2;
const MIN_HEADING_STEP_DEG = 14;
const HEADING_SNAP_DEG = 10;

export function useLocationTracker(enabled = false) {
  const [loc, setLoc] = useState(null);
  const [locPerm, setLocPerm] = useState(null);
  const [loadingMap, setLoadingMap] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [retryTick, setRetryTick] = useState(0);
  const headingRef = useRef(0);

  const retryLocation = useCallback(() => {
    setRetryTick((value) => value + 1);
  }, []);

  const normalizeHeading = useCallback((value) => {
    const dkd_iteration_value = Number(value);
    if (!Number.isFinite(dkd_iteration_value)) return headingRef.current || 0;
    const normalized = ((dkd_iteration_value % 360) + 360) % 360;
    return Math.round(normalized / HEADING_SNAP_DEG) * HEADING_SNAP_DEG % 360;
  }, []);

  const commitLocation = useCallback((next) => {
    if (!next?.lat || !next?.lng) return;
    const nextHeading = normalizeHeading(next.heading);

    setLoc((prev) => {
      if (!prev?.lat || !prev?.lng) return { ...next, heading: nextHeading };
      const movedMeters = haversineMeters(prev.lat, prev.lng, next.lat, next.lng);
      const headingDelta = Math.abs((((nextHeading - Number(prev.heading || 0)) + 540) % 360) - 180);
      if (movedMeters < MIN_STATE_UPDATE_DISTANCE_M && headingDelta < MIN_HEADING_STEP_DEG) return prev;
      return {
        lat: next.lat,
        lng: next.lng,
        heading: headingDelta >= MIN_HEADING_STEP_DEG ? nextHeading : Number(prev.heading || nextHeading),
      };
    });
  }, [normalizeHeading]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let watcher = null;
    let headingWatcher = null;

    (async () => {
      setLoadingMap(true);
      setLocationError(null);

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;

        const ok = status === 'granted';
        setLocPerm(ok);

        if (!ok) {
          setLocationError('Konum izni verilmedi.');
          setLoadingMap(false);
          return;
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });
        if (cancelled) return;

        commitLocation({
          lat: current.coords.latitude,
          lng: current.coords.longitude,
          heading: headingRef.current || current.coords.heading || 0,
        });

        watcher = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Highest,
            timeInterval: WATCH_TIME_INTERVAL_MS,
            distanceInterval: WATCH_DISTANCE_INTERVAL_M,
          },
          (position) => {
            if (cancelled) return;
            commitLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              heading: headingRef.current || position.coords.heading || 0,
            });
          }
        );

        try {
          headingWatcher = await Location.watchHeadingAsync((headingState) => {
            if (cancelled) return;
            const trueHeading = Number(headingState?.trueHeading);
            const magHeading = Number(headingState?.magHeading);
            const nextHeading = Number.isFinite(trueHeading) && trueHeading >= 0 ? trueHeading : magHeading;
            if (!Number.isFinite(nextHeading) || nextHeading < 0) return;
            headingRef.current = normalizeHeading(nextHeading);
            setLoc((prev) => {
              if (!prev?.lat || !prev?.lng) return prev;
              const currentHeading = Number(prev.heading || 0);
              const snappedHeading = normalizeHeading(nextHeading);
              const delta = Math.abs((((snappedHeading - currentHeading) + 540) % 360) - 180);
              if (delta < MIN_HEADING_STEP_DEG) return prev;
              return { ...prev, heading: snappedHeading };
            });
          });
        } catch (_headingError) {
          // ignore heading watcher errors on unsupported devices
        }

        if (cancelled) {
          watcher?.remove?.();
          headingWatcher?.remove?.();
          return;
        }

        setLoadingMap(false);
      } catch (_error) {
        if (cancelled) return;
        setLoc(FALLBACK_LOCATION);
        setLocationError('Konum alınamadı. Telefon GPS’i açıp tekrar dene.');
        setLoadingMap(false);
      }
    })();

    return () => {
      cancelled = true;
      watcher?.remove?.();
      headingWatcher?.remove?.();
    };
  }, [commitLocation, enabled, retryTick, normalizeHeading]);

  return { loc, locPerm, loadingMap, locationError, retryLocation };
}

import { useEffect, useState } from 'react';
import { haversineMeters } from '../utils/geo';

const DEFAULT_WAIT_MS = 1200;
const MIN_COMMIT_DISTANCE_M = 14;

export function useThrottledLocation(loc, waitMs = DEFAULT_WAIT_MS) {
  const [throttledLoc, setThrottledLoc] = useState(loc || null);

  useEffect(() => {
    if (!loc?.lat || !loc?.lng) return;

    const shouldCommitNow = !throttledLoc?.lat
      || !throttledLoc?.lng
      || haversineMeters(throttledLoc.lat, throttledLoc.lng, loc.lat, loc.lng) >= MIN_COMMIT_DISTANCE_M;

    if (shouldCommitNow) {
      setThrottledLoc(loc);
      return;
    }

    const timer = setTimeout(() => {
      setThrottledLoc(loc);
    }, waitMs);

    return () => clearTimeout(timer);
  }, [loc, throttledLoc, waitMs]);

  return throttledLoc || loc || null;
}

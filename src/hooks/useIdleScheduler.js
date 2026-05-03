import { InteractionManager } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';

function cancelEntry(entry) {
  entry?.interaction?.cancel?.();
  if (entry?.timeoutId) clearTimeout(entry.timeoutId);
}

export function useIdleScheduler({ delay = 32 } = {}) {
  const entriesRef = useRef(new Map());
  const [pendingMap, setPendingMap] = useState({});

  const clearPending = useCallback((key) => {
    setPendingMap((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const cancel = useCallback((key) => {
    const entry = entriesRef.current.get(key);
    if (entry) {
      cancelEntry(entry);
      entriesRef.current.delete(key);
    }
    clearPending(key);
  }, [clearPending]);

  const schedule = useCallback((key, task, options = {}) => {
    if (!key || typeof task !== 'function') return false;

    cancel(key);
    setPendingMap((prev) => (prev[key] ? prev : { ...prev, [key]: true }));

    const complete = () => {
      entriesRef.current.delete(key);
      clearPending(key);
    };

    const run = () => {
      try {
        task();
      } finally {
        complete();
      }
    };

    const interaction = InteractionManager.runAfterInteractions(() => {
      const timeoutId = setTimeout(run, Number.isFinite(options.delay) ? options.delay : delay);
      const current = entriesRef.current.get(key);
      if (current) current.timeoutId = timeoutId;
    });

    entriesRef.current.set(key, { interaction, timeoutId: null });
    return true;
  }, [cancel, clearPending, delay]);

  useEffect(() => () => {
    Array.from(entriesRef.current.values()).forEach(cancelEntry);
    entriesRef.current.clear();
  }, []);

  return {
    pendingMap,
    schedule,
    cancel,
  };
}

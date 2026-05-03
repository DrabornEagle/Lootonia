import { useCallback, useRef } from 'react';

function wait(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useRefreshScheduler() {
  const chainRef = useRef(Promise.resolve());
  const pendingRef = useRef(new Map());

  const scheduleRefresh = useCallback((key, task, options = {}) => {
    const taskKey = String(key || 'refresh');
    if (typeof task !== 'function') return Promise.resolve(null);

    const reusePending = options?.reusePending !== false;
    if (reusePending && pendingRef.current.has(taskKey)) {
      return pendingRef.current.get(taskKey);
    }

    let tracked;
    const runTask = async () => {
      await wait(options?.delayMs || 0);
      return task();
    };

    const next = chainRef.current
      .catch(() => {})
      .then(runTask);

    chainRef.current = next.catch(() => {});

    tracked = next.finally(() => {
      if (pendingRef.current.get(taskKey) === tracked) {
        pendingRef.current.delete(taskKey);
      }
    });

    pendingRef.current.set(taskKey, tracked);
    return tracked;
  }, []);

  const scheduleBatch = useCallback((entries = []) => {
    const list = Array.isArray(entries) ? entries : [];
    return Promise.allSettled(
      list
        .filter(Boolean)
        .map((entry, index) => {
          if (typeof entry === 'function') {
            return scheduleRefresh(`refresh:${index}`, entry);
          }
          const key = String(entry?.key || `refresh:${index}`);
          const run = entry?.run;
          const options = entry?.options || {};
          return scheduleRefresh(key, run, options);
        })
    );
  }, [scheduleRefresh]);

  return {
    scheduleRefresh,
    scheduleBatch,
  };
}

export default useRefreshScheduler;

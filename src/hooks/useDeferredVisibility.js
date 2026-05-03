import { useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

export function useDeferredVisibility(visible, enabled = true) {
  const [shouldRender, setShouldRender] = useState(() => (!enabled ? visible : false));

  useEffect(() => {
    if (!enabled) {
      setShouldRender(visible);
      return undefined;
    }

    if (!visible) {
      setShouldRender(false);
      return undefined;
    }

    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      if (!cancelled) setShouldRender(true);
    });

    return () => {
      cancelled = true;
      task?.cancel?.();
    };
  }, [enabled, visible]);

  return shouldRender;
}

export default useDeferredVisibility;

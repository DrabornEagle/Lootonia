import { useCallback, useEffect } from 'react';

// Faz 23.4 scaffold
// Buraya tasinacaklar:
// - handleBottomNavChange
// - handleNotificationNavigate
// - attachNotificationRouteListener useEffect
export function useGameNavigation() {
  const notReady = useCallback(() => {
    throw new Error('useGameNavigation scaffold hazir ama henuz baglanmadi.');
  }, []);

  useEffect(() => {
    // intentionally empty scaffold
  }, []);

  return {
    handleBottomNavChange: notReady,
    handleNotificationNavigate: notReady,
  };
}

export default useGameNavigation;

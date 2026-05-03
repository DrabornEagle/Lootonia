import { useCallback } from 'react';

// Faz 23.4 scaffold
// Buraya tasinacaklar:
// - recenterToCurrentLocation
// - openDirections
// - handleDropOpen
// - handleMapMarkerPress
// - openDropList
// - openActionMenu
export function useGameMapActions() {
  const notReady = useCallback(() => {
    throw new Error('useGameMapActions scaffold hazir ama henuz baglanmadi.');
  }, []);

  return {
    recenterToCurrentLocation: notReady,
    openDirections: notReady,
    handleDropOpen: notReady,
    handleMapMarkerPress: notReady,
    openDropList: notReady,
    openActionMenu: notReady,
  };
}

export default useGameMapActions;

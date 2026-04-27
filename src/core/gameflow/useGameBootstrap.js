import { useCallback, useEffect } from 'react';

// Faz 23.4 scaffold
// Buraya tasinacaklar:
// - refreshDrops
// - refreshUserDrops
// - bridgeSetDbReadyFlags
// - ilk bootstrap useEffect
// - push runtime/register useEffect
// - onboarding completion useEffect
//
// Not: Bu dosya henuz runtime'a bagli degil. Once GameFlow icindeki kodlar
// asamali olarak buraya alinacak.
export function useGameBootstrap() {
  const notReady = useCallback(() => {
    throw new Error('useGameBootstrap scaffold hazir ama henuz baglanmadi.');
  }, []);

  useEffect(() => {
    // intentionally empty scaffold
  }, []);

  return {
    refreshDrops: notReady,
    refreshUserDrops: notReady,
    bridgeSetDbReadyFlags: notReady,
  };
}


export default useGameBootstrap;

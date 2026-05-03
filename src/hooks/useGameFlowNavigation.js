import { useCallback } from 'react';
import { Alert, InteractionManager } from 'react-native';
import { getFeatureGate, isFeatureUnlocked } from '../utils/unlocks';
import { applyNotificationRoute, resolveNotificationRoute } from '../services/notificationRouteHandler';

export function useGameFlowNavigation({
  profile,
  isAdmin,
  initDailyStates,
  syncDailyProgress,
  syncWeeklyProgress,
  loadCollection,
  loadMarket,
  loadLeaderboard,
  setLeaderMetric,
  setLeaderWeekOffset,
  setActiveTab,
  setCollectionOpen,
  setHistoryOpen,
  setCourierBoardOpen,
  setAdminMenuOpen,
  setScannerOpen,
  setActionMenuOpen,
  setDropListOpen,
  setActiveDropId,
}) {
  const runAfterInteractions = useCallback((work) => {
    InteractionManager.runAfterInteractions(() => {
      try {
        work?.();
      } catch (error) {
        console.log('[Lootonia][afterInteractions]', error?.message || String(error));
      }
    });
  }, []);

  const collapsePrimaryOverlays = useCallback(() => {
    setCollectionOpen(false);
    setHistoryOpen(false);
  }, [setCollectionOpen, setHistoryOpen]);

  const handleBottomNavChange = useCallback((tab) => {
    const gate = getFeatureGate(tab);
    if (gate && !isFeatureUnlocked(profile, tab)) {
      Alert.alert(
        'Kilitli Ozellik',
        `${gate.label} icin en az Lvl ${gate.level} gerekli. Profil ekranindan ilerleme durumunu gorebilirsin.`
      );
      return;
    }

    setActiveTab(tab);

    if (tab === 'map') {
      collapsePrimaryOverlays();
      return;
    }
    if (tab === 'collection') {
      setHistoryOpen(false);
      setCollectionOpen(true);
      runAfterInteractions(() => {
        loadCollection();
      });
      return;
    }
    if (tab === 'market') {
      collapsePrimaryOverlays();
      runAfterInteractions(() => {
        loadMarket();
      });
      return;
    }
    if (tab === 'tasks') {
      collapsePrimaryOverlays();
      runAfterInteractions(() => {
        initDailyStates();
        syncDailyProgress();
        syncWeeklyProgress();
      });
      return;
    }
    if (tab === 'leader') {
      collapsePrimaryOverlays();
      setLeaderMetric('courier');
      setLeaderWeekOffset(0);
      runAfterInteractions(() => {
        loadLeaderboard('courier', 0);
      });
    }
  }, [
    collapsePrimaryOverlays,
    initDailyStates,
    loadCollection,
    loadLeaderboard,
    loadMarket,
    profile,
    runAfterInteractions,
    setActiveTab,
    setCollectionOpen,
    setHistoryOpen,
    setLeaderMetric,
    setLeaderWeekOffset,
    syncDailyProgress,
    syncWeeklyProgress,
  ]);

  const handleNotificationNavigate = useCallback((payload) => {
    const resolved = resolveNotificationRoute(payload);
    applyNotificationRoute(resolved, {
      isAdmin,
      openTab: (tab) => handleBottomNavChange(tab),
      openCourier: () => {
        setActiveTab('map');
        collapsePrimaryOverlays();
        setCourierBoardOpen(true);
      },
      openAdmin: () => {
        if (!isAdmin) return;
        setActiveTab('map');
        collapsePrimaryOverlays();
        setAdminMenuOpen(true);
      },
      openScanner: () => {
        setActiveTab('map');
        collapsePrimaryOverlays();
        setScannerOpen(true);
      },
      setDropId: (id) => setActiveDropId(id),
    });
  }, [
    collapsePrimaryOverlays,
    handleBottomNavChange,
    isAdmin,
    setActiveDropId,
    setActiveTab,
    setAdminMenuOpen,
    setCourierBoardOpen,
    setScannerOpen,
  ]);

  const openDropList = useCallback(() => setDropListOpen(true), [setDropListOpen]);
  const openActionMenu = useCallback(() => setActionMenuOpen(true), [setActionMenuOpen]);

  return {
    handleBottomNavChange,
    handleNotificationNavigate,
    openDropList,
    openActionMenu,
  };
}

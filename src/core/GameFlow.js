import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, BackHandler, Easing, Linking } from 'react-native';
import { signOutSession } from '../services/authService';
import { fetchActiveDrops, fetchUserDrops } from '../services/dropService';
import { clamp, etaTextFromDistance, getDropDistanceState, getDropVisual } from '../utils/geo';
import { formatInt, trDropType } from '../utils/text';
import { nextBossReturnText } from '../utils/date';
import { useDropDerived, useDropHelpers } from '../hooks/useDropState';
import { useEnergyState } from '../hooks/useEnergyState';
import { useLocationTracker } from '../hooks/useLocationTracker';
import { useTicker } from '../hooks/useTicker';
import { useTaskProgress } from '../hooks/useTaskProgress';
import { useBossBattle } from '../hooks/useBossBattle';
import { useAdminData } from '../hooks/useAdminData';
import { useBusinessAdminData } from '../hooks/useBusinessAdminData';
import { useLeaderboardData } from '../hooks/useLeaderboardData';
import { useMarketData } from '../hooks/useMarketData';
import { useProfileData } from '../hooks/useProfileData';
import { useHistoryData } from '../hooks/useHistoryData';
import { useCollectionActions } from '../hooks/useCollectionActions';
import { useChestActions } from '../hooks/useChestActions';
import { useDailyRewardState } from '../hooks/useDailyRewardState';
import { useAchievementsState } from '../hooks/useAchievementsState';
import { useClanState } from '../hooks/useClanState';
import AppShell from './AppShell';
import { getFeatureGate, isFeatureUnlocked } from '../utils/unlocks';
import {
  attachNotificationRouteListener,
  dkd_sync_boss_ready_notification,
  primeNotificationsRuntime,
  registerDeviceForRemotePush,
} from '../services/notificationService';
import { applyNotificationRoute, resolveNotificationRoute } from '../services/notificationRouteHandler';
import { hasCompletedOnboarding } from '../services/onboardingService';
import { buildHomeProps, buildModalProps, buildOnboardingProps, getHasVisibleModal } from './propBuilders';
import { buildPlayerCardPayload, buildSocialCollectionSummary } from '../services/socialProfileService';

export default function GameFlow({ session, onSignedOut }) {
  const [profile, setProfile] = useState(null);
  const [drops, setDrops] = useState([]);
  const [userDrops, setUserDrops] = useState({});
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const energyTick = useTicker(!!session?.user?.id);
  const liveOpsActionRef = useRef(async () => null);

  const tokenScale = useRef(new Animated.Value(1)).current;
  const prevTokenRef = useRef(null);
  const mapRef = useRef(null);
  const dbReadySetterRef = useRef(() => {});

  const { loc, locationError, retryLocation } = useLocationTracker(!!session?.user?.id);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeDropId, setActiveDropId] = useState(null);
  const [dropListOpen, setDropListOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [courierBoardOpen, setCourierBoardOpen] = useState(false);
  const [socialCardOpen, setSocialCardOpen] = useState(false);
  const [socialCompareOpen, setSocialCompareOpen] = useState(false);
  const [clanOpen, setClanOpen] = useState(false);

  const [cardDetail, setCardDetail] = useState(null);
  const [favMap, setFavMap] = useState({});
  const [collectionOpen, setCollectionOpen] = useState(false);

  const [activeTab, setActiveTab] = useState('map');

  const [adminOpen, setAdminOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [adminDropsOpen, setAdminDropsOpen] = useState(false);
  const [adminUsersOpen, setAdminUsersOpen] = useState(false);
  const [adminCourierJobsOpen, setAdminCourierJobsOpen] = useState(false);
  const [adminBroadcastOpen, setAdminBroadcastOpen] = useState(false);
  const [adminMarketOpen, setAdminMarketOpen] = useState(false);
  const [adminBossOpen, setAdminBossOpen] = useState(false);
  const [adminBusinessOpen, setAdminBusinessOpen] = useState(false);

  const refreshDrops = useCallback(async () => {
    const { data, error } = await fetchActiveDrops();
    if (error) {
      console.log('[Lootonia][refreshDrops]', error?.message || String(error));
      setDrops([]);
      return [];
    }
    setDrops(data || []);
    return data || [];
  }, []);

  const refreshUserDrops = useCallback(async () => {
    const { data, error } = await fetchUserDrops();
    if (error) {
      console.log('[Lootonia][refreshUserDrops]', error?.message || String(error));
      setUserDrops({});
      return {};
    }
    const map = {};
    (data || []).forEach((row) => {
      if (row.drop_id && row.last_opened_at) map[String(row.drop_id)] = row.last_opened_at;
    });
    setUserDrops(map);
    return map;
  }, []);

  const bridgeSetDbReadyFlags = useCallback((nextTasksDbReady, nextWeeklyDbReady) => {
    dbReadySetterRef.current?.(nextTasksDbReady, nextWeeklyDbReady);
  }, []);

  const {
    isAdmin,
    refreshProfile,
    bootstrapProfile,
    saveProfileNick,
    grantXp,
  } = useProfileData({
    sessionUserId: session?.user?.id,
    setProfile,
    setDbReadyFlags: bridgeSetDbReadyFlags,
  });

  const {
    historyLoading,
    historyLogs,
    loadHistory,
  } = useHistoryData({ sessionUserId: session?.user?.id });

  const {
    collectionLoading,
    collectionCards,
    userCardsRaw,
    recycleLoading,
    shardExchangeLoading,
    shardCraftLoading,
    shardUpgradeLoading,
    bossTicketLoading,
    loadCollection,
    recycleDuplicatesAll,
    exchangeShards,
    craftShardCard,
    upgradeShardCard,
    craftBossTicket,
  } = useCollectionActions({
    sessionUserId: session?.user?.id,
    refreshProfile,
    loadHistory,
    onLiveOpsAction: (...args) => liveOpsActionRef.current?.(...args),
    onAchievementAction: (...args) => trackAchievementAction?.(...args),
  });

  const {
    marketLoading,
    listings,
    myListings,
    loadMarket,
    listCardForSale,
    cancelListing,
    buyListing,
  } = useMarketData({
    sessionUserId: session?.user?.id,
    refreshProfile,
    loadCollection,
    onLiveOpsAction: (...args) => liveOpsActionRef.current?.(...args),
    onAchievementAction: (...args) => trackAchievementAction?.(...args),
  });

  useEffect(() => {
    if (activeTab !== 'market') return;
    loadCollection?.({ force: true });
    loadMarket?.({ force: true });
  }, [activeTab, loadCollection, loadMarket]);

  const {
    tasksDbReady,
    weeklyDbReady,
    taskState,
    weeklyTaskState,
    setDbReadyFlags,
    ensureTaskStates,
    syncDailyProgress,
    syncWeeklyProgress,
    claimTask,
    bumpChestsOpened,
    markBossSolved,
  } = useTaskProgress({
    sessionUserId: session?.user?.id,
    profile,
    setProfile,
    userCardsRaw,
    collectionCards,
    grantXp,
    onAchievementAction: (...args) => trackAchievementAction?.(...args),
  });


  const {
    liveOpsState,
    rewardModalOpen,
    claimLoading: claimLiveOpsLoading,
    eventClaimLoading,
    rewardHubLoading: liveOpsRewardHubLoading,
    adminSaving: liveOpsAdminSaving,
    openRewardModal,
    closeRewardModal,
    claimTodayReward: claimTodayLiveOpsReward,
    claimEventTask: claimLiveOpsEventTask,
    claimStreakMilestoneReward: claimLiveOpsStreakMilestone,
    openEventChestReward: openLiveOpsEventChest,
    redeemStoreItemReward: redeemLiveOpsStoreItem,
    cycleEvent: cycleLiveOpsEvent,
    toggleEnabled: toggleLiveOpsEnabled,
    toggleAutoRotate: toggleLiveOpsAutoRotate,
    selectEventPreset: selectLiveOpsEventPreset,
    selectWeeklyPlan: selectLiveOpsWeeklyPlan,
    trackLiveOpsAction,
  } = useDailyRewardState({
    sessionUserId: session?.user?.id,
    profile,
    setProfile,
    refreshProfile,
    taskState,
    weeklyTaskState,
  });

  useEffect(() => {
    liveOpsActionRef.current = trackLiveOpsAction || (async () => null);
  }, [trackLiveOpsAction]);

  const {
    achievementsState,
    achievementsOpen,
    setAchievementsOpen,
    claimAchievementLoading,
    refreshAchievements,
    trackAchievementAction,
    claimAchievement,
    selectFavoriteAchievement,
    reorderAchievementShelf,
    dismissAchievementToast,
  } = useAchievementsState({
    sessionUserId: session?.user?.id,
    profile,
    setProfile,
  });

  useEffect(() => {
    dbReadySetterRef.current = setDbReadyFlags;
  }, [setDbReadyFlags]);

  const {
    bossState,
    bossOpen,
    bossIntroOpen,
    bossIntroPayload,
    setBossOpen,
    setBossIntroOpen,
    setBossIntroPayload,
    ensureBossState,
    startBossSession,
    openBoss,
    openBossForDrop,
    bossTryAgain,
    bossAnswer,
  } = useBossBattle({
    sessionUserId: session?.user?.id,
    profile,
    setProfile,
    tasksDbReady,
    collectionCards,
    userCardsRaw,
    onBossSolved: markBossSolved,
    grantXp,
  });

  const dropTickEnabled = dropListOpen || scannerOpen || chestOpen || bossOpen || bossIntroOpen || !!activeDropId;
  const dropTick = useTicker(!!session?.user?.id && dropTickEnabled);
  const { isNear, getCooldown } = useDropHelpers(loc, userDrops, dropTick);
  const energyUI = useEnergyState(profile, energyTick);

  const {
    hiddenBossCountToday,
    visibleDrops,
    activeDrop,
    activeNear,
    markerDrops,
    dockPreview,
    dockPreviewPending,
  } = useDropDerived({
    drops,
    bossState,
    activeDropId,
    isNear,
    getCooldown,
  });

  const {
    leaderMetric,
    leaderWeek,
    leaderRows,
    leaderLoading,
    leaderError,
    rewardClaimLoading,
    leaderWeekOffset,
    leaderClosed,
    closeWeekLoading,
    setLeaderMetric,
    setLeaderWeekOffset,
    loadLeaderboard,
    closePrevWeek,
    claimWeeklyTopReward,
    checkCourierWeeklyRewardPopup,
  } = useLeaderboardData({
    sessionUserId: session?.user?.id,
    isAdmin,
    refreshProfile,
  });

  const {
    adminLoading,
    lootEntries,
    cardDefs,
    cardSearch,
    setCardSearch,
    adminDropsLoading,
    adminDrops,
    loadAdminData,
    adminAddLoot,
    adminDeleteLoot,
    loadAdminDrops,
    adminUpsertDrop,
    adminDeleteDrop,
    adminUsersLoading,
    adminUsers,
    adminUserSearch,
    adminBroadcastLoading,
    adminMarketLoading,
    adminMarketUi,
    adminMarketDefs,
    adminMarketRewardTypes,
    setAdminUserSearch,
    loadAdminUsers,
    adminSaveUser,
    adminCourierJobsLoading,
    adminCourierJobs,
    loadAdminCourierJobs,
    adminUpsertCourierJob,
    adminDeleteCourierJob,
    adminSendBroadcast,
    adminBossLoading,
    adminBossDefs,
    loadAdminBossDefs,
    adminSaveBoss,
    adminDeleteBoss,
    loadAdminMarketCommand,
    adminSaveMarketUi,
    adminSaveMarketPack,
    adminDeleteMarketPack,
    adminSaveMarketRewardType,
    adminDeleteMarketRewardType,
    adminNotificationTemplateLoading,
    adminNotificationTemplates,
    loadAdminNotificationTemplates,
    adminSaveNotificationTemplate,
  } = useAdminData({ refreshDrops, sessionAccessToken: session?.access_token });

  useEffect(() => {
    if (!session?.user?.id) return;
    checkCourierWeeklyRewardPopup();
  }, [session?.user?.id, checkCourierWeeklyRewardPopup]);

  const {
    adminBusinessesLoading,
    adminBusinesses,
    adminSelectedBusinessId,
    adminBusinessDraft,
    setAdminBusinessDraft,
    adminBusinessSnapshotLoading,
    adminBusinessSnapshot,
    adminCampaignDraft,
    setAdminCampaignDraft,
    loadAdminBusinesses,
    selectAdminBusiness,
    adminSaveBusiness,
    adminSaveBusinessCampaign,
    adminLogBusinessQrScan,
    adminLogBusinessCouponUse,
  } = useBusinessAdminData();

  const {
    chestOpen,
    chestStage,
    chestPayload,
    chestSpin,
    setChestOpen,
    setChestStage,
    setChestPayload,
    closeChest,
    bossOpenChestNow,
    openChestByQr,
    openChestByCode,
  } = useChestActions({
    drops,
    visibleDrops,
    activeDropId,
    activeDrop,
    bossState,
    loc,
    isNear,
    getCooldown,
    refreshProfile,
    refreshUserDrops,
    refreshDrops,
    loadHistory,
    setDrops,
    loadCollection,
    loadMarket,
    bumpChestsOpened,
    syncDailyProgress,
    syncWeeklyProgress,
    grantXp,
    setActiveDropId,
    setBossOpen,
    setProfile,
    sessionUserId: session?.user?.id,
    onAchievementAction: (...args) => trackAchievementAction?.(...args),
  });

  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;

    (async () => {
      const results = await Promise.allSettled([
        bootstrapProfile(),
        refreshDrops(),
        refreshUserDrops(),
      ]);

      if (cancelled) return;

      const labels = ['bootstrapProfile', 'refreshDrops', 'refreshUserDrops'];
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.log(`[Lootonia][init][${labels[index]}]`, result.reason?.message || String(result.reason));
        }
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, bootstrapProfile, refreshDrops, refreshUserDrops]);

  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;

    (async () => {
      await primeNotificationsRuntime();
      const result = await registerDeviceForRemotePush();
      if (cancelled) return;
      if (!result?.ok && result?.reason && result.reason !== 'expo_go_android_remote_push_unavailable' && result.reason !== 'permission_denied') {
        console.log('[Lootonia][push]', result.reason);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, session?.access_token]);

  useEffect(() => {
    const userId = profile?.user_id || session?.user?.id;
    if (!userId || !profile) {
      setOnboardingOpen(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const done = await hasCompletedOnboarding(userId);
      if (!cancelled) setOnboardingOpen(!done);
    })();

    return () => {
      cancelled = true;
    };
  }, [profile, profile?.user_id, session?.user?.id]);

  useEffect(() => {
    dkd_sync_boss_ready_notification(profile?.boss_state);
  }, [profile?.boss_state]);

  const region = useMemo(() => {
    const lat = loc?.lat ?? 39.92077;
    const lng = loc?.lng ?? 32.85411;
    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
  }, [loc?.lat, loc?.lng]);

  useEffect(() => {
    const dkd_count_value = Number(profile?.token ?? 0);
    if (prevTokenRef.current == null) {
      prevTokenRef.current = dkd_count_value;
      return;
    }
    if (dkd_count_value === prevTokenRef.current) return;
    prevTokenRef.current = dkd_count_value;
    tokenScale.setValue(1);
    Animated.sequence([
      Animated.timing(tokenScale, {
        toValue: 1.08,
        duration: 140,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(tokenScale, {
        toValue: 1,
        duration: 220,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [tokenScale, profile?.token]);

  const initDailyStates = useCallback(async () => {
    await Promise.all([ensureTaskStates(), ensureBossState()]);
  }, [ensureBossState, ensureTaskStates]);

  const recenterToCurrentLocation = useCallback(() => {
    if (!loc?.lat || !loc?.lng) {
      Alert.alert('Konum', 'Şu anki konum henüz alınamadı.');
      return;
    }
    mapRef.current?.animateToRegion?.({
      latitude: Number(loc.lat),
      longitude: Number(loc.lng),
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 380);
  }, [loc?.lat, loc?.lng]);

  const openDirections = useCallback(async (drop) => {
    if (!drop) return;
    setActiveDropId(String(drop.id));
    setDropListOpen(false);
    if (drop.lat == null || drop.lng == null) {
      Alert.alert('Konum Yok', 'Bu sandık için konum tanımlı değil.');
      return;
    }
    const destination = `${Number(drop.lat)},${Number(drop.lng)}`;
    const origin = loc?.lat != null && loc?.lng != null ? `&origin=${Number(loc.lat)},${Number(loc.lng)}` : '';
    const url = `https://www.google.com/maps/dir/?api=1${origin}&destination=${destination}&travelmode=driving`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Alert.alert('Açılamadı', 'Google Maps bağlantısı açılamadı.');
    } catch (dkd_error_value) {
      Alert.alert('Yol Tarifi Açılamadı', dkd_error_value?.message || String(dkd_error_value));
    }
  }, [loc?.lat, loc?.lng]);

  const handleDropOpen = useCallback((drop) => {
    if (!drop) return;
    setActiveDropId(String(drop.id));
    setDropListOpen(false);
    if (String(drop.type) === 'boss') {
      openBossForDrop(drop.id);
      return;
    }
    setScannerOpen(true);
  }, [openBossForDrop]);

  const logout = useCallback(async () => {
    await signOutSession();
    onSignedOut?.();
  }, [onSignedOut]);

  const handleMapMarkerPress = useCallback((drop, near, cooldown) => {
    setActiveDropId(String(drop.id));
    if (String(drop.type) === 'boss') {
      if (!near.ok) {
        Alert.alert('Boss Sandığı', `Uzakta. Mesafe: ${near.distance == null ? '—' : Math.round(near.distance) + 'm'} • Radius: ${drop.radius_m}m`);
        return;
      }
      if (cooldown.isCooldown) {
        setChestPayload({ ok: false, reason: 'cooldown', next_open_at: cooldown.nextAt });
        setChestStage('revealed');
        setChestOpen(true);
        return;
      }
      openBossForDrop(drop.id);
      return;
    }
    setScannerOpen(true);
  }, [openBossForDrop, setChestOpen, setChestPayload, setChestStage]);


  const openBossFromTasks = useCallback(() => {
    const dkd_boss_entries = (visibleDrops || [])
      .filter((dkd_drop_item) => String(dkd_drop_item?.type || '').toLowerCase() === 'boss')
      .map((dkd_drop_item) => {
        const dkd_near_state = isNear(dkd_drop_item);
        const dkd_cooldown_state = getCooldown(dkd_drop_item);
        return {
          dkd_drop_item,
          dkd_near_state,
          dkd_cooldown_state,
        };
      });

    if (!dkd_boss_entries.length) {
      Alert.alert('Boss Görevi', 'Yakında aktif boss bulunamadı.');
      return;
    }

    const dkd_sorted_boss_entries = dkd_boss_entries
      .slice()
      .sort((dkd_left_item, dkd_right_item) => {
        const dkd_left_distance = Number.isFinite(dkd_left_item?.dkd_near_state?.distance)
          ? dkd_left_item.dkd_near_state.distance
          : 999999;
        const dkd_right_distance = Number.isFinite(dkd_right_item?.dkd_near_state?.distance)
          ? dkd_right_item.dkd_near_state.distance
          : 999999;
        return dkd_left_distance - dkd_right_distance;
      });

    const dkd_preferred_boss_entry =
      dkd_sorted_boss_entries.find((dkd_entry_item) => !dkd_entry_item?.dkd_cooldown_state?.isCooldown)
      || dkd_sorted_boss_entries[0];

    if (dkd_preferred_boss_entry?.dkd_drop_item?.id) {
      openBossForDrop(dkd_preferred_boss_entry.dkd_drop_item.id);
      return;
    }

    Alert.alert('Boss Görevi', 'Yakında aktif boss bulunamadı.');
  }, [visibleDrops, isNear, getCooldown, openBossForDrop]);

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
      setCollectionOpen(false);
      setHistoryOpen(false);
      return;
    }
    if (tab === 'collection') {
      setHistoryOpen(false);
      setCollectionOpen(true);
      loadCollection();
      return;
    }
    if (tab === 'ally') {
      setCollectionOpen(false);
      setHistoryOpen(false);
      setActionMenuOpen(false);
      setProfileOpen(false);
      return;
    }
    if (tab === 'market') {
      setCollectionOpen(false);
      setHistoryOpen(false);
      loadMarket({ force: true });
      return;
    }
    if (tab === 'tasks') {
      setCollectionOpen(false);
      setHistoryOpen(false);
      initDailyStates();
      syncDailyProgress();
      syncWeeklyProgress();
      return;
    }
    if (tab === 'leader') {
      setCollectionOpen(false);
      setHistoryOpen(false);
      setLeaderMetric('courier');
      setLeaderWeekOffset(0);
      loadLeaderboard('courier', 0);
    }
  }, [initDailyStates, loadCollection, loadLeaderboard, loadMarket, profile, setLeaderMetric, setLeaderWeekOffset, syncDailyProgress, syncWeeklyProgress]);

  const pickScannerDrop = useCallback(() => {
    const entries = (visibleDrops || [])
      .filter((drop) => String(drop?.type || '').toLowerCase() !== 'boss')
      .map((drop) => ({
        drop,
        near: isNear(drop),
        cooldown: getCooldown(drop),
      }));

    if (!entries.length) return null;

    const nearbyReady = entries
      .filter((entry) => entry?.near?.ok && !entry?.cooldown?.isCooldown)
      .sort((dkd_left_value, dkd_right_value) => (Number(dkd_left_value?.near?.distance ?? Number.MAX_SAFE_INTEGER) - Number(dkd_right_value?.near?.distance ?? Number.MAX_SAFE_INTEGER)))[0];
    if (nearbyReady?.drop) return nearbyReady.drop;

    const nearest = entries
      .slice()
      .sort((dkd_left_value, dkd_right_value) => {
        const dkd_left_distance = Number(dkd_left_value?.near?.distance ?? Number.MAX_SAFE_INTEGER);
        const dkd_right_distance = Number(dkd_right_value?.near?.distance ?? Number.MAX_SAFE_INTEGER);
        if (dkd_left_distance !== dkd_right_distance) return dkd_left_distance - dkd_right_distance;
        if (!!dkd_left_value?.cooldown?.isCooldown !== !!dkd_right_value?.cooldown?.isCooldown) return dkd_left_value?.cooldown?.isCooldown ? 1 : -1;
        const dkd_left_qr_rank = String(dkd_left_value?.drop?.type || '').toLowerCase() === 'qr' ? 0 : 1;
        const dkd_right_qr_rank = String(dkd_right_value?.drop?.type || '').toLowerCase() === 'qr' ? 0 : 1;
        return dkd_left_qr_rank - dkd_right_qr_rank;
      })[0];

    return nearest?.drop || null;
  }, [visibleDrops, isNear, getCooldown]);

  const openScannerWithBestTarget = useCallback(() => {
    const current = activeDrop && String(activeDrop?.type || '').toLowerCase() !== 'boss' ? activeDrop : null;
    const target = current || pickScannerDrop();
    setActiveDropId(target?.id ? String(target.id) : null);
    setScannerOpen(true);
  }, [activeDrop, pickScannerDrop]);

  const handleNotificationNavigate = useCallback((payload) => {
    const resolved = resolveNotificationRoute(payload);
    applyNotificationRoute(resolved, {
      isAdmin,
      openTab: (tab) => handleBottomNavChange(tab),
      openCourier: () => {
        setActiveTab('map');
        setCollectionOpen(false);
        setHistoryOpen(false);
        setCourierBoardOpen(true);
      },
      openAdmin: () => {
        if (!isAdmin) return;
        setActiveTab('map');
        setCollectionOpen(false);
        setHistoryOpen(false);
        setAdminMenuOpen(true);
      },
      openScanner: () => {
        setActiveTab('map');
        setCollectionOpen(false);
        setHistoryOpen(false);
        openScannerWithBestTarget();
      },
      setDropId: (id) => setActiveDropId(id),
    });
  }, [isAdmin, handleBottomNavChange, openScannerWithBestTarget]);

  useEffect(() => {
    if (!session?.user?.id) return undefined;
    let detach = () => {};
    let cancelled = false;

    (async () => {
      detach = await attachNotificationRouteListener(handleNotificationNavigate);
      if (cancelled) detach?.();
    })();

    return () => {
      cancelled = true;
      detach?.();
    };
  }, [session?.user?.id, handleNotificationNavigate]);

  const openDropList = useCallback(() => setDropListOpen(true), []);
  const openActionMenu = useCallback(() => setActionMenuOpen(true), []);
  const openScannerHome = useCallback(() => {
    setActiveTab('map');
    setCollectionOpen(false);
    setHistoryOpen(false);
    openScannerWithBestTarget();
  }, [openScannerWithBestTarget]);
  const openSocialPlayerCard = useCallback(() => {
    setActionMenuOpen(false);
    setProfileOpen(false);
    setSocialCompareOpen(false);
    loadCollection({ visible: true });
    setSocialCardOpen(true);
  }, [loadCollection]);
  const openSocialCompare = useCallback(() => {
    setSocialCardOpen(false);
    setSocialCompareOpen(true);
  }, []);
  const openCourierBoard = useCallback(() => {
    setActionMenuOpen(false);
    setProfileOpen(false);
    setCollectionOpen(false);
    setHistoryOpen(false);
    setActiveTab('map');
    setCourierBoardOpen(true);
  }, []);

  const openProfile = useCallback(() => {
    setActionMenuOpen(false);
    setCollectionOpen(false);
    setHistoryOpen(false);
    setActiveTab('map');
    setProfileOpen(true);
  }, []);

  const openAllyHub = useCallback(() => {
    setActionMenuOpen(false);
    setProfileOpen(false);
    setCollectionOpen(false);
    setHistoryOpen(false);
    setActiveTab('ally');
  }, []);

  const openClanHub = useCallback(() => {
    setActionMenuOpen(false);
    setProfileOpen(false);
    setClanOpen(true);
  }, []);

  const openTasksFromReward = useCallback(() => {
    closeRewardModal();
    handleBottomNavChange('tasks');
  }, [closeRewardModal, handleBottomNavChange]);

  const handleHardwareBack = useCallback(() => {
    if (onboardingOpen) {
      setOnboardingOpen(false);
      return true;
    }

    if (cardDetail) {
      setCardDetail(null);
      return true;
    }

    if (rewardModalOpen) {
      closeRewardModal();
      return true;
    }

    if (socialCompareOpen) {
      setSocialCompareOpen(false);
      setSocialCardOpen(true);
      return true;
    }

    if (socialCardOpen) {
      setSocialCardOpen(false);
      return true;
    }

    if (adminBroadcastOpen) {
      setAdminBroadcastOpen(false);
      setAdminMenuOpen(true);
      return true;
    }

    if (adminMarketOpen) {
      setAdminMarketOpen(false);
      setAdminMenuOpen(true);
      return true;
    }

    if (adminDropsOpen) {
      setAdminDropsOpen(false);
      setAdminMenuOpen(true);
      return true;
    }

    if (adminUsersOpen) {
      setAdminUsersOpen(false);
      setAdminMenuOpen(true);
      return true;
    }

    if (adminCourierJobsOpen) {
      setAdminCourierJobsOpen(false);
      setAdminMenuOpen(true);
      return true;
    }

    if (adminOpen) {
      setAdminOpen(false);
      setAdminMenuOpen(true);
      return true;
    }

    if (adminMenuOpen) {
      setAdminMenuOpen(false);
      return true;
    }

    if (bossOpen) {
      setBossOpen(false);
      return true;
    }

    if (bossIntroOpen) {
      setBossIntroOpen(false);
      setBossIntroPayload(null);
      return true;
    }

    if (collectionOpen) {
      setCollectionOpen(false);
      setActiveTab('map');
      return true;
    }

    if (historyOpen) {
      setHistoryOpen(false);
      setActiveTab('map');
      return true;
    }

    if (activeTab === 'market' || activeTab === 'ally' || activeTab === 'tasks' || activeTab === 'leader') {
      setActiveTab('map');
      return true;
    }

    if (clanOpen) {
      setClanOpen(false);
      return true;
    }

    if (courierBoardOpen) {
      setCourierBoardOpen(false);
      return true;
    }

    if (profileOpen) {
      setProfileOpen(false);
      return true;
    }

    if (chestOpen) {
      closeChest();
      return true;
    }

    if (scannerOpen) {
      setScannerOpen(false);
      setActiveDropId(null);
      return true;
    }

    if (dropListOpen) {
      setDropListOpen(false);
      return true;
    }

    if (actionMenuOpen) {
      setActionMenuOpen(false);
      return true;
    }

    return false;
  }, [
    actionMenuOpen,
    activeTab,
    adminBroadcastOpen,
    adminBossOpen,
    adminCourierJobsOpen,
    adminDropsOpen,
    adminMenuOpen,
    adminOpen,
    adminUsersOpen,
    bossIntroOpen,
    bossOpen,
    cardDetail,
    chestOpen,
    clanOpen,
    closeChest,
    closeRewardModal,
    collectionOpen,
    courierBoardOpen,
    dropListOpen,
    historyOpen,
    onboardingOpen,
    profileOpen,
    rewardModalOpen,
    scannerOpen,
    socialCardOpen,
    socialCompareOpen,
  ]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => subscription.remove();
  }, [handleHardwareBack]);

  const socialSummary = useMemo(() => buildSocialCollectionSummary(collectionCards || []), [collectionCards]);

  const {
    clanState,
    clanLoading,
    clanSaving,
    clanDerived,
    clanShareText,
    createOrUpdateClan,
    addClanMember,
    removeClanMember,
    claimClanMission,
    leaveClan,
    refreshClan,
  } = useClanState({
    sessionUserId: session?.user?.id,
    profile,
    summary: socialSummary,
    taskState,
    weeklyTaskState,
    setProfile,
    grantXp,
  });

  useEffect(() => {
    if (clanOpen) refreshClan?.();
  }, [clanOpen, refreshClan]);

  const homeProps = useMemo(() => buildHomeProps({
    mapRef,
    region,
    markerDrops,
    activeDropId,
    handleMapMarkerPress,
    loc,
    profile,
    energyUI,
    tokenScale,
    liveOpsState,
    achievementsState,
    dismissAchievementToast,
    clanState,
    openAchievements: () => setAchievementsOpen(true),
    openDailyReward: openRewardModal,
    openTasksFromReward,
    hiddenBossCountToday,
    locationError,
    retryLocation,
    recenterToCurrentLocation,
    visibleDrops,
    dockPreview,
    dockPreviewPending,
    isNear,
    openDirections,
    activeTab,
    handleBottomNavChange,
    openDropList,
    openActionMenu,
    openScanner: openScannerHome,
    openAllyHub,
    openCourierBoard,
    openClanHub,
    openProfile,
    openBossFromTasks,
  }), [
    mapRef,
    region,
    markerDrops,
    activeDropId,
    handleMapMarkerPress,
    loc,
    profile,
    energyUI,
    tokenScale,
    liveOpsState,
    achievementsState,
    dismissAchievementToast,
    clanState,
    setAchievementsOpen,
    openRewardModal,
    openTasksFromReward,
    hiddenBossCountToday,
    locationError,
    retryLocation,
    recenterToCurrentLocation,
    visibleDrops,
    dockPreview,
    dockPreviewPending,
    isNear,
    openDirections,
    activeTab,
    handleBottomNavChange,
    openDropList,
    openActionMenu,
    openScannerHome,
    openAllyHub,
    openCourierBoard,
    openClanHub,
    openProfile,
    openBossFromTasks,
  ]);

  const localSocialCard = useMemo(() => buildPlayerCardPayload({
    sessionUserId: session?.user?.id,
    profile,
    summary: socialSummary,
    taskState,
    weeklyTaskState,
    clanState,
  }), [session?.user?.id, profile, socialSummary, taskState, weeklyTaskState, clanState]);

  const modalProps = useMemo(() => buildModalProps({
    rewardModalOpen,
    liveOpsState,
    claimLiveOpsLoading,
    eventClaimLoading,
    liveOpsRewardHubLoading,
    liveOpsAdminSaving,
    closeRewardModal,
    claimTodayLiveOpsReward,
    achievementsOpen,
    setAchievementsOpen,
    achievementsState,
    claimAchievementLoading,
    refreshAchievements,
    claimAchievement,
    selectFavoriteAchievement,
    reorderAchievementShelf,
    dismissAchievementToast,
    claimLiveOpsEventTask,
    claimLiveOpsStreakMilestone,
    openLiveOpsEventChest,
    redeemLiveOpsStoreItem,
    cycleLiveOpsEvent,
    toggleLiveOpsEnabled,
    toggleLiveOpsAutoRotate,
    selectLiveOpsEventPreset,
    selectLiveOpsWeeklyPlan,
    openRewardModal,
    openTasksFromReward,
    socialCardOpen,
    setSocialCardOpen,
    socialCompareOpen,
    setSocialCompareOpen,
    openSocialPlayerCard,
    openSocialCompare,
    openAllyHub,
    localSocialCard,
    clanOpen,
    setClanOpen,
    openClanHub,
    clanState,
    clanLoading,
    clanSaving,
    clanDerived,
    clanShareText,
    createOrUpdateClan,
    addClanMember,
    removeClanMember,
    claimClanMission,
    leaveClan,
    actionMenuOpen,
    setActionMenuOpen,
    isAdmin,
    courierBoardOpen,
    setCourierBoardOpen,
    setProfile,
    setProfileOpen,
    setHistoryOpen,
    loadHistory,
    setAdminMenuOpen,
    logout,
    dropListOpen,
    setDropListOpen,
    visibleDrops,
    getCooldown,
    isNear,
    openDirections,
    handleDropOpen,
    recenterToCurrentLocation,
    scannerOpen,
    activeDrop,
    activeNear,
    openChestByCode,
    grantXp,
    setScannerOpen,
    setActiveDropId,
    openChestByQr,
    chestOpen,
    chestStage,
    chestPayload,
    chestSpin,
    setChestOpen,
    setChestStage,
    setChestPayload,
    closeChest,
    profileOpen,
    profile,
    refreshProfile,
    saveProfileNick,
    historyOpen,
    setActiveTab,
    historyLogs,
    historyLoading,
    cardDetail,
    setCardDetail,
    collectionOpen,
    setCollectionOpen,
    collectionCards,
    collectionLoading,
    recycleDuplicatesAll,
    exchangeShards,
    craftShardCard,
    upgradeShardCard,
    recycleLoading,
    shardExchangeLoading,
    shardCraftLoading,
    shardUpgradeLoading,
    bossTicketLoading,
    craftBossTicket,
    activeTab,
    marketLoading,
    listings,
    myListings,
    loadMarket,
    buyListing,
    cancelListing,
    listCardForSale,
    userCardsRaw,
    energyUI,
    taskState,
    weeklyTaskState,
    tasksDbReady,
    weeklyDbReady,
    claimTask,
    openBoss: openBossFromTasks,
    leaderMetric,
    leaderWeekOffset,
    leaderClosed,
    leaderWeek,
    leaderRows,
    leaderLoading,
    closeWeekLoading,
    closePrevWeek,
    loadLeaderboard,
    setLeaderWeekOffset,
    setLeaderMetric,
    sessionUserId: session?.user?.id,
    claimWeeklyTopReward,
    rewardClaimLoading,
    leaderError,
    bossIntroOpen,
    bossIntroPayload,
    setBossIntroOpen,
    setBossIntroPayload,
    startBossSession,
    bossOpen,
    setBossOpen,
    bossState,
    bossAnswer,
    bossTryAgain,
    bossOpenChestNow,
    adminMenuOpen,
    adminOpen,
    setAdminOpen,
    adminDropsOpen,
    setAdminDropsOpen,
    adminUsersOpen,
    setAdminUsersOpen,
    adminCourierJobsOpen,
    setAdminCourierJobsOpen,
    adminBroadcastOpen,
    setAdminBroadcastOpen,
    adminMarketOpen,
    setAdminMarketOpen,
    adminBossOpen,
    setAdminBossOpen,
    adminBusinessOpen,
    setAdminBusinessOpen,
    loadAdminData,
    loadAdminDrops,
    loadAdminUsers,
    loadAdminCourierJobs,
    loadAdminBossDefs,
    adminDropsLoading,
    adminDrops,
    adminUpsertDrop,
    adminDeleteDrop,
    loc,
    adminLoading,
    lootEntries,
    cardDefs,
    cardSearch,
    setCardSearch,
    adminAddLoot,
    adminDeleteLoot,
    adminUsersLoading,
    adminUsers,
    adminUserSearch,
    adminBroadcastLoading,
    adminBossLoading,
    adminMarketLoading,
    adminMarketUi,
    adminMarketDefs,
    adminMarketRewardTypes,
    adminBossDefs,
    adminBusinessesLoading,
    adminBusinesses,
    adminSelectedBusinessId,
    adminBusinessDraft,
    setAdminBusinessDraft,
    adminBusinessSnapshotLoading,
    adminBusinessSnapshot,
    adminCampaignDraft,
    setAdminCampaignDraft,
    loadAdminBusinesses,
    selectAdminBusiness,
    adminSaveBusiness,
    adminSaveBusinessCampaign,
    adminLogBusinessQrScan,
    adminLogBusinessCouponUse,
    setAdminUserSearch,
    adminSaveUser,
    adminCourierJobsLoading,
    adminCourierJobs,
    adminUpsertCourierJob,
    adminDeleteCourierJob,
    adminSendBroadcast,
    adminSaveBoss,
    adminDeleteBoss,
    loadAdminMarketCommand,
    adminSaveMarketUi,
    adminSaveMarketPack,
    adminDeleteMarketPack,
    adminSaveMarketRewardType,
    adminDeleteMarketRewardType,
    adminNotificationTemplateLoading,
    adminNotificationTemplates,
    loadAdminNotificationTemplates,
    adminSaveNotificationTemplate,
  }), [
    rewardModalOpen,
    liveOpsState,
    claimLiveOpsLoading,
    eventClaimLoading,
    liveOpsRewardHubLoading,
    liveOpsAdminSaving,
    closeRewardModal,
    claimTodayLiveOpsReward,
    achievementsOpen,
    setAchievementsOpen,
    achievementsState,
    claimAchievementLoading,
    refreshAchievements,
    claimAchievement,
    selectFavoriteAchievement,
    reorderAchievementShelf,
    dismissAchievementToast,
    claimLiveOpsEventTask,
    claimLiveOpsStreakMilestone,
    openLiveOpsEventChest,
    redeemLiveOpsStoreItem,
    cycleLiveOpsEvent,
    toggleLiveOpsEnabled,
    toggleLiveOpsAutoRotate,
    selectLiveOpsEventPreset,
    selectLiveOpsWeeklyPlan,
    openRewardModal,
    openTasksFromReward,
    socialCardOpen,
    setSocialCardOpen,
    socialCompareOpen,
    setSocialCompareOpen,
    openSocialPlayerCard,
    openSocialCompare,
    openAllyHub,
    localSocialCard,
    refreshProfile,
    clanOpen,
    setClanOpen,
    openClanHub,
    clanState,
    clanLoading,
    clanSaving,
    clanDerived,
    clanShareText,
    createOrUpdateClan,
    addClanMember,
    removeClanMember,
    claimClanMission,
    leaveClan,
    actionMenuOpen,
    setActionMenuOpen,
    isAdmin,
    courierBoardOpen,
    setCourierBoardOpen,
    setProfile,
    setProfileOpen,
    setHistoryOpen,
    loadHistory,
    setAdminMenuOpen,
    logout,
    dropListOpen,
    setDropListOpen,
    visibleDrops,
    getCooldown,
    isNear,
    openDirections,
    handleDropOpen,
    recenterToCurrentLocation,
    scannerOpen,
    activeDrop,
    activeNear,
    openChestByCode,
    grantXp,
    setScannerOpen,
    setActiveDropId,
    openChestByQr,
    chestOpen,
    chestStage,
    chestPayload,
    chestSpin,
    setChestOpen,
    setChestStage,
    setChestPayload,
    closeChest,
    profileOpen,
    profile,
    refreshProfile,
    saveProfileNick,
    historyOpen,
    setActiveTab,
    historyLogs,
    historyLoading,
    cardDetail,
    setCardDetail,
    collectionOpen,
    setCollectionOpen,
    collectionCards,
    collectionLoading,
    recycleDuplicatesAll,
    exchangeShards,
    craftShardCard,
    upgradeShardCard,
    recycleLoading,
    shardExchangeLoading,
    shardCraftLoading,
    shardUpgradeLoading,
    bossTicketLoading,
    craftBossTicket,
    activeTab,
    marketLoading,
    listings,
    myListings,
    loadMarket,
    buyListing,
    cancelListing,
    listCardForSale,
    userCardsRaw,
    energyUI,
    taskState,
    weeklyTaskState,
    tasksDbReady,
    weeklyDbReady,
    claimTask,
    openBossFromTasks,
    leaderMetric,
    leaderWeekOffset,
    leaderClosed,
    leaderWeek,
    leaderRows,
    leaderLoading,
    closeWeekLoading,
    closePrevWeek,
    loadLeaderboard,
    setLeaderWeekOffset,
    setLeaderMetric,
    session?.user?.id,
    claimWeeklyTopReward,
    rewardClaimLoading,
    leaderError,
    bossIntroOpen,
    bossIntroPayload,
    setBossIntroOpen,
    setBossIntroPayload,
    startBossSession,
    bossOpen,
    setBossOpen,
    bossState,
    bossAnswer,
    bossTryAgain,
    bossOpenChestNow,
    adminMenuOpen,
    adminOpen,
    setAdminOpen,
    adminDropsOpen,
    setAdminDropsOpen,
    adminUsersOpen,
    setAdminUsersOpen,
    adminCourierJobsOpen,
    setAdminCourierJobsOpen,
    adminBroadcastOpen,
    setAdminBroadcastOpen,
    adminMarketOpen,
    setAdminMarketOpen,
    adminBossOpen,
    setAdminBossOpen,
    loadAdminData,
    loadAdminDrops,
    loadAdminUsers,
    loadAdminCourierJobs,
    loadAdminBossDefs,
    adminDropsLoading,
    adminDrops,
    adminUpsertDrop,
    adminDeleteDrop,
    loc,
    adminLoading,
    lootEntries,
    cardDefs,
    cardSearch,
    setCardSearch,
    adminAddLoot,
    adminDeleteLoot,
    adminUsersLoading,
    adminUsers,
    adminUserSearch,
    adminBroadcastLoading,
    adminMarketLoading,
    adminMarketUi,
    adminMarketDefs,
    adminMarketRewardTypes,
    setAdminUserSearch,
    adminSaveUser,
    adminCourierJobsLoading,
    adminCourierJobs,
    adminUpsertCourierJob,
    adminDeleteCourierJob,
    adminSendBroadcast,
    loadAdminMarketCommand,
    adminSaveMarketUi,
    adminSaveMarketPack,
    adminDeleteMarketPack,
    adminSaveMarketRewardType,
    adminDeleteMarketRewardType,
    adminNotificationTemplateLoading,
    adminNotificationTemplates,
    loadAdminNotificationTemplates,
    adminSaveNotificationTemplate,
    adminBusinessesLoading,
    adminBusinesses,
    adminSelectedBusinessId,
    adminBusinessDraft,
    setAdminBusinessDraft,
    adminBusinessSnapshotLoading,
    adminBusinessSnapshot,
    adminCampaignDraft,
    setAdminCampaignDraft,
    loadAdminBusinesses,
    selectAdminBusiness,
    adminSaveBusiness,
    adminSaveBusinessCampaign,
    adminLogBusinessQrScan,
    adminLogBusinessCouponUse,
  ]);

  const onboardingProps = useMemo(() => buildOnboardingProps({
    onboardingOpen,
    profile,
    setOnboardingOpen,
  }), [onboardingOpen, profile]);

  const hasVisibleModal = useMemo(() => getHasVisibleModal({
    actionMenuOpen,
    dropListOpen,
    scannerOpen,
    chestOpen,
    profileOpen,
    courierBoardOpen,
    historyOpen,
    collectionOpen,
    activeTab,
    bossIntroOpen,
    bossOpen,
    adminMenuOpen,
    adminOpen,
    adminDropsOpen,
    adminUsersOpen,
    adminCourierJobsOpen,
    adminBroadcastOpen,
    adminMarketOpen,
    adminBossOpen,
    adminBusinessOpen,
    rewardModalOpen,
    socialCardOpen,
    socialCompareOpen,
    clanOpen,
    achievementsOpen,
  }), [
    actionMenuOpen,
    dropListOpen,
    scannerOpen,
    chestOpen,
    profileOpen,
    courierBoardOpen,
    historyOpen,
    collectionOpen,
    activeTab,
    bossIntroOpen,
    bossOpen,
    adminMenuOpen,
    adminOpen,
    adminDropsOpen,
    adminUsersOpen,
    adminCourierJobsOpen,
    adminBroadcastOpen,
    adminBossOpen,
    rewardModalOpen,
    socialCardOpen,
    socialCompareOpen,
    clanOpen,
    achievementsOpen,
  ]);

  return (
    <AppShell
      cardDetail={cardDetail}
      setCardDetail={setCardDetail}
      favMap={favMap}
      setFavMap={setFavMap}
      homeProps={homeProps}
      modalProps={modalProps}
      onboardingProps={onboardingProps}
      hasVisibleModal={hasVisibleModal}
    />
  );
}


import { resolveUnifiedWalletTl, formatWalletTlCompact } from '../services/walletService';
import { clamp, etaTextFromDistance, getDropDistanceState, getDropVisual } from '../utils/geo';
import { formatInt, trDropType } from '../utils/text';
import { nextBossReturnText as nextBossCountdownText } from '../utils/date';

export function buildHomeProps({
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
  openLiveOps,
  openDailyReward,
  achievementsState,
  openAchievements,
  dismissAchievementToast,
  openTasksFromLiveOps,
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
  openScanner,
  openCourierBoard,
  openClanHub,
  openProfile,
  openBossFromTasks,
  clanState,
  dkd_map_route_request_value,
  dkd_on_map_route_request_handled_value,
}) {
  const hasVisibleBossOnMap = Array.isArray(visibleDrops)
    && visibleDrops.some((drop) => String(drop?.type || '').toLowerCase() === 'boss');

  return {
    mapRef,
    region,
    markerDrops,
    activeDropId,
    currentLocation: loc || null,
    onMarkerPress: handleMapMarkerPress,
    trDropType,
    clamp,
    profile,
    energyUI,
    tokenScale,
    tokenText: formatInt(profile?.token ?? 0),
    walletText: formatWalletTlCompact(resolveUnifiedWalletTl(profile || {})),
    liveOpsState,
    achievementsState,
    onOpenAchievements: openAchievements,
    onDismissAchievementToast: dismissAchievementToast,
    onOpenLiveOps: openDailyReward || openLiveOps || null,
    onOpenTasks: openTasksFromReward || openTasksFromLiveOps || null,
    hiddenBossCountToday,
    nextBossReturnText: () => (hasVisibleBossOnMap ? 'Boss Hazır' : nextBossCountdownText()),
    locationError,
    retryLocation,
    recenterToCurrentLocation,
    visibleDrops,
    dockPreview,
    dockPreviewPending,
    isNear,
    getDropVisual,
    getDropDistanceState,
    etaTextFromDistance,
    openDirections,
    activeTab,
    onTabChange: handleBottomNavChange,
    onOpenDropList: openDropList,
    onOpenActionMenu: openActionMenu,
    onOpenProfile: openProfile,
    onOpenScanner: openScanner,
    onOpenCourierBoard: openCourierBoard,
    onOpenClanHub: openClanHub,
    onOpenNearestBoss: openBossFromTasks,
    clanState,
    dkd_map_route_request_value,
    dkd_on_map_route_request_handled_value,
  };
}

export function buildModalProps(input) {
  const marketVisible = input.activeTab === 'market';
  const tasksVisible = input.activeTab === 'tasks';
  const leaderVisible = input.activeTab === 'leader';
  const socialVisible = !!(input.socialCardOpen || input.socialCompareOpen);
  const clanVisible = !!input.clanOpen;

  return {
    ...input,
    dailyRewardModalOpen: input.rewardModalOpen,
    dailyRewardState: input.liveOpsState,
    claimDailyRewardLoading: input.claimLiveOpsLoading,
    dailyRewardHubLoading: input.liveOpsRewardHubLoading,
    closeDailyRewardModal: input.closeRewardModal,
    claimTodayDailyReward: input.claimTodayLiveOpsReward,
    claimDailyRewardStreakMilestone: input.claimLiveOpsStreakMilestone,
    achievementsOpen: input.achievementsOpen,
    achievementsState: input.achievementsState,
    claimAchievementLoading: input.claimAchievementLoading,
    refreshAchievements: input.refreshAchievements,
    claimAchievement: input.claimAchievement,
    selectFavoriteAchievement: input.selectFavoriteAchievement,
    reorderAchievementShelf: input.reorderAchievementShelf,
    dismissAchievementToast: input.dismissAchievementToast,
    historyLogs: input.historyOpen ? input.historyLogs : [],
    collectionCards: input.collectionOpen || socialVisible || clanVisible ? input.collectionCards : [],
    listings: marketVisible ? input.listings : [],
    myListings: marketVisible ? input.myListings : [],
    marketShopDefs: marketVisible ? (input.marketShopDefs || []) : [],
    marketShopUi: marketVisible ? (input.marketShopUi || null) : null,
    userCardsRaw: marketVisible ? input.userCardsRaw : input.collectionOpen ? input.userCardsRaw : [],
    energyUI: tasksVisible ? input.energyUI : null,
    leaderRows: leaderVisible ? input.leaderRows : [],
    adminDrops: input.adminDropsOpen ? input.adminDrops : [],
    lootEntries: input.adminOpen ? input.lootEntries : [],
    cardDefs: input.adminOpen ? input.cardDefs : [],
    adminUsers: input.adminUsersOpen ? input.adminUsers : [],
    adminCourierJobs: input.adminCourierJobsOpen ? input.adminCourierJobs : [],
    adminBossDefs: input.adminBossOpen ? input.adminBossDefs : [],
    adminBusinesses: input.adminBusinessOpen ? input.adminBusinesses : [],
    adminBusinessSnapshot: input.adminBusinessOpen ? (input.adminBusinessSnapshot || null) : null,
  };
}

export function buildOnboardingProps({ onboardingOpen, profile, setOnboardingOpen }) {
  return {
    visible: onboardingOpen,
    profile,
    onClose: () => setOnboardingOpen(false),
    onSkip: () => setOnboardingOpen(false),
  };
}

export function getHasVisibleModal({
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
  adminApplicationsOpen,
  rewardModalOpen,
  socialCardOpen,
  socialCompareOpen,
  clanOpen,
  achievementsOpen,
}) {
  return !!(
    actionMenuOpen ||
    dropListOpen ||
    scannerOpen ||
    chestOpen ||
    profileOpen ||
    courierBoardOpen ||
    historyOpen ||
    collectionOpen ||
    activeTab === 'market' ||
    activeTab === 'ally' ||
    activeTab === 'tasks' ||
    activeTab === 'leader' ||
    activeTab === 'logistics' ||
    activeTab === 'applications' ||
    bossIntroOpen ||
    bossOpen ||
    adminMenuOpen ||
    adminOpen ||
    adminDropsOpen ||
    adminUsersOpen ||
    adminCourierJobsOpen ||
    adminBroadcastOpen ||
    adminMarketOpen ||
    adminBossOpen ||
    adminBusinessOpen ||
    adminApplicationsOpen ||
    rewardModalOpen ||
    socialCardOpen ||
    socialCompareOpen ||
    clanOpen ||
    achievementsOpen
  );
}

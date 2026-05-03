const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_OBJECT = Object.freeze({});

export default function buildModalProps(input) {
  const marketOpen = input.activeTab === 'market';
  const tasksOpen = input.activeTab === 'tasks';
  const leaderOpen = input.activeTab === 'leader';

  return {
    ...input,
    visibleDrops: input.visibleDrops || EMPTY_ARRAY,
    historyLogs: input.historyLogs || EMPTY_ARRAY,
    collectionCards: input.collectionOpen ? (input.collectionCards || EMPTY_ARRAY) : EMPTY_ARRAY,
    listings: marketOpen ? (input.listings || EMPTY_ARRAY) : EMPTY_ARRAY,
    myListings: marketOpen ? (input.myListings || EMPTY_ARRAY) : EMPTY_ARRAY,
    marketShopDefs: marketOpen ? (input.marketShopDefs || EMPTY_ARRAY) : EMPTY_ARRAY,
    marketShopUi: marketOpen ? (input.marketShopUi || null) : null,
    userCardsRaw: marketOpen ? (input.userCardsRaw || EMPTY_ARRAY) : EMPTY_ARRAY,
    energyUI: tasksOpen ? (input.energyUI || null) : null,
    taskState: tasksOpen ? (input.taskState || EMPTY_OBJECT) : EMPTY_OBJECT,
    weeklyTaskState: tasksOpen ? (input.weeklyTaskState || EMPTY_OBJECT) : EMPTY_OBJECT,
    leaderRows: leaderOpen ? (input.leaderRows || EMPTY_ARRAY) : EMPTY_ARRAY,
    adminDrops: input.adminDropsOpen ? (input.adminDrops || EMPTY_ARRAY) : EMPTY_ARRAY,
    lootEntries: input.adminOpen ? (input.lootEntries || EMPTY_ARRAY) : EMPTY_ARRAY,
    cardDefs: input.adminOpen ? (input.cardDefs || EMPTY_ARRAY) : EMPTY_ARRAY,
    adminUsers: input.adminUsersOpen ? (input.adminUsers || EMPTY_ARRAY) : EMPTY_ARRAY,
    adminCourierJobs: input.adminCourierJobsOpen ? (input.adminCourierJobs || EMPTY_ARRAY) : EMPTY_ARRAY,
    adminBossRows: input.adminBossOpen ? (input.adminBossRows || EMPTY_ARRAY) : EMPTY_ARRAY,
  };
}

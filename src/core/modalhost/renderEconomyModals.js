import React from 'react';
import CollectionModal from '../../features/collection/CollectionModal';
import MarketModal from '../../features/market/MarketModal';
import TasksModal from '../../features/tasks/TasksModal';
import LeaderboardModal from '../../features/leaderboard/LeaderboardModal';

export function renderEconomyModals(props) {
  const {
    collectionOpen,
    setCollectionOpen,
    setActiveTab,
    collectionCards,
    collectionLoading,
    profile,
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
    setCardDetail,
    activeTab,
    marketLoading,
    listings,
    myListings,
    marketShopDefs,
    marketShopUi,
    loadMarket,
    buyListing,
    cancelListing,
    listCardForSale,
    userCardsRaw,
    energyUI,
    refreshProfile,
    loc,
    openCourierBoard,
    dailyRewardState,
    taskState,
    weeklyTaskState,
    tasksDbReady,
    openBossFromTasks,
    weeklyDbReady,
    claimTask,
    openBoss,
    leaderMetric,
    leaderWeekOffset,
    leaderClosed,
    leaderWeek,
    leaderRows,
    leaderLoading,
    isAdmin,
    closeWeekLoading,
    closePrevWeek,
    loadLeaderboard,
    setLeaderWeekOffset,
    setLeaderMetric,
    sessionUserId,
    claimWeeklyTopReward,
    rewardClaimLoading,
    leaderError,
  } = props;

  return (
    <>
      {collectionOpen ? (
        <CollectionModal
          visible
          onClose={() => {
            setCollectionOpen(false);
            setActiveTab('map');
          }}
          cards={collectionCards}
          loading={collectionLoading}
          profile={profile}
          onRecycle={recycleDuplicatesAll}
          onExchange={exchangeShards}
          onCraft={craftShardCard}
          onUpgrade={upgradeShardCard}
          recycling={recycleLoading}
          exchangeLoading={shardExchangeLoading}
          craftLoading={shardCraftLoading}
          upgradeLoading={shardUpgradeLoading}
          bossTicketLoading={bossTicketLoading}
          onCraftBossTicket={craftBossTicket}
          onOpenCard={setCardDetail}
          refreshProfile={refreshProfile}
          currentLocation={loc}
        />
      ) : null}

      {activeTab === 'market' ? (
        <MarketModal
          visible
          onClose={() => setActiveTab('map')}
          loading={marketLoading}
          listings={listings}
          myListings={myListings}
          profile={profile}
          energyDisplay={energyUI}
          shopDefs={marketShopDefs}
          shopUi={marketShopUi}
          onRefresh={loadMarket}
          onBuy={buyListing}
          onCancel={cancelListing}
          onList={listCardForSale}
          userCards={userCardsRaw}
          onOpenCard={setCardDetail}
          refreshProfile={refreshProfile}
          currentLocation={loc}
          dkd_on_open_courier_board_value={() => {
            setActiveTab('map');
            openCourierBoard?.();
          }}
        />
      ) : null}

      {activeTab === 'tasks' ? (
        <TasksModal
          visible
          onClose={() => setActiveTab('map')}
          profile={profile}
          energyDisplay={energyUI}
          dailyRewardState={dailyRewardState}
          taskState={taskState}
          weeklyState={weeklyTaskState}
          tasksDbReady={tasksDbReady}
          weeklyDbReady={weeklyDbReady}
          onClaim={claimTask}
          onOpenBoss={openBossFromTasks || openBoss}
        />
      ) : null}

      {activeTab === 'leader' ? (
        <LeaderboardModal
          visible
          onClose={() => setActiveTab('map')}
          metric={leaderMetric}
          weekOffset={leaderWeekOffset}
          closed={leaderClosed}
          week={leaderWeek}
          rows={leaderRows}
          loading={leaderLoading}
          isAdmin={isAdmin}
          closeWeekLoading={closeWeekLoading}
          onCloseWeek={() => closePrevWeek()}
          onWeekOffsetChange={(offset) => {
            setLeaderWeekOffset(offset);
            loadLeaderboard(leaderMetric, offset, { visible: true });
          }}
          onMetricChange={(metric) => {
            setLeaderMetric(metric);
            loadLeaderboard(metric, leaderWeekOffset, { visible: true });
          }}
          onRefresh={(metric, offset) => loadLeaderboard(metric, offset ?? leaderWeekOffset, { visible: true })}
          meUserId={sessionUserId}
          onClaimReward={(metric) => claimWeeklyTopReward(metric)}
          claimingReward={rewardClaimLoading}
          error={leaderError}
        />
      ) : null}
    </>
  );
}

export default renderEconomyModals;

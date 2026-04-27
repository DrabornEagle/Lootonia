import React, { memo } from 'react';
import ActionMenuModal from '../features/navigation/ActionMenuModal';
import DropListModal from '../features/map/DropListModal';
import ScannerModal from '../features/chest/ScannerModal';
import ChestModal from '../features/chest/ChestModal';
import ProfileModal from '../features/profile/ProfileModal';
import HistoryModal from '../features/history/HistoryModal';
import CollectionModal from '../features/collection/CollectionModal';
import MarketModal from '../features/market/MarketModal';
import TasksModal from '../features/tasks/TasksModal';
import LeaderboardModal from '../features/leaderboard/LeaderboardModal';
import BossIntroModal from '../features/boss/BossIntroModal';
import BossQuizModal from '../features/boss/BossQuizModal';
import AdminMenuModal from '../features/admin/AdminMenuModal';
import AdminDropsModal from '../features/admin/AdminDropsModal';
import AdminLootModal from '../features/admin/AdminLootModal';
import CourierBoardModal from '../features/courier/CourierBoardModal';
import DkdCourierLiveSyncBridge from '../features/courier/dkd_courier_live_sync_bridge';
import AdminUsersModal from '../features/admin/AdminUsersModal';
import AdminCourierJobsModal from '../features/admin/AdminCourierJobsModal';
import AdminBroadcastModal from '../features/admin/AdminBroadcastModal';
import AdminBossModal from '../features/admin/AdminBossModal';
import AdminMarketModal from '../features/admin/AdminMarketModal';
import AdminBusinessModal from '../features/business/AdminBusinessModal';
import DailyRewardModal from '../features/dailyReward/DailyRewardModal';
import AchievementsModal from '../features/achievements/AchievementsModal';
import SocialPlayerCardModal from '../features/social/SocialPlayerCardModal';
import SocialCompareModal from '../features/social/SocialCompareModal';
import AllyHubModal from '../features/social/AllyHubModal';
import ClanHubModal from '../features/clan/ClanHubModal';

function ModalHost(props) {
  const {
    actionMenuOpen,
    setActionMenuOpen,
    closeActionMenu,
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
    closeDropList,
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
    profileOpen,
    profile,
    refreshProfile,
    saveProfileNick,
    historyOpen,
    setActiveTab,
    historyLogs,
    historyLoading,
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
    marketShopDefs,
    marketShopUi,
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
    openBoss,
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
    sessionUserId,
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
    setAdminUserSearch,
    adminSaveUser,
    adminCourierJobsLoading,
    adminCourierJobs,
    adminUpsertCourierJob,
    adminDeleteCourierJob,
    adminBroadcastLoading,
    adminSendBroadcast,
    adminNotificationTemplateLoading,
    adminNotificationTemplates,
    loadAdminNotificationTemplates,
    adminSaveNotificationTemplate,
    adminBossLoading,
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
    adminMarketLoading,
    adminMarketUi,
    adminMarketDefs,
    adminMarketRewardTypes,
    loadAdminBossDefs,
    loadAdminMarketCommand,
    adminSaveBoss,
    adminDeleteBoss,
    adminSaveMarketUi,
    adminSaveMarketPack,
    adminDeleteMarketPack,
    adminSaveMarketRewardType,
    adminDeleteMarketRewardType,
    dailyRewardModalOpen,
    dailyRewardState,
    claimDailyRewardLoading,
    dailyRewardHubLoading,
    closeDailyRewardModal,
    claimTodayDailyReward,
    socialCardOpen,
    setSocialCardOpen,
    socialCompareOpen,
    setSocialCompareOpen,
    openSocialPlayerCard,
    openSocialCompare,
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
    claimDailyRewardStreakMilestone,
    achievementsOpen,
    setAchievementsOpen,
    achievementsState,
    claimAchievementLoading,
    refreshAchievements,
    claimAchievement,
    selectFavoriteAchievement,
    reorderAchievementShelf,
  } = props;

  return (
    <>
      {dailyRewardModalOpen ? (
        <DailyRewardModal
          visible
          state={dailyRewardState}
          claimLoading={claimDailyRewardLoading}
          rewardHubLoading={dailyRewardHubLoading}
          onClaim={claimTodayDailyReward}
          onClose={closeDailyRewardModal}
          onClaimMilestone={claimDailyRewardStreakMilestone}
        />
      ) : null}

      {actionMenuOpen ? (
        <ActionMenuModal
          visible
          onClose={closeActionMenu || (() => setActionMenuOpen(false))}
          isAdmin={isAdmin}
          canCourier={String(profile?.courier_status || 'none') === 'approved'}
          onCourier={() => setCourierBoardOpen(true)}
          onProfile={() => setProfileOpen(true)}
          onAllyHub={() => setActiveTab('ally')}
          onLeaderboard={() => setActiveTab('leader')}
          onPlayerCard={openSocialPlayerCard || (() => setSocialCardOpen(true))}
          onClan={openClanHub || (() => setClanOpen(true))}
          clanTag={clanState?.tag}
          onHistory={() => {
            setHistoryOpen(true);
            loadHistory({ force: true });
          }}
          onAdmin={() => setAdminMenuOpen(true)}
          onLogout={logout}
        />
      ) : null}

      {dropListOpen ? (
        <DropListModal
          visible
          onClose={closeDropList || (() => setDropListOpen(false))}
          drops={visibleDrops}
          getCooldown={getCooldown}
          isNear={isNear}
          onNavigate={openDirections}
          onOpen={handleDropOpen}
          onLocate={recenterToCurrentLocation}
        />
      ) : null}

      {scannerOpen ? (
        <ScannerModal
          visible
          activeDrop={activeDrop}
          near={activeNear}
          onOpenByCode={openChestByCode}
          onNavigateToDrop={openDirections}
          onClose={() => {
            setScannerOpen(false);
            setActiveDropId(null);
          }}
          onScanned={(data) => {
            setScannerOpen(false);
            openChestByQr(data);
            setActiveDropId(null);
          }}
        />
      ) : null}

      {chestOpen ? (
        <ChestModal
          visible
          stage={chestStage}
          payload={chestPayload}
          spinDeg={chestSpin}
          onClose={() => {
            setChestOpen(false);
            setChestStage('opening');
            setChestPayload(null);
          }}
        />
      ) : null}

      {profileOpen ? (
        <ProfileModal
          visible
          onClose={() => setProfileOpen(false)}
          profile={profile}
          onSave={saveProfileNick}
          onOpenPlayerCard={openSocialPlayerCard || (() => setSocialCardOpen(true))}
          onOpenClanHub={openClanHub || (() => setClanOpen(true))}
          clanState={clanState}
        />
      ) : null}

      <DkdCourierLiveSyncBridge
        dkd_profile_value={profile}
        dkd_current_location_value={loc}
        dkd_session_user_id_value={sessionUserId}
      />

      {courierBoardOpen ? (
        <CourierBoardModal
          visible
          onClose={() => setCourierBoardOpen(false)}
          profile={profile}
          currentLocation={loc}
          sessionUserId={sessionUserId}
          setProfile={setProfile}
        />
      ) : null}

      {clanOpen ? (
        <ClanHubModal
          visible
          onClose={() => setClanOpen(false)}
          clanState={clanState}
          clanDerived={clanDerived}
          clanLoading={clanLoading}
          clanSaving={clanSaving}
          clanShareText={clanShareText}
          createOrUpdateClan={createOrUpdateClan}
          addClanMember={addClanMember}
          removeClanMember={removeClanMember}
          claimClanMission={claimClanMission}
          leaveClan={leaveClan}
        />
      ) : null}

      {socialCardOpen ? (
        <SocialPlayerCardModal
          visible
          onClose={() => setSocialCardOpen(false)}
          onOpenCompare={openSocialCompare || (() => {
            setSocialCardOpen(false);
            setSocialCompareOpen(true);
          })}
          sessionUserId={sessionUserId}
          profile={profile}
          cards={collectionCards}
          taskState={taskState}
          weeklyTaskState={weeklyTaskState}
          clanState={clanState}
        />
      ) : null}

      {socialCompareOpen ? (
        <SocialCompareModal
          visible
          onClose={() => setSocialCompareOpen(false)}
          onBack={() => {
            setSocialCompareOpen(false);
            setSocialCardOpen(true);
          }}
          localCard={localSocialCard}
        />
      ) : null}

      {historyOpen ? (
        <HistoryModal
          visible
          onClose={() => {
            setHistoryOpen(false);
            setActiveTab('map');
          }}
          logs={historyLogs}
          loading={historyLoading}
          onRefresh={loadHistory}
          onOpenCard={setCardDetail}
          refreshProfile={refreshProfile}
        />
      ) : null}

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
        />
      ) : null}

      {activeTab === 'ally' ? (
        <AllyHubModal
          visible
          onClose={() => setActiveTab('map')}
          sessionUserId={sessionUserId}
          profile={profile}
          refreshProfile={refreshProfile}
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
          currentLocation={loc}
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
          onOpenBoss={openBoss}
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
            loadLeaderboard(leaderMetric, offset);
          }}
          onMetricChange={(metric) => {
            setLeaderMetric(metric);
            loadLeaderboard(metric, leaderWeekOffset);
          }}
          onRefresh={(metric, offset) => loadLeaderboard(metric, offset ?? leaderWeekOffset)}
          meUserId={sessionUserId}
          onClaimReward={(metric) => claimWeeklyTopReward(metric)}
          claimingReward={rewardClaimLoading}
          error={leaderError}
        />
      ) : null}

      {bossIntroOpen ? (
        <BossIntroModal
          visible
          payload={bossIntroPayload}
          onClose={() => {
            setBossIntroOpen(false);
            setBossIntroPayload(null);
          }}
          onStart={() => startBossSession(bossIntroPayload?.mode || 'daily', bossIntroPayload?.dropId || null)}
        />
      ) : null}

      {bossOpen ? (
        <BossQuizModal
          visible
          onClose={() => setBossOpen(false)}
          bossState={bossState}
          onAnswer={bossAnswer}
          onTryAgain={bossTryAgain}
          onOpenChest={bossOpenChestNow}
        />
      ) : null}

      {adminMenuOpen ? (
        <AdminMenuModal
          visible
          onClose={() => setAdminMenuOpen(false)}
          onBusiness={() => {
            setAdminMenuOpen(false);
            setAdminBusinessOpen(true);
            loadAdminBusinesses(true);
          }}
          onUsers={() => {
            setAdminMenuOpen(false);
            setAdminUsersOpen(true);
            loadAdminUsers('');
          }}
          onCourierJobs={() => {
            setAdminMenuOpen(false);
            setAdminCourierJobsOpen(true);
            loadAdminCourierJobs();
          }}
          onLoot={() => {
            setAdminMenuOpen(false);
            setAdminOpen(true);
            loadAdminData();
          }}
          onDrops={() => {
            setAdminMenuOpen(false);
            setAdminDropsOpen(true);
            loadAdminDrops();
          }}
          onBroadcast={() => {
            setAdminMenuOpen(false);
            setAdminBroadcastOpen(true);
          }}
          onBoss={() => {
            setAdminMenuOpen(false);
            setAdminBossOpen(true);
            loadAdminBossDefs(true);
            loadAdminDrops(true);
          }}
          onMarket={() => {
            setAdminMenuOpen(false);
            if (typeof setAdminMarketOpen === 'function') setAdminMarketOpen(true);
            loadAdminMarketCommand(true);
          }}
        />
      ) : null}




      {adminMarketOpen ? (
        <AdminMarketModal
          visible
          onClose={() => { if (typeof setAdminMarketOpen === 'function') setAdminMarketOpen(false); }}
          loading={adminMarketLoading}
          uiConfig={adminMarketUi}
          packs={adminMarketDefs}
          onRefresh={loadAdminMarketCommand}
          onSaveUi={adminSaveMarketUi}
          onSavePack={adminSaveMarketPack}
          onDeletePack={adminDeleteMarketPack}
          rewardTypes={adminMarketRewardTypes}
          onSaveRewardType={adminSaveMarketRewardType}
          onDeleteRewardType={adminDeleteMarketRewardType}
        />
      ) : null}

      {adminBusinessOpen ? (
        <AdminBusinessModal
          visible
          onClose={() => setAdminBusinessOpen(false)}
          loading={adminBusinessesLoading}
          businesses={adminBusinesses}
          selectedBusinessId={adminSelectedBusinessId}
          businessDraft={adminBusinessDraft}
          onChangeBusinessDraft={setAdminBusinessDraft}
          snapshotLoading={adminBusinessSnapshotLoading}
          snapshot={adminBusinessSnapshot}
          campaignDraft={adminCampaignDraft}
          onChangeCampaignDraft={setAdminCampaignDraft}
          onRefreshBusinesses={loadAdminBusinesses}
          onSelectBusiness={selectAdminBusiness}
          onSaveBusiness={adminSaveBusiness}
          onSaveCampaign={adminSaveBusinessCampaign}
          onSimulateQr={adminLogBusinessQrScan}
          onSimulateCoupon={adminLogBusinessCouponUse}
        />
      ) : null}

      {adminBossOpen ? (
        <AdminBossModal
          visible
          onClose={() => setAdminBossOpen(false)}
          loading={adminBossLoading}
          bossDefs={adminBossDefs}
          bossDrops={(Array.isArray(adminDrops) ? adminDrops : []).filter((item) => {
            const rawType = String(item?.type || item?.drop_type || item?.dropType || item?.kind || item?.source_type || '').trim().toLowerCase();
            const rawName = String(item?.name || item?.title || '').trim().toLowerCase();
            return rawType === 'boss'
              || rawType.includes('boss')
              || rawType.includes('crown')
              || rawType.includes('raid')
              || (!rawType && rawName.includes('boss'));
          })}
          onRefresh={(force = true) => Promise.all([
            loadAdminDrops(force),
            loadAdminBossDefs(force),
          ])}
          onSave={adminSaveBoss}
          onDelete={adminDeleteBoss}
        />
      ) : null}

      {adminBroadcastOpen ? (
        <AdminBroadcastModal
          visible
          onClose={() => setAdminBroadcastOpen(false)}
          loading={adminBroadcastLoading}
          onSend={adminSendBroadcast}
          templateLoading={adminNotificationTemplateLoading}
          templateRows={adminNotificationTemplates}
          onRefreshTemplates={loadAdminNotificationTemplates}
          onSaveTemplate={adminSaveNotificationTemplate}
        />
      ) : null}

      {adminDropsOpen ? (
        <AdminDropsModal
          visible
          onClose={() => setAdminDropsOpen(false)}
          loading={adminDropsLoading}
          drops={adminDrops}
          onRefresh={loadAdminDrops}
          onUpsert={adminUpsertDrop}
          onDelete={adminDeleteDrop}
          currentLoc={loc}
        />
      ) : null}

      {adminUsersOpen ? (
        <AdminUsersModal
          visible
          onClose={() => setAdminUsersOpen(false)}
          loading={adminUsersLoading}
          users={adminUsers}
          search={adminUserSearch}
          setSearch={setAdminUserSearch}
          onRefresh={loadAdminUsers}
          onSave={adminSaveUser}
        />
      ) : null}

      {adminCourierJobsOpen ? (
        <AdminCourierJobsModal
          visible
          onClose={() => setAdminCourierJobsOpen(false)}
          loading={adminCourierJobsLoading}
          jobs={adminCourierJobs}
          onRefresh={loadAdminCourierJobs}
          onSave={adminUpsertCourierJob}
          onDelete={adminDeleteCourierJob}
        />
      ) : null}

      {adminOpen ? (
        <AdminLootModal
          visible
          onClose={() => setAdminOpen(false)}
          loading={adminLoading}
          entries={lootEntries}
          cardDefs={cardDefs}
          cardSearch={cardSearch}
          setCardSearch={setCardSearch}
          onAdd={adminAddLoot}
          onDelete={adminDeleteLoot}
        />
      ) : null}

      {achievementsOpen ? (
        <AchievementsModal
          visible
          state={achievementsState}
          claimLoading={claimAchievementLoading}
          onClaim={claimAchievement}
          onFavorite={selectFavoriteAchievement}
          onReorderShelf={reorderAchievementShelf}
          onClose={() => setAchievementsOpen?.(false)}
        />
      ) : null}
    </>
  );
}

export default memo(ModalHost);

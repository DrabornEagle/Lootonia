import React from 'react';
import AdminMenuModal from '../../features/admin/AdminMenuModal';
import AdminDropsModal from '../../features/admin/AdminDropsModal';
import AdminLootModal from '../../features/admin/AdminLootModal';
import AdminUsersModal from '../../features/admin/AdminUsersModal';
import AdminCourierJobsModal from '../../features/admin/AdminCourierJobsModal';
import AdminBroadcastModal from '../../features/admin/AdminBroadcastModal';
import AdminBossModal from '../../features/admin/AdminBossModal';
import AdminMarketModal from '../../features/admin/AdminMarketModal';

export function renderAdminModals(props) {
  const {
    adminMenuOpen,
    setAdminMenuOpen,
    setAdminUsersOpen,
    loadAdminUsers,
    setAdminCourierJobsOpen,
    loadAdminCourierJobs,
    setAdminOpen,
    loadAdminData,
    setAdminDropsOpen,
    loadAdminDrops,
    setAdminBroadcastOpen,
    setAdminMarketOpen,
    setAdminBossOpen,
    loadAdminBossDefs,
    loadAdminMarketCommand,
    adminMarketOpen,
    adminMarketLoading,
    adminMarketUi,
    adminMarketDefs,
    adminMarketRewardTypes,
    adminSaveMarketUi,
    adminSaveMarketPack,
    adminDeleteMarketPack,
    adminSaveMarketRewardType,
    adminDeleteMarketRewardType,
    adminBossOpen,
    adminBossLoading,
    adminBossRows,
    adminSaveBoss,
    adminDeleteBoss,
    adminBroadcastOpen,
    setAdminBroadcastOpen: closeAdminBroadcastOpen,
    adminBroadcastLoading,
    adminSendBroadcast,
    adminDropsOpen,
    adminDropsLoading,
    adminDrops,
    adminUpsertDrop,
    adminDeleteDrop,
    loc,
    adminUsersOpen,
    setAdminUsersOpen: closeAdminUsersOpen,
    adminUsersLoading,
    adminUsers,
    adminUserSearch,
    setAdminUserSearch,
    adminSaveUser,
    adminCourierJobsOpen,
    setAdminCourierJobsOpen: closeAdminCourierJobsOpen,
    adminCourierJobsLoading,
    adminCourierJobs,
    adminUpsertCourierJob,
    adminDeleteCourierJob,
    adminOpen,
    adminLoading,
    lootEntries,
    cardDefs,
    cardSearch,
    setCardSearch,
    adminAddLoot,
    adminDeleteLoot,
  } = props;

  return (
    <>
      {adminMenuOpen ? (
        <AdminMenuModal
          visible
          onClose={() => setAdminMenuOpen(false)}
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
          onBoss={() => {
            setAdminMenuOpen(false);
            setAdminBossOpen(true);
            loadAdminBossDefs(true);
          }}
          onMarket={() => {
            setAdminMenuOpen(false);
            setAdminMarketOpen(true);
            loadAdminMarketCommand(true);
          }}
          onBroadcast={() => {
            setAdminMenuOpen(false);
            setAdminBroadcastOpen(true);
          }}
        />
      ) : null}


      {adminMarketOpen ? (
        <AdminMarketModal
          visible
          onClose={() => setAdminMarketOpen(false)}
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

      {adminBroadcastOpen ? (
        <AdminBroadcastModal
          visible
          onClose={() => closeAdminBroadcastOpen(false)}
          loading={adminBroadcastLoading}
          onSend={adminSendBroadcast}
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

      {adminBossOpen ? (
        <AdminBossModal
          visible
          onClose={() => setAdminBossOpen(false)}
          loading={adminBossLoading}
          rows={adminBossRows}
          onRefresh={loadAdminBossDefs}
          onSave={adminSaveBoss}
          onDelete={adminDeleteBoss}
        />
      ) : null}

      {adminUsersOpen ? (
        <AdminUsersModal
          visible
          onClose={() => closeAdminUsersOpen(false)}
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
          onClose={() => closeAdminCourierJobsOpen(false)}
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
    </>
  );
}

export default renderAdminModals;

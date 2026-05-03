import React from 'react';
import ChestModal from '../../features/chest/ChestModal';
import ProfileModal from '../../features/profile/ProfileModal';
import HistoryModal from '../../features/history/HistoryModal';
import BossIntroModal from '../../features/boss/BossIntroModal';
import BossQuizModal from '../../features/boss/BossQuizModal';
import CourierBoardModal from '../../features/courier/CourierBoardModal';

export function renderPlayerModals(props) {
  const {
    chestOpen,
    chestStage,
    chestPayload,
    chestSpin,
    setChestOpen,
    setChestStage,
    setChestPayload,
    profileOpen,
    setProfileOpen,
    profile,
    saveProfileNick,
    courierBoardOpen,
    setCourierBoardOpen,
    sessionUserId,
    isAdmin,
    setProfile,
    historyOpen,
    setHistoryOpen,
    setActiveTab,
    dkd_set_logistics_initial_panel_value,
    dkd_courier_initial_panel_value,
    historyLogs,
    historyLoading,
    loadHistory,
    setCardDetail,
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
  } = props;

  return (
    <>
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
        />
      ) : null}

      {courierBoardOpen ? (
        <CourierBoardModal
          visible
          onClose={() => setCourierBoardOpen(false)}
          profile={profile}
          sessionUserId={sessionUserId}
          isAdmin={isAdmin}
          setProfile={setProfile}
          dkd_initial_panel_value={dkd_courier_initial_panel_value || 'default'}
          dkd_on_open_logistics_value={() => {
            dkd_set_logistics_initial_panel_value?.('application');
            setCourierBoardOpen(true);
          }}
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
    </>
  );
}

export default renderPlayerModals;

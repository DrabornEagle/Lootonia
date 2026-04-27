# ModalHost Split Plan

Amaç: `src/core/ModalHost.js` dosyasını davranış değiştirmeden 4 parçaya ayırmak.

Önerilen gruplar:
- renderNavigationModals
  - ActionMenuModal
  - DropListModal
  - ScannerModal
- renderPlayerModals
  - ChestModal
  - ProfileModal
  - CourierBoardModal
  - HistoryModal
  - BossIntroModal
  - BossQuizModal
- renderEconomyModals
  - CollectionModal
  - MarketModal
  - TasksModal
  - LeaderboardModal
- renderAdminModals
  - AdminMenuModal
  - AdminBroadcastModal
  - AdminDropsModal
  - AdminUsersModal
  - AdminCourierJobsModal
  - AdminLootModal

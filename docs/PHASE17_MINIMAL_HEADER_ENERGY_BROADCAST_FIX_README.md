# Phase 17 — Minimal Header + Energy Stability + Admin Broadcast

Bu paket şu sorunları hedefler:

- Expo Go bildirim uyarı overlay/log temizleme
- Bildirim içeriğinde gönderenin `DrabornEagle` görünmesi
- Sandık açarken çift istek yüzünden önce hata sonra başarı görünmesi
- Sandık açılışından sonra enerjinin hemen geri sıçraması
- Üst header panellerini daha minimal hale getirme
- Admin panelde herkese yayın duyurusu paneli

## Kopyalanan ana dosyalar
- `App.js`
- `src/services/notificationService.js`
- `src/hooks/useEnergyState.js`
- `src/hooks/useProfileData.js`
- `src/hooks/useChestActions.js`
- `src/features/map/HeaderOverlay.js`
- `src/core/GameFlow.js`
- `src/core/ModalHost.js`
- `src/features/admin/AdminMenuModal.js`
- `src/features/admin/AdminBroadcastModal.js`
- `src/services/adminService.js`
- `src/services/announcementService.js`
- `src/hooks/useAdminData.js`
- `supabase/sql/018_admin_broadcast_foundation.sql`

# Lootonia LiveOps Core 1

Bu paket şunları ekler:
- günlük giriş ödülü
- local streak takibi
- header üstünde LiveOps banner
- günlük ödül modalı
- görev ekranına hızlı geçiş

Teknik yaklaşım:
- streak durumu `AsyncStorage` içinde kullanıcı bazlı tutulur
- ödül claim edildiğinde token/xp profiline yazılmaya çalışılır
- yeni DB migration gerekmez
- UI tarafı sadece harita/header/modals hattına dokunur

Dokunulan dosyalar:
- `src/core/GameFlow.js`
- `src/core/ModalHost.js`
- `src/core/propBuilders.js`
- `src/features/map/HeaderOverlay.js`
- `src/features/map/MapHomeScreen.js`
- `src/features/liveops/LiveEventBanner.js`
- `src/features/liveops/DailyRewardModal.js`
- `src/hooks/useLiveOpsState.js`
- `src/services/liveOpsService.js`

Kontrol listesi:
1. Oyuna girince günlük ödül modalı açılıyor mu
2. Header altında LiveOps kartı görünüyor mu
3. `Günlük Ödülü Al` sonrası token ve XP artıyor mu
4. Aynı gün tekrar claim denemesinde uyarı geliyor mu
5. `Görevlere Git` butonu görev ekranını açıyor mu

# LiveOps Core 3 Notes

Bu paket LiveOps Core 2 üstüne kurulur.

Eklenenler:
- Etkinlik sayaçları: banner, günlük ödül modalı ve admin panelde kalan süre görünür.
- Admin preset seçimi: etkinliği sırayla çevirmek yerine doğrudan preset kartından seçebilirsin.
- Ödül nabzı: günlük ödül veya etkinlik görevi claim sonrası header altında kısa süreli başarı kartı görünür.

Dokunulan dosyalar:
- src/services/liveOpsService.js
- src/hooks/useLiveOpsState.js
- src/hooks/useEventCountdown.js
- src/features/liveops/LiveEventBanner.js
- src/features/liveops/DailyRewardModal.js
- src/features/liveops/LiveOpsAdminModal.js
- src/core/GameFlow.js
- src/core/ModalHost.js
- src/features/map/HeaderOverlay.js
- src/features/map/MapHomeScreen.js

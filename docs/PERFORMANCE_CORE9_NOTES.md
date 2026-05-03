# Lootonia Performance Core 9

## Amaç
Görünmeyen ekranların veri tazelerken UI state'i gereksiz yere güncelleyip render zinciri oluşturmasını azaltmak.

## Bu pakette ne değişti?
- `useHistoryData`, `useCollectionActions`, `useMarketData`, `useLeaderboardData` artık `isVisible` mantığıyla çalışıyor.
- Ekran görünmüyorsa veri yine fetch ediliyor ve cache güncelleniyor.
- Ama görünmeyen ekranda `setState` / loading / hata alert'i gereksiz yere tetiklenmiyor.
- Ekran açılırken `visible: true` ile cache anında hydrate ediliyor.

## Dokunulan dosyalar
- `src/core/GameFlow.js`
- `src/core/ModalHost.js`
- `src/core/modalhost/renderEconomyModals.js`
- `src/core/modalhost/renderNavigationModals.js`
- `src/hooks/useCollectionActions.js`
- `src/hooks/useHistoryData.js`
- `src/hooks/useLeaderboardData.js`
- `src/hooks/useMarketData.js`

## Beklenen etki
- Chest / craft / market sonrası gizli ekranlarda gereksiz rerender azalır.
- Harita üzerindeyken arka planda collection / market / history / leaderboard state churn'i düşer.
- Ekran tekrar açılınca cache-first davranış korunur.

## Güvenlik sınırı
- Supabase schema / RPC / auth akışına dokunulmadı.
- Oyun ekonomisi veya görev mantığı değiştirilmedi.
- Sadece görünürlük odaklı UI hydration davranışı değiştirildi.

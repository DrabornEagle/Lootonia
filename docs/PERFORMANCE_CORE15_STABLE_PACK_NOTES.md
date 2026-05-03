# Performance Core 15 — Stable Pack

Bu paket yeni özellik eklemez. Amaç, önceki performans işlerinin üstüne daha güvenli bir **stabilizasyon** katmanı koymaktır.

## Ne değişti
- `useCollectionActions` içine **in-flight request dedupe** eklendi
- `useMarketData` içine **in-flight request dedupe** eklendi
- `useHistoryData` içine **in-flight request dedupe** eklendi
- `useLeaderboardData` içine **key bazlı in-flight request dedupe** eklendi
- `GameFlow` içinde `useHistoryData` artık `sessionUserId` ile çağrılıyor

## Neden faydalı
Bazı akışlarda aynı ekran veya aynı refresh zinciri çok kısa aralıkla birden fazla kez tetiklenebiliyor:
- tab değişimleri
- market / collection sonrası zincir refresh
- modal aç/kapa
- hızlı art arda tıklamalar

Bu paketten sonra aynı veri yükü zaten devam ediyorsa ikinci kez yeni istek açılmaz; mevcut istek paylaşılır.

## Beklenen etki
- gereksiz paralel fetch azalır
- ani loading sıçramaları azalır
- market / collection / history / leaderboard tarafı daha stabil hissedilir
- canlı mantık değişmez

## Dokunulan dosyalar
- `src/core/GameFlow.js`
- `src/hooks/useCollectionActions.js`
- `src/hooks/useMarketData.js`
- `src/hooks/useHistoryData.js`
- `src/hooks/useLeaderboardData.js`

## Risk seviyesi
Düşük. Bu paket veri modelini veya RPC sözleşmelerini değiştirmez; sadece aynı anda birden fazla aynı isteğin açılmasını engeller.

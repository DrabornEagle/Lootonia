# Lootonia – Performance Core 10

Bu paket, admin dışı modal ve post-action refresh akışlarını ortak bir sıraya alır.

## Amaç
- Aynı anda birden fazla veri yenilemeyi başlatıp ana ekranı sarsmamak
- Chest / market / shard / görev sonrası güncellemeleri daha düzenli sıraya sokmak
- Modal açılışlarında gereksiz paralel refresh yükünü azaltmak

## Dokunulan dosyalar
- `src/hooks/useRefreshScheduler.js` ← yeni
- `src/hooks/useCollectionActions.js`
- `src/hooks/useMarketData.js`
- `src/hooks/useChestActions.js`
- `src/core/GameFlow.js`

## Ne değişti
- `useRefreshScheduler` adında ortak bir refresh kuyruğu eklendi
- Aynı anahtar için bekleyen refresh tekrar çağrılırsa mevcut promise yeniden kullanılıyor
- `collection / market / history / leaderboard` açılışları kuyruktan geçiyor
- `chest` sonrası profile, userDrops, history, collection, market, daily, weekly refresh zinciri sıraya alındı
- `market` ve `collection` aksiyonları refresh patlaması yerine kontrollü sırayla çalışıyor

## Dokunulmayan yerler
- Auth
- Supabase RPC mantığı
- Chest ödül formülü
- Boss mantığı
- Market fiyatlama ve satın alma kuralları

## Beklenen etki
- Chest sonrası kısa süreli UI silkelenmesi azalır
- Collection / market / leaderboard tekrar açılışları daha dengeli olur
- Aynı anda birden çok fetch bindirilmediği için Android'de takılma azalır

## Kurulum
```bash
cd ~/projects/lootonia
unzip -o /sdcard/Download/lootonia_performance_core10_patch_pack.zip -d .
bash scripts/apply_lootonia_performance_core10.sh ~/projects/lootonia
npx expo start -c
```

## Kontrol listesi
- Sandık açtıktan sonra harita daha stabil mi
- Collection açınca veri güncel geliyor mu
- Market satın al / ilan ver / kaldır sonrası akış bozuldu mu
- Leaderboard tekrar açılınca veri geliyor mu
- Görev sekmesine geçince gereksiz bekleme azaldı mı

# Lootonia Performance Core 11

Bu paket ana harita CPU yükünü düşürmek için güvenli tarafta kalan iyileştirmeler içerir.

## Yapılanlar
- `useThrottledLocation` eklendi.
- Yakınlık hesabı ham konum yerine daha sakin güncellenen konum üzerinden çalışır hale getirildi.
- Cooldown sayaç türevi her saniye yerine 3 saniyelik bucket ile yeniden hesaplanır.
- Harita marker'larında `tracksViewChanges={false}` açıldı.
- `PremiumMapMarker` içindeki görsel türetimi memo yapısına alındı.

## Dokunulan dosyalar
- `src/hooks/useThrottledLocation.js`
- `src/core/GameFlow.js`
- `src/hooks/useDropState.js`
- `src/features/map/MapHomeScreen.js`
- `src/features/map/PremiumMapMarker.js`

## Beklenen etki
- Haritada gezinirken daha az yeniden render
- Marker katmanında daha düşük CPU yükü
- Yakınlık ve cooldown hesaplarında daha sakin güncelleme ritmi

## Risk seviyesi
Düşük. Oyun mantığına, drop açma akışına, auth veya Supabase RPC mantığına dokunulmadı.

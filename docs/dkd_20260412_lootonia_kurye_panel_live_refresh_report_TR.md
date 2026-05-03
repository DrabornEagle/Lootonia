# DKD 2026-04-12 Lootonia Kurye Paneli Canlı Refresh Raporu

## İncelenen ana dosyalar
- `src/features/courier/dkd_cargo_live_map_modal.js`
- `src/features/courier/dkd_courier_live_sync_bridge.js`
- `src/features/courier/dkd_cargo_sender_panel.js`

## Tespit edilen ana sorunlar
1. **Varış süresi yanlış kaynaktan gösteriliyordu.**
   - Panel, canlı rota süresi yerine önce eski `eta_min` değerini kullanıyordu.
   - Bu yüzden gerçek dakika yerine eski / sabit / gecikmiş sayı görülebiliyordu.

2. **`Teslime Kalan` hesabı accepted aşamasında eksik kalıyordu.**
   - Kurye henüz göndericiye giderken sadece `kurye -> gönderici` bacağı baz alınıyordu.
   - Final teslim için gerekli `gönderici -> teslimat` kısmı toplam süreye ve km'ye eklenmiyordu.

3. **Eski rota isteği yeni isteğin üstüne yazabiliyordu.**
   - Konum hızlı değişince eski ağ cevabı sonradan dönüp yeni rota bilgisini ezebiliyordu.
   - Bu durum rota / km / ETA bilgisini geç güncelleniyormuş gibi gösterebiliyordu.

4. **Canlı takip fetch zinciri yavaştı.**
   - Canlı kurye sync köprüsü ve gönderici canlı takip yenilemesi biraz ağır aralıklardaydı.

5. **Sağ üst konum ortalama butonu fazla yukarıdaydı.**
   - Harita üst kartına fazla yakın duruyordu.

## Uygulanan düzeltmeler

### 1) Gerçek ETA hesabı
`dkd_cargo_live_map_modal.js` içinde:
- Accepted aşamasında:
  - `kurye -> gönderici`
  - `gönderici -> teslimat`
  bacakları toplanarak final ETA üretildi.
- Picked up aşamasında:
  - `kurye -> teslimat`
  canlı rota süresi kullanıldı.
- OSRM henüz dönmediyse haversine tabanlı fallback ETA devreye alındı.

### 2) Teslime kalan km düzeltmesi
- Accepted aşamasında kalan km artık:
  - `kurye -> gönderici` + `gönderici -> teslimat`
- Picked up aşamasında:
  - `kurye -> teslimat`

### 3) Stale rota cevabı koruması
- Route request serial ref eklendi.
- Eski istek yeni isteğin state'ini ezemiyor.

### 4) Canlı refresh hızlandırması
- `dkd_courier_live_sync_bridge.js`
  - görev liste sync: `12000ms -> 6000ms`
  - canlı location ping: `7000ms -> 4000ms`
- `dkd_cargo_sender_panel.js`
  - canlı takip shipment refresh: `8000ms -> 4000ms`

### 5) UI konum butonu
- Sağ üst `crosshairs-gps` floating button aşağı çekildi.

## SQL durumu
- Bu paket için zorunlu DB şema değişikliği yok.
- Bilgi amaçlı güvenli no-op SQL dosyası eklendi.

## Beklenen sonuç
- Varış süresi daha gerçekçi görünür.
- `Teslime Kalan` km accepted aşamasında doğru toplamı gösterir.
- Canlı rota ve km daha sık ve daha tutarlı yenilenir.
- Sağ üst konum ortalama ikonu daha dengeli konumda görünür.

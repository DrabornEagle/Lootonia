# Lootonia Kurye Teslim Alma Fotoğrafı Raporu

## Yapılan güncelleme
- Sipariş havuzunda kurye `Ürünü teslim aldım` akışına kamera zorunluluğu eklendi.
- Kargo görevlerinde önce modern teslim alma penceresi açılıyor.
- Kurye kameradan fotoğraf çekmeden teslim alma onayı veremiyor.
- Çekilen görsel Supabase storage üstüne yükleniyor.
- Teslim alma tamamlanınca cargo shipment kaydına `pickup_proof_image_url` yazılıyor.
- Gönderici tarafındaki kargo takip kartında da teslim alma fotoğrafı gösteriliyor.

## Değişen dosyalar
- `src/features/courier/CourierBoardModal.js`
- `src/services/courierService.js`
- `src/services/dkd_cargo_service.js`
- `src/features/courier/dkd_cargo_sender_panel.js`
- `supabase/sql/dkd_20260418_lootonia_cargo_pickup_proof_camera.sql`

## Uygulama notu
Bu akış mevcut cargo bucket yapısını tekrar kullanır. Ek bucket gerekmez.

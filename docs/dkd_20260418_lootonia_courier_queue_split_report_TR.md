# Lootonia Kurye Havuzu Kanal Ayrımı Raporu

## Yapılan değişiklikler
- Kurye Havuzu içinde görevler iki ayrı kanal halinde ayrıldı:
  - İşletme Siparişleri
  - Kargo Siparişleri
- İşletme ve kargo görevleri için modern renkli seçim kartları eklendi.
- Seçilen kanalın açık, aktif, biten ve toplam görev sayıları ayrı hesaplanır hale getirildi.
- Durum filtreleri artık seçili kanal üstünden çalışıyor.
- Boş durum metinleri işletme ve kargo için ayrı mesaj gösterecek şekilde güncellendi.

## Değişen dosya
- `src/features/courier/CourierBoardModal.js`

## Teknik not
- Ayırma mantığı `dkd_is_cargo_task(...)` ve yeni eklenen `dkd_is_business_task(...)` üstünden çalışır.
- Kargo görevi olmayan kurye görevleri otomatik olarak işletme siparişi kabul edilir.
- SQL değişikliği gerekmez.

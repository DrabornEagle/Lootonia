# DKD Acil Kurye Mağaza Fiyat + Bildirim Köprüsü Fix

## Sorun
- Mağaza bazlı fiyat girerken `operator does not exist: uuid = text` hatası oluşuyordu.
- Yeni APK’da işletme/kargo bildirimleri çalışırken Acil Kurye gerçek sipariş bildirimleri gelmiyordu.

## Düzeltme
- `dkd_urgent_courier_set_item_totals_dkd` ve `dkd_urgent_courier_set_single_store_total_dkd` yeniden kuruldu.
- `dkd_item_id` karşılaştırması `uuid = text` yerine güvenli `::text` karşılaştırmasıyla yapıldı.
- Acil Kurye siparişi `dkd_urgent_courier_orders` tablosuna düşüyorsa `dkd_courier_jobs` içinde `job_type='urgent'` mirror iş oluşturan trigger eklendi.
- Bu mirror iş mevcut çalışan `send-courier-order-alert` hattının bildirim göndermesini sağlar.

## Not
Genel işletme/kargo bildirim hattına dokunulmadı.

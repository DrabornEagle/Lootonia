# DKD Acil Kurye Performans Hızlandırma Raporu

Bu paket Acil Kurye web + uygulama tarafındaki ağır veri yükleme ve uzun bekleten işlem tıklamalarını hızlandırmak için hazırlandı.

## Uygulanan alanlar

- Supabase tarafına Acil Kurye sipariş, mesaj, ürün kalemi, push audit ve push token indexleri eklendi.
- `dkd_urgent_courier_snapshot_fast_dkd` hızlı snapshot RPC fonksiyonu eklendi.
- `dkd_urgent_courier_order_json_fast_dkd` ile her siparişte bütün eski mesajları taşımak yerine son mesajlar sınırlı döndürülür.
- `send-urgent-courier-alert` Edge Function hızlı cevap verecek şekilde güncellendi. Supabase Edge Runtime destekliyorsa Expo push gönderimi response sonrası arka plana alınır.
- Uygulama servisinde push event çağrıları işlem sonucunu bloklamayacak hale getirilir.
- Web Acil Kurye scriptinde snapshot RPC hızlı fonksiyona yönlendirilir, işlem sonrası full refresh bekleme kaldırılır ve çakışan yüklemeler azaltılır.

## Beklenen sonuç

- Acil Kurye paneli daha hızlı açılır.
- Sipariş kabul, taşıma ücreti onayı, ürün toplamı, mesaj ve teslimat gibi işlemler tıkladıktan sonra daha hızlı tepki verir.
- Bildirim gönderimi devam eder ama UI, Expo push ağına takılıp beklemez.

## Not

SQL çalıştırıldıktan ve Edge Function manuel deploy edildikten sonra web tarafı hemen hızlanır. Uygulama kaynak dosyası değişikliği için GitHub’dan yeni APK alınmalıdır.

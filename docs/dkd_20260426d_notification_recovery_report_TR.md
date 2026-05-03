# DKD 2026-04-26d Bildirim Kurtarma Raporu

## Sorun
GitHub APK / Edge Function deploy sonrası sipariş havuzu bildirimleri genel olarak çalışmamaya başladı.

## Düzeltme kapsamı
- `send-courier-order-alert` daha toleranslı hale getirildi.
- `cargo`, `merchant`, `urgent`, `urgent_courier`, `acil`, `acil_kurye` iş tipleri desteklenir.
- `open`, `pending`, `queued`, `new`, `created`, `requested`, `dkd_open`, `dkd_pending` durumları bildirim için uygun kabul edilir.
- Token hedefleri önce `dkd_courier_job_push_target_tokens()` RPC üzerinden okunur; RPC bozulursa doğrudan `dkd_push_tokens` tablosundan fallback yapılır.
- `expo_push_token` ve eski `token` kolon şemaları birlikte desteklenir.
- Audit tablosunda sadece `sent` kayıtları tekrar gönderimi engeller; `pending` veya `failed` kayıtları yeni denemeleri bloke etmez.
- SQL tarafında `dkd_upsert_push_token`, `dkd_disable_push_token` ve `dkd_courier_job_push_target_tokens` uyumluluk RPC fonksiyonları yeniden kurulur.

## Not
Bu paket uygulama UI dosyalarına dokunmaz. Öncelik, bozulmuş bildirim hattını geri ayağa kaldırmaktır.

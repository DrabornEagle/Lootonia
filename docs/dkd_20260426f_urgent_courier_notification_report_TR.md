# DKD Acil Kurye Bildirim Kurtarma Notu

Bu paket genel işletme/kargo bildirim hattını değiştirmeden `send-courier-order-alert` Edge Function kapsamını genişletir.

## Neyi düzeltir?

- Acil Kurye için `urgent`, `urgent_courier`, `acil`, `acil_kurye`, `express` türlerini kabul eder.
- Türkçe durumları kabul eder: `bekliyor`, `bekleyen`, `yeni`, `oluşturuldu`, `açık`, `acik`, `hazır`, `hazir`, `havuzda`.
- ID numerik değilse bile audit için kararlı sayısal anahtar üretir.
- Acil Kurye farklı tablodan gelirse payload `table` ve başlık alanlarından iş tipini tahmin eder.
- Hedef token okumada RPC çalışmazsa `dkd_push_tokens` fallback kullanır.

## Önemli

Eğer Acil Kurye siparişi `dkd_courier_jobs` dışında ayrı bir tabloya yazılıyorsa Supabase Dashboard > Database Webhooks tarafında o tablo için de `send-courier-order-alert` webhook'u açılmalıdır.

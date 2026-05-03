# DKD Acil Kurye Olay Bazlı Bildirim Paketi

Bu paket Acil Kurye akışında müşteri ve kurye arasında gerçekleşen kritik adımlar için açık metinli push bildirimleri ekler.

## Kapsanan olaylar

- Müşteri Acil Kurye siparişi oluşturur: lisanslı kuryelere bildirim gider.
- Müşteri siparişi iptal eder: kabul eden kuryeye bildirim gider.
- Kurye görevi kabul eder / taşıma ücreti teklif eder: müşteriye bildirim gider.
- Müşteri taşıma ücretini onaylar: kuryeye bildirim gider.
- Sohbet açılır: müşteri ve kuryeye bildirim gider.
- Müşteri mesaj gönderir: kuryeye bildirim gider.
- Kurye mesaj gönderir: müşteriye bildirim gider.
- Kurye mağaza bazlı ürün fiyatlarını girer: müşteriye bildirim gider.
- Müşteri ürün toplamını onaylar: kuryeye bildirim gider.
- Kurye faturayı yükler: müşteriye bildirim gider.
- Kurye ürünleri teslim alıp yola çıkar: müşteriye bildirim gider.
- Kurye siparişi teslim eder: müşteriye bildirim gider.

## Değişen dosyalar

- `supabase/functions/send-urgent-courier-alert/index.ts`
- `supabase/sql/dkd_20260426i_urgent_courier_event_notifications.sql`
- `supabase/migrations/20260426_dkd_urgent_courier_event_notifications.sql`
- `web_market/dkd_market_web_urgent_courier.js` içinde hedefli iki bildirim çağrısı güncellendi.

## Manuel canlıya alma

1. SQL dosyasını Supabase SQL Editor’da çalıştır.
2. `send-urgent-courier-alert/index.ts` içeriğini Supabase Dashboard Edge Function editörüne yapıştırıp deploy et.
3. GitHub’a push et.
4. Yeni APK/web deploy sonrası gerçek akışı test et.

## dkd standardı

Yeni SQL objeleri, Edge Function helperları, installer değişkenleri ve event keyleri `dkd_` standardıyla hazırlandı. Yeni tek harfli değişken/parametre eklenmedi.

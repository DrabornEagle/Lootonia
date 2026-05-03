# DKD Acil Kurye Web Sayfa Fix Raporu

Bu paket www.draborneagle.com web markette Acil Kurye sipariş bölümünün ana sayfanın altına/üstüne kayması, bazen çift görünmesi ve bazen hiç açılmaması sorununu hedefler.

## Yapılanlar

- `web_market/dkd_urgent_courier_page_fix.js` eklendi.
- `web_market/index.html` içine ana market scriptinden sonra stabilizer script satırı eklendi.
- `web_market/styles.css` sonuna Acil Kurye stabil panel CSS'i eklendi.
- Native/önceki Acil Kurye formu yanlış yerde veya çift render olursa gizlenir.
- Acil Kurye butonuna/chipine basınca tek ve sabit bir sipariş paneli açılır.
- Ürün toplamları mağaza bazlı ayrı ayrı girilebilir.
- Sipariş, `dkd_market_web_create_urgent_courier_order_dkd` RPC ile `dkd_courier_jobs` tablosuna `job_type = urgent` olarak gönderilir.
- RPC eksikse JS doğrudan insert fallback dener; önerilen kurulum SQL dosyasını da çalıştırmaktır.

## SQL

`supabase/sql/dkd_20260426g_urgent_courier_web_page_and_rpc_fix.sql` dosyası Supabase SQL Editor'da çalıştırılmalıdır.

## Not

Bu paket görsel üretmez. Sadece web sayfa kodunu ve Supabase RPC hattını düzeltir.

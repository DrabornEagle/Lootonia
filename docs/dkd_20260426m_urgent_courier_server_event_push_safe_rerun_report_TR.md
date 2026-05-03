# DKD Acil Kurye Server Event Push SAFE RERUN

Bu paket, Supabase SQL Editor’da görülen `unrecognized exception condition "undefined_schema"` hatasını düzeltir.

## Düzeltme

- Hatalı PL/pgSQL exception condition adı: `undefined_schema`
- Doğru PostgreSQL exception condition adı: `invalid_schema_name`
- İlgili handler artık `invalid_schema_name or undefined_function` kullanır.

## Etki Alanı

- Acil Kurye server-side olay bildirim triggerları yeniden kurulur.
- Genel işletme/kargo bildirim hattına dokunulmaz.
- Sipariş, mesaj, ürün, kullanıcı veya token verisi silinmez.

## Ek Güvenlik

SAFE RERUN dosyası önce eski trigger/fonksiyon tanımlarını kaldırır, sonra temiz şekilde yeniden oluşturur.

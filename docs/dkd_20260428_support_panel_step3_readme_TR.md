# DKD Lootonia Destek Paneli - Step 3

Bu adım uygulama içindeki Destek Paneli'ni Supabase destek kuyruğuna bağlar.

## Eklenen Supabase parçaları

- `public.dkd_support_threads`
- `public.dkd_support_messages`
- `public.dkd_support_ai_suggestions`
- `public.dkd_create_support_thread_with_message(...)`

## Uygulama davranışı

- Kullanıcı destek talebi oluşturur.
- Kullanıcı giriş yapmışsa talep Supabase'e yazılır.
- Supabase ayarı veya giriş yoksa talep cihaz içinde yedeklenir.
- Web sitesindeki 7/24 destek sayfasına dokunulmaz.

## Uygulama sırası

1. Zip'i proje köküne aç.
2. SQL dosyasını Supabase SQL Editor'da çalıştır.
3. `node tools/dkd_apply_support_panel_step3.mjs` komutunu çalıştır.
4. `npm start -- --clear` ile test et.

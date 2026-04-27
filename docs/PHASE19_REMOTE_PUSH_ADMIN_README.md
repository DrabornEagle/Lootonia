# Phase 19 — Uygulama Kapalıyken de Herkese Push

Bu paket, admin panelden gerçek uzak push (remote push) göndermek için temel altyapıyı ekler.

## Ne eklendi
- `expo-notifications` config plugin (`app.json`)
- `eas.json` development/preview/production profilleri
- cihaz token kayıt servisi (`src/services/notificationService.js`)
- admin push yayın modalı (`src/features/admin/AdminBroadcastModal.js`)
- admin menü bağlantısı
- push token + yayın tabloları ve RPC'leri (`supabase/sql/019_push_broadcast_foundation.sql`)
- Supabase Edge Function (`supabase/functions/send-broadcast/index.ts`)

## Kritik gerçek
Android'de Expo Go içinde remote push çalışmaz. Bunun için development build gerekir.

## Termux kurulum komutları
```bash
cd ~/projects/lootonia
npx expo install expo-notifications expo-device expo-constants expo-dev-client
npm install
```

## EAS hazırlığı
```bash
cd ~/projects/lootonia
npx eas-cli login
npx eas-cli build:configure
```

## Android development build
```bash
cd ~/projects/lootonia
npx eas-cli build --profile development --platform android
```

Build telefona kurulunca projeyi şöyle aç:
```bash
cd ~/projects/lootonia
npx expo start --dev-client
```

## Supabase SQL
Aşağıdaki dosyayı SQL Editor'da çalıştır:
- `supabase/sql/019_push_broadcast_foundation.sql`

## Supabase Edge Function deploy
Önce CLI giriş:
```bash
cd ~/projects/lootonia
npx supabase login
```

Fonksiyonu deploy et:
```bash
cd ~/projects/lootonia
npx supabase functions deploy send-broadcast --project-ref YOUR_PROJECT_REF --use-api
```

> Gerekirse Supabase Dashboard > Edge Functions içinde `SUPABASE_URL` ve `SUPABASE_ANON_KEY` secrets alanlarını doldur.

## Akış
1. kullanıcı development build ile uygulamayı açar
2. cihaz push izni verir
3. ExpoPushToken `dkd_push_tokens` tablosuna kaydolur
4. admin panel > Herkese Push Yayını
5. gönderilen yayın Edge Function üzerinden tüm aktif tokenlara gider

## Sonraki adım
- bildirim tıklanınca ilgili ekrana deep-link ile gitme
- yayın geçmişi ekranı
- segmentli yayın (herkese / admin / kurye / yeni kullanıcı)

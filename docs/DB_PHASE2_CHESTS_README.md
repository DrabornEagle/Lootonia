# Lootonia Faz 2 - V13 Secure Chest / Manual Code Patch

Bu paket, chest zincirindeki en kritik eksik halkayı kapatmak için hazırlandı.

## Bu pakette ne var?

- `013_secure_chest_manual_code.sql`
  - `dkd_issue_drop_code(uuid)`
  - `dkd_open_chest_secure(uuid, text, lat, lng)`
  - `dkd_open_chest_by_code(text)`
  - `dkd_open_boss_chest_secure(uuid, tier, correct, total, lat, lng)`
  - `dkd_drop_codes` uyumluluk tablosu
  - `dkd_user_drops` uyumluluk tablosu
  - `dkd_chest_logs` / `dkd_chest_history` uyumluluk kolonları

## Ne düzelir?

Bu patch’ten sonra kod tarafındaki şu servis çağrıları DB’de karşılık bulur:

- `openChestSecure(...)`
- `openChestByCode(...)`
- `openBossChestSecure(...)`
- `issueDropCode(...)`

Yani uygulamadaki şu V13 tipi hatalar kapanır:

- `dkd_open_chest_secure does not exist`
- `dkd_open_chest_by_code does not exist`
- `dkd_open_boss_chest_secure does not exist`
- `dkd_issue_drop_code does not exist`

## Patch ne yapıyor?

- QR sandığı için `qr_secret` doğruluyor
- manuel kod için 5 dakikalık tek kullanımlık kod üretiyor
- kullanıcı bazlı cooldown kontrolü yapıyor
- enerji regen hesabını DB tarafında tamamlıyor
- token ödülü veriyor
- varsa kart ödülü seçiyor
- `dkd_user_cards` içine kart işliyor
- `dkd_chest_logs` ve `dkd_chest_history` içine kayıt atıyor

## Varsayımlar

Bu patch şu varsayımlarla yazıldı:

1. `public.dkd_profiles` tablosu zaten var
2. `public.dkd_drops` tablosu zaten var
3. `public.dkd_user_cards` tablosu zaten var
4. `public.dkd_card_defs` tablosu zaten var
5. `public.dkd_loot_entries` varsa weighted seçim yapılıyor
6. `public.dkd_loot_entries` yoksa `dkd_card_defs` içinden fallback random kart seçiliyor

## Sınırlamalar

Bu dosya **gerçek base schema değildir**.
Yani sıfırdan tamamen boş Supabase projesine tek başına kusursuz kurulum garantisi vermez.
Ama mevcut çalışan projeyi kod tarafıyla çok daha uyumlu hale getirir.

Ayrıca manuel kod üretimi backend’de konum doğrulaması yapmaz; konum kontrolü uygulama tarafında zaten yapıldığı için bu patch bunu korur.
`dkd_open_chest_secure` ve `dkd_open_boss_chest_secure` ise lat/lng gönderilirse radius kontrolü yapar.

## Uygulama sırası

Supabase SQL Editor içinde sırayla:

1. `008_task_state_daily_claims.sql`
2. `011_weekly_task_state_claims.sql`
3. `013_secure_chest_manual_code.sql`

## Test checklist

### QR test
1. Admin’den QR drop oluştur
2. `qr_secret` dolu olsun
3. Haritada drop’a yaklaş
4. QR okut
5. Sandık açılıyor mu bak
6. Cooldown devreye giriyor mu bak

### Manuel kod test
1. Drop’a yaklaş
2. Scanner modal içinde `Kodu Üret`
3. Üretilen kodu kopyala
4. Manuel alana yapıştır
5. Sandık açılıyor mu bak
6. Aynı kodu ikinci kez dene
7. `code_already_used` dönüyor mu bak

### Boss test
1. Boss sorusunu kazan
2. Boss chest aç
3. `token_mult` dönüyor mu bak
4. History ve collection yenileniyor mu bak

## Sonraki faz

Bu patchten sonraki mantıklı adım:

- leaderboard sezon RPC zinciri
- shard / craft / upgrade ekonomisi
- gerçek `001` base schema yeniden inşası

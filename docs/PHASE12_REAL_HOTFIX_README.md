# Phase 12 — Uzak audit sonrası tek seferlik gerçek hotfix paketi

Bu paket, paylaşılan uzak Supabase audit çıktıları ve canlı uygulama testleri sonrası bulunan **gerçek bozuklukları** tek SQL dosyasında toplar.

## Neyi düzeltir?

### 1) `admin_required`
`dkd_issue_drop_code(uuid)` bazı kurulumlarda sadece admin için çalışıyordu.
Bu paket, kod üretimini **authenticated kullanıcı** için açar.

### 2) `dkd_drop_codes.consumed_at` eksikliği
Bazı kurulumlarda `public.dkd_drop_codes` tablosu eski şema ile kaldığı için:
- `consumed_at`
- `created_at`
- diğer destek kolonları
olmuyordu.

### 3) `invalid_code`
Canlı testte görülen asıl uyumsuzluk şu:
- kod üretimi bir yerde,
- kodla açma başka yerde
aranıyordu.

Bu bundle, kodu hem:
- `public.dkd_drop_codes`
- `public.dkd_drops.current_code`
alanlarına yazar.

Böylece eski ve yeni iki akış da aynı anda desteklenir.

## Uygulama şekli
Supabase SQL Editor içine şu dosyanın içeriğini yapıştırıp çalıştır:
- `supabase/sql/017_real_hotfix_manual_code_bundle.sql`

## Beklenen sonuç
Patch sonrası normal kullanıcı:
1. `Kodu Üret` basar
2. kod oluşur
3. aynı kod ile `Kodu Kullan ve Aç` çalışır
4. `admin_required`, `consumed_at`, `invalid_code` zinciri kırılır

## Not
Bu paket **UI değiştirmez**. Sadece uzak veritabanındaki gerçek uyumsuzluğu düzeltir.

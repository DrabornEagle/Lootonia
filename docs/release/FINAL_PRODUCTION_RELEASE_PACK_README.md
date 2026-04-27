# Lootonia Final Production Release Pack

Bu paket yeni oyun mekaniği eklemez. Amaç, release öncesi son doğrulama ve çalışma düzenini tek yerde toplamaktır.

## Eklenen komutlar
- `npm run release:verify`
- `npm run release:manifest`
- `npm run release:archive`

## Önerilen sıra
1. `npm run release:manifest`
2. `npm run release:verify`
3. Supabase SQL Editor'da `supabase/sql/phase46_release_signoff_safe.sql` çalıştır
4. Hepsi `ok` ise release build'e geç

## Ne yapar?
- çekirdek dosya var mı kontrol eder
- migration dosya zincirini kontrol eder
- stable smoke scriptini çalıştırır
- kaynak dosya sayısını raporlar
- kökte biriken backup/artifact klasörlerini istersen arşive taşır

## Not
Bu paket önceki performans paketlerini tekrar kopyalamaz. Onların üstüne son release signoff katmanını ekler.

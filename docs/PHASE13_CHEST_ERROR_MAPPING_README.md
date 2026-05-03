# Phase 13 — QR / Manuel Kod Hata Türkçeleştirme

Bu patch şunları yapar:
- QR ve manuel kod açma hatalarını kullanıcıya Türkçe ve anlaşılır gösterir.
- `admin_required`, `invalid_code`, `cooldown`, `energy_low`, `too_far` gibi reason değerlerini map eder.
- Teknik hata bilgisini tamamen silmez; alt satırda düşük görünürlükte bırakır.
- `Kodu Üret` uyarılarını da aynı hata haritasından geçirir.

## Değişen dosyalar
- `src/utils/chestErrors.js`
- `src/features/chest/ScannerModal.js`
- `src/features/chest/ChestModal.js`

## Not
Bu patch DB hotfix yerine geçmez. Ama DB’den dönen kaba reason/error metinlerini oyuncuya düzgün gösterir.

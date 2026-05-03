# Lootonia Admin Courier Jobs Icon Hotfix Report

Tarih: 2026-04-18

## Yapılan düzeltme

- `src/features/admin/AdminCourierJobsModal.js` içindeki geçersiz `MaterialCommunityIcons` adı `shield-car-outline` kaldırıldı.
- Yerine desteklenen genel sigorta/kalkan semantiğine uygun `shield-outline` ikonu kullanıldı.

## Neden

Metro terminalinde şu uyarı görünüyordu:

- `"shield-car-outline" is not a valid icon name for family "material-community"`

Bu uyarı nedeniyle ilgili belge kartı ikonunda runtime fallback oluşabiliyordu.

## Etkilenen alan

- Admin > Kurye başvuruları > Sigorta belgesi satırı

## Beklenen sonuç

- Metro warning kaybolur.
- Sigorta belgesi satırı düzgün ikonla görünür.

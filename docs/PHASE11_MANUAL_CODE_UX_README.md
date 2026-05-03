# Lootonia Phase 11 – Manual Code UX Upgrade

Bu güncelleme tamamen arayüz akışını iyileştirir.

## Ne değişti?
- `Kodu Üret` başarılı olunca üretilen kod manuel input alanına otomatik yerleşir.
- Kullanıcı tekrar yazmak zorunda kalmaz.
- `Üretilen Kodu Kullan ve Aç` etiketiyle daha net bir ana buton görünür.
- Ek olarak ayrı bir `Tek Dokunuşla Aç` butonu gelir.
- Kodun süresi için saniyeli geri sayım görünür.
- Süre dolunca hızlı aç butonu pasif olur.

## Neden yararlı?
Önceki akışta kullanıcı:
1. kod üretir,
2. kodu görür,
3. elle input'a tekrar yazar ya da yapıştırır,
4. sonra açardı.

Yeni akışta:
1. kod üret,
2. input otomatik dolsun,
3. tek tuşla aç.

## Termux kurulum

```bash
cd ~/projects/lootonia
unzip -o /sdcard/Download/lootonia_phase11_manual_code_ux.zip -d .
cp lootonia_phase11_manual_code_ux/src/features/chest/ScannerModal.js src/features/chest/
cp lootonia_phase11_manual_code_ux/docs/PHASE11_MANUAL_CODE_UX_README.md docs/
rm -rf lootonia_phase11_manual_code_ux
npx expo start -c
```

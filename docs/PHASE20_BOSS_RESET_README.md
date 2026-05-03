# Phase 20 — Boss Reset Patch

Bu patch generic boss modal görünümünü bırakıp referanstaki büyük boss hero kompozisyonuna yaklaşır.

## Değişen dosyalar
- `src/features/boss/BossIntroModal.js`
- `src/features/boss/BossQuizModal.js`

## Hedef
- Tek parça metalik üst başlık
- Büyük mech boss hero alanı
- Belirgin isim plakası ve HP göstergesi
- Fight CTA vurgusu
- Quiz ekranında daha sinematik boss shell

## Uygulama
Termux içinde:

```bash
cd ~/projects/lootonia
pkg install unzip -y
mkdir -p /sdcard/Download/lootonia_phase20_boss_reset_patch_unzipped
unzip -o /sdcard/Download/lootonia_phase20_boss_reset_patch.zip -d /sdcard/Download/lootonia_phase20_boss_reset_patch_unzipped
cp /sdcard/Download/lootonia_phase20_boss_reset_patch_unzipped/lootonia_phase20_boss_reset_patch/src/features/boss/BossIntroModal.js src/features/boss/BossIntroModal.js
cp /sdcard/Download/lootonia_phase20_boss_reset_patch_unzipped/lootonia_phase20_boss_reset_patch/src/features/boss/BossQuizModal.js src/features/boss/BossQuizModal.js
npx expo start -c
```

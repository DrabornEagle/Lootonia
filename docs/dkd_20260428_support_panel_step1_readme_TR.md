# Lootonia - Uygulama Ana Sayfa Destek Paneli Step 1

Bu paket sadece uygulama tarafında çalışır. Web sitesindeki 7/24 destek sayfasına dokunmaz.

## Ne yapar?

- `src/features/support/dkd_support_panel_modal.js` dosyasını ekler.
- `src/features/map/MapHomeScreen.js` içinde ana sayfadaki `QR Tara` butonunu `Destek Paneli` olarak değiştirir.
- QR tarayıcı sistemini silmez.
- Canlı harita içindeki küçük QR ikonuna dokunmaz.
- Supabase SQL gerektirmez.

## Kurulum özeti

```bash
cd ~/projects/Lootonia
unzip -o ~/storage/downloads/dkd_lootonia_support_panel_step1.zip -d .
node tools/dkd_apply_support_panel_step1.mjs
npm start -- --clear
```

## Geri alma

Git kullanıyorsan:

```bash
cd ~/projects/Lootonia
git checkout -- src/features/map/MapHomeScreen.js
rm -rf src/features/support/dkd_support_panel_modal.js tools/dkd_apply_support_panel_step1.mjs docs/dkd_20260428_support_panel_step1_readme_TR.md
```

Git kullanmıyorsan projeyi değiştirmeden önce mevcut zip kaynak dosyanı sakla.

# Lootonia - Uygulama Destek Paneli Step 2

Bu paket web sitesindeki 7/24 destek sayfasına dokunmaz. Sadece uygulama ana sayfasındaki Destek Paneli'ni geliştirir.

## Ne yapar?

- `src/features/support/dkd_support_panel_center.js` dosyasını ekler.
- Ana sayfada step1 ile bağlanan Destek Paneli artık mesaj yazılabilen bir forma dönüşür.
- Destek konusu seçimi ekler.
- Öncelik seçimi ekler.
- Mesaj alanı ekler.
- Opsiyonel iletişim notu / sipariş kodu alanı ekler.
- Cihaz içinde son destek taleplerini AsyncStorage ile saklar.
- Supabase'e henüz yazmaz; bu bağlantı step3'te yapılacak.
- QR tarayıcıyı silmez.

## Kurulum

```bash
cd ~/projects/Lootonia
unzip -o ~/storage/downloads/dkd_lootonia_support_panel_step2.zip -d .
node tools/dkd_apply_support_panel_step2.mjs
npm start -- --clear
```

## Kontrol

```bash
grep -RIn "dkd_support_panel_center\|Destek Talebi Oluştur\|dkd_lootonia_support_drafts_v1" src/features/map/MapHomeScreen.js src/features/support/dkd_support_panel_center.js
```

## Test

1. Uygulamayı aç.
2. Ana sayfada `Destek Paneli` butonuna bas.
3. Konu seç.
4. Öncelik seç.
5. Mesaj yaz.
6. `Destek Talebi Oluştur` butonuna bas.
7. Son destek talepleri bölümünde talep kodunu gör.

## Sonraki adım

Step3'te bu cihaz içi talep sistemi Supabase'e bağlanacak:

- `dkd_support_threads`
- `dkd_support_messages`
- `dkd_support_ai_suggestions`

Sonrasında admin destek kuyruğu ve en son Gemini cevap önerisi eklenecek.

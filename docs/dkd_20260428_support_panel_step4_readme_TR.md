# DKD Lootonia Destek Paneli Step 4

Bu adım, uygulama içindeki Admin Komuta Güvertesi'ne **Destek Kuyruğu** kartı ekler.

## Eklenenler

- `src/features/support/dkd_support_admin_queue_modal.js`
- `tools/dkd_apply_support_panel_step4.mjs`

## Kullanım

```bash
cd ~/projects/Lootonia
unzip -o ~/storage/downloads/dkd_lootonia_support_panel_step4.zip -d .
node tools/dkd_apply_support_panel_step4.mjs
npm start -- --clear
```

## Test

1. Admin hesabıyla uygulamaya gir.
2. Admin Komuta Güvertesi'ni aç.
3. Destek Kuyruğu kartına bas.
4. Talep listesini kontrol et.
5. Bir talep seç, yanıt yaz ve Yanıtla butonuna bas.
6. Çözüldü butonu ile talebi kapat.

## Not

Bu adım Gemini kullanmaz. Gemini cevap önerisi bir sonraki aşamada bağlanmalıdır.

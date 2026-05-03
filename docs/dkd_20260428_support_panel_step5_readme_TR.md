# DKD Lootonia Support Panel Step 5

Bu adım ana sayfadaki Destek Paneli'ni konuşma paneline dönüştürür.

- Normal kullanıcı kendi destek taleplerini ve admin cevaplarını görür.
- Admin kullanıcı ana sayfadaki aynı panelden tüm destek taleplerini görür ve cevap verebilir.
- Web sitesindeki 7/24 destek sayfasına dokunmaz.
- Gemini entegrasyonu bu adımda yoktur.

Kurulum:

```bash
cd ~/projects/Lootonia
unzip -o ~/storage/downloads/dkd_lootonia_support_panel_step5.zip -d .
node tools/dkd_apply_support_panel_step5.mjs
```

SQL dosyasını Supabase SQL Editor'da çalıştır:

```text
supabase/sql/dkd_20260428_support_panel_conversation_rpc.sql
```

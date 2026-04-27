# Chest/Boss Cleanup Status

Son güncelleme: 20260314_062122

## Durum
- Chest manual code zinciri toparlandı.
- Boss chest RPC parity sorunları canlıda düzeltildi.
- Geçici debug kullanıcı mesajları temizleniyor / temizlendi.
- Canlıda elle uygulanmış chest/boss düzeltmeleri için repo içinde final migration hazırlandı.

## Final migration
- Draft: supabase/migrations/021_chest_boss_live_parity_draft.sql
- Final: supabase/migrations/021_chest_boss_live_parity.sql

## Kalan işler
- Final migration içeriğini repo ile canlı DB karşılaştırarak son kez gözden geçirmek
- Market tarafı için ayrı hardening audit başlatmak
- İleride yeni ortam kurulursa 021 migration'ı kanonik kaynak olarak kullanmak

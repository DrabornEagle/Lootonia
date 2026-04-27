# Phase 41 — Market + Chest Hardening

Bu faz **runtime koda dokunmaz**. Amaç, backend tarafındaki en ciddi açıkları tek pakette toplamak.

## Neden gerekli?

En kritik 4 bulgu:

1. `011_market_system.sql`, market RPC'lerini zayıf / TODO sürüme çekiyor.
2. `001_real_init.sql`, `dkd_market_listings.user_card_id` için full UNIQUE veriyor.
   Bu da aynı kartın bir kez satıldıktan ya da iptal edildikten sonra tekrar listelenmesini engelliyor.
3. `003_rpc_chests_and_market.sql`, repo şemasıyla birebir örtüşmeyen market varsayımlarına sahip.
4. Chest secure hattı var ama canlıya yeniden dokunmadan önce preflight doğrulaması şart.

## Bu pakette ne var?

- `supabase/migrations/024_market_chest_hardening_draft.sql`
  - market view parity
  - aktif listing için partial unique index
  - sertleştirilmiş `dkd_market_list_card`
  - sertleştirilmiş `dkd_market_cancel`
  - sertleştirilmiş `dkd_market_buy`
- `supabase/sql/phase41_market_chest_preflight.sql`
  - canlı DB'de önce çalıştırılacak doğrulama sorguları

## Uygulama sırası

1. Önce `phase41_market_chest_preflight.sql` dosyasını Supabase SQL Editor'da çalıştır.
2. Sonuçlarda:
   - duplicate active listing var mı
   - ownership drift var mı
   - chest secure RPC'ler mevcut mu
   - manual code / drop verisi temiz mi
   bunları kontrol et.
3. Sonuç temizse `024_market_chest_hardening_draft.sql` içeriğini final gözden geçir.
4. Ancak ondan sonra canlıya uygula.

## Bu faz neden güvenli?

Çünkü:
- mobil runtime'a dokunmuyor
- Expo tarafını bozmaz
- önce DB doğrulama, sonra uygulama mantığıyla gidiyor

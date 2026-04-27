-- Lootonia / Ankara
-- Phase 24.9 - Market live parity
--
-- Amaç:
--   Canlı DB'de görülen market şemasını repo içinde kanonik hale getirmek.
--   Özellikle dkd_market_listings_view tarafında card_def_id alanını
--   dkd_user_cards join'i ile türetmek ve RPC sözleşmesini netleştirmek.
--
-- Not:
--   Bu migration repo kanonudur. Canlı DB'de uygulanmadan önce
--   mevcut function body / grants / bağımlılıklar ile yeniden kontrol edilmelidir.

begin;

-- =========================================================
-- SECTION A - view parity
-- =========================================================
-- Canlı probe bulgusu:
--   dkd_market_listings tablosunda card_def_id doğrudan yok.
--   Doğru kaynak: dkd_user_cards.card_def_id
-- Beklenen:
--   Frontend / admin akışları dkd_market_listings_view üzerinden
--   card_def_id ve temel kart metalarını okuyabilsin.

create or replace view public.dkd_market_listings_view as
select
  ml.id,
  ml.user_card_id,
  uc.card_def_id,
  ml.seller_id,
  ml.buyer_id,
  ml.price_token,
  ml.fee_token,
  ml.status,
  ml.created_at,
  ml.updated_at,
  ml.sold_at,
  ml.cancelled_at,
  cd.code as card_code,
  cd.name as card_name,
  cd.rarity as card_rarity,
  sp.nickname as seller_nickname,
  bp.nickname as buyer_nickname
from public.dkd_market_listings ml
left join public.dkd_user_cards uc
  on uc.id = ml.user_card_id
left join public.dkd_card_defs cd
  on cd.id = uc.card_def_id
left join public.dkd_profiles sp
  on sp.user_id = ml.seller_id
left join public.dkd_profiles bp
  on bp.user_id = ml.buyer_id;

-- =========================================================
-- SECTION B - duplicate active listing guard
-- =========================================================
-- Aynı user_card_id için birden fazla active listing oluşmamalı.
create unique index if not exists uq_dkd_market_listings_user_card_active
  on public.dkd_market_listings (user_card_id)
  where status = 'active';

-- =========================================================
-- SECTION C - expected RPC contract notes
-- =========================================================
-- Beklenen list_card sözleşmesi:
--   * kart kullanıcıya ait olmalı
--   * kart zaten active listing'de olmamalı
--   * satılmış / taşınmış kart tekrar listelenememeli
-- Beklenen cancel sözleşmesi:
--   * sadece seller veya admin iptal edebilmeli
--   * cancel sonrası status='cancelled', cancelled_at dolmalı
-- Beklenen buy sözleşmesi:
--   * todo_market_buy placeholder olmamalı
--   * aktif ilan var mı kontrolü
--   * kart seller'da mı kontrolü
--   * token transferi transaction içinde yapılmalı
--   * listing status='sold', buyer_id / sold_at dolmalı

-- =========================================================
-- SECTION D - grants
-- =========================================================
revoke all on public.dkd_market_listings_view from public;
grant select on public.dkd_market_listings_view to authenticated;
grant select on public.dkd_market_listings_view to service_role;

commit;

# Market Live Parity Status

Updated: 20260314_095558

## Özet
- Canlı probe'a göre   -     dkd_market_listings.card_def_id doğrudan kolonda yok.
- card_def_id, dkd_user_cards.card_def_id üzerinden türetilmeli.
- dkd_market_listings_view canlıda eksik alanlarla dönüyor.
- Market buy/list/cancel sözleşmeleri final sertleştirme öncesi yeniden doğrulanmalı.

## Bu adımda repo içinde yapılanlar
-    oluşturuldu.
-  için kanonik tanım yazıldı.
-  bazlı active listing unique guard eklendi.
- Beklenen market RPC sözleşmesi notlandı.

## Hâlâ canlıda doğrulanacaklar
- dkd_market_buy() gerçek body placeholder mı değil mi
- dkd_market_cancel() canlı body ve grant durumu
- dkd_market_list_card() sahiplik / duplicate guard / sold-card guard
- token transferinin transaction bazlı yapılıp yapılmadığı

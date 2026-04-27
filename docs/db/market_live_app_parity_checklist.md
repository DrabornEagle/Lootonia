# Market Live/App Parity Checklist

## UI / App
- [ ] Kullanıcıya `todo_market_buy` gibi iç metinler görünmüyor.
- [ ] Duplicate listing hatası kullanıcı dostu mesaj veriyor.
- [ ] Permission / not found hataları normalize edildi.

## Live DB expectations
- [ ] `022_market_live_parity.sql` repo içinde mevcut.
- [ ] `023_market_rpc_hardening.sql` repo içinde mevcut.
- [ ] `dkd_market_listings_view`, `card_def_id` alanını `dkd_user_cards` join'i ile türetiyor.
- [ ] `dkd_market_list_card`, `dkd_market_cancel`, `dkd_market_buy` sözleşmeleri kanonik hale geldi.
- [ ] `user_card_id` bazlı tek aktif listing guard tasarımı belgelendi.

## Smoke tests
- [ ] Listing oluştur.
- [ ] Aynı kart için ikinci aktif listing engelleniyor.
- [ ] Listing cancel seller/admin için çalışıyor.
- [ ] Buy akışı buyer balance / ownership / sold state guard'larıyla doğrulanıyor.

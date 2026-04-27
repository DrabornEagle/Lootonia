# Lootonia 2026-04-17 Runtime + Admin Repair

Bu pakette iki ana alan düzeltildi:

1. **Admin Kurye Merkezi**
- Dashboard üst özet kartları daha minimal hale getirildi.
- Dar ekranlarda yazı kaymasını azaltmak için özet kartları grid mantığına çevrildi.
- Başvuru detay akışı korunurken görsel yoğunluk düşürüldü.

2. **Supabase runtime / RPC hataları**
- `dkd_admin_courier_applications_list` dönüş tipi netleştirildi.
- `dkd_admin_market_ui_save` için 5 / 7 / 9 parametreli uyumlu overload seti eklendi.
- `dkd_admin_market_shop_upsert` için 13 / 16 / 17 parametreli uyumlu overload seti eklendi.
- `dkd_market_list_card` üzerindeki çakışan text / uuid overloadları temizlendi.
- `dkd_open_boss_chest_secure` üzerindeki numeric çakışması temizlendi.
- `dkd_shard_craft` ve `dkd_shard_upgrade_random` kart id tipini tablo tipine uyumlu hale getirdi.
- SQL sonunda `NOTIFY pgrst, 'reload schema'` eklendi.

## Değişen dosyalar
- `src/features/admin/AdminCourierJobsModal.js`
- `src/features/admin/AdminMarketModal.js`
- `src/services/adminService.js`
- `src/services/chestService.js`
- `src/services/marketService.js`
- `supabase/sql/dkd_20260417_lootonia_runtime_and_admin_repair.sql`

# Lootonia Phase 3 - Admin Loot RPC Patch

Bu patch, admin panelindeki loot yönetimi eksik kalan iki RPC'yi ekler:

- `dkd_admin_loot_add(...)`
- `dkd_admin_loot_delete(...)`

## Ne düzelir?
- Admin > Loot Yönetimi ekranında yeni loot entry ekleme çalışır.
- Mevcut loot entry silme çalışır.
- `Admin` panelinde "function public.dkd_admin_loot_add does not exist" hatası kapanır.
- `Admin` panelinde "function public.dkd_admin_loot_delete does not exist" hatası kapanır.

## Uygulama sırası
Önce ana migration setinin uygulanmış olması gerekir:
1. 001_core_profiles_and_drops.sql
2. 002_cards_loot_chests_market_base.sql
3. 003_rpc_chests_and_market.sql
4. 004_rpc_shards_and_crafting.sql
5. 005_rpc_tasks_and_leaderboard.sql
6. 006_rpc_admin_and_courier.sql
7. 007_seed_minimal.sql

Ardından bu patch uygulanır:
8. 008_rpc_admin_loot.sql

## Not
Bu patch `dkd_is_admin`, `dkd_loot_entries` ve `dkd_card_defs` yapılarının zaten mevcut olduğunu varsayar.

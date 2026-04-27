# Lootonia Migration Uygulama Sirasi

Bu belge, yeni bir Supabase projesinde migration dosyalarini hangi sirayla calistiracagini anlatir.

## Guncel siralama
1. 001_real_init.sql
2. 002_cards_loot_chests_market_base.sql
3. 003_rpc_chests_and_market.sql
4. 004_rpc_shards_and_crafting.sql
5. 005_rpc_tasks_and_leaderboard.sql
6. 006_rpc_admin_and_courier.sql
7. 007_seed_minimal.sql
8. 008_profile_helpers.sql
9. 009_drop_chest_core.sql
10. 010_admin_loot_system.sql
11. 011_market_system.sql
12. 012_shard_system.sql
13. 013_secure_chest_manual_code.sql
14. 014_task_claim_system.sql
15. 015_leaderboard_system.sql
16. 016_history_compat.sql
17. 017_admin_broadcast_foundation.sql
18. 018_push_broadcast_foundation.sql
19. 019_push_deeplink_segment_hotfix.sql

## Notlar
- 001 ile 007 temel cekirdek ve seed katmanidir.
- 008 ile 016 oyun mantigi hotfix ve uyumluluk katmanlaridir.
- 017 ile 019 admin yayin, push ve deep-link tarafini tamamlar.
- MASTER_MIGRATION.sql bu dosyalarin birlesik uretilmis halidir; ana kaynak migration klasorudur.

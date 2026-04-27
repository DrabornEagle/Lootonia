# Lootonia Operations Runbook

## Geliştirme akışı
1. Repo / zip aç
2. `.env` oluştur
3. `npm install --legacy-peer-deps`
4. `npx expo install --fix`
5. `npx expo start -c`

## Sağlık kontrolü
```bash
bash scripts/health-check.sh
node scripts/rpc-audit.js
node scripts/migration-doctor.js
```

## Supabase migration sırası
Ana referans: `docs/MIGRATION_APPLY_ORDER.md`

Kanonik zincir:
1. `001_real_init.sql`
2. `002_cards_loot_chests_market_base.sql`
3. `003_rpc_chests_and_market.sql`
4. `004_rpc_shards_and_crafting.sql`
5. `005_rpc_tasks_and_leaderboard.sql`
6. `006_rpc_admin_and_courier.sql`
7. `007_seed_minimal.sql`
8. `008_profile_helpers.sql`
9. `009_drop_chest_core.sql`
10. `010_admin_loot_system.sql`
11. `011_market_system.sql`
12. `012_shard_system.sql`
13. `013_secure_chest_manual_code.sql`
14. `014_task_claim_system.sql`
15. `015_leaderboard_system.sql`
16. `016_history_compat.sql`
17. `017_admin_broadcast_foundation.sql`
18. `018_push_broadcast_foundation.sql`
19. `019_push_deeplink_segment_hotfix.sql`

## Repo hijyen kuralı
- `src/core/GameFlow.js`
- `src/core/ModalHost.js`
- `src/hooks/*`
- `src/services/*`

Bu dosyalara runtime değişikliği yapmadan önce tam backup alın.

## Güvenli temizlik kuralı
Önce:
- docs
- audit
- eski patch paketleri
- runtime'a bağlı görünmeyen kaynaklar

Sonra:
- lint düzeltmeleri
- import cleanup
- küçük refactor

En son:
- çekirdek runtime refactor

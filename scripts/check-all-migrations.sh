#!/usr/bin/env bash
set -e

expected=(
  001_real_init.sql
  002_cards_loot_chests_market_base.sql
  003_rpc_chests_and_market.sql
  004_rpc_shards_and_crafting.sql
  005_rpc_tasks_and_leaderboard.sql
  006_rpc_admin_and_courier.sql
  007_seed_minimal.sql
  008_profile_helpers.sql
  009_drop_chest_core.sql
  010_admin_loot_system.sql
  011_market_system.sql
  012_shard_system.sql
  013_secure_chest_manual_code.sql
  014_task_claim_system.sql
  015_leaderboard_system.sql
  016_history_compat.sql
  017_admin_broadcast_foundation.sql
  018_push_broadcast_foundation.sql
  019_push_deeplink_segment_hotfix.sql
)

echo "=== LOOTONIA MIGRATION DOSYA KONTROLU ==="
missing=0
for f in "${expected[@]}"; do
  if [ -f "supabase/migrations/$f" ]; then
    printf "[OK] %s
" "$f"
  else
    printf "[EKSIK] %s
" "$f"
    missing=1
  fi
done

echo
echo "=== SUPABASE/MIGRATIONS ICERIGI ==="
find supabase/migrations -maxdepth 1 -type f -name '*.sql' -printf '%f
' | sort

echo
echo "=== MASTER DOSYA ==="
if [ -f "supabase/MASTER_MIGRATION.sql" ]; then
  ls -lh supabase/MASTER_MIGRATION.sql
  echo
  sed -n '1,24p' supabase/MASTER_MIGRATION.sql
else
  echo "MASTER_MIGRATION.sql bulunamadi"
  missing=1
fi

exit $missing

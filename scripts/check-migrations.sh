#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "=== MIGRATION DOSYALARI ==="
ls -1 supabase/migrations

echo
echo "=== ILK SATIRLAR ==="
for f in supabase/migrations/*.sql; do
  echo "--- $f ---"
  sed -n '1,5p' "$f"
  echo
done

echo "=== PLAN DOSYASI ==="
sed -n '1,80p' docs/MIGRATION_PLAN.md

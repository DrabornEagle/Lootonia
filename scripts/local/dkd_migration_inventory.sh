#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
PROJECT_DIR="${1:-$HOME/projects/lootonia}"
cd "$PROJECT_DIR"
OUT_DIR="$PROJECT_DIR/.reports/migration_inventory_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$OUT_DIR"
{
  echo '=== supabase/migrations ==='
  find supabase/migrations -maxdepth 1 -type f -name '*.sql' -printf '%f\n' | sort
  echo
  echo '=== legacy-like names in supabase/migrations ==='
  find supabase/migrations -maxdepth 1 -type f -name '*.sql' -printf '%f\n' | sort | egrep '(^|_)((v|r|p|t)_)|^[vrpt]_' || true
  echo
  echo '=== draft files in supabase/migrations ==='
  find supabase/migrations -maxdepth 1 -type f -name '*draft*.sql' -printf '%f\n' | sort || true
  echo
  echo '=== supabase/sql auxiliary files ==='
  find supabase/sql -maxdepth 1 -type f -name '*.sql' -printf '%f\n' | sort || true
} > "$OUT_DIR/summary.txt"
echo "[ok] rapor -> $OUT_DIR/summary.txt"

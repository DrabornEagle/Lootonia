#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="${1:-$(pwd)}"
cd "$PROJECT_DIR"

echo "== Lootonia Final Release Signoff =="

missing=0
check_file() {
  local f="$1"
  if [ -e "$f" ]; then
    echo "[ok] $f"
  else
    echo "[missing] $f"
    missing=1
  fi
}

check_file package.json
check_file app.json
check_file App.js
check_file src/core/GameFlow.js
check_file src/core/ModalHost.js
check_file src/core/AppShell.js
check_file src/core/propBuilders.js
check_file scripts/check-all-migrations.sh
check_file scripts/stable-pack-smoke.sh
check_file scripts/release-manifest.sh
check_file scripts/release-safe-archive.sh
check_file docs/release/FINAL_PRODUCTION_RELEASE_PACK_README.md
check_file supabase/sql/phase46_release_signoff_safe.sql

if [ "$missing" -ne 0 ]; then
  echo "[fail] core release files eksik"
  exit 1
fi

echo
echo "== Migration check =="
bash scripts/check-all-migrations.sh

echo
echo "== Stable smoke =="
bash scripts/stable-pack-smoke.sh "$PROJECT_DIR"

echo
echo "== Source count =="
if command -v rg >/dev/null 2>&1; then
  SRC_COUNT=$(rg --files src | wc -l | tr -d ' ')
else
  SRC_COUNT=$(find src -type f | wc -l | tr -d ' ')
fi
echo "[ok] source files counted: $SRC_COUNT"

echo
echo "== Release note =="
echo "SQL Editor'da supabase/sql/phase46_release_signoff_safe.sql dosyasini calistir ve tum satirlarin 'ok' oldugunu dogrula."

echo
echo "== Final Release Signoff Complete =="

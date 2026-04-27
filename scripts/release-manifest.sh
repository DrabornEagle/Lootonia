#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="${1:-$(pwd)}"
cd "$PROJECT_DIR"

echo "== Lootonia Release Manifest =="
node - <<'NODE'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log(`[info] name: ${pkg.name}`);
console.log(`[info] version: ${pkg.version}`);
console.log(`[info] expo: ${pkg.dependencies?.expo || 'missing'}`);
console.log(`[info] react-native: ${pkg.dependencies?.['react-native'] || 'missing'}`);
NODE

if command -v rg >/dev/null 2>&1; then
  SRC_COUNT=$(rg --files src | wc -l | tr -d ' ')
  MODAL_COUNT=$(rg --files src | rg 'Modal\.js$|ModalHost\.js$' | wc -l | tr -d ' ')
else
  SRC_COUNT=$(find src -type f | wc -l | tr -d ' ')
  MODAL_COUNT=$(find src -type f | grep -E 'Modal\.js$|ModalHost\.js$' | wc -l | tr -d ' ')
fi

echo "[info] src files: $SRC_COUNT"
echo "[info] modal-ish files: $MODAL_COUNT"
BACKUP_COUNT=$(find . -maxdepth 1 -type d \( -name '.backup_*' -o -name '_repo_hygiene_archive' -o -name 'repo-artifacts' -o -name 'repo_artifacts' \) | wc -l | tr -d ' ')
echo "[info] root backup/archive dirs: $BACKUP_COUNT"

#!/data/data/com.termux/files/usr/bin/bash
set -e
PROJECT_DIR="${1:-$(pwd)}"
cd "$PROJECT_DIR"

echo "[StablePack] core imports"
node - <<'NODE'
const fs = require('fs');
const path = require('path');
const files = [
  'src/core/GameFlow.js',
  'src/core/AppShell.js',
  'src/core/ModalHost.js',
  'src/core/propBuilders.js',
];
let ok = true;
for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error(`[missing] ${file}`);
    ok = false;
  }
}
if (!ok) process.exit(1);
console.log('[ok] core files present');
NODE

echo "[StablePack] TODO migrations quick scan"
if command -v rg >/dev/null 2>&1; then
  rg -n "todo_open_|todo_market_|todo_shard_|todo_task_|todo_admin_close_week|todo_claim_weekly_top_reward" supabase || true
else
  grep -RIn "todo_open_\|todo_market_\|todo_shard_\|todo_task_\|todo_admin_close_week\|todo_claim_weekly_top_reward" supabase || true
fi

echo "[StablePack] done"

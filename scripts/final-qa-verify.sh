#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
PROJECT_DIR="${1:-$(pwd)}"
cd "$PROJECT_DIR"

echo "== Lootonia Final QA Verify =="
echo "[1/7] package + core file presence"
node - <<'NODE'
const fs = require('fs');
const files = [
  'package.json',
  'src/core/GameFlow.js',
  'src/core/ModalHost.js',
  'src/core/propBuilders.js',
  'scripts/health-check.sh',
  'scripts/check-all-migrations.sh',
  'scripts/stable-pack-smoke.sh'
];
let bad = false;
for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error(`[missing] ${file}`);
    bad = true;
  }
}
if (bad) process.exit(1);
console.log('[ok] required files present');
NODE

echo "[2/7] package scripts"
node - <<'NODE'
const pkg = require('./package.json');
const need = ['start','android','web','lint:src','qa:final','cleanup:safe'];
let bad = false;
for (const key of need) {
  if (!pkg.scripts || !pkg.scripts[key]) {
    console.error(`[missing script] ${key}`);
    bad = true;
  }
}
if (bad) process.exit(1);
console.log('[ok] expected npm scripts present');
NODE

echo "[3/7] health-check"
bash ./scripts/health-check.sh

echo "[4/7] migration scan"
bash ./scripts/check-all-migrations.sh

echo "[5/7] stable smoke"
bash ./scripts/stable-pack-smoke.sh .

echo "[6/7] backup / archive inventory"
find . -maxdepth 1 \( -type d -name '.backup_*' -o -type d -name 'repo-artifacts' -o -type d -name 'repo_artifacts' -o -type d -name '_repo_hygiene_archive' \) | sort || true

echo "[7/7] source quick count"
node - <<'NODE'
const fs = require('fs');
const path = require('path');
let count = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) count++;
  }
}
walk('src');
console.log(`[ok] source files counted: ${count}`);
NODE

echo "== Final QA complete =="
